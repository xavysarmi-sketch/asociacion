// Nuevos Horizontes · gestion.js
// Gestión: gastos administrativos y permanencias
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).

// ══ v45.23 · GASTOS ADMINISTRATIVOS (Maestro v18.9 · FO-6) ═══════════════════════════════
// DATA.gastos = [{id, mes:"AAAA-MM", concepto, importe, fecha}]. Salen de la caja del mes en que se pagan.
function gastosGestionHTML(){
  const L=(DATA.gastos||[]).slice().sort((a,b)=>b.mes.localeCompare(a.mes)||String(b.id).localeCompare(String(a.id)));
  const key=getMesKey(DATA.reportMonth,DATA.reportYear), delMes=_r2(L.filter(g=>g.mes===key).reduce((s,g)=>s+(+g.importe||0),0));
  const ab=!!DESP["mg-gas"];
  let h=`<div class="mg-acc-head" onclick="DESP['mg-gas']=!DESP['mg-gas'];render()">
      <span>🧾 Gastos administrativos <span class="mg-acc-num">${fmtEur(delMes)} €</span></span>
      <span class="mg-acc-fl">${ab?"▲ ocultar":"▼ mostrar"}</span></div>`;
  if(!ab)return h;
  const opts=[]; { let y=2025,i=7; const fin=_idxMes(DATA.reportMonth,DATA.reportYear)+1; while(y*12+i<=fin){ const k=getMesKey(MONTHS[i],y); opts.push(`<option value="${k}"${k===key?" selected":""}>${MONTHS_FULL[i]} ${y}</option>`); i++; if(i>11){i=0;y++;} } opts.reverse(); }
  h+=`<div class="mes-card" style="margin:8px 0 14px">
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px;line-height:1.4">Suministros, material, gestión… Cada gasto resta de la caja del mes en que se pagó (dinero del mes, acta y libro de caja).</div>
    <select id="gas-mes" class="m-select" style="margin-bottom:8px">${opts.join("")}</select>
    <input id="gas-con" class="m-input" placeholder="Concepto (p. ej. carpetas y folios)">
    <input id="gas-imp" class="m-input" type="text" inputmode="decimal" placeholder="Importe (€), p. ej. 35,50">
    <button class="m-primary" onclick="gastoAnadir()">＋ Anotar gasto</button>
    ${L.length?`<div style="margin-top:14px">${L.map(g=>{ const [yy,mm]=g.mes.split("-").map(Number), k="gasdel-"+g.id, arm=!!DESP[k];
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #EFEAE0">
        <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700;color:var(--dark)">${escH(g.concepto||"Gasto")}</div><div style="font-size:12px;color:var(--muted)">${MONTHS_FULL[mm-1]} ${yy}</div></div>
        <b style="white-space:nowrap">${fmtEur(+g.importe||0)} €</b>
        <button onclick="gastoBorrar('${esc(g.id)}')" style="padding:6px 9px;border-radius:8px;border:1.5px solid #C0492C;background:${arm?"#C0492C":"#fff"};color:${arm?"#fff":"#C0492C"};font-size:12px;font-weight:700;cursor:pointer">${arm?"¿Seguro?":"✕"}</button></div>`; }).join("")}
      <div style="display:flex;justify-content:space-between;font-size:13.5px;font-weight:800;padding-top:8px"><span>Total anotado</span><span>${fmtEur(_r2(L.reduce((s,g)=>s+(+g.importe||0),0)))} €</span></div></div>`
    :`<div style="margin-top:10px;font-size:13px;color:var(--muted)">Aún no hay gastos anotados.</div>`}
  </div>`;
  return h;
}
function gastoAnadir(){
  const mes=document.getElementById("gas-mes")?.value, con=(document.getElementById("gas-con")?.value||"").trim();
  const imp=_r2(numES(document.getElementById("gas-imp")?.value)||0);
  if(!mes||imp<=0){ toast("⛔ Pon el importe del gasto",3000); return; }
  if(!DATA.gastos)DATA.gastos=[];
  DATA.gastos.push({id:"g"+Date.now(),mes,concepto:con||"Gasto administrativo",importe:imp,fecha:new Date().toISOString().slice(0,10)});
  _CAJA_CACHE=null; save(); render(); toast(`🧾 Gasto de ${fmtEur(imp)} € anotado`);
}
function gastoBorrar(id){
  const k="gasdel-"+id;
  if(!DESP[k]){ DESP[k]=true; render(); setTimeout(()=>{ if(DESP[k]){ delete DESP[k]; render(); } },4000); return; }
  delete DESP[k]; DATA.gastos=(DATA.gastos||[]).filter(g=>g.id!==id); _CAJA_CACHE=null; save(); render(); toast("Gasto borrado");
}
function permanenciasGestionHTML(){
  const L=permanenciasLista(), idx=_idxMes(DATA.reportMonth,DATA.reportYear);
  const nProx=L.filter(x=>x.prox).length, nIndef=L.filter(x=>x.tipo==="indef").length, ab=!!DESP["mg-perm"];
  let h=`<div class="mg-acc-head" id="mg-perm-head" onclick="DESP['mg-perm']=!DESP['mg-perm'];render()">
      <span>⏳ Permanencias${nProx?` <span class="mg-acc-num" style="background:#B07D14">${nProx} en 3 meses</span>`:""}</span>
      <span class="mg-acc-fl">${ab?"▲ ocultar":"▼ mostrar"}</span></div>`;
  if(!ab)return h;
  const fil=PERM_FIL;
  const chip=(k,t)=>`<button onclick="PERM_FIL='${k}';render()" style="flex:1;padding:9px 4px;border-radius:10px;border:1.5px solid ${fil===k?"#1B4332":"#E3DDD2"};background:${fil===k?"#1B4332":"#fff"};color:${fil===k?"#fff":"#3B3B3B"};font-size:13px;font-weight:700;cursor:pointer">${t}</button>`;
  const vis=L.filter(x=>fil==="todas"?true:fil==="prox"?x.prox:x.tipo==="indef");
  const est={pasada:["Terminó · sin decisión","#FDECE8","#C0492C"],decide:["Toca decidir","#FFF1CC","#7A5300"],pronto:["En 3 meses","#FFF8E6","#8A6A1E"]};
  const pill=(t,bg,c)=>`<span style="flex-shrink:0;font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:20px;background:${bg};color:${c}">${t}</span>`;
  const fila=x=>{
    const m=x.m, abrir=`data-nombre="${escH((m.name||"").toLowerCase())}" onclick="openFicha('${esc(m.id)}')"`;
    if(x.tipo==="sin")return `<div class="mg-card" ${abrir} style="cursor:pointer;padding:11px 14px;margin-bottom:8px">
      <div style="font-weight:700;font-size:15px;color:var(--dark)">${escH(m.name)}</div>
      <div style="font-size:12.5px;color:#C0492C;font-weight:700;margin-top:3px">⛔ Sin permanencia guardada: anótala en su ficha (⚙️ Permanencia y aporte)</div></div>`;
    const e=x.tipo==="fija"?est[x.estado]:(x.prox?[x.fin<=idx?"Aniversario":"Aniversario pronto","#E8F3EC","#1B4332"]:null);
    const M3=MONTHS_FULL[((x.fin%12)+12)%12].slice(0,3).toUpperCase(), Y=Math.floor(x.fin/12);
    const pago=x.tipo==="indef"?(x.ret?"Retirada · se paga en ":"Si retira, se paga en "):"Se le paga en ";
    const base=(x.tipo==="indef"?`Indefinida · entró en ${_txtIdx(x.ini)}`:`${m.ciclo} meses · entró en ${_txtIdx(x.ini)}`)+(mesesPausaTotal(m)?` · ⏸ pausa de ${mesesPausaTotal(m)} ${mesesPausaTotal(m)===1?"mes":"meses"}`:""); // v45.33
    return `<div class="mg-card" ${abrir} style="cursor:pointer;padding:10px 12px;margin-bottom:8px;display:flex;gap:12px;align-items:center">
      <div style="flex-shrink:0;width:62px;border-radius:10px;overflow:hidden;border:1.5px solid #8CC5A0;text-align:center;background:#fff">
        <div style="background:#1B4332;color:#fff;font-size:11px;font-weight:800;letter-spacing:.05em;padding:3px 0">${x.tipo==="indef"?"CUMPLE":"ÚLTIMO"}</div>
        <div style="font-size:19px;font-weight:900;color:#1B4332;line-height:1.1;padding-top:4px">${M3}</div><div style="font-size:12px;font-weight:700;color:#1B4332;padding-bottom:4px">${Y}</div></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div style="font-weight:700;font-size:15px;color:var(--dark);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escH(m.name)}</div>${e?pill(e[0],e[1],e[2]):""}</div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-top:2px"><span style="font-size:14px;font-weight:800;color:#7A5300">${pago}${_txtIdx(x.fin+1)}</span><span style="font-size:16px;font-weight:900;color:var(--dark);white-space:nowrap">${_eurM(x.importe)} €</span></div>
        <div style="font-size:12px;line-height:1.45;color:var(--muted);margin-top:1px">${base}</div></div></div>`;
  };
  h+=`<div style="margin:8px 0 14px">
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:8px;line-height:1.45">La hoja de calendario es el mes de su último aporte. Se le paga el mes siguiente, cuando se anota su último beneficio. El importe es el total previsto (aportes + beneficios) si paga los aportes que le quedan; si tiene una ayuda pendiente, se descuenta al pagar. En las indefinidas, el importe es el beneficio que puede retirar. Toca a una persona para abrir su ficha.</div>
    <div style="display:flex;gap:6px;margin-bottom:12px">${chip("todas","Todas ("+L.length+")")}${chip("prox","Próximos 3 meses ("+nProx+")")}${chip("indef","Indefinidas ("+nIndef+")")}</div>`;
  if(!vis.length)h+=`<div style="text-align:center;color:var(--muted);font-size:13px;padding:10px">${fil==="prox"?"✓ Ninguna permanencia termina en los próximos 3 meses":"No hay asociados en este grupo"}</div>`;
  const gk=y=>y.tipo==="sin"?"sin":y.tipo==="indef"?"i"+y.fin:"f"+y.fin;
  // v45.28b: sin cabecera por mes (ya lo dice la hoja de calendario); el total va debajo de las fichas del mismo mes
  const grupos=[]; vis.forEach(x=>{ const g=gk(x), u=grupos[grupos.length-1]; if(u&&u.g===g)u.l.push(x); else grupos.push({g,l:[x]}); });
  grupos.forEach(({g,l},gi)=>{
    if(g==="sin")h+=`<div class="send-section-label" style="margin:12px 0 6px">Sin permanencia guardada <span style="color:var(--muted);font-weight:600">· ${l.length}</span></div>`;
    l.forEach(x=>{ h+=fila(x); });
    if(g!=="sin"&&l.length>1){ const tot=_r2(l.reduce((s,y)=>s+(y.importe||0),0));
      h+=`<div style="display:flex;justify-content:flex-end;margin:-2px 0 4px"><span style="background:#F2EFE8;border-radius:20px;padding:5px 12px;font-size:13.5px;color:var(--dark)">Total <b style="font-size:15px">${_eurM(tot)} €</b></span></div>`; }
    if(gi<grupos.length-1)h+=`<div style="height:10px"></div>`;
  });
  return h+`</div>`;
}
function irPermanencias(){ TAB="manage"; FICHA_ID=null; DESP["mg-perm"]=true; PERM_FIL="todas"; render(); setTimeout(()=>{ const e=document.getElementById("mg-perm-head"); if(e)e.scrollIntoView({behavior:"smooth",block:"start"}); },40); }
