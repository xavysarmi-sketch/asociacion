// Nuevos Horizontes · firebase.js
// Entorno (producción / desarrollo) y conexión con Firebase. Se ejecuta al cargarse.
const NH_PROD_FIREBASE_PROJECT_ID="nuevos-horizontes-6d924";
const NH_PRODUCTION_ORIGINS=new Set(["https://xavysarmi-sketch.github.io"]);
// Identidad ficticia: el SDK se conecta después al emulador local, nunca a este
// projectId en la nube. No contiene credenciales ni corresponde a un proyecto real.
const NH_DEV_FIREBASE_CONFIG={projectId:"nh-local-dev",apiKey:"demo-local",appId:"demo-local"};

function detectarEntornoNH(loc=window.location){
  const protocol=(loc.protocol||"").toLowerCase();
  const hostname=(loc.hostname||"").toLowerCase();
  const origin=(loc.origin||"").toLowerCase();
  const local=protocol==="file:"||hostname==="localhost"||hostname==="127.0.0.1"||
    hostname==="::1"||hostname.endsWith(".localhost");
  const produccion=protocol==="https:"&&NH_PRODUCTION_ORIGINS.has(origin);
  // Fail closed: cualquier origen que no sea producción conocida es desarrollo.
  return {modo:produccion?"produccion":"desarrollo",local,origin,protocol,hostname};
}

function mostrarModoDesarrollo(){
  const mostrar=()=>{
    document.body?.classList.add("nh-development-mode");
    document.getElementById("devModeBanner")?.classList.add("visible");
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mostrar,{once:true});
  else mostrar();
}

function bloquearFirestoreProduccion(motivo){
  console.error("[NH SEGURIDAD] Firestore de producción bloqueado:",motivo);
  window._fbSave=async function(){
    console.error("[NH SEGURIDAD] Escritura remota bloqueada en modo desarrollo");
    return false;
  };
  window._fbLoad=async function(){return null;};
  window._fbReady=true;
  mostrarModoDesarrollo();
  window.dispatchEvent(new Event("firebase-ready"));
}

// v45.52 · App de asociados: fichas privadas (fichas/{código}) y peticiones (peticiones/{id}).
// Por defecto no hay nube (sin conexión, bloqueado o error): nada se lee ni se escribe.
window._fbFichas={leer:async()=>null,escribir:async()=>false,borrar:async()=>false,pedir:async()=>false,peticiones:async()=>null,borrarPeticion:async()=>false};

function initFirebase(){
  const entorno=detectarEntornoNH();
  const prodConfig={
    apiKey:"AIzaSyCLYo-VZwtsEn807EgDtcz9_M0fsfkkIuI",
    authDomain:"nuevos-horizontes-6d924.firebaseapp.com",
    projectId:NH_PROD_FIREBASE_PROJECT_ID,
    storageBucket:"nuevos-horizontes-6d924.firebasestorage.app",
    messagingSenderId:"1093738262656",
    appId:"1:1093738262656:web:405bf732dc1210b54db665"
  };
  const firebaseConfig=entorno.modo==="produccion"?prodConfig:NH_DEV_FIREBASE_CONFIG;

  if(entorno.modo!=="produccion"){
    mostrarModoDesarrollo();
    if(!entorno.local){
      bloquearFirestoreProduccion("origen no reconocido; solo localhost/127.0.0.1/file:// pueden usar DEV");
      return;
    }
    if(!firebaseConfig){
      bloquearFirestoreProduccion("origen no productivo; backend DEV no configurado");
      return;
    }
    if(firebaseConfig.projectId===NH_PROD_FIREBASE_PROJECT_ID){
      bloquearFirestoreProduccion("una configuración DEV intentó usar el projectId de producción");
      return;
    }
  }

  if(typeof firebase==="undefined"){
    // Firebase no cargó (sin conexión o bloqueado) — seguir con localStorage
    console.warn("Firebase no disponible, usando solo localStorage");
    window._fbSave=async function(){return false;};
    window._fbLoad=async function(){return null;};
    window._fbReady=true;
    window.dispatchEvent(new Event("firebase-ready"));
    return;
  }
  try{
    firebase.initializeApp(firebaseConfig);
    const db=firebase.firestore();
    if(entorno.modo==="desarrollo"){
      db.useEmulator("127.0.0.1",8080);
      window.NH_FIREBASE_MODE="emulator";
      console.warn("[NH DESARROLLO] Firestore Emulator 127.0.0.1:8080 · projectId nh-local-dev");
    }else{
      window.NH_FIREBASE_MODE="production";
    }
    const DOC_REF=db.collection("nh").doc("data");
    // v45.27: sesión del administrador (solo producción; los enlaces de asociados no la usan)
    try{ window._fbAuth=(entorno.modo==="produccion"&&typeof firebase.auth==="function")?firebase.auth():null; }catch(e){ window._fbAuth=null; }

    // v45.35: guardado sin pisadas. Antes de subir, se mira la marca de tiempo (updatedAt) de la
    // nube: si alguien guardó desde otro aparato después de que este cargara, NO se sube y se
    // pregunta qué datos conservar (el mismo aviso de siempre, «sync_conflict»).
    // opts.forzar: subir aunque la nube haya cambiado (cuando el administrador ya eligió «este dispositivo»).
    window._nubeTs=null; window._nubeTsMios=new Set(); window._nubeConflicto=null;
    window._fbSave=async function(data,opts){
      const forzar=!!(opts&&opts.forzar);
      try{
        const payload=JSON.stringify(data);
        if(data&&typeof data.updatedAt==="number")window._nubeTsMios.add(data.updatedAt);
        const savePromise=db.runTransaction(async tx=>{
          const snap=await tx.get(DOC_REF);
          if(!forzar&&snap.exists&&window._nubeTs!=null){
            let remota=null; try{ remota=JSON.parse(snap.data().payload); }catch(e){}
            const tsR=remota&&typeof remota.updatedAt==="number"?remota.updatedAt:null;
            if(tsR!=null&&tsR!==window._nubeTs&&!window._nubeTsMios.has(tsR)){
              const err=new Error("conflicto-nube"); err.remota=remota; throw err;
            }
          }
          tx.set(DOC_REF,{payload});
        });
        const timeoutPromise=new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),8000));
        await Promise.race([savePromise,timeoutPromise]);
        if(data&&typeof data.updatedAt==="number")window._nubeTs=data.updatedAt;
        return true;
      }catch(e){
        if(e&&e.message==="conflicto-nube"){ window._nubeConflicto=e.remota; console.warn("[NH] La nube cambió desde otro aparato: no se sube"); return false; }
        console.error("Firebase save error:",e);return false;
      }
    };

    window._fbLoad=async function(){
      try{
        const snap=await DOC_REF.get();
        if(snap.exists){const d=JSON.parse(snap.data().payload); window._nubeTs=(d&&typeof d.updatedAt==="number")?d.updatedAt:null; return d;}
        return null;
      }catch(e){console.error("Firebase load error:",e);return null;}
    };

    // v45.52 · App de asociados. Cada ficha es un documento cuyo nombre es el código secreto de la
    // persona: quien no tiene el código no puede leerla (las reglas de Firebase no dejan listar).
    window._fbFichas={
      leer:async c=>{ const s=await db.collection("fichas").doc(c).get(); return s.exists?s.data():null; },
      escribir:async(c,obj)=>{ await db.collection("fichas").doc(c).set(obj); return true; },
      borrar:async c=>{ await db.collection("fichas").doc(c).delete(); return true; },
      pedir:async(id,obj)=>{ await db.collection("peticiones").doc(id).set(obj); return true; },
      peticiones:async()=>{ const q=await db.collection("peticiones").get(); return q.docs.map(d=>Object.assign({id:d.id},d.data())); },
      borrarPeticion:async id=>{ await db.collection("peticiones").doc(id).delete(); return true; }
    };

    if(entorno.modo==="desarrollo"){
      const prepararFixture=async()=>{
        if(window.NH_ES_APP_ASOCIADOS)return; // v45.52: la app de asociados no usa el documento de la app del administrador
        const snap=await DOC_REF.get();
        if(!snap.exists){
          if(!window.NH_DEV_FIXTURE||window.NH_DEV_FIXTURE.fixtureLabel!=="DATOS DE PRUEBA — NO PRODUCCIÓN"){
            throw new Error("Fixture ficticio ausente o sin marca de seguridad");
          }
          await DOC_REF.set({payload:JSON.stringify(window.NH_DEV_FIXTURE)});
          console.warn("[NH DESARROLLO] Fixture ficticio creado en el emulador");
        }
        const banner=document.getElementById("devModeBanner");
        if(banner)banner.textContent="MODO DESARROLLO — PRODUCCIÓN BLOQUEADA · DATOS DE PRUEBA — NO PRODUCCIÓN";
      };
      prepararFixture().catch(e=>console.error("[NH DESARROLLO] No se pudo preparar el fixture:",e)).finally(()=>{
        window._fbReady=true;
        window.dispatchEvent(new Event("firebase-ready"));
      });
      return;
    }
  }catch(e){
    console.error("Firebase init error:",e);
    window._fbSave=async function(){return false;};
    window._fbLoad=async function(){return null;};
  }
  window._fbReady=true;
  window.dispatchEvent(new Event("firebase-ready"));
}

// Esperar a que el DOM esté listo antes de inicializar
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", initFirebase);
}else{
  initFirebase();
}
