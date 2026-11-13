// Nuevos Horizontes · inicio.js
// v45.39 · NUEVO ORDEN DE LA APP DEL ADMINISTRADOR: barra de abajo (Inicio · Cobros · Personas ·
// Ayudas · Más), pantalla de Inicio, pantalla de Ayudas, aviso de «Ayuda registrada» con su
// WhatsApp (una ayuda nueva en un solo recorrido), fecha de cada cobro y «Texto grande».
// Solo declaraciones: no ejecuta nada al cargarse.

// ── Barra de abajo ──────────────────────────────────────────────────────────
function navInferiorHTML(){
  const act=TAB==="historico"?"manage":TAB;
  const b=(tab,ic,txt,fn)=>`<button class="nav-btn${act===tab?" on":""}" onclick="_TAB_LISTA=null;${fn||`TAB='${tab}';FICHA_ID=null;render();window.scrollTo(0,0)`}">${_icSVG(ic)}<span>${txt}</span></button>`;
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
function _inicioDashboardHTML({rm,ry,d,nSol,asocMes,aud,faltan}){
  const actual=_idxMes(rm,ry), meses=[];
  for(let i=actual-4;i<=actual;i++){
    const f=_mesDeIdx(i), r=resumenMesDoc(f.mes,f.anio);
    meses.push({txt:MONTHS_FULL[MONTHS.indexOf(f.mes)].slice(0,3),valor:Math.max(0,r.totCob||0)});
  }
  const max=Math.max(1,...meses.map(x=>x.valor));
  const barras=meses.map((x,i)=>`<div class="nhd-bar-item"><div class="nhd-bar-track"><i class="${i===3?'gold':''}" style="--nhd-h:${Math.max(8,Math.round(x.valor/max*100))}%"></i></div><span>${x.txt}</span></div>`).join("");
  const r=resumenMesDoc(rm,ry), base=Math.max(1,(r.apCob||0)+(r.cuCob||0)+(r.recCob||0));
  const pA=Math.round((r.apCob||0)/base*100), pC=Math.round((r.cuCob||0)/base*100), pO=Math.max(0,100-pA-pC);
  const grupos=(DATA.gruposCierre||[]).length;
  const kpi=(clase,titulo,valor,chip,fn)=>`<button class="nhd-kpi ${clase}" onclick="${fn}"><span>${titulo}</span><b>${valor}</b><em>${chip}</em></button>`;
  return `<section class="nh-dash-desktop" aria-label="Resumen general">
    <div class="nhd-head"><div><small>PANEL GENERAL · ACTUALIZADO AHORA</small><h1>Situación de ${MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase()}</h1><p>Estado, dinero y actividad en una sola pantalla.</p></div><div class="nhd-month">● ${MONTHS_FULL[MONTHS.indexOf(rm)]} ${ry}⌄</div></div>
    <div class="nhd-filtros"><button class="on">Todo</button><button onclick="TAB='mes';render()">Cobros</button><button onclick="TAB='ayudas';render()">Ayudas</button><button onclick="TAB='asociados';render()">Personas</button></div>
    <div class="nhd-kpis">
      ${kpi('cobrado','Cobrado',fmtEur(d.cobrado)+' €','↑ este mes',"TAB='mes';render()")}
      ${kpi('pendiente','Pendiente',fmtEur(d.porCobrar)+' €',faltan+' cobros',"TAB='mes';render()")}
      ${kpi('disponible','Disponible',fmtEur(d.disponible)+' €',aud.errores.length?'Revisar':'Todo cuadra',"TAB='ayudas';render()")}
      ${kpi('solicitudes','Solicitudes',String(nSol),nSol?'Revisar':'Al día',"TAB='ayudas';render()")}
    </div>
    <div class="nhd-visuals">
      <article class="nhd-chart"><header><b>Evolución de cobros</b><span>Últimos 5 meses</span></header><div class="nhd-bars">${barras}</div></article>
      <article class="nhd-distrib"><h2>Distribución del mes</h2><div class="nhd-donut"><img src="assets/nh-donut-base.svg" alt=""><img class="progreso" src="assets/nh-donut-progreso.svg" alt=""><b>${fmtEur(d.disponible)} €</b></div><div class="nhd-leyenda"><p><i></i>Aportes <b>${pA} %</b></p><p><i></i>Cuotas <b>${pC} %</b></p><p><i></i>Otros <b>${pO} %</b></p></div></article>
    </div>
    <div class="nhd-resumen"><button onclick="TAB='mes';render()"><i>${grupos}</i><span><b>Grupos activos</b><small>Cobros organizados</small></span></button><button onclick="TAB='asociados';render()"><i>${asocMes.length}</i><span><b>Personas activas</b><small>${faltan} cobros pendientes</small></span></button><button onclick="TAB='manage';AUDIT_OPEN=true;render()"><i class="ok">${aud.errores.length?'!':'✓'}</i><span><b>Auditoría ${aud.errores.length?'por revisar':'correcta'}</b><small>${aud.errores.length?aud.errores.length+' diferencias':'Sin diferencias'}</small></span></button></div>
    <p class="nhd-foot">Solo escritorio · La versión móvil no se modifica</p>
  </section>`;
}
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
  let h=`<div class="ini-estado" style="background:linear-gradient(135deg,#1B4332,#2D6A4F)">
    <div class="ini-est-cab"><span>Estado del mes</span><span class="ini-est-pill ${estado}">${tit}</span></div>
    ${fila("Aportes",aptPag+"/"+asocMes.length,aptPag===asocMes.length,"TAB='mes';render();window.scrollTo(0,0)")}
    ${fila("Cuotas de ayudas",cuoPag+"/"+cuotas.length,cuoPag===cuotas.length,"TAB='mes';render();window.scrollTo(0,0)")}
    ${fila("Auditoría",nErr?nErr+" error"+(nErr>1?"es":""):aud.advertencias.length?"cuadra · "+aud.advertencias.length+" aviso"+(aud.advertencias.length>1?"s":""):"todo cuadra",!nErr&&!aud.advertencias.length,"TAB='manage';AUDIT_OPEN=true;render()")}
    ${fila("Cierre del mes",mesCerrado(getMesKey(rm,ry))?"cerrado":"sin cerrar",mesCerrado(getMesKey(rm,ry)),"TAB='mes';DESP={};render();setTimeout(()=>{const e=document.getElementById('cierre-mes');if(e)e.scrollIntoView({block:'start'});},50)")}
  </div>`;
  // Dinero del mes (la misma cuenta que en Ayudas → Dinero del mes)
  // v45.43: aquí, solo lo esencial; el detalle (ayudas entregadas, salidas, de dónde viene) está en Ayudas
  const d=dineroAyudasMes(), rojo=v=>v<0?"color:#A63A20":"";
  h+=`<div class="mes-card" style="cursor:pointer" onclick="TAB='ayudas';FICHA_ID=null;render();window.scrollTo(0,0)"><div class="mes-title" style="margin-bottom:4px">💰 Dinero del mes</div>
    <div class="ay-fila"><span>Cobrado hasta hoy</span><b style="color:#2D6A4F">${fmtEur(d.cobrado)} €</b></div>
    ${d.salido&&_r2(d.enCaja)!==_r2(d.disponible)?`<div class="ay-fila"><span>En caja hoy</span><b style="${rojo(d.enCaja)}">${fmtEur(d.enCaja)} €</b></div>`:""}
    ${d.porPagar?`<div class="ay-fila"><span>Salidas por pagar este mes</span><b>−${fmtEur(d.porPagar)} €</b></div>`:""}
    <div class="ay-fila ay-total"><span>Disponible para ayudas</span><b style="font-size:19px;${rojo(d.disponible)}">${fmtEur(d.disponible)} €</b></div>
    ${d.porCobrar>0?`<div class="ini-sin" style="margin-top:2px">Falta por cobrar ${fmtEur(d.porCobrar)} €.</div>`:""}
    ${d.alCierre<0?`<div style="margin-top:6px;padding:8px 10px;border-radius:10px;background:#FFF4E5;border:1px solid #E0A040;color:#8A4F12;font-size:13.5px;font-weight:700">⚠️ Aunque se cobre todo, este mes no llega: faltarían ${fmtEur(-d.alCierre)} €.</div>`:""}
    <div style="margin-top:8px;font-size:14px;font-weight:800;color:#1B4332">Ver el detalle en Ayudas ›</div></div>`;
  // Avisos: lo que pide una decisión este mes
  const nSol=(DATA.solicitudes||[]).filter(x=>x.estado==="pendiente").length;
  const banner=bannerRecargoHTML();
  const avisos=avisosPermanenciaHTML(rm,ry)+salidasPrevistasHTML(rm,ry);
  // v45.46: el mes anterior sigue sin cerrar (desde octubre de 2026, cuando empezó el cierre)
  const _iAnt=_idxMes(rm,ry)-1, _kAnt=_keyDeIdx(_iAnt), _sinCerrarAnt=_iAnt>=_idxMes("Oct",2026)&&!mesCerrado(_kAnt);
  // v46.5 (Ángel 07/11/2026): el día antes del día de aviso (por defecto el 24) avisa si el mes de hoy sigue sin cerrar
  const _hoyD=new Date(), _diaAv=(DATA.diaAvisoProximo!=null?DATA.diaAvisoProximo:25), _iHoy=_idxMes(MONTHS[_hoyD.getMonth()],_hoyD.getFullYear());
  const _avisoManana=_hoyD.getDate()===_diaAv-1&&!mesCerrado(_keyDeIdx(_iHoy)), _mesNom=i=>_txtIdx(i).split(" ")[0];
  h+=`<div class="mes-card"><div class="mes-title" style="margin-bottom:6px">⚠ Avisos</div>
    ${_avisoManana?`<button class="ini-aviso" style="color:#8A4F12" onclick="irAlMes(${_iHoy})">⏰ Mañana, día ${_diaAv}, la app pasa a ${_mesNom(_iHoy+1)}. Cierra ${_mesNom(_iHoy)} hoy ›</button>`:""}
    ${_sinCerrarAnt?`<button class="ini-aviso" style="color:#8A4F12" onclick="irAlMes(${_iAnt})">🔒 ${_txtIdx(_iAnt).split(" ")[0].replace(/^./,c=>c.toUpperCase())} sigue sin cerrar: ciérralo ›</button>`:""}
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
  return _inicioDashboardHTML({rm,ry,d,nSol,asocMes,aud,faltan})+`<div class="nh-inicio-legacy">${h}</div>`;
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
