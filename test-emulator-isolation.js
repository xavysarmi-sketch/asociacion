// Pruebas sin red: Firebase y Firestore son mocks completos.
const fs=require("fs");
const vm=require("vm");
const html=fs.readFileSync("index.html","utf8");
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .filter(m=>!/src\s*=/.test(m[0].slice(0,m[0].indexOf(">")+1))).map(m=>m[1]);
const block=scripts.find(s=>s.includes("NH_PROD_FIREBASE_PROJECT_ID"));
if(!block)throw new Error("Bloque Firebase no encontrado");
const fixtureCode=fs.readFileSync("dev-fixture.js","utf8");

function classes(){const s=new Set();return{add:x=>s.add(x),contains:x=>s.has(x)};}
async function scenario(location,{forceProdDevConfig=false,existing=false}={}){
  const calls={initialize:0,useEmulator:[],collection:0,get:0,set:0};
  const banner={classList:classes(),textContent:""};
  const document={readyState:"complete",body:{classList:classes()},getElementById:id=>id==="devModeBanner"?banner:null,addEventListener(){}};
  const doc={
    async get(){calls.get++;return{exists:existing,data:()=>({payload:JSON.stringify({fixtureLabel:"DATOS DE PRUEBA — NO PRODUCCIÓN"})})};},
    async set(){calls.set++;}
  };
  const db={useEmulator:(h,p)=>calls.useEmulator.push([h,p]),collection:()=>{calls.collection++;return{doc:()=>doc};}};
  const firebase={initializeApp:()=>calls.initialize++,firestore:()=>db};
  const sandbox={window:{location,dispatchEvent(){},addEventListener(){}},location,document,firebase,console,Event:class{constructor(t){this.type=t;}},Set,Promise,JSON,setTimeout,clearTimeout};
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fixtureCode,sandbox,{filename:"dev-fixture.js"});
  let source=block;
  if(forceProdDevConfig)source=source.replace(
    'const NH_DEV_FIREBASE_CONFIG={projectId:"nh-local-dev",apiKey:"demo-local",appId:"demo-local"};',
    'const NH_DEV_FIREBASE_CONFIG={projectId:"nuevos-horizontes-6d924"};'
  );
  vm.runInContext(source,sandbox,{filename:"firebase-inline.js"});
  await new Promise(r=>setTimeout(r,10));
  return{calls,banner,sandbox};
}
function ok(v,msg){if(!v)throw new Error(msg);}

(async()=>{
  for(const location of [
    {protocol:"http:",hostname:"localhost",origin:"http://localhost:4173"},
    {protocol:"http:",hostname:"127.0.0.1",origin:"http://127.0.0.1:4173"},
    {protocol:"file:",hostname:"",origin:"null"}
  ]){
    const r=await scenario(location,{forceProdDevConfig:true});
    ok(r.calls.initialize===0,`${location.origin}: initializeApp fue llamado`);
    ok(r.calls.collection===0&&r.calls.get===0&&r.calls.set===0,`${location.origin}: hubo acceso Firestore`);
    ok(r.banner.classList.contains("visible"),`${location.origin}: falta banner de bloqueo`);
  }
  console.log("PASS local/file + projectId producción: bloqueado antes de initializeApp");

  const local=await scenario({protocol:"http:",hostname:"127.0.0.1",origin:"http://127.0.0.1:4173"});
  ok(local.calls.initialize===1,"DEV no inicializó el SDK mock");
  ok(JSON.stringify(local.calls.useEmulator)==='[["127.0.0.1",8080]]',"DEV no apuntó exclusivamente al emulador");
  ok(local.calls.get===1&&local.calls.set===1,"Fixture nuevo no hizo exactamente get+set en emulador mock");
  ok(local.sandbox.window.NH_FIREBASE_MODE==="emulator","Modo Firebase DEV incorrecto");
  ok(local.banner.textContent.includes("DATOS DE PRUEBA"),"Fixture no quedó marcado visualmente");
  console.log("PASS localhost: emulador 127.0.0.1:8080 + fixture ficticio");

  const prod=await scenario({protocol:"https:",hostname:"xavysarmi-sketch.github.io",origin:"https://xavysarmi-sketch.github.io"},{existing:true});
  ok(prod.calls.initialize===1,"Producción mock no permite inicialización");
  ok(prod.calls.useEmulator.length===0,"Producción mock intentó usar emulador");
  ok(prod.calls.get===0&&prod.calls.set===0,"Prueba estática de producción tocó datos");
  console.log("PASS origen producción: ruta normal permitida solo con mock, cero operaciones de datos");
})().catch(e=>{console.error("FAIL",e.message);process.exit(1);});
