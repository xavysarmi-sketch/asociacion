// Nuevos Horizontes · grupos.js
// Cierre grupal y cuenta con el responsable del grupo
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).
// v45.15: grupo de una persona (principal o miembro) y propuesta automática de aval/grupo
function _grupoDe(mid){ const g=gruposCierre().find(x=>x.principalId===mid||(x.miembros||[]).includes(mid)); return g?g.id:""; }
function _cgSimIdx(gid){ const c=_idxMes(DATA.reportMonth,DATA.reportYear), v=CG_SIM_MES[gid]; return (v!=null&&v>=c)?v:c; }
function cgSimAdd(gid){
  const v=parseFloat(String((document.getElementById("cg-sim")||{}).value||"").replace(",","."));
  if(!(v>0)){toast("Escribe el importe de la ayuda");return;}
  const nombre=String((document.getElementById("cg-sim-nom")||{}).value||"").trim();
  const ms=(document.getElementById("cg-sim-mes")||{}).value; if(ms!=null&&ms!=="")CG_SIM_MES[gid]=+ms; // v45.17: mes de la simulación
  (CG_SIM[gid]=CG_SIM[gid]||[]).push({v:_r2(v),nombre}); CG_FORM=null; render();
}
function _cgSimEtq(x,i,n,html){ const nm=x.nombre?(html?escH(x.nombre):x.nombre):""; return (nm?`Ayuda a ${nm}`:`Ayuda${n>1?" "+(i+1):""}`)+" (si la das)"; }
function _cgDatosSim(g){
  const idx=_cgSimIdx(g.id), movs=_cgMovs(_keyDeIdx(idx),g.id), sim=CG_SIM[g.id]||[]; // v45.17: mes elegido
  const sum=t=>_r2(movs.filter(x=>x.tipo===t).reduce((a,x)=>a+x.importe,0));
  const falta=_sinCrearMes(idx,()=>_cgFalta(g,idx)), simTot=_r2(sim.reduce((a,b)=>a+b.v,0));
  return {idx,total:_sinCrearMes(idx,()=>_cgTotal(g,idx)),arrastre:sum("arrastre"),entregado:_r2(sum("entrega")+_sinCrearMes(idx,()=>_cgResto(g,idx))),ayudas:sum("ayuda"),sim,simTot,resto:_r2(falta-simTot)};
}
function cgSimEnviar(gid){
  const g=gruposCierre().find(x=>x.id===gid); if(!g)return;
  const p=DATA.members.find(m=>m.id===g.principalId); if(!p)return;
  const d=_cgDatosSim(g), nom=p.name.split(" ")[0], mes=_txtIdx(d.idx).split(" ")[0], e=v=>fmtEur(v)+" €";
  let t=`Hola ${nom} 👋\nAsí quedarían tus cuentas de ${mes}:\n\nTotal del grupo: ${e(d.total)}`;
  if(d.arrastre)t+=`\nPendiente anterior: +${e(d.arrastre)}`;
  if(d.entregado)t+=`\nYa me has entregado: −${e(d.entregado)}`;
  if(d.ayudas)t+=`\nAyudas que ya has dado: −${e(d.ayudas)}`;
  d.sim.forEach((x,i)=>{ t+=`\n${_cgSimEtq(x,i,d.sim.length,false)}: −${e(x.v)}`; });
  t+= d.resto>=0?`\n\n👉 *Te quedaría por entregar: ${e(d.resto)}*`:`\n\n⚠️ *Te faltarían ${e(-d.resto)} para dar estas ayudas*`;
  t+=`\n\nNuevos Horizontes · Construyendo un nuevo sistema`;
  if(navigator.share){ navigator.share({text:t}).then(()=>toast("Compartido ✓")).catch(x=>{if(x.name!=="AbortError")window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");}); }
  else window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");
}
// v45.15: enviar el estado real de la cuenta del grupo por WhatsApp
function cgEnviarCuenta(gid){
  const g=gruposCierre().find(x=>x.id===gid); if(!g)return;
  const p=DATA.members.find(m=>m.id===g.principalId); if(!p)return;
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), movs=_cgMovs(_keyDeIdx(idx),gid), falta=_cgFalta(g,idx);
  const nom=p.name.split(" ")[0], mes=MONTHS_FULL[MONTHS.indexOf(DATA.reportMonth)].toLowerCase(), e=v=>fmtEur(v)+" €";
  const mesDe=k=>MONTHS_FULL[+k.slice(5)-1].toLowerCase();
  let t=`Hola ${nom} 👋\nTus cuentas de ${mes}:\n\nTotal del grupo: ${e(_cgTotal(g,idx))}`;
  movs.forEach(x=>{
    if(x.tipo==="arrastre")t+=`\nPendiente de ${mesDe(x.de)}: +${e(x.importe)}`;
    else if(x.tipo==="entrega")t+=`\nMe entregaste${x.fecha?" el "+x.fecha:""}: −${e(x.importe)}`;
    else if(x.tipo==="ayuda")t+=`\nAyuda que diste a ${x.nombre||""}: −${e(x.importe)}`;
  });
  { const r=_cgResto(g,idx); if(r>0)t+=`\nResto entregado: −${e(r)}`; } // v45.30
  t+= falta>0?`\n\n👉 *Te falta por entregar: ${e(falta)}*`:falta<0?`\n\n👉 *Me has entregado ${e(-falta)} de más*`:`\n\n✅ *Todo entregado. ¡Gracias!*`;
  t+=`\n\nNuevos Horizontes · Construyendo un nuevo sistema`;
  if(navigator.share){ navigator.share({text:t}).then(()=>toast("Compartido ✓")).catch(x=>{if(x.name!=="AbortError")window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");}); }
  else window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");
}
function cgSimQuitar(gid,i){ if(i==null){delete CG_SIM[gid];delete CG_SIM_MES[gid];} else { CG_SIM[gid].splice(i,1); if(!CG_SIM[gid].length){delete CG_SIM[gid];delete CG_SIM_MES[gid];} } render(); }
function _cgMovs(key,gid){ const c=DATA.cuentasGrupo&&DATA.cuentasGrupo[key]&&DATA.cuentasGrupo[key][gid]; return (c&&c.movs)||[]; }
function _cgW(key,gid){ if(!DATA.cuentasGrupo)DATA.cuentasGrupo={}; if(!DATA.cuentasGrupo[key])DATA.cuentasGrupo[key]={}; if(!DATA.cuentasGrupo[key][gid])DATA.cuentasGrupo[key][gid]={movs:[]}; return DATA.cuentasGrupo[key][gid]; }
function _cgTotal(g,idx){ const {mes,anio}=_mesDeIdx(idx); return _r2(itemsDeGrupo(g,mes,anio).reduce((s,it)=>s+it.importe,0)); }
// Lo que falta por entregar en el mes idx: total + arrastre − entregas − ayudas − pasado al mes siguiente
function _cgFaltaApuntes(g,idx){ // solo con lo apuntado en la cuenta
  const movs=_cgMovs(_keyDeIdx(idx),g.id); let f=_cgTotal(g,idx);
  movs.forEach(x=>{ f+= x.tipo==="arrastre"? x.importe : -x.importe; });
  return _r2(f);
}
// v45.30: la cuenta es un borrador; manda el Cierre. Si todo lo del grupo está marcado como cobrado,
// lo que no se apuntó cuenta como entregado («resto entregado») y la cuenta queda a 0.
function _cgResto(g,idx){
  const {mes,anio}=_mesDeIdx(idx), items=itemsDeGrupo(g,mes,anio);
  if(!items.length||!items.every(it=>it.yaPagado))return 0;
  return Math.max(0,_cgFaltaApuntes(g,idx));
}
function _cgFalta(g,idx){ return _r2(_cgFaltaApuntes(g,idx)-_cgResto(g,idx)); }
function _cgHoy(){ const d=new Date(); return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0"); }
function cgAbrir(gid,tipo){ CG_FORM={gid,tipo}; render(); }
function cgGuardar(gid){
  const g=gruposCierre().find(x=>x.id===gid); if(!g||!CG_FORM)return;
  const key=getMesKey(DATA.reportMonth,DATA.reportYear);
  if(CG_FORM.tipo==="entrega"){
    const v=parseFloat(String((document.getElementById("cg-imp")||{}).value||"").replace(",","."));
    if(!(v>0)){toast("Escribe el importe que te ha entregado");return;}
    _cgW(key,gid).movs.push({id:"cg"+Date.now()+Math.random().toString(36).slice(2,6),tipo:"entrega",importe:_r2(v),fecha:_cgHoy()});
  } else {
    const sel=(document.getElementById("cg-ayuda")||{}).value||""; if(!sel){toast("Elige la ayuda");return;}
    const [mid,lid]=sel.split("|"); const m=DATA.members.find(x=>x.id===mid);
    const l=m&&[...(m.loans||[]),...(m.closedLoans||[])].find(x=>x.id===lid); if(!l)return;
    _cgW(key,gid).movs.push({id:"cg"+Date.now()+Math.random().toString(36).slice(2,6),tipo:"ayuda",importe:_r2(l.capital),fecha:_cgHoy(),mid,lid,nombre:m.name});
  }
  CG_FORM=null; save(); render(); toast("Apuntado ✓");
}
function cgBorrar(gid,mvid){
  const key=getMesKey(DATA.reportMonth,DATA.reportYear), c=_cgW(key,gid), mv=c.movs.find(x=>x.id===mvid);
  if(mv&&mv.tipo==="arrastre"&&mv.de){ const p=_cgW(mv.de,gid); p.movs=p.movs.filter(x=>!(x.tipo==="pasado"&&x.par===mvid)); }
  c.movs=c.movs.filter(x=>x.id!==mvid); delete DESP["cgdel-"+mvid]; save(); render();
}
// Pasa lo que quedó pendiente del mes anterior a este mes (queda cerrado allí con «pasado»)
function cgArrastrar(gid){
  const g=gruposCierre().find(x=>x.id===gid); if(!g)return;
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), pk=_keyDeIdx(idx-1), f=_cgFalta(g,idx-1); if(!(f>0))return;
  const id="cg"+Date.now()+Math.random().toString(36).slice(2,6);
  _cgW(_keyDeIdx(idx),gid).movs.push({id,tipo:"arrastre",importe:f,fecha:_cgHoy(),de:pk});
  _cgW(pk,gid).movs.push({id:id+"p",tipo:"pasado",importe:f,fecha:_cgHoy(),par:id,a:_keyDeIdx(idx)});
  save(); render(); toast("Pasado a este mes ✓");
}
// Ayudas registradas en el mes del cierre que aún no están apuntadas en ninguna cuenta de grupo
function _cgAyudasDisponibles(key){
  const usadas=new Set(); Object.values((DATA.cuentasGrupo&&DATA.cuentasGrupo[key])||{}).forEach(c=>(c.movs||[]).forEach(x=>{ if(x.tipo==="ayuda")usadas.add(x.lid); }));
  const out=[]; DATA.members.forEach(m=>[...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{ if(l.gMonth===DATA.reportMonth&&l.gYear===DATA.reportYear&&!usadas.has(l.id))out.push({m,l}); }));
  return out.sort((a,b)=>a.m.name.localeCompare(b.m.name));
}
// v45.14: ¿cuenta del mes cerrada? Todo lo del grupo marcado como pagado, o la cuenta llega a 0 con apuntes
function _cgCerrada(g){
  // v45.26: si hay apuntes en la cuenta del grupo, manda la cuenta (liquidada = no falta nada).
  // Sin apuntes, basta con que todo esté marcado como cobrado en el Cierre.
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), items=itemsDeGrupo(g);
  if(_cgMovs(_keyDeIdx(idx),g.id).length>0)return _cgFalta(g,idx)===0;
  return items.length>0&&items.every(it=>it.yaPagado);
}
// v45.26: en el Cierre está todo cobrado pero la cuenta del responsable no llega → lo que falta por apuntar
function cuentaGrupoHTML(g,principal){
  { // v45.14: liquidada → solo un enlace pequeño; sin apuntes → una línea que se abre al tocarla
    const idx0=_idxMes(DATA.reportMonth,DATA.reportYear), mes0=MONTHS_FULL[((idx0%12)+12)%12].toLowerCase(), nom0=escH(principal.name.split(" ")[0]);
    const usando=(CG_FORM&&CG_FORM.gid===g.id)||!!CG_SIM[g.id];
    if(_cgCerrada(g)&&!DESP["cgver-"+g.id]&&!usando)
      return `<div style="text-align:center;margin-top:10px"><button onclick="DESP['cgver-${g.id}']=true;render()" style="background:none;border:none;color:#2D6A4F;font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer;padding:4px">Ver cuenta de ${mes0}</button></div>`;
    const pf0=_cgMovs(_keyDeIdx(idx0-1),g.id).length?_cgFalta(g,idx0-1):0;
    if(!_cgCerrada(g)&&!_cgMovs(_keyDeIdx(idx0),g.id).length&&!(pf0>0)&&!DESP["cgabrir-"+g.id]&&!usando)
      return `<button onclick="DESP['cgabrir-${g.id}']=true;render()" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left;margin-top:12px;padding:11px 14px;border-radius:12px;border:1.5px solid #2D6A4F;background:#F4F9F6;color:#1B4332;cursor:pointer">
        <span style="font-size:18px">💶</span><span style="flex:1;font-size:14px;font-weight:800">Cuenta con ${nom0} · ${mes0} <span style="font-weight:600;font-size:12.5px;opacity:.8">· toca para abrir</span></span><span style="font-size:18px">›</span></button>`;
  }
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), key=_keyDeIdx(idx), movs=_cgMovs(key,g.id);
  const total=_cgTotal(g,idx), falta=_cgFalta(g,idx), nom=escH(principal.name.split(" ")[0]);
  const mesTxt=MONTHS_FULL[((idx%12)+12)%12].toLowerCase(), prevTxt=MONTHS_FULL[(((idx-1)%12)+12)%12].toLowerCase();
  const fila=(l,v,c)=>`<div style="display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;font-size:14px"><span>${l}</span><b style="${c||""}">${v}</b></div>`;
  const cerrada=_cgCerrada(g); // v45.41: cuenta cerrada (no falta nada): se dice arriba y no se ofrecen apuntes nuevos
  let h=`<div style="border:1.5px solid #2D6A4F;border-radius:12px;padding:12px 14px;margin-top:12px;background:#F4F9F6">
    <div style="font-size:15px;font-weight:800;color:#1B4332;margin-bottom:6px">💶 Cuenta con ${nom} · ${mesTxt}</div>
    ${cerrada?`<div style="background:#1B4332;color:#fff;border-radius:10px;padding:9px 11px;margin-bottom:8px;font-size:14.5px;font-weight:800">✅ Cuenta cerrada: ${nom} te ha entregado todo (${fmtEur(total)} €)</div>`:""}`;
  // Aviso: quedó algo pendiente el mes anterior (solo si allí hubo apuntes)
  const pk=_keyDeIdx(idx-1), pf=_cgMovs(pk,g.id).length?_cgFalta(g,idx-1):0;
  if(pf>0)h+=`<div style="background:#FFF4E5;border:1.5px solid #E0A040;border-radius:9px;padding:8px 10px;font-size:13px;color:#6B4210;margin-bottom:8px">⚠️ En ${prevTxt} quedaron pendientes <b>${fmtEur(pf)} €</b>.
      <button onclick="cgArrastrar('${g.id}')" style="display:block;margin-top:6px;width:100%;padding:8px;border-radius:8px;border:none;background:#B06A1E;color:#fff;font-size:13px;font-weight:800;cursor:pointer">Pasar a ${mesTxt}</button></div>`;
  h+=fila("Total del grupo",fmtEur(total)+" €");
  movs.forEach(x=>{
    const txt=x.tipo==="entrega"?`💶 Entrega · ${escH(x.fecha||"")}`:x.tipo==="ayuda"?`🤝 Ayuda a ${escH(x.nombre||"")}`:x.tipo==="arrastre"?`↪️ Pendiente de ${escH(_txtIdx(_idxMes(MONTHS[+x.de.slice(5)-1],+x.de.slice(0,4))).split(" ")[0])}`:`➡️ Pasado a ${escH(_txtIdx(_idxMes(MONTHS[+x.a.slice(5)-1],+x.a.slice(0,4))).split(" ")[0])}`;
    const signo=x.tipo==="arrastre"?"+":"−", k="cgdel-"+x.id, arm=!!DESP[k];
    h+=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;background:#fff;border:1px solid #D5E3D9;border-radius:9px;padding:7px 9px;margin-top:6px;font-size:13.5px">
      <span style="flex:1;min-width:0">${txt}</span><b style="white-space:nowrap">${signo}${fmtEur(x.importe)} €</b>
      ${x.tipo==="pasado"?"":`<button onclick="${arm?`cgBorrar('${g.id}','${x.id}')`:`DESP['${k}']=true;render()`}" style="border:none;background:${arm?"#C0492C":"none"};color:${arm?"#fff":"#C0492C"};border-radius:7px;font-size:${arm?12:16}px;font-weight:800;cursor:pointer;padding:${arm?"4px 8px":"0 2px"}">${arm?"¿Borrar?":"✕"}</button>`}</div>`;
  });
  const resto=_cgResto(g,idx); // v45.30
  if(resto>0)h+=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;background:#E8F3EC;border:1px solid #B7D9C3;border-radius:9px;padding:7px 9px;margin-top:6px;font-size:13.5px">
      <span style="flex:1;min-width:0">✅ Entregado sin apuntar <span style="font-size:12px;color:var(--muted)">(en Cobros está todo marcado como cobrado, así que se da por entregado)</span></span><b style="white-space:nowrap">−${fmtEur(resto)} €</b></div>`; // v45.41: antes «Resto entregado»
  { const ya=_r2(movs.filter(x=>x.tipo==="entrega"||x.tipo==="ayuda").reduce((a,x)=>a+x.importe,0)+resto); // v45.14 · v45.30: + resto
    if(ya>0)h+=`<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;font-size:14px;color:#2D6A4F"><span>Ya te ha entregado</span><b>${fmtEur(ya)} €</b></div>`; }
  h+=`<div style="display:flex;justify-content:space-between;align-items:baseline;border-top:1.5px solid #2D6A4F;margin-top:10px;padding-top:8px">
      <b style="color:#1B4332;font-size:15px">${falta>0?"Falta por entregarte":falta<0?"Te ha dado de más":"✅ Liquidado"}</b>
      ${falta!==0?`<b style="font-size:20px;color:${falta>0?"#B06A1E":"#C0492C"}">${fmtEur(Math.abs(falta))} €</b>`:""}</div>`;
  // v45.30: sin aviso de descuadre: lo marcado como cobrado en el Cierre cuenta como entregado
  if(CG_FORM&&CG_FORM.gid===g.id){
    if(CG_FORM.tipo==="sim"){
      h+=`<label class="m-label" style="margin-top:10px">¿De cuánto sería la ayuda?</label>
        <input id="cg-sim" type="number" inputmode="decimal" class="m-input" placeholder="Ej: 500" style="font-size:16px">
        <label class="m-label">¿Para quién? <span style="font-weight:600;color:var(--muted)">(opcional)</span></label>
        <input id="cg-sim-nom" type="text" class="m-input" placeholder="Ej: Ana" style="font-size:16px">
        <label class="m-label">¿Para qué mes?${(CG_SIM[g.id]||[]).length?` <span style="font-weight:600;color:var(--muted)">(cambia toda la simulación)</span>`:""}</label>
        <select id="cg-sim-mes" class="m-select" style="font-size:15px">${[0,1,2,3].map(k=>{const i=idx+k,t=_txtIdx(i);return `<option value="${i}"${i===_cgSimIdx(g.id)?" selected":""}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`;}).join("")}</select>`; // v45.17
    } else if(CG_FORM.tipo==="entrega"){
      h+=`<label class="m-label" style="margin-top:10px">¿Cuánto te ha entregado ${nom}?</label>
        <input id="cg-imp" type="number" inputmode="decimal" class="m-input" placeholder="Ej: 1100" style="font-size:16px">`;
    } else {
      const disp=_cgAyudasDisponibles(key);
      h+=disp.length?`<label class="m-label" style="margin-top:10px">¿Qué ayuda ha pagado ${nom}?</label>
        <select id="cg-ayuda" class="m-select" style="font-size:15px"><option value="">— Elegir ayuda de ${mesTxt} —</option>
        ${disp.map(({m,l})=>`<option value="${esc(m.id)}|${esc(l.id)}">${escH(m.name)} · ${fmtEur(l.capital)} €</option>`).join("")}</select>`
        :`<div style="margin-top:10px;font-size:13px;color:#6B4210;background:#FFF4E5;border-radius:9px;padding:8px 10px">No hay ayudas de ${mesTxt} sin apuntar. Primero registra la ayuda como siempre y después la eliges aquí.</div>`;
    }
    h+=`<div style="display:flex;gap:6px;margin-top:8px">
        <button onclick="CG_FORM=null;render()" style="flex:1;padding:10px;border-radius:9px;border:1.5px solid #D9C9B0;background:#fff;color:#8A7A60;font-size:13.5px;font-weight:700;cursor:pointer">Cancelar</button>
        <button onclick="${CG_FORM.tipo==="sim"?`cgSimAdd('${g.id}')`:`cgGuardar('${g.id}')`}" style="flex:2;padding:10px;border-radius:9px;border:none;background:${CG_FORM.tipo==="sim"?"#B06A1E":"#1B4332"};color:#fff;font-size:13.5px;font-weight:800;cursor:pointer">${CG_FORM.tipo==="sim"?"Simular":"Guardar"}</button></div>`;
  } else {
    if(!cerrada)h+=`<div style="display:flex;gap:6px;margin-top:10px">
        <button onclick="cgAbrir('${g.id}','entrega')" style="flex:1;padding:10px 4px;border-radius:9px;border:none;background:#1B4332;color:#fff;font-size:13px;font-weight:800;cursor:pointer">＋ Entrega</button>
        <button onclick="cgAbrir('${g.id}','ayuda')" style="flex:1;padding:10px 4px;border-radius:9px;border:1.5px solid #1B4332;background:#fff;color:#1B4332;font-size:13px;font-weight:800;cursor:pointer">＋ Ayuda que paga ${nom}</button></div>`;
    h+=`<button onclick="cgEnviarCuenta('${g.id}')" style="width:100%;margin-top:6px;padding:10px;border-radius:9px;border:none;background:#25D366;color:#fff;font-size:13.5px;font-weight:800;cursor:pointer">💬 Enviar cuenta a ${nom}</button>
      <button onclick="cgAbrir('${g.id}','sim')" style="width:100%;margin-top:6px;padding:9px;border-radius:9px;border:1.5px dashed #B06A1E;background:#FFF8EE;color:#8A4F12;font-size:13px;font-weight:800;cursor:pointer">🧮 Simular ayudas</button>`;
  }
  // v45.13: simulación de ayudas, escrita para enviársela al responsable del grupo (no se guarda)
  const sim=CG_SIM[g.id]||[];
  if(sim.length){
    const d=_cgDatosSim(g); 
    const fl=(l,v,c)=>`<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13.5px;padding:3px 0"><span>${l}</span><b style="white-space:nowrap;${c||""}">${v}</b></div>`;
    h+=`<div style="border:1.5px dashed #B06A1E;border-radius:10px;padding:10px 12px;margin-top:10px;background:#FFF8EE">
      <div style="font-size:14px;font-weight:800;color:#8A4F12;margin-bottom:6px">${nom}, así quedarían tus cuentas de ${_txtIdx(d.idx).split(" ")[0]}:</div>
      ${fl("Total del grupo",fmtEur(d.total)+" €")}
      ${d.arrastre?fl("Pendiente anterior","+"+fmtEur(d.arrastre)+" €"):""}
      ${d.entregado?fl("Ya me has entregado","−"+fmtEur(d.entregado)+" €"):""}
      ${d.ayudas?fl("Ayudas que ya has dado","−"+fmtEur(d.ayudas)+" €"):""}
      ${sim.map((x,i)=>`<div style="padding:3px 0"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13.5px"><span style="min-width:0">${_cgSimEtq(x,i,sim.length,true)}</span><span style="white-space:nowrap"><b>−${fmtEur(x.v)} €</b> <button onclick="cgSimQuitar('${g.id}',${i})" style="border:none;background:none;color:#C0492C;font-size:15px;cursor:pointer;padding:0 2px">✕</button></span></div>
        <button onclick="solDesdeSim('${g.id}',${i})" style="margin-top:3px;padding:5px 9px;border-radius:8px;border:1px solid #2D6A4F;background:#fff;color:#1B4332;font-size:12px;font-weight:800;cursor:pointer">📝 Pasar a solicitudes</button></div>`).join("")}
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid #E8C9A0;margin-top:6px;padding-top:6px">
        <b style="color:#8A4F12;font-size:14px">${d.resto>=0?"Te quedaría por entregar":"Te faltarían para dar estas ayudas"}</b>
        <b style="font-size:19px;white-space:nowrap;color:${d.resto>=0?"#B06A1E":"#C0492C"}">${fmtEur(Math.abs(d.resto))} €</b></div>
      <div style="display:flex;gap:6px;margin-top:10px">
        <button onclick="cgSimQuitar('${g.id}')" style="flex:1;padding:9px;border-radius:9px;border:1px solid #E8C9A0;background:#fff;color:#8A4F12;font-size:12.5px;font-weight:700;cursor:pointer">Quitar</button>
        <button onclick="cgSimEnviar('${g.id}')" style="flex:2;padding:9px;border-radius:9px;border:none;background:#25D366;color:#fff;font-size:13px;font-weight:800;cursor:pointer">💬 Enviar a ${nom}</button></div></div>`;
  }
  if(_cgCerrada(g)&&DESP["cgver-"+g.id])h+=`<div style="text-align:center;margin-top:8px"><button onclick="DESP['cgver-${g.id}']=false;render()" style="background:none;border:none;color:#2D6A4F;font-size:12.5px;font-weight:700;text-decoration:underline;cursor:pointer">Ocultar</button></div>`;
  return h+`</div>`;
}
function crearGrupo(principalId){
  if(!principalId)return;
  gruposCierre().push({id:"G"+Date.now(),principalId,miembros:[]});
  save();render();
}
function borrarGrupo(gid){
  DATA.gruposCierre=gruposCierre().filter(g=>g.id!==gid);
  save();render();
}
function añadirMiembroGrupo(gid,mid){
  if(!mid)return;
  const g=gruposCierre().find(x=>x.id===gid);
  if(g&&g.principalId!==mid&&!(g.miembros||[]).includes(mid)){
    if(!g.miembros)g.miembros=[];
    g.miembros.push(mid);
    save();render();
  }
}
function quitarMiembroGrupo(gid,mid){
  const g=gruposCierre().find(x=>x.id===gid);
  if(g){ g.miembros=(g.miembros||[]).filter(x=>x!==mid); save();render(); }
}
function marcarItemGrupo(tipo,mid,lid,pi){
  if(tipo==="aporte"){
    const md=getMesData(DATA.reportMonth,DATA.reportYear);
    if(!md.aportes)md.aportes={};
    md.aportes[mid]=!md.aportes[mid];
    anotarFechaAporte(md,mid); // v45.37
  } else {
    const m=DATA.members.find(x=>x.id===mid);
    if(m)[...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{if(l.id===lid){l.pays[pi].paid=!l.pays[pi].paid;anotarFechaCuota(l.pays[pi]);}}); // v45.37: + fecha
    recolocarAyudas();
  }
  recalcMesRecargo();save();render();
}
function marcarTodoGrupo(gid){
  const g=gruposCierre().find(x=>x.id===gid);
  if(!g)return;
  itemsDeGrupo(g).forEach(it=>{
    if(it.yaPagado)return;
    if(it.tipo==="aporte"){
      const md=getMesData(DATA.reportMonth,DATA.reportYear);
      if(!md.aportes)md.aportes={};
      md.aportes[it.mid]=true;
      anotarFechaAporte(md,it.mid); // v45.37
    } else {
      const m=DATA.members.find(x=>x.id===it.mid);
      if(m)[...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{if(l.id===it.lid){l.pays[it.pi].paid=true;anotarFechaCuota(l.pays[it.pi]);}}); // v45.37: + fecha
    }
  });
  recolocarAyudas();recalcMesRecargo();save();render();
  toast("Grupo marcado como pagado ✓");
}
function recolocarAyudas(){
  DATA.members.forEach(m=>{
    const t=[...(m.loans||[]),...(m.closedLoans||[])];
    m.loans=t.filter(l=>l.pays.some(p=>!p.paid));
    m.closedLoans=t.filter(l=>l.pays.every(p=>p.paid));
  });
}
// ¿Es este asociado el principal de algún grupo de Cierre? (su enlace de grupo
// dejaría de encontrar miembros si se le elimina)
function esPrincipalDeGrupo(mid){
  return (DATA.gruposCierre||[]).some(g=>g.principalId===mid);
}
