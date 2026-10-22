// Nuevos Horizontes · cierre.js
// Cierre del mes: aportes, cuotas, retorno y cuentas del mes
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).
// v45.37: FECHA DE CADA COBRO. Al marcar un aporte o una cuota como cobrado se anota el día
// (aportes: monthlyData[mes].aportesFecha[id]; cuotas: pays[i].fecha). Al desmarcar se quita.
// Lo cobrado antes de la v45.37 no tiene fecha (no se inventa). No cambia ninguna cuenta.
function anotarFechaAporte(md,mid){
  if(!md)return;
  if(md.aportes&&md.aportes[mid]===true){ if(!md.aportesFecha)md.aportesFecha={}; md.aportesFecha[mid]=_fechaHoyISO(); }
  else if(md.aportesFecha){ delete md.aportesFecha[mid]; }
}
function anotarFechaCuota(p){ if(!p)return; if(p.paid)p.fecha=_fechaHoyISO(); else delete p.fecha; }
// Elegir el aporte de un mes (cierre, cierre grupal o ficha). Solo 50/100/150/200 (AP-2, AP-3).
function setAporteMes(mid,monto,key){
  const m=DATA.members.find(x=>x.id===mid); if(!m)return;
  monto=parseInt(monto)||0;
  if(!APORTE_OPCIONES.includes(monto)){toast("El aporte debe ser 50, 100, 150 o 200 €");render();return;}
  key=key||getMesKey(DATA.reportMonth,DATA.reportYear);
  if(!DATA.extras)DATA.extras={};
  if(!DATA.extras[mid])DATA.extras[mid]={};
  DATA.extras[mid][key]={monto:monto-aporteBaseDe(m)}; // 0 = el habitual
  save();render();
  toast(m.name.split(" ")[0]+": aporte de "+monto+" € ✓");
}
// Selector compacto de aporte (50–200). En solo lectura muestra el importe.
function selectorAporteHTML(m,key,ro){
  const v=aporteBrutoKey(m,key);
  if(ro)return `${v} €`;
  const ops=APORTE_OPCIONES.slice(); if(!ops.includes(v))ops.push(v);
  return `<select class="ap-sel" aria-label="Aporte del mes" onclick="event.stopPropagation()" onchange="setAporteMes('${esc(m.id)}',this.value,'${key}')">${ops.map(o=>`<option value="${o}"${o===v?" selected":""}>${o} €</option>`).join("")}</select>`;
}
// v44.17: desplegable con los referidos bajo la línea del descuento. oscuro=true en las
// tarjetas verdes (ficha y reporte grupal). Solo lectura: usa DESP (estado de pantalla).
function referidosDesplegableHTML(mid,rm,ry,clave){
  if(!DESP[clave])return "";
  return `<div style="margin:0 0 6px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.08);font-size:13px;line-height:1.7;color:rgba(255,255,255,.92)">
    ${nombresReferidosMes(mid,rm,ry).map(n=>`<div style="display:flex;justify-content:space-between;gap:10px"><span>👤 ${escH(n)}</span><span style="opacity:.75;white-space:nowrap">bono 10 €</span></div>`).join("")}
  </div>`;
}
function vistaPersonal(){ return _VP>0; }
function _enVistaPersonal(fn){ return function(){ _VP++; try{ return fn.apply(this,arguments); } finally{ _VP--; } }; }
const APORTE_MINIMO=REGLAS.APORTE_MINIMO; // v45.38: la regla vive en js/maestro.js
function _nBaseG(members,rm,ry){ return members.filter(m=>m.type==="asociado"&&activoEnReporte(m)&&!enPausaMes(m,rm,ry)&&aporteMostradoMes(m,rm,ry).base).length; }
function _nAbiertosG(members,rm,ry){ return members.filter(m=>m.type==="asociado"&&activoEnReporte(m)&&!enPausaMes(m,rm,ry)&&aporteMostradoMes(m,rm,ry).abierto).length; }
// Línea del aporte del mes (vista personal y administrador)
function filaAporteValorHTML(m,rm,ry,pagado){
  const a=aporteMostradoMes(m,rm,ry);
  if(a.abierto)return `pendiente ⏳`;
  return `${a.importe} € ${pagado?"✅":"⏳"}`;
}
const AYUDA_ELIGE_APORTE="Tú eliges cuánto: 50, 100, 150 o 200 €";
// Bloque del total del mes (ficha y enlace de grupo)
function totalMesBloqueHTML(m,rm,ry,tot,isTerc,MF,MS){
  const mesN=escH(MF[MS.indexOf(rm)]);
  const abierto=!isTerc&&aporteMostradoMes(m,rm,ry).abierto;
  if(abierto){
    const fijo=tot.pendiente; // cuotas sin pagar (el aporte abierto no suma)
    // Solo el aporte: no hace falta un total (se sobreentiende). El mes ya va en la cabecera.
    if(!(fijo>0)){ const pa=pendienteMesAnteriorHTML(m,rm,ry); return pa?`<div class="tot-final">${pa}</div>`:""; }
    return `<div class="tot-final">
      <div class="tot-final-lbl">Total por pagar</div>
      <div class="tot-final-row" style="justify-content:flex-start;gap:12px;align-items:baseline">
        <span class="tot-final-num">${fmtEur(fijo)} €</span><span style="font-size:20px;font-weight:800;color:#F1D58A">+ tu aporte</span>
      </div>
      ${pendienteMesAnteriorHTML(m,rm,ry)}
    </div>`;
  }
  // Vista del asociado sin cuotas este mes: solo está el aporte, el total sobra
  if(vistaPersonal()&&!isTerc&&!(tot.cuotas&&tot.cuotas.length)){ const pa=pendienteMesAnteriorHTML(m,rm,ry); return pa?`<div class="tot-final">${pa}</div>`:""; }
  return `<div class="tot-final">
      <div class="tot-final-lbl">${vistaPersonal()?"Total":`Total ${mesN} ${ry}`}</div>
      <div class="tot-final-row">
        <span class="tot-final-num">${fmtEur(tot.total)} €</span>
        <span class="tot-chip ${tot.alDia?"":"pend"}">${tot.alDia?"✅ Al día":`⏳ Falta ${fmtEur(tot.pendiente)} €`}</span>
      </div>
      ${pendienteMesAnteriorHTML(m,rm,ry)}
    </div>`;
}

function togglePay(mid,lid,pi){
  UNDO_SNAPSHOT=JSON.stringify(DATA);
  clearTimeout(UNDO_TIMER);

  let loanCompleted=false;
  DATA.members.forEach(m=>{
    if(m.id===mid){
      // Buscar en loans activos Y en closedLoans
      const allLoans=[...(m.loans||[]),...(m.closedLoans||[])];
      allLoans.forEach(l=>{if(l.id===lid){l.pays[pi].paid=!l.pays[pi].paid;anotarFechaCuota(l.pays[pi]);}}); // v45.37: + fecha
      // Separar: loans con alguna cuota pendiente → activos; todos pagados → cerrados
      const activos=allLoans.filter(l=>l.pays.some(p=>!p.paid));
      const cerrados=allLoans.filter(l=>l.pays.every(p=>p.paid));
      if(cerrados.length>(m.closedLoans||[]).length)loanCompleted=true;
      m.loans=activos;
      m.closedLoans=cerrados;
    }
  });
  save();

  const msg=loanCompleted?"✅ Ayuda completada":"✓ Pago registrado — toca Deshacer si fue error";
  const t=document.getElementById("toast");
  t.innerHTML=`${msg} &nbsp;<span onclick="undoPay()" style="text-decoration:underline;cursor:pointer;font-weight:800">↩ Deshacer</span>`;
  t.classList.remove("hidden");
  clearTimeout(t._t);
  UNDO_TIMER=setTimeout(()=>{t.classList.add("hidden");UNDO_SNAPSHOT=null;},6000);

  render();
}

function undoPay(){
  if(!UNDO_SNAPSHOT)return;
  DATA=JSON.parse(UNDO_SNAPSHOT);
  UNDO_SNAPSHOT=null;
  clearTimeout(UNDO_TIMER);
  save();
  toast("↩ Pago deshecho ✓");
  render();
}

function mText(member){
  const{reportMonth:rm,reportYear:ry,monthlyFee:fee}=DATA;
  let t=`━━━━━━━━━━━━━━━━━━━━\n📋 *NUEVOS HORIZONTES*\nReporte ${rm} ${ry}\n━━━━━━━━━━━━━━━━━━━━\n\n👤 *${member.name}*\n`;
  const avalNomTxt=avalistaNombre(member);
  if(avalNomTxt)t+=`   Referido por: ${avalNomTxt}\n`;
  t+=`\n`;
  member.loans.forEach(loan=>{
    t+=`📌 *Ayuda otorgada ${loan.gMonth} ${loan.gYear}*\n   Capital: ${fmtEur(loan.capital)} € · Total: ${fmtEur(loan.total)} €\n   Pendiente: ${fmtEur(pendLoan(loan))} €\n\n`;
    loan.pays.forEach((p,pi)=>{
      const cur=p.m===rm&&p.y===ry;
      const imp=fmtEur(cuotaDe(loan,pi));
      if(p.paid)t+=`   ✅ ${p.m} ${p.y}: ${imp} € (pagado)\n`;
      else if(cur)t+=`   🔴 ${p.m} ${p.y}: ${imp} € *DEBE ESTE MES*\n`;
      else t+=`   ⬜ ${p.m} ${p.y}: ${imp} € (próximo)\n`;
    });
    t+=`\n`;
  });
  const d=due(member,rm,ry);
  t+=`━━━━━━━━━━━━━━━━━━━━\n💰 *TOTAL A PAGAR EN ${rm.toUpperCase()} ${ry}: ${fmtEur(d)} €*\n`;
  if(member.loans.length>1)t+=`   (${member.loans.length} ayudas activas)\n`;
  t+=`━━━━━━━━━━━━━━━━━━━━\n\n_El aporte del mes va aparte: desde 50 € (puedes poner 50, 100, 150 o 200 €)_`;
  return t;
}
function toggleAporte(memberId,mes,anio){
  const mm=mes||DATA.reportMonth, yy=anio||DATA.reportYear;
  const md=getMesData(mm,yy);
  md.aportes[memberId]=!md.aportes[memberId];
  anotarFechaAporte(md,memberId); // v45.37
  // Recalcular recargo desde cuotas cobradas marcadas
  recalcMesRecargo();
  save();render();
}
function marcarTodosAportes(){
  const md=getMesData(DATA.reportMonth,DATA.reportYear);
  DATA.members.filter(m=>m.type==="asociado"&&m.joinMonth&&activoEnReporte(m)&&!enPausaMes(m,DATA.reportMonth,DATA.reportYear)).forEach(m=>{const ya=md.aportes[m.id]===true;md.aportes[m.id]=true;if(!ya)anotarFechaAporte(md,m.id);}); // v45.37: fecha solo a los que se cobran ahora
  save();render();toast("Todos marcados como pagados ✓");
}
function desmarcarTodosAportes(){
  const md=getMesData(DATA.reportMonth,DATA.reportYear);
  DATA.members.filter(m=>m.type==="asociado"&&m.joinMonth&&activoEnReporte(m)).forEach(m=>{md.aportes[m.id]=false;anotarFechaAporte(md,m.id);}); // v45.37: se quita la fecha
  save();render();toast("Todos desmarcados");
}
function toggleCuotaCierre(mid,lid,pi){
  DATA.members.forEach(m=>{
    if(m.id===mid){
      [...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{
        if(l.id===lid){l.pays[pi].paid=!l.pays[pi].paid;anotarFechaCuota(l.pays[pi]);} // v45.37: + fecha
      });
      // Reordenar: si todas pagadas → closedLoans; si alguna pendiente → loans
      const todas=[...(m.loans||[]),...(m.closedLoans||[])];
      m.loans=todas.filter(l=>l.pays.some(p=>!p.paid));
      m.closedLoans=todas.filter(l=>l.pays.every(p=>p.paid));
    }
  });
  recalcMesRecargo(); // actualiza el recargo automático
  save();render();
}
function recalcMesRecargo(){
  // Recargo automático = suma del recargo de cada cuota cobrada del mes.
  // Solo se aplica si el usuario NO lo ha fijado manualmente.
  const md=getMesData(DATA.reportMonth,DATA.reportYear);
  if(!md.recargoManual){
    md.recargo=recargoAutoMes(DATA.reportMonth,DATA.reportYear);
  }
}
// mes/anio opcionales: por defecto el mes activo (botón "↻ Recalcular"); el banner de
// reconciliación de meses cerrados (Bloque 7) los pasa explícitamente.
function recalcRecargoForzar(mes,anio){
  // Botón "Recalcular": vuelve al automático aunque estuviera manual
  const rm=mes||DATA.reportMonth, ry=anio!=null?anio:DATA.reportYear;
  const md=getMesData(rm,ry);
  md.recargoManual=false;
  md.recargo=recargoAutoMes(rm,ry);
  save();render();toast(`Retorno de ${rm} ${ry} recalculado automáticamente ✓`);
}
function setMesRecargo(val){
  const md=getMesData(DATA.reportMonth,DATA.reportYear);
  md.recargo=parseFloat(val)||0;
  md.recargoManual=true;
  save();
  // Actualizar solo los KPIs sin re-render completo
  if(document.getElementById("mes-cuentas"))renderMesKpis(md); // v45.22
}
function setMesReservaPct(val){
  const md=getMesData(DATA.reportMonth,DATA.reportYear);
  md.reservaPct=parseFloat(val)||15;
  save();
  if(document.getElementById("mes-cuentas"))renderMesKpis(md); // v45.22
}
// v45.22: la cuenta del mes, de arriba abajo: el retorno de las cuotas paga el beneficio de los asociados
function cuentasMesHTML(md,rm,ry){
  const r=repartoBeneficioMes(md.recargo,rm,ry), bon=bonosReferidoMes(rm,ry);
  const ret=_r2(md.recargo||0), ex=Math.round((r.excedente-bon)*100)/100, n=r.conDerecho.length;
  const fila=(signo,l,v,sub)=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:7px 0;border-bottom:1px solid #EFEAE0">
      <span style="font-size:14px;color:var(--dark)"><b style="display:inline-block;width:16px;color:var(--muted)">${signo}</b>${l}${sub?`<span style="display:block;margin-left:16px;font-size:11.5px;color:var(--muted)">${sub}</span>`:""}</span>
      <b style="font-size:15px;white-space:nowrap">${fmtEur(v)} €</b></div>`;
  const res=ex<0
    ?`<div style="margin-top:10px;padding:11px 12px;border-radius:12px;background:#FDECEA;border:1.5px solid #E5A29B;color:#8A2A1F;display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-size:14px;font-weight:800">Faltan · los pone el fondo</span><b style="font-size:20px">${fmtEur(-ex)} €</b></div>`
    :ex>0
    ?`<div style="margin-top:10px;padding:11px 12px;border-radius:12px;background:#E8F4EC;border:1.5px solid #8CC5A0;color:#1B4332;display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-size:14px;font-weight:800">Sobran · se reinvierten en ayudas</span><b style="font-size:20px">${fmtEur(ex)} €</b></div>`
    :`<div style="margin-top:10px;padding:11px 12px;border-radius:12px;background:var(--bg);font-size:14px;font-weight:800;color:var(--dark)">Cuadra justo: ni falta ni sobra</div>`;
  return `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:10px 12px;border-radius:12px;background:#E8F4EC;margin-bottom:12px">
      <span style="font-size:14px;color:#1B4332;font-weight:700">Aportes cobrados<span style="display:block;font-size:11.5px;font-weight:600;opacity:.8">Entran al fondo</span></span>
      <b style="font-size:20px;color:#1B4332">${fmtEur(totalAportesMes(rm,ry))} €</b></div>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:4px">¿El retorno de las cuotas alcanza para pagar el beneficio de este mes?</div>
    ${fila("+","Retorno cobrado de las cuotas",ret)}
    ${fila("−",`Beneficio de ${n} asociados`,r.obligacion,n?`media ${fmtEur(r.media)} € cada uno`:"")}
    ${bon?fila("−","Bonos por referidos",bon):""}
    ${res}${quedaPrevistoHTML(rm,ry,ret)}`;
}
// v45.23: antes «Para la asociación» en Asociados → Resumen General (mismo cálculo: quedaAsociacionMes)
function quedaPrevistoHTML(rm,ry,retCobrado){
  const q=quedaAsociacionMes(rm,ry), ab=!!DESP["queda-asoc-meses"];
  let h="";
  if(q.enCurso&&Math.abs(q.retornos-retCobrado)>0.004)h+=`<div style="margin-top:8px;font-size:12.5px;color:var(--muted);line-height:1.45">Si se cobran todas las cuotas del mes: retorno ${fmtEur(q.retornos)} € → ${q.queda>=0?"sobrarían":"faltarían"} <b style="color:${q.queda>=0?"#1B4332":"#C0492C"}">${fmtEur(Math.abs(q.queda))} €</b>.</div>`;
  h+=`<button onclick="DESP['queda-asoc-meses']=!DESP['queda-asoc-meses'];render()" style="background:none;border:none;color:#2D6A4F;font-size:13px;font-weight:700;cursor:pointer;padding:8px 0 0">${ab?"▾":"▸"} Ver otros meses</button>`;
  if(ab){
    const meses=[]; let y=2025,i=7; const fin=_idxMes(rm,ry);
    while(y*12+i<=fin){ meses.push({rm:MONTHS[i],ry:y}); i++; if(i>11){i=0;y++;} }
    h+=`<div style="margin-top:6px">`+meses.reverse().map(m=>{ const x=quedaAsociacionMes(m.rm,m.ry);
      return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:4px 0;border-bottom:1px solid #EFEAE0"><span>${MONTHS_FULL[MONTHS.indexOf(m.rm)]} ${m.ry}${x.enCurso?" <small style=\"color:var(--muted)\">(previsto)</small>":""}</span><b style="color:${x.queda<0?"#C0492C":"#1B4332"}">${x.queda<0?"faltan ":"sobran "}${fmtEur(Math.abs(x.queda))} €</b></div>`; }).join("")+
      `<div style="font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.35">Cada mes por separado: retornos − beneficio − bonos. No se acumula de un mes a otro.</div></div>`;
  }
  return h;
}
function renderMesKpis(md){
  const c=document.getElementById("mes-cuentas"); // v45.22
  if(c){ c.innerHTML=cuentasMesHTML(md,DATA.reportMonth,DATA.reportYear); return; }
  const r=repartoBeneficioMes(md.recargo,DATA.reportMonth,DATA.reportYear);
  const el=document.getElementById("mes-kpi-beneficio");
  const el2=document.getElementById("mes-kpi-reserva");
  const el3=document.getElementById("mes-kpi-excedente");
  const el3l=document.getElementById("mes-kpi-excedente-lbl");
  const el4=document.getElementById("mes-kpi-conDerecho");
  const el5=document.getElementById("mes-kpi-media");
  if(el)el.textContent=r.obligacion.toFixed(2)+" €";
  const bon=bonosReferidoMes(DATA.reportMonth,DATA.reportYear), ex=Math.round((r.excedente-bon)*100)/100;
  if(el2)el2.textContent=Math.max(0,ex).toFixed(2)+" €";
  if(el3)el3.textContent=Math.abs(ex).toFixed(2)+" €";
  if(el3l)el3l.textContent=ex<0?"Falta retorno (lo pone el fondo)":(bon?`Excedente (tras ${fmtEur(bon)} € de bonos)`:"Excedente");
  if(el4)el4.textContent=r.conDerecho.length;
  if(el5)el5.textContent=r.media.toFixed(2)+" €";
}
// Banner de la pestaña Cierre: recorre TODOS los meses (no solo el activo — ese es
// justo el bug de julio: recalcMesRecargo() solo toca el mes activo y los cerrados
// nunca se reconcilian solos). Lista cada mes descuadrado con botón "Reconciliar"
// que llama a recalcRecargoForzar(mes,año) — la corrección la decide Ángel, nunca automática.
function bannerRecargoHTML(){
  const problemas=[];
  Object.keys(DATA.monthlyData||{}).forEach(k=>{
    const md=DATA.monthlyData[k];
    if(!md||md.recargoManual)return;
    const[ys,ms]=k.split("-");
    const ry=parseInt(ys),rm=MONTHS[parseInt(ms)-1];
    if(!rm)return;
    const calculado=recargoAutoMes(rm,ry);
    const guardado=md.recargo||0;
    if(Math.abs(guardado-calculado)>0.005)problemas.push({rm,ry,guardado,calculado,dif:Math.round((calculado-guardado)*100)/100});
  });
  if(problemas.length===0)return "";
  problemas.sort((a,b)=>(a.ry-b.ry)||(MONTHS.indexOf(a.rm)-MONTHS.indexOf(b.rm)));
  const filas=problemas.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f0c9c2">
    <div style="font-size:13px;color:#7A2418"><b>${escH(p.rm)} ${p.ry}</b> — guardado ${fmtEur(p.guardado)} € · calculado ${fmtEur(p.calculado)} € <span style="font-weight:700">(dif. ${p.dif>0?"+":""}${fmtEur(p.dif)} €)</span></div>
    <button onclick="recalcRecargoForzar('${p.rm}',${p.ry})" style="white-space:nowrap;padding:7px 12px;border:none;border-radius:10px;background:#C0492C;color:#fff;font-weight:700;font-size:12px;cursor:pointer">Reconciliar</button>
  </div>`).join("");
  return `<div class="mes-card" style="background:#FDF0EE;border:2px solid #C0492C">
    <div style="font-weight:800;color:#7A2418;font-size:14px;margin-bottom:6px">🔴 ${problemas.length} mes${problemas.length>1?"es":""} con el retorno descuadrado</div>
    <div style="font-size:12px;color:#7A2418;margin-bottom:8px">El retorno guardado no coincide con lo que suman las cuotas realmente cobradas ese mes. La corrección la decides tú — no se aplica sola.</div>
    ${filas}
  </div>`;
}
// Chip permanente en la cabecera (todas las pestañas): resultado de auditarNH().
// Clicable → salta a Gestión con la tarjeta de auditoría abierta.
function chipAuditoriaHTML(){
  const r=auditarNHCached();
  const ok=r.errores.length===0;
  const txt=ok?"✅ Todo cuadra":`🔴 ${r.errores.length} error${r.errores.length>1?"es":""}`;
  return `<div style="margin-top:8px"><button onclick="TAB='manage';AUDIT_OPEN=true;render()" style="border:1px solid rgba(255,255,255,.4);background:${ok?"rgba(45,106,79,.35)":"rgba(192,73,44,.35)"};color:#fff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:20px;cursor:pointer">🔍 Auditoría: ${txt}</button></div>`;
}
