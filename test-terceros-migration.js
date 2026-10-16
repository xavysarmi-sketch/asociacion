// Pruebas puras y sin red de la migración dinámica v10→v11.
const fs=require("fs");
const vm=require("vm");

const html=fs.readFileSync("index.html","utf8");
const begin="// BEGIN NH_TERCEROS_REF_MIGRATION";
const end="// END NH_TERCEROS_REF_MIGRATION";
const start=html.indexOf(begin);
const finish=html.indexOf(end);
if(start<0||finish<0||finish<=start)throw new Error("Bloque de migración no encontrado");
const migrationCode=html.slice(start+begin.length,finish);

const warnings=[];
const sandbox={
  window:{},
  console:{warn:(...args)=>warnings.push(args.join(" ")),log:console.log,error:console.error}
};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(migrationCode,sandbox,{filename:"migration-terceros-inline.js"});
vm.runInContext(fs.readFileSync("dev-fixture.js","utf8"),sandbox,{filename:"dev-fixture.js"});

function clone(value){return JSON.parse(JSON.stringify(value));}
function ok(value,message){if(!value)throw new Error(message);}
function member(data,id){return data.members.find(m=>m.id===id);}

const original=clone(sandbox.window.NH_DEV_FIXTURE);
const migrated=clone(original);
const expected=clone(original);
member(expected,"dev-tercero-nombre").ref="dev-asoc-b";
member(expected,"dev-tercero-normalizado").ref="dev-asoc-acento";
member(expected,"m-dev-tercero-app").ref="dev-asoc-a";
expected._version=11;

const first=sandbox.migrarRefsTercerosAV11(migrated);
ok(first.aplicada===true,"v10 no aplicó la migración v11");
ok(migrated._version===11,"la versión de datos no avanzó a 11");
ok(first.resultado.convertidos.length===3,"número inesperado de refs convertidas");

// CASO 1: ID válido intacto.
ok(member(migrated,"dev-tercero-id").ref==="dev-asoc-a","caso 1 modificó un ID válido");
// CASO 2: nombre único convertido.
ok(member(migrated,"dev-tercero-nombre").ref==="dev-asoc-b","caso 2 no convirtió la coincidencia única");
// CASO 3: nombre inexistente conservado y avisado.
ok(member(migrated,"dev-tercero-sin-match").ref==="Avalista Inexistente","caso 3 modificó la ref sin coincidencia");
// CASO 4: coincidencia ambigua conservada y avisada.
ok(member(migrated,"dev-tercero-ambiguo").ref==="  NOMBRE DUPLICADO ","caso 4 resolvió una ambigüedad");
// CASO 5: caja, espacios y tildes normalizados.
ok(member(migrated,"dev-tercero-normalizado").ref==="dev-asoc-acento","caso 5 no normalizó correctamente");
// CASO 6: alta de app ausente de INITIAL.
ok(member(migrated,"m-dev-tercero-app").origen==="app"&&member(migrated,"m-dev-tercero-app").ref==="dev-asoc-a","caso 6 no migró el alta de app");
// CASO 7: histórico congelado.
ok(member(migrated,"dev-tercero-nombre").loans[0].avalistaEnConcesion==="Avalista Histórico Inmutable","caso 7 alteró avalistaEnConcesion");

const tipos=first.resultado.avisos.map(a=>a.tipo).sort();
ok(JSON.stringify(tipos)===JSON.stringify(["ambiguo","sin_coincidencia"]),"avisos no resolubles incorrectos");
ok(first.resultado.avisos.find(a=>a.tipo==="ambiguo").candidatos.length===2,"la ambigüedad no expuso dos candidatos");
ok(first.resultado.avisos.find(a=>a.tipo==="sin_coincidencia").candidatos.length===0,"el caso inexistente expuso candidatos");
ok(sandbox.window.NH_TERCEROS_REF_WARNINGS.length===2,"los avisos no quedaron marcados para revisión");

// Cero pérdida: salvo las tres refs y _version, todo debe ser idéntico byte a byte.
ok(JSON.stringify(migrated)===JSON.stringify(expected),"la migración modificó campos ajenos a ref/_version");

// Idempotencia: una segunda carga v11 no aplica ni modifica nada.
const afterFirst=JSON.stringify(migrated);
const second=sandbox.migrarRefsTercerosAV11(migrated);
ok(second.aplicada===false,"v11 intentó aplicar de nuevo la migración");
ok(JSON.stringify(migrated)===afterFirst,"la segunda carga modificó datos migrados");
const review=sandbox.migrarRefsTerceros(migrated,{convertir:false});
ok(JSON.stringify(migrated)===afterFirst,"la revisión de avisos modificó datos v11");
ok(review.avisos.length===2,"la recarga no conservó los avisos no resolubles");

// Una copia todavía en v9 usa el mismo algoritmo genérico y salta directamente a v11.
const legacyV9=clone(original);
legacyV9._version=9;
const fromV9=sandbox.migrarRefsTercerosAV11(legacyV9);
ok(fromV9.aplicada===true&&legacyV9._version===11,"v9 no avanzó de forma segura a v11");
ok(JSON.stringify(legacyV9)===JSON.stringify(expected),"v9 y v10 produjeron resultados distintos");

ok(/const DATA_VERSION=11;/.test(html),"DATA_VERSION no es 11");
ok(/const APP_VERSION="v44\.5";/.test(html),"APP_VERSION se mezcló con DATA_VERSION");
ok(!html.includes("const AVALISTA_ID_POR_NOMBRE"),"sigue presente la tabla fija de avalistas");

console.log("PASS 7 casos ficticios de migración dinámica v10→v11");
console.log("PASS cero pérdida + avalistaEnConcesion intacto");
console.log("PASS idempotencia y avisos persistentes en recarga lógica");
