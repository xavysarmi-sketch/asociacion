// Nuevos Horizontes · utilidades.js
// Utilidades: formato de importes, fechas, meses y textos
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).
// v45.37: fecha de hoy como "AAAA-MM-DD" (para anotar el día de cada cobro)
function _fechaHoyISO(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

function esc(str){return String(str).replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
function escH(str){return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

// Formatea un importe para TEXTO mostrado (pantalla/WhatsApp/PDF): sin decimales si es
// .00, si no con coma decimal española. NUNCA usar en value= de un <input> ni en nada
// que se vuelva a parsear — ahí siempre punto (parseFloat/parseInt no entienden la coma).
function fmtEur(x){
  const r=Math.round(x*100)/100;
  const s=Number.isInteger(r)?String(r):r.toFixed(2).replace(".",",");
  // v45.40: punto de miles en todos los importes (5.499 €, 1.449,58 €), en pantalla, papeles y mensajes
  const [e,d]=s.split(",");
  return e.replace(/\B(?=(\d{3})+(?!\d))/g,".")+(d!==undefined?","+d:"");
}

// Índice absoluto de mes (para comparar "Ago 2025" con "Jul 2027" con una sola resta).
function _idxMes(mes,anio){ return anio*12+MONTHS.indexOf(mes); }
function _hoyDMA(){ const d=new Date(); return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear(); }
// v45.17: «📝 Pasar a solicitudes» desde una ayuda simulada del cierre grupal (nombre, importe, grupo y mes ya puestos)
// v45.47: nombres bien escritos al apuntarlos: «genessis solorzano MIranda» → «Genessis Solorzano Miranda».
// Mayúscula al empezar cada palabra (y tras un guion), el resto en minúscula; «de», «del», «la», «los», «las», «y»
// quedan en minúscula si no van al principio; sin espacios de más.
function nombreBonito(t){
  const pq=new Set(["de","del","la","las","los","y","e","da","do","dos","van","von"]);
  return String(t||"").replace(/\s+/g," ").trim().split(" ").map((w,i)=>{ const l=w.toLocaleLowerCase("es");
    if(i>0&&pq.has(l))return l;
    return l.split("-").map(s=>s?s.charAt(0).toLocaleUpperCase("es")+s.slice(1):s).join("-"); }).join(" ");
}
// v45.51: tildes en los nombres — la app SUGIERE (nunca cambia sola): «¿Quieres decir Jessica Sánchez?».
// Lista de nombres y apellidos habituales que casi siempre llevan tilde. Si la palabra ya lleva tilde, no se toca.
const _TILDES=("Sánchez García Rodríguez Pérez Martínez López González Hernández Gómez Díaz Fernández Jiménez Álvarez Ramírez "+
 "Velázquez Vázquez Velásquez Vásquez Cárdenas Gutiérrez Domínguez Suárez Benítez Méndez Márquez Núñez Ordóñez Chávez Gálvez "+
 "Báez Peláez Ibáñez Sáez Cortés Bolívar Alarcón Calderón León Rincón Colón Guzmán Durán Beltrán Galán Román Morán Millán "+
 "Roldán Monzón Pinzón Quiñónez Ríos Zúñiga Narváez Mejía Ávila Céspedes Echeverría Garcés Valdés Andrés Martín Tobón "+
 "María José Josué Jesús Ángel Ángela Ángeles Álvaro Lucía Mónica Raúl Rubén Sebastián Sofía Tomás Nicolás Joaquín Ramón "+
 "Iván Adrián Víctor Héctor Óscar César Fátima Inés Belén Verónica Bárbara Germán Agustín Valentín Simón Matías Elías Tobías "+
 "Darío Julián Fabián Damián Cristóbal Noé Moisés Íñigo Ítalo Aníbal Félix Efraín Génesis Rocío Asunción Concepción "+
 "Encarnación Ascensión Solórzano Vélez Macías Bermúdez Cáceres Jácome").split(" ");
const _TILDE_MAP=(()=>{ const o={}; _TILDES.forEach(w=>{ o[w.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()]=w; }); return o; })();
function sugerenciaTildes(t){
  const base=nombreBonito(t); if(!base)return "";
  const out=base.split(" ").map(w=>{ if(/[áéíóúÁÉÍÓÚ]/.test(w))return w; const k=w.toLowerCase(), v=_TILDE_MAP[k]; return v?(k===w?v.toLowerCase():v):w; }).join(" ");
  return out!==base?out:"";
}
// Pinta la sugerencia debajo del campo (id del campo, id del recuadro)
function tildeSugerir(inputId,boxId){
  const i=document.getElementById(inputId), b=document.getElementById(boxId); if(!i||!b)return;
  const s=sugerenciaTildes(i.value);
  b.innerHTML=s?`<div class="tilde-sug"><span>¿Quieres decir <b>${escH(s)}</b>?</span><button type="button" onclick="tildeAplicar('${inputId}','${boxId}')">Sí, corregir</button></div>`:"";
}
function tildeAplicar(inputId,boxId){
  const i=document.getElementById(inputId); if(!i)return; const s=sugerenciaTildes(i.value); if(s)i.value=s;
  const b=document.getElementById(boxId); if(b)b.innerHTML=""; if(inputId==="m-name")altaNombreCambio();
}
const _normNom=t=>String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();

function baseUrl(){
  const href=window.location.href.split("?")[0].split("#")[0];
  // Si se abre desde archivo local, usar siempre la URL publicada
  if(href.startsWith("file://")||href.startsWith("about:")||location.protocol==="data:")
    return "https://xavysarmi-sketch.github.io/asociacion/";
  return href;
}
// v45.21: teléfono para WhatsApp. Guarda solo dígitos (y el + inicial); 9 cifras se entienden como España (+34).
function _telLimpio(v){ let t=String(v||"").trim().replace(/[^\d+]/g,""); if(t.startsWith("00"))t="+"+t.slice(2); return t; }
function _telWA(v){ let d=_telLimpio(v).replace(/\D/g,""); if(d.length===9)d="34"+d; return d.length>=10?d:""; }

// ══ v45.28 · ENVIAR LA SIMULACIÓN DE UNA AYUDA POR WHATSAPP (imagen + texto corto) ═══════════
// Solo en la app del administrador. Si hace falta ampliar la permanencia, la imagen lo explica:
// «Tu permanencia hoy» frente a «La que necesitas». No guarda nada.
const _miles=v=>String(v).replace(/\B(?=(\d{3})+(?!\d))/g,".");
const _eurM=v=>{ const [e,d]=fmtEur(v).split(","); return _miles(e)+(d?","+d:""); }; // 1.000 € (con punto de miles)

// ══ v45.33 · PAUSA DE APORTES: opciones al pedir la salida, alta de la pausa, avisos (Maestro PE-8) ══
const _mesSolo=i=>MONTHS_FULL[((i%12)+12)%12].toLowerCase();
function _listaMeses(d,n){ const a=[]; for(let i=0;i<n;i++)a.push(_mesSolo(d+i)); return a.length>1?a.slice(0,-1).join(", ")+" y "+a[a.length-1]:a[0]; }

function mesesToStr(n,ciclo){
  if(ciclo===0)return "Permanencia indefinida · mes "+n;
  if(n<=12)return "Año 1 de permanencia (mes "+n+" de 12)";
  if(n<=24)return "Año 2 de permanencia (mes "+(n-12)+" de 12)";
  return "Año 3 de permanencia (mes "+(n-24)+" de 12)";
}
const permEtiqueta=v=>v===0?"Indefinida ∞":v+" meses";

// Beneficio de UN asociado en UN mes concreto.
// Si ese mes aportó 100 o más (modo aporte 100, o 50 + extra), el beneficio es DOBLE.
// Clave del mes anterior a una clave "AAAA-MM"
function mesKeyAnterior(mesKey){
  const [y,mm]=mesKey.split("-").map(Number);
  let pm=mm-1, py=y;
  if(pm<1){pm=12;py--;}
  return py+"-"+String(pm).padStart(2,"0");
}
// ══ v45.1 (Maestro v18.2 · PE-5, PE-7, SA-1 a SA-5, SA-10) ═══════════════════════════════
// Retirada del beneficio guardado sin salir y salidas con las reglas v18. Estas funciones SOLO
// calculan; los cambios de estado se hacen en acciones explícitas del administrador.
function _keyDeIdx(i){ return Math.floor(i/12)+"-"+String(((i%12)+12)%12+1).padStart(2,"0"); }
function _mesDeIdx(i){ return {mes:MONTHS[((i%12)+12)%12],anio:Math.floor(i/12)}; }
function _txtIdx(i){ return MONTHS_FULL[((i%12)+12)%12].toLowerCase()+" "+Math.floor(i/12); }
function _r2(x){ return Math.round((x||0)*100)/100; }
// TAREA FUTURA (pendiente de revisar): salida de TERCEROS del grupo al saldar su última
// cuota — mecanismo distinto al de baja de asociado. Un tercero no tiene permanencia ni
// devolución; simplemente deja de tener ayudas activas. Revisar cuándo/cómo retirarlo de
// las vistas de grupo/envíos sin perder su historial.

// ── FUNCIONES CIERRE MENSUAL ─────────────────────────────────────────────────
function getMesKey(m,y){return y+"-"+String(MONTHS.indexOf(m)+1).padStart(2,"0");}
function _eur(x){ return fmtEur(Math.round((x||0)*100)/100)+" €"; }
const _permTxt=c=>c===0?"Indefinida":c+" meses";
