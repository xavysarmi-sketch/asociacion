// Nuevos Horizontes · inicio.js
// v45.39 · NUEVO ORDEN DE LA APP DEL ADMINISTRADOR: barra de abajo (Inicio · Cobros · Personas ·
// Ayudas · Más), pantalla de Inicio, pantalla de Ayudas, aviso de «Ayuda registrada» con su
// WhatsApp (una ayuda nueva en un solo recorrido), fecha de cada cobro y «Texto grande».
// Solo declaraciones: no ejecuta nada al cargarse.

// ── Barra de abajo ──────────────────────────────────────────────────────────
function navInferiorHTML(){
  const act=TAB==="historico"?"manage":TAB;
  const b=(tab,ic,txt,fn)=>`<button class="nav-btn${act===tab?" on":""}" onclick="${fn||`TAB='${tab}';FICHA_ID=null;render();window.scrollTo(0,0)`}">${_icSVG(ic)}<span>${txt}</span></button>`;
  return `<nav class="nav-inf">${b("inicio","home","Inicio")}${b("mes","cash","Cobros")}${b("asociados","users","Personas")}${b("ayudas","hand","Ayudas")}${b("manage","settings","Más","irGestion();window.scrollTo(0,0)")}</nav>`;
}

// ── Fecha corta de un cobro: "2026-10-04" → "4 oct" ──────────────────────────
function _fechaCorta(iso){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||"")); if(!m)return "";
  return parseInt(m[3],10)+" "+MONTHS_FULL[parseInt(m[2],10)-1].slice(0,3).toLowerCase();
}

// ── Inicio ─────────────────────────────────────────────────────────────────
// Lo que hay que saber al abrir: cómo va el mes, el dinero del mes, los avisos y accesos rápidos.
// Solo calcula y pinta (regla crítica 7: el render no escribe datos).
function inicioHTML(){
  const rm=DATA.reportMonth, ry=DATA.reportYear, mesTxt=MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase()+" "+ry;
  const md=(DATA.monthlyData&&DATA.monthlyData[getMesKey(rm,ry)])||{};
  const asocMes=DATA.members.filter(m=>m.type==="asociado"&&m.joinMonth&&activoEnReporte(m)&&!enPausaMes(m,rm,ry));
  const aptPag=asocMes.filter(m=>md.aportes&&md.aportes[m.id]).length;
  const cuotas=cuotasDelMes(rm,ry), cuoPag=cuotas.filter(c=>c.paid).length;
  const aud=auditarNHCached(), nErr=aud.errores.length;
  const faltan=(asocMes.length-aptPag)+(cuotas.length-cuoPag);
  const estado=nErr?"mal":faltan?"falta":"ok";
  const col={ok:["#1B4332","#2D6A4F"],falta:["#8A4F12","#B06A1E"],mal:["#8E2A1A","#C0492C"]}[estado];
  const tit={ok:"Todo cobrado y cuadrado",falta:`Faltan ${faltan} cobro${faltan>1?"s":""}`,mal:`La auditoría tiene ${nErr} error${nErr>1?"es":""}`}[estado];
  const fila=(txt,val,okF,fn)=>`<button class="ini-fila" onclick="${fn}"><span>${txt}</span><b>${val} ${okF?"✓":"›"}</b></button>`;
  let h=`<div class="ini-estado" style="background:linear-gradient(135deg,${col[0]},${col[1]})">
    <div class="ini-est-mes">${mesTxt}</div>
    <div class="ini-est-tit">${estado==="ok"?"✅ ":estado==="falta"?"⏳ ":"⚠️ "}${tit}</div>
    ${fila("Aportes",aptPag+"/"+asocMes.length,aptPag===asocMes.length,"TAB='mes';render();window.scrollTo(0,0)")}
    ${fila("Cuotas de ayudas",cuoPag+"/"+cuotas.length,cuoPag===cuotas.length,"TAB='mes';render();window.scrollTo(0,0)")}
    ${fila("Auditoría",nErr?nErr+" error"+(nErr>1?"es":""):"todo cuadra",!nErr,"TAB='manage';AUDIT_OPEN=true;render()")}
  </div>`;
  // Dinero del mes (la misma cuenta que en Ayudas → Dinero del mes)
  const d=dineroAyudasMes();
  h+=`<div class="mes-card"><div class="mes-title" style="margin-bottom:8px">💰 Dinero del mes</div>${dineroMesCuerpoHTML(d)}</div>`;
  // Avisos: lo que pide una decisión este mes
  const nSol=(DATA.solicitudes||[]).filter(x=>x.estado==="pendiente").length;
  const banner=bannerRecargoHTML();
  const avisos=avisosPermanenciaHTML(rm,ry)+salidasPrevistasHTML(rm,ry);
  h+=`<div class="mes-card"><div class="mes-title" style="margin-bottom:6px">🔔 Avisos</div>
    <button class="ini-aviso" onclick="TAB='ayudas';render();window.scrollTo(0,0)">📝 Solicitudes de ayuda: <b>${nSol?nSol+" pendiente"+(nSol>1?"s":""):"ninguna pendiente"}</b> ›</button>
    ${banner?`<button class="ini-aviso" style="color:#8A4F12" onclick="TAB='mes';render();window.scrollTo(0,0)">⚠️ El retorno del mes no cuadra: revísalo en Cobros ›</button>`:""}
    ${avisos?"":`<div class="ini-sin">Sin avisos de permanencias ni salidas este mes.</div>`}
  </div>`;
  h+=avisos;
  // Accesos rápidos
  const q=(ic,txt,fn)=>`<button class="ini-rapido" onclick="${fn}">${ic} ${txt}</button>`;
  h+=`<div class="ini-rapidos">
    ${q("💶","Cobrar","TAB='mes';render();window.scrollTo(0,0)")}
    ${q("🤝","Nueva ayuda","TAB='ayudas';SOL_FORM=true;render();window.scrollTo(0,0)")}
    ${q("👤","Dar de alta","openModal('member',{preset:'asociado'})")}
    ${q("🔍","Buscar","TAB='asociados';FICHA_ID=null;render();setTimeout(()=>{const s=document.getElementById('asoc-search');if(s)s.focus();},60)")}
  </div>`;
  return h;
}

// ── Ayudas ─────────────────────────────────────────────────────────────────
// Dinero disponible y solicitudes (lo de siempre) + la cartera pendiente.
function ayudasPantallaHTML(){
  const pend=t=>DATA.members.filter(m=>m.type===t).reduce((s,m)=>s+pendAll(m),0);
  const pA=pend("asociado"), pT=pend("tercero");
  const nAct=DATA.members.reduce((s,m)=>s+(m.loans||[]).filter(l=>(l.pays||[]).some(p=>!p.paid)).length,0);
  let h=ayudasTabHTML();
  h+=`<div class="mes-card"><div class="mes-title" style="margin-bottom:8px">🤝 Ayudas activas · ${nAct}</div>
    <div class="ay-fila"><span>Pendiente de asociados</span><b>${fmtEur(pA)} €</b></div>
    <div class="ay-fila"><span>Pendiente de terceros</span><b>${fmtEur(pT)} €</b></div>
    <div class="ay-fila ay-total"><span>Cartera total</span><b>${fmtEur(pA+pT)} €</b></div>
    <div class="ini-sin" style="margin-top:6px">El simulador de cada persona está en su ficha (Personas → 🧮 Simuladores).</div></div>`;
  return h;
}

// ── Ayuda registrada: resumen y WhatsApp en el mismo paso (punto 3) ─────────
function ayudaOkModalHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid), l=m&&[...(m.loans||[]),...(m.closedLoans||[])].find(x=>x.id===MODAL.lid);
  if(!m||!l)return `<div class="modal-title">Ayuda registrada ✓</div><button class="m-submit" onclick="closeModal()">Cerrar</button>`;
  const cu=l.cuotas&&l.cuotas.length===l.pays.length?l.cuotas:ayudaCuotas(l.capital,l.n,l.rate).cuotas;
  const f=(a,b)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #EEE9DF;font-size:15px"><span>${a}</span><b style="text-align:right">${b}</b></div>`;
  const p0=l.pays[0], pN=l.pays[l.pays.length-1];
  return `<div class="modal-title">✅ Ayuda registrada</div>
    <div style="font-size:15px;color:var(--muted);margin:-4px 0 10px">${escH(m.name)}</div>
    ${f("Recibe",_eurM(l.capital)+" €")}
    ${f("Devuelve",l.pays.length===1?"1 cuota de "+_eurM(cu[0])+" €":l.pays.length+" cuotas de "+_eurM(Math.max(...cu))+" €")}
    ${f("Primera cuota",MONTHS_FULL[MONTHS.indexOf(p0.m)].toLowerCase()+" "+p0.y)}
    ${l.pays.length>1?f("Última cuota",MONTHS_FULL[MONTHS.indexOf(pN.m)].toLowerCase()+" "+pN.y):""}
    ${f("Total a devolver",_eurM(l.total)+" €")}
    <button onclick="ayudaOkEnviarWA()" style="width:100%;margin-top:16px;padding:14px;border-radius:12px;border:none;background:#25D366;color:#fff;font-size:16px;font-weight:800;cursor:pointer">📲 Enviar a ${escH(m.name.split(" ")[0])} por WhatsApp</button>
    <button onclick="const id=MODAL.mid;closeModal();TAB='asociados';FICHA_ID=id;FICHA_TAB='ayudas';render();window.scrollTo(0,0)" class="m-sec" style="margin-top:8px">Ver su ficha</button>
    <button onclick="closeModal()" class="m-sec" style="margin-top:6px">Cerrar</button>`;
}
function _ayudaOkTarjetaHTML(m,l,cu){
  const st="font-size:13.5px;line-height:1.5;margin:4px 0;color:#1f2a24";
  const meses=l.pays.map((p,i)=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;border-bottom:1px dashed #E6E1D6"><span>${MONTHS_FULL[MONTHS.indexOf(p.m)]} ${p.y}</span><b>${_eurM(cu[i])} €</b></div>`).join("");
  return `<div style="width:380px;background:#fff;border-radius:14px;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="background:#1B4332;color:#fff;padding:13px 15px"><div style="font-size:18px;font-weight:800">Tu ayuda de ${_eurM(l.capital)} € está aprobada ✅</div>
      <div style="font-size:12px;opacity:.85;margin-top:2px">${escH(m.name.split(" ")[0])}, así la devuelves</div></div>
    <div style="padding:11px 13px">
      <div style="${st}">💶 Recibes: <b>${_eurM(l.capital)} €</b></div>
      <div style="${st}">📅 Devuelves: <b>${l.pays.length} ${l.pays.length===1?"cuota":"cuotas"}</b>, total <b>${_eurM(l.total)} €</b></div>
      <div style="margin-top:8px">${meses}</div>
    </div></div>`;
}
function ayudaOkEnviarWA(){
  const m=DATA.members.find(x=>x.id===(MODAL&&MODAL.mid)), l=m&&[...(m.loans||[]),...(m.closedLoans||[])].find(x=>x.id===MODAL.lid); if(!m||!l)return;
  const cu=l.cuotas&&l.cuotas.length===l.pays.length?l.cuotas:ayudaCuotas(l.capital,l.n,l.rate).cuotas;
  const p0=l.pays[0];
  const txt=`Hola ${m.name.split(" ")[0]} 👋\nTu ayuda de *${_eurM(l.capital)} €* está aprobada. La devuelves en ${l.pays.length} ${l.pays.length===1?"cuota":"cuotas"}, la primera en ${MONTHS_FULL[MONTHS.indexOf(p0.m)].toLowerCase()} ${p0.y}. Te envío el detalle.\nNuevos Horizontes`;
  _compartirImagenWA(m,_ayudaOkTarjetaHTML(m,l,cu),txt,`Ayuda_${m.name.split(" ")[0]}.png`);
}

// ── Texto grande (por aparato; se guarda en este teléfono) ───────────────────
function textoGrandeActivo(){ try{ return localStorage.getItem("nh-texto-grande")==="1"; }catch(e){ return false; } }
function cambiarTextoGrande(){
  const v=!textoGrandeActivo();
  try{ localStorage.setItem("nh-texto-grande",v?"1":"0"); }catch(e){}
  render(); toast(v?"Texto grande activado":"Texto normal");
}
function pantallaAjustesHTML(){
  const on=textoGrandeActivo();
  return `<div class="mes-card"><div class="mes-title" style="margin-bottom:8px">👁️ Pantalla</div>
    <button onclick="cambiarTextoGrande()" class="ini-fila-claro"><span>Texto grande <span class="ini-sin" style="display:block;margin:2px 0 0">Agranda toda la app en este teléfono</span></span><b class="interruptor${on?" on":""}"><i></i></b></button>
  </div>`;
}
