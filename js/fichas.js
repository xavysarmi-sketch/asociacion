// Nuevos Horizontes · fichas.js
// v45.52 · FICHAS PRIVADAS PARA LA APP DE ASOCIADOS (fase 1)
// Cada persona tiene un código secreto (m.codigoApp). Su ficha privada lleva SOLO sus datos (y lo
// mínimo de las personas con las que se relaciona: su aval, a quién avala y, si es responsable, su
// grupo), en el mismo formato que DATA, para que la app de asociados calcule con las MISMAS funciones
// que esta app (una sola fuente de reglas). Se guarda en la nube en fichas/{código}.
// Solo declaraciones: no ejecuta nada al cargarse.
const FICHA_VERSION=1;
const _COD_ALFABETO="abcdefghijkmnpqrstuvwxyz23456789"; // sin 0/o/1/l para que no se confundan
function codigoAppNuevo(){
  const a=new Uint8Array(20); crypto.getRandomValues(a);
  return Array.from(a,b=>_COD_ALFABETO[b%32]).join(""); // 20 símbolos de 32 = 100 bits: imposible de adivinar
}
const _copia=o=>o==null?o:JSON.parse(JSON.stringify(o));
// Lo mínimo de otra persona: su nombre, tipo, quién la trajo y si tiene una ayuda en curso (pestaña Aval)
function _personaMinima(o){
  const x={id:o.id,name:o.name,type:o.type,joinMonth:o.joinMonth,joinYear:o.joinYear};
  if(o.ref)x.ref=o.ref; if(o.referidoPor)x.referidoPor=o.referidoPor;
  if(o.baja)x.baja={month:o.baja.month,year:o.baja.year,pagada:!!o.baja.pagada};
  x.loans=(o.loans||[]).map(l=>({id:l.id,pays:(l.pays||[]).map(p=>({m:p.m,y:p.y,paid:!!p.paid}))}));
  x.closedLoans=[]; x.history=[];
  return x;
}
// ¿Quién tiene ficha en la app? Quien está activo, y quien ha salido pero aún no se le ha pagado.
// Copia de una persona sin lo que es solo para el administrador: teléfono, código y notas internas
function _limpia(o){ const c=_copia(o); delete c.phone; delete c.codigoApp; delete c.origen;
  ["loans","closedLoans"].forEach(k=>(c[k]||[]).forEach(l=>{ delete l._nota; }));
  if(c.baja){ delete c.baja.nota; delete c.baja.motivo; }
  return c; }
function tieneFichaApp(m){ return !!m&&(!m.baja||!m.baja.pagada); }
function _esResponsable(m){ return gruposCierre().find(g=>g.principalId===m.id)||null; }
// Los datos privados de una persona, con la forma de DATA
function datosPrivadosDe(m){
  const yo=_limpia(m);
  const ids=new Set([m.id]), completos=new Set([m.id]);
  const g=_esResponsable(m);
  if(g)[g.principalId,...(g.miembros||[])].forEach(id=>{ ids.add(id); completos.add(id); }); // el responsable ve su grupo
  const rel=new Set();
  if(m.ref)rel.add(m.ref); if(m.referidoPor)rel.add(m.referidoPor);
  DATA.members.forEach(o=>{ if(o.id===m.id)return; if(o.referidoPor===m.id||o.ref===m.id)rel.add(o.id);
    const r=DATA.referidos&&DATA.referidos[m.id]; if(r&&Object.values(r).some(v=>String((v&&v.nombres)||"").split(",").some(x=>_normNombre(x)===_normNombre(o.name))))rel.add(o.id); });
  const miembros=[yo];
  DATA.members.forEach(o=>{ if(o.id===m.id)return;
    if(completos.has(o.id))miembros.push(_limpia(o));
    else if(rel.has(o.id))miembros.push(_personaMinima(o)); });
  const idsDatos=new Set(miembros.filter(o=>completos.has(o.id)).map(o=>o.id));
  const md={};
  Object.entries(DATA.monthlyData||{}).forEach(([k,v])=>{ if(!v)return; const n={aportes:{}};
    Object.keys(v.aportes||{}).forEach(id=>{ if(idsDatos.has(id))n.aportes[id]=v.aportes[id]; });
    if(v.aportesFecha){ n.aportesFecha={}; Object.keys(v.aportesFecha).forEach(id=>{ if(idsDatos.has(id))n.aportesFecha[id]=v.aportesFecha[id]; }); }
    if(v.cierre)n.cierre={fecha:v.cierre.fecha};
    md[k]=n; });
  const sub=(obj)=>{ const o={}; Object.keys(obj||{}).forEach(id=>{ if(idsDatos.has(id))o[id]=_copia(obj[id]); }); return o; };
  // Bonos por referido: los suyos (y los de su grupo) enteros; de los demás, solo la línea que le nombra a él
  const referidos=sub(DATA.referidos);
  Object.entries(DATA.referidos||{}).forEach(([rid,r])=>{ if(idsDatos.has(rid))return;
    Object.entries(r||{}).forEach(([k,v])=>{ const ns=String((v&&v.nombres)||"").split(",").map(x=>x.trim()).filter(x=>[...idsDatos].some(id=>{const o=DATA.members.find(z=>z.id===id);return o&&_normNombre(o.name)===_normNombre(x);}));
      if(ns.length){ (referidos[rid]=referidos[rid]||{})[k]={n:ns.length,nombres:ns.join(", ")}; } }); });
  const d={_version:DATA._version,reportMonth:DATA.reportMonth,reportYear:DATA.reportYear,monthlyFee:DATA.monthlyFee,rate:DATA.rate,
    updatedAt:DATA.updatedAt,members:miembros,monthlyData:md,extras:sub(DATA.extras),referidos,aportesPuntuales:_sinDestino(sub(DATA.aportesPuntuales)),
    gruposCierre:g?[_copia(g)]:[],cuentasGrupo:{},
    solicitudes:(DATA.solicitudes||[]).filter(s=>s&&s.mid===m.id).map(s=>({id:s.id,capital:s.capital,cuotas:s.cuotas,fecha:s.fecha,estado:s.estado,mes:s.mes,mesOtorgada:s.mesOtorgada||null,origen:s.origen||null}))};
  if(DATA.diaAvisoProximo!=null)d.diaAvisoProximo=DATA.diaAvisoProximo;
  if(DATA.mesAutoAplicado)d.mesAutoAplicado=DATA.mesAutoAplicado;
  if(g)Object.entries(DATA.cuentasGrupo||{}).forEach(([k,v])=>{ if(v&&v[g.id])d.cuentasGrupo[k]={[g.id]:_copia(v[g.id])}; });
  return d;
}
// A quién fue el dinero de un aporte temporal es cosa del administrador: no va en la ficha
function _sinDestino(ap){ Object.values(ap).forEach(l=>(Array.isArray(l)?l:[]).forEach(x=>{ if(x)delete x.destino; })); return ap; }
function fichaPrivadaDe(m){ return {v:FICHA_VERSION,mid:m.id,datos:datosPrivadosDe(m)}; }

// ══ v45.52 · PUBLICAR LAS FICHAS EN LA NUBE (solo la app del administrador) ═══════════════════
// Las fichas se suben solo en producción (o en las pruebas con el emulador, NH_PRUEBAS_FICHAS),
// con la sesión del administrador, y solo las que han cambiado desde la última vez (se recuerda
// en este aparato una huella de cada una). Nunca se llama desde render(): tras guardar y al abrir.
// DATA.appAsociados = {publicar:true|false, revocados:[códigos ya sin uso]}
const _FICHAS_KEY="nh-fichas-huellas";
let FICHAS_ESTADO={enCurso:false,otraVez:false,ultima:null,error:null,escritas:0};
// v45.61: quién tiene la app instalada en el móvil (instalaciones/{código}); se lee al abrir el panel
let APP_INST=null, APP_INST_TS=0;
async function cargarInstalaciones(forzar){
  if(!_fichasNubeOk()||!window._fbReady||!window._fbFichas||!window._fbFichas.instalaciones)return;
  if(!forzar&&Date.now()-APP_INST_TS<60000)return; APP_INST_TS=Date.now();
  try{ const o=await window._fbFichas.instalaciones(); const antes=JSON.stringify(APP_INST); APP_INST=o||{}; if(antes!==JSON.stringify(APP_INST))render(); }
  catch(e){ console.warn("[NH] No se pudieron leer las instalaciones:",e); }
}
function _instDe(m){ return APP_INST&&m&&m.codigoApp?APP_INST[m.codigoApp]||null:null; }
let PETICIONES=null, PETICIONES_TS=0, _petArmada=null, _codArmado=null;
function _huella(s){ let h1=0xdeadbeef,h2=0x41c6ce57; for(let i=0;i<s.length;i++){ const c=s.charCodeAt(i); h1=Math.imul(h1^c,2654435761); h2=Math.imul(h2^c,1597334677); }
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909); h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (h2>>>0).toString(36)+(h1>>>0).toString(36); }
function _fichasNubeOk(){ return (window.NH_FIREBASE_MODE==="production"&&typeof SESION_OK!=="undefined"&&SESION_OK)||!!window.NH_PRUEBAS_FICHAS; }
function _huellasLeer(){ try{ return JSON.parse(localStorage.getItem(_FICHAS_KEY)||"{}")||{}; }catch(e){ return {}; } }
function _huellasGuardar(o){ try{ localStorage.setItem(_FICHAS_KEY,JSON.stringify(o)); }catch(e){} }
function _appCfg(){ return (DATA&&DATA.appAsociados)||{}; }
function appAsociadosActiva(){ return !!_appCfg().publicar; }
// Enlace de la app de una persona (la carpeta app/ junto a esta app)
function enlaceAppDe(m){ if(!m||!m.codigoApp)return ""; const base=location.origin+location.pathname.replace(/[^/]*$/,""); return base+"app/?c="+m.codigoApp; }
// Con la app ya en marcha, a quien no tenga código se le pone al guardar (no se pinta nada: es parte del guardado)
function asegurarCodigosApp(){ if(!appAsociadosActiva()||!DATA||!DATA.members)return; DATA.members.forEach(m=>{ if(tieneFichaApp(m)&&!m.codigoApp)m.codigoApp=codigoAppNuevo(); }); }
let _pubTimer=null;
function publicarFichasLuego(ms){ clearTimeout(_pubTimer); _pubTimer=setTimeout(()=>{ publicarFichas(false); cargarPeticiones(false); },ms==null?2500:ms); }
async function publicarFichas(todas){
  if(!DATA||!_fichasNubeOk()||!window._fbReady||!window._fbFichas)return null;
  if(!todas&&!appAsociadosActiva())return null;
  if(FICHAS_ESTADO.enCurso){ FICHAS_ESTADO.otraVez=true; return null; }
  FICHAS_ESTADO.enCurso=true; FICHAS_ESTADO.otraVez=false;
  const hs=todas?{}:_huellasLeer(), nuevas=Object.assign({},_huellasLeer()); let n=0, err=null;
  try{
    for(const m of DATA.members){ const c=m.codigoApp; if(!c)continue;
      let obj, h;
      if(tieneFichaApp(m)){ const f=fichaPrivadaDe(m), upd=f.datos.updatedAt; delete f.datos.updatedAt; h=_huella(JSON.stringify(f));
        if(hs[c]===h)continue; f.datos.updatedAt=upd; obj={payload:JSON.stringify(f),v:FICHA_VERSION,t:Date.now()}; }
      else { h="cerrada"; if(hs[c]===h)continue; obj={cerrada:true,v:FICHA_VERSION,t:Date.now()}; }
      await window._fbFichas.escribir(c,obj); nuevas[c]=h; n++; _huellasGuardar(nuevas);
    }
    for(const c of (_appCfg().revocados||[])){ if(hs[c]==="borrada")continue; await window._fbFichas.borrar(c); nuevas[c]="borrada"; n++; _huellasGuardar(nuevas); }
  }catch(e){ err=e; console.error("[NH] No se pudieron subir las fichas:",e); }
  FICHAS_ESTADO.enCurso=false; FICHAS_ESTADO.ultima=Date.now(); FICHAS_ESTADO.escritas=n;
  FICHAS_ESTADO.error=err?((err.code==="permission-denied"||/permission/i.test(String(err.message)))?"permisos":"conexion"):null;
  if(TAB==="manage"&&DESP["mg-app"]&&!MODAL)render();
  if(FICHAS_ESTADO.otraVez)publicarFichasLuego(500);
  return {n,error:FICHAS_ESTADO.error};
}
// ── Acciones del administrador (Más → App de asociados) ──
function crearCodigosApp(){
  let n=0; DATA.members.forEach(m=>{ if(tieneFichaApp(m)&&!m.codigoApp){ m.codigoApp=codigoAppNuevo(); n++; } });
  save(); render(); toast(n?("Códigos creados: "+n+" ✓"):"Ya tenían código todos");
}
async function subirFichasAhora(){
  if(!_fichasNubeOk()){ toast(window.NH_FIREBASE_MODE==="production"?"Inicia sesión para subir las fichas":"En modo desarrollo no se sube nada a la nube",4000); return; }
  if(!DATA.members.some(m=>m.codigoApp)){ toast("Primero crea los códigos"); return; }
  toast("Subiendo las fichas…",6000);
  const r=await publicarFichas(true);
  if(!r)return;
  if(r.error==="permisos"){ toast("⛔ Firebase no deja guardarlas: faltan las reglas nuevas (te las paso yo)",6000); return; }
  if(r.error){ toast("No se pudieron subir: revisa la conexión",5000); return; }
  if(!appAsociadosActiva()){ DATA.appAsociados=Object.assign({},_appCfg(),{publicar:true}); save(); }
  toast("✓ Fichas subidas: "+r.n,3500); render();
}
function pausarFichasApp(){ DATA.appAsociados=Object.assign({},_appCfg(),{publicar:false}); save(); render(); toast("Las fichas ya no se actualizan solas"); }
function cambiarCodigoApp(mid){
  const m=DATA.members.find(x=>x.id===mid); if(!m||!m.codigoApp)return;
  if(_codArmado!==mid){ _codArmado=mid; render(); setTimeout(()=>{ if(_codArmado===mid){ _codArmado=null; render(); } },4000); return; }
  _codArmado=null;
  const cfg=Object.assign({},_appCfg()); cfg.revocados=(cfg.revocados||[]).concat([m.codigoApp]); DATA.appAsociados=cfg;
  m.codigoApp=codigoAppNuevo(); save(); render(); toast("Código nuevo para "+m.name.split(" ")[0]+": el enlace anterior deja de funcionar",4500);
}
function copiarEnlaceApp(mid){
  const m=DATA.members.find(x=>x.id===mid), url=enlaceAppDe(m); if(!url)return;
  try{ navigator.clipboard.writeText(url).then(()=>toast("Enlace copiado ✓"),()=>toast(url,6000)); }catch(e){ toast(url,6000); }
}
function abrirAppDe(mid){ const url=enlaceAppDe(DATA.members.find(x=>x.id===mid)); if(url)window.open(url,"_blank"); }
function appAsociadosGestionHTML(){
  const ab=!!DESP["mg-app"], con=DATA.members.filter(m=>tieneFichaApp(m)&&m.codigoApp), sin=DATA.members.filter(m=>tieneFichaApp(m)&&!m.codigoApp);
  const est=appAsociadosActiva()?(FICHAS_ESTADO.error==="permisos"?`<span style="color:#A93C25">⛔ faltan reglas</span>`:`<span style="color:#1B7A3D">en marcha</span>`):`<span style="color:var(--muted)">en pruebas</span>`;
  let h=`<div class="mg-acc-head" onclick="DESP['mg-app']=!DESP['mg-app'];render()"><span>📱 App de asociados <span style="font-weight:600">· ${est}</span></span><span class="mg-acc-fl">${ab?"▲ ocultar":"▼ mostrar"}</span></div>`;
  if(!ab)return h;
  cargarInstalaciones();
  const ult=FICHAS_ESTADO.ultima?new Date(FICHAS_ESTADO.ultima).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):null;
  h+=`<div style="background:#fff;border-radius:16px;padding:16px;margin:-4px 0 12px;border:1px solid var(--border)">
    <div style="font-size:13.5px;color:var(--dark);line-height:1.5;margin-bottom:10px">Cada persona tiene un <b>enlace con un código secreto</b>. Con él ve solo su ficha (y su grupo, si es responsable). Nadie más puede verla. <b>Nada se envía solo:</b> cada mensaje lo envías tú desde WhatsApp.</div>
    <div style="display:flex;gap:8px;margin-bottom:10px;font-size:13.5px"><div style="flex:1;background:#EEF7F1;border-radius:10px;padding:8px 10px"><b style="font-size:18px">${con.length}</b><br>con código</div><div style="flex:1;background:${sin.length?"#FFF4E5":"#F5F0EB"};border-radius:10px;padding:8px 10px"><b style="font-size:18px">${sin.length}</b><br>sin código</div><div style="flex:1;background:#D8F3DC;border-radius:10px;padding:8px 10px"><b style="font-size:18px">${APP_INST?con.filter(_instDe).length:"…"}</b><br>instalada</div></div>
    ${sin.length?`<button class="backup-btn" style="background:#1B4332;color:#fff" onclick="crearCodigosApp()">🔑 Crear los códigos que faltan (${sin.length})</button>`:""}
    ${con.length?`<button class="backup-btn" style="background:#2D6A4F;color:#fff" onclick="subirFichasAhora()">☁️ Subir todas las fichas ahora</button>`:""}
    <div style="font-size:12.5px;color:var(--muted);line-height:1.45;margin:2px 0 8px">${appAsociadosActiva()?"Se actualizan solas cada vez que guardas algo.":"Cuando las subas la primera vez, se actualizarán solas cada vez que guardes algo."}${ult?` Última subida: ${ult}${FICHAS_ESTADO.escritas?` (${FICHAS_ESTADO.escritas} fichas)`:" (sin cambios)"}.`:""}${FICHAS_ESTADO.error==="permisos"?` <b style="color:#A93C25">Firebase no deja guardarlas: faltan las reglas nuevas.</b>`:FICHAS_ESTADO.error?` <b style="color:#A93C25">La última subida falló (conexión).</b>`:""}</div>
    ${appAsociadosActiva()?`<button style="width:100%;padding:8px;border:none;background:transparent;color:var(--muted);font-size:13px;text-decoration:underline;cursor:pointer" onclick="pausarFichasApp()">Dejar de actualizarlas solas</button>`:""}
    ${con.length&&appAsociadosActiva()?`<div style="font-size:14px;font-weight:800;color:var(--dark);margin:12px 0 6px">Para que la tengan en su móvil</div>
    <button class="backup-btn" style="background:#15803D;color:#fff" onclick="abrirColaApp()">💬 Enviar la app por WhatsApp, uno a uno (${_appColaLista(false).length} sin enviar)</button>
    <button class="backup-btn" style="background:#fff;color:#1B4332;border:1.5px solid #1B4332" onclick="imprimirTarjetasApp()">🖨️ Imprimir las tarjetas con QR (${con.length})</button>`:""}`;
  if(con.length){
    const abL=!!DESP["mg-app-l"];
    h+=`<div class="mg-acc-head" style="margin:8px 0 0" onclick="DESP['mg-app-l']=!DESP['mg-app-l'];render()"><span>👥 Enlaces por persona</span><span class="mg-acc-fl">${abL?"▲ ocultar":"▼ mostrar"}</span></div>`;
    if(abL){ const env=_appEnviados(); con.slice().sort((a,b)=>a.name.localeCompare(b.name,"es")).forEach(m=>{
      const bt=(fn,txt,st)=>`<button onclick="${fn}" style="flex:1;padding:8px 4px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;${st}">${txt}</button>`;
      h+=`<div style="padding:10px 0;border-bottom:1px solid #EFEAE0"><div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px"><span style="flex:1;min-width:0;font-size:15px;font-weight:700">${escH(m.name)}</span>${_instDe(m)?`<span style="font-size:12px;font-weight:800;color:#1B4332;background:#D8F3DC;border-radius:8px;padding:1px 7px;white-space:nowrap">📲 instalada ${escH(new Date(_instDe(m).t).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit"}))}</span>`:env[m.id]?`<span style="font-size:12px;font-weight:800;color:#1B7A3D;white-space:nowrap">✓ enviada ${escH(env[m.id].slice(0,5))}</span>`:""}</div>
        <div style="display:flex;gap:6px">${bt(`abrirAppDe('${esc(m.id)}')`,"👁️ Abrir","border:1.5px solid #2D6A4F;background:#fff;color:#1B4332")}${bt(`abrirTarjetaApp('${esc(m.id)}')`,"📸 Tarjeta QR","border:1.5px solid #2D6A4F;background:#fff;color:#1B4332")}${bt(`appEnviarA('${esc(m.id)}')`,"💬 Enviar","border:1.5px solid #15803D;background:#15803D;color:#fff")}</div>
        <div style="display:flex;gap:14px;margin-top:6px;font-size:12.5px"><button onclick="copiarEnlaceApp('${esc(m.id)}')" style="border:none;background:none;padding:2px 0;color:var(--muted);text-decoration:underline;cursor:pointer">Copiar enlace</button>
        <button onclick="cambiarCodigoApp('${esc(m.id)}')" style="border:none;background:none;padding:2px 0;color:${_codArmado===m.id?"#fff":"#C0492C"};${_codArmado===m.id?"background:#C0492C;border-radius:6px;padding:2px 8px;":"text-decoration:underline;"}cursor:pointer">${_codArmado===m.id?"¿Seguro? El enlace anterior dejará de funcionar":"Código nuevo"}</button></div></div>`;
    }); }
  }
  h+=`</div>`;
  return h;
}
// ══ v45.52 · PETICIONES DESDE LA APP (llegan a Ayudas → Solicitudes) ═══════════════════════════
async function cargarPeticiones(forzar){
  if(!_fichasNubeOk()||!window._fbReady||!window._fbFichas)return;
  if(!forzar&&Date.now()-PETICIONES_TS<60000)return;
  PETICIONES_TS=Date.now();
  try{ const l=await window._fbFichas.peticiones(); if(Array.isArray(l)){ const antes=JSON.stringify(PETICIONES); PETICIONES=l.sort((a,b)=>(a.creada||0)-(b.creada||0)); if(antes!==JSON.stringify(PETICIONES)&&TAB==="ayudas"&&!MODAL)render(); } }
  catch(e){ console.warn("[NH] No se pudieron leer las peticiones:",e); }
}
function _petPersona(p){ return p&&p.c?DATA.members.find(m=>m.codigoApp===p.c)||null:null; }
function peticionesAppHTML(){
  const l=(PETICIONES||[]); if(!l.length)return "";
  let h=`<div class="mes-card" style="border:2px solid #2D6A4F"><div class="mes-title" style="margin-bottom:6px">📱 Pedidas desde la app <span style="font-size:12px;font-weight:800;padding:3px 9px;border-radius:20px;background:#E3F1E7;color:#1B7A3D;vertical-align:middle">${l.length}</span></div>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:8px;line-height:1.4">Al apuntarla pasa a Solicitudes, como si la hubieras escrito tú.</div>`;
  l.forEach(p=>{ const m=_petPersona(p), ok=!!m;
    const f=p.creada?new Date(p.creada).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit"}):"";
    const mesP=p.mes&&/^\d{4}-\d{2}$/.test(p.mes)?MONTHS_FULL[parseInt(p.mes.slice(5))-1].toLowerCase():"";
    h+=`<div style="padding:10px 0;border-top:1px solid #EFEAE0">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="font-size:15px">${ok?escH(m.name):"Enlace sin persona"}</b><b style="font-size:16px;white-space:nowrap">${fmtEur(+p.capital||0)} €</b></div>
      <div style="font-size:13px;color:var(--muted);margin-top:2px">${+p.cuotas||"?"} ${+p.cuotas===1?"cuota":"cuotas"}${mesP?` · para ${mesP}`:""}${f?` · pedida el ${f}`:""}${p.perm?` · <span style="color:#8A4F12">necesita permanencia de ${p.perm==="0"?"indefinida":escH(p.perm)+" meses"}</span>`:""}</div>
      ${p.nota?`<div style="font-size:13.5px;margin-top:4px;background:#F5F0EB;border-radius:8px;padding:6px 9px">«${escH(String(p.nota).slice(0,300))}»</div>`:""}
      <div style="display:flex;gap:8px;margin-top:8px">${ok?`<button onclick="peticionApuntar('${esc(p.id)}')" style="flex:1;padding:9px;border-radius:10px;border:none;background:#1B4332;color:#fff;font-size:13.5px;font-weight:800;cursor:pointer">📝 Apuntar en Solicitudes</button>`:""}
        <button onclick="peticionDescartar('${esc(p.id)}')" style="flex:${ok?"0 0 auto":"1"};padding:9px 12px;border-radius:10px;border:1.5px solid #C0492C;background:${_petArmada===p.id?"#C0492C":"#fff"};color:${_petArmada===p.id?"#fff":"#C0492C"};font-size:13.5px;font-weight:700;cursor:pointer">${_petArmada===p.id?"¿Descartar?":"Descartar"}</button></div>
    </div>`; });
  return h+`</div>`;
}
async function peticionApuntar(pid){
  const p=(PETICIONES||[]).find(x=>x.id===pid), m=_petPersona(p); if(!p||!m)return;
  const av=m.type==="tercero"?m.ref:m.referidoPor, gid=_grupoDe(m.id)||(av?_grupoDe(av):"")||null;
  const mes=p.mes&&/^\d{4}-\d{2}$/.test(p.mes)?p.mes:getMesKey(DATA.reportMonth,DATA.reportYear);
  _sols().push({id:"S"+Date.now()+Math.random().toString(36).slice(2,6),mid:m.id,nombre:m.name,capital:_r2(+p.capital),cuotas:parseInt(p.cuotas)||1,fecha:_hoyDMA(),estado:"pendiente",avalId:av||null,grupoGid:gid,mes,origen:"app",...(p.nota?{nota:String(p.nota).slice(0,300)}:{})});
  PETICIONES=(PETICIONES||[]).filter(x=>x.id!==pid); save(); render(); toast("Apuntada en Solicitudes ✓");
  try{ await window._fbFichas.borrarPeticion(pid); }catch(e){ console.warn("[NH] La petición se apuntó pero no se pudo quitar de la nube:",e); }
}
async function peticionDescartar(pid){
  if(_petArmada!==pid){ _petArmada=pid; render(); setTimeout(()=>{ if(_petArmada===pid){ _petArmada=null; render(); } },4000); return; }
  _petArmada=null;
  try{ await window._fbFichas.borrarPeticion(pid); PETICIONES=(PETICIONES||[]).filter(x=>x.id!==pid); toast("Descartada"); }catch(e){ toast("No se pudo descartar: revisa la conexión"); }
  render();
}

// ══ v45.52 · ENVIAR LA APP A CADA ASOCIADO: mensaje de WhatsApp y tarjeta con su QR ═══════════
// Nada se envía solo: cada mensaje lo abre el administrador y lo envía él desde WhatsApp.
// DATA.appAsociados.enviados = {mid: "dd/mm/aaaa"} (cuándo se le abrió el mensaje por última vez)
function _appMensajeWA(m){
  const nom=String(m.name||"").trim().split(/\s+/)[0]||"";
  return `Hola ${nom} 👋\nYa tienes tu *app de Nuevos Horizontes*. Ahí ves tus aportes, tus apoyos y tus beneficios, siempre al día.\n\n👉 Tu enlace (es solo tuyo, no lo compartas):\n${enlaceAppDe(m)}\n\n*Para tenerla en el móvil:*\n1️⃣ Abre el enlace.\n2️⃣ iPhone: toca *Compartir* y luego «Añadir a pantalla de inicio».\n    Android: toca los *tres puntos* y luego «Añadir a pantalla de inicio».\n3️⃣ Ya está: ábrela siempre desde el icono *NH*.\n\nNuevos Horizontes · Construyendo un nuevo sistema`;
}
function _appEnviados(){ return (_appCfg().enviados)||{}; }
function appEnviarA(mid){
  const m=DATA.members.find(x=>x.id===mid); if(!m||!m.codigoApp)return;
  const t=_appMensajeWA(m), tel=_telWA(m.phone);
  if(tel)window.open("https://wa.me/"+tel+"?text="+encodeURIComponent(t),"_blank");
  else if(navigator.share)navigator.share({text:t}).catch(x=>{ if(x&&x.name!=="AbortError")window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank"); });
  else window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");
  const cfg=Object.assign({},_appCfg()); cfg.enviados=Object.assign({},cfg.enviados||{},{[mid]:_hoyDMA()}); DATA.appAsociados=cfg;
  if(MODAL&&MODAL.type==="app_cola"&&!MODAL.hechos.includes(mid))MODAL.hechos.push(mid);
  save(); render();
}
function _appColaLista(todos){ const env=_appEnviados(); return DATA.members.filter(m=>tieneFichaApp(m)&&m.codigoApp&&(todos||!env[m.id])).sort((a,b)=>a.name.localeCompare(b.name,"es")); }
function abrirColaApp(){ openModal("app_cola",{todos:false,hechos:[]}); }
function appColaModalHTML(){
  const todos=!!MODAL.todos, lista=_appColaLista(todos), env=_appEnviados(), sig=lista.find(m=>!MODAL.hechos.includes(m.id));
  const chip=(v,t)=>`<button onclick="MODAL.todos=${v};render()" class="cgt-b ${todos===v?"pri":""}" style="min-height:40px">${t}</button>`;
  let h=`<div class="modal-title">💬 Enviar la app, uno a uno</div>
    <div class="cgt-btns" style="margin:0 0 10px">${chip(false,`Sin enviar (${_appColaLista(false).length})`)}${chip(true,`Todos (${_appColaLista(true).length})`)}</div>`;
  if(!lista.length)return h+`<div class="ini-sin" style="margin:6px 0 14px">Ya se la has enviado a todos. Si quieres reenviarla, elige «Todos».</div><button class="m-sec" onclick="closeModal()">Cerrar</button>`;
  h+=`<div style="font-size:13.5px;color:var(--muted);margin-bottom:10px;line-height:1.4">Se abre WhatsApp con su mensaje y su enlace ya escritos. Envíalo y vuelve aquí: te saldrá el siguiente.</div>`;
  lista.forEach(m=>{ const ok=MODAL.hechos.includes(m.id);
    h+=`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:800;color:var(--dark)">${escH(m.name)}</div>
      <div style="font-size:13px;color:var(--muted)">${_telWA(m.phone)?"📞 con teléfono":"sin teléfono: eliges el chat"}${env[m.id]?` · enviada el ${escH(env[m.id])}`:""}</div></div>
      ${ok?`<span style="font-size:13.5px;font-weight:800;color:#1B7A3D;white-space:nowrap">✓ Abierto</span>`:""}
      <button class="cgt-b ${ok?"":"sec"}" style="flex:0 0 auto;min-width:84px" onclick="appEnviarA('${esc(m.id)}')">${ok?"Otra vez":"Enviar"}</button></div>`; });
  h+=sig?`<button class="cgt-b pri" style="width:100%;min-height:52px;margin-top:14px;font-size:16px;background:#15803D;border-color:#15803D" onclick="appEnviarA('${esc(sig.id)}')">💬 ${MODAL.hechos.length?"Siguiente: ":"Enviar a "}${escH(sig.name)}</button>`
    :`<div style="margin-top:14px;padding:11px;border-radius:12px;background:#E3F1E7;color:#1B7A3D;font-weight:800;text-align:center">✅ Abiertos todos</div>`;
  return h+`<button class="m-sec" style="margin-top:8px" onclick="closeModal()">Cerrar</button>`;
}
// ── Tarjeta con el QR (imagen para WhatsApp o para imprimir) ──
let _qrPromesa=null;
function _cargarQR(){
  if(typeof qrcode==="function")return Promise.resolve();
  if(!_qrPromesa)_qrPromesa=new Promise((ok,ko)=>{ const s=document.createElement("script"); s.src="js/qr.js?v="+APP_VERSION.slice(1); s.onload=()=>ok(); s.onerror=()=>{ _qrPromesa=null; ko(new Error("qr")); }; document.head.appendChild(s); });
  return _qrPromesa;
}
function _txtLineas(ctx,t,ancho){ const ps=String(t).split(" "), out=[]; let l=""; ps.forEach(p=>{ const n=l?l+" "+p:p; if(ctx.measureText(n).width>ancho&&l){ out.push(l); l=p; } else l=n; }); if(l)out.push(l); return out; }
function _rRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function tarjetaAppCanvas(m){ // 1080 px de ancho; el alto se ajusta al texto
  const W=1080,H=1900, cv=document.createElement("canvas"); cv.width=W; cv.height=H; const c=cv.getContext("2d");
  const SERIF='Georgia,"Times New Roman",serif', SANS='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
  c.fillStyle="#F5F0EB"; c.fillRect(0,0,W,H);
  c.fillStyle="#1B4332"; _rRect(c,0,-60,W,400,60); c.fill();
  c.fillStyle="#F5F0EB"; _rRect(c,W/2-70,60,140,140,36); c.fill();
  c.fillStyle="#1B4332"; c.font=`bold 60px ${SERIF}`; c.textAlign="center"; c.textBaseline="middle"; c.fillText("NH",W/2,132);
  c.fillStyle="#fff"; c.font=`bold 58px ${SERIF}`; c.fillText("Nuevos Horizontes",W/2,258);
  c.fillStyle="rgba(255,255,255,.8)"; c.font=`500 34px ${SANS}`; c.fillText("Tu app de asociado",W/2,312);
  c.fillStyle="#1B4332"; c.font=`bold 64px ${SERIF}`; c.fillText(String(m.name||"").trim(),W/2,430,W-120);
  // QR
  const q=qrcode(0,"M"); q.addData(enlaceAppDe(m)); q.make(); const n=q.getModuleCount(), lado=560, mod=Math.floor(lado/(n+8)), tam=mod*(n+8), x0=(W-tam)/2, y0=490;
  c.fillStyle="#fff"; _rRect(c,x0-20,y0-20,tam+40,tam+40,36); c.fill(); c.strokeStyle="#D9E2DB"; c.lineWidth=3; c.stroke();
  c.fillStyle="#1B4332"; for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))c.fillRect(x0+(k+4)*mod,y0+(r+4)*mod,mod,mod);
  let y=y0+tam+80;
  c.fillStyle="#1B4332"; c.font=`bold 40px ${SANS}`; c.fillText("Escanéalo con la cámara del móvil",W/2,y); y+=70;
  const pasos=["Se abre tu app de Nuevos Horizontes.","Instálala: iPhone, botón Compartir → «Añadir a pantalla de inicio». Android, tres puntos → «Añadir a pantalla de inicio».","Ábrela siempre desde el icono NH."];
  c.textAlign="left"; c.textBaseline="alphabetic";
  pasos.forEach((t,i)=>{ c.fillStyle="#1B4332"; c.beginPath(); c.arc(130,y-12,28,0,Math.PI*2); c.fill(); c.fillStyle="#fff"; c.font=`bold 32px ${SANS}`; c.textAlign="center"; c.fillText(String(i+1),130,y);
    c.textAlign="left"; c.fillStyle="#2C2C2C"; c.font=`32px ${SANS}`; _txtLineas(c,t,W-300).forEach((l,j)=>{ c.fillText(l,185,y+j*44); }); y+=Math.max(1,_txtLineas(c,t,W-300).length)*44+30; });
  y+=20; c.fillStyle="#8A4F12"; c.font=`bold 30px ${SANS}`; c.textAlign="center"; c.fillText("Este código es solo tuyo: no lo compartas.",W/2,y);
  y+=50; c.fillStyle="#8A847C"; c.font=`28px ${SANS}`; c.fillText("Nuevos Horizontes · Construyendo un nuevo sistema",W/2,y);
  const fin=document.createElement("canvas"); fin.width=W; fin.height=y+50; fin.getContext("2d").drawImage(cv,0,0); // se recorta lo que sobra abajo
  return fin;
}
async function abrirTarjetaApp(mid){
  const m=DATA.members.find(x=>x.id===mid); if(!m||!m.codigoApp)return;
  openModal("app_tarjeta",{mid,img:null});
  try{ await _cargarQR(); }catch(e){ toast("No se pudo preparar el QR: revisa la conexión",4000); closeModal(); return; }
  if(!MODAL||MODAL.type!=="app_tarjeta"||MODAL.mid!==mid)return;
  MODAL.img=tarjetaAppCanvas(m).toDataURL("image/png"); render();
}
function appTarjetaModalHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid); if(!m)return "";
  return `<div class="modal-title">📸 Tarjeta de ${escH(m.name.split(" ")[0])}</div>
    ${MODAL.img?`<img src="${MODAL.img}" alt="Tarjeta con el QR de ${escH(m.name)}" style="width:100%;border-radius:14px;border:1px solid var(--border);display:block">`:`<div class="ini-sin" style="padding:30px 0;text-align:center">Preparando la tarjeta…</div>`}
    <div style="font-size:13px;color:var(--muted);margin:8px 0 10px;line-height:1.4">Con el QR se abre su app. Es como su enlace: solo para ${escH(m.name.split(" ")[0])}.</div>
    ${MODAL.img?`<button class="cgt-b pri" style="width:100%;min-height:50px;font-size:16px;background:#15803D;border-color:#15803D" onclick="appCompartirTarjeta()">💬 Compartir la imagen</button>
    <button class="m-sec" style="margin-top:8px" onclick="appDescargarTarjeta()">💾 Guardar la imagen</button>`:""}
    <button class="m-sec" style="margin-top:8px" onclick="closeModal()">Cerrar</button>`;
}
function _appTarjetaNombre(m){ return "NH_app_"+String(m.name||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"_")+".png"; }
async function appCompartirTarjeta(){
  const m=DATA.members.find(x=>x.id===MODAL.mid); if(!m||!MODAL.img)return;
  try{ const blob=await (await fetch(MODAL.img)).blob(), f=new File([blob],_appTarjetaNombre(m),{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],text:_appMensajeWA(m)}); return; } }
  catch(e){ if(e&&e.name==="AbortError")return; }
  appDescargarTarjeta(); toast("Tu móvil no deja compartirla desde aquí: se ha guardado la imagen",4500);
}
function appDescargarTarjeta(){ const m=DATA.members.find(x=>x.id===MODAL.mid); if(!m||!MODAL.img)return; const a=document.createElement("a"); a.href=MODAL.img; a.download=_appTarjetaNombre(m); document.body.appendChild(a); a.click(); a.remove(); }
// Todas las tarjetas, para imprimir (4 por hoja). Se abre encima de la app; «Cerrar» la quita.
async function imprimirTarjetasApp(){
  const ms=DATA.members.filter(m=>tieneFichaApp(m)&&m.codigoApp).sort((a,b)=>a.name.localeCompare(b.name,"es")); if(!ms.length){ toast("Primero crea los códigos"); return; }
  toast("Preparando "+ms.length+" tarjetas…",3000);
  try{ await _cargarQR(); }catch(e){ toast("No se pudo preparar el QR: revisa la conexión",4000); return; }
  const imgs=ms.map(m=>`<img src="${tarjetaAppCanvas(m).toDataURL("image/png")}" alt="${escH(m.name)}">`).join("");
  const d=document.createElement("div"); d.id="nh-tarjetas";
  d.innerHTML=`<style>#nh-tarjetas{position:fixed;inset:0;z-index:300;background:#fff;overflow:auto;padding:calc(12px + env(safe-area-inset-top)) 12px 30px}
    #nh-tarjetas .nt-bar{position:sticky;top:0;display:flex;gap:8px;background:#fff;padding-bottom:10px}#nh-tarjetas .nt-bar button{flex:1;min-height:48px;border-radius:12px;font-size:16px;font-weight:800;border:1.5px solid #1B4332}
    #nh-tarjetas .nt-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}#nh-tarjetas img{width:100%;border:1px dashed #bbb;break-inside:avoid;page-break-inside:avoid}
    @media print{body>*:not(#nh-tarjetas){display:none!important}#nh-tarjetas{position:static;padding:0;overflow:visible}#nh-tarjetas .nt-bar{display:none}#nh-tarjetas .nt-g{gap:6mm}#nh-tarjetas img{width:88mm;border:1px dashed #999}}</style>
    <div class="nt-bar"><button style="background:#1B4332;color:#fff" onclick="window.print()">🖨️ Imprimir</button><button style="background:#fff;color:#1B4332" onclick="document.getElementById('nh-tarjetas').remove()">Cerrar</button></div>
    <div class="nt-g">${imgs}</div>`;
  document.body.appendChild(d);
}
