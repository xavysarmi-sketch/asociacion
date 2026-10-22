// Nuevos Horizontes · enlaces.js
// Enlaces de asociados y grupos, «Así lo ve» y vistas de solo lectura
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).

// ¿Coincide el conjunto de ids seleccionado EXACTAMENTE con algún grupo de Cierre?
// (mismos miembros, sin importar el orden). Si coincide, se puede usar el enlace
// estable de ese grupo en vez del enlace con IDs congelados.
function grupoQueCoincide(ids){
  const set=new Set(ids);
  return (DATA.gruposCierre||[]).find(g=>{
    const gset=new Set([g.principalId,...(g.miembros||[])]);
    if(gset.size!==set.size)return false;
    for(const id of gset){ if(!set.has(id))return false; }
    return true;
  })||null;
}
function sendGroupLink(){
  const allVisible=DATA.members;
  const ids=[...SEND_SELECTED].filter(id=>allVisible.some(m=>m.id===id));
  if(ids.length<2){toast("Selecciona al menos 2 fichas");return;}
  MODAL={type:"grupo_link",ids,grupoMatch:grupoQueCoincide(ids)};
  render();
}
function buildGrupoUrl(ids,yo){
  let u=baseUrl()+"?grupo="+ids.map(id=>encodeURIComponent(id)).join(",");
  if(yo)u+="&yo="+encodeURIComponent(yo);
  return u;
}
// Enlace ESTABLE de un grupo de cierre: apunta al asociado principal.
// No congela la lista; el asociado siempre verá los miembros actuales del grupo.
function buildGrupoUrlEstable(principalId,yo){
  let u=baseUrl()+"?grupoppal="+encodeURIComponent(principalId);
  if(yo)u+="&yo="+encodeURIComponent(yo);
  return u;
}
// URL a usar para el modal de Envíos: estable si coincide con un grupo de Cierre,
// si no, la de siempre (IDs congelados).
function urlDelModalGrupo(){
  if(!MODAL||!MODAL.ids)return "";
  if(MODAL.grupoMatch)return buildGrupoUrlEstable(MODAL.grupoMatch.principalId,MODAL.yo);
  return buildGrupoUrl(MODAL.ids,MODAL.yo||MODAL.ids[0]);
}
// Compartir por WhatsApp el enlace estable de un grupo de cierre (desde la pestaña Cierre)
function compartirGrupoCierre(gid){
  const g=(DATA.gruposCierre||[]).find(x=>x.id===gid);
  if(!g){toast("Grupo no encontrado");return;}
  const ppal=DATA.members.find(m=>m.id===g.principalId);
  if(!ppal){toast("El principal del grupo no existe");return;}
  const url=buildGrupoUrlEstable(g.principalId);
  const msg="Hola 👋 aquí podéis ver vuestro reporte de "+DATA.reportMonth+" "+DATA.reportYear+" en Nuevos Horizontes:\n"+url;
  if(navigator.share){
    navigator.share({text:msg}).then(()=>toast("Compartido ✓")).catch(e=>{if(e.name!=="AbortError")window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");});
  }else{
    window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
  }
}
function sendGrupoWA(){
  if(!MODAL||!MODAL.ids)return;
  const url=urlDelModalGrupo();
  const msg="Hola 👋 aquí podéis ver vuestro reporte de "+DATA.reportMonth+" "+DATA.reportYear+" en Nuevos Horizontes:\n"+url;
  window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
}
function copyGrupoUrl(){
  if(!MODAL||!MODAL.ids)return;
  const url=urlDelModalGrupo();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(()=>toast("🔗 Enlace copiado ✓"));
  }
}
function setGrupoTitular(id){ if(MODAL){MODAL.yo=id;render();} }
// v45.21: «👁️ Ver cómo lo reciben» del enlace grupal → la vista EXACTA del enlace (ver verComoAsociado)
function previewGrupo(){
  if(!MODAL||!MODAL.ids)return;
  const ids=[...MODAL.ids], gm=MODAL.grupoMatch;
  const yo=gm?(MODAL.yo||null):(MODAL.yo||ids[0]); // mismo criterio que urlDelModalGrupo()
  _abrirVistaAsoc({tipo:"grupo",mid:yo||(gm?gm.principalId:ids[0]),ppal:gm?gm.principalId:null,ids:gm?null:ids,yo});
}

function openLinkModal(mid){MODAL={type:"link",mid};render();}

function grupoLinkModalHTML(){
  if(!MODAL||!MODAL.ids)return "";
  const ids=MODAL.ids;
  const nombres=ids.map(id=>{const m=DATA.members.find(x=>x.id===id);return m?m.name.split(" ")[0]:"";}).filter(Boolean);
  const esLocal=window.location.href.startsWith("file://");
  const gMatch=MODAL.grupoMatch;
  const principalMatch=gMatch?DATA.members.find(x=>x.id===gMatch.principalId):null;
  return `<div class="modal-title">🔗 Enlace grupal · ${ids.length} fichas</div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:12px">Seleccionados: <b>${escH(nombres.join(", "))}</b></p>
    ${gMatch&&principalMatch
      ?`<div style="background:#F0F7F2;border:1px solid #2D6A4F;border-radius:10px;padding:10px 12px;font-size:12px;color:#1B4332;margin-bottom:14px">✅ Coincide con el grupo de Cierre de <b>${escH(principalMatch.name)}</b> — se usará el enlace estable (no se rompe si editas a estos asociados).</div>`
      :`<div style="background:#FFF8F0;border:1px solid #F5D5B0;border-radius:10px;padding:10px 12px;font-size:12px;color:#7A4A1E;margin-bottom:14px">⚠️ Este enlace se romperá si editas a estos asociados. Mejor crea un grupo en la pestaña Cierre.
        <button style="display:block;margin-top:8px;padding:7px 12px;border:none;border-radius:8px;background:#C75B0E;color:#fff;font-size:11px;font-weight:700;cursor:pointer" onclick="closeModal();TAB='mes';render()">Ir a Cierre</button>
      </div>`}
    <label class="m-label">👤 Titular del enlace (verá su ficha individual)</label>
    <select class="m-select" style="margin-bottom:14px;font-size:15px" onchange="setGrupoTitular(this.value)">
      ${ids.map(id=>{const m=DATA.members.find(x=>x.id===id);return m?`<option value="${esc(id)}"${id===(MODAL.yo||ids[0])?" selected":""}>${escH(m.name)}</option>`:"";}).join("")}
    </select>
    <button style="width:100%;padding:14px;border-radius:12px;background:var(--dark);color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="previewGrupo()">
      👁️ Ver cómo lo reciben los asociados
    </button>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button style="flex:1;padding:13px;border-radius:12px;background:#25D366;color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer" onclick="sendGrupoWA()">💬 Enviar por WA</button>
      <button style="flex:1;padding:13px;border-radius:12px;background:var(--bg);color:var(--dark);font-size:14px;font-weight:700;border:2px solid var(--border);cursor:pointer" onclick="copyGrupoUrl()">📋 Copiar URL</button>
    </div>
    ${esLocal?`<div style="background:#FFF8F0;border:1px solid #F5D5B0;border-radius:10px;padding:10px 12px;font-size:12px;color:#7A4A1E">⚠️ Estás abriendo desde local. Sube a GitHub Pages para que el enlace funcione al enviarlo.</div>`:""}`;
}
function buildMemberUrl(mid){
  return baseUrl()+"?socio="+encodeURIComponent(mid);
}

function sendLinkWA(mid){
  const m=DATA.members.find(x=>x.id===mid);
  if(!m)return;
  const url=buildMemberUrl(mid);
  const msg=`Hola ${m.name.split(" ")[0]} 👋, aquí puedes consultar tu reporte de ${DATA.reportMonth} ${DATA.reportYear} en Nuevos Horizontes:\n${url}`;
  openWA(msg);
}

function copyLink(mid){
  const url=buildMemberUrl(mid);
  if(!url)return;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(()=>toast("🔗 Enlace copiado ✓")).catch(()=>_copyFallback(url));
  }else{_copyFallback(url);}
}
function _copyFallback(text){
  const ta=document.createElement("textarea");ta.value=text;ta.style.cssText="position:fixed;left:-9999px;top:0";
  document.body.appendChild(ta);ta.focus();ta.select();document.execCommand("copy");document.body.removeChild(ta);
  toast("🔗 Enlace copiado ✓");
}

function linkModalHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  if(!m)return"";
  const url=buildMemberUrl(m.id);
  // Previsualización: abrir la misma página con ?socio=ID en una nueva pestaña
  return`<div class="modal-title">🔗 Enlace para ${escH(m.name.split(" ")[0])}</div>
<p style="font-size:13px;color:var(--muted);margin-bottom:8px">Así verá el asociado su ficha cuando abra el enlace.</p>
<div style="display:flex;gap:8px;margin-bottom:14px">
  <button class="m-primary" style="flex:1" onclick="window.open('${url}','_blank')">👁️ Previsualizar</button>
  <button class="link-copy-btn" style="flex:1;margin:0" onclick="copyLink('${esc(m.id)}')">📋 Copiar enlace</button>
</div>
<div style="background:var(--bg);border-radius:10px;padding:10px;font-size:11px;color:var(--muted);word-break:break-all;margin-bottom:12px">${escH(url)}</div>
<button style="width:100%;padding:13px;border-radius:14px;background:#25D366;color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer" onclick="sendLinkWA('${esc(m.id)}');closeModal()">💬 Enviar por WhatsApp</button>`;
}

// ── MODO SOLO LECTURA ──
function previewMiembro(mid){ verComoAsociado(mid); }

// ══ v45.21 · «👁️ VER COMO LO VE» ══════════════════════════════════════════════════════════
// Pinta EXACTAMENTE lo que ve la persona al abrir su enlace: usa las mismas funciones que el
// enlace (?socio= → renderReadonly · ?grupoppal=/?grupo= → renderGrupo), empezando como recién
// abierto (desplegables cerrados, pestaña «Resumen», pantalla «¿Qué quieres ver?» en grupo).
// Encima solo se añade la barra del administrador. No guarda nada.
function _grupoDeMiembro(mid){ return (DATA.gruposCierre||[]).find(g=>g.principalId===mid||(g.miembros||[]).includes(mid))||null; }
function _abrirVistaAsoc(v){
  const volver=VISTA_ASOC?VISTA_ASOC.volver:{TAB,FICHA_ID,FICHA_TAB,DESP,SIM,GRUPO_VISTA,y:window.scrollY||0};
  MODAL=null; DESP={}; SIM=null; FICHA_TAB="resumen"; GRUPO_VISTA="elegir";
  VISTA_ASOC=Object.assign({},v,{volver});
  render(); window.scrollTo(0,0);
}
function verComoAsociado(mid,tipo){
  const m=DATA.members.find(x=>x.id===mid); if(!m){toast("Miembro no encontrado");return;}
  const g=tipo==="grupo"?_grupoDeMiembro(mid):null;
  _abrirVistaAsoc(g?{tipo:"grupo",mid,ppal:g.principalId,ids:null,yo:null}:{tipo:"socio",mid});
}
function salirVistaAsoc(){
  const v=VISTA_ASOC&&VISTA_ASOC.volver; VISTA_ASOC=null; MODAL=null;
  if(v){TAB=v.TAB;FICHA_ID=v.FICHA_ID;FICHA_TAB=v.FICHA_TAB;DESP=v.DESP;SIM=v.SIM;GRUPO_VISTA=v.GRUPO_VISTA;}
  render(); if(v)setTimeout(()=>window.scrollTo(0,v.y||0),0);
}
// v45.23: ejecuta fn con el mes que ven hoy los asociados y devuelve el mes del admin al terminar (no guarda)
function _conMesAsociados(fn){
  const o=mesOperativoHoy(), rm=DATA.reportMonth, ry=DATA.reportYear;
  DATA.reportMonth=o.mes; DATA.reportYear=o.anio;
  try{ return fn(); } finally { DATA.reportMonth=rm; DATA.reportYear=ry; }
}
function renderVistaAsoc(){
  const v=VISTA_ASOC, m=DATA.members.find(x=>x.id===v.mid);
  _conMesAsociados(()=>{ if(v.tipo==="grupo")renderGrupo({ppal:v.ppal,ids:v.ids,yo:v.yo}); else renderReadonly(v.mid); });
  const g=_grupoDeMiembro(v.mid), ppal=v.ppal?DATA.members.find(x=>x.id===v.ppal):null;
  const chip=(on,txt,fn)=>`<button onclick="${fn}" style="flex:1;padding:8px 4px;border-radius:9px;border:1.5px solid ${on?"#fff":"rgba(255,255,255,.45)"};background:${on?"#fff":"transparent"};color:${on?"#3D4080":"#fff"};font-size:12.5px;font-weight:800;cursor:pointer">${txt}</button>`;
  const que=v.tipo==="grupo"?`el enlace del grupo de <b>${escH(ppal?ppal.name.split(" ")[0]:"—")}</b>`:`<b>${escH(m?m.name:"")}</b> en su enlace personal`;
  // v45.22: en el enlace de grupo, «Mi reporte» es la ficha del titular (el principal), no la de cada miembro
  const tit=v.tipo==="grupo"?DATA.members.find(x=>x.id===(v.yo||v.ppal))||null:null;
  const notaG=v.tipo==="grupo"?`<div style="font-size:11.5px;line-height:1.35;margin-top:7px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.14)">Este enlace trae dos opciones: <b>«Mi reporte»</b> (la ficha de ${escH(tit?tit.name.split(" ")[0]:"—")}, la misma que su enlace personal) y <b>«Reporte grupal»</b> (lo de todo el grupo).${tit&&v.mid!==tit.id?` Ojo: si lo abre ${escH(m?m.name.split(" ")[0]:"")}, en «Mi reporte» verá la ficha de ${escH(tit.name.split(" ")[0])}, no la suya.`:""}</div>`:"";
  const barra=`<div id="va-barra" style="position:sticky;top:0;z-index:60;background:#3D4080;color:#fff;padding:calc(9px + env(safe-area-inset-top)) 12px 10px;box-shadow:0 2px 8px rgba(0,0,0,.25)">
    <div style="display:flex;align-items:center;gap:8px">
      <button onclick="salirVistaAsoc()" style="padding:7px 11px;border-radius:9px;border:none;background:#fff;color:#3D4080;font-size:13px;font-weight:800;cursor:pointer">← Volver</button>
      <div style="flex:1;font-size:12.5px;line-height:1.3">👁️ Así lo ve ${que}</div>
    </div>
    <div style="display:flex;gap:6px;margin-top:8px">
      ${chip(v.tipo==="socio","👤 Enlace personal",`verComoAsociado('${esc(v.mid)}')`)}
      ${(g||v.tipo==="grupo")?chip(v.tipo==="grupo","👥 Enlace de grupo",v.tipo==="grupo"?`_abrirVistaAsoc(Object.assign({},VISTA_ASOC))`:`verComoAsociado('${esc(v.mid)}','grupo')`):""}
      ${chip(false,"↺ Como al abrirlo",`_abrirVistaAsoc(Object.assign({},VISTA_ASOC))`)}
    </div>${notaG}
  </div>`;
  // v45.34: «← Volver» también abajo, a mano del pulgar (la barra de arriba puede quedar lejos o bajo la hora del móvil)
  const volverAbajo=`<button id="va-volver-abajo" onclick="salirVistaAsoc()" style="position:fixed;left:14px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:61;padding:11px 16px;border-radius:30px;border:2px solid #fff;background:#3D4080;color:#fff;font-size:15px;font-weight:800;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer">← Volver</button>`;
  document.getElementById("app").insertAdjacentHTML("afterbegin",barra);
  document.getElementById("app").insertAdjacentHTML("beforeend",`<div style="height:72px"></div>`+volverAbajo); // hueco para que el botón no tape el final
}

function renderReadonly(rid){
  rid=rid||READONLY_ID; // v45.21: la vista «👁️ Ver como lo ve» del admin pasa el id
  // v45.35: si el número no existe, solo vale el nombre COMPLETO (antes bastaba una parte del
  // nombre: un enlace mal escrito, o vacío, podía abrir la ficha de otra persona)
  const m=DATA.members.find(x=>x.id===rid)||
    (_normNombre(rid)?DATA.members.find(x=>_normNombre(x.name)===_normNombre(rid)):null);
  let h="";
  if(!m){
    h=`<div style="text-align:center;padding:60px 20px">
      <div style="font-size:48px;margin-bottom:16px">🔍</div>
      <div style="font-size:18px;font-weight:700;color:var(--dark)">${DATA.members.length?"Asociado no encontrado":"No se han podido cargar los datos"}</div>
      <div style="font-size:14px;color:var(--muted);margin-top:8px">${DATA.members.length?"Contacta con el administrador":"Comprueba la conexión y vuelve a abrir el enlace"}</div>
    </div>`;
    document.getElementById("app").innerHTML=h;return;
  }
  // Enlace personal de un asociado dado de baja: la ficha ya no está disponible.
  // Solo afecta a quien tiene objeto 'baja'; los enlaces de asociados ACTIVOS (sin baja)
  // siguen funcionando exactamente igual (esta rama no se ejecuta para ellos).
  // v45.32: con la salida anotada y sin pagar sigue viendo su ficha normal, con un aviso de su salida arriba
  const salidaPend=!!(m.baja&&m.baja.v18&&!m.baja.pagada&&salidaResumenDatos(m));
  if(m.baja&&!salidaPend){
    document.getElementById("app").innerHTML=`<div style="text-align:center;padding:60px 20px">
      <div style="font-size:48px;margin-bottom:16px">🚪</div>
      <div style="font-size:18px;font-weight:700;color:var(--dark)">Esta ficha ya no está disponible.</div>
      <div style="font-size:14px;color:var(--muted);margin-top:8px">Contacta con el administrador si tienes dudas.</div>
    </div>`;
    return;
  }
  h+=`<div class="header" style="background:linear-gradient(135deg,#1B4332,#2D6A4F);padding:18px 20px 14px;border-radius:0 0 24px 24px;text-align:center;margin-bottom:0">
    <div class="h-title">NUEVOS HORIZONTES</div>
    <div class="h-sub">Tu ficha personal</div>
  </div>`;
  h+=`<div class="content">`;
  if(salidaPend)h+=salidaAvisoFichaHTML(m); // v45.32
  else if(pausaVigente(m))h+=pausaAvisoFichaHTML(m); // v45.33
  h+=fichaHTML(m,true);
  const updRO=DATA.updatedAt?new Date(DATA.updatedAt).toLocaleDateString("es-ES"):"—";
  h+=`<div style="text-align:center;font-size:11px;color:var(--muted);padding:14px 0 22px;opacity:.8">
    Nuevos Horizontes · ${APP_VERSION} · datos al ${updRO}
    <div id="versionOkBadgeRO" style="display:${UPDATE_CONFIRMED?"block":"none"};color:#2D6A4F;font-weight:700;margin-top:4px;opacity:1">✓ Estás viendo la última versión</div>
  </div>`;
  h+=`</div>`;
  if(MODAL){
    h+=`<div class="modal-bg" onclick="closeModal()"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>`;
    if(MODAL.type==="history")h+=historyModalHTML();
    if(MODAL.type==="sim")h+=simuladorHTML(); // v45.21
    h+=`</div></div>`;
  }
  document.getElementById("app").innerHTML=h;
}

// ── MODO GRUPO ──
function setGrupoVista(v){ GRUPO_VISTA=v; if(VISTA_ASOC)render(); else renderGrupo(); }
function _renderGrupoBase(ov){ // v45.21: ov = {ppal, ids, yo} solo desde «👁️ Ver como lo ve»
  // Resolver la lista de miembros según el tipo de enlace:
  // - Nuevo (?grupoppal=ID): buscar el grupo guardado cuyo principal sea ese asociado
  //   y usar SU lista actual (principal + miembros). Así el enlace se auto-actualiza.
  // - Antiguo (?grupo=id1,id2,...): usar la lista fija de la URL (compatibilidad).
  let ids=[];
  const _PPAL=ov?ov.ppal:GRUPO_PPAL, _IDS=ov?ov.ids:GRUPO_IDS;
  let titularId=ov?ov.yo:GRUPO_YO;
  if(_PPAL){
    const grupos=(DATA.gruposCierre||[]);
    const g=grupos.find(x=>x.principalId===_PPAL);
    if(g){
      ids=[g.principalId,...(g.miembros||[])];
      if(!titularId)titularId=g.principalId; // el principal es el titular por defecto
    }
  } else if(_IDS){
    ids=_IDS;
  }
  const members=ids.map(id=>DATA.members.find(x=>x.id===id)).filter(Boolean);
  if(!members||!members.length){
    document.getElementById("app").innerHTML=`<div style="text-align:center;padding:60px 20px"><div style="font-size:48px">🔍</div><div style="font-size:18px;font-weight:700;color:var(--dark);margin-top:16px">Grupo no encontrado</div></div>`;
    return;
  }
  // Titular: el principal del grupo (nuevo) o el indicado en ?yo= o la primera ficha
  const titular=members.find(m=>m.id===titularId)||members[0];
  const MS2=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const MF2=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const rm=DATA.reportMonth,ry=DATA.reportYear;
  const totalGrupo=members.reduce((s,m)=>s+totalDelMes(m,rm,ry).total,0);
  // Mes a mostrar: el mes objetivo más común del grupo
  const _cuentaG={};
  members.forEach(m=>{const d=desgloseDelMes(m);const k=d.mesObj+"|"+d.anioObj;_cuentaG[k]=(_cuentaG[k]||0)+1;});
  const _kG=Object.keys(_cuentaG).sort((a,b)=>_cuentaG[b]-_cuentaG[a])[0]||(rm+"|"+ry);
  const gMes=_kG.split("|")[0], gAnio=parseInt(_kG.split("|")[1]);

  let h=`<div style="background:linear-gradient(135deg,#1B4332,#2D6A4F);padding:18px 20px 16px;border-radius:0 0 24px 24px;text-align:center;margin-bottom:0">
    <div class="h-title">NUEVOS HORIZONTES</div>
    <div class="h-sub">Reporte · ${MF2[MS2.indexOf(gMes)]} ${gAnio}</div>
    <div style="color:#fff;font-size:15px;font-weight:700;margin-top:2px">Hola, ${escH(titular.name)} 👋</div>
    <div style="margin-top:10px;background:rgba(255,255,255,.15);border-radius:12px;padding:8px 16px;display:inline-block">
      <span style="color:#fff;font-size:13px;font-weight:600">${members.length} fichas · Total grupal: <b style="font-size:18px">${fmtEur(totalGrupo)} €</b>${_nAbiertosG(members,rm,ry)>0?" + aportes":""}</span>
    </div>
  </div>`;

  // ── Pantalla de elección (al abrir el enlace) ──
  if(GRUPO_VISTA==="elegir"){
    h+=`<div class="content" style="padding-top:24px">
      <div style="text-align:center;margin-bottom:22px">
        <div style="font-size:18px;font-weight:800;color:var(--dark);margin-bottom:6px">¿Qué quieres ver?</div>
        <div style="font-size:13px;color:var(--muted);line-height:1.4">Elige una opción. Podrás cambiar entre ellas en cualquier momento.</div>
      </div>
      <button onclick="setGrupoVista('mi')" style="width:100%;display:flex;align-items:center;gap:14px;background:#fff;border:2px solid #D9E2DB;border-radius:18px;padding:18px 16px;margin-bottom:14px;cursor:pointer;text-align:left;box-shadow:0 2px 10px rgba(27,67,50,.06)">
        <div style="width:48px;height:48px;flex-shrink:0;border-radius:14px;background:linear-gradient(135deg,#1B4332,#2D6A4F);display:flex;align-items:center;justify-content:center;font-size:24px">👤</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:800;color:var(--dark)">Mi reporte</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.35">Solo tus datos: tu aporte, tus ayudas y tus beneficios.</div>
        </div>
        <span style="color:var(--muted);font-size:22px;flex-shrink:0">›</span>
      </button>
      <button onclick="setGrupoVista('grupo')" style="width:100%;display:flex;align-items:center;gap:14px;background:#fff;border:2px solid #D9E2DB;border-radius:18px;padding:18px 16px;margin-bottom:8px;cursor:pointer;text-align:left;box-shadow:0 2px 10px rgba(27,67,50,.06)">
        <div style="width:48px;height:48px;flex-shrink:0;border-radius:14px;background:linear-gradient(135deg,#E07A3A,#C75B0E);display:flex;align-items:center;justify-content:center;font-size:24px">👥</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:800;color:var(--dark)">Reporte grupal</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.35">Lo que toca pagar entre todos los del grupo y el total.</div>
        </div>
        <span style="color:var(--muted);font-size:22px;flex-shrink:0">›</span>
      </button>
      <div style="text-align:center;padding:18px 0 28px;font-size:12px;color:var(--muted)">Vista de solo lectura · Contacta con el administrador</div>
    </div>`;
    document.getElementById("app").innerHTML=h;
    return;
  }

  // Pestañas: Mi reporte / Reporte grupal
  const tabOn="background:#fff;color:#1B4332;font-weight:800;box-shadow:0 1px 4px rgba(0,0,0,.08)";
  const tabOff="background:transparent;color:var(--muted);font-weight:700";
  h+=`<div class="content"><div style="display:flex;gap:6px;background:#EDE7DF;border-radius:14px;padding:4px;margin-bottom:14px">
      <button onclick="setGrupoVista('mi')" style="flex:1;padding:11px;border:none;border-radius:10px;font-size:14px;cursor:pointer;${GRUPO_VISTA==='mi'?tabOn:tabOff}">👤 Mi reporte</button>
      <button onclick="setGrupoVista('grupo')" style="flex:1;padding:11px;border:none;border-radius:10px;font-size:14px;cursor:pointer;${GRUPO_VISTA==='grupo'?tabOn:tabOff}">👥 Reporte grupal</button>
    </div>`;

  if(GRUPO_VISTA==="mi"){
    // ── Vista individual del titular (igual que el enlace personal) ──
    h+=fichaHTML(titular,true);
    h+=`<div style="text-align:center;padding:6px 0 28px;font-size:12px;color:var(--muted)">Vista de solo lectura · Contacta con el administrador</div>`;
    h+=`</div>`;
    document.getElementById("app").innerHTML=h;
    if(MODAL){
      const extra=`<div class="modal-bg" onclick="closeModal()"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>${MODAL.type==="history"?historyModalHTML():MODAL.type==="sim"?simuladorHTML():""}</div></div>`;
      document.getElementById("app").insertAdjacentHTML("beforeend",extra);
    }
    return;
  }

  // ── Vista grupal (resumen entre todos) ──
  members.filter(activoEnReporte).forEach(m=>{ h+=fichaResumenHTML(m); }); // baja: fuera de la vista de grupo (solo en Histórico)

  const totalAportes=members.filter(m=>m.type!=="tercero").reduce((s,m)=>s+totalDelMes(m,rm,ry).aporteImporte,0);
  const totalCuotas2=members.reduce((s,m)=>s+totalDelMes(m,rm,ry).totalCuotas,0);

  h+=`<div style="background:linear-gradient(135deg,#1B4332,#2D6A4F);border-radius:16px;padding:16px;margin-bottom:24px">
    <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Resumen total — ${MF2[MS2.indexOf(gMes)]} ${gAnio}</div>
    ${totalAportes>0?`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.12)"><span style="font-size:13px;color:rgba(255,255,255,.8)">Total aportes mensuales</span><span style="font-size:14px;font-weight:700;color:#fff">${fmtEur(totalAportes)} €</span></div>`:""}
    ${_nBaseG(members,rm,ry)>0?`<div style="font-size:12px;color:rgba(255,255,255,.7);padding:6px 0;border-bottom:1px solid rgba(255,255,255,.12)">Aportes contados con 50 € · cada uno puede aportar 50, 100, 150 o 200 €</div>`:""}
    ${totalCuotas2>0?`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.12)"><span style="font-size:13px;color:rgba(255,255,255,.8)">Total cuotas de ayudas</span><span style="font-size:14px;font-weight:700;color:#fff">${fmtEur(totalCuotas2)} €</span></div>`:""}
    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;margin-top:2px">
      <span style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.5px">Total entre todos</span>
      <span style="font-size:36px;font-weight:900;color:#fff">${fmtEur(totalGrupo)} €${_nAbiertosG(members,rm,ry)>0?`<span style="display:block;text-align:right;font-size:15px;font-weight:800;color:#F1D58A;margin-top:2px">+ los aportes</span>`:""}</span>
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px">${members.length} fichas incluidas</div>
  </div>`;

  h+=`<div style="text-align:center;padding:0 0 28px;font-size:12px;color:var(--muted)">Vista de solo lectura · Contacta con el administrador</div>`;
  h+=`</div>`;
  document.getElementById("app").innerHTML=h;
}
