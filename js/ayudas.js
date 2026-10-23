// Nuevos Horizontes · ayudas.js
// Ayudas: solicitudes, dinero del mes, registro y edición, simuladores y WhatsApp de la simulación
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).
// v45.17: mes para el que se pide la ayuda (so.mes = "AAAA-MM", se otorga en el cierre de ese mes). Sin mes = la del mes actual.
function _solMesIdx(so){ if(!so||!so.mes)return -1e9; const [y,m]=so.mes.split("-").map(Number); return y*12+m-1; }
function _solEsAhora(so){ return _solMesIdx(so)<=_idxMes(DATA.reportMonth,DATA.reportYear); }
// v45.17: preferencia — primero asociados (y personas nuevas, que entran como asociados), después terceros; dentro, el orden que fija Ángel (▲▼)
function _solTipo(so){ const m=so.mid&&DATA.members.find(x=>x.id===so.mid); if(m)return m.type==="tercero"?1:0; return so.tipoNuevo==="tercero"?1:0; } // v45.18: cuenta cómo está hoy (AY-2); una persona nueva, según cómo entra
function _solEtqTipo(so,m){ return m?(m.type==="tercero"?"Tercero":"Asociado"):(so.tipoNuevo==="tercero"?"Nuevo · tercero con aval":so.tipoNuevo==="asociado"?"Nuevo · asociado":"Nuevo"); }
function _solOrdenar(list){ const arr=_solsR(), k=so=>so.orden!=null?so.orden:1e6+arr.indexOf(so); return list.slice().sort((a,b)=>_solTipo(a)-_solTipo(b)||k(a)-k(b)); }
function _solGrupoDe(so){ const p=_solsR().filter(x=>x.estado==="pendiente"&&_solTipo(x)===_solTipo(so)); return _solEsAhora(so)?p.filter(_solEsAhora):p.filter(x=>!_solEsAhora(x)&&_solMesIdx(x)===_solMesIdx(so)); }
function solMover(id,dir){ const so=_sols().find(x=>x.id===id); if(!so)return; const L=_solOrdenar(_solGrupoDe(so)), i=L.indexOf(so), j=i+dir; if(j<0||j>=L.length)return; [L[i],L[j]]=[L[j],L[i]]; L.forEach((x,n)=>x.orden=n); save(); render(); }
// Reparto del dinero en el orden de preferencia: si una no cabe, se salta y se sigue con la siguiente
function _solReparto(list,dinero){ let r=_r2(dinero); const out={}; list.forEach(so=>{ if(so.capital<=r){ out[so.id]={ok:true}; r=_r2(r-so.capital); } else out[so.id]={ok:false,falta:_r2(so.capital-Math.max(0,r))}; }); return out; }
// Lee un mes sin dejar creado un mes vacío en los datos (render no escribe)
function _sinCrearMes(mi,fn){ const k=_keyDeIdx(mi), habia=!!(DATA.monthlyData&&DATA.monthlyData[k]); try{ return fn(); } finally { if(!habia&&DATA.monthlyData)delete DATA.monthlyData[k]; } }
function _solAlcanzaHTML(r){ return r?(r.ok?`<span style="color:#1B7A3D;font-weight:800">✅ Alcanza</span>`:`<span style="color:#8A4F12;font-weight:800">⚠️ Faltan ${fmtEur(r.falta)} €</span><span style="color:#8A4F12"> · busca un aporte temporal; si no se consigue, queda fuera (AY-9)</span>`):""; }
function _solFlechas(so,L){ const i=L.indexOf(so), b=(d,t,on)=>`<button ${on?`onclick="solMover('${so.id}',${d})"`:"disabled"} style="width:26px;height:22px;padding:0;border-radius:6px;border:1px solid ${on?"#2D6A4F":"#E3DDD2"};background:#fff;color:${on?"#1B4332":"#D0C8BA"};font-size:11px;cursor:${on?"pointer":"default"}">${t}</button>`;
  return L.length>1?`<div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">${b(-1,"▲",i>0)}${b(1,"▼",i<L.length-1)}</div>`:""; }
function _mesesSolOpts(sel){ const c=_idxMes(DATA.reportMonth,DATA.reportYear); let o=""; for(let i=c;i<=c+3;i++){ const k=_keyDeIdx(i), t=_txtIdx(i); o+=`<option value="${k}"${k===sel?" selected":""}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`; } return o; }
function _sols(){ if(!DATA.solicitudes)DATA.solicitudes=[]; return DATA.solicitudes; }
function _solsR(){ return DATA.solicitudes||[]; } // solo lectura (para pintar)
function solGuardar(otorgarYa){
  const mid=(document.getElementById("so-mid")||{}).value||"";
  const nom=String((document.getElementById("so-nom")||{}).value||"").trim();
  const cap=parseFloat(String((document.getElementById("so-cap")||{}).value||"").replace(",","."));
  const n=parseInt((document.getElementById("so-n")||{}).value||"5");
  const m=mid?DATA.members.find(x=>x.id===mid):null;
  if(!m&&!nom){toast("Elige a la persona o escribe su nombre");return;}
  const tipoNuevo=m?null:((document.getElementById("so-tipo")||{}).value||""); // v45.18 (AY-9): una persona nueva entra como asociado o como tercero con aval
  if(!m&&!tipoNuevo){toast("Elige cómo entra: asociado o tercero con aval");return;}
  if(!m&&tipoNuevo==="tercero"&&!((document.getElementById("so-aval")||{}).value)){toast("Un tercero necesita aval (AY-8)");return;}
  if(!(cap>0)){toast("Escribe la cantidad que pide");return;}
  const avalId=(document.getElementById("so-aval")||{}).value||null, grupoGid=(document.getElementById("so-grupo")||{}).value||null;
  const mes=(document.getElementById("so-mes")||{}).value||getMesKey(DATA.reportMonth,DATA.reportYear); // v45.17
  const nid="S"+Date.now()+Math.random().toString(36).slice(2,6); // v45.45
  _sols().push({id:nid,mid:m?m.id:null,nombre:m?m.name:nom,capital:_r2(cap),cuotas:n,fecha:_hoyDMA(),estado:"pendiente",avalId,grupoGid,mes,...(tipoNuevo?{tipoNuevo}:{})});
  if(SOL_PREFILL&&SOL_PREFILL.simGid){ const a=CG_SIM[SOL_PREFILL.simGid]; if(a){ const i=a.indexOf(SOL_PREFILL.simRef); if(i>=0)a.splice(i,1); if(!a.length){delete CG_SIM[SOL_PREFILL.simGid];delete CG_SIM_MES[SOL_PREFILL.simGid];} } } // v45.17: sale de la simulación
  SOL_FORM=false; SOL_PREFILL=null; save(); render();
  if(!otorgarYa){ toast("Solicitud apuntada ✓"); return; }
  // v45.45: «Guardar y otorgar ya»: solo si es de este mes, no hay otras delante y el dinero alcanza
  const so=_sols().find(x=>x.id===nid), otras=_solsR().filter(x=>x.estado==="pendiente"&&x.id!==nid&&_solEsAhora(x)), disp=dineroAyudasMes().disponible;
  if(!_solEsAhora(so)){ toast("Apuntada para "+_txtIdx(_solMesIdx(so)).split(" ")[0]+": se otorga en el cierre de ese mes",4000); return; }
  if(otras.length){ toast("Apuntada en la lista: hay "+otras.length+(otras.length===1?" solicitud":" solicitudes")+" antes. Otórgalas en orden.",4500); return; }
  if(so.capital>disp){ toast("Apuntada en la lista: el dinero del mes no alcanza (faltan "+fmtEur(_r2(so.capital-Math.max(0,disp)))+" €)",4500); return; }
  solOtorgar(nid);
}
function soAvalCambio(){ const a=(document.getElementById("so-aval")||{}).value||"", g=document.getElementById("so-grupo"); if(g&&a){ const gid=_grupoDe(a); if(gid)g.value=gid; } }
function soMidCambio(){
  const mid=(document.getElementById("so-mid")||{}).value||"", w=document.getElementById("so-nom-wrap"); if(w)w.style.display=mid?"none":"block";
  const m=mid&&DATA.members.find(x=>x.id===mid); if(!m)return;
  const av=m.type==="tercero"?m.ref:m.referidoPor, a=document.getElementById("so-aval"), g=document.getElementById("so-grupo");
  if(a&&av)a.value=av; if(g){ const gid=_grupoDe(mid)||(av?_grupoDe(av):""); if(gid)g.value=gid; }
}
function solPreview(){
  const cap=parseFloat(String((document.getElementById("so-cap")||{}).value||"").replace(",","."))||0, n=parseInt((document.getElementById("so-n")||{}).value||"5");
  const el=document.getElementById("so-prev"); if(!el)return;
  if(!(cap>0)){el.innerHTML="";return;}
  const {total,cuotas}=ayudaCuotas(cap,n,DATA.rate), a=cuotas[0], b=cuotas[cuotas.length-1];
  el.innerHTML=`<div style="background:#EEF7F1;border-radius:9px;padding:8px 10px;font-size:13.5px;margin-bottom:10px">${n} ${n===1?"cuota":"cuotas"} de <b>${fmtEur(a)} €</b>${a!==b?` (última ${fmtEur(b)} €)`:""} · total ${fmtEur(total)} €</div>`;
}
function solOtorgar(id){
  const so=_sols().find(x=>x.id===id); if(!so)return;
  if(!_solEsAhora(so)){ toast("Se otorga en el cierre de "+_txtIdx(_solMesIdx(so)).split(" ")[0]); return; } // v45.17
  const m=so.mid&&DATA.members.find(x=>x.id===so.mid);
  if(m){openModal('cierreloan',{sol:id});setTimeout(updateCierreLoanPreview,30);}
  else { const pr=so.tipoNuevo==="tercero"?"tercero":"asociado"; // v45.18: el alta se abre como entra (asociado o tercero con aval)
    openModal('member',{preset:pr,sol:id,solNombre:so.nombre,solAval:so.avalId||null}); if(so.avalId&&pr==="asociado")setTimeout(altaReferidoCambio,30); }
}
function _solTrasAlta(solId,m){ const so=_sols().find(x=>x.id===solId); if(!so||!m)return; so.mid=m.id; so.nombre=m.name; save(); setTimeout(()=>{openModal('cierreloan',{sol:solId});setTimeout(updateCierreLoanPreview,30);},150); }
// v45.16: «+ Nueva solicitud» desde la tarjeta de la persona: abre Solicitudes con la persona, su aval y su grupo ya puestos
function solDesdeGestion(mid){
  TAB="ayudas"; FICHA_ID=null; SOL_FORM=true; render(); // v45.39
  setTimeout(()=>{ const s=document.getElementById("so-mid"); if(!s)return; s.value=mid; soMidCambio();
    const c=document.getElementById("so-cap"); const h=document.getElementById("so-mid");
    if(h)h.scrollIntoView({behavior:"smooth",block:"start"}); if(c)setTimeout(()=>c.focus(),350); },40);
}
function solDesdeSim(gid,i){
  const x=(CG_SIM[gid]||[])[i]; if(!x)return;
  const mes=_keyDeIdx(_cgSimIdx(gid)), m=x.nombre?DATA.members.find(mm=>_normNom(mm.name)===_normNom(x.nombre)):null;
  SOL_PREFILL={simGid:gid,simRef:x}; TAB="ayudas"; FICHA_ID=null; SOL_FORM=true; render(); // v45.39
  setTimeout(()=>{ const sm=document.getElementById("so-mid"); if(!sm)return;
    if(m){ sm.value=m.id; soMidCambio(); } else { const n=document.getElementById("so-nom"); if(n)n.value=x.nombre||""; }
    const gr=document.getElementById("so-grupo"); if(gr)gr.value=gid;
    const c=document.getElementById("so-cap"); if(c)c.value=x.v; solPreview();
    const ms=document.getElementById("so-mes"); if(ms)ms.value=mes;
    const h=document.getElementById("so-mid"); if(h)h.scrollIntoView({behavior:"smooth",block:"start"});
    const f=document.getElementById(x.nombre?"so-n":"so-nom"); if(f)setTimeout(()=>f.focus(),350); },40);
}
// v45.16: desde Cierre se va a Solicitudes (una sola puerta para las ayudas nuevas)
function irSolicitudes(){ TAB="ayudas"; FICHA_ID=null; render(); window.scrollTo(0,0); } // v45.39: Solicitudes en la pestaña «Ayudas»
function solEstado(id,estado){ const so=_sols().find(x=>x.id===id); if(!so)return; so.estado=estado; if(estado==="pendiente"){delete so.lid;delete so.mesOtorgada;} delete DESP["solno-"+id]; save(); render(); }
function solBorrar(id){ DATA.solicitudes=_sols().filter(x=>x.id!==id); delete DESP["solbor-"+id]; save(); render(); }
// v45.23: «💰 Dinero del mes» — la MISMA cuenta en Asociados y en Solicitudes. Fase de crecimiento:
// lo que entra cada mes se usa en las ayudas del mes; no se arrastra nada al mes siguiente.
function dineroMesCuerpoHTML(d){
  const rm=DATA.reportMonth, ry=DATA.reportYear, idx=_idxMes(rm,ry);
  const fila=(signo,l,v,o={})=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6px 0;${o.total?"border-top:1.5px solid var(--border);margin-top:2px;":"border-bottom:1px solid #EFEAE0;"}">
      <span style="font-size:${o.total?14.5:14}px;color:var(--dark);${o.total?"font-weight:800":""}"><b style="display:inline-block;width:16px;color:var(--muted)">${signo}</b>${l}</span>
      <b style="font-size:${o.total?19:15}px;white-space:nowrap;${o.color?"color:"+o.color:""}">${fmtEur(v)} €</b></div>`;
  const ayN=[]; DATA.members.forEach(m=>[...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{ if(l.gMonth===rm&&l.gYear===ry)ayN.push({n:m.name,c:l.capital}); }));
  const porPagarL=salidasPrevistas(rm,ry).lista.filter(x=>x.clase==="comp"&&x.pagoIdx<=idx);
  const otras=_r2(d.salido-d.ayudasDadas-(d.gastos||0)), abA=!!DESP["dm-ay"], abS=!!DESP["dm-sal"];
  const lista=(arr)=>`<div style="margin:0 0 6px 16px;font-size:12.5px;color:var(--muted)">${arr.map(x=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0"><span>${x[0]}</span><span>${x[1]}</span></div>`).join("")}</div>`;
  let h=fila("","Cobrado hasta hoy",d.cobrado,{color:"#2D6A4F"});
  if(d.ayudasDadas){ h+=`<div style="cursor:pointer" onclick="DESP['dm-ay']=!DESP['dm-ay'];render()">${fila("−",`Ayudas entregadas (${ayN.length}) <span style="font-size:11.5px;color:var(--muted)">${abA?"▲":"▼"}</span>`,d.ayudasDadas)}</div>`;
    if(abA)h+=lista(ayN.map(x=>[escH(x.n),fmtEur(x.c)+" €"])); }
  if(d.gastos)h+=fila("−","Gastos administrativos",d.gastos);
  if(otras>0)h+=fila("−","Otras salidas ya pagadas",otras);
  if(d.salido)h+=fila("=","En caja hoy",d.enCaja,{total:true,color:d.enCaja>=0?"#1B4332":"#C0492C"});
  if(d.porPagar){ h+=`<div style="cursor:pointer" onclick="DESP['dm-sal']=!DESP['dm-sal'];render()">${fila("−",`Salidas por pagar este mes (${porPagarL.length}) <span style="font-size:11.5px;color:var(--muted)">${abS?"▲":"▼"}</span>`,d.porPagar)}</div>`;
    if(abS)h+=lista(porPagarL.map(x=>[`${escH(x.m.name)} · ${escH(x.txt.toLowerCase())}`,fmtEur(x.importe)+" €"])); }
  h+=fila("=","Disponible para ayudas",d.disponible,{total:true,color:d.disponible>=0?"#1B4332":"#C0492C"});
  if(d.porCobrar>0)h+=`<div style="margin-top:8px;padding:9px 11px;border-radius:10px;background:var(--bg);font-size:13px;color:var(--dark);line-height:1.45">
      Falta por cobrar <b>${fmtEur(d.porCobrar)} €</b>. Si se cobra todo, al cerrar el mes quedarán <b style="color:${d.alCierre>=0?"#1B4332":"#C0492C"}">${fmtEur(d.alCierre)} €</b>.</div>`;
  else h+=`<div style="margin-top:8px;font-size:12.5px;color:#1B7A3D;font-weight:700">✓ Ya está todo cobrado este mes.</div>`;
  if(d.alCierre<0)h+=`<div style="margin-top:6px;padding:9px 11px;border-radius:10px;background:#FFF4E5;border:1px solid #E0A040;color:#8A4F12;font-size:12.5px;font-weight:700;line-height:1.4">⚠️ Aunque se cobre todo, este mes faltan ${fmtEur(-d.alCierre)} €.</div>`;
  return h;
}
function origenCobradoHTML(d){
  const ab=!!DESP["ay-origen"];
  let h=`<button onclick="DESP['ay-origen']=!DESP['ay-origen'];render()" style="background:none;border:none;color:#2D6A4F;font-size:13px;font-weight:700;cursor:pointer;padding:8px 0 0">${ab?"▾":"▸"} ¿De dónde viene lo cobrado?</button>`;
  if(ab){
    h+=`<div style="margin-top:6px">`;
    d.grupos.forEach(x=>{ const ok=x.cobrado>=x.total&&x.total>0; h+=`<div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:5px 0;border-bottom:1px solid #EFEAE0"><span>Grupo de ${escH(x.p.name.split(" ")[0])}</span><span style="white-space:nowrap"><b style="color:${ok?"#2D6A4F":"var(--dark)"}">${fmtEur(x.cobrado)} €</b> <span style="color:var(--muted);font-size:12px">de ${fmtEur(x.total)} €</span></span></div>`; });
    h+=`<div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:5px 0;border-bottom:1px solid #EFEAE0"><span>Resto (sin grupo)</span><span style="white-space:nowrap"><b style="color:#2D6A4F">${fmtEur(d.resto.cobrado)} €</b> <span style="color:var(--muted);font-size:12px">de ${fmtEur(d.resto.total)} €</span></span></div>`;
    if(d.puntIn)h+=`<div style="display:flex;justify-content:space-between;font-size:13.5px;padding:5px 0"><span>Aportes temporales</span><b style="color:#2D6A4F">${fmtEur(d.puntIn)} €</b></div>`;
    h+=`</div>`;
  }
  return h;
}
function ayudasTabHTML(){
  const rm=DATA.reportMonth, ry=DATA.reportYear, key=getMesKey(rm,ry), mesTxt=MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase();
  const pendT=_solsR().filter(x=>x.estado==="pendiente"), pend=_solOrdenar(pendT.filter(_solEsAhora)), fut=pendT.filter(x=>!_solEsAhora(x)), otor=_solsR().filter(x=>x.estado==="otorgada"&&x.mesOtorgada===key), noOt=_solsR().filter(x=>x.estado==="no");
  const d=dineroAyudasMes(), pedido=_r2(pend.reduce((a,x)=>a+x.capital,0)), dif=_r2(d.disponible-pedido);
  const fila=(l,v,st)=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px 0;font-size:14px"><span>${l}</span><b style="white-space:nowrap;${st||""}">${v}</b></div>`;
  let h=`<div class="mes-card"><div class="mes-title" style="margin-bottom:8px">💰 Dinero del mes · ${mesTxt}</div>
    ${dineroMesCuerpoHTML(d)}
    ${pend.length?`${fila("Te han pedido en total",fmtEur(pedido)+" €")}
    <div style="margin-top:6px;padding:9px 11px;border-radius:10px;font-size:14px;font-weight:800;background:${dif>=0?"#E3F1E7":"#FFF4E5"};color:${dif>=0?"#1B7A3D":"#8A4F12"}">${dif>=0?"✅ Te alcanza para todas":`Te faltan ${fmtEur(-dif)} € para darlas todas`}</div>`:""}`;
  h+=origenCobradoHTML(d); // v45.23
  h+=`</div>`;
  // Solicitudes
  h+=`<div class="mes-card"><div class="mes-title" style="margin-bottom:6px">📝 Solicitudes de ayuda ${pend.length?`<span style="font-size:12px;font-weight:800;padding:3px 9px;border-radius:20px;background:#FFF4E5;color:#8A4F12;vertical-align:middle">${pend.length} pendiente${pend.length>1?"s":""}</span>`:""}</div>`;
  if(!pend.length&&!SOL_FORM)h+=`<div style="color:var(--muted);font-size:13px;padding:6px 0">No hay solicitudes pendientes para ${mesTxt}.</div>`;
  const repA=_solReparto(pend,d.disponible); // v45.17: el dinero de la asociación, en orden de preferencia
  pend.forEach((so,i)=>{
    const m=so.mid&&DATA.members.find(x=>x.id===so.mid), {cuotas}=ayudaCuotas(so.capital,so.cuotas,DATA.rate);
    const kno="solno-"+so.id, armNo=!!DESP[kno];
    if(_solTipo(so)===1&&(i===0||_solTipo(pend[i-1])===0))h+=`<div style="font-size:12.5px;font-weight:800;color:#B06A1E;margin-top:12px">🤝 Terceros <span style="font-weight:600;color:var(--muted)">· después de los asociados</span></div>`;
    h+=`<div style="display:flex;gap:10px;align-items:flex-start;border:1px solid var(--border);border-radius:12px;padding:10px;margin-top:8px;background:#fff">
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center"><span style="width:26px;height:26px;border-radius:50%;background:#1B4332;color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center">${i+1}</span>${_solFlechas(so,pend.filter(x=>_solTipo(x)===_solTipo(so)))}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:15px">${escH(so.nombre)}</b><b style="font-size:15.5px;color:#B06A1E;white-space:nowrap">${fmtEur(so.capital)} €</b></div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${_solEtqTipo(so,m)} · ${escH(so.fecha||"")} · ${so.cuotas} ${so.cuotas===1?"cuota":"cuotas"} de ${fmtEur(cuotas[0])} €</div>
        ${(()=>{ const av=so.avalId&&DATA.members.find(x=>x.id===so.avalId), gg=so.grupoGid&&gruposCierre().find(x=>x.id===so.grupoGid), gp=gg&&DATA.members.find(x=>x.id===gg.principalId);
          return (av||gp)?`<div style="font-size:12px;color:#1B4332;margin-top:2px">${av?`🛡️ Aval: ${escH(av.name.split(" ")[0])}`:""}${av&&gp?" · ":""}${gp?`👥 Grupo de ${escH(gp.name.split(" ")[0])}`:""}</div>`:""; })()}
        <div style="font-size:12.5px;margin-top:4px">${_solAlcanzaHTML(repA[so.id])}</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button onclick="solOtorgar('${so.id}')" style="flex:2;padding:9px;border-radius:9px;border:none;background:#1B4332;color:#fff;font-size:13px;font-weight:800;cursor:pointer">✅ Otorgar</button>
          <button onclick="${armNo?`solEstado('${so.id}','no')`:`DESP['${kno}']=true;render()`}" style="flex:1;padding:9px;border-radius:9px;border:1px solid #E8C9BE;background:${armNo?"#C0492C":"#fff"};color:${armNo?"#fff":"#C0492C"};font-size:12.5px;font-weight:800;cursor:pointer">${armNo?"¿Seguro?":"No otorgar"}</button>
        </div></div></div>`;
  });
  // v45.17: solicitudes para meses siguientes (se ven, pero se otorgan en el cierre de su mes)
  [...new Set(fut.map(_solMesIdx))].sort((a,b)=>a-b).forEach(mi=>{
    const lista=_solOrdenar(fut.filter(x=>_solMesIdx(x)===mi)), mt=_txtIdx(mi).split(" ")[0], tot=_r2(lista.reduce((a,x)=>a+x.capital,0));
    const pv=previstoMes(mi), repF=_solReparto(lista,pv.prev), dfF=_r2(pv.prev-tot);
    const fl=(l,v,st)=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:2px 0"><span>${l}</span><b style="white-space:nowrap;${st||""}">${v}</b></div>`;
    h+=`<div style="margin-top:14px;padding-top:10px;border-top:1.5px dashed #D5E3D9"><b style="font-size:14.5px;color:#1B4332">🗓️ Para ${mt}</b>
      <div style="background:#F4F9F6;border-radius:10px;padding:8px 10px;margin-top:6px">
      ${fl(`Aportes y cuotas de ${mt} (previsto)`,fmtEur(pv.ent)+" €","color:#2D6A4F")}
      ${pv.sal?fl("Salidas comprometidas","−"+fmtEur(pv.sal)+" €"):""}
      ${fl("<b>Previsto para ayudas</b>",fmtEur(pv.prev)+" €","color:#1B4332")}
      ${fl("Te han pedido",fmtEur(tot)+" €","color:#B06A1E")}
      <div style="margin-top:4px;font-size:13px;font-weight:800;color:${dfF>=0?"#1B7A3D":"#8A4F12"}">${dfF>=0?"✅ Alcanzaría para todas":`Faltarían ${fmtEur(-dfF)} € para darlas todas`}</div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:2px">Es una previsión: en ${mt} se calcula con lo cobrado de verdad.</div></div></div>`;
    lista.forEach((so,i)=>{
      if(_solTipo(so)===1&&(i===0||_solTipo(lista[i-1])===0))h+=`<div style="font-size:12.5px;font-weight:800;color:#B06A1E;margin-top:10px">🤝 Terceros <span style="font-weight:600;color:var(--muted)">· después de los asociados</span></div>`;
      const m=so.mid&&DATA.members.find(x=>x.id===so.mid), {cuotas}=ayudaCuotas(so.capital,so.cuotas,DATA.rate), kno="solno-"+so.id, armNo=!!DESP[kno];
      const av=so.avalId&&DATA.members.find(x=>x.id===so.avalId), gg=so.grupoGid&&gruposCierre().find(x=>x.id===so.grupoGid), gp=gg&&DATA.members.find(x=>x.id===gg.principalId);
      h+=`<div style="display:flex;gap:10px;align-items:flex-start;border:1px dashed #C9D9CE;border-radius:12px;padding:10px;margin-top:8px;background:#FBFDFB">
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center"><span style="width:26px;height:26px;border-radius:50%;background:#7FA48D;color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center">${i+1}</span>${_solFlechas(so,lista.filter(x=>_solTipo(x)===_solTipo(so)))}</div>
        <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:15px">${escH(so.nombre)}</b><b style="font-size:15.5px;color:#B06A1E;white-space:nowrap">${fmtEur(so.capital)} €</b></div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${_solEtqTipo(so,m)} · ${escH(so.fecha||"")} · ${so.cuotas} ${so.cuotas===1?"cuota":"cuotas"} de ${fmtEur(cuotas[0])} €</div>
        ${(av||gp)?`<div style="font-size:12px;color:#1B4332;margin-top:2px">${av?`🛡️ Aval: ${escH(av.name.split(" ")[0])}`:""}${av&&gp?" · ":""}${gp?`👥 Grupo de ${escH(gp.name.split(" ")[0])}`:""}</div>`:""}
        <div style="font-size:12.5px;margin-top:4px">${_solAlcanzaHTML(repF[so.id])}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:8px">
          <span style="flex:2;font-size:12.5px;color:#1B4332;font-weight:700">Se otorga en el cierre de ${mt}</span>
          <button onclick="${armNo?`solEstado('${so.id}','no')`:`DESP['${kno}']=true;render()`}" style="flex:1;padding:8px;border-radius:9px;border:1px solid #E8C9BE;background:${armNo?"#C0492C":"#fff"};color:${armNo?"#fff":"#C0492C"};font-size:12.5px;font-weight:800;cursor:pointer">${armNo?"¿Seguro?":"No otorgar"}</button></div></div></div>`;
    });
  });
  if(SOL_FORM){
    const asoc=DATA.members.filter(m=>m.type==="asociado"&&activoEnReporte(m)).sort((a,b)=>a.name.localeCompare(b.name)), terc=DATA.members.filter(m=>m.type==="tercero"&&activoEnReporte(m)).sort((a,b)=>a.name.localeCompare(b.name));
    h+=`<div style="border:1.5px solid #2D6A4F;border-radius:12px;padding:12px;margin-top:10px;background:#F4F9F6">
      <div style="font-size:15px;font-weight:800;color:#1B4332;margin-bottom:6px">Nueva solicitud</div>
      <label class="m-label">¿Quién la pide?</label>
      <select id="so-mid" class="m-select" style="font-size:15px" onchange="soMidCambio()"><option value="">— Elegir —</option>
        <optgroup label="Asociados">${asoc.map(m=>`<option value="${esc(m.id)}">${escH(m.name)}</option>`).join("")}</optgroup>
        <optgroup label="Terceros">${terc.map(m=>`<option value="${esc(m.id)}">${escH(m.name)}</option>`).join("")}</optgroup></select>
      <div id="so-nom-wrap"><div style="font-size:12px;color:var(--muted);margin:2px 0 6px">o, si aún no está en la app:</div>
      <input id="so-nom" type="text" class="m-input" placeholder="Nombre y apellidos" style="font-size:16px">
      <label class="m-label">¿Cómo entra?</label>
      <select id="so-tipo" class="m-select" style="font-size:15px"><option value="">— Elegir —</option><option value="asociado">Como asociado</option><option value="tercero">Como tercero con aval</option></select></div>
      <label class="m-label">¿Quién la avala?</label>
      <select id="so-aval" class="m-select" style="font-size:15px" onchange="soAvalCambio()"><option value="">— Sin aval / fundador —</option>${asoc.map(m=>`<option value="${esc(m.id)}">${escH(m.name)}</option>`).join("")}</select>
      <label class="m-label">¿En qué grupo va?</label>
      <select id="so-grupo" class="m-select" style="font-size:15px"><option value="">— Sin grupo —</option>${gruposCierre().map(g=>{const p=DATA.members.find(m=>m.id===g.principalId);return p?`<option value="${esc(g.id)}">Grupo de ${escH(p.name)}</option>`:"";}).join("")}</select>
      <label class="m-label">¿Cuánto pide? (€)</label>
      <input id="so-cap" type="number" inputmode="decimal" class="m-input" placeholder="Ej: 500" style="font-size:16px" oninput="solPreview()">
      <label class="m-label">¿En cuántas cuotas?</label>
      <select id="so-n" class="m-select" style="font-size:15px" onchange="solPreview()">${Array.from({length:12},(_,i)=>i+1).map(n=>`<option value="${n}"${n===5?" selected":""}>${n}</option>`).join("")}</select>
      <label class="m-label">¿Para qué mes? <span style="font-weight:600;color:var(--muted)">(se otorga en el cierre de ese mes)</span></label>
      <select id="so-mes" class="m-select" style="font-size:15px">${_mesesSolOpts(getMesKey(DATA.reportMonth,DATA.reportYear))}</select>
      <div id="so-prev"></div>
      <div style="display:flex;gap:6px"><button onclick="SOL_FORM=false;SOL_PREFILL=null;render()" style="flex:1;padding:11px;border-radius:9px;border:1.5px solid #D9C9B0;background:#fff;color:#8A7A60;font-size:14px;font-weight:700;cursor:pointer">Cancelar</button>
      <button onclick="solGuardar()" style="flex:2;padding:11px;border-radius:9px;border:1.5px solid #1B4332;background:#fff;color:#1B4332;font-size:14px;font-weight:800;cursor:pointer">Guardar en la lista</button></div>
      <button onclick="solGuardar(true)" style="width:100%;margin-top:8px;min-height:48px;padding:11px;border-radius:9px;border:none;background:#1B4332;color:#fff;font-size:15px;font-weight:800;cursor:pointer">✅ Guardar y otorgar ya</button>
      <div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.4">Se otorga en el momento si es para este mes, no hay otras solicitudes delante y el dinero alcanza. Si no, queda en la lista.</div></div>`; // v45.45
  } else h+=`<button onclick="SOL_FORM=true;render()" style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1.5px dashed #2D6A4F;background:#fff;color:#1B4332;font-size:14px;font-weight:800;cursor:pointer">＋ Nueva solicitud</button>`;
  // Otorgadas este mes y no otorgadas
  const desp=(k,t,lista,fn)=>{ if(!lista.length)return ""; const o=!!DESP[k]; let x=`<button onclick="DESP['${k}']=!DESP['${k}'];render()" style="display:block;background:none;border:none;color:#2D6A4F;font-size:13.5px;font-weight:700;cursor:pointer;padding:10px 0 0">${o?"▾":"▸"} ${t} (${lista.length})</button>`; if(o)x+=lista.map(fn).join(""); return x; };
  h+=desp("ay-otor",`Otorgadas en ${mesTxt}`,otor,so=>{ const gp=so.entregaGid&&gruposCierre().find(g=>g.id===so.entregaGid), pp=gp&&DATA.members.find(m=>m.id===gp.principalId);
    return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:6px 0;border-bottom:1px solid #EFEAE0"><span>✅ ${escH(so.nombre)} <span style="color:var(--muted);font-size:12px">· ${so.cuotasOtorgadas||so.cuotas} cuotas${pp?` · la entrega ${escH(pp.name.split(" ")[0])}`:""}</span></span><b style="white-space:nowrap">${fmtEur(so.capitalOtorgado||so.capital)} €</b></div>`; });
  h+=desp("ay-no","No otorgadas",noOt,so=>{ const kb="solbor-"+so.id, arm=!!DESP[kb];
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13.5px;padding:6px 0;border-bottom:1px solid #EFEAE0"><span>${escH(so.nombre)} · ${fmtEur(so.capital)} €</span><span style="white-space:nowrap">
      <button onclick="solEstado('${so.id}','pendiente')" style="border:1px solid #2D6A4F;background:#fff;color:#1B4332;border-radius:8px;font-size:12px;font-weight:700;padding:5px 8px;cursor:pointer">Volver a la lista</button>
      <button onclick="${arm?`solBorrar('${so.id}')`:`DESP['${kb}']=true;render()`}" style="border:none;background:${arm?"#C0492C":"none"};color:${arm?"#fff":"#C0492C"};border-radius:7px;font-size:${arm?12:15}px;font-weight:800;padding:${arm?"4px 8px":"0 4px"};cursor:pointer">${arm?"¿Borrar?":"✕"}</button></span></div>`; });
  return h+`</div>`;
}
function cuotaToque(mid,lid,pi){
  if(_mesBloqueado(_mesDeCuota(mid,lid,pi)))return; // v45.46: mes cerrado
  const m=DATA.members.find(x=>x.id===mid), l=m&&[...(m.loans||[]),...(m.closedLoans||[])].find(x=>x.id===lid); if(!l||!l.pays[pi])return;
  const key=mid+"|"+lid+"|"+pi;
  if(!l.pays[pi].paid&&_cuotaArmada!==key){
    _cuotaArmada=key; render();
    toast(`Toca otra vez la cuota para marcarla pagada: ${fmtEur(cuotaDe(l,pi))} € de ${m.name.split(" ")[0]}`,4000);
    setTimeout(()=>{if(_cuotaArmada===key){_cuotaArmada=null;render();}},4000);
    return;
  }
  _cuotaArmada=null; togglePay(mid,lid,pi);
}
function delLoan(mid,lid){
  // Sin confirm() (se bloquea en móvil). Primer toque arma, segundo elimina.
  const key=mid+"|"+lid;
  if(_delLoanArmed!==key){
    _delLoanArmed=key;
    render();
    toast("Toca de nuevo ✕ para confirmar");
    setTimeout(()=>{if(_delLoanArmed===key){_delLoanArmed=null;render();}},4000);
    return;
  }
  _delLoanArmed=null;
  DATA.members.forEach(m=>{if(m.id===mid){
    m.loans=m.loans.filter(l=>l.id!==lid);
    // Eliminar la entrada de historial vinculada a este apoyo (si la tiene)
    if(Array.isArray(m.history))m.history=m.history.filter(h=>h.lid!==lid);
  }});
  save();toast("Ayuda eliminada ✓");render();
}
function _limAyudaTxt(c){ return c===12?"hasta "+REGLAS.AYUDA_MAX_CORTA+" € · "+REGLAS.CUOTAS_MAX_CORTA+" cuotas":"hasta "+_miles(SIM_MAX_AYUDA)+" € · "+REGLAS.CUOTAS_MAX+" cuotas"; }
function _permCorta(c){ return c===0?"Indefinida":c+" meses"; }
function simMensajeDatos(m){
  const cap=SIM.cap, n=SIM.n, cur=(m.ciclo!=null?m.ciclo:12), need=_simPermNecesaria(m,cap,n);
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), ini=rep+1, jIdx=m.joinMonth?_idxMes(m.joinMonth,m.joinYear):null;
  const {cuotas}=ayudaCuotas(cap,n,DATA.rate);
  const finDe=c=>(c===0||jIdx==null)?null:jIdx+c-1;
  const extras=[];
  if(need!=null&&need!==cur){
    if(cur===12)extras.push(`Ayudas de hasta ${_miles(SIM_MAX_AYUDA)} € en hasta ${REGLAS.CUOTAS_MAX} cuotas`);
    if(jIdx!=null){ const mN=Object.assign({},m,{ciclo:need}), hasta=jIdx+(need===0?37:need);
      [[12,10],[15,12]].forEach(([lv,antes])=>{ for(let i=Math.max(rep+1,jIdx+1);i<=hasta;i++){ const k=_keyDeIdx(i);
        if(tarifaNivelMes(mN,k)===lv&&tarifaNivelMes(m,k)<lv){ extras.push(`Tu beneficio sube: desde ${_txtIdx(i-1)}, cada 50 € que aportas gana <b>${lv} €</b> en vez de ${antes} €`); break; } } }); }
  }
  return {cap,n,cur,need,rep,ini,cuotas,finCur:finDe(cur),finNeed:need==null?null:finDe(need),extras};
}
function _simTarjetaHTML(m,d){
  const nom=escH(m.name.split(" ")[0]), amplia=d.need!=null&&d.need!==d.cur;
  const ult=d.ini+d.n-1; // v45.28: una sola cifra de cuota (la mayor) para no confundir
  const cuotaTxt=d.n===1?`<b>1 cuota de ${_eurM(d.cuotas[0])} €</b> (${_txtIdx(d.ini)})`
    :`<b>${d.n} cuotas de ${_eurM(Math.max(...d.cuotas))} €</b> (${_txtIdx(d.ini)} – ${_txtIdx(ult)})`;
  const fin=amplia?d.finNeed:d.finCur, perm=(amplia?d.need:d.cur);
  const st="font-size:13px;line-height:1.5;margin:3px 0;color:#1f2a24";
  const box=(hoy)=>{ const c=hoy?d.cur:d.need, f=hoy?d.finCur:d.finNeed;
    return `<div style="flex:1;border-radius:10px;padding:9px 6px;text-align:center;${hoy?"background:#F4F2EE;color:#6b6f6c;border:1.5px dashed #C9C4BA":"background:#1B4332;color:#fff;box-shadow:0 2px 6px rgba(27,67,50,.35)"}">
      <div style="font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;${hoy?"":"color:#BFE3CC"}">${hoy?"Tu permanencia hoy":"La que necesitas"}</div>
      <div style="font-size:16px;font-weight:800;margin:3px 0">${_permCorta(c)}</div>
      <div style="font-size:11px">${_limAyudaTxt(c)}</div>
      ${f!=null?`<div style="font-size:10.5px;opacity:.85">termina en ${_txtIdx(f)}</div>`:""}
      <div style="display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border-radius:20px;margin-top:6px;${hoy?"background:#FBE3DC;color:#B04A2C":"background:#2D8A5A;color:#fff"}">${hoy?"✗ "+_eurM(d.cap)+" € no caben":"✓ tus "+_eurM(d.cap)+" € caben"}</div></div>`; };
  return `<div style="width:380px;background:#fff;border-radius:14px;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="background:#1B4332;color:#fff;padding:13px 15px"><div style="font-size:18px;font-weight:800">${amplia?`Tu ayuda de ${_eurM(d.cap)} € se puede aprobar ✅`:`Tu ayuda de ${_eurM(d.cap)} €`}</div>
      <div style="font-size:12px;opacity:.85;margin-top:2px">${amplia?`Solo falta un paso: ampliar tu permanencia ${d.cur!==0?"de "+d.cur+" ":""}a ${d.need===0?"indefinida":d.need+" meses"}`:`${nom}, así quedaría`}</div></div>
    ${amplia?`<div style="padding:11px 13px;border-bottom:1px solid #EEE9DF"><div style="font-size:12.5px;font-weight:800;color:#1B4332;margin-bottom:8px">Lo que puedes pedir con tu permanencia actual</div>
      <div style="display:flex;align-items:stretch;gap:4px">${box(true)}<div style="display:flex;align-items:center;font-size:20px;font-weight:900;color:#2D8A5A">→</div>${box(false)}</div></div>`:""}
    <div style="padding:11px 13px;border-bottom:${d.extras.length?"1px solid #EEE9DF":"none"}"><div style="font-size:12.5px;font-weight:800;color:#1B4332;margin-bottom:6px">Así quedaría tu ayuda</div>
      <div style="${st}">💶 Recibes: <b>${_eurM(d.cap)} €</b> en ${_txtIdx(d.rep)}</div>
      <div style="${st}">📅 Devuelves: ${cuotaTxt}</div>
      <div style="${st}">⏳ ${perm===0?"Tu permanencia es <b>indefinida</b>":`Tu permanencia termina en <b>${_txtIdx(fin)}</b>`}</div></div>
    ${d.extras.length?`<div style="padding:11px 13px;background:#FFFBEF"><div style="font-size:12.5px;font-weight:800;color:#7A5300;margin-bottom:6px">Y además, con ${d.need===0?"permanencia indefinida":d.need+" meses"}</div>
      ${d.extras.map(x=>`<div style="${st}">⭐ ${x}</div>`).join("")}</div>`:""}
  </div>`;
}
function _simTextoWA(m,d){
  const nom=m.name.split(" ")[0], amplia=d.need!=null&&d.need!==d.cur;
  return `Hola ${nom} 👋\nTe envío cómo quedaría tu ayuda de *${_eurM(d.cap)} €*.`+
    (amplia?` Si te parece bien, respóndeme «Sí, amplío a ${d.need===0?"indefinida":d.need+" meses"}» y lo dejamos listo.`:"")+`\nNuevos Horizontes`;
}
async function simEnviarWA(){
  const m=DATA.members.find(x=>x.id===(MODAL&&MODAL.mid)); if(!m||!SIM)return;
  const d=simMensajeDatos(m); if(d.need==null){ toast("⛔ Esta ayuda no cabe con ninguna permanencia",3500); return; }
  _compartirImagenWA(m,_simTarjetaHTML(m,d),_simTextoWA(m,d),`Ayuda_${m.name.split(" ")[0]}.png`);
}
// v45.31: imagen (con los iconos de la app) + texto corto por WhatsApp. Sin imagen posible, solo el texto.
async function _compartirImagenWA(m,html,txt,archivo){
  const loaded=await loadPDFLibs();
  const abrirTexto=()=>{ const t=_telWA(m.phone||""); window.open("https://wa.me/"+(t||"")+"?text="+encodeURIComponent(txt),"_blank"); };
  if(!loaded||typeof html2canvas==="undefined"){ toast("No se pudo crear la imagen: se envía solo el texto",3500); abrirTexto(); return; }
  const wrap=document.createElement("div"); wrap.style.cssText="position:fixed;left:-9999px;top:0;width:380px;background:#ECE5DD;padding:0";
  wrap.innerHTML=html; document.body.appendChild(wrap);
  try{ if(typeof iconizar==="function")iconizar(wrap); }catch(e){}
  _icFix(wrap); toast("📸 Preparando la imagen...",3000);
  try{
    const canvas=await html2canvas(wrap.firstElementChild,{backgroundColor:"#ffffff",scale:2.5,useCORS:true,logging:false,width:380,windowWidth:400});
    if(document.body.contains(wrap))document.body.removeChild(wrap);
    canvas.toBlob(async blob=>{
      if(!blob){ abrirTexto(); return; }
      const file=new File([blob],archivo,{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        try{ await navigator.share({files:[file],text:txt}); toast("Enviado ✓"); }
        catch(e){ if(e.name!=="AbortError"){ abrirTexto(); } }
      } else { const url=URL.createObjectURL(blob),a=document.createElement("a"); a.href=url; a.download=file.name; a.click(); URL.revokeObjectURL(url);
        toast("📸 Imagen descargada: adjúntala en el chat que se abre",4500); abrirTexto(); }
    },"image/png");
  }catch(e){ if(document.body.contains(wrap))document.body.removeChild(wrap); console.error(e); abrirTexto(); }
}
// Desde una ayuda bloqueada por la permanencia: abre el simulador con su importe y sus cuotas
function avisarDesdeAyuda(mid,cap,nn){
  const m=DATA.members.find(x=>x.id===mid); if(!m)return;
  const g=id=>(document.getElementById(id)||{}).value;
  const volver={sol:MODAL&&MODAL.sol||null,restore:{mid:g("cl-mid"),cap:g("cl-cap"),n:g("cl-n"),ent:g("cl-entrega")}};
  SIM={mid,tab:"ayuda",ciclo:(m.ciclo!=null?m.ciclo:12),cap,n:nn,ap:50};
  openModal('sim',{mid,volver});
}
function _avisoApoyoHTML(v){
  if(v.bloqueo)return `<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#FDF0EE;border:1.5px solid #C0492C;color:#7A2418;font-size:13px;line-height:1.45">⛔ ${v.bloqueo}</div>`;
  if(v.aviso)return `<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#FFF8F0;border:1px solid #F5D5B0;color:#7A4A1E;font-size:13px;line-height:1.45">⚠️ ${v.aviso}</div>`;
  return "";
}
function botonAmpliarAyudaHTML(m,cap,nn,ini){
  const c=permNecesariaApoyo(m,cap,nn,ini); if(c==null)return "";
  return `<button onclick="ampliarDesdeAyuda('${esc(m.id)}',${c})" style="width:100%;margin-top:8px;padding:11px;border-radius:10px;border:1.5px solid #2D6A4F;background:#2D6A4F;color:#fff;font-size:14px;font-weight:800;cursor:pointer">🔁 Ampliar su permanencia a ${c===0?"indefinida":c+" meses"}</button>
    ${cap<=SIM_MAX_AYUDA&&nn<=12?`<button onclick="avisarDesdeAyuda('${esc(m.id)}',${cap},${nn})" style="width:100%;margin-top:6px;padding:10px;border-radius:10px;border:1.5px solid #25D366;background:#fff;color:#128C4A;font-size:13.5px;font-weight:800;cursor:pointer">📲 Avisar por WhatsApp</button>`:""}
    <div style="font-size:12px;color:var(--muted);margin:4px 0 10px;line-height:1.4">«Ampliar» abre la ventana de su permanencia; «Avisar» abre el simulador con esta ayuda para enviársela. En los dos casos vuelves aquí con la ayuda tal como está.</div>`;
}
function ampliarDesdeAyuda(mid,c){
  const g=id=>(document.getElementById(id)||{}).value;
  const volver={sol:MODAL&&MODAL.sol||null,restore:{mid:g("cl-mid"),cap:g("cl-cap"),n:g("cl-n"),ent:g("cl-entrega")}};
  openModal('ciclo',{mid,preCiclo:c,volver});
}
function volverAAyuda(v){ openModal('cierreloan',{sol:v.sol,restore:v.restore}); setTimeout(updateCierreLoanPreview,30); }
function addLoanSubmit(){
  const cap=parseInt(document.getElementById("l-cap").value)||0;if(cap<=0)return;
  const nn=parseInt(document.getElementById("l-n")?.value||"3");
  { const mV=DATA.members.find(x=>x.id===MODAL.mid), c=_condicionActual(mV),
      v=validarApoyo(mV,cap,nn,c.tipo,c.ciclo,{m:document.getElementById("l-sm").value,y:parseInt(document.getElementById("l-sy").value)});
    if(v.bloqueo){ const pv=document.getElementById("l-preview"); if(pv)updateLoanPreview(); toast("⛔ No se puede guardar: revisa el aviso",4000); return; } }
  let rate=parseFloat(document.getElementById("l-rate")?.value);
  if(isNaN(rate)||rate<0)rate=DATA.rate; // fallback a la tasa global del fondo
  const gm=document.getElementById("l-gm").value,gy=parseInt(document.getElementById("l-gy").value);
  const sm=document.getElementById("l-sm").value,sy=parseInt(document.getElementById("l-sy").value);
  const{total,cuotas}=ayudaCuotas(cap,nn,rate);
  const inst=cuotas[0]; // referencia visual (importe de la 1ª cuota); el cálculo real usa l.cuotas
  const pays=[];let mi=MONTHS.indexOf(sm),yr=sy;
  for(let i=0;i<nn;i++){pays.push({m:MONTHS[mi],y:yr,paid:false});mi++;if(mi>=12){mi=0;yr++;}}
  const mOr=DATA.members.find(x=>x.id===MODAL.mid);
  // Condición histórica de la ayuda en el momento de concederla (no se migra a las antiguas).
  const tipoEnConcesion=mOr?mOr.type:"asociado";
  const avalistaEnConcesion=(mOr&&mOr.type==="tercero")?avalistaNombre(mOr):null; // nombre resuelto desde el id, texto congelado
  const cicloEnConcesion=mOr&&mOr.ciclo!=null?mOr.ciclo:null; // v45: sin inventar (antes 0 = indefinida)
  DATA.members.forEach(m=>{if(m.id===MODAL.mid){const lid="l"+Date.now();m.loans.push({id:lid,gMonth:gm,gYear:gy,capital:cap,total,n:nn,inst,cuotas,rate,pays,tipoEnConcesion,avalistaEnConcesion,cicloEnConcesion});if(!m.history)m.history=[];m.history.push({gMonth:gm,gYear:gy,capital:cap,lid});}});
  closeModal();toast("Ayuda añadida ✓");save();
}

// ── EDITAR AYUDA: capital, plazo y meses ──
function histLoanFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  if(!m)return `<div class="modal-title">Historial</div><p>Asociado no encontrado.</p>`;
  const hist=m.history||[];
  const total=hist.reduce((s,x)=>s+(x.capital||0),0);
  let filas=hist.map((x,i)=>{
    const armed=(_delHistArmed===(m.id+"|"+i));
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
      <div><div style="font-weight:600;font-size:14px;color:var(--dark)">${escH(x.gMonth||"?")} ${x.gYear||""}</div><div style="font-size:12px;color:var(--muted)">${fmtEur(x.capital||0)} € de capital${x.lid?"":' · <span style="color:#C0492C">sin vincular</span>'}</div></div>
      <button class="del-btn ${armed?"armed":""}" style="padding:6px 10px;font-size:12px" onclick="delHistEntry('${esc(m.id)}',${i})">${armed?"¿Seguro?":"✕"}</button>
    </div>`;
  }).join("");
  if(hist.length===0)filas=`<p style="color:var(--muted);font-size:13px">Sin entradas en el historial.</p>`;
  return `<div class="modal-title">📋 Historial de ayudas — ${escH(m.name)}</div>
  <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Cada entrada es una ayuda registrada. Elimina las que sobren (por ejemplo, registros de prueba). Esto solo corrige el historial acumulado; no afecta a las ayudas activas.</p>
  <div style="display:flex;justify-content:space-between;padding:8px 10px;background:var(--cream);border-radius:8px;margin-bottom:12px"><span style="font-weight:700;color:var(--dark)">Total historial</span><span style="font-weight:700;color:var(--warm)">${fmtEur(total)} €</span></div>
  ${filas}
  <button class="m-primary" onclick="closeModal()" style="margin-top:6px">Cerrar</button>`;
}
function delHistEntry(mid,idx){
  const key=mid+"|"+idx;
  if(_delHistArmed!==key){
    _delHistArmed=key; render(); toast("Toca de nuevo ✕ para eliminar esta entrada");
    setTimeout(()=>{if(_delHistArmed===key){_delHistArmed=null;render();}},4000);
    return;
  }
  _delHistArmed=null;
  const m=DATA.members.find(x=>x.id===mid);
  if(m&&Array.isArray(m.history)){m.history.splice(idx,1);}
  save();toast("Entrada eliminada ✓");render();
}
function editLoanFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  const l=m&&m.loans.find(x=>x.id===MODAL.lid);
  if(!l)return `<div class="modal-title">Ayuda no encontrada</div>`;
  const sm=l.pays[0]?l.pays[0].m:l.gMonth;
  const sy=l.pays[0]?l.pays[0].y:l.gYear;
  return`<div class="modal-title">✏️ Editar ayuda — ${escH(m.name)}</div>
<p style="font-size:12px;color:var(--muted);margin-bottom:12px">Se conservan los pagos ya marcados que sigan existiendo.</p>
<label class="m-label">Capital (€)</label>
<input id="el-cap" class="m-input" type="number" value="${l.capital}" style="font-size:20px;font-weight:700" oninput="updateEditPreview()">
<label class="m-label">Nº cuotas</label>
<select id="el-n" class="m-select" style="margin-bottom:12px;font-size:16px;font-weight:700" onchange="updateEditPreview()">${Array.from({length:12},(_,i)=>i+1).map(n=>`<option value="${n}"${n===l.n?" selected":""}>${n} ${n===1?"cuota":"cuotas"}</option>`).join("")}</select>
<div style="display:flex;gap:8px;margin-bottom:12px">
<div style="flex:1"><label class="m-label">Mes otorgada</label><select id="el-gm" class="m-select">${MONTHS.map(mm=>`<option${mm===l.gMonth?" selected":""}>${mm}</option>`).join("")}</select></div>
<div style="flex:1"><label class="m-label">Año</label><select id="el-gy" class="m-select">${["2025","2026","2027"].map(y=>`<option${parseInt(y)===l.gYear?" selected":""}>${y}</option>`).join("")}</select></div>
</div>
<div style="display:flex;gap:8px;margin-bottom:16px">
<div style="flex:1"><label class="m-label">1ª cuota mes</label><select id="el-sm" class="m-select">${MONTHS.map(mm=>`<option${mm===sm?" selected":""}>${mm}</option>`).join("")}</select></div>
<div style="flex:1"><label class="m-label">Año</label><select id="el-sy" class="m-select">${["2025","2026","2027"].map(y=>`<option${parseInt(y)===sy?" selected":""}>${y}</option>`).join("")}</select></div>
</div>
<div id="el-preview"></div>
<div style="border-top:1px dashed var(--muted);margin:16px 0 12px;padding-top:14px">
  <div style="font-weight:700;font-size:14px;color:var(--dark);margin-bottom:4px">⏸️ Aplazar una cuota</div>
  <p style="font-size:12px;color:var(--muted);margin-bottom:8px">El asociado paga solo el retorno del mes (5% del capital). El capital de esa cuota pasa al final: se añade un mes. Las demás cuotas no cambian.</p>
  ${(()=>{
    const pend=l.pays.map((p,i)=>({p,i})).filter(o=>!o.p.paid&&!o.p.aplazada);
    if(pend.length===0)return `<div style="font-size:12px;color:var(--muted)">No hay cuotas pendientes para aplazar.</div>`;
    const retorno=Math.round(l.capital*(DATA.rate/100));
    return `<select id="el-aplazar-mes" class="m-select" style="margin-bottom:8px">
      <option value="">— Elegir mes a aplazar —</option>
      ${pend.map(o=>`<option value="${o.i}">${o.p.m} ${o.p.y} · ${o.i+1}/${l.pays.length}</option>`).join("")}
    </select>
    <div style="font-size:12px;color:var(--warm);font-weight:600;margin-bottom:8px">Se cobrará solo ${retorno} € este mes · el capital se recupera en una cuota extra al final.</div>
    <button class="edit-btn" style="width:100%;padding:11px;font-size:13px;background:#E8A04B;color:#fff;font-weight:700" onclick="aplazarDesdeEditor()">Aplicar aplazamiento</button>`;
  })()}
  ${l.pays.some(p=>p.aplazada)?`<div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--muted)"><div style="font-weight:700;font-size:13px;color:var(--dark);margin-bottom:6px">Cuotas aplazadas</div>${l.pays.map((p,i)=>p.aplazada?`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px"><span style="font-size:13px;color:var(--dark)">${escH(p.m)} ${p.y} · ${(p.instAplazada||recargoPorCuota(l))}€ (solo retorno)</span><button class="edit-btn" style="padding:5px 9px;font-size:11px;background:#D9C7A8" onclick="quitarAplazamiento(${i})">↩︓ Quitar</button></div>`:"").join("")}<p style="font-size:11px;color:var(--muted);margin-top:2px">Al quitar un aplazamiento, esa cuota vuelve a normal y el plazo se reduce en un mes.</p></div>`:""}
</div>
<button id="btnSaveEditLoan" class="m-primary" onclick="saveEditLoan()">Guardar cambios</button>`;
}
function updateEditPreview(){
  const cap=parseInt(document.getElementById("el-cap")?.value)||0;
  const nn=parseInt(document.getElementById("el-n")?.value||"3");
  if(cap<=0){document.getElementById("el-preview").innerHTML="";return;}
  const{total,cuotas}=ayudaCuotas(cap,nn,DATA.rate);
  const base=cuotas[0],ultima=cuotas[cuotas.length-1];
  const cuotaTxt=(cuotas.length>1&&base!==ultima)?`${fmtEur(base)} € (última ${fmtEur(ultima)} €)`:`${fmtEur(base)} €`;
  document.getElementById("el-preview").innerHTML=`<div class="m-summary"><div style="font-size:13px;color:var(--muted);margin-bottom:4px">Resumen</div><div style="display:flex;justify-content:space-between;font-size:15px"><span>Total (${DATA.rate}% × ${nn})</span><span style="font-weight:700">${fmtEur(total)} €</span></div><div style="display:flex;justify-content:space-between;font-size:15px;margin-top:4px"><span>Cuota mensual</span><span style="font-weight:700;color:var(--warm)">${cuotaTxt}</span></div></div>`;
}
function quitarAplazamiento(idx){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  const l=m&&m.loans.find(x=>x.id===MODAL.lid);
  if(!l||!l.pays[idx]||!l.pays[idx].aplazada){toast("Esa cuota no está aplazada");return;}
  UNDO_SNAPSHOT=JSON.stringify(DATA);
  clearTimeout(UNDO_TIMER);
  // 1) Devolver la cuota a normal
  delete l.pays[idx].aplazada;
  delete l.pays[idx].instAplazada;
  // 2) Quitar UNA cuota extra del final que esté sin pagar y sin aplazar
  //    (la que se había añadido al aplazar). Se busca desde el final.
  for(let i=l.pays.length-1;i>=0;i--){
    if(!l.pays[i].paid && !l.pays[i].aplazada && i!==idx){ l.pays.splice(i,1); break; }
  }
  // 3) Recalcular respetando las aplazadas que queden
  recalcularApoyo(l);
  save();
  toast("↩︎ Aplazamiento retirado · plazo "+l.n+" cuotas");
  render();
}
function aplazarDesdeEditor(){
  const sel=document.getElementById("el-aplazar-mes");
  const idx=sel?parseInt(sel.value):NaN;
  if(isNaN(idx)){toast("Elige primero el mes a aplazar");return;}
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  const l=m&&m.loans.find(x=>x.id===MODAL.lid);
  if(!l){closeModal();return;}
  const p=l.pays[idx];
  if(!p||p.paid||p.aplazada){toast("Esa cuota no se puede aplazar");return;}
  UNDO_SNAPSHOT=JSON.stringify(DATA);
  clearTimeout(UNDO_TIMER);
  // 1) Marcar como aplazada (solo retorno)
  p.aplazada=true;
  // 2) Añadir una cuota nueva al final (capital recuperado + su retorno)
  const ultima=l.pays[l.pays.length-1];
  let mi=MONTHS.indexOf(ultima.m), yr=ultima.y;
  mi++; if(mi>=12){mi=0;yr++;}
  l.pays.push({m:MONTHS[mi],y:yr,paid:false});
  // 3) Recalcular respetando aplazadas
  recalcularApoyo(l);
  save();
  toast("✓ "+p.m+" "+p.y+" aplazada · plazo "+l.n+" cuotas");
  render(); // reabre el modal con el estado actualizado
}
function saveEditLoan(){
  const btn=document.getElementById("btnSaveEditLoan");
  if(!_saveEditArmed){
    _saveEditArmed=true;
    if(btn){btn.textContent="✓ Confirmar guardado";btn.style.background="#E07A3A";}
    toast("Toca de nuevo para confirmar los cambios");
    setTimeout(()=>{_saveEditArmed=false;if(btn){btn.textContent="Guardar cambios";btn.style.background="";}},4000);
    return;
  }
  _saveEditArmed=false;
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  const l=m&&m.loans.find(x=>x.id===MODAL.lid);
  if(!l){closeModal();return;}
  const cap=parseInt(document.getElementById("el-cap").value)||0;if(cap<=0){alert("Capital inválido");return;}
  const nn=parseInt(document.getElementById("el-n")?.value||"3");
  { // v44.21: se valida con la condición que tenía al concederse
    const tipo=l.tipoEnConcesion!=null?l.tipoEnConcesion:m.type, ciclo=l.cicloEnConcesion!=null?l.cicloEnConcesion:(m.ciclo!=null?m.ciclo:12);
    const nApl=(l.pays||[]).filter(p=>p.aplazada).length,
      v=validarApoyo(m,cap,nn-nApl,tipo,ciclo,{m:document.getElementById("el-sm").value,y:parseInt(document.getElementById("el-sy").value)},{m:l.gMonth,y:l.gYear});
    if(v.bloqueo){ toast("⛔ "+v.bloqueo.replace(/<[^>]+>/g,""),7000); return; } }
  const gm=document.getElementById("el-gm").value,gy=parseInt(document.getElementById("el-gy").value);
  const sm=document.getElementById("el-sm").value,sy=parseInt(document.getElementById("el-sy").value);
  // Preservar estado 'paid' Y 'aplazada' por mes-año al reconstruir
  const prev={};
  l.pays.forEach(p=>{prev[p.m+"-"+p.y]={paid:!!p.paid,aplazada:!!p.aplazada,fecha:p.fecha};}); // v45.37: también la fecha del cobro
  const pays=[];let mi=MONTHS.indexOf(sm),yr=sy;
  for(let i=0;i<nn;i++){
    const k=MONTHS[mi]+"-"+yr;
    const st=prev[k]||{};
    pays.push({m:MONTHS[mi],y:yr,paid:!!st.paid,...(st.aplazada?{aplazada:true}:{}),...(st.paid&&st.fecha?{fecha:st.fecha}:{})});
    mi++;if(mi>=12){mi=0;yr++;}
  }
  l.capital=cap;l.gMonth=gm;l.gYear=gy;l.pays=pays;
  // Recalcular respetando cuotas aplazadas (no reparte parejo si hay aplazadas)
  recalcularApoyo(l);
  closeModal();save();toast("Ayuda actualizada ✓");render();
}
const SIM_MAX_AYUDA=REGLAS.SIMULADOR_MAX_AYUDA; // v45.38: js/maestro.js · decisión de Ángel 03/10/2026: por la demanda, el simulador llega hasta 1.000 € (más adelante 2.000 y 3.000)
function abrirSimulador(mid,tab){
  const m=DATA.members.find(x=>x.id===mid); if(!m)return;
  SIM={mid,tab:tab||"ayuda",ciclo:(m.ciclo!=null?m.ciclo:12),cap:500,n:Math.max(1,Math.min(5,_simMaxCuotas(m))),ap:50};
  openModal('sim',{mid});
}
function _simPermOpciones(m){ const c=(m.ciclo!=null?m.ciclo:12); return PERM_OPCIONES.filter(v=>c===0?v===0:(v===0||v>=c)); }
// Límites de la ayuda con la permanencia simulada. ini = mes de la 1.ª cuota (el siguiente al actual).
function _simLimitesAyuda(m,ciclo){
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), ini=rep+1;
  let maxCap=ciclo===12?REGLAS.AYUDA_MAX_CORTA:SIM_MAX_AYUDA, maxN=ciclo===12?REGLAS.CUOTAS_MAX_CORTA:REGLAS.CUOTAS_MAX, porFin=false; // v45.38: js/maestro.js
  if(ciclo!==0&&m.joinMonth){ const fin=_finCon(m,ciclo)+1; const k=fin-ini+1; if(k<maxN){maxN=Math.max(0,k);porFin=true;} }
  return {ini,maxCap,maxN,porFin};
}
function simuladorHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid); if(!m||!SIM)return "";
  const tabBtn=(id,t)=>`<button onclick="SIM.tab='${id}';render()" style="flex:1;padding:10px;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;background:${SIM.tab===id?"#1B4332":"transparent"};color:${SIM.tab===id?"#fff":"var(--muted)"}">${t}</button>`;
  const chip=(sel,v,txt,fn)=>`<button onclick="${fn}" style="flex:1;min-width:0;padding:10px 4px;border-radius:10px;border:1.5px solid ${sel?"#1B4332":"#E3DDD2"};background:${sel?"#1B4332":"#fff"};color:${sel?"#fff":"#3B3B3B"};font-size:13.5px;font-weight:700;cursor:pointer">${txt}</button>`;
  const perm=_simPermOpciones(m);
  if(perm.indexOf(SIM.ciclo)<0)SIM.ciclo=perm[0];
  let h=`<div class="modal-title">🧮 Simulador — ${escH(m.name.split(" ")[0])}</div>
    <div style="display:flex;gap:4px;background:#EFEAE0;border-radius:12px;padding:4px;margin-bottom:14px">${tabBtn("ayuda","Ayuda")}${tabBtn("ben","Beneficio")}</div>`;
  if(SIM.tab==="ben")return h+`<div id="sim-res">${simBenResHTML(m)}</div>
    <div style="font-size:11.5px;color:var(--muted);margin-top:12px;line-height:1.4">Es solo una simulación: no cambia nada de tu ficha.</div>`;
  // v45.6: una sola barra (100–1.000 €) y otra de 1 a 12 meses; el simulador dice qué permanencia hace falta
  const abierto=!!DESP["sim-info"];
  h+=`<button onclick="DESP['sim-info']=!DESP['sim-info'];render()" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;margin:0 0 ${abierto?0:14}px;padding:12px 14px;border-radius:${abierto?"12px 12px 0 0":"12px"};border:1.5px solid #2D6A4F;background:#EEF7F1;color:#1B4332">
      <span style="font-size:22px">💡</span><span style="flex:1;font-size:14.5px;font-weight:800">¿Cuánto puedo pedir? <span style="font-weight:600;font-size:12.5px;opacity:.8">Toca aquí y te lo explicamos</span></span>
      <span style="font-size:18px;transform:rotate(${abierto?90:0}deg)">›</span></button>`;
  if(abierto)h+=`<div style="border:1.5px solid #2D6A4F;border-top:none;border-radius:0 0 12px 12px;padding:10px 14px 12px;margin-bottom:14px;font-size:13.5px;color:#1B4332;line-height:1.5;background:#fff">
      Depende de tu <b>permanencia</b> (el tiempo que te comprometes a estar en el fondo):
      <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:0;margin:8px 0;border:1px solid #D5E3D9;border-radius:10px;overflow:hidden;font-size:13px">
        <div style="background:#1B4332;color:#fff;padding:6px 8px;font-weight:700">Permanencia</div><div style="background:#1B4332;color:#fff;padding:6px 8px;font-weight:700">Puedes pedir</div><div style="background:#1B4332;color:#fff;padding:6px 8px;font-weight:700">Lo devuelves en</div>
        <div style="padding:6px 8px">12 meses</div><div style="padding:6px 8px"><b>hasta ${REGLAS.AYUDA_MAX_CORTA} €</b></div><div style="padding:6px 8px">hasta ${REGLAS.CUOTAS_MAX_CORTA} meses</div>
        <div style="padding:6px 8px;background:#F4F9F6">24, 36 meses o indefinida</div><div style="padding:6px 8px;background:#F4F9F6"><b>hasta ${_miles(SIM_MAX_AYUDA)} €</b></div><div style="padding:6px 8px;background:#F4F9F6">hasta ${REGLAS.CUOTAS_MAX} meses</div>
      </div>
      La última cuota se paga, como máximo, en el <b>último mes de tu permanencia</b>. Si necesitas más, puedes <b>ampliar tu permanencia</b> cuando quieras.</div>`;
  h+=`<div style="font-size:13px;color:var(--muted);margin-bottom:12px">Tu permanencia: <b style="color:var(--dark)">${m.ciclo===0?"indefinida":m.ciclo+" meses"}</b>${finPermanenciaIdx(m)!=null?` · termina en ${_txtIdx(finPermanenciaIdx(m))}`:""}</div>`;
  if(SIM.tab==="ayuda"){
    SIM.cap=Math.min(Math.max(REGLAS.AYUDA_MIN,SIM.cap),SIM_MAX_AYUDA); SIM.n=Math.min(Math.max(1,SIM.n),REGLAS.CUOTAS_MAX);
    h+=`<label class="m-label">¿Cuánto necesitas? <b id="sim-cap-v" style="color:#1B4332;font-size:17px">${fmtEur(SIM.cap)} €</b></label>
      <div id="sim-aviso">${simAvisoAyudaHTML(m)}</div>
      <input type="range" min="${REGLAS.AYUDA_MIN}" max="${SIM_MAX_AYUDA}" step="50" value="${SIM.cap}" oninput="SIM.cap=+this.value;simPintar()" class="sim-range">
      <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-bottom:12px"><span>${REGLAS.AYUDA_MIN} €</span><span>${fmtEur(SIM_MAX_AYUDA)} €</span></div>
      <label class="m-label">¿En cuántos meses lo devuelves? <b id="sim-n-v" style="color:#1B4332;font-size:17px">${SIM.n} ${SIM.n===1?"mes":"meses"}</b></label>
      <input type="range" min="1" max="${REGLAS.CUOTAS_MAX}" step="1" value="${SIM.n}" oninput="SIM.n=+this.value;simPintar()" class="sim-range">
      <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-bottom:6px"><span>1 mes</span><span>${REGLAS.CUOTAS_MAX} meses</span></div>`;
  }
  const _adm=!READONLY_ID&&!ES_MODO_GRUPO&&!VISTA_ASOC; // v45.28: enviar por WhatsApp solo desde la app del administrador
  return h+`<div id="sim-res">${SIM.tab==="ayuda"?simAyudaResHTML(m):simBenResHTML(m)}</div>
    ${_adm&&SIM.tab==="ayuda"?`<button onclick="simEnviarWA()" style="width:100%;margin-top:12px;padding:12px;border-radius:12px;border:none;background:#25D366;color:#fff;font-size:15px;font-weight:800;cursor:pointer">💬 Enviar por WhatsApp</button>
      <div style="font-size:11.5px;color:var(--muted);margin-top:4px;line-height:1.4">Se envía una imagen con esta ayuda (y, si hace falta, la permanencia que necesita) y un mensaje corto.</div>`:""}
    ${_adm&&MODAL.volver?`<button onclick="volverAAyuda(MODAL.volver)" style="width:100%;margin-top:8px;padding:10px;border:none;background:transparent;color:var(--muted);font-size:13px;text-decoration:underline;cursor:pointer">← Volver a la ayuda</button>`:""}
    <div style="font-size:11.5px;color:var(--muted);margin-top:12px;line-height:1.4">Es solo una simulación: no cambia nada de tu ficha.</div>`;
}
// ¿Qué permanencia hace falta para esta ayuda? (AY-1 y AY-6). Devuelve la primera que vale, desde la actual.
function _simPermNecesaria(m,cap,n){
  const ini=_idxMes(DATA.reportMonth,DATA.reportYear)+1, cur=(m.ciclo!=null?m.ciclo:12);
  const cand=[cur,24,36,0].filter((c,i,a)=>a.indexOf(c)===i&&(cur===0?c===0:(c===0||c>=cur)));
  for(const c of cand){
    if(c===12&&(cap>500||n>5))continue;
    if(cap>SIM_MAX_AYUDA||n>12)continue;
    if(c!==0&&m.joinMonth){ const fin=_finCon(m,c); if(ini+n-1>fin)continue; } // v45.7: como máximo en el último mes de permanencia
    return c;
  }
  return null;
}
function simPintar(){
  if(VISTA_ASOC&&!simPintar._dentro){ simPintar._dentro=true; try{ return _conMesAsociados(simPintar); } finally { simPintar._dentro=false; } } // v45.23
  const m=DATA.members.find(x=>x.id===(MODAL&&MODAL.mid)); if(!m||!SIM)return;
  const a=document.getElementById("sim-cap-v"), b=document.getElementById("sim-n-v"), r=document.getElementById("sim-res");
  if(a)a.textContent=fmtEur(SIM.cap)+" €"; if(b)b.textContent=SIM.n+" "+(SIM.n===1?"mes":"meses");
  if(r)r.innerHTML=SIM.tab==="ayuda"?simAyudaResHTML(m):simBenResHTML(m);
  const av=document.getElementById("sim-aviso"); if(av&&SIM.tab==="ayuda")av.innerHTML=simAvisoAyudaHTML(m);
}
// v45.7: el aviso va entre la cantidad y la barra, para que se vea al moverla
function _simMaxCuotas(m){ // con su permanencia actual: 5 o 12, y nunca más allá del último mes de permanencia
  const cur=(m.ciclo!=null?m.ciclo:12); let k=cur===12?REGLAS.CUOTAS_MAX_CORTA:REGLAS.CUOTAS_MAX; // v45.38: js/maestro.js
  if(cur!==0&&m.joinMonth){ const ini=_idxMes(DATA.reportMonth,DATA.reportYear)+1, fin=_finCon(m,cur); k=Math.min(k,fin-ini+1); }
  return k;
}
function simAvisoAyudaHTML(m){
  const cap=SIM.cap, n=SIM.n, need=_simPermNecesaria(m,cap,n), cur=(m.ciclo!=null?m.ciclo:12), k=_simMaxCuotas(m);
  const lim=(cur===12?"hasta 500 €":"hasta "+fmtEur(SIM_MAX_AYUDA)+" €")+" en "+k+" "+(k===1?"mes":"meses");
  if(need===cur)return ""; // v45.10: sin cuadro cuando la ayuda cabe (decisión de Ángel 04/10/2026); solo se avisa si hay que ampliar
  return `<div style="margin:2px 0 8px;padding:10px 12px;border-radius:10px;background:#FFF4E5;border:1.5px solid #E0A040;color:#6B4210;font-size:13.5px;line-height:1.5">⚠️ Con tu permanencia de ${_permTxt(cur).toLowerCase()} ${k<1?"ya no da tiempo a devolver una ayuda antes de que termine":"puedes pedir "+lim}.<br><b>Para esta ayuda tienes que ampliar tu permanencia a ${need===0?"indefinida":need===24?"24 meses o más":need+" meses o más"}.</b></div>`;
}
const _simCaja=(t,body)=>`<div style="background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;border-radius:16px;padding:14px 16px;margin-top:6px">${t}${body}</div>`;
const _simFila=(l,v,big)=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px 0"><span style="font-size:13.5px;opacity:.85">${l}</span><b style="font-size:${big?20:15}px;white-space:nowrap">${v}</b></div>`;
function simAyudaResHTML(m){
  const L={ini:_idxMes(DATA.reportMonth,DATA.reportYear)+1}, cap=SIM.cap, n=SIM.n;
  const {total,cuotas}=ayudaCuotas(cap,n,DATA.rate);
  const iguales=cuotas.every(c=>c===cuotas[0]);
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear);
  let h=_simCaja("",_simFila(`Recibes en ${_txtIdx(rep)}`,fmtEur(cap)+" €",true)
    +_simFila(`Devuelves en ${n} ${n===1?"cuota":"cuotas"}`,iguales?`${fmtEur(cuotas[0])} € al mes`:`${fmtEur(Math.max(...cuotas))} o ${fmtEur(Math.min(...cuotas))} € al mes`)
    +`<div style="font-size:12.5px;opacity:.85;margin-top:4px">La primera cuota se paga en ${_txtIdx(L.ini)}.</div>`);
  h+=`<div style="margin-top:12px;font-size:13.5px;font-weight:800;color:var(--dark)">Calendario de cuotas</div>
    <div style="margin-top:4px">${cuotas.map((c,i)=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #EFEAE0;font-size:13.5px"><span>${MONTHS_FULL[((L.ini+i)%12+12)%12]} ${Math.floor((L.ini+i)/12)}${i===n-1&&n>1?" · 🏁 última":""}</span><b>${fmtEur(c)} €</b></div>`).join("")}</div>`;
  return h;
}
// Beneficio: lo que ya tiene + lo que ganaría aportando SIM.ap € cada mes hasta el final de la permanencia simulada.
function _simProyeccion(m,ciclo,ap){
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), ini=_idxMes(m.joinMonth,m.joinYear);
  const desde=_aportePagadoKey(m,_keyDeIdx(rep))?rep+1:rep;
  const fin=ciclo===0?Math.max(desde+11,ini+35):ini+ciclo-1+mesesPausaTotal(m); // indefinida: como mínimo 12 meses más y hasta el mes 36
  const mm=Object.assign({},m,{ciclo});
  const yaAp=totalAportadoMiembro(m), yaBen=_r2(aportesConBeneficio(m,rep).reduce((s,a)=>s+a.ben,0)), ret=beneficioRetirado(m);
  let nAp=0,nBen=0; const porAnio={};
  for(let i=desde;i<=fin;i++){ if(enPausaIdx(m,i))continue; const t=tarifaNivelMes(mm,_keyDeIdx(i+1)), b=(ap/50)*t, an=Math.floor((i-ini)/12)+1;
    nAp+=ap; nBen+=b; if(!porAnio[an])porAnio[an]={an,meses:0,ben:0,t}; porAnio[an].meses++; porAnio[an].ben+=b; }
  return {desde,fin,yaAp,yaBen,ret,nAp,nBen:_r2(nBen),porAnio:Object.values(porAnio),
    totalAp:_r2(yaAp+nAp),totalBen:_r2(yaBen+nBen-ret),recibe:_r2(yaAp+nAp+yaBen+nBen-ret)};
}
function simBenResHTML(m){
  // v45.9: «Tu situación hoy» (datos de la persona) en un desplegable; debajo, ejemplos generales por permanencia y un ejemplo de aporte variable
  if(!m.joinMonth)return "";
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), fin=finPermanenciaIdx(m);
  const tHoy=tarifaNivelMes(m,_keyDeIdx(rep+1)), pagadoHoy=_aportePagadoKey(m,_keyDeIdx(rep)), apHoy=aporteBrutoKey(m,_keyDeIdx(rep));
  const aportes=totalAportadoMiembro(m), guardado=beneficioGuardado(m);
  const pend=pagadoHoy?_r2((apHoy/50)*tHoy):0;   // beneficio del aporte de este mes: se guarda el mes que viene (BE-3)
  const yaTienes=_r2(aportes+guardado+pend);
  const mesTxt=MONTHS_FULL[((rep%12)+12)%12].toLowerCase(), sigTxt=MONTHS_FULL[(((rep+1)%12)+12)%12].toLowerCase();
  // v45.11: nota del final (Maestro v18.6 · PE-5: se decide en el último mes, el del último aporte, qué hace el mes siguiente; PE-7: indefinida)
  const notaDecision=m.ciclo===0?"Cada 12 meses puedes retirar tu beneficio guardado."
    :fin==null?""
    :rep<fin?`En ${_txtIdx(fin)}, con tu último aporte, decides si en ${_txtIdx(fin+1)} amplías tu permanencia o te retiras.`
    :rep===fin?`Este mes es tu último aporte: decides si en ${_txtIdx(fin+1)} amplías tu permanencia o te retiras.`
    :"Tu permanencia ha terminado: habla con el coordinador para ampliarla o retirarte.";
  // 1) Tu situación hoy (desplegable)
  const abierto=!!DESP["sim-hoy"];
  let h=`<button onclick="DESP['sim-hoy']=!DESP['sim-hoy'];render()" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;margin:0 0 ${abierto?0:16}px;padding:12px 14px;border-radius:${abierto?"12px 12px 0 0":"12px"};border:1.5px solid #2D6A4F;background:#EEF7F1;color:#1B4332">
      <span style="font-size:22px">📍</span><span style="flex:1;font-size:14.5px;font-weight:800">Tu situación hoy <span style="font-weight:600;font-size:12.5px;opacity:.8">Toca aquí para verla</span></span>
      <span style="font-size:18px;transform:rotate(${abierto?90:0}deg)">›</span></button>`;
  if(abierto)h+=`<div style="margin-bottom:16px">`+_simCaja(`<div style="font-size:12.5px;opacity:.85;margin-bottom:4px">Tu permanencia actual es ${m.ciclo===0?"indefinida":`de ${m.ciclo} meses`}</div>`,
       _simFila("Tus aportes",fmtEur(aportes)+" €")
      +_simFila("Tu beneficio guardado",fmtEur(guardado)+" €")
      +(pend?_simFila(`Beneficio de ${mesTxt} (se guarda en ${sigTxt})`,"+"+fmtEur(pend)+" €"):"")
      +_simFila("Llevas acumulado",fmtEur(yaTienes)+" €",true)
      +(notaDecision?`<div style="font-size:12.5px;opacity:.9;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.2)">${notaDecision}</div>`:""))+`</div>`;
  // 2) Ejemplos generales (no son los datos de la persona: esos están en «Tu situación hoy»)
  //    Tarifas BE-2: 10 € el 1.er año, 12 € el 2.º (24, 36, indefinida), 15 € desde el 3.º (36, indefinida).
  const tarifas=c=>c===12?[10]:c===24?[10,12]:c===36?[10,12,15]:[10,12,15,15]; // indefinida: ejemplo con 4 años
  const ab2=!!DESP["sim-var"];
  h+=`<div style="font-size:15px;font-weight:800;color:var(--dark);margin:0 0 8px">🌱 ¿Y si te quedas más tiempo?</div>
`;
  h+=`<label class="m-label">Elige tu aporte mensual</label>
    <div style="display:flex;gap:6px;margin-bottom:12px">${APORTE_OPCIONES.map(v=>`<button onclick="SIM.ap=${v};render()" style="flex:1;padding:10px 4px;border-radius:10px;border:1.5px solid ${SIM.ap===v?"#1B4332":"#E3DDD2"};background:${SIM.ap===v?"#1B4332":"#fff"};color:${SIM.ap===v?"#fff":"#3B3B3B"};font-size:13.5px;font-weight:700;cursor:pointer">${v} €</button>`).join("")}</div>`;
  const fila=(l,v,o={})=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:${o.big?15.5:13.5}px;padding:${o.big?"6px 0 0":"2px 0"};${o.top?"border-top:1px solid #E3DDD2;margin-top:6px;":""}"><span style="${o.big?"font-weight:800;color:#1B4332":"color:#4A4A4A"}">${l}</span><b style="white-space:nowrap;${o.color?`color:${o.color}`:""};font-size:${o.big?19:14}px">${v}</b></div>`;
  const ejemplo=c=>{ const t=tarifas(c), meses=t.length*12, pon=SIM.ap*meses, gana=t.reduce((a,x)=>a+12*(SIM.ap/50)*x,0); return {meses,pon,gana,recibe:pon+gana}; };
    PERM_OPCIONES.forEach(c=>{
    const r=ejemplo(c), ord=["1.er","2.º","3.er","4.º"];
    h+=`<div style="border:1.5px solid #E3DDD2;border-radius:14px;padding:12px 14px;margin-bottom:10px;background:#fff">
      <div style="font-size:15px;font-weight:800;color:#1B4332">Con permanencia ${c===0?"indefinida":`de ${c} meses`}</div>
      <div style="margin:4px 0 ${c===0?2:6}px"><span style="display:inline-block;font-size:12.5px;font-weight:800;padding:2px 9px;border-radius:20px;background:#E3F1E7;color:#1B7A3D">${c===12?"10 €":c===24?"pasas de 10 € a 12 €":"pasas de 10 € a 12 € y a 15 €"}</span></div>
      ${c===0?`<div style="font-size:12.5px;color:var(--muted);margin-bottom:6px">Sin fecha de fin · ejemplo con 4 años</div>`:""}
      ${fila(`Aportas ${SIM.ap} € × ${r.meses} meses`,fmtEur(r.pon)+" €")}
      ${tarifas(c).map((t,a)=>fila(`Ganas ${ord[a]} año: ${fmtEur((SIM.ap/50)*t)} € × 12`,"+"+fmtEur((SIM.ap/50)*t*12)+" €",{color:"#2D6A4F"})).join("")}
      ${fila(c===0?"A los 4 años tendrías":"Al terminar recibes",fmtEur(r.recibe)+" €",{big:true,top:true})}
    </div>`;
  });
  // v45.10: «¿Tengo que aportar siempre lo mismo?» va al final, después de los cuadros
  h+=`<button onclick="DESP['sim-var']=!DESP['sim-var'];render()" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;margin:0 0 ${ab2?0:12}px;padding:11px 14px;border-radius:${ab2?"12px 12px 0 0":"12px"};border:1.5px solid #C9A227;background:#FFF8E1;color:#5C4A00">
      <span style="font-size:20px">🔀</span><span style="flex:1;font-size:14px;font-weight:800">¿Tengo que aportar siempre lo mismo? <span style="font-weight:600;font-size:12.5px;opacity:.8">Toca aquí</span></span>
      <span style="font-size:18px;transform:rotate(${ab2?90:0}deg)">›</span></button>`;
  if(ab2){
    const ej=[50,100,50,50,200,50,100,50,150,50,50,100], tot=ej.reduce((a,b)=>a+b,0), ben=ej.reduce((a,b)=>a+(b/50)*10,0);
    h+=`<div style="border:1.5px solid #C9A227;border-top:none;border-radius:0 0 12px 12px;padding:10px 14px 12px;margin-bottom:12px;font-size:13.5px;color:#3B3B3B;line-height:1.5;background:#fff">
      <b>No.</b> Lo mínimo es <b>50 €</b> y cada mes eliges: 50, 100, 150 o 200 €. Cada 50 € que aportas ese mes gana su parte.
      <div style="margin:8px 0 4px;font-weight:800;color:#1B4332">Ejemplo de un año (cada 50 € gana 10 €):</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #E3DDD2;border-radius:10px;overflow:hidden;font-size:13px">
        <div style="background:#1B4332;color:#fff;padding:5px 8px;font-weight:700">Mes</div><div style="background:#1B4332;color:#fff;padding:5px 8px;font-weight:700;text-align:right">Aportas</div><div style="background:#1B4332;color:#fff;padding:5px 8px;font-weight:700;text-align:right">Ganas</div>
        ${ej.map((v,k)=>{const bg=k%2?"background:#F7F4EE;":"";return `<div style="${bg}padding:4px 8px">${k+1}</div><div style="${bg}padding:4px 8px;text-align:right">${v} €</div><div style="${bg}padding:4px 8px;text-align:right;color:#2D6A4F;font-weight:700">+${(v/50)*10} €</div>`;}).join("")}
        <div style="background:#EEF7F1;padding:6px 8px;font-weight:800">Total</div><div style="background:#EEF7F1;padding:6px 8px;text-align:right;font-weight:800">${fmtEur(tot)} €</div><div style="background:#EEF7F1;padding:6px 8px;text-align:right;font-weight:800;color:#2D6A4F">+${fmtEur(ben)} €</div>
      </div>
      <div style="margin-top:8px">Al terminar recibes <b>${fmtEur(tot+ben)} €</b>: tus aportes de ${fmtEur(tot)} € y ${fmtEur(ben)} € de beneficio.</div></div>`;
  }
  // v45.10: «¿Puedo cobrar mi beneficio sin irme?» (Maestro PE-5) — ejemplo de 12 a 24 meses con el aporte elegido arriba
  const ab3=!!DESP["sim-ret"], ap=SIM.ap, b1=(ap/50)*10, b2=(ap/50)*12;
  h+=`<button onclick="DESP['sim-ret']=!DESP['sim-ret'];render()" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;margin:0 0 ${ab3?0:12}px;padding:11px 14px;border-radius:${ab3?"12px 12px 0 0":"12px"};border:1.5px solid #2D6A4F;background:#EEF7F1;color:#1B4332">
      <span style="font-size:20px">💶</span><span style="flex:1;font-size:14px;font-weight:800">¿Puedo cobrar mi beneficio sin irme? <span style="font-weight:600;font-size:12.5px;opacity:.8">Toca aquí</span></span>
      <span style="font-size:18px;transform:rotate(${ab3?90:0}deg)">›</span></button>`;
  if(ab3){
    // v45.10: línea de tiempo (decisión de Ángel 04/10/2026)
    const parada=(tit,cuerpo,ult)=>`<div style="position:relative;margin-bottom:${ult?0:12}px"><span style="position:absolute;left:-23px;top:2px;width:14px;height:14px;border-radius:50%;background:#1B4332"></span>
      <div style="font-size:12px;font-weight:800;color:#B06A1E;text-transform:uppercase;letter-spacing:.2px">${tit}</div>
      <div style="background:#F4F9F6;border-radius:10px;padding:8px 10px;margin-top:4px">${cuerpo}</div></div>`;
    const lin=(l,v,c)=>`<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${l}</span><b style="${c?"color:#2D6A4F":""}">${v}</b></div>`;
    h+=`<div style="border:1.5px solid #2D6A4F;border-top:none;border-radius:0 0 12px 12px;padding:10px 14px 14px;margin-bottom:12px;font-size:13.5px;color:#2B2B2B;line-height:1.45;background:#fff">
      <div style="margin-bottom:10px"><b>Sí.</b> Ejemplo con <b>${ap} € al mes</b>, de 12 a 24 meses:</div>
      <div style="border-left:3px solid #2D6A4F;margin-left:8px;padding-left:15px">
        ${parada("Mes 12 · amplías a 24",lin("Tus aportes",fmtEur(ap*12)+" €")+lin("Tu beneficio",fmtEur(b1*12)+" €",1)
          +`<div style="margin-top:4px">👉 <b>Retiras tus ${fmtEur(b1*12)} €</b></div><div>Tus ${fmtEur(ap*12)} € se quedan.</div>`)}
        ${parada("Meses 13 a 24",`Sigues aportando ${ap} € y ahora ganas <b>${fmtEur(b2)} € al mes</b> (antes ${fmtEur(b1)} €).`)}
        ${parada("Mes 24 · tú decides",lin("Tus aportes",fmtEur(ap*24)+" €")+lin("Tu beneficio",fmtEur(b2*12)+" €",1)
          +`<div style="display:flex;gap:6px;margin-top:6px">
              <div style="flex:1;background:#fff;border:1px solid #D5E3D9;border-radius:8px;padding:7px;font-size:12.5px">🌱 <b>Si decides ampliar a 36:</b> te llevas <b>${fmtEur(b2*12)} €</b> y quedan ${fmtEur(ap*24)} €</div>
              <div style="flex:1;background:#fff;border:1px solid #D5E3D9;border-radius:8px;padding:7px;font-size:12.5px">🚪 <b>Si decides retirarte:</b> te llevas <b>${fmtEur(ap*24+b2*12)} €</b></div>
            </div>`,1)}
      </div></div>`;
  }
  h+=`<div style="font-size:12px;color:var(--muted);line-height:1.4">Puedes ampliar tu permanencia cuando quieras; nunca se puede bajar.</div>`;
  return h;
}
