// Nuevos Horizontes · torre.js
// Torre de control (Maestro v18.73 · FO-8): resumen nocturno del revisor (semáforo, versiones,
// avisos del mes, bandeja de propuestas, último informe mensual), sus decisiones, y el registro
// de uso (punto 5 del encargo). Parte de la app (versión en APP_VERSION).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).

// ══ Resumen de la Torre (torre/resumen) ═══════════════════════════════════════════════════
// Pide el resumen a Firestore (solo lectura) y repinta. Se llama una vez al cargar (datos.js,
// solo en la sesión del administrador) y al reintentar desde la propia pantalla.
async function cargarTorreResumen(){
  if(!window._fbReady||!window._fbTorre)return;
  TORRE.cargando=true; TORRE.error=null;
  try{ TORRE.datos=await window._fbTorre.leer(); }
  catch(e){ console.error("Torre de control: no se pudo leer el resumen:",e); TORRE.error=String(e&&e.message||e); }
  TORRE.cargando=false;
  if(TAB==="torre"||TAB==="inicio")render();
}

function _torreEstadoGeneral(d){
  const r=d&&d.revisor; if(!r)return "gris";
  return r.errores?"rojo":r.avisos?"ambar":"verde";
}
const _TORRE_PALETA={verde:{bg:"#D8F3DC",fg:"#14432A",ic:"🟢"},ambar:{bg:"#FFF0E6",fg:"#A64B19",ic:"🟡"},rojo:{bg:"#FBE7E4",fg:"#A93C25",ic:"🔴"},gris:{bg:"#F0EDE7",fg:"#7A7A7A",ic:"⚪"}};

// ── Línea de estado en Inicio (opción B, decisión de Ángel 14/11/2026) ──────────────────────
function iniEstadoTorreHTML(){
  const d=TORRE&&TORRE.datos;
  if(!d){
    if(TORRE&&TORRE.error)return `<button class="ini-aviso" style="background:${_TORRE_PALETA.gris.bg};color:${_TORRE_PALETA.gris.fg};font-weight:800;margin:0 0 10px" onclick="TAB='torre';render();window.scrollTo(0,0)">⚪ NH: no se pudo leer la Torre de control ›</button>`;
    return ""; // sin resumen todavía (primera vez, o el revisor no ha subido nada): nada que decir arriba
  }
  const n=d.revisor||{errores:0,avisos:0};
  const np=(d.propuestas||[]).filter(p=>p.decidible&&!p.decision).length;
  const estado=_torreEstadoGeneral(d), col=_TORRE_PALETA[estado];
  let texto=estado==="verde"?"todo en orden":[n.errores?`${n.errores} error${n.errores===1?"":"es"}`:"",n.avisos?`${n.avisos} aviso${n.avisos===1?"":"s"}`:""].filter(Boolean).join(" y ")||"revisar";
  if(np)texto+=` · ${np} propuesta${np===1?"":"s"}`;
  return `<button class="ini-aviso" style="background:${col.bg};color:${col.fg};font-weight:800;margin:0 0 10px" onclick="TAB='torre';render();window.scrollTo(0,0)">${col.ic} NH: ${escH(texto)} ›</button>`;
}

// ── Entrada en «Más» ─────────────────────────────────────────────────────────────────────
function torreGestionHeadHTML(){
  const d=TORRE&&TORRE.datos;
  const np=d?(d.propuestas||[]).filter(p=>p.decidible&&!p.decision).length:0;
  const sub=np?`<span class="mg-acc-num aviso">${np} propuesta${np===1?"":"s"}</span>`:"";
  return `<div class="mg-acc-head" onclick="_Y_MAS=window.scrollY||0;TAB='torre';render();window.scrollTo(0,0)">
    <span>🗼 Torre de control ${sub}</span>
    <span class="mg-acc-fl ir" aria-hidden="true"></span></div>`;
}

// ── Pantalla completa (TAB==="torre", se abre desde Más o desde la línea de Inicio) ────────
function torreHTML(){
  let h=`<button class="btn-back" style="margin:6px 0 10px" onclick="irGestion();window.scrollTo(0,_Y_MAS||0)">← Más</button>`;
  const d=TORRE&&TORRE.datos;
  h+=`<div class="mes-card"><div class="mes-title" style="margin-bottom:4px">🗼 Torre de control</div>`;
  if(TORRE&&TORRE.cargando&&!d){
    h+=`<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">Cargando…</div>`;
  }else if(!d){
    h+=`<div style="text-align:center;padding:10px 4px;color:var(--dark);font-size:14.5px;font-weight:700">Sin datos de la Torre todavía</div>
    <div style="text-align:center;padding:2px 4px 10px;color:var(--muted);font-size:13px;line-height:1.4">${TORRE&&TORRE.error?"No se ha podido leer el resumen de anoche.":"El revisor nocturno todavía no ha subido ningún resumen (la primera vez que se ejecute, aparecerá aquí)."}</div>
    <button class="backup-btn" style="background:#fff;color:#1B4332;border:1.5px solid #1B4332" onclick="cargarTorreResumen()">↻ Reintentar</button>`;
  }else{
    const g=new Date(d.generado).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
    h+=`<div style="font-size:12.5px;color:var(--muted)">Generado anoche a las ${escH(g)} · revisor v${escH((d.revisor&&d.revisor.version)||"?")}</div>`;
  }
  h+=`</div>`;
  if(d){
    h+=_torrePiezasHTML(d);
    h+=_torreVersionesHTML(d);
    h+=_torreAvisosMesHTML();
    h+=_torreBandejaHTML(d);
    h+=_torreInformeHTML(d);
  }
  return h;
}

function _torrePiezasHTML(d){
  let h=`<div class="mes-card"><div class="mes-title" style="margin-bottom:10px">🧭 Cómo está todo</div>`;
  (d.piezas||[]).forEach((p,i)=>{
    const col=_TORRE_PALETA[p.estado]||_TORRE_PALETA.gris, n=(p.errores||0)+(p.avisos||0);
    h+=`<div style="display:flex;align-items:center;gap:10px;padding:9px 0${i?";border-top:1px solid #EFEAE0":""}">
      <span style="font-size:15px">${col.ic}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:15px;color:var(--dark)">${escH(p.nombre)}</div>
        ${p.nota?`<div style="font-size:12.5px;color:var(--muted);margin-top:2px">${escH(p.nota)}</div>`:""}
      </div>
      <span style="flex-shrink:0;font-size:12px;font-weight:800;padding:3px 10px;border-radius:20px;background:${n?col.bg:_TORRE_PALETA.verde.bg};color:${n?col.fg:_TORRE_PALETA.verde.fg}">${n?`${n} aviso${n===1?"":"s"}`:"bien"}</span>
    </div>`;
  });
  if(d.revisor&&d.revisor.informe)h+=`<div style="font-size:11.5px;color:var(--muted);margin-top:8px">Informe completo: ${escH(d.revisor.informe)} (en el ordenador)</div>`;
  h+=`</div>`;
  return h;
}

function _torreVersionesHTML(d){
  const v=d.versiones||{}, s=d.sync||{};
  const fila=(k,val)=>`<div><div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.3px">${k}</div><div style="font-size:15px;font-weight:700;color:var(--dark)">${escH(val||"—")}</div></div>`;
  const syncTxt=(s.ultima||"—")+(s.ok===false?" ⚠️":"");
  return `<div class="mes-card"><div class="mes-title" style="margin-bottom:10px">🏷️ Versiones</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 16px">
      ${fila("App",v.app)}${fila("Maestro",v.maestro?"v"+v.maestro:null)}
      ${fila("Guía",v.guia?"v"+v.guia:null)}${fila("Excel sincronizado",syncTxt)}
    </div></div>`;
}

// Ayudas con alguna cuota de un mes ANTERIOR al de trabajo sin pagar (atraso real, mismo criterio
// que activePayIndex() caso 1: no es "la cuota de este mes todavía sin marcar", que ya se ve en Inicio).
function _ayudasCuotasVencidas(){
  const rm=DATA.reportMonth,ry=DATA.reportYear,ri=MONTHS.indexOf(rm); let n=0;
  (DATA.members||[]).forEach(m=>(m.loans||[]).forEach(l=>{
    if((l.pays||[]).some(p=>!p.paid&&((p.y<ry)||(p.y===ry&&MONTHS.indexOf(p.m)<ri))))n++;
  }));
  return n;
}

function _torreAvisosMesHTML(){
  const rm=DATA.reportMonth,ry=DATA.reportYear,cerrado=mesCerrado(getMesKey(rm,ry));
  const aud=auditarNHCached(), vencidas=_ayudasCuotasVencidas();
  cargarInstalaciones();
  const con=DATA.members.filter(m=>tieneFichaApp(m)&&m.codigoApp);
  const sinInst=APP_INST?con.filter(m=>!_instDe(m)).length:null;
  const fila=(ok,txt)=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-top:1px solid #EFEAE0;font-size:14px;color:var(--dark)"><span>${ok?"✅":"🟡"}</span><div style="flex:1">${txt}</div></div>`;
  let h=`<div class="mes-card"><div class="mes-title" style="margin-bottom:0">📅 Avisos del mes</div>`;
  h+=fila(cerrado,`El mes de ${MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase()} está ${cerrado?"cerrado":"abierto todavía"}`);
  h+=fila(!aud.errores.length,aud.errores.length?`La auditoría tiene ${aud.errores.length} error${aud.errores.length===1?"":"es"}`:"Auditoría sin errores");
  h+=fila(!vencidas,vencidas?`${vencidas} ayuda${vencidas===1?"":"s"} con una cuota vencida sin cobrar`:"Ninguna ayuda con cuotas vencidas");
  h+=fila(sinInst===0,sinInst==null?"Instalación de la app: comprobando…":sinInst?`${sinInst} asociado${sinInst===1?"":"s"} sin la app instalada`:"Todos los asociados activos tienen la app instalada");
  h+=`</div>`;
  return h;
}

const _TORRE_DEC_TXT={aprobar:"✓ Aprobada",descartar:"✕ Descartada",mas_tarde:"⏳ Más tarde"};
function _torreBandejaHTML(d){
  const L=d.propuestas||[];
  let h=`<div class="mes-card"><div class="mes-title" style="margin-bottom:8px">📥 Bandeja de propuestas</div>`;
  if(!L.length){ return h+`<div style="text-align:center;padding:10px;color:var(--muted);font-size:13px">Bandeja vacía.</div></div>`; }
  L.forEach(p=>{
    const dec=p.decision, guardando=TORRE_DECIDIENDO===p.id;
    h+=`<div style="padding:10px 0;border-top:1px solid #EFEAE0">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
        <div style="font-weight:700;font-size:15px;color:var(--dark)">${escH(p.titulo)}</div>
        <div style="font-size:11.5px;color:var(--muted);white-space:nowrap">hace ${p.dias} día${p.dias===1?"":"s"}</div>
      </div>
      ${p.resumen?`<div style="font-size:13px;color:var(--muted);margin:3px 0 8px">${escH(p.resumen)}</div>`:""}
      ${dec?`<div style="font-size:12.5px;font-weight:700;color:#14432A;background:#D8F3DC;display:inline-block;padding:3px 10px;border-radius:20px">${_TORRE_DEC_TXT[dec.d]||escH(dec.d)} · ${escH(new Date(dec.t).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit"}))}</div>`
      :!p.decidible?`<div style="font-size:12.5px;color:#A93C25">Nombre de ficha no válido: pide a Claude que la renombre (AAAA-MM-DD_autor_tema).</div>`
      :guardando?`<div style="font-size:13px;color:var(--muted)">Guardando…</div>`
      :`<div style="display:flex;gap:8px">
        <button onclick="torreDecidir('${esc(p.id)}','aprobar')" style="flex:1;padding:10px 6px;border-radius:10px;border:none;background:#1B4332;color:#fff;font-size:13.5px;font-weight:800;cursor:pointer">Aprobar</button>
        <button onclick="torreDecidir('${esc(p.id)}','descartar')" style="flex:1;padding:10px 6px;border-radius:10px;border:1.5px solid #A93C25;background:#fff;color:#A93C25;font-size:13.5px;font-weight:800;cursor:pointer">Descartar</button>
        <button onclick="torreDecidir('${esc(p.id)}','mas_tarde')" style="flex:1;padding:10px 6px;border-radius:10px;border:1.5px solid #E3DDD2;background:#fff;color:var(--muted);font-size:13.5px;font-weight:800;cursor:pointer">Más tarde</button>
      </div>`}
    </div>`;
  });
  h+=`<div style="font-size:11.5px;color:var(--muted);margin-top:10px">La decisión queda anotada en la ficha; si se aprueba, Claude Code la aplica.</div></div>`;
  return h;
}

function _mesTxtAAAAMM(s){ if(!s)return ""; const p=s.split("-"); const m=+p[1]; return (MONTHS_FULL[m-1]||"").toLowerCase()+" "+p[0]; }
function _torreInformeHTML(d){
  const im=d.informe_mensual; if(!im)return "";
  return `<div class="mes-card"><div class="mes-title" style="margin-bottom:8px">📈 Informe de ${escH(_mesTxtAAAAMM(im.mes))}</div>
    <ul style="margin:0;padding-left:18px;font-size:14px;color:var(--dark);line-height:1.5">${(im.lineas||[]).map(l=>`<li>${escH(l)}</li>`).join("")}</ul></div>`;
}

// ── Decidir una ficha de la bandeja (torre/decisiones) ──────────────────────────────────────
async function torreDecidir(id,decision){
  if(!window._fbTorre||!window._fbReady){ toast("⛔ Sin conexión: no se puede guardar la decisión",4000); return; }
  TORRE_DECIDIENDO=id; render();
  const entrada={d:decision,t:Date.now()};
  try{
    await window._fbTorre.decidir(id,entrada);
    if(TORRE.datos){ const p=(TORRE.datos.propuestas||[]).find(x=>x.id===id); if(p)p.decision=entrada; }
    toast(decision==="aprobar"?"✓ Aprobada":decision==="descartar"?"✕ Descartada":"⏳ Más tarde");
  }catch(e){
    console.error("Torre de control: no se pudo guardar la decisión:",e);
    toast("⛔ No se ha podido guardar la decisión (revisa la conexión)",5000);
  }
  TORRE_DECIDIENDO=null; render();
}

// ══ Registro de uso (punto 5 del encargo, aprobado 14/11/2026) ═════════════════════════════
// Solo pantalla, hora, duración y nº de anotaciones: nunca nombres ni importes. Se acumula en
// memoria (USO_SESION) y se sube como mucho una vez por sesión, al pasar a segundo plano
// (arranque.js escucha visibilitychange). Nunca bloquea ni avisa si falla: es un dato auxiliar
// para el revisor, no algo que Ángel tenga que resolver.
function _usoActivo(){ return !NH_APP_ASOCIADOS_ACTIVO()&&!READONLY_ID&&!ES_MODO_GRUPO&&!VISTA_ASOC&&!DOC_IMP; }
function NH_APP_ASOCIADOS_ACTIVO(){ return !!window.NH_APP_ASOCIADOS; }
function _usoTramo(tab){ return USO_SESION.pantallas[tab]||(USO_SESION.pantallas[tab]={ms:0,n:0}); }
// Se llama en cada render() (general.js): cierra el tramo de la pantalla anterior y abre el de la nueva.
function _usoTick(){
  try{
    if(!_usoActivo())return;
    const ahora=Date.now();
    if(USO_ACTUAL.tab&&USO_ACTUAL.tab!==TAB)_usoTramo(USO_ACTUAL.tab).ms+=ahora-USO_ACTUAL.t0;
    if(USO_ACTUAL.tab!==TAB){ USO_ACTUAL.tab=TAB; USO_ACTUAL.t0=ahora; }
  }catch(e){}
}
// Se llama desde save() (datos.js): una anotación más en la pantalla donde se está ahora mismo.
function _usoAnotar(){
  try{ if(_usoActivo())_usoTramo(TAB).n++; }catch(e){}
}
function _mesKeyHoy(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); }
// Se llama al pasar la app a segundo plano (arranque.js, visibilitychange). Una sola vez por sesión.
async function _usoCerrarYSubir(){
  try{
    if(!_usoActivo()||USO_SUBIDO)return;
    if(USO_ACTUAL.tab)_usoTramo(USO_ACTUAL.tab).ms+=Date.now()-USO_ACTUAL.t0;
    const pantallas=USO_SESION.pantallas;
    if(!Object.keys(pantallas).length)return; // nada que contar (sesión vacía: ni se abrió, raro)
    USO_SUBIDO=true; // antes de esperar la red: no se intenta dos veces aunque tarde
    if(!window._fbTorre||!window._fbReady)return;
    const entrada={ts:Date.now(),pantallas:Object.fromEntries(Object.entries(pantallas).map(([k,v])=>[k,{ms:Math.round(v.ms),n:v.n}]))};
    await window._fbTorre.registrarUso(_mesKeyHoy(),entrada);
  }catch(e){ console.warn("[NH] Registro de uso: no se pudo subir:",e); }
}
