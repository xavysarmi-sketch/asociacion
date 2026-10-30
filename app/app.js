// Nuevos Horizontes · app/app.js — APP DE ASOCIADOS (v45.52)
// Cada persona entra con su enlace (app/?c=CÓDIGO). La app lee SOLO su ficha privada
// (fichas/CÓDIGO en Firebase), y después carga los MISMOS archivos de reglas que la app del
// administrador (../js/…): todas las cifras salen de las mismas funciones, nunca de copias.
// Solo lee: no escribe nada salvo una petición de ayuda cuando la persona la envía.
// Lo que se ejecuta al cargarse es solo el arranque (nhaArrancar, al final del archivo).

const NHA_ARCHIVOS=["maestro","utilidades","datos","reglas","iconos","general","cierre","grupos","documentos","personas","ayudas","gestion","enlaces","inicio","arranque"];
const NHA_COD_RE=/^[a-z2-9]{20}$/;
let NHA={pant:"inicio",codigo:null,m:null,publicada:null,faq:{},pedirArm:false,enviando:false};

// ── Arranque ──────────────────────────────────────────────────────────────────
function nhaCodigo(){
  let c="", hay=false; try{ const u=new URLSearchParams(location.search); hay=u.has("c"); c=(u.get("c")||"").trim().toLowerCase(); }catch(e){}
  if(NHA_COD_RE.test(c)){ try{ localStorage.setItem("nha-codigo",c); }catch(e){} return c; }
  if(hay)return null; // un código mal copiado no abre nunca la cuenta guardada en el móvil
  try{ c=localStorage.getItem("nha-codigo")||""; }catch(e){ c=""; } // abierta desde la pantalla de inicio sin el código en la dirección
  return NHA_COD_RE.test(c)?c:null;
}
function nhaCargarScript(src){
  return new Promise((ok,ko)=>{ const s=document.createElement("script"); s.src=src; s.onload=()=>ok(); s.onerror=()=>ko(new Error("No se pudo cargar "+src)); document.body.appendChild(s); });
}
function nhaEsperarFirebase(){
  if(window._fbReady)return Promise.resolve();
  return new Promise(res=>{ const t=setTimeout(res,8000); window.addEventListener("firebase-ready",()=>{ clearTimeout(t); res(); },{once:true}); });
}
function nhaError(tipo){
  const T={
    "sin-codigo":["🔗","Falta tu código","Abre la app con el enlace que te envió el administrador."],
    "no-existe":["🔍","No encontramos tu cuenta","El enlace no es correcto o ya no está en uso. Pide uno nuevo al administrador."],
    "cerrada":["🚪","Tu cuenta ya está cerrada","Tu salida del fondo ya está liquidada. Gracias por haber formado parte de Nuevos Horizontes."],
    "conexion":["📶","No se ha podido cargar","Comprueba tu conexión a internet y vuelve a abrir la app."]
  }[tipo]||["⚠️","Algo no ha ido bien","Vuelve a abrir la app. Si sigue igual, avisa al administrador."];
  document.getElementById("app").innerHTML=`<div class="nha-error"><div class="nha-logo nha-luz"><span>NH</span></div><div class="nha-error-ic">${T[0]}</div>
    <div class="nha-error-tit">${T[1]}</div><div class="nha-error-txt">${T[2]}</div>
    ${tipo==="conexion"?`<button class="nha-btn" onclick="location.reload()">Volver a intentarlo</button>`:""}</div>`;
}
async function nhaArrancar(){
  const c=nhaCodigo(); if(!c)return nhaError("sin-codigo");
  await nhaEsperarFirebase();
  let doc=null;
  try{ doc=await window._fbFichas.leer(c); }catch(e){ console.error("[NH app] lectura:",e); return nhaError(e&&e.code==="permission-denied"?"no-existe":"conexion"); }
  if(!doc)return nhaError(window.NH_FIREBASE_MODE?"no-existe":"conexion");
  if(doc.cerrada)return nhaError("cerrada");
  let f=null; try{ f=JSON.parse(doc.payload); }catch(e){}
  if(!f||!f.datos||!f.mid)return nhaError("otro");
  window.NH_APP_ASOCIADOS={mid:f.mid};
  try{ for(const a of NHA_ARCHIVOS)await nhaCargarScript("../js/"+a+".js?v="+(window.NH_APP_V||"")); }
  catch(e){ console.error("[NH app]",e); return nhaError("conexion"); }
  DATA=f.datos;
  (DATA.members||[]).forEach(m=>{ if(!m.history)m.history=[]; if(!m.loans)m.loans=[]; if(!m.closedLoans)m.closedLoans=[]; });
  NHA.codigo=c; NHA.publicada=doc.t||DATA.updatedAt||null;
  _renderPantalla=nhaPantalla; // render() (js/general.js) pinta ahora la app de asociados
  // Los simuladores (js/ayudas.js) se usan tal cual, pero en una pantalla propia («Simular») en vez de en una ventana:
  const _simPintarBase=simPintar; simPintar=function(){ const prev=MODAL; if(!MODAL&&NHA.pant==="simular"&&NHA.m)MODAL={type:"sim",mid:NHA.m.id}; try{ _simPintarBase(); } finally { MODAL=prev; } nhaPedirActualizar(); }; // al mover las barras, el cuadro «Pídelo» también
  const _abrirSimBase=abrirSimulador; abrirSimulador=function(mid,tab){ _abrirSimBase(mid,tab); nhaSimSinCifras(); MODAL=null; if(NHA.pant!=="simular")NHA.simDesde=NHA.pant; NHA.pant="simular"; render(); window.scrollTo(0,0); };
  setCurrentMonthYear();      // mes operativo de hoy (solo en pantalla: aquí no se guarda nada)
  SYNC_STATUS="ok";
  render();
  nhaAvisarInstalada();
}
// v45.61: la primera vez que se abre desde el icono del móvil, se avisa al administrador («✓ instalada»).
// Solo se guarda la fecha y el tipo de móvil. Si falla (sin conexión o sin permiso), se reintenta la próxima vez.
async function nhaAvisarInstalada(){
  try{
    if(!nhaInstalada()||!NHA.codigo||!window._fbFichas||!window._fbFichas.instalada)return;
    const k="nha-inst-"+NHA.codigo; if(localStorage.getItem(k))return;
    const s=nhaSistema(); await window._fbFichas.instalada(NHA.codigo,{t:Date.now(),so:s.so==="ios"?"ios":s.so==="android"?"android":"otro"});
    localStorage.setItem(k,"1");
  }catch(e){}
}

// ── Piezas de la ficha personal (las mismas que el enlace de siempre) ─────────
// Se pinta la ficha personal de la pestaña pedida y se separa: lo de arriba (lo que corresponde
// este mes) y el contenido de la pestaña. Así no se rehace ningún cálculo.
function nhaPartes(m,tab){
  FICHA_TAB=tab; const html=_fichaHTMLpersonal(m,true);
  const t=document.createElement("template"); t.innerHTML=html;
  let fase=0; const arriba=[], cuerpo=[];
  Array.from(t.content.childNodes).forEach(n=>{
    if(n.nodeType!==1)return;
    if(n.classList.contains("fid-card"))return;
    if(n.classList.contains("ft-tabs")){ fase=1; return; }
    if(n.classList.contains("ficha-section")){ fase=2; return; }
    if(/Vista personal · Solo lectura/.test(n.textContent))return;
    if(fase===0)arriba.push(n.outerHTML); else if(fase===1)cuerpo.push(n.outerHTML);
  });
  return {arriba:arriba.join(""),cuerpo:FICHA_TAB===tab?cuerpo.join(""):"",filas:nhaFilas(cuerpo.join(""))};
}
function nhaFilas(html){ // filas «etiqueta → valor» de una pestaña, tal como se pintan
  const t=document.createElement("template"); t.innerHTML=html; const o={};
  t.content.querySelectorAll(".ft-row").forEach(r=>{ const l=r.querySelector(".ft-lbl"), v=r.querySelector(".ft-val"); if(l&&v){ const k=(l.childNodes[0]&&l.childNodes[0].nodeType===3?l.childNodes[0].nodeValue:l.textContent).trim(); if(!(k in o))o[k]={html:v.innerHTML,txt:v.textContent.trim(),lblHtml:l.innerHTML}; } });
  return o;
}
function nhaGrupo(m){ return (DATA.gruposCierre||[]).find(g=>g&&g.principalId===m.id)||null; }
function nhaPrimerNombre(m){ return escH(String(m.name||"").trim().split(/\s+/)[0]||""); }
function nhaIniciales(m){ return escH(String(m.name||"").trim().split(/\s+/).slice(0,2).map(w=>w[0]||"").join("").toUpperCase()); }
function nhaIr(p){ if(p!==NHA.pant&&NHA.pant!=="simular")NHA.prev=NHA.pant; NHA.pant=p; MODAL=null; render(); window.scrollTo(0,0); }
// v45.59: «‹ Atrás» arriba en cualquier pantalla que no sea Inicio (vuelve a la anterior o a Inicio)
function nhaAtras(){ const p=NHA.pant==="simular"?(NHA.simDesde||"inicio"):(NHA.prev&&NHA.prev!==NHA.pant?NHA.prev:"inicio"); NHA.prev="inicio"; NHA.pant=p; MODAL=null; render(); window.scrollTo(0,0); }
function nhaFecha(ts){ return ts?new Date(ts).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"}):"—"; }
const _nhaDots=`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>`;

// ── Pantalla ──────────────────────────────────────────────────────────────────
function nhaPantalla(){
  const app=document.getElementById("app");
  const m=DATA.members.find(x=>x.id===READONLY_ID); NHA.m=m;
  if(!m){ nhaError("no-existe"); return; }
  const salidaPend=!!(m.baja&&m.baja.v18&&!m.baja.pagada&&salidaResumenDatos(m));
  if(m.baja&&!salidaPend){ nhaError("cerrada"); return; }
  if(NHA.bienvenida==null)NHA.bienvenida=!nhaInstalada()&&!nhaBienvenidaVista();
  if(NHA.bienvenida){ app.innerHTML=nhaBienvenidaHTML(m); return; }
  const esTerc=m.type==="tercero", g=nhaGrupo(m);
  const puedeSim=!esTerc&&!!m.joinMonth;
  // Barra de abajo. El responsable de un grupo tiene además «Mi grupo». v45.56: los simuladores ya no van aquí:
  // están en Inicio (los dos), en Ayudas («¿Cuánto puedo pedir?») y en Aportes («¿Cuánto puedo ganar?»).
  const pants=[["inicio","home","Inicio"]].concat(esTerc?[]:[["aportes","wallet","Aportes"]],[["ayudas","hand","Ayudas"]],g?[["grupo","users","Mi grupo"]]:[],[["mas","","Más"]]);
  const validas=pants.map(p=>p[0]).concat(puedeSim?["simular"]:[]);
  if(!validas.includes(NHA.pant))NHA.pant="inicio";
  let h=`<header class="nha-top">${NHA.pant!=="inicio"?`<button class="nha-atras" onclick="nhaAtras()" aria-label="Atrás">‹</button>`:""}<div class="nha-logo nha-luz"><span>NH</span></div><div class="nha-top-txt"><div class="nha-top-hola">Hola, ${nhaPrimerNombre(m)}</div><div class="nha-top-sub">Nuevos Horizontes</div></div></header><main class="nha-main">`;
  if(NHA.pant==="inicio")h+=nhaInicioHTML(m,salidaPend,g);
  else if(NHA.pant==="aportes")h+=nhaAportesHTML(m);
  else if(NHA.pant==="ayudas")h+=nhaAyudasHTML(m);
  else if(NHA.pant==="grupo")h+=nhaGrupoHTML(m,g);
  else if(NHA.pant==="simular")h+=nhaSimularHTML(m);
  else h+=nhaMasHTML(m);
  h+=`<div class="nha-pie">Datos al ${escH(nhaFecha(NHA.publicada))} · <button class="nha-pie-b" onclick="location.reload()">🔄 Actualizar</button><br>Solo consulta: los pagos los anota el administrador · ${escH(APP_VERSION)}</div></main>`;
  h+=`<nav class="nha-nav">${pants.map(([id,ic,txt])=>`<button class="nha-nav-btn${NHA.pant===id?" on":""}" onclick="nhaIr('${id}')">${ic?_icSVG(ic):_nhaDots}<span>${txt}</span></button>`).join("")}</nav>`;
  if(MODAL){
    let c="";
    if(MODAL.type==="history")c=historyModalHTML();
    if(c)h+=`<div class="modal-bg" onclick="closeModal()"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>${c}</div></div>`;
  }
  app.innerHTML=h;
}
// Título de cada pantalla: con el icono de la sección
function nhaTitulo(m,t,sub,ic){
  return `<div class="nha-tit"><div class="nha-tit-ic">${_icSVG(ic||"user")}</div><div><h1>${t}</h1></div></div>`; // v45.60: sin subtítulo (repetía el título)
}

// ── Inicio ──
function nhaInicioHTML(m,salidaPend,g){
  const esTerc=m.type==="tercero", p=nhaPartes(m,"resumen"), f=p.filas;
  let h="";
  if(salidaPend)h+=salidaAvisoFichaHTML(m); else if(pausaVigente(m))h+=pausaAvisoFichaHTML(m);
  h+=p.arriba; // lo que corresponde este mes (el mismo cuadro verde de siempre)
  if(!esTerc&&f["Total aportado al fondo"]){
    const desde=f["Mes de ingreso"]?f["Mes de ingreso"].txt:"";
    h+=`<div class="nha-tiles">
      <div class="nha-tile"><div class="nha-tile-ic">🏦</div><div class="nha-tile-lbl">Total aportado</div><div class="nha-tile-val">${f["Total aportado al fondo"].html}</div>${desde?`<div class="nha-tile-sub">Desde ${escH(desde.toLowerCase())}</div>`:""}</div>
      <div class="nha-tile"><div class="nha-tile-ic">📈</div><div class="nha-tile-lbl">Beneficios</div><div class="nha-tile-val nha-verde">${f["Beneficios acumulados"]?f["Beneficios acumulados"].html:"—"}</div><div class="nha-tile-sub">Acumulados hasta hoy</div></div>
    </div>`;
    const ret=Object.keys(f).find(k=>/^Beneficio ya retirado/.test(k));
    h+=`<div class="nha-card nha-acum">${ret?`<div class="ft-row"><span class="ft-lbl">${f[ret].lblHtml}</span><span class="ft-val" style="color:#B08D3E">${f[ret].html}</span></div>`:""}
      <div class="ft-row ft-total" style="border-bottom:none"><span class="ft-lbl">Llevas acumulado hasta ahora</span><span class="ft-val" style="color:#1B4332">${f["Llevas acumulado hasta ahora"]?f["Llevas acumulado hasta ahora"].html:"—"}</span></div></div>`;
    h+=nhaPermanenciaHTML(m,f);
  } else if(esTerc){
    h+=p.cuerpo;
  }
  h+=nhaImportanteHTML(m,g);
  if(!esTerc&&m.joinMonth)h+=`<div class="nha-accesos"><button onclick="abrirSimulador('${esc(m.id)}','ayuda')"><span class="nha-acc-ic">${_icSVG("bulb")}</span><b>¿Cuánto puedo pedir?</b><small>Simula una ayuda</small></button>
    <button onclick="abrirSimulador('${esc(m.id)}','ben')"><span class="nha-acc-ic">${_icSVG("sprout")}</span><b>¿Cuánto puedo ganar?</b><small>Simula tus beneficios</small></button></div>`;
  return h;
}
function nhaPermanenciaHTML(m,f){
  const meses=memberMonths(m), c=m.ciclo;
  const fin=f["Permanencia"]?((f["Permanencia"].html.match(/<span[^>]*>([^<]*)<\/span>/)||[])[1]||""):"";
  if(c===0)return `<div class="nha-perm"><div class="nha-perm-top"><span class="nha-perm-ic">🌱</span><b>Tu permanencia</b><span class="nha-perm-n">Indefinida</span></div>
    <div class="nha-perm-txt">Llevas ${meses} ${meses===1?"mes":"meses"} en el fondo.</div></div>`;
  if(c==null)return "";
  const pct=Math.max(0,Math.min(100,Math.round(meses/c*100)));
  return `<div class="nha-perm"><div class="nha-perm-top"><span class="nha-perm-ic">🌱</span><b>Tu permanencia</b><span class="nha-perm-n">${Math.min(meses,c)} de ${c} meses</span></div>
    <div class="nha-barra"><div style="width:${pct}%"></div></div>
    <div class="nha-perm-txt">${fin?`Llega ${escH(fin)}.`:""} Puedes ampliarla cuando quieras.</div></div>`;
}
function nhaImportanteHTML(m,g){
  const items=[], rep=_idxMes(DATA.reportMonth,DATA.reportYear);
  (m.loans||[]).forEach(l=>{ const i=(l.pays||[]).findIndex(p=>!p.paid); if(i<0)return;
    const p=l.pays[i], pag=l.pays.filter(x=>x.paid).length, ult=esUltimaCuota(l,i);
    items.push(["📅",`${ult?"Última cuota":"Próxima cuota"} de tu ayuda de ${fmtEur(l.capital)} €`,`${fmtEur(cuotaDe(l,i))} € · ${MONTHS_FULL[MONTHS.indexOf(p.m)].toLowerCase()} ${p.y} · llevas ${pag} de ${l.n} pagadas`,"ayudas"]); });
  (DATA.solicitudes||[]).forEach(s=>{
    const mi=s.mes&&/^\d{4}-\d{2}$/.test(s.mes)?MONTHS_FULL[parseInt(s.mes.slice(5))-1].toLowerCase():"";
    if(s.estado==="pendiente")items.push(["📝",`Tu solicitud de ${fmtEur(s.capital)} € está apuntada`,`${s.cuotas} ${s.cuotas===1?"cuota":"cuotas"}${mi?` · para ${mi}`:""}. Te avisaremos cuando se decida.`,"ayudas"]);
    else if(s.estado==="otorgada"&&s.mesOtorgada===getMesKey(DATA.reportMonth,DATA.reportYear))items.push(["✅",`Tu ayuda de ${fmtEur(s.capital)} € está aprobada`,`Este mes. La verás en «Ayudas».`,"ayudas"]);
  });
  const pe=nhaPeticionLocal();
  if(pe&&!(DATA.solicitudes||[]).some(s=>s.origen==="app"&&s.estado!=="no"&&Math.abs((s.capital||0)-pe.capital)<0.01))
    items.push(["📲",`Has pedido una ayuda de ${fmtEur(pe.capital)} €`,`El ${new Date(pe.ts).toLocaleDateString("es-ES",{day:"numeric",month:"long"})}. El administrador lo revisará y te avisará.`,"ayudas"]);
  if(g){ const ms=[g.principalId,...(g.miembros||[])].map(id=>DATA.members.find(x=>x.id===id)).filter(x=>x&&activoEnReporte(x));
    const tot=_r2(ms.reduce((s,x)=>s+totalDelMes(x,DATA.reportMonth,DATA.reportYear).total,0)), pend=_r2(ms.reduce((s,x)=>s+totalDelMes(x,DATA.reportMonth,DATA.reportYear).pendiente,0));
    items.push(["👥",`Tu grupo este mes: ${fmtEur(tot)} €`,pend>0?`Falta por cobrar ${fmtEur(pend)} €`:"Todo cobrado",`grupo`]); }
  let h=`<div class="nha-card"><div class="nha-kicker">Para ti</div><div class="nha-card-tit">Lo importante</div>`;
  if(!items.length)h+=`<div class="nha-vacio">Todo en orden. No tienes nada pendiente aparte de lo de este mes.</div>`;
  items.forEach(([ic,t,s,ir])=>{ t=t.replace(/ €/g,"&nbsp;€"); s=s.replace(/ €/g,"&nbsp;€"); h+=`<button class="nha-item" onclick="nhaIr('${ir}')"><span class="nha-item-ic">${ic}</span><span class="nha-item-txt"><b>${t}</b><span>${s}</span></span><span class="nha-item-fl">›</span></button>`; });
  return h+`</div>`;
}

// ── Aportes (y beneficios) ──
function nhaAportesHTML(m){
  const a=nhaPartes(m,"aportes"), b=nhaPartes(m,"beneficios");
  return nhaTitulo(m,"Mis aportes","Lo que has aportado y tus beneficios.","wallet")+a.cuerpo+(b.cuerpo?`<div class="nha-sec">Beneficios</div>`+b.cuerpo:"")+nhaSimBotonesHTML(m,"ben");
}
// ── Ayudas ──
function nhaAyudasHTML(m){
  const a=nhaPartes(m,"ayudas"), esTerc=m.type==="tercero";
  let h=nhaTitulo(m,"Mis ayudas","Tus cuotas, mes a mes.","hand")+a.cuerpo;
  if(!esTerc&&m.joinMonth)h+=`<div class="nha-card nha-pedir"><div class="nha-card-tit">¿Necesitas una ayuda?</div>
    <div class="nha-txt">Mira cuánto puedes pedir y en cuántos meses devolverlo. Si te encaja, desde ahí mismo se lo pides al administrador.</div>
    <button class="nha-btn" onclick="abrirSimulador('${esc(m.id)}','ayuda')">💡 ¿Cuánto puedo pedir?</button></div>`;
  else if(esTerc)h+=`<div class="nha-card"><div class="nha-txt">Para pedir una ayuda, habla con tu aval o con el administrador.</div></div>`;
  return h;
}
// ── Mi grupo (solo el responsable) ──
function nhaGrupoHTML(m,g){
  const rm=DATA.reportMonth, ry=DATA.reportYear, ids=[g.principalId,...(g.miembros||[])];
  const ms=ids.map(id=>DATA.members.find(x=>x.id===id)).filter(Boolean), act=ms.filter(activoEnReporte);
  const tot=_r2(act.reduce((s,x)=>s+totalDelMes(x,rm,ry).total,0)), pend=_r2(act.reduce((s,x)=>s+totalDelMes(x,rm,ry).pendiente,0)), abiertos=_nAbiertosG(ms,rm,ry);
  let h=nhaTitulo(m,"Mi grupo","Lo de este mes de cada persona de tu grupo.","users");
  const nOk=act.filter(x=>totalDelMes(x,rm,ry).alDia).length, pct=tot>0?Math.round((tot-pend)/tot*100):100;
  h+=`<div class="nha-grupo"><div class="nha-grupo-mes">${escH(MONTHS_FULL[MONTHS.indexOf(rm)])} ${ry} · ${act.length} ${act.length===1?"persona":"personas"}</div>
    <div class="nha-grupo-lbl">Total del grupo este mes</div><div class="nha-grupo-num">${fmtEur(tot)}&nbsp;€${abiertos>0?`<span> + los aportes</span>`:""}</div>
    <div class="nha-grupo-barra"><div style="width:${pct}%"></div></div>
    <div class="nha-grupo-2"><div><small>Cobrado</small><b>${fmtEur(_r2(tot-pend))}&nbsp;€</b></div><div class="${pend>0?"falta":""}"><small>Falta</small><b>${fmtEur(pend)}&nbsp;€</b></div></div>
    <div class="nha-grupo-res">${nOk===act.length?"✅ Todos al día":`✅ ${nOk} al día · ⏳ ${act.length-nOk} con algo pendiente`}</div></div>`;
  if(_nBaseG(ms,rm,ry)>0)h+=`<div class="nha-nota">Los aportes aún sin pagar se cuentan con 50 €: cada uno puede aportar 50, 100, 150 o 200 €.</div>`;
  h+=nhaCtlResumenHTML(m,act,rm,ry);
  // Estado de cada persona (una fila); al tocarla se abre su detalle, el mismo del reporte de grupo
  h+=`<div class="nha-card nha-gest"><div class="nha-card-tit">Cada persona</div><div class="nha-nota" style="margin:0 0 6px">Toca un nombre para ver su detalle.</div>`;
  const ctl=nhaCtlLeer();
  act.slice().sort((a,b)=>(totalDelMes(a,rm,ry).alDia?1:0)-(totalDelMes(b,rm,ry).alDia?1:0)).forEach(x=>{ const t=totalDelMes(x,rm,ry), ab=!!DESP["nhag-"+x.id], abierto=x.type!=="tercero"&&aporteMostradoMes(x,rm,ry).abierto;
    const marca=!t.alDia&&ctl[x.id]!=null?ctl[x.id]:null;
    const est=t.alDia?`<span class="nha-chip ok">Al día</span>`:marca!=null?`<span class="nha-chip dado">Te dio ${fmtEur(marca)}&nbsp;€</span>`:`<span class="nha-chip pend">Falta ${fmtEur(t.pendiente)}&nbsp;€${abierto?" + aporte":""}</span>`;
    const circ=t.alDia?`<span class="nha-ctl-c ok" title="Al día">✓</span>`
      :`<button class="nha-ctl-c${marca!=null?" on":""}" aria-label="${marca!=null?"Quitar la marca":"Me lo ha dado"}" onclick="nhaCtlToca('${esc(x.id)}')">${marca!=null?"✓":""}</button>`;
    h+=`<div class="nha-gfila-w">${circ}<button class="nha-gfila ${t.alDia?"ok":marca!=null?"dado":"pend"}" onclick="nhaGFila('${esc(x.id)}')"><span class="nha-gfila-n"><b>${escH(x.name)}</b>${est}</span><span class="nha-gfila-t">${fmtEur(t.total)}&nbsp;€</span><span class="nha-item-fl" style="transform:rotate(${ab?90:0}deg)">›</span></button></div>`;
    if(NHA.ctlPreg===x.id)h+=nhaCtlPreguntaHTML(x,t);
    else if(nhaCtlAporteLibre(x,t))h+=marca!=null
      ?`<div class="nha-ctl-ap">Con aporte de ${fmtEur(_r2(marca-(t.pendiente-APORTE_MINIMO)))}&nbsp;€ · <button onclick="NHA.ctlPreg='${esc(x.id)}';render()">Cambiar</button></div>`
      :`<div class="nha-ctl-ap">Aporte de 50&nbsp;€ · <button onclick="NHA.ctlPreg='${esc(x.id)}';render()">¿Pone más? Elegir</button></div>`;
    if(ab)h+=`<div class="nha-gdet">${fichaResumenHTML(x)}${t.alDia?"":`<button class="nha-btn nha-wa" onclick="nhaCtlWaPersona('${esc(x.id)}')">💬 Enviar a ${nhaPrimerNombre(x)} lo que le queda</button>`}<button class="nha-gdet-cerrar" onclick="nhaGFila('${esc(x.id)}')">Cerrar ✕</button></div>`; });
  return h+`</div>`;
}
// ── «Tu control» del responsable (v45.56, decisión de Ángel 30/10/2026) ──
// Marcas SOLO en el móvil del responsable (localStorage, por código y mes). No se escribe nada en
// Firestore, ni en la app del administrador, ni en el Excel: lo que cuenta es lo que anota el administrador.
function nhaCtlKey(){ return "nha-ctl-"+NHA.codigo+"-"+DATA.reportYear+"-"+DATA.reportMonth; }
function nhaCtlLeer(){ try{ const o=JSON.parse(localStorage.getItem(nhaCtlKey())||"{}"); return o&&typeof o==="object"?o:{}; }catch(e){ return {}; } }
function nhaCtlGuardar(o){
  try{
    const k=nhaCtlKey(), pre="nha-ctl-"+NHA.codigo+"-";
    for(let i=localStorage.length-1;i>=0;i--){ const kk=localStorage.key(i); if(kk&&kk.startsWith(pre)&&kk!==k)localStorage.removeItem(kk); } // meses pasados: fuera
    if(Object.keys(o).length)localStorage.setItem(k,JSON.stringify(o)); else localStorage.removeItem(k);
  }catch(e){}
}
function _nhaCtlPersona(id){ return (DATA.members||[]).find(x=>String(x.id)===String(id)); }
function nhaCtlToca(id){
  const x=_nhaCtlPersona(id); if(!x)return; const rm=DATA.reportMonth, ry=DATA.reportYear, t=totalDelMes(x,rm,ry), o=nhaCtlLeer();
  if(o[id]!=null){ delete o[id]; nhaCtlGuardar(o); NHA.ctlPreg=null; render(); return; }
  o[id]=t.pendiente; nhaCtlGuardar(o); NHA.ctlPreg=null; render(); // v45.58: casi todos ponen 50 €; si puso más, «Cambiar»
}
// Aporte sin pagar y sin aporte habitual anotado (> 50 €): el asociado elige cuánto pone (AP-2)
function nhaCtlAporteLibre(x,t){ return x.type==="asociado"&&!t.aportePagado&&t.aporteImporte>0&&aporteBaseDe(x)<=APORTE_MINIMO; }
function nhaCtlPreguntaHTML(x,t){
  const otros=_r2(t.pendiente-APORTE_MINIMO);
  return `<div class="nha-ctl-preg"><div>¿Cuánto ha aportado <b>${nhaPrimerNombre(x)}</b> este mes?</div><div class="nha-ctl-ops">${REGLAS.APORTE_OPCIONES.map(v=>`<button onclick="nhaCtlMarca('${esc(x.id)}',${_r2(otros+v)})">${v} €</button>`).join("")}</div>
    ${otros>0?`<small>Se suma a lo demás que le toca (${fmtEur(otros)} €).</small>`:""}<button class="nha-ctl-x" onclick="NHA.ctlPreg=null;render()">Cancelar</button></div>`;
}
function nhaGFila(id){ const k="nhag-"+id; DESP[k]=!DESP[k]; NHA.ctlPreg=null; render(); }
function nhaCtlMarca(id,imp){ const o=nhaCtlLeer(); o[id]=imp; nhaCtlGuardar(o); NHA.ctlPreg=null; render(); }
function nhaCtlBorrar(){
  if(!NHA.ctlBorrarArm){ NHA.ctlBorrarArm=true; render(); setTimeout(()=>{ if(NHA.ctlBorrarArm){ NHA.ctlBorrarArm=false; render(); } },4000); return; }
  NHA.ctlBorrarArm=false; nhaCtlGuardar({}); render();
}
function nhaCtlResumenHTML(m,act,rm,ry){
  const ctl=nhaCtlLeer(); let rec=0, nRec=0, falta=0, nFalta=0;
  act.forEach(x=>{ const t=totalDelMes(x,rm,ry); if(t.alDia)return; if(ctl[x.id]!=null){ rec+=ctl[x.id]; nRec++; } else { falta+=t.pendiente; nFalta++; } });
  rec=_r2(rec); falta=_r2(falta);
  return `<div class="nha-card nha-ctl"><div class="nha-card-tit">Tu control</div>
    <div class="nha-ctl-2"><div><small>Has recogido</small><b>${fmtEur(rec)}&nbsp;€</b><span>${nRec} ${nRec===1?"persona":"personas"}</span></div><div class="${falta>0?"falta":""}"><small>Te falta recoger</small><b>${fmtEur(falta)}&nbsp;€</b><span>${nFalta} ${nFalta===1?"persona":"personas"}</span></div></div>
    <button class="nha-ctl-info" onclick="DESP['nha-ctl-info']=!DESP['nha-ctl-info'];render()">ℹ️ ¿Cómo funciona? <span style="transform:rotate(${DESP["nha-ctl-info"]?90:0}deg)">›</span></button>
    ${DESP["nha-ctl-info"]?`<div class="nha-ctl-info-t">Toca el círculo de cada persona cuando te pague. Si ha puesto más de 50 € de aporte, elige cuánto. <b>Solo se guarda en este móvil</b> y no cambia los datos de nadie: lo que cuenta es lo que anota el administrador. Las marcas se borran solas al empezar el mes.</div>`:""}
    <button class="nha-btn nha-wa" onclick="nhaCtlWaAdmin()">💬 Enviar al administrador</button>
    ${nRec?`<button class="nha-ctl-borrar" onclick="nhaCtlBorrar()">${NHA.ctlBorrarArm?"Toca otra vez para borrar tus marcas":"Borrar mis marcas"}</button>`:""}</div>`;
}
function _nhaMesTxt(){ return MONTHS_FULL[MONTHS.indexOf(DATA.reportMonth)].toLowerCase()+" "+DATA.reportYear; }
function _nhaWa(txt){ window.open("https://wa.me/?text="+encodeURIComponent(txt),"_blank"); }
// A una persona: SOLO lo suyo de este mes
function nhaCtlWaPersona(id){
  const x=_nhaCtlPersona(id); if(!x)return; const rm=DATA.reportMonth, ry=DATA.reportYear, t=totalDelMes(x,rm,ry);
  const nom=String(x.name||"").trim().split(/\s+/)[0], L=[`Hola ${nom} 👋`,`Esto es lo que te toca pagar en ${_nhaMesTxt()}:`,""];
  if(x.type!=="tercero"&&!t.aportePagado&&t.aporteImporte>0){ const lib=nhaCtlAporteLibre(x,t); L.push(`• Tu aporte: ${fmtEur(t.aporteImporte)} €${lib?" (si quieres, puedes poner más: 100, 150 o 200 €)":""}`); }
  t.cuotas.filter(c=>!c.paid).forEach(c=>{ const tot=(c.loan.pays||[]).length, num=c.idx+1, mesAy=MONTHS_FULL[MONTHS.indexOf(c.loan.gMonth)]||"";
    L.push(`• Cuota ${num} de ${tot} de tu ayuda${mesAy?" de "+mesAy.toLowerCase():""}: ${fmtEur(c.inst)} €${num===tot?". ¡Es la última!":""}`); });
  L.push("",`Total: ${fmtEur(t.pendiente)} €`,"","Gracias 🙏");
  _nhaWa(L.join("\n"));
}
// Al administrador: quién ha pagado y quién falta (según las marcas de este móvil)
function nhaCtlWaAdmin(){
  const m=NHA.m, g=nhaGrupo(m); if(!g)return; const rm=DATA.reportMonth, ry=DATA.reportYear, ctl=nhaCtlLeer();
  const ms=[g.principalId,...(g.miembros||[])].map(id=>DATA.members.find(x=>x.id===id)).filter(Boolean).filter(activoEnReporte);
  const pag=[], fal=[]; let tot=0;
  ms.forEach(x=>{ const t=totalDelMes(x,rm,ry); if(t.alDia)return; if(ctl[x.id]!=null){ pag.push(`• ${x.name}: ${fmtEur(ctl[x.id])} €`); tot+=ctl[x.id]; } else fal.push(`• ${x.name}: ${fmtEur(t.pendiente)} €`); });
  const L=[`Grupo de ${String(m.name||"").trim().split(/\s+/)[0]} · ${_nhaMesTxt()}`];
  if(pag.length)L.push("","Me han pagado:",...pag,`Total recogido: ${fmtEur(_r2(tot))} €`); else L.push("","Todavía no me ha pagado nadie.");
  if(fal.length)L.push("","Faltan:",...fal);
  _nhaWa(L.join("\n"));
}
// ── Más ──
function nhaMasHTML(m){
  const esTerc=m.type==="tercero", aval=esTerc?"":avalFichaHTML(m);
  let h=nhaTitulo(m,"Más","Tu aval, preguntas frecuentes y cómo instalarla.","settings");
  if(aval)h+=`<div class="ft-card"><div class="ft-card-title">🤝 Aval</div>${aval}</div>`;
  h+=`<div class="nha-sec">Preguntas frecuentes</div>`+nhaFaqHTML();
  h+=`<div class="nha-sec">Tener la app en el móvil</div><div class="nha-card nha-txt">${nhaInstalada()?"✅ Ya la tienes en tu móvil: ábrela siempre desde el icono <b>NH</b>.":"Instálala y la tendrás siempre a mano, con su icono, como cualquier otra app."}
    <button class="nha-btn" style="background:#2D6A4F" onclick="nhaVerBienvenida()">📲 Cómo instalarla</button></div>`;
  h+=`<div class="nha-sec">Tu enlace es privado</div><div class="nha-card nha-txt">Con tu enlace se ve tu cuenta: <b>no lo compartas</b>. Si crees que alguien más lo tiene, pídele al administrador uno nuevo y el antiguo dejará de funcionar.</div>`;
  return h;
}
// ── Simular (pantalla propia) ──
function nhaSimularHTML(m){
  if(!SIM||SIM.mid!==m.id){ const t=SIM&&SIM.tab; SIM={mid:m.id,tab:t||"ayuda",ciclo:(m.ciclo!=null?m.ciclo:12),cap:500,n:1,ap:50}; nhaSimSinCifras(); }
  const prev=MODAL; MODAL={type:"sim",mid:m.id}; let s=""; try{ s=simuladorHTML(); } finally { MODAL=prev; }
  const t=document.createElement("template"); t.innerHTML=s; const tit=t.content.querySelector(".modal-title"); if(tit){ const bar=tit.nextElementSibling; tit.remove(); if(bar)bar.remove(); } // título y pestañas propios
  const seg=(id,ic,txt)=>`<button class="${SIM.tab===id?"on":""}" onclick="SIM.tab='${id}';render()">${_icSVG(ic)}<span>${txt}</span></button>`;
  const desde=NHA.simDesde&&NHA.simDesde!=="simular"?NHA.simDesde:"inicio", nomDesde={inicio:"Inicio",aportes:"Aportes",ayudas:"Ayudas",grupo:"Mi grupo",mas:"Más"}[desde]||"Inicio";
  return `<button class="nha-volver" onclick="nhaIr('${desde}')">‹ Volver a ${nomDesde}</button>`+nhaTitulo(m,"Haz tus cuentas","Con tus datos. Es solo una simulación: no cambia nada.","sim")
    +`<div class="nha-seg">${seg("ayuda","bulb","¿Cuánto puedo pedir?")}${seg("ben","sprout","¿Cuánto puedo ganar?")}</div>`
    +`<div class="nha-card nha-sim">${t.innerHTML}${nhaPedirHTML(m)}</div>`;
}
// v45.55: el simulador de ayuda empieza sin cifras; las cuentas salen cuando la persona mueve las dos barras
function nhaSimSinCifras(){ if(!SIM)return; SIM.cap=REGLAS.AYUDA_MIN; SIM.n=1; SIM.tocCap=false; SIM.tocN=false; }
function nhaSimListo(){ return !!SIM&&SIM.tocCap!==false&&SIM.tocN!==false; }
function nhaSimBotonesHTML(m,solo){
  if(m.type==="tercero"||!m.joinMonth)return "";
  return `<div class="ficha-section nha-sims"><div class="ficha-sec-title">🧮 Simuladores</div>
    <div class="nha-txt" style="margin:-2px 0 10px">Haz cuentas con tus datos. Es solo una simulación: no cambia nada.</div>
    <div style="display:flex;gap:8px">${solo!=="ben"?`<button class="nha-sim-b" onclick="abrirSimulador('${esc(m.id)}','ayuda')">💡 ¿Cuánto<br>puedo pedir?</button>`:""}
    <button class="nha-sim-b nha-sim-b2" onclick="abrirSimulador('${esc(m.id)}','ben')">🌱 ¿Cuánto<br>puedo ganar?</button></div></div>`;
}

// ── Pedir una ayuda (desde el simulador) ──
function nhaPeticionLocal(){ try{ const p=JSON.parse(localStorage.getItem("nha-pet-"+NHA.codigo)||"null"); if(p&&Date.now()-p.ts<45*864e5)return p; }catch(e){} return null; }
function nhaPedirInfo(m){
  const need=_simPermNecesaria(m,SIM.cap,SIM.n), cur=(m.ciclo!=null?m.ciclo:12);
  if(need===null)return {ok:false,html:`Con estos datos no se puede pedir. Prueba con menos cantidad o menos meses.`};
  return {ok:true,html:`Le llegará al administrador: <b>${fmtEur(SIM.cap)}&nbsp;€</b> en <b>${SIM.n} ${SIM.n===1?"cuota":"cuotas"}</b>${need!==cur?`, ampliando tu permanencia a <b>${need===0?"indefinida":need+" meses"}</b>`:""}. Él lo revisa y te avisa.`};
}
function nhaPedirActualizar(){
  const m=NHA.m, el=document.getElementById("nha-pedir-info"); if(!m||!SIM||!el)return;
  const caja=document.querySelector(".nha-pedir-caja"); if(caja)caja.style.display=nhaSimListo()?"":"none";
  const i=nhaPedirInfo(m); el.innerHTML=i.html; const c=document.getElementById("nha-pedir-ctl"); if(c)c.style.display=i.ok?"":"none";
  if(NHA.pedirArm){ NHA.pedirArm=false; const b=document.querySelector(".nha-pedir-caja .nha-btn"); if(b){ b.classList.remove("arm"); b.textContent="Pedir esta ayuda"; } }
}
function nhaPedirHTML(m){
  if(!SIM||SIM.tab!=="ayuda"||m.type==="tercero"||!m.joinMonth)return "";
  const i=nhaPedirInfo(m);
  return `<div class="nha-pedir-caja"${nhaSimListo()?"":` style="display:none"`}><div class="nha-card-tit" style="font-size:16px">¿Te encaja? Pídelo</div>
    <div class="nha-txt" id="nha-pedir-info">${i.html}</div><div id="nha-pedir-ctl"${i.ok?"":` style="display:none"`}>
    <textarea id="nha-nota" class="m-input" rows="2" maxlength="300" placeholder="Si quieres, añade un comentario (opcional)"></textarea>
    <button class="nha-btn${NHA.pedirArm?" arm":""}" ${NHA.enviando?"disabled":""} onclick="nhaPedir()">${NHA.enviando?"Enviando…":NHA.pedirArm?"Toca otra vez para enviarla":"📝 Pedir esta ayuda"}</button></div></div>`;
}
let _nhaArmT=null;
async function nhaPedir(){
  const m=NHA.m; if(!m||!SIM||NHA.enviando)return;
  const nota=((document.getElementById("nha-nota")||{}).value||"").trim().slice(0,300);
  if(!NHA.pedirArm){ NHA.pedirArm=true; NHA._nota=nota; render(); const t=document.getElementById("nha-nota"); if(t)t.value=nota; clearTimeout(_nhaArmT); _nhaArmT=setTimeout(()=>{ NHA.pedirArm=false; if(MODAL){ const v=(document.getElementById("nha-nota")||{}).value; render(); const t2=document.getElementById("nha-nota"); if(t2&&v)t2.value=v; } },5000); return; }
  clearTimeout(_nhaArmT); NHA.pedirArm=false;
  const need=_simPermNecesaria(m,SIM.cap,SIM.n), cur=(m.ciclo!=null?m.ciclo:12); if(need===null)return;
  const ts=Date.now(), obj={c:NHA.codigo,tipo:"ayuda",capital:SIM.cap,cuotas:SIM.n,mes:getMesKey(DATA.reportMonth,DATA.reportYear),nota:nota||NHA._nota||"",creada:ts};
  if(need!==cur)obj.perm=String(need);
  NHA.enviando=true; render();
  try{
    const ok=await window._fbFichas.pedir(NHA.codigo+"_"+ts,obj); if(!ok)throw new Error("sin conexión");
    try{ localStorage.setItem("nha-pet-"+NHA.codigo,JSON.stringify({capital:obj.capital,cuotas:obj.cuotas,ts})); }catch(e){}
    NHA.enviando=false; MODAL=null; SIM=null; NHA.pant="inicio"; render(); window.scrollTo(0,0);
    toast("✓ Enviada. El administrador la revisará y te avisará.",5000);
  }catch(e){ console.error("[NH app] petición:",e); NHA.enviando=false; render(); toast("No se ha podido enviar. Revisa tu conexión e inténtalo otra vez.",5000); }
}

// ── Preguntas frecuentes (borrador para revisar con el administrador) ──
function nhaFaq(){
  const R=REGLAS, B=[R.BENEFICIO_ANIO1,R.BENEFICIO_ANIO2,R.BENEFICIO_ANIO3];
  const tabla=(cab,filas)=>`<table class="nha-tabla"><tr>${cab.map(c=>`<th>${c}</th>`).join("")}</tr>${filas.map(f=>`<tr>${f.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;
  // v45.55 (revisión de Ángel 30/10/2026): mismas tablas y ejemplos que la Guía para asociados (puntos 4 y 9)
  const lucia={ap:29*R.BLOQUE_APORTE, b1:12*B[0], b2:12*B[1], b3:5*B[2]};
  return [
    ["¿Qué es el aporte del mes?",`Es lo que pones cada mes en el fondo. Lo mínimo son <b>${R.APORTE_MINIMO} €</b>, y cada mes puedes elegir:`+tabla(["Puedes aportar"],[[R.APORTE_OPCIONES.map(v=>v+" €").join(" · ")]])+`Todo lo que aportas es tuyo: se te devuelve cuando termina tu permanencia.`],
    ["¿Cómo gano beneficios?",`Por cada <b>${R.BLOQUE_APORTE} €</b> que pones en un mes, ganas <b>${B[0]} €</b>. Si te quedas más tiempo, ganas más:`
      +tabla(["Si pones al mes…","Meses 1 a 12","Meses 13 a 24","Desde el mes 25"],R.APORTE_OPCIONES.map(v=>[v+" €",...B.map(b=>(v/R.BLOQUE_APORTE)*b+" €")]))
      +`Los meses 13 a 24 se ganan si tu permanencia es de 24 meses o más; desde el mes 25, si es de 36 meses.<br><br>`
      +`<b>Ejemplo:</b> Pedro pone ${R.BLOQUE_APORTE} € cada mes. En febrero gana ${B[0]} € por lo que puso en enero, en marzo otros ${B[0]} € por febrero, y así cada mes. Cuando lleva 12 meses pagados tiene <b>${12*B[0]} € de beneficio guardado</b>.<br><br>`
      +`Lo que pones un mes empieza a ganar al mes siguiente. El beneficio se guarda y lo recibes al terminar tu permanencia. Haz tus cuentas en «¿Cuánto puedo ganar?».`],
    ["¿Cuánta ayuda puedo pedir?",`Depende de tu permanencia:`+tabla(["Permanencia","Puedes pedir","Lo devuelves en"],[["12 meses","hasta "+R.AYUDA_MAX_CORTA+" €","hasta "+R.CUOTAS_MAX_CORTA+" meses"],["24 o 36 meses","hasta "+_miles(SIM_MAX_AYUDA)+" €","hasta "+R.CUOTAS_MAX+" meses"]])+`La última cuota tiene que caer, como mucho, en el último mes de tu permanencia. Si necesitas más, puedes ampliarla.`],
    ["¿Cómo pido una ayuda?",`En <b>Ayudas → ¿Cuánto puedo pedir?</b> elige la cantidad y los meses. Si te encaja, toca <b>«Pedir esta ayuda»</b>. Al administrador le llega tu petición, la revisa y te avisa. Si se aprueba, la verás en «Ayudas».`],
    ["¿Qué es la permanencia?",`Es el tiempo que te comprometes a estar en el fondo: <b>12, 24 o 36 meses</b>. Cuanto más larga, más beneficio ganas y más grandes son las ayudas que puedes pedir. Puedes ampliarla cuando quieras.`],
    ["¿Puedo descansar unos meses?",`Sí. Puedes pedir una <b>pausa de 1 a 3 meses</b> sin aportar. Habla con el administrador.`],
    ["¿Y si quiero salir del fondo?",`<b>Siempre recuperas todo lo que aportaste.</b> Del beneficio, te llevas el de los bloques de 12 meses que completaste; el del bloque que dejas a medias se queda en el fondo.`
      +tabla(["Si te vas…","Recibes"],[["Antes de pagar 12 meses","Todo lo que aportaste"],["Con 12 a 23 meses pagados","Lo aportado + el beneficio de los meses 1 a 12"],["Con 24 a 35 meses pagados","Lo aportado + el beneficio de los meses 1 a 24"]])
      +`<b>Ejemplo:</b> Lucía eligió 36 meses, pone ${R.BLOQUE_APORTE} € al mes y se va en el mes 29:`
      +tabla(["Concepto","Importe","¿Se lo lleva?"],[["Sus aportes (29 × "+R.BLOQUE_APORTE+" €)",fmtEur(lucia.ap)+" €","Sí"],["Beneficio meses 1 a 12",lucia.b1+" €","Sí"],["Beneficio meses 13 a 24",lucia.b2+" €","Sí"],["Beneficio meses 25 a 29",lucia.b3+" €","No, quedó a medias"],["<b>Recibe</b>","<b>"+fmtEur(lucia.ap+lucia.b1+lucia.b2)+" €</b>",""]])],
    ["¿Qué gano si traigo a alguien?",`Si eres asociado y traes a una persona nueva al fondo, te descontamos <b>${R.BONO_REFERIDO} €</b> de tu aporte de ese mes por cada una (como mucho ${R.REFERIDOS_MAX_MES} al mes).`],
    ["¿Quién ve mis datos?",`Solo tú, con tu enlace, y el administrador. Si eres responsable de un grupo, ves también lo del mes de las personas de tu grupo.`],
  ];
}
function nhaFaqHTML(){
  return `<div class="nha-card nha-faq">`+nhaFaq().map(([q,a],i)=>{ const ab=!!NHA.faq[i];
    return `<button class="nha-faq-q${ab?" ab":""}" onclick="NHA.faq[${i}]=!NHA.faq[${i}];render()"><span>${q}</span><span class="nha-faq-fl">›</span></button>${ab?`<div class="nha-faq-a">${a}</div>`:""}`; }).join("")+`</div>`;
}

// ── Bienvenida e instalación (la primera vez que se abre el enlace, si aún no está instalada) ──
function nhaInstalada(){ try{ return window.navigator.standalone===true||matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches; }catch(e){ return false; } }
function nhaBienvenidaVista(){ try{ return localStorage.getItem("nha-bv-"+NHA.codigo)==="1"; }catch(e){ return false; } }
function nhaEntrar(){ try{ localStorage.setItem("nha-bv-"+NHA.codigo,"1"); }catch(e){} NHA.bienvenida=false; NHA.pant="inicio"; render(); window.scrollTo(0,0); }
function nhaVerBienvenida(){ NHA.bienvenida=true; MODAL=null; render(); window.scrollTo(0,0); }
function nhaSistema(){
  const ua=navigator.userAgent||"", ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  if(ios)return {so:"ios",otra:/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line\//.test(ua)};
  if(/Android/.test(ua))return {so:"android",samsung:/SamsungBrowser/.test(ua),otra:/FBAN|FBAV|Instagram|; wv\)/.test(ua)};
  return {so:"otro"};
}
const NHA_SVG={
  share:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2"/></svg>`,
  mas:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`,
  puntos:`<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`,
  menu:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>`
};
function nhaBienvenidaHTML(m){
  const s=nhaSistema(), paso=(n,ic,t)=>`<div class="nha-paso"><div class="nha-paso-n">${n}</div><div class="nha-paso-t">${t}</div>${ic?`<div class="nha-paso-ic">${ic}</div>`:""}</div>`;
  const icono=`<span class="nha-mini-logo">NH</span>`;
  const ios=`<div class="nha-so">📱 iPhone</div>`+(s.so==="ios"&&s.otra?`<div class="nha-aviso">Si este enlace se ha abierto dentro de otra app, toca <b>«Abrir en Safari»</b> primero.</div>`:"")
    +paso(1,NHA_SVG.share,`Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba). En Safari está abajo; en Chrome, arriba.`)
    +paso(2,NHA_SVG.mas,`Baja un poco y toca <b>«Añadir a pantalla de inicio»</b>.`)
    +paso(3,icono,`Toca <b>Añadir</b>. Ya tienes el icono <b>NH</b> en tu móvil: ábrela siempre desde ahí.`);
  const and=`<div class="nha-so">📱 Android</div>`+(s.so==="android"&&s.otra?`<div class="nha-aviso">Si este enlace se ha abierto dentro de otra app, toca los tres puntos y <b>«Abrir en Chrome»</b> primero.</div>`:"")
    +(s.samsung?paso(1,NHA_SVG.menu,`Toca el <b>menú</b> (las tres rayas, abajo).`)+paso(2,NHA_SVG.mas,`Toca <b>«Añadir página a»</b> y luego <b>«Pantalla de inicio»</b>.`)
      :paso(1,NHA_SVG.puntos,`Toca los <b>tres puntos</b> de arriba a la derecha.`)+paso(2,NHA_SVG.mas,`Toca <b>«Añadir a pantalla de inicio»</b> (o <b>«Instalar aplicación»</b>) y luego <b>Añadir</b>.`))
    +paso(3,icono,`Ya tienes el icono <b>NH</b> en tu móvil: ábrela siempre desde ahí.`);
  const pasos=s.so==="ios"?ios:s.so==="android"?and:ios+and;
  const otro=s.so==="ios"?and:s.so==="android"?ios:"";
  return `<div class="nha-bv"><div class="nha-bv-top"><div class="nha-logo nha-logo-g nha-luz"><span>NH</span></div><div class="nha-bv-tit">Hola, ${nhaPrimerNombre(m)}</div>
      <div class="nha-bv-sub">Esta es tu app de <b>Nuevos Horizontes</b>. Aquí ves tus aportes, tus ayudas y tus beneficios, siempre al día.</div></div>
    <div class="nha-card"><div class="nha-card-tit">Instálala en tu móvil</div><div class="nha-txt" style="margin-bottom:6px">Solo la primera vez. Son 3 pasos:</div>${pasos}
      ${otro?`<button class="nha-bv-otro" onclick="this.nextElementSibling.style.display='block';this.style.display='none'">¿Tienes otro móvil? Ver los pasos</button><div style="display:none">${otro}</div>`:""}</div>
    <div class="nha-card nha-txt">🛡️ Este enlace es <b>solo tuyo</b>: con él se ve tu cuenta. No lo compartas.</div>
    <button class="nha-btn" onclick="nhaEntrar()">Entrar a mi cuenta</button>
    <div class="nha-pie">Puedes volver a ver estos pasos en <b>Más</b>.</div></div>`;
}

nhaArrancar();
