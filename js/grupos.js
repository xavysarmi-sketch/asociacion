// Nuevos Horizontes · grupos.js
// Cierre grupal y cuenta con el responsable del grupo
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).
// v45.15: grupo de una persona (principal o miembro) y propuesta automática de aval/grupo
function _grupoDe(mid){ const g=gruposCierre().find(x=>x.principalId===mid||(x.miembros||[]).includes(mid)); return g?g.id:""; }
function _cgSimIdx(gid){ const c=_idxMes(DATA.reportMonth,DATA.reportYear), v=CG_SIM_MES[gid]; return (v!=null&&v>=c)?v:c; }
// v45.68: salidas de personas del grupo pendientes de pago y sin apuntar aún en una cuenta de grupo (SA-5:
// se pagan de la caja del fondo; el dinero que recoge el responsable es del fondo, así que puede pagarla él)
function _cgSalidasPend(g){
  const ids=[g.principalId,...(g.miembros||[])], usadas=new Set();
  Object.values(DATA.cuentasGrupo||{}).forEach(k=>Object.values(k||{}).forEach(c=>(c.movs||[]).forEach(x=>{ if(x.tipo==="salida")usadas.add(x.mid); })));
  return ids.map(id=>DATA.members.find(m=>m.id===id)).filter(m=>m&&m.baja&&m.baja.v18&&!m.baja.pagada&&!usadas.has(m.id))
    .map(m=>({m,v:_r2((datosBaja(m)||{}).total||0)})).filter(x=>x.v>0);
}
// v45.69: solicitudes pendientes de ese grupo para ese mes (se apuntan en Ayudas; aquí solo se leen)
function _cgSolsPend(g,idx){ const k=_keyDeIdx(idx); return _solsR().filter(s=>s.estado==="pendiente"&&s.grupoGid===g.id&&s.mes===k&&s.capital>0); }
function cgSimAdd(gid){
  const g=gruposCierre().find(x=>x.id===gid); if(!g)return;
  const v=numES((document.getElementById("cg-sim")||{}).value);
  const salF=_cgSalidasPend(g).filter(x=>{ const c=document.getElementById("cg-sim-sal-"+x.m.id); return c&&!c.checked; }).map(x=>x.m.id), sal=_cgSalidasPend(g).filter(x=>!salF.includes(x.m.id)).map(x=>x.m.id);
  const nombre=nombreBonito((document.getElementById("cg-sim-nom")||{}).value); // v45.47
  const ms=(document.getElementById("cg-sim-mes")||{}).value; if(ms!=null&&ms!=="")CG_SIM_MES[gid]=+ms; // v45.17: mes de la simulación
  const sols=_cgSolsPend(g,_cgSimIdx(gid)), fuera=sols.filter(s=>{ const c=document.getElementById("cg-sim-sol-"+s.id); return c&&!c.checked; }).map(s=>s.id);
  // v45.69: la misma persona no entra dos veces: si ya tiene solicitud ese mes, se usa la solicitud
  const dup=v>0&&nombre?sols.find(s=>_normNom(s.nombre)===_normNom(nombre)):null;
  if(dup){ const i=fuera.indexOf(dup.id); if(i>=0)fuera.splice(i,1);
    toast(_r2(v)===_r2(dup.capital)?`${dup.nombre.split(" ")[0]} ya tiene una solicitud de ${fmtEur(dup.capital)} € para ${_txtIdx(_cgSimIdx(gid)).split(" ")[0]}: se usa esa`:`${dup.nombre.split(" ")[0]} ya tiene una solicitud de ${fmtEur(dup.capital)} €. Si cambia el importe, corrígelo en su solicitud (Ayudas)`,5000); }
  const incl=sols.filter(s=>!fuera.includes(s.id)).length;
  if(!(v>0)&&!sal.length&&!incl){toast("Escribe el importe de la ayuda");return;}
  if(v>0&&!dup)(CG_SIM[gid]=CG_SIM[gid]||[]).push({v:_r2(v),nombre});
  if(salF.length)CG_SIM_SAL[gid]=salF; else delete CG_SIM_SAL[gid];
  if(fuera.length)CG_SIM_SOLX[gid]=fuera; else delete CG_SIM_SOLX[gid];
  CG_SIM_ON[gid]=true; delete CG_SIM_REAL[gid]; CG_FORM=null; render();
}
// v46.8: «Nueva solicitud» desde la cuenta del grupo: abre Ayudas con el grupo ya puesto
function solDesdeGrupo(gid){ TAB="ayudas"; FICHA_ID=null; SOL_FORM=true; render();
  setTimeout(()=>{ const gr=document.getElementById("so-grupo"); if(gr)gr.value=gid; const h=document.getElementById("so-mid"); if(h)h.scrollIntoView({behavior:"smooth",block:"start"}); },40); }
function cgSimQuitarSol(gid,id){ (CG_SIM_SOLX[gid]=CG_SIM_SOLX[gid]||[]).push(id); render(); }
function cgSimQuitarSal(gid,mid){ (CG_SIM_SAL[gid]=CG_SIM_SAL[gid]||[]).push(mid); render(); }
function _cgSimEtq(x,i,n,html){ const nm=x.nombre?(html?escH(x.nombre):x.nombre):""; return (nm?`Ayuda a ${nm}`:`Ayuda${n>1?" "+(i+1):""}`)+" (si la das)"; }
function _cgDatosSim(g){
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), movs=_cgMovs(_keyDeIdx(idx),g.id), sim=[]; // v46.8: la propuesta es del mes de trabajo y solo con solicitudes guardadas
  const sum=t=>_r2(movs.filter(x=>x.tipo===t).reduce((a,x)=>a+x.importe,0));
  const cc=_cgCascada(g,idx), falta=cc.falta, simTot=_r2(sim.reduce((a,b)=>a+b.v,0)); // v46.67: la misma cuenta en cascada
  const fuera=CG_SIM_SOLX[g.id]||[], sols=_cgSolsPend(g,idx).filter(s=>!fuera.includes(s.id)).map(s=>{ const n=s.cuotas||1, c=ayudaCuotas(s.capital,n,DATA.rate).cuotas; return {id:s.id,nombre:s.nombre,v:_r2(s.capital),n,cuota:c[0]}; }), solTot=_r2(sols.reduce((a,b)=>a+b.v,0)); // v45.69
  const selS=CG_SIM_SAL[g.id]||[], sal=_cgSalidasPend(g).filter(x=>!selS.includes(x.m.id)).map(x=>({mid:x.m.id,nombre:x.m.name,v:x.v})), salTot=_r2(sal.reduce((a,b)=>a+b.v,0)); // v45.68
  return {idx,total:_sinCrearMes(idx,()=>_cgTotal(g,idx)),arrastre:sum("arrastre"),entregado:_r2(cc.personas+cc.entregas-cc.solape),directo:cc.directo,ayudas:sum("ayuda"),salidasYa:sum("salida"),pagado:sum("pago"),sim,simTot,sal,salTot,sols,solTot,resto:_r2(falta-simTot-salTot-solTot)};
}
// v45.74: cuenta para WhatsApp con el importe delante en un recuadro (`…` = letra de ancho fijo de WhatsApp) y el
// concepto detrás en letra normal. Con la letra grande del móvil una tabla de ancho fijo se partía (Ángel 01/11/2026);
// así los importes quedan en columna y, si el concepto no cabe, baja de línea sin descolocar nada. El hueco va entre
// el signo y la cifra (WhatsApp no admite espacios al principio del recuadro).
function _cgTicket(filas,resultado,neg){
  const cifra=v=>fmtEur(Math.abs(v))+" €", sig=v=>v<0?"-":v>0?"+":"=";
  const todas=[...filas.map(f=>f[1]),resultado], W=Math.max(...todas.map(v=>cifra(v).length));
  const caja=(v,s)=>"`"+(s||sig(v))+" ".repeat(W-cifra(v).length+1)+cifra(v)+"`";
  // v45.76: el resultado sin signo menos y dicho en palabras (Ángel 01/11/2026: el «-475 RESULTADO» confundía)
  const txt=resultado<0?(neg||"A TU FAVOR"):resultado>0?"FALTA POR ENTREGAR":"CUADRADO"; // v46.7: «ME ENTREGAS» parecía que ya lo había entregado
  return filas.map(([l,v])=>caja(v)+" "+l).join("\n")+"\n━━━━━━━━\n"+caja(resultado,"=")+" *"+txt+"*\n";
}
// v46.8 (Ángel 07/11/2026): «150 € A TU FAVOR» se entendía como dinero para el responsable; si falta dinero
// para pagar ayudas o salidas, se dice para qué es: «Para completar la ayuda de Karla faltan 150 €».
function _cgParaQue(ays,sals){
  const pn=n=>String(n||"").split(" ")[0], y=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" y "+a[a.length-1], p=[];
  if(ays.length)p.push((ays.length>1?"las ayudas de ":"la ayuda de ")+y(ays.map(pn)));
  if(sals.length)p.push((sals.length>1?"las salidas de ":"la salida de ")+y(sals.map(pn)));
  return p.join(" y ");
}
// v45.72: «Está de acuerdo: hacerlo real»: lista de lo que hay que hacer, cada cosa con su botón (Ángel 01/11/2026)
// Aprobar una ayuda lo decide siempre el administrador (cuotas y fecha): la app le lleva a ella ya rellenada.
function cgSalidaReal(gid,mid){
  const g=gruposCierre().find(x=>x.id===gid); if(!g||_mesBloqueado())return;
  const x=_cgSalidasPend(g).find(y=>y.m.id===mid); if(!x)return;
  _cgW(getMesKey(DATA.reportMonth,DATA.reportYear),gid).movs.push({id:"cg"+Date.now()+Math.random().toString(36).slice(2,6),tipo:"salida",importe:x.v,fecha:_cgHoy(),mid,nombre:x.m.name});
  setPagoBaja(mid,"pagada",true); toast("✅ Salida de "+x.m.name.split(" ")[0]+" apuntada y marcada como pagada");
}
function _cgRealHTML(g,d,nom){
  const gid=g.id, b=(t,on,c)=>`<button onclick="${on}" style="width:100%;padding:10px 12px;border-radius:9px;border:none;background:${c||"#1B4332"};color:#fff;font-size:14px;font-weight:800;cursor:pointer">${t}</button>`;
  if(!CG_SIM_REAL[gid])return `<button onclick="CG_SIM_REAL['${gid}']=true;render()" style="width:100%;margin-top:8px;padding:11px;border-radius:9px;border:2px solid #1B4332;background:#fff;color:#1B4332;font-size:14px;font-weight:800;cursor:pointer">✅ ${nom} está de acuerdo: hacerlo real</button>`;
  const fila=(ok,txt,btn)=>`<div style="padding:9px 0;border-top:1px solid #E8C9A0;font-size:14.5px"><div style="display:flex;gap:8px;align-items:flex-start"><span style="flex:none;font-size:17px">${ok?"✅":"⬜"}</span><span style="flex:1;min-width:0;line-height:1.35;${ok?"color:#1B7A3D;font-weight:700":"font-weight:700;color:#0F2219"}">${txt}</span></div>${ok?"":`<div style="margin:7px 0 0 25px">${btn}</div>`}</div>`;
  const key=_keyDeIdx(d.idx); let h="", pend=0;
  (CG_SIM[gid]||[]).forEach((x,i)=>{ pend++; h+=fila(false,`Ayuda${x.nombre?" a "+escH(x.nombre):""} (${fmtEur(x.v)} €)<br><small style="color:var(--muted);font-weight:500">Primero hay que pedirla</small>`,b("📝 Pedirla",`solDesdeSim('${gid}',${i})`)); });
  d.sols.forEach(x=>{ pend++; h+=fila(false,`Ayuda a ${escH(x.nombre)} (${fmtEur(x.v)} €)<br><small style="color:var(--muted);font-weight:500">Al aprobarla queda apuntada en su cuenta</small>`,b("✅ Aprobarla",`solOtorgar('${esc(x.id)}')`)); });
  d.sal.forEach(x=>{ pend++; h+=fila(false,`Salida de ${escH(x.nombre)} (${fmtEur(x.v)} €)`,b("✅ Apuntar como pagada",`cgSalidaReal('${gid}','${esc(x.mid)}')`)); });
  _cgMovs(key,gid).filter(x=>x.tipo==="ayuda"||x.tipo==="salida").forEach(x=>{ h+=fila(true,`${x.tipo==="ayuda"?"Ayuda a":"Salida de"} ${escH(x.nombre||"")} (${fmtEur(x.importe)} €): apuntada en su cuenta`,""); });
  return `<div style="margin-top:10px;background:#fff;border:2px solid #1B4332;border-radius:10px;padding:10px 12px">
    <div style="font-size:14px;font-weight:800;color:#1B4332;margin-bottom:4px">Para hacerlo real</div>${h}
    <div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.35">Cada cosa hecha pasa a la cuenta real de arriba. Cuando esté todo, este plan desaparece solo.</div></div>`;
}
// v45.73: «Ya le he pasado los X €»: lo que pone la asociación (en mano o Bizum); cierra la cuenta del mes
function cgPagoAsociacion(gid){
  const g=gruposCierre().find(x=>x.id===gid); if(!g||_mesBloqueado())return;
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), f=_cgCascada(g,idx).falta; if(!(f<0))return; // v46.67: lo que le debes según la cascada
  _cgW(getMesKey(DATA.reportMonth,DATA.reportYear),gid).movs.push({id:"cg"+Date.now()+Math.random().toString(36).slice(2,6),tipo:"pago",importe:_r2(-f),fecha:_cgHoy()});
  delete CG_SIM_REAL[gid]; save(); render(); toast("✅ Apuntado: le has pasado "+fmtEur(-f)+" €");
}
function cgSimEnviar(gid){ const t=_cgPlanTexto(gid); if(t)_cgAbrirWA(t,null); }
function _cgPlanTexto(gid){
  const g=gruposCierre().find(x=>x.id===gid); if(!g)return "";
  const p=DATA.members.find(m=>m.id===g.principalId); if(!p)return "";
  const d=_cgDatosSim(g), nom=p.name.split(" ")[0], mes=_txtIdx(d.idx).split(" ")[0], e=v=>fmtEur(v)+" €";
  // v45.68: en palabras del responsable, no las cuentas internas del administrador (revisión de Ángel 31/10/2026)
  const lista=a=>a.length===1?`*${a[0]}*`:`*${a.slice(0,-1).join(", ")}* y *${a[a.length-1]}*`;
  const ays=[...d.sols,...d.sim], quien=ays.map(x=>x.nombre).filter(Boolean), partes=[];
  if(ays.length)partes.push(`damos ${ays.length>1?(quien.length===ays.length?"las ayudas":"estas ayudas"):"la ayuda"}${quien.length?" a "+lista(quien):""}`);
  if(d.sal.length)partes.push(`le pagamos a ${lista(d.sal.map(x=>x.nombre))} ${d.sal.length>1?"sus salidas":"su salida"}`);
  let t=partes.length?`Hola ${nom} 👋\nAsí quedaría *${mes}* si ${partes.join(" y ")} con el dinero que recoges de tu grupo:\n\n`:`Hola ${nom} 👋\nAsí va *${mes}* con el dinero que recoges de tu grupo:\n\n`; // v46.7: sin plan, la frase quedaba a medias
  // v45.72: la cuenta como un ticket (columnas alineadas, letra de ancho fijo de WhatsApp) y el resultado al final
  const fil=[["Total del mes",d.total]];
  if(d.arrastre)fil.push(["Del mes pasado",d.arrastre]);
  if(d.directo)fil.push(["Me pagaron a mí",-d.directo]); // v46.67
  if(d.entregado)fil.push(["Ya me has entregado",-d.entregado]);
  if(d.ayudas)fil.push(["Ayudas ya dadas",-d.ayudas]);
  if(d.salidasYa)fil.push(["Salidas ya pagadas",-d.salidasYa]);
  if(d.pagado)fil.push(["Ya te pasé",d.pagado]);
  const pn=n=>String(n||"").split(" ")[0];
  d.sols.forEach(x=>fil.push([`Ayuda a ${pn(x.nombre)} (${x.n} ${x.n===1?"cuota":"cuotas"} de ${fmtEur(x.cuota)} €)`,-x.v])); // v46.8
  d.sim.forEach((x,i)=>fil.push([x.nombre?"Ayuda a "+pn(x.nombre):"Ayuda"+(d.sim.length>1?" "+(i+1):""),-x.v]));
  d.sal.forEach(x=>fil.push(["Salida de "+pn(x.nombre),-x.v]));
  t+=_cgTicket(fil,d.resto,"LO PONE LA ASOCIACIÓN");
  { const pq=_cgParaQue(ays.map(x=>x.nombre).filter(Boolean),d.sal.map(x=>x.nombre));
    t+= d.resto>0?"" /* v45.76: «FALTA POR ENTREGAR» ya lo dice la tabla */:d.resto===0?`\n👉 *No me tienes que entregar nada más*`:`\n💚 *${pq?"Para completar "+pq+" faltan":"Faltan"} ${e(-d.resto)}: te los paso yo*`; } // v46.8
  t+=`\n\nEs una propuesta. Dime si estás de acuerdo y lo hacemos.`;
  t+=`\n\nNuevos Horizontes · Construyendo un nuevo sistema`;
  return t.replace(/\n{3,}/g,"\n\n"); // v45.76: sin líneas vacías de más
}
// v46.7: abre WhatsApp con el texto; con teléfono va directo a su chat, sin teléfono WhatsApp deja elegir el chat
function _cgAbrirWA(t,tel){
  if(tel){ window.open("https://wa.me/"+tel+"?text="+encodeURIComponent(t),"_blank"); return; }
  if(navigator.share){ navigator.share({text:t}).then(()=>toast("Compartido ✓")).catch(x=>{if(x.name!=="AbortError")window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");}); }
  else window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");
}
// v46.7 (Ángel 07/11/2026): antes de enviar, ver el mensaje y poder mandarlo a otro chat (el suyo) para comprobarlo
function cgEnvioAbrir(gid,tipo){ openModal('cg_envio',{gid,tipo}); }
function _cgEnvioTexto(){ return MODAL.tipo==="plan"?_cgPlanTexto(MODAL.gid):_cgCuentaTexto(MODAL.gid); }
function _waVista(t){ return escH(t).replace(/`([^`]*)`/g,'<span style="font-family:ui-monospace,Menlo,Consolas,monospace;white-space:pre">$1</span>').replace(/\*([^*\n]+)\*/g,"<b>$1</b>").replace(/\n/g,"<br>"); }
function cgEnvioModalHTML(){
  const g=gruposCierre().find(x=>x.id===MODAL.gid), p=g&&DATA.members.find(m=>m.id===g.principalId); if(!p)return "";
  const nom=p.name.split(" ")[0], t=_cgEnvioTexto(), tel=_telWA(p.phone);
  return `<div class="modal-title">💬 ${MODAL.tipo==="plan"?"Propuesta para":"Cuenta de"} ${escH(nom)}</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:8px">Así le llegará:</div>
    <div style="background:#DCF8C6;border-radius:10px;padding:10px 12px;font-size:14px;line-height:1.45;color:#111;margin-bottom:12px;overflow-x:auto">${_waVista(t)}</div>
    <button class="m-primary" style="background:#25D366" onclick="cgEnvioEnviar('resp')">💬 Enviar a ${escH(nom)}${tel?"":" (eliges su chat)"}</button>
    <button class="m-sec" style="margin-top:8px" onclick="cgEnvioEnviar('otro')">📲 Enviar a otro chat (por ejemplo, el tuyo)</button>
    <button class="m-sec" style="margin-top:8px" onclick="cgEnvioEnviar('copiar')">📋 Copiar el texto</button>
    <button class="m-sec" style="margin-top:8px;opacity:.8" onclick="closeModal()">Cancelar</button>`;
}
function cgEnvioEnviar(modo){
  const g=gruposCierre().find(x=>x.id===MODAL.gid), p=g&&DATA.members.find(m=>m.id===g.principalId); if(!p)return;
  const t=_cgEnvioTexto();
  if(modo==="copiar"){ if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>toast("📋 Texto copiado ✓")).catch(()=>toast("No se pudo copiar")); else toast("No se pudo copiar"); return; }
  if(modo==="otro")window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank"); // WhatsApp deja elegir cualquier chat
  else _cgAbrirWA(t,_telWA(p.phone)); // v46.8: la propuesta también va directa a su chat si hay teléfono
  closeModal();
}
// v45.15: enviar el estado real de la cuenta del grupo por WhatsApp
function cgEnviarCuenta(gid){ const g=gruposCierre().find(x=>x.id===gid), p=g&&DATA.members.find(m=>m.id===g.principalId); const t=_cgCuentaTexto(gid); if(t)_cgAbrirWA(t,p?_telWA(p.phone):null); }
function _cgCuentaTexto(gid){
  const g=gruposCierre().find(x=>x.id===gid); if(!g)return "";
  const p=DATA.members.find(m=>m.id===g.principalId); if(!p)return "";
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), cc=_cgCascada(g,idx), movs=cc.movs, falta=cc.falta; // v46.67: la cuenta en cascada
  const nom=p.name.split(" ")[0], mes=MONTHS_FULL[MONTHS.indexOf(DATA.reportMonth)].toLowerCase(), e=v=>fmtEur(v)+" €";
  const mesDe=k=>MONTHS_FULL[+k.slice(5)-1].toLowerCase();
  // v46.69 (Maestro v18.91 · GE-7, formato de Ángel del 26/11/2026): si hay algo de meses anteriores sin entregar o personas de este mes
  // en «lo tiene», la cuenta va en este formato corto. Si no, el ticket de siempre.
  { const pend=_cgRetPendiente(g,idx), pendRest=_r2(pend.reduce((a,l)=>a+l.resta,0));
    if((pendRest>0||cc.ret>0)&&falta>0){
      const hoy=new Date(), f2=n=>String(n).padStart(2,"0"), fecha=f2(hoy.getDate())+"/"+f2(hoy.getMonth()+1)+"/"+hoy.getFullYear();
      let t=`Hola, ${nom} 👋 Cuenta de tu grupo a ${fecha}:\n`;
      _cgLineasAntes(pend).forEach(L=>{ t+=`• ${L.titulo}: ${e(L.v)} (${L.tipo==="acordado"?(L.sub||"acordado"):L.personas.join(", ")})\n`; });
      const N=_r2(cc.total-cc.directo), mesPart=_r2(falta-pendRest);
      t+=`• ${mes.charAt(0).toUpperCase()+mes.slice(1)}: ${e(N)}, entregado ${e(_r2(N-mesPart))}\n*Falta por entregar: ${e(falta)}*\nGracias 🙌 Nuevos Horizontes · Construyendo un nuevo sistema`;
      return t;
    } }
  // v45.73: ticket; el encabezado y el final dicen en qué punto está la cuenta (pendiente, hecha y por pasarle, cerrada)
  const fil=[["Total del mes",cc.total]], pn=n=>String(n||"").split(" ")[0];
  movs.forEach(x=>{ if(x.tipo==="arrastre")fil.push(["Pendiente de "+mesDe(x.de),x.importe]); });
  if(cc.directo)fil.push(["Me pagaron a mí",-cc.directo]);
  movs.forEach(x=>{ // v46.68: la misma suma que en la app, línea a línea
    if(x.tipo==="entrega")fil.push(["Entregado a cuenta"+(x.fecha?" "+x.fecha:""),-x.importe]);
    else if(x.tipo==="ayuda")fil.push(["Ayuda a "+pn(x.nombre),-x.importe]);
    else if(x.tipo==="salida")fil.push(["Salida de "+pn(x.nombre),-x.importe]);
  });
  if(cc.sinEntrega)fil.push(["Pagados sin entrega anotada",-cc.sinEntrega]);
  movs.forEach(x=>{
    if(x.tipo==="pago")fil.push(["Te pasé"+(x.fecha?" "+x.fecha:""),x.importe]);
    else if(x.tipo==="pasado")fil.push(["Pasado a "+mesDe(x.a),-x.importe]);
  });
  const conPago=movs.some(x=>x.tipo==="pago"), conPagos=movs.some(x=>x.tipo==="ayuda"||x.tipo==="salida");
  const cab=falta<0?`✅ Hecho. Tus cuentas de *${mes}*:`:falta===0&&(conPago||conPagos)?`✅ Cuenta de *${mes}* cerrada:`:`Tus cuentas de *${mes}*:`;
  const pq=_cgParaQue(movs.filter(x=>x.tipo==="ayuda").map(x=>x.nombre).filter(Boolean),movs.filter(x=>x.tipo==="salida").map(x=>x.nombre).filter(Boolean)); // v46.8
  let t=`Hola ${nom} 👋\n${cab}\n\n`+_cgTicket(fil,falta,conPagos?"LO PONE LA ASOCIACIÓN":"A TU FAVOR");
  { const td=falta>0?_cgTarde(g,idx):[]; if(td.length){ // v46.38: lo que paga más tarde se resta aparte y se dice lo que falta ahora
    const tt=_r2(td.reduce((a,x)=>a+x.v,0)), cif=v=>fmtEur(Math.abs(v))+" €", W=Math.max(cif(falta).length,...fil.map(f=>cif(f[1]).length));
    const cj=(s,v)=>"`"+s+" ".repeat(W-cif(v).length+1)+cif(v)+"`";
    t+=td.map(x=>cj("-",x.v)+" Paga más tarde: "+pn(x.nombre)+(x.dia?" (día "+x.dia+")":"")).join("\n")+"\n━━━━━━━━\n"+cj("=",Math.max(0,_r2(falta-tt)))+" *FALTA AHORA*\n"; } }
  t+= falta>0?"" /* v45.76: «FALTA POR ENTREGAR» ya lo dice la tabla */:falta<0?(conPagos?`\n💚 *${pq?"Para completar "+pq+" faltan":"Faltan"} ${e(-falta)}: te los paso yo*`:`\n👉 *Me has entregado ${e(-falta)} de más: te los devuelvo*`):`\n✅ *Todo cuadrado. ¡Gracias!*`;
  t+=`\n\nNuevos Horizontes · Construyendo un nuevo sistema`;
  return t.replace(/\n{3,}/g,"\n\n"); // v45.76: sin líneas vacías de más
}
// ══ v45.43 · ENVIAR LAS CUENTAS A LOS RESPONSABLES, UNA TRAS OTRA ══════════════════════════════
// Un botón en Cobros abre esta ventana: WhatsApp se abre con la cuenta del primero; al volver a la
// app sale «Siguiente: …». La app no envía nada sola: Ángel toca «Enviar» en WhatsApp cada vez.
function _cgColaLista(todos){
  const rm=DATA.reportMonth, ry=DATA.reportYear, key=getMesKey(rm,ry), pre=cuotasDelMes(rm,ry);
  return gruposCierre().map(g=>({g,p:DATA.members.find(m=>m.id===g.principalId)})).filter(x=>x.p)
    .map(x=>Object.assign(x,{d:_cgTarjetaDatos(x.g,pre,key)}))
    .filter(x=>x.d.items.length&&(todos||(!x.d.cerrada&&!x.d.cuadrada&&x.d.falta>0)));
}
function abrirColaCuentas(){ const deben=_cgColaLista(false).length; openModal('cg_cola',{todos:deben===0,hechos:[]}); }
function cgColaEnviar(gid){
  cgEnviarCuenta(gid); // primero WhatsApp (en el iPhone tiene que ir dentro del mismo toque)
  if(MODAL&&MODAL.type==="cg_cola"&&!MODAL.hechos.includes(gid)){ MODAL.hechos.push(gid); render(); }
}
function cgColaModalHTML(){
  const todos=!!MODAL.todos, lista=_cgColaLista(todos), nDeben=_cgColaLista(false).length, nTodos=_cgColaLista(true).length;
  const mes=MONTHS_FULL[MONTHS.indexOf(DATA.reportMonth)].toLowerCase(), sig=lista.find(x=>!MODAL.hechos.includes(x.g.id));
  const pos=sig?lista.indexOf(sig)+1:0;
  const chip=(v,t)=>`<button onclick="MODAL.todos=${v};render()" class="cgt-b ${todos===v?"pri":""}" style="min-height:40px">${t}</button>`;
  let h=`<div class="modal-title">💬 Cuentas de ${mes} a los responsables</div>
    <div class="cgt-btns" style="margin:0 0 10px">${chip(false,`Los que deben (${nDeben})`)}${chip(true,`Todos (${nTodos})`)}</div>`;
  if(!lista.length)return h+`<div class="ini-sin" style="margin:6px 0 14px">Nadie te debe nada este mes. Si quieres mandar la cuenta igualmente, elige «Todos».</div><button class="m-sec" onclick="closeModal()">Cerrar</button>`;
  h+=`<div style="font-size:13.5px;color:var(--muted);margin-bottom:10px;line-height:1.4">Se abre WhatsApp con su cuenta ya escrita. Envíala y vuelve aquí: te saldrá el siguiente.</div>`;
  lista.forEach(({g,p,d})=>{ const ok=MODAL.hechos.includes(g.id);
    h+=`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:800;color:var(--dark)">${escH(p.name)}</div>
      <div style="font-size:13px;color:var(--muted)">${d.cerrada?"✅ Liquidado":d.cuadrada?"Cuenta cuadrada · faltan "+d.sinMarcar+" por cobrar":d.falta>0?"Faltan "+fmtEur(d.falta)+" €":"Revisar"}</div></div>
      ${ok?`<span style="font-size:13.5px;font-weight:800;color:#1B7A3D;white-space:nowrap">✓ Enviada</span>`:""}
      <button class="cgt-b ${ok?"":"sec"}" style="flex:0 0 auto;min-width:84px" onclick="cgColaEnviar('${g.id}')">${ok?"Otra vez":"Enviar"}</button></div>`; });
  h+=sig?`<button class="cgt-b pri" style="width:100%;min-height:52px;margin-top:14px;font-size:16px;background:#15803D;border-color:#15803D" onclick="cgColaEnviar('${sig.g.id}')">💬 ${MODAL.hechos.length?"Siguiente: ":"Enviar a "}${escH(sig.p.name.split(" ")[0])} (${pos} de ${lista.length})</button>`
    :`<div style="margin-top:14px;padding:11px;border-radius:12px;background:#E3F1E7;color:#1B7A3D;font-weight:800;text-align:center">✅ Enviadas todas</div>`;
  return h+`<button class="m-sec" style="margin-top:8px" onclick="closeModal()">Cerrar</button>`;
}
function cgSimQuitar(gid,i){ if(i==null){ const g=gruposCierre().find(x=>x.id===gid); delete CG_SIM[gid];delete CG_SIM_MES[gid];delete CG_SIM_ON[gid];delete CG_SIM_REAL[gid];
    if(g){ CG_SIM_SAL[gid]=_cgSalidasPend(g).map(x=>x.m.id); CG_SIM_SOLX[gid]=_cgSolsPend(g,_idxMes(DATA.reportMonth,DATA.reportYear)).map(x=>x.id); } } else { CG_SIM[gid].splice(i,1); if(!CG_SIM[gid].length){delete CG_SIM[gid]; if(!CG_SIM_SAL[gid])delete CG_SIM_MES[gid];} } render(); }
function _cgMovs(key,gid){ const c=DATA.cuentasGrupo&&DATA.cuentasGrupo[key]&&DATA.cuentasGrupo[key][gid]; return (c&&c.movs)||[]; }
function _cgW(key,gid){ if(!DATA.cuentasGrupo)DATA.cuentasGrupo={}; if(!DATA.cuentasGrupo[key])DATA.cuentasGrupo[key]={}; if(!DATA.cuentasGrupo[key][gid])DATA.cuentasGrupo[key][gid]={movs:[]}; return DATA.cuentasGrupo[key][gid]; }
function _cgTotal(g,idx){ const {mes,anio}=_mesDeIdx(idx); return _r2(itemsDeGrupo(g,mes,anio).reduce((s,it)=>s+it.importe,0)); }
// Lo que falta por entregar en el mes idx: total + arrastre − entregas − ayudas − pasado al mes siguiente
function _cgFaltaApuntes(g,idx){ // solo con lo apuntado en la cuenta
  const movs=_cgMovs(_keyDeIdx(idx),g.id); let f=_cgTotal(g,idx);
  movs.forEach(x=>{ f+= (x.tipo==="arrastre"||x.tipo==="pago")? x.importe : -x.importe; }); // v45.73: «pago» = lo que la asociación le pasa al responsable
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
// v46.67 (Ángel 26/11/2026): CUENTA CON EL JEFE DE GRUPO EN CASCADA. Es lo que se ve y se anota en Cobros (tarjeta de fuera,
// tarjeta de dentro, «Liquidado», mensaje de WhatsApp). NO cambia _cgFaltaApuntes/_cgResto/_cgFalta (auditoría, Cuadre 3) ni
// lo que leen sync_nh.py y nh_balance.py: no cambia ningún cálculo del fondo.
// · Marcar a alguien como pagado = «te lo entregó su jefe»: resta de la cuenta (ya no hace falta tener todo el grupo marcado).
// · «Me pagó a mí» (pago directo): DATA.cuentasGrupo[mes][gid].directo=[mid], APARTE de movs (como «tarde»): no resta de lo
//   entregado por el jefe, sale del total que él tiene que recoger.
// · «Pagado» (Ángel 26/11/2026, opción B) = el dinero de esa persona ya está resuelto con el fondo: el jefe te lo entregó o lo
//   usó en una ayuda (o salida) aprobada. Lo marcado cubre PRIMERO lo que el jefe ya ha usado (entregas a cuenta, ayudas y
//   salidas), para no restar dos veces: se resta lo mayor entre lo marcado y lo usado (solape = lo que no se resta dos veces).
function _cgDirectos(g,idx){ const k=_keyDeIdx(idx), c=DATA.cuentasGrupo&&DATA.cuentasGrupo[k]&&DATA.cuentasGrupo[k][g.id]; return (c&&c.directo)||[]; }
// v46.69 (Maestro v18.91 · GE-7, Ángel 26-27/11/2026): «LO TIENE EL RESPONSABLE». La persona ya pagó a su responsable y él aún no lo ha
// entregado: sigue MARCADA como pagada (al día en las dos apps, beneficio, Excel), pero su dinero no cuenta para ayudas hasta que él lo entregue.
// DATA.cuentasGrupo[mes][gid].tiene=[mid,…] (en el orden en que se marcan), .tieneFecha (fecha acordada, opcional) y .acordado={importe,nota,fecha}
// («Pendiente anterior acordado»): APARTE de movs, como directo y tarde, así _cgFaltaApuntes/_cgFalta (cuadre 3) no cambian y sync_nh.py no lo lee.
function _cgCfg(g,idx){ const k=_keyDeIdx(idx); return (DATA.cuentasGrupo&&DATA.cuentasGrupo[k]&&DATA.cuentasGrupo[k][g.id])||{}; }
function _cgTiene(g,idx){ const c=_cgCfg(g,idx), dir=new Set(c.directo||[]); return (c.tiene||[]).filter(x=>!dir.has(x)); }
function _idxDeKey(k){ const [y,m]=String(k).split("-").map(Number); return y*12+m-1; }
// Reparto de lo que usa el responsable (entregas, ayudas y salidas), del más antiguo al más nuevo. Solo calcula (el render nunca escribe).
// Cada mes: 1) cubre lo pendiente de meses anteriores (cola; «acordado» delante); 2) cubre a las personas resueltas de ese mes (opción B);
// 3) lo que sobre cubre a las de «lo tiene» de ese mes, enteras y en el orden en que se marcaron. Lo no cubierto pasa solo al mes siguiente.
// Un lote cubierto del todo = esa persona pasa sola a «Resuelto» (lote.cubierto = mes en que se cubrió). Nada se escribe en los meses cerrados.
function _cgRet(g){
  const mk="cgret|"+g.id; if(_MEMO_RENDER&&_MEMO_RENDER[mk])return _MEMO_RENDER[mk];
  const keys=Object.keys(DATA.cuentasGrupo||{}).filter(k=>{ const c=DATA.cuentasGrupo[k]&&DATA.cuentasGrupo[k][g.id]; return c&&((c.tiene&&c.tiene.length)||(c.acordado&&c.acordado.importe>0)||(c.tieneSin&&c.tieneSin.importe>0)); }).sort();
  const out={meses:{},lotes:[]};
  if(keys.length){
    const S=a=>_r2(a.reduce((s,x)=>s+(+x.importe||0),0)), cola=[];
    // hasta el último mes con algo apuntado en la cuenta de este grupo (así, mirando un mes antiguo, se ve si lo entregó después)
    const conDatos=Object.keys(DATA.cuentasGrupo||{}).filter(k=>DATA.cuentasGrupo[k]&&DATA.cuentasGrupo[k][g.id]).sort();
    const ini=_idxDeKey(keys[0]), fin=Math.max(_idxMes(DATA.reportMonth,DATA.reportYear),_idxDeKey(conDatos[conDatos.length-1]));
    for(let i=ini;i<=fin;i++)_sinCrearMes(i,()=>{
      const {mes,anio}=_mesDeIdx(i), c=_cgCfg(g,i), movs=c.movs||[], dir=new Set(c.directo||[]), tiene=_cgTiene(g,i), ts=new Set(tiene);
      const sinRaw=(c.tieneSin&&c.tieneSin.importe>0)?_r2(c.tieneSin.importe):0;
      const items=(tiene.length||sinRaw||movs.length||cola.some(l=>l.resta>0))?itemsDeGrupo(g,mes,anio):[];
      if(c.acordado&&c.acordado.importe>0){ const l={mes:i,tipo:"acordado",nombre:"",nota:c.acordado.nota||"",importe:_r2(c.acordado.importe),resta:_r2(c.acordado.importe),fecha:c.acordado.fecha||"",cubierto:null};
        cola.unshift(l); out.lotes.push(l); }
      const inicio=cola.filter(l=>l.resta>0).map(l=>({mes:l.mes,tipo:l.tipo,mid:l.mid,nombre:l.nombre,nota:l.nota,fecha:l.fecha,resta:l.resta}));
      const usado=S(movs.filter(x=>x.tipo==="entrega"||x.tipo==="ayuda"||x.tipo==="salida"));
      let pool=usado; const cov=[];
      cola.forEach(l=>{ if(pool<=0||l.resta<=0)return; const v=_r2(Math.min(l.resta,pool)); l.resta=_r2(l.resta-v); pool=_r2(pool-v); cov.push({mes:l.mes,tipo:l.tipo,mid:l.mid,v}); if(l.resta<=0)l.cubierto=i; });
      const covAnt=_r2(usado-pool), P0=S(items.filter(it=>it.yaPagado&&!dir.has(it.mid)&&!ts.has(it.mid)));
      // v46.69 (Ángel 27/11/2026): «Lo tiene el responsable, sin persona»: dinero de personas ya resueltas que él aún no ha entregado
      // (lo que le sobró del grupo). Sale de lo resuelto (como mucho, lo resuelto) y es un lote más del mes, delante de las personas.
      const sinP=_r2(Math.min(sinRaw,P0)), P=_r2(P0-sinP);
      pool=_r2(pool-Math.min(P,pool));
      const propios=[];
      if(sinP>0){ const cub=_r2(Math.min(sinP,Math.max(0,pool))), l={mes:i,tipo:"sin",nombre:"",nota:c.tieneSin.nota||"",importe:sinP,resta:_r2(sinP-cub),fecha:c.tieneFecha||"",cubierto:null};
        pool=_r2(pool-cub); if(l.resta<=0)l.cubierto=i; propios.push(l); out.lotes.push(l); cola.push(l); }
      tiene.forEach(mid=>{ const v=S(items.filter(it=>it.mid===mid&&it.yaPagado)); if(!(v>0))return;
        const m=DATA.members.find(x=>x.id===mid), cub=_r2(Math.min(v,Math.max(0,pool)));
        const l={mes:i,tipo:"persona",mid,nombre:m?m.name:"",importe:v,resta:_r2(v-cub),fecha:c.tieneFecha||"",cubierto:null}; pool=_r2(pool-cub);
        if(l.resta<=0)l.cubierto=i; propios.push(l); out.lotes.push(l); cola.push(l); });
      out.meses[i]={sinP,inicio,antes:_r2(inicio.reduce((a,l)=>a+l.resta,0)),cov,covAnt,propios,tieneTot:S(propios),ret:_r2(propios.reduce((a,l)=>a+l.resta,0)),colaFin:_r2(cola.reduce((a,l)=>a+Math.max(0,l.resta),0))};
    });
  }
  if(_MEMO_RENDER)_MEMO_RENDER[mk]=out;
  return out;
}
// Líneas «Pendiente anterior acordado» y «Pendiente de <mes>» (una por mes, del más antiguo al más nuevo) a partir de lo pendiente al empezar el mes
function _fechaAcordadaTxt(f){ const m=String(f||"").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?m[3]+"/"+m[2]:String(f||""); }
function _cgLineasAntes(inicio){
  const out=[], porMes={};
  (inicio||[]).forEach(l=>{ if(!(l.resta>0))return;
    if(l.tipo==="acordado"){ out.push({tipo:"acordado",mes:l.mes,titulo:"Pendiente anterior acordado",sub:l.nota||"sin nota",v:l.resta,personas:[]}); return; }
    let L=porMes[l.mes]; if(!L){ L=porMes[l.mes]={tipo:"mes",mes:l.mes,titulo:"Pendiente de "+_txtIdx(l.mes).split(" ")[0],v:0,personas:[],fecha:l.fecha||""}; }
    L.v=_r2(L.v+l.resta); L.personas.push(l.tipo==="sin"?(l.nota||"sin persona"):String(l.nombre||"").split(" ")[0]); });
  Object.keys(porMes).map(Number).sort((a,b)=>a-b).forEach(i=>{ const L=porMes[i]; L.sub=L.personas.join(", ")+(L.fecha?" · acordado para el "+_fechaAcordadaTxt(L.fecha):""); out.push(L); });
  return out;
}
function _cgRetMes(g,idx){ return _cgRet(g).meses[idx]||null; }
// Lo que queda por entregar de meses anteriores AHORA (lotes sin cubrir de meses antes de «antesDe»), para avisos y WhatsApp
function _cgRetPendiente(g,antesDe){ return _cgRet(g).lotes.filter(l=>l.resta>0&&(antesDe==null||l.mes<antesDe||l.tipo==="acordado")); }
// Pendiente que NO pasa solo (lo de «Pasar a …», a mano): lo que falta − lo de «lo tiene» que pasa solo al mes siguiente
function _cgPendManual(g,idx){ const R=_cgRetMes(g,idx); return _r2(_cgCascada(g,idx).falta-(R?R.colaFin:0)); }
// Para la auditoría, el dinero del mes y el acta: lo que el responsable tiene sin entregar de ese mes (ret) y lo entregado de meses anteriores (covAnt)
function _cgRetCaja(g,idx){ const R=_cgRetMes(g,idx); return {ret:R?R.ret:0,cov:R?R.covAnt:0,colaFin:R?R.colaFin:0}; }
function _cgCascada(g,idx,pre){ return _sinCrearMes(idx,()=>{
  const {mes,anio}=_mesDeIdx(idx), items=itemsDeGrupo(g,mes,anio,pre), movs=_cgMovs(_keyDeIdx(idx),g.id), dir=new Set(_cgDirectos(g,idx));
  const S=a=>_r2(a.reduce((s,x)=>s+(+x.importe||0),0)), T=t=>S(movs.filter(x=>x.tipo===t));
  const R=_cgRetMes(g,idx), ts=new Set(_cgTiene(g,idx)); // v46.69: «lo tiene el responsable» no resta (sigue en lo que falta)
  const total=S(items), directo=S(items.filter(it=>it.yaPagado&&dir.has(it.mid))), personas=_r2(S(items.filter(it=>it.yaPagado&&!dir.has(it.mid)&&!ts.has(it.mid)))-(R?R.sinP:0)); // v46.69: − «sin persona»
  const entregas=T("entrega"), ayudas=T("ayuda"), salidas=T("salida"), pago=T("pago"), arrastre=T("arrastre"), pasado=T("pasado");
  const antes=R?R.antes:0, covAnt=R?R.covAnt:0; // v46.69: pendiente de meses anteriores (pasa solo) y lo que lo entregado este mes cubrió de ahí
  const usado=_r2(entregas+ayudas+salidas), usadoEf=_r2(usado-covAnt), solape=_r2(Math.min(personas,usadoEf)), sinEntrega=_r2(Math.max(0,personas-usadoEf)); // v46.68: «pagados sin entrega anotada»
  const falta=_r2(total-directo+antes+arrastre-usado-sinEntrega+pago-pasado); // v46.68: la suma de las líneas visibles (= opción B) · v46.69: + pendiente de meses anteriores
  // tiene = lo que el jefe puede pagar todavía en ayudas sin que se le deba nada (lo que falta + lo marcado aún sin usar)
  const tiene=_r2(Math.max(0,falta+Math.max(0,personas-usadoEf)));
  return {items,movs,dir,total,directo,personas,entregas,ayudas,salidas,usado,solape,sinEntrega,pago,arrastre,pasado,falta,tiene,todo:items.length>0&&items.every(it=>it.yaPagado),
    ts,antes,covAnt,inicio:R?R.inicio:[],propios:R?R.propios:[],ret:R?R.ret:0,tieneTot:R?R.tieneTot:0,sinP:R?R.sinP:0};
}); }
// «Me pagó a mí»: cambia solo la marca de la persona en la cuenta del jefe (no marca ni desmarca cobros)
function cgDirectoToggle(gid,mid){
  if(_mesBloqueado())return;
  const c=_cgW(getMesKey(DATA.reportMonth,DATA.reportYear),gid), ya=(c.directo||[]).includes(mid);
  c.directo=ya?c.directo.filter(x=>x!==mid):[...(c.directo||[]),mid]; if(!c.directo.length)delete c.directo;
  if(!ya&&c.tiene){ c.tiene=c.tiene.filter(x=>x!==mid); if(!c.tiene.length){ delete c.tiene; delete c.tieneFecha; } } // v46.69: los estados no se mezclan
  save(); render(); toast(ya?"Vuelve a contar como entregado por su jefe":"Apuntado: te pagó a ti (no resta de la cuenta con el jefe)");
}
// v46.69 (GE-7): «Lo tiene el responsable». Si la persona aún no estaba marcada, se marca como pagada (queda al día) en el mismo toque.
// Quitarlo («Ya lo entregó») la deja en «Resuelto». Solo el mes de trabajo y nunca un mes cerrado.
function cgTieneToggle(gid,mid){
  if(_mesBloqueado())return;
  const g=gruposCierre().find(x=>x.id===gid); if(!g)return;
  const key=getMesKey(DATA.reportMonth,DATA.reportYear), c=_cgW(key,gid), ya=(c.tiene||[]).includes(mid), nom=_nomCorto(mid), nj=_nomCorto(g.principalId);
  UNDO_SNAPSHOT=JSON.stringify(DATA);
  if(ya){ c.tiene=c.tiene.filter(x=>x!==mid); if(!c.tiene.length){ delete c.tiene; delete c.tieneFecha; } }
  else {
    const its=itemsDeMiembro(mid,DATA.reportMonth,DATA.reportYear).filter(it=>!it.yaPagado);
    its.forEach(it=>{ if(it.tipo==="aporte"){ const md=getMesData(DATA.reportMonth,DATA.reportYear); if(!md.aportes)md.aportes={}; md.aportes[mid]=true; anotarFechaAporte(md,mid); }
      else { const m=DATA.members.find(x=>x.id===mid); if(m)[...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{ if(l.id===it.lid){ l.pays[it.pi].paid=true; anotarFechaCuota(l.pays[it.pi]); } }); } });
    if(its.some(it=>it.tipo==="cuota"))recolocarAyudas();
    c.tiene=[...(c.tiene||[]).filter(x=>x!==mid),mid];
    if(c.directo){ c.directo=c.directo.filter(x=>x!==mid); if(!c.directo.length)delete c.directo; }
    if(its.length)recalcMesRecargo();
  }
  save(); render(); _avisoDeshacer(ya?`${nom}: ya lo entregó ${nj} (resuelto)`:`${nom}: al día · lo tiene ${nj} sin entregar`);
}
function cgTieneFecha(gid,v){
  if(_mesBloqueado())return;
  const c=_cgW(getMesKey(DATA.reportMonth,DATA.reportYear),gid); v=String(v||"").trim();
  if(v)c.tieneFecha=v; else delete c.tieneFecha; save(); render(); toast(v?"Fecha acordada guardada ✓":"Fecha acordada quitada");
}
// «Pendiente anterior acordado» (lo de antes de la v46.69 sin saber de qué personas es): una entrada por grupo en el mes de trabajo
function cgAcordadoGuardar(gid){
  if(_mesBloqueado())return;
  const v=numES((document.getElementById("cg-acu-imp")||{}).value), nota=String((document.getElementById("cg-acu-nota")||{}).value||"").trim().slice(0,200);
  if(!(v>0)){toast("Escribe el importe acordado");return;}
  _cgW(getMesKey(DATA.reportMonth,DATA.reportYear),gid).acordado={importe:_r2(v),nota,fecha:_cgHoy()};
  CG_FORM=null; save(); render(); toast("Apuntado ✓ · pendiente anterior acordado");
}
function cgTieneSinGuardar(gid){
  if(_mesBloqueado())return;
  const v=numES((document.getElementById("cg-sin-imp")||{}).value), nota=String((document.getElementById("cg-sin-nota")||{}).value||"").trim().slice(0,200);
  if(!(v>0)){toast("Escribe cuánto tiene sin entregar");return;}
  _cgW(getMesKey(DATA.reportMonth,DATA.reportYear),gid).tieneSin={importe:_r2(v),nota,fecha:_cgHoy()};
  CG_FORM=null; save(); render(); toast("Apuntado ✓ · lo tiene el responsable, sin persona");
}
function cgTieneSinBorrar(gid){
  if(_mesBloqueado())return;
  const c=_cgW(getMesKey(DATA.reportMonth,DATA.reportYear),gid); delete c.tieneSin; delete DESP["cgsin-"+gid]; save(); render(); toast("Quitado ✓");
}
function cgAcordadoBorrar(gid){
  if(_mesBloqueado())return;
  const c=_cgW(getMesKey(DATA.reportMonth,DATA.reportYear),gid); delete c.acordado; delete DESP["cgacu-"+gid]; save(); render(); toast("Quitado ✓");
}
// v46.38 (Ángel 11/11/2026): «Paga más tarde». Alguien del grupo paga otro día del mes: sigue pendiente (no se marca
// como cobrado ni cambia la cuenta), pero se aparta de lo que el responsable entrega ahora. Se guarda en
// DATA.cuentasGrupo[mes][gid].tarde=[{mid,dia}] y vale solo para ese mes; cuando esa persona queda cobrada, la línea desaparece sola.
function _cgTarde(g,idx){
  const k=_keyDeIdx(idx), c=DATA.cuentasGrupo&&DATA.cuentasGrupo[k]&&DATA.cuentasGrupo[k][g.id], t=(c&&c.tarde)||[]; if(!t.length)return [];
  const {mes,anio}=_mesDeIdx(idx), items=itemsDeGrupo(g,mes,anio);
  return t.map(x=>{ const m=DATA.members.find(y=>y.id===x.mid);
    return {mid:x.mid,dia:x.dia||"",nombre:m?m.name:"",v:_r2(items.filter(it=>it.mid===x.mid&&!it.yaPagado).reduce((a,it)=>a+it.importe,0))}; }).filter(x=>x.v>0&&x.nombre);
}
function cgTardeQuitar(gid,mid){
  if(_mesBloqueado())return;
  const c=_cgW(getMesKey(DATA.reportMonth,DATA.reportYear),gid); c.tarde=(c.tarde||[]).filter(x=>x.mid!==mid); delete DESP["cgtd-"+gid+"-"+mid];
  save(); render(); toast("Quitado ✓");
}
function _cgHoy(){ const d=new Date(); return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0"); }
function cgAbrir(gid,tipo){ if(tipo!=="sim"&&_mesBloqueado())return; CG_FORM={gid,tipo}; if(tipo!=="tardeP"&&tipo!=="sim")DESP["cgabrir-"+gid]=true; render(); } // v45.46 · v46.72: la cuenta se queda desplegada tras guardar
function cgGuardar(gid){
  if(_mesBloqueado())return; // v45.46: mes cerrado
  const g=gruposCierre().find(x=>x.id===gid); if(!g||!CG_FORM)return;
  const key=getMesKey(DATA.reportMonth,DATA.reportYear);
  if(CG_FORM.tipo==="entrega"){
    const v=numES((document.getElementById("cg-imp")||{}).value);
    if(!(v>0)){toast("Escribe el importe que te ha entregado");return;}
    _cgW(key,gid).movs.push({id:"cg"+Date.now()+Math.random().toString(36).slice(2,6),tipo:"entrega",importe:_r2(v),fecha:_cgHoy()});
  } else if(CG_FORM.tipo==="salida"){ // v45.68: el responsable paga una salida con el dinero del grupo; queda pagada también en Histórico
    const mid=(document.getElementById("cg-salida")||{}).value||""; if(!mid){toast("Elige la salida");return;}
    const x=_cgSalidasPend(g).find(y=>y.m.id===mid); if(!x)return;
    _cgW(key,gid).movs.push({id:"cg"+Date.now()+Math.random().toString(36).slice(2,6),tipo:"salida",importe:x.v,fecha:_cgHoy(),mid,nombre:x.m.name});
    CG_FORM=null; setPagoBaja(mid,"pagada",true); toast("Apuntado ✓ · salida de "+x.m.name.split(" ")[0]+" marcada como pagada"); return;
  } else {
    if(CG_FORM.tipo==="tarde"||CG_FORM.tipo==="tardeP"){ // v46.38 · v46.71: tardeP = desde la persona (Estado › Paga más tarde), lo mismo
      const mid=(document.getElementById("cg-tarde")||{}).value||""; if(!mid){toast("Elige a la persona");return;}
      const dia=+String((document.getElementById("cg-tarde-dia")||{}).value||"").replace(/\D/g,"").slice(0,2), c=_cgW(key,gid);
      c.tarde=(c.tarde||[]).filter(x=>x.mid!==mid); c.tarde.push({mid,dia:(dia>=1&&dia<=31)?String(dia):""});
      CG_FORM=null; save(); render(); toast("Apuntado ✓ · paga más tarde"); return;
    }
    const sel=(document.getElementById("cg-ayuda")||{}).value||""; if(!sel){toast("Elige la ayuda");return;}
    const [mid,lid]=sel.split("|"); const m=DATA.members.find(x=>x.id===mid);
    const l=m&&[...(m.loans||[]),...(m.closedLoans||[])].find(x=>x.id===lid); if(!l)return;
    // v46.67: «Ayuda pagada»: solo la parte que el jefe paga con lo cobrado (lo que pones tú del fondo no entra en su cuenta)
    const vi=String((document.getElementById("cg-ay-imp")||{}).value||"").trim(), v=vi===""?_r2(l.capital):_r2(numES(vi));
    if(!(v>0)){toast("Escribe cuánto pagó con lo cobrado");return;}
    if(v>_r2(l.capital)){toast("No puede ser más que la ayuda ("+fmtEur(l.capital)+" €)");return;}
    const tiene=_cgCascada(g,_idxMes(DATA.reportMonth,DATA.reportYear)).tiene;
    if(v>tiene&&CG_FORM.aviso!==sel+"|"+v){ CG_FORM.aviso=sel+"|"+v; CG_FORM.imp=vi; CG_FORM.sel=sel; render(); return; } // aviso, no bloquea: segundo toque
    _cgW(key,gid).movs.push({id:"cg"+Date.now()+Math.random().toString(36).slice(2,6),tipo:"ayuda",importe:v,fecha:_cgHoy(),mid,lid,nombre:m.name});
  }
  CG_FORM=null; save(); render(); toast("Apuntado ✓");
}
function cgBorrar(gid,mvid){
  if(_mesBloqueado())return; // v45.46: mes cerrado
  const key=getMesKey(DATA.reportMonth,DATA.reportYear), c=_cgW(key,gid), mv=c.movs.find(x=>x.id===mvid);
  if(mv&&mv.tipo==="arrastre"&&mv.de){ const p=_cgW(mv.de,gid); p.movs=p.movs.filter(x=>!(x.tipo==="pasado"&&x.par===mvid)); }
  c.movs=c.movs.filter(x=>x.id!==mvid); delete DESP["cgdel-"+mvid];
  if(mv&&mv.tipo==="salida"&&mv.mid){ setPagoBaja(mv.mid,"pagada",false); return; } // v45.68: vuelve a quedar pendiente
  save(); render();
}
// Pasa lo que quedó pendiente del mes anterior a este mes (queda cerrado allí con «pasado»)
function cgArrastrar(gid){
  if(_mesBloqueado())return; // v45.46: mes cerrado
  const g=gruposCierre().find(x=>x.id===gid); if(!g)return;
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), pk=_keyDeIdx(idx-1), f=_cgPendManual(g,idx-1); if(!(f>0))return; // v46.67: lo pendiente según la cascada · v46.69: sin lo de «lo tiene» (pasa solo)
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
function _cgCerrada(g,pre){ // v45.46: pre = cuotasDelMes del mes (opcional, para no recalcularlo)
  // v45.26: si hay apuntes en la cuenta del grupo, manda la cuenta (liquidada = no falta nada).
  // Sin apuntes, basta con que todo esté marcado como cobrado en el Cierre.
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), items=itemsDeGrupo(g,undefined,undefined,pre);
  // v46.12 (Ángel 07/11/2026): «Liquidado» = cuenta a 0 Y todo el grupo marcado como cobrado. Si la cuenta está a 0
  // pero falta gente por marcar, es «Cuenta cuadrada» (_cgCuadrada), no liquidado.
  if(!(items.length>0&&items.every(it=>it.yaPagado)))return false;
  // v46.67: manda la cuenta en cascada (si da 0, _cgFalta también da 0: la auditoría no cambia)
  return _cgCascada(g,idx,pre).falta===0;
}
function _cgCuadrada(g){ const c=_cgCascada(g,_idxMes(DATA.reportMonth,DATA.reportYear)); return c.items.length>0&&c.falta===0; } // v46.67
// v45.26: en el Cierre está todo cobrado pero la cuenta del responsable no llega → lo que falta por apuntar
function _cgFormHTML(g,idx,key,nom,mesTxt){
  let h=""; if(CG_FORM&&CG_FORM.gid===g.id){
    if(CG_FORM.tipo==="sim"){
      h+=`<label class="m-label" style="margin-top:10px">¿De cuánto sería la ayuda?</label>
        <input id="cg-sim" type="number" inputmode="decimal" class="m-input" placeholder="Ej: 500" style="font-size:16px">
        <label class="m-label">¿Para quién? <span style="font-weight:600;color:var(--muted)">(opcional · escribe y elígelo de la lista)</span></label>
        <input id="cg-sim-nom" type="text" class="m-input" placeholder="Empieza a escribir el nombre…" style="font-size:16px" list="cg-sim-nombres" autocomplete="off">
        <datalist id="cg-sim-nombres">${(()=>{ const ids=[g.principalId,...(g.miembros||[])], act=DATA.members.filter(m=>activoEnReporte(m));
          const del=act.filter(m=>ids.includes(m.id)).sort((a,b)=>a.name.localeCompare(b.name)), resto=act.filter(m=>!ids.includes(m.id)).sort((a,b)=>a.name.localeCompare(b.name));
          return [...del,...resto].map(m=>`<option value="${escH(m.name)}">${m.type==="tercero"?"Tercero":"Asociado"}${ids.includes(m.id)?" · de este grupo":""}</option>`).join(""); })()}</datalist><!-- v45.47: sugiere los nombres registrados -->
        <label class="m-label">¿Para qué mes?${(CG_SIM[g.id]||[]).length?` <span style="font-weight:600;color:var(--muted)">(cambia todo el plan)</span>`:""}</label>
        <select id="cg-sim-mes" class="m-select" style="font-size:15px">${[0,1,2,3].map(k=>{const i=idx+k,t=_txtIdx(i);return `<option value="${i}"${i===_cgSimIdx(g.id)?" selected":""}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`;}).join("")}</select>`; // v45.17
      _cgSolsPend(g,_cgSimIdx(g.id)).forEach(s=>{ h+=`<label style="display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px;border:1.5px solid #D5E3D9;border-radius:10px;background:#fff;font-size:15px;font-weight:700;color:var(--dark)"><input type="checkbox" id="cg-sim-sol-${esc(s.id)}" style="-webkit-appearance:checkbox;appearance:auto;accent-color:#1B4332;flex:none;width:24px;height:24px;margin:0"${(CG_SIM_SOLX[g.id]||[]).includes(s.id)?"":" checked"}> Incluir la solicitud de ${escH(s.nombre)} (${fmtEur(s.capital)} €)</label>`; }); // v45.69: vienen marcadas
      _cgSalidasPend(g).forEach(x=>{ h+=`<label style="display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px;border:1.5px solid #D5E3D9;border-radius:10px;background:#fff;font-size:15px;font-weight:700;color:var(--dark)"><input type="checkbox" id="cg-sim-sal-${esc(x.m.id)}" style="-webkit-appearance:checkbox;appearance:auto;accent-color:#1B4332;flex:none;width:24px;height:24px;margin:0"${(CG_SIM_SAL[g.id]||[]).includes(x.m.id)?"":" checked"}> Incluir la salida de ${escH(x.m.name)} (${fmtEur(x.v)} €)</label>`; }); // v45.68
    } else if(CG_FORM.tipo==="salida"){ // v45.68
      const ps=_cgSalidasPend(g);
      h+=`<label class="m-label" style="margin-top:10px">¿Qué salida ha pagado ${nom}?</label>
        <select id="cg-salida" class="m-select" style="font-size:15px">${ps.map(x=>`<option value="${esc(x.m.id)}">${escH(x.m.name)} · ${fmtEur(x.v)} €</option>`).join("")}</select>
        <div style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.35">Al guardarla, la salida queda marcada como pagada (también en Más › Histórico). Si la borras de aquí, vuelve a quedar pendiente.</div>`;
    } else if(CG_FORM.tipo==="tarde"){ // v46.38
      const {mes:tm,anio:ta}=_mesDeIdx(idx), ya=new Set(_cgTarde(g,idx).map(x=>x.mid)), por={};
      itemsDeGrupo(g,tm,ta).filter(it=>!it.yaPagado&&!ya.has(it.mid)).forEach(it=>{ por[it.mid]=_r2((por[it.mid]||0)+it.importe); });
      const ops=Object.keys(por).map(id=>({id,m:DATA.members.find(x=>x.id===id),v:por[id]})).filter(x=>x.m&&x.v>0).sort((a,b)=>a.m.name.localeCompare(b.m.name));
      h+=ops.length?`<label class="m-label" style="margin-top:10px">¿Quién paga más tarde?</label>
        <select id="cg-tarde" class="m-select" style="font-size:15px"><option value="">— Elegir persona —</option>
        ${ops.map(x=>`<option value="${esc(x.id)}">${escH(x.m.name)} · ${fmtEur(x.v)} €</option>`).join("")}</select>
        <label class="m-label">¿Qué día paga? <span style="font-weight:600;color:var(--muted)">(opcional)</span></label>
        <input id="cg-tarde-dia" type="number" inputmode="numeric" min="1" max="31" class="m-input" placeholder="Ej: 20" style="font-size:16px">
        <div style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.35">No se marca como cobrado: sigue pendiente, pero se aparta de lo que ${nom} te da ahora. Vale solo para ${mesTxt}.</div>`
        :`<div style="margin-top:10px;font-size:13px;color:#6B4210;background:#FFF4E5;border-radius:9px;padding:8px 10px">No queda nadie más de este grupo con algo sin cobrar en ${mesTxt}.</div>`;
    } else if(CG_FORM.tipo==="entrega"){
      h+=`<label class="m-label" style="margin-top:10px">¿Cuánto te ha entregado ${nom} a cuenta?</label>
        <input id="cg-imp" type="number" inputmode="decimal" class="m-input" placeholder="Ej: 300" style="font-size:16px">
        <div style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.35">Dinero entregado sin decir de quién es. Cuando marques como pagada a una persona de su grupo, se descuenta primero de aquí (no se resta dos veces).</div>`; // v46.67
    } else {
      const disp=_cgAyudasDisponibles(key), tiene=_cgCascada(g,idx).tiene, av=CG_FORM.aviso; // v46.67: a quién y cuánto
      h+=disp.length?`<label class="m-label" style="margin-top:10px">¿A quién le ha pagado ${nom} la ayuda?</label>
        <select id="cg-ayuda" class="m-select" style="font-size:15px" onchange="if(CG_FORM){CG_FORM.aviso=null;}"><option value="">— Elegir ayuda de ${mesTxt} —</option>
        ${disp.map(({m,l})=>{ const v=esc(m.id)+"|"+esc(l.id); return `<option value="${v}"${CG_FORM.sel===m.id+"|"+l.id?" selected":""}>${escH(m.name)} · ${fmtEur(l.capital)} €</option>`; }).join("")}</select>
        <label class="m-label">¿Cuánto pagó ${nom} con lo cobrado? <span style="font-weight:600;color:var(--muted)">(si lo dejas vacío, la ayuda entera)</span></label>
        <input id="cg-ay-imp" type="number" inputmode="decimal" class="m-input" placeholder="Ej: 400" value="${escH(CG_FORM.imp||"")}" oninput="if(CG_FORM){CG_FORM.aviso=null;}" style="font-size:16px">
        <div style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.35">Lo que pongas tú con el dinero del fondo no se apunta aquí: no entra en la cuenta con ${nom}.</div>
        ${av?`<div class="cgc-aviso">⚠️ ${nom} solo tiene ${fmtEur(tiene)} €. ¿Seguro? Si lo anotas, le deberás tú la diferencia.</div>`:""}`
        :`<div style="margin-top:10px;font-size:13px;color:#6B4210;background:#FFF4E5;border-radius:9px;padding:8px 10px">No hay ayudas de ${mesTxt} sin apuntar. Primero registra la ayuda como siempre y después la eliges aquí.</div>`;
    }
    h+=`<div style="display:flex;gap:6px;margin-top:8px">
        <button onclick="CG_FORM=null;render()" style="flex:1;padding:10px;border-radius:9px;border:1.5px solid #D9C9B0;background:#fff;color:#6E6048;font-size:13.5px;font-weight:700;cursor:pointer">Cancelar</button>
        <button onclick="${CG_FORM.tipo==="sim"?`cgSimAdd('${g.id}')`:`cgGuardar('${g.id}')`}" style="flex:2;padding:10px;border-radius:9px;border:none;background:${CG_FORM.tipo==="sim"?"#B06A1E":CG_FORM.aviso?"#A63A20":"#1B4332"};color:#fff;font-size:13.5px;font-weight:800;cursor:pointer">${CG_FORM.tipo==="sim"?"Añadir al plan":CG_FORM.aviso?"Sí, anotarla":"Guardar"}</button></div>`;
  }
  return h;
}
// v46.71 (Ángel 28/11/2026): fecha acordada corta para la etiqueta de estado («3 dic»)
function _fechaCortaTxt(f){ const m=String(f||"").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?(+m[3])+" "+["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][+m[2]-1]:String(f||""); }
function cuentaGrupoHTML(g,principal){
  // v46.71 (Ángel 28/11/2026): TARJETA MÁS SIMPLE. SOLO CAMBIA LA VISTA: todas las cifras salen de _cgCascada/_cgRetMes como antes.
  // Arriba la cifra grande y una etiqueta de estado · debajo las líneas de la cuenta (lo retenido, en naranja; al tocarlo, su ficha)
  // · dos botones («Anotar entrega» y «Enviar cuenta») · el resto en «⋯ Más acciones» · la nota del grupo en una línea.
  // Antes (v45.14–v46.70) la cuenta liquidada o sin apuntes salía plegada en una línea («Ver detalle»); ahora se ve siempre.
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), key=_keyDeIdx(idx);
  const nom=escH(principal.name.split(" ")[0]);
  const mesTxt=MONTHS_FULL[((idx%12)+12)%12].toLowerCase(), prevTxt=MONTHS_FULL[(((idx-1)%12)+12)%12].toLowerCase();
  const cerrada=_cgCerrada(g), mc=mesCerrado(key); // cerrada = cuenta liquidada (v45.41) · mc = mes cerrado
  const c=_cgCascada(g,idx), falta=c.falta, total=c.total, formTipo=CG_FORM&&CG_FORM.gid===g.id?CG_FORM.tipo:null;
  // v46.72 (Ángel 28/11/2026): la cuenta sale PLEGADA por defecto en una línea («Cuenta con Marlene ⌄»), porque la cabecera del grupo ya dice
  // lo que falta. Al tocarla se despliega (DESP cgabrir). Solo si hay algo que mirar, una etiqueta corta: le debes al responsable o hay
  // dinero de meses anteriores (retenido, acordado o pendiente de pasar). Con un formulario abierto (cgAbrir) se queda desplegada.
  const abierta=!!DESP["cgabrir-"+g.id]||!!(CG_FORM&&CG_FORM.gid===g.id&&CG_FORM.tipo!=="tardeP");
  if(!abierta){
    const pf0=_cgMovs(_keyDeIdx(idx-1),g.id).length?_cgPendManual(g,idx-1):0;
    const et=falta<0?["rev",`Le debes ${fmtEur(-falta)} €`]:c.antes>0?["pend",`⚠️ ${fmtEur(c.antes)} € de meses anteriores`]:pf0>0?["pend",`⚠️ ${fmtEur(pf0)} € pendientes de ${prevTxt}`]:null;
    return `<button onclick="DESP['cgabrir-${g.id}']=true;render()" class="cgc2-plegada" aria-expanded="false"><span class="cgc2-pl-c"><span class="cgc2-pl-t">💶 Cuenta con ${nom}</span>${et?`<span class="cgc2-chip ${et[0]}">${et[1]}</span>`:""}</span><span class="mg-acc-fl" aria-hidden="true"></span></button>`;
  }
  const P=`'${g.id}'`, pn=n=>escH(String(n||"").split(" ")[0]);
  const ps=c.propios.filter(l=>l.resta>0), rq=_r2(ps.reduce((a,l)=>a+l.resta,0)), fe=_cgCfg(g,idx).tieneFecha||"", ts0=_cgCfg(g,idx).tieneSin;
  const td=falta>0?_cgTarde(g,idx):[], tt=_r2(td.reduce((a,x)=>a+x.v,0)), sm=c.items.filter(it=>!it.yaPagado).length;
  // Etiqueta de estado (corta)
  const chip=falta<0?["rev",`Le debes ${fmtEur(-falta)} €`]
    :rq>0?["pend",`⏳ Lo tiene${fe?" · "+_fechaCortaTxt(fe):""}`]
    :cerrada?["ok","✅ Liquidada"]
    :!c.items.length?["","Nada este mes"]
    :falta===0?["pend",`Cuadrada · ${sm} por marcar`] // v46.12: cuenta a 0 pero falta gente por marcar
    :["pend","⏳ Por entregar"];
  const subC=falta>0?"falta que te entregue":falta<0?`le debes a ${nom}`:cerrada?"no falta nada":"cuenta cuadrada";
  let h=`<div class="cgc2${falta<0?" debe":""}">
    <button class="cgc2-tit" onclick="cgPlegar('${g.id}')" aria-expanded="true"><span style="flex:1;min-width:0">💶 Cuenta con ${nom} · ${mesTxt}</span><span class="mg-acc-fl ab" aria-hidden="true"></span></button>
    <div class="cgc2-cab"><div class="cgc2-res"><b class="cgc2-cifra">${fmtEur(Math.abs(falta))} €</b><span class="cgc2-sub">${subC}${td.length?` · te da ahora <b>${fmtEur(Math.max(0,_r2(falta-tt)))} €</b>`:""}</span></div><span class="cgc2-chip ${chip[0]}">${chip[1]}</span></div>`;
  // Pendiente del mes anterior que no pasa solo (se pasa a mano)
  const pk=_keyDeIdx(idx-1), pf=_cgMovs(pk,g.id).length?_cgPendManual(g,idx-1):0;
  if(pf>0)h+=`<div class="cgc2-aviso"><span style="flex:1 1 10rem;min-width:0">⚠️ En ${prevTxt} quedaron pendientes <b>${fmtEur(pf)} €</b></span><button onclick="cgArrastrar(${P})">Pasar a ${mesTxt}</button></div>`;
  // Las líneas de la cuenta (la misma suma de la v46.68: cada apunte en su línea, con su ✕)
  const borrar=x=>{ if(x.tipo==="pasado"||cerrada)return ""; const k="cgdel-"+x.id, arm=!!DESP[k];
    return `<button class="cgc-x${arm?" arm":""}" onclick="${arm?`cgBorrar(${P},'${x.id}')`:`DESP['${k}']=true;render()`}" aria-label="Borrar este apunte">${arm?"¿Borrar?":"✕"}</button>`; };
  const fr=(l,v,sub)=>`<div class="cgc-fila"><span class="cgc-l">${l}${sub?`<small>${sub}</small>`:""}</span><b class="cgc-v">${v}</b></div>`, mn=v=>(v?"−":"")+fmtEur(v)+" €";
  const frm=(l,v,x,sub)=>`<div class="cgc-fila"><span class="cgc-l">${l}${sub?`<small>${sub}</small>`:""}</span><b class="cgc-v">${v}</b>${borrar(x)}</div>`;
  h+=`<div class="cgc-cuenta cgc2-lineas">`;
  _cgLineasAntes(c.inicio).forEach(L=>{ const miAcu=L.tipo==="acordado"&&L.mes===idx&&!cerrada, k="cgacu-"+g.id, arm=!!DESP[k];
    h+=`<div class="cgc-fila"><span class="cgc-l">${escH(L.titulo)}<small>${escH(L.sub)}</small></span><b class="cgc-v">+${fmtEur(L.v)} €</b>${miAcu?`<button class="cgc-x${arm?" arm":""}" onclick="${arm?`cgAcordadoBorrar(${P})`:`DESP['${k}']=true;render()`}" aria-label="Borrar el pendiente acordado">${arm?"¿Borrar?":"✕"}</button>`:""}</div>`; });
  h+=fr("Total del grupo este mes",fmtEur(total)+" €");
  c.movs.filter(x=>x.tipo==="arrastre").forEach(x=>{ h+=frm("Pendiente del mes anterior","+"+fmtEur(x.importe)+" €",x); });
  if(c.directo)h+=fr("Te pagaron a ti directamente",mn(c.directo),"no pasa por "+nom);
  c.movs.filter(x=>x.tipo==="entrega").forEach(x=>{ h+=frm("Entregado a cuenta",mn(x.importe),x,x.fecha?escH(x.fecha):""); });
  c.movs.filter(x=>x.tipo==="ayuda").forEach(x=>{ h+=frm(`Ayuda a ${pn(x.nombre)}`,mn(x.importe),x,"la pagó "+nom+" con lo cobrado"); });
  c.movs.filter(x=>x.tipo==="salida").forEach(x=>{ h+=frm(`Salida de ${pn(x.nombre)}`,mn(x.importe),x,"la pagó "+nom+" con lo cobrado"); });
  if(c.sinEntrega)h+=fr("Pagados sin entrega anotada",mn(c.sinEntrega),"personas marcadas como pagadas");
  c.movs.filter(x=>x.tipo==="pago").forEach(x=>{ h+=frm("Le has pagado tú","+"+fmtEur(x.importe)+" €",x,x.fecha?escH(x.fecha):""); });
  c.movs.filter(x=>x.tipo==="pasado").forEach(x=>{ h+=frm("Pasado al mes siguiente",mn(x.importe),x); });
  td.forEach(x=>{ const k="cgtd-"+g.id+"-"+x.mid, arm=!!DESP[k]; // v46.38: lo que paga más tarde se aparta de lo que te da ahora
    h+=`<div class="cgc-fila"><span class="cgc-l">🕒 Paga más tarde: ${escH(x.nombre)}${x.dia?`<small>día ${x.dia}</small>`:""}</span><b class="cgc-v">−${fmtEur(x.v)} €</b><button class="cgc-x${arm?" arm":""}" onclick="${arm?`cgTardeQuitar(${P},'${esc(x.mid)}')`:`DESP['${esc(k)}']=true;render()`}" aria-label="Quitar">${arm?"¿Quitar?":"✕"}</button></div>`; });
  // v46.69 (GE-7): lo retenido («lo tiene el responsable»), en naranja. Ya está dentro de la cifra de arriba: estas líneas no suman otra vez.
  const perL=ps.filter(l=>l.tipo!=="sin"), sinL=ps.find(l=>l.tipo==="sin"), kr="cgret-"+g.id, abR=!!DESP[kr];
  const subF=fe?"acordado para el "+_fechaCortaTxt(fe):"sin fecha acordada";
  if(perL.length)h+=`<button class="cgc2-ret" onclick="DESP['${kr}']=!DESP['${kr}'];render()"><span class="cgc-l">👜 Lo tiene ${nom}: ${perL.map(l=>pn(l.nombre)).join(", ")}<small>${subF}</small></span><b class="cgc-v">${fmtEur(_r2(perL.reduce((a,l)=>a+l.resta,0)))} €</b><span class="cgc2-fl" aria-hidden="true">›</span></button>`;
  if(sinL)h+=`<button class="cgc2-ret" onclick="DESP['${kr}']=!DESP['${kr}'];render()"><span class="cgc-l">👜 Lo tiene ${nom}, sin persona<small>${sinL.nota?escH(sinL.nota)+" · ":""}${subF}</small></span><b class="cgc-v">${fmtEur(sinL.resta)} €</b><span class="cgc2-fl" aria-hidden="true">›</span></button>`;
  else if(ts0&&ts0.importe>0&&!mc)h+=`<button class="cgc2-ret ok" onclick="DESP['${kr}']=!DESP['${kr}'];render()"><span class="cgc-l">👜 Sin persona: ${fmtEur(ts0.importe)} €<small>ya entregado</small></span><span class="cgc2-fl" aria-hidden="true">›</span></button>`;
  if(abR&&(ps.length||(ts0&&ts0.importe>0))){ // ficha de lo retenido: fecha acordada, editar o quitar
    const ksin="cgsin-"+g.id, armS=!!DESP[ksin];
    h+=`<div class="cgc2-ficha">${rq>0?`<div>Esas personas están al día, pero estos <b>${fmtEur(rq)} €</b> no cuentan para ayudas hasta que ${nom} los entregue.</div>`:""}
      ${rq>0&&!cerrada?`<label class="cgc-tiene-f">Fecha acordada <span>(opcional)</span><input type="date" value="${escH(fe)}" onchange="cgTieneFecha(${P},this.value)"></label>`:""}
      ${perL.length?`<div style="margin-top:6px;font-size:.85rem;opacity:.85">Para quitar a una persona: tócala abajo › Estado › Ya lo entregó.</div>`:""}
      ${ts0&&ts0.importe>0&&!mc?`<div class="cgc2-ficha-b"><button onclick="DESP['${kr}']=false;cgAbrir(${P},'tienesin')">✏️ Editar «sin persona»</button><button class="${armS?"arm":""}" onclick="${armS?`cgTieneSinBorrar(${P})`:`DESP['${ksin}']=true;render()`}">${armS?`¿Quitar los ${fmtEur(ts0.importe)} €? Toca otra vez`:"✕ Quitar «sin persona»"}</button></div>`:""}</div>`; }
  if(c.ret>0&&!c.propios.some(l=>l.resta>0)){ const cm=Math.max(...c.propios.map(l=>l.cubierto==null?idx:l.cubierto)); // v46.69: ya lo entregó en un mes posterior
    h+=`<div class="cgc-cub">✅ Los ${fmtEur(c.ret)} € que tenía ${nom} de este mes los entregó${cm>idx?" en "+_txtIdx(cm).split(" ")[0]:""}.</div>`; }
  if(c.covAnt>0)h+=`<div class="cgc-cub">✅ ${fmtEur(c.covAnt)} € de lo entregado cubren lo pendiente de meses anteriores.</div>`;
  h+=`</div>`;
  // Formularios que se abren desde los botones («Anotar entrega» o desde «Más acciones»)
  const caja=x=>`<div style="background:#fff;border-radius:12px;padding:2px 14px 12px;margin-top:8px">${x}</div>`;
  if(formTipo==="entrega"||formTipo==="ayuda"||formTipo==="salida"||formTipo==="tarde")h+=caja(_cgFormHTML(g,idx,key,nom,mesTxt));
  if(formTipo==="acordado")h+=caja(`<label class="m-label" style="margin-top:10px">¿Cuánto tenía ${nom} pendiente de antes, sin saber de quién es?</label>
      <input id="cg-acu-imp" type="number" inputmode="decimal" class="m-input" placeholder="Ej: 150" style="font-size:16px">
      <label class="m-label">Nota <span style="font-weight:600;color:var(--muted)">(qué se acordó)</span></label>
      <input id="cg-acu-nota" type="text" class="m-input" maxlength="200" placeholder="Ej: lo de septiembre y octubre" style="font-size:16px">
      <div style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.35">Si sabes de qué personas es, mejor márcalas en su mes como «Lo tiene ${nom}». Esto pasa solo a los meses siguientes hasta que lo entregue y lo entregado lo cubre primero.</div>
      <div style="display:flex;gap:6px;margin-top:8px"><button onclick="CG_FORM=null;render()" class="cgt-b sec" style="flex:1">Cancelar</button><button onclick="cgAcordadoGuardar(${P})" class="cgt-b pri" style="flex:2">Guardar</button></div>`);
  if(formTipo==="tienesin")h+=caja(`<label class="m-label" style="margin-top:10px">¿Cuánto tiene ${nom} de ${mesTxt} sin entregar, sin ser de una persona concreta?</label>
      <input id="cg-sin-imp" type="number" inputmode="decimal" class="m-input" placeholder="Ej: 223" value="${ts0&&ts0.importe>0?escH(String(ts0.importe)):""}" style="font-size:16px">
      <label class="m-label">Nota <span style="font-weight:600;color:var(--muted)">(opcional)</span></label>
      <input id="cg-sin-nota" type="text" class="m-input" maxlength="200" placeholder="Ej: lo que le sobró del grupo" value="${ts0&&ts0.nota?escH(ts0.nota):""}" style="font-size:16px">
      <div style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.35">Las personas siguen como «Resuelto». Este dinero no cuenta para ayudas de ${mesTxt} hasta que lo entregue: pasa solo a los meses siguientes y lo entregado lo cubre primero, como lo demás.</div>
      <div style="display:flex;gap:6px;margin-top:8px"><button onclick="CG_FORM=null;render()" class="cgt-b sec" style="flex:1">Cancelar</button><button onclick="cgTieneSinGuardar(${P})" class="cgt-b pri" style="flex:2">Guardar</button></div>`);
  // Los dos botones grandes
  const conForm=formTipo==="entrega"||formTipo==="ayuda"||formTipo==="salida";
  h+=`<div class="cgc-btns">${!cerrada&&!conForm?`<button class="cgc-b cgc2-b" onclick="cgAbrir(${P},'entrega')">💶 Anotar entrega</button>`:""}<button class="cgc-b cgc2-b wa" onclick="cgEnvioAbrir(${P},'cuenta')">💬 Enviar cuenta</button></div>`;
  // «⋯ Más acciones»: lo demás que se puede anotar (mismas condiciones que antes para cada una)
  const d=_cgDatosSim(g), hayPlan=d.sols.length||d.sal.length, km="cgmas-"+g.id, abM=!!DESP[km], cierra=`DESP['${km}']=false;`;
  const acc=[];
  if(falta<0&&!cerrada)acc.push([`＋ Ya le he pagado los ${fmtEur(-falta)} €`,`${cierra}cgPagoAsociacion(${P})`]);
  if(!cerrada)acc.push([`🤝 Ayuda pagada por ${nom}`,`${cierra}CG_FORM=null;cgAbrir(${P},'ayuda')`]);
  if(!cerrada&&_cgSalidasPend(g).length)acc.push([`🚪 Salida pagada por ${nom}`,`${cierra}cgAbrir(${P},'salida')`]);
  if(!mc&&c.personas>0&&!(ts0&&ts0.importe>0))acc.push([`👜 Lo tiene ${nom}, sin persona`,`${cierra}cgAbrir(${P},'tienesin')`]); // v46.70: también liquidada
  if(falta>0&&!cerrada)acc.push(["🕒 Alguien paga más tarde",`${cierra}cgAbrir(${P},'tarde')`]);
  if(!mc&&!_cgCfg(g,idx).acordado)acc.push(["＋ Pendiente anterior acordado",`${cierra}cgAbrir(${P},'acordado')`]); // v46.70: también liquidada
  if(!hayPlan&&!cerrada)acc.push(["📝 Nueva solicitud para este grupo",`${cierra}solDesdeGrupo(${P})`]);
  acc.push(["Plegar esta cuenta",`${cierra}cgPlegar(${P})`]);
  h+=`<button class="cgc2-mas" aria-expanded="${abM?"true":"false"}" onclick="DESP['${km}']=!DESP['${km}'];render()">⋯ Más acciones</button>`;
  if(abM)h+=`<div class="cgc2-lista">${acc.map(a=>`<button onclick="${a[1]}">${a[0]}</button>`).join("")}</div>`;
  // Propuesta del mes (v46.8): sin cambios
  const futuras=_solsR().filter(s=>s.estado==="pendiente"&&s.grupoGid===g.id&&s.capital>0&&_solMesIdx(s)>idx);
  const futTxt=futuras.length?`<div style="font-size:12.5px;color:var(--muted);margin-top:8px">+ ${futuras.length} ${futuras.length===1?"solicitud":"solicitudes"} para ${[...new Set(futuras.map(s=>_txtIdx(_solMesIdx(s)).split(" ")[0]))].join(", ")} (se verán en su mes)</div>`:"";
  if(!hayPlan){ if(!cerrada)h+=futTxt; }
  else {
    const btn=(t,on,cl)=>`<button onclick="${on}" style="flex:none;border:none;border-radius:8px;padding:7px 10px;background:${cl};color:#fff;font-size:13px;font-weight:800;cursor:pointer">${t}</button>`;
    const it=(ic,txt,sub,v,ok,quitar)=>`<div style="background:#fff;border-radius:10px;padding:9px 11px;margin-top:7px"><div style="display:flex;align-items:center;gap:8px"><span style="flex:1;min-width:0;font-size:15px">${ic} ${txt}<small style="display:block;color:var(--muted);font-size:12.5px">${sub}</small></span><b style="white-space:nowrap;font-size:15px">−${fmtEur(v)} €</b></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">${btn("✕ Quitar",quitar,"#B5422E")}${ok}</div></div>`;
    const ahora=_r2(d.resto+d.solTot+d.salTot);
    h+=`<div style="margin-top:12px;border:2px dashed #B06A1E;background:#FFF8EE;border-radius:14px;padding:12px">
      <div style="font-size:16px;font-weight:800;color:#8A4F12">📝 Propuesta del mes <span style="display:inline-block;background:#94571A;color:#fff;font-size:11px;font-weight:800;letter-spacing:1px;padding:3px 8px;border-radius:20px;vertical-align:middle">PENDIENTE</span></div>
      <div style="font-size:13px;color:#6B4210;margin-top:4px">Ahora: ${ahora>=0?"te entrega "+fmtEur(ahora)+" €":"le pasas "+fmtEur(-ahora)+" €"}</div>`;
    d.sols.forEach(x=>{ h+=it("🤝","Ayuda a "+escH(x.nombre),`${x.n} ${x.n===1?"cuota":"cuotas"} de ${fmtEur(x.cuota)} € · solicitud en Ayudas`,x.v,btn("✅ Aprobar",`solOtorgar('${esc(x.id)}')`,"#1B4332"),`cgSimQuitarSol(${P},'${esc(x.id)}')`); });
    d.sal.forEach(x=>{ h+=it("🚪","Salida de "+escH(x.nombre),"pendiente de pagar",x.v,btn("✅ Pagada",`cgSalidaReal(${P},'${esc(x.mid)}')`,"#1B4332"),`cgSimQuitarSal(${P},'${esc(x.mid)}')`); });
    h+=`<div style="display:flex;justify-content:space-between;align-items:baseline;padding:10px 2px 2px"><b style="color:#8A4F12;font-size:15.5px">${d.resto>0?"Te entregaría":d.resto<0?"Lo pone la asociación":"Justo: no sobra ni falta"}</b>${d.resto!==0?`<b style="font-size:21px;white-space:nowrap;color:${d.resto>0?"#1B4332":"#A63A20"}">${fmtEur(Math.abs(d.resto))} €</b>`:""}</div>
      <button onclick="cgEnvioAbrir(${P},'plan')" style="width:100%;margin-top:8px;padding:11px;border-radius:10px;border:none;background:#25D366;color:#fff;font-size:14.5px;font-weight:800;cursor:pointer">💬 Enviar la propuesta a ${nom}</button>
      <button onclick="solDesdeGrupo(${P})" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1.5px solid #8A4F12;background:#fff;color:#8A4F12;font-size:14px;font-weight:800;cursor:pointer">📝 ＋ Otra solicitud para este grupo</button>${futTxt}</div>`;
  }
  // Nota personal del grupo (v46.67, notas.js): fuera de la contabilidad · v46.71: en una línea; al tocarla se abre
  if(typeof notaGrupoLineaHTML==="function")h+=notaGrupoLineaHTML(g);
  else if(typeof notaGrupoHTML==="function")h+=notaGrupoHTML(g);
  return h+`</div>`;
}
// ══ v45.42 · COBROS POR GRUPOS ══════════════════════════════════════════════════════════════
// Casi todo se cobra a través de los responsables de grupo: Cobros empieza con una tarjeta por grupo.
// «Cobrado» es la misma cuenta que en Inicio › Dinero del mes (dineroAyudasMes): lo marcado como
// cobrado o lo apuntado como entregado, lo que sea mayor. Solo calcula y pinta (el render no escribe).
function cgPlegar(gid){ DESP["cgplegar-"+gid]=false; DESP["cgabrir-"+gid]=false; DESP["cgver-"+gid]=false; if(CG_FORM&&CG_FORM.gid===gid)CG_FORM=null; render(); } // v45.85
// ══ v45.85 · ENVIAR LO QUE TOCA PAGAR EN EL GRUPO (a quien recoge: el responsable u otra persona del grupo) ══
function _cgListaTexto(g,dest){
  const rm=DATA.reportMonth, ry=DATA.reportYear, mes=MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase();
  const p=DATA.members.find(m=>m.id===g.principalId), cifra=v=>fmtEur(v)+" €", filas=[]; let tot=0, cob=0;
  [g.principalId,...(g.miembros||[])].forEach(id=>{ const m=DATA.members.find(x=>x.id===id); if(!m)return; const its=itemsDeMiembro(id,rm,ry); if(!its.length)return;
    filas.push({n:m.name,f:its.map(it=>{ tot+=it.importe; if(it.yaPagado)cob+=it.importe; return [it.tipo==="aporte"?"Aporte":String(it.concepto).replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim(),it.importe,it.yaPagado]; })}); });
  tot=_r2(tot); cob=_r2(cob);
  const W=Math.max(cifra(tot).length,...filas.flatMap(x=>x.f.map(y=>cifra(y[1]).length)));
  const caja=(v,sg)=>"`"+sg+" ".repeat(W-cifra(v).length+1)+cifra(v)+"`";
  let t=`Hola ${String(dest.name||"").split(" ")[0]} 👋\nLo que toca pagar en *${mes}* en el grupo de *${String(p.name||"").split(" ")[0]}*:\n`;
  filas.forEach(x=>{ t+=`\n*${x.n}*\n`+x.f.map(y=>caja(y[1],"+")+" "+y[0]+(y[2]?" ✅":"")).join("\n")+"\n"; });
  t+=`━━━━━━━━\n${caja(tot,"=")} *TOTAL DEL GRUPO*\n`;
  if(cob>0)t+=`\n✅ Ya cobrado: ${cifra(cob)} · Falta: *${cifra(_r2(tot-cob))}*\n`;
  return t+`\nNuevos Horizontes · Construyendo un nuevo sistema`;
}
function cgListaEnviar(gid,mid){
  const g=gruposCierre().find(x=>x.id===gid), d=DATA.members.find(m=>m.id===mid); if(!g||!d)return;
  const t=_cgListaTexto(g,d), tel=_telWA(d.phone); closeModal();
  if(tel){ window.open("https://wa.me/"+tel+"?text="+encodeURIComponent(t),"_blank"); return; }
  if(navigator.share){ navigator.share({text:t}).then(()=>toast("Compartido ✓")).catch(x=>{if(x.name!=="AbortError")window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");}); }
  else window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank");
}
function cgListaModalHTML(){
  const g=gruposCierre().find(x=>x.id===MODAL.gid); if(!g)return "";
  const ids=[g.principalId,...(g.miembros||[])].filter(id=>DATA.members.some(m=>m.id===id));
  return `<div class="modal-title">💬 Enviar lo que toca pagar</div>
    <div style="font-size:13.5px;color:var(--muted);line-height:1.4;margin-bottom:10px">Le llega lo que paga cada persona del grupo este mes y el total. Elige a quién se lo envías (quien recoge el dinero).</div>
    ${ids.map(id=>{ const m=DATA.members.find(x=>x.id===id); return `<button class="m-sec" style="margin-bottom:8px;text-align:left" onclick="cgListaEnviar('${esc(g.id)}','${esc(id)}')">${escH(m.name)}${id===g.principalId?" <span style=\"font-weight:600;opacity:.75\">(responsable)</span>":""}${_telWA(m.phone)?"":" <span style=\"font-weight:500;font-size:12.5px;opacity:.7\">· sin teléfono: eliges el chat</span>"}</button>`; }).join("")}
    <button class="m-sec" style="margin-top:4px;opacity:.8" onclick="closeModal()">Cancelar</button>`;
}
// v46.13: «← Todos los grupos» vuelve al sitio de la lista desde el que se abrió el grupo
let _Y_GRUPOS=0;
function abrirGrupoCobros(gid){
  if(!Object.keys(DESP).some(k=>k.indexOf("grupo-")===0&&DESP[k]))_Y_GRUPOS=window.scrollY||0;
  Object.keys(DESP).forEach(k=>{ if(k.indexOf("grupo-")===0)DESP[k]=false; });
  DESP["grupo-"+gid]=true; CG_FORM=null; render(); window.scrollTo(0,0);
}
// v46.14: tocar el nombre o la flecha del grupo abierto también vuelve a la lista, a la misma altura
function cgDetToggle(gid){ if(DESP["grupo-"+gid]){ DESP["grupo-"+gid]=false; CG_FORM=null; render(); window.scrollTo(0,_Y_GRUPOS||0); } else abrirGrupoCobros(gid); }
// «✓ Todo cobrado»: dos toques (sin confirm), como eliminar
function cgTodoToque(gid){
  const k="cgtodo-"+gid;
  if(!DESP[k]){ DESP[k]=true; render(); setTimeout(()=>{ if(DESP[k]){DESP[k]=false;render();} },4000); return; }
  DESP[k]=false; marcarTodoGrupo(gid);
}
function _cgTarjetaDatos(g,pre,key){
  // v46.67 (Ángel 26/11/2026): la tarjeta de fuera usa LA MISMA cuenta en cascada que la de dentro (antes, lo mayor entre lo
  // marcado y lo entregado: daba otra cifra). «Inicio › Dinero del mes» (dineroAyudasMes) no cambia.
  const c=_cgCascada(g,_idxMes(DATA.reportMonth,DATA.reportYear),pre), items=c.items, total=c.total;
  const pagado=_r2(items.filter(it=>it.yaPagado).reduce((a,it)=>a+it.importe,0)), falta=Math.max(0,c.falta), deMas=Math.max(0,-c.falta);
  const cerrada=_cgCerrada(g,pre), sinMarcar=items.filter(it=>!it.yaPagado).length;
  return {items,total,cobrado:_r2(total-falta),pagado,falta,sinMarcar,cerrada,cuadrada:total>0&&c.falta===0&&!cerrada,entTodo:c.falta<=0&&total>0,deMas:_r2(deMas),c};
}
// v46.69 (GE-7): aviso arriba en Cobros desde el día 1 del mes siguiente si un responsable tiene dinero de meses anteriores sin entregar
// (o un «pendiente anterior acordado»). Usa la fecha de hoy, no el mes de trabajo. Solo calcula.
function cgAvisoRetenidoHTML(){
  const hoy=new Date(), iHoy=hoy.getFullYear()*12+hoy.getMonth(), out=[];
  gruposCierre().forEach(g=>{ const p=DATA.members.find(m=>m.id===g.principalId); if(!p)return;
    const ls=_cgRetPendiente(g,iHoy); if(!ls.length)return;
    const tot=_r2(ls.reduce((a,l)=>a+l.resta,0)), meses=[...new Set(ls.map(l=>l.tipo==="acordado"?"antes (acordado)":_txtIdx(l.mes).split(" ")[0]))];
    const fe=[...new Set(ls.map(l=>l.tipo!=="acordado"?l.fecha:"").filter(Boolean))].map(_fechaAcordadaTxt);
    out.push(`<button class="cgr-aviso" onclick="abrirGrupoCobros('${g.id}')">⚠️ ${escH(p.name.split(" ")[0])} tiene <b>${fmtEur(tot)} €</b> de ${meses.join(", ")} sin entregar${fe.length?` · acordado para el ${fe.join(", ")}`:""} ›</button>`); });
  return out.join("");
}
function cobrosGruposHTML(){
  const rm=DATA.reportMonth, ry=DATA.reportYear, key=getMesKey(rm,ry), pre=cuotasDelMes(rm,ry);
  const grs=gruposCierre().map(g=>({g,p:DATA.members.find(m=>m.id===g.principalId)})).filter(x=>x.p);
  if(!grs.length)return `<div class="mes-card"><div class="mes-title" style="margin-bottom:6px">👥 Grupos</div><div class="ini-sin">Aún no hay grupos. Créalo abajo con «＋ Crear grupo».</div></div>`;
  const datos=grs.map(x=>Object.assign(x,{d:_cgTarjetaDatos(x.g,pre,key)}));
  const nOk=datos.filter(x=>x.d.cerrada).length;
  let h=`<div class="mes-title" style="margin:14px 2px 8px">👥 Grupos <span style="font-weight:600;color:var(--muted)">· ${nOk} de ${datos.length} liquidados</span></div>`;
  h+=`<button class="cgt-b" style="width:100%;min-height:48px;margin:0 0 10px;background:#15803D;border-color:#15803D;color:#fff;font-size:15px" onclick="abrirColaCuentas()">💬 Enviar las cuentas a los responsables</button>`; // v45.43
  datos.forEach(({g,p,d})=>{
    const nom=escH(p.name.split(" ")[0]), ids=[g.principalId,...(g.miembros||[])];
    const nombres=ids.map(id=>(DATA.members.find(m=>m.id===id)||{}).name||"").join(" | ");
    const pct=d.total>0?Math.round(d.cobrado/d.total*100):100; // v46.67: la misma cuenta en cascada que dentro
    const chip=!d.items.length?`<span class="cgt-chip">Nada este mes</span>`
      :d.cerrada?`<span class="cgt-chip ok">✅ Liquidado</span>`
      :d.cuadrada?`<span class="cgt-chip pend">Cuadrada · ${d.sinMarcar} por marcar</span>`
      :d.falta>0?`<span class="cgt-chip pend">Faltan ${fmtEur(d.falta)} €</span>`
      :d.deMas>0?`<span class="cgt-chip rev">Le debes ${fmtEur(d.deMas)} €</span>`
      :d.entTodo&&d.sinMarcar?`<span class="cgt-chip ok">Entregado todo</span>`
      :`<span class="cgt-chip rev">Revisar ›</span>`;
    const armado=!!DESP["cgtodo-"+g.id], formEnt=CG_FORM&&CG_FORM.gid===g.id&&CG_FORM.tipo==="entrega";
    h+=`<div class="cgt${window._DK_SEL===g.id?" dk-sel":""}" data-nombre="${escH(nombres)}">
      <button class="cgt-cab" onclick="abrirGrupoCobros('${g.id}')">
        <span class="cgt-nom">${escH(p.name)}<span class="cgt-sub">${ids.length} ${ids.length===1?"persona":"personas"} · ${d.items.length} ${d.items.length===1?"cobro":"cobros"}</span></span>${chip}</button>`;
    if(d.items.length)h+=`<div class="reserva-bar-bg" style="margin:8px 0 4px"><div class="reserva-bar-fill" style="width:${pct}%"></div></div>
      <div class="cgt-cifras">${d.falta>0?`Falta que te entregue <b>${fmtEur(d.falta)} €</b> de ${fmtEur(d.total)} €`:d.deMas>0?`<b style="color:#A63A20">Le debes a ${nom} ${fmtEur(d.deMas)} €</b>`:`Cuenta con ${nom} a 0 · ${fmtEur(d.total)} €`}</div>`; // v46.67: la misma cifra que la cuenta de dentro
    if(d.entTodo&&d.sinMarcar>0&&!formEnt) // v45.45: ya entregó todo → un toque para marcar sus cobros
      h+=`<div class="cgt-sug">✅ ${d.cuadrada?"La cuenta está cuadrada. Cuando te hayan pagado todos, márcalos aquí:":`${nom} ya te entregó todo. ¿Marcamos sus ${d.sinMarcar} ${d.sinMarcar===1?"cobro":"cobros"} como cobrados?`}
        <button class="cgt-b pri" style="width:100%;margin-top:8px" onclick="marcarTodoGrupo('${g.id}')">✓ Marcar ${d.sinMarcar===1?"su cobro":"sus "+d.sinMarcar+" cobros"}</button></div>`;
    if(formEnt){
      h+=`<label class="m-label" style="margin-top:10px">¿Cuánto te ha entregado ${nom}?</label>
        <input id="cg-imp" type="number" inputmode="decimal" class="m-input" placeholder="Ej: ${d.falta>0?fmtEur(d.falta):"500"}" style="font-size:16px">
        <div class="cgt-btns"><button class="cgt-b sec" onclick="CG_FORM=null;render()">Cancelar</button><button class="cgt-b pri" style="flex:2" onclick="cgGuardar('${g.id}')">Guardar entrega</button></div>`;
    } else if(d.items.length){
      h+=`<div class="cgt-btns">
        ${!d.cerrada?`<button class="cgt-b sec" onclick="cgAbrir('${g.id}','entrega')">＋ Entrega</button>`:""}
        ${d.sinMarcar>0&&!d.entTodo?`<button class="cgt-b ${armado?"arm":"pri"}" onclick="cgTodoToque('${g.id}')">${armado?"¿Todo cobrado? Toca otra vez":"✓ Todo cobrado"}</button>`:""}
        <button class="cgt-b sec" onclick="abrirGrupoCobros('${g.id}')">Abrir ›</button></div>`;
    }
    h+=`</div>`;
  });
  return h;
}
// Crear grupo (antes estaba arriba del Cierre grupal): ahora un botón pequeño debajo de las tarjetas
function crearGrupoHTML(){
  const enGrupo=new Set(); gruposCierre().forEach(g=>{enGrupo.add(g.principalId);(g.miembros||[]).forEach(x=>enGrupo.add(x));});
  const disp=DATA.members.filter(m=>m.type==="asociado"&&!enGrupo.has(m.id)&&activoEnReporte(m)).sort((a,b)=>a.name.localeCompare(b.name));
  if(!DESP["cg-crear"])return `<button class="cgt-crear" onclick="DESP['cg-crear']=true;render()">＋ Crear grupo</button>`;
  return `<div class="mes-card"><label class="m-label">＋ Nuevo grupo: ¿quién es el responsable?</label>
    ${disp.length?`<select class="m-select" style="font-size:15px" onchange="if(this.value){DESP['cg-crear']=false;crearGrupo(this.value);}">
      <option value="">— Elegir responsable —</option>${disp.map(m=>`<option value="${esc(m.id)}">${escH(m.name)}</option>`).join("")}</select>`
      :`<div class="ini-sin">Todos los asociados ya están en un grupo.</div>`}
    <button class="cgt-b sec" style="width:100%;margin-top:8px" onclick="DESP['cg-crear']=false;render()">Cancelar</button></div>`;
}
// v45.47: cuentas de meses anteriores con el responsable (consulta; cada mes nuevo empieza su cuenta)
function cuentasAnterioresHTML(g){
  const ts=parseInt(String(g.id).slice(1)), dC=ts>1.6e12?new Date(ts):null, creado=dC?dC.getFullYear()*12+dC.getMonth():-1; // el grupo se creó ese mes (antes no había cuenta)
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), desde=Math.max(_idxMes("Ago",2025),idx-12,creado), k="cghist-"+g.id, ab=!!DESP[k];
  const meses=[]; for(let i=idx-1;i>=desde;i--){ const r=_sinCrearMes(i,()=>{ const total=_cgTotal(g,i); if(!total)return null;
      const cc=_cgCascada(g,i); // v46.67: la misma cuenta en cascada; «resto» = lo entregado con personas marcadas
      const R=_cgRetMes(g,i); // v46.69: lo de «lo tiene» pasa solo al mes siguiente; aquí se dice aparte
      return {i,total,falta:R?_r2(cc.falta-R.colaFin):cc.falta,resto:cc.personas,movs:cc.movs,tieneTot:R?R.tieneTot:0,tieneAhora:R?_r2(R.propios.reduce((a,l)=>a+l.resta,0)):0}; }); if(r)meses.push(r); }
  if(!meses.length)return "";
  let h=`<button class="cg-ant" aria-expanded="${ab?"true":"false"}" onclick="DESP['${k}']=!DESP['${k}'];render()" style="width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px;padding:12px 16px;min-height:48px;border-radius:12px;border:1px solid var(--border);background:#fff;color:var(--dark);font-size:15px;font-weight:800;cursor:pointer;font-family:inherit"><span>📜 Cuentas de meses anteriores</span><span class="mg-acc-fl${ab?" ab":""}" aria-hidden="true"></span></button>`;
  if(!ab)return h;
  h+=`<div style="border:1px solid var(--border);border-top:none;border-radius:0 0 11px 11px;padding:4px 12px 10px;margin-top:-6px;background:#fff">`;
  meses.forEach(x=>{ let est=x.falta>0?`<b style="color:#94500F">faltan ${fmtEur(x.falta)} €</b>`:x.falta<0?`<b style="color:#A93C25">faltó pasarle ${fmtEur(-x.falta)} €</b>`:`<b style="color:#1B7A3D">✅ liquidada</b>`;
    if(x.tieneAhora>0)est=`<b style="color:#94500F">lo tiene sin entregar: ${fmtEur(x.tieneAhora)} €</b>`+(x.falta?" · "+est:""); // v46.69
    else if(x.tieneTot>0&&x.falta===0)est=`<b style="color:#1B7A3D">✅ entregado después</b>`;
    const t=_txtIdx(x.i), det=x.movs.filter(m=>m.tipo!=="pasado").map(m=>`${m.tipo==="entrega"?"Entrega "+escH(m.fecha||""):m.tipo==="ayuda"?"Ayuda a "+escH(m.nombre||""):m.tipo==="salida"?"Salida de "+escH(m.nombre||""):m.tipo==="pago"?"Le pasaste":"Pendiente anterior"} ${(m.tipo==="arrastre"||m.tipo==="pago")?"+":"−"}${fmtEur(m.importe)} €`);
    if(x.resto>0)det.push(`Personas marcadas −${fmtEur(x.resto)} €`);
    if(x.movs.some(m=>m.tipo==="pasado"))det.push("Lo pendiente pasó al mes siguiente");
    h+=`<div style="padding:8px 0;border-bottom:1px solid #F1EBE4"><div style="display:flex;justify-content:space-between;gap:8px;font-size:14.5px"><span style="font-weight:800">${t.charAt(0).toUpperCase()+t.slice(1)}</span><span>${fmtEur(x.total)} € · ${est}</span></div>
      ${det.length?`<div style="font-size:12.5px;color:var(--muted);margin-top:2px">${det.join(" · ")}</div>`:""}</div>`; });
  return h+`<div style="font-size:12px;color:var(--muted);margin-top:6px">Se calcula con las personas que hoy están en el grupo.</div></div>`;
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
function quitarToque(gid,mid){ // v45.43: quitar a alguien del grupo pide dos toques
  const k="qm-"+gid+"-"+mid;
  if(!DESP[k]){ DESP[k]=true; render(); setTimeout(()=>{ if(DESP[k]){DESP[k]=false;render();} },4000); return; }
  DESP[k]=false; quitarMiembroGrupo(gid,mid); const m=DATA.members.find(x=>x.id===mid); toast("Quitado del grupo"+(m?": "+m.name.split(" ")[0]:""));
}
function quitarMiembroGrupo(gid,mid){
  const g=gruposCierre().find(x=>x.id===gid);
  if(g){ g.miembros=(g.miembros||[]).filter(x=>x!==mid); save();render(); }
}
function marcarItemGrupo(tipo,mid,lid,pi){
  if(_mesBloqueado())return; // v45.46: mes cerrado
  UNDO_SNAPSHOT=JSON.stringify(DATA); let ahora=false; // v45.45: cada cobro se puede deshacer
  if(tipo==="aporte"){
    const md=getMesData(DATA.reportMonth,DATA.reportYear);
    if(!md.aportes)md.aportes={};
    md.aportes[mid]=!md.aportes[mid]; ahora=md.aportes[mid];
    anotarFechaAporte(md,mid); // v45.37
  } else {
    const m=DATA.members.find(x=>x.id===mid);
    if(m)[...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{if(l.id===lid){l.pays[pi].paid=!l.pays[pi].paid;anotarFechaCuota(l.pays[pi]);ahora=l.pays[pi].paid;}}); // v45.37: + fecha
    recolocarAyudas();
  }
  recalcMesRecargo();save();render();
  _avisoDeshacer(_nomCorto(mid)+(tipo==="aporte"?(ahora?": aporte cobrado ✓":": aporte desmarcado"):(ahora?": cuota cobrada ✓":": cuota desmarcada")));
}
// v46.71 (Ángel 28/11/2026): el círculo de cada persona en Cobros marca TODO lo suyo del mes (aporte y cuotas) de un toque; si ya
// estaba todo marcado, lo desmarca. Hace exactamente lo mismo que tocar cada interruptor (marcarItemGrupo), con un solo «Deshacer».
function cgPersonaToggle(gid,mid){
  if(_mesBloqueado())return; // v45.46: mes cerrado
  const its=itemsDeMiembro(mid,DATA.reportMonth,DATA.reportYear); if(!its.length)return;
  const poner=!its.every(it=>it.yaPagado); let cuota=false;
  UNDO_SNAPSHOT=JSON.stringify(DATA);
  its.forEach(it=>{ if(!!it.yaPagado===poner)return;
    if(it.tipo==="aporte"){ const md=getMesData(DATA.reportMonth,DATA.reportYear); if(!md.aportes)md.aportes={}; md.aportes[mid]=poner; anotarFechaAporte(md,mid); }
    else { cuota=true; const m=DATA.members.find(x=>x.id===mid);
      if(m)[...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{ if(l.id===it.lid){ l.pays[it.pi].paid=poner; anotarFechaCuota(l.pays[it.pi]); } }); } });
  if(cuota)recolocarAyudas();
  recalcMesRecargo();save();render();
  // v46.71 (Ángel 28/11/2026): «Marcado: Ana, 174 € · Deshacer». Deshacer (undoPay) vuelve a la copia de antes del toque: también las fechas de cobro
  _avisoDeshacer((poner?"Marcado: ":"Desmarcado: ")+_nomCorto(mid)+", "+fmtEur(_r2(its.reduce((a,it)=>a+it.importe,0)))+" €",true);
}
function marcarTodoGrupo(gid){
  if(_mesBloqueado())return; // v45.46: mes cerrado
  const g=gruposCierre().find(x=>x.id===gid);
  if(!g)return;
  UNDO_SNAPSHOT=JSON.stringify(DATA); // v45.43: se puede deshacer
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
  _avisoDeshacer("Grupo marcado como pagado ✓");
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
