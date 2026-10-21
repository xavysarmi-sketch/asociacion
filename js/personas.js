// Nuevos Horizontes · personas.js
// Personas: ficha, altas, permanencia, referidos, retiradas, salida, pausa, teléfonos y bienvenida
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).
function memberHistoryCount(m){return (m.history||[]).length;}
function memberHistoryTotal(m){return (m.history||[]).reduce((s,h)=>s+h.capital,0);}
function openHistory(mid){const m=DATA.members.find(x=>x.id===mid);if(!m)return;MODAL={type:"history",member:m};render();}
function historyModalHTML(){
  const m=MODAL.member;
  const hist=(m.history||[]).slice().sort((a,b)=>{
    if(a.gYear!==b.gYear)return b.gYear-a.gYear;
    return MONTHS.indexOf(b.gMonth)-MONTHS.indexOf(a.gMonth);
  });
  const total=hist.reduce((s,h)=>s+h.capital,0);
  const months=memberMonths(m);
  const cuotasPagadas=aportesPagadosCount(m);
  const totalAp=memberTotalAportes(m);
  const isTerc=m.type==="tercero";
  let h=`<div class="modal-title">📋 Historial — ${escH(m.name)}</div>`;

  // Bloque superior: información del socio
  h+=`<div style="background:linear-gradient(135deg,#1B4332,#2D6A4F);border-radius:14px;padding:16px;margin-bottom:14px;color:#fff">`;
  if(isTerc){
    h+=`<div style="font-size:12px;color:rgba(255,255,255,.7);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">🤝 Tercero</div>`;
    h+=`<div style="font-size:14px">Avalado por <b>${escH(avalistaNombre(m)||"—")}</b></div>`;
  }else{
    h+=`<div style="font-size:12px;color:rgba(255,255,255,.7);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🏠 Asociado</div>`;
    if(m.joinMonth){
      h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">`;
      h+=`<div><div style="font-size:11px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.5px">Miembro desde</div><div style="font-size:15px;font-weight:700;margin-top:2px">${MONTHS_FULL[MONTHS.indexOf(m.joinMonth)]} ${m.joinYear}</div></div>`;
      h+=`<div><div style="font-size:11px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.5px">Meses activo</div><div style="font-size:15px;font-weight:700;margin-top:2px">${months} ${months===1?"mes":"meses"}</div></div>`;
      h+=`</div>`;
      h+=`<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2);display:flex;justify-content:space-between;align-items:center">`;
      h+=`<div><div style="font-size:11px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.5px">Total de aportes acumulados</div><div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:2px">${cuotasPagadas} ${cuotasPagadas===1?"mes pagado":"meses pagados"}</div></div>`;
      h+=`<div style="font-size:22px;font-weight:800">${totalAp} €</div>`;
      h+=`</div>`;
    }
  }
  h+=`</div>`;

  // Resumen de ayudas
  h+=`<div style="background:#fff;border:2px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">`;
  h+=`<div><div style="font-size:13px;color:var(--muted);font-weight:600">Ayudas recibidas</div><div style="font-size:11px;color:var(--muted);margin-top:2px">Total a lo largo del tiempo</div></div>`;
  h+=`<div style="text-align:right"><div style="font-size:30px;font-weight:900;color:var(--accent);line-height:1">${hist.length}</div></div>`;
  h+=`</div>`;

  // Lista de ayudas (más reciente arriba)
  if(!hist.length){
    h+=`<div style="text-align:center;padding:24px 12px;color:var(--muted);background:#F9F9F7;border-radius:12px;font-size:14px">Sin ayudas recibidas hasta la fecha</div>`;
  }else{
    h+=`<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding:0 4px">📅 Detalle de ayudas (más reciente primero)</div>`;
    h+=`<div style="background:#fff;border:1px solid var(--border);border-radius:14px;overflow:hidden">`;
    hist.forEach((a,i)=>{
      h+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px${i<hist.length-1?";border-bottom:1px solid var(--border)":""}">`;
      h+=`<div><div style="font-size:15px;font-weight:700;color:var(--dark)">${MONTHS_FULL[MONTHS.indexOf(a.gMonth)]} ${a.gYear}</div></div>`;
      h+=`<div style="font-size:18px;font-weight:800;color:var(--accent)">${a.capital} €</div>`;
      h+=`</div>`;
    });
    h+=`</div>`;
    // Total al final
    h+=`<div style="background:var(--bg);border:2px dashed var(--accent);border-radius:12px;padding:14px;margin-top:12px;display:flex;justify-content:space-between;align-items:center">`;
    h+=`<div style="font-size:14px;font-weight:700;color:var(--dark)">💰 Total recibido</div>`;
    h+=`<div style="font-size:22px;font-weight:900;color:var(--dark)">${total} €</div>`;
    h+=`</div>`;
  }
  return h;
}
// v45.23: eliminar desde la ficha (mismo doble toque); al borrarla se vuelve a la lista
function eliminarDesdeFicha(mid){ delMember(mid); if(!DATA.members.some(x=>x.id===mid)){ FICHA_ID=null; render(); } }
function delMember(mid){
  if(_delMemberArmed!==mid){
    _delMemberArmed=mid;
    render();
    toast(esPrincipalDeGrupo(mid)?"⚠️ Su enlace de grupo dejará de funcionar. Toca de nuevo 🗑️ para confirmar":"Toca de nuevo 🗑️ para confirmar",4000);
    setTimeout(()=>{if(_delMemberArmed===mid){_delMemberArmed=null;render();}},4000);
    return;
  }
  _delMemberArmed=null;
  // v44.19: su bono por referido sale de la ficha de quien lo trajo (solo meses aún sin cobrar)
  const borrado=DATA.members.find(m=>m.id===mid);
  let extra="";
  if(borrado&&borrado.referidoPor){
    const q=quitarBonoReferido(borrado.referidoPor,borrado.name);
    const ref=DATA.members.find(m=>m.id===borrado.referidoPor), nom=ref?ref.name.split(" ")[0]:"quien lo trajo";
    if(q.quitados.length)extra+=` · bono de ${nom} retirado`;
    if(q.cobrados.length)extra+=` · ojo: el bono de ${nom} en ${q.cobrados.join(", ")} ya se cobró y se deja`;
  }
  DATA.members=DATA.members.filter(m=>m.id!==mid);
  save();toast("Eliminado ✓"+extra,extra?6000:undefined);render();
}

function addMemberSubmit(convertir){
  const name=document.getElementById("m-name").value.trim();if(!name)return;
  const telAlta=_telLimpio(document.getElementById("m-phone")?.value); // v45.21: opcional
  const type=document.querySelector(".m-opt.active[data-type]")?.dataset.type||"asociado";
  // v45 (PE-1): un asociado no se da de alta sin permanencia
  const cicloEl=document.querySelector(".l-ci-opt.active"), apEl=document.querySelector(".l-ap-opt.active");
  if(type==="asociado"&&!cicloEl){toast("⛔ Elige su permanencia (12, 24, 36 meses o indefinida)",3500);return;}
  const cicloAlta=cicloEl?parseInt(cicloEl.dataset.ciclo):null, aporteAlta=apEl?parseInt(apEl.dataset.ap):50;
  const ref=type==="tercero"?(document.getElementById("m-ref")?.value||null):null; // ref = avalistaId (select), no texto libre
  // v44.12: referido (solo asociados) → bono de 10 € automático para quien lo trajo
  const refdoId=type==="asociado"?(document.getElementById("m-refdo")?.value||null):null;
  const bonoMes=refdoId?(document.getElementById("m-bono-mes")?.value||mesBonoPorDefecto(refdoId)):null;
  const msgBono=k=>{
    if(!k)return "";
    const r=DATA.members.find(x=>x.id===refdoId);const[yy,mm]=k.split("-").map(Number);
    if(aplicarReferidoAlta.yaExistia)return ` · ${r?r.name.split(" ")[0]:"El asociado"} ya tenía este bono en ${MONTHS_FULL[mm-1]} ${yy}: no se duplica (para cambiar el mes: Ficha → 🎁 Referido)`;
    return ` · bono de 10 € para ${r?r.name.split(" ")[0]:"el asociado"} en ${MONTHS_FULL[mm-1]} ${yy}`+(k!==bonoMes?" (ese mes ya tenía 3 bonos)":"");
  };
  // Si se añade un ASOCIADO y existe un TERCERO con el mismo nombre, fusionar
  if(type==="asociado"){
    const key=_normNombre(name); // mismo criterio que la auditoría (control 7): ignora tildes/mayúsculas/espacios
    const tercExist=DATA.members.find(x=>x.type==="tercero"&&_normNombre(x.name)===key);
    if(tercExist){
      // v45.21: sin confirm() (regla 5). Se avisa en el propio formulario y se convierte con su botón.
      if(!convertir){ altaNombreCambio(); toast("⚠️ Ya existe un tercero con ese nombre: toca «🔄 Convertir en asociado» o cambia el nombre",4500); return; }
      const ok=mergeTerceroIntoAsociado(name,DATA.reportMonth,DATA.reportYear);
      if(ok){
        const conv=DATA.members.find(x=>x.type==="asociado"&&_normNombre(x.name)===key);
        if(conv){conv.ciclo=cicloAlta;conv.aporte=aporteAlta;if(telAlta&&!conv.phone)conv.phone=telAlta;}
        const k=refdoId?aplicarReferidoAlta(conv,refdoId,bonoMes):null;
        const solC=MODAL&&MODAL.sol;
        closeModal();save();toast("✓ Tercero convertido a asociado"+msgBono(k));
        if(solC&&conv)_solTrasAlta(solC,conv); else if(conv)abrirBienvenida(conv.id,true);
        return;
      }
      return;
    }
  }
  const nuevo={id:"m"+Date.now(),name,type,ref,joinMonth:type==="asociado"?DATA.reportMonth:null,joinYear:type==="asociado"?DATA.reportYear:null,history:[],loans:[],phone:telAlta,origen:"app"};
  if(type==="asociado"){nuevo.ciclo=cicloAlta;nuevo.aporte=aporteAlta;} // v45 (PE-1, AP-4)
  DATA.members.push(nuevo);
  const k=refdoId?aplicarReferidoAlta(nuevo,refdoId,bonoMes):null;
  const solN=MODAL&&MODAL.sol; // v45.14
  closeModal();save();toast("Miembro añadido ✓"+msgBono(k));
  if(solN)_solTrasAlta(solN,nuevo); else abrirBienvenida(nuevo.id,true); // v45.21
}
// v45.21: aviso en el alta cuando ya hay un TERCERO con ese nombre (mismo criterio que la auditoría)
function _altaConvHTML(nombre,tipo){
  if(tipo!=="asociado")return "";
  const key=_normNombre(nombre); if(!key)return "";
  const t=DATA.members.find(x=>x.type==="tercero"&&_normNombre(x.name)===key); if(!t)return "";
  const nAy=(t.loans||[]).length;
  return `<div style="background:#FFF4E5;border:1.5px solid #E0A040;border-radius:12px;padding:11px 12px;margin:-4px 0 12px;font-size:13px;color:#6B4210;line-height:1.45">
    ⚠️ Ya existe el tercero <b>${escH(t.name)}</b>${t.ref?` (avalado por ${escH(avalistaNombre(t)||"—")})`:""}${nAy?` con ${nAy} ${nAy===1?"ayuda":"ayudas"}`:""}.
    <div style="margin-top:4px">Si es la misma persona, conviértela en asociado: conserva su historial y sus ayudas. Elige abajo su permanencia y su aporte.</div>
    <button onclick="addMemberSubmit(true)" style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:10px;background:#C75B0E;color:#fff;font-size:14px;font-weight:800;cursor:pointer">🔄 Convertir en asociado</button>
    <div style="margin-top:6px;font-size:12px;opacity:.85">Si es otra persona, cambia el nombre (por ejemplo, añade el segundo apellido).</div>
  </div>`;
}
function altaNombreCambio(){
  const el=document.getElementById("m-conv"); if(!el)return;
  const tipo=document.querySelector(".m-opt.active[data-type]")?.dataset.type||"asociado";
  el.innerHTML=_altaConvHTML(document.getElementById("m-name")?.value||"",tipo);
}

// ══ v45.31 · RESUMEN DE LA SALIDA PARA EL ASOCIADO (imagen por WhatsApp y su enlace personal) ═══
// Lenguaje sencillo, sin referencias internas. Usa las mismas cifras que Histórico › Salidas (datosBaja).
function salidaResumenDatos(m){
  const b=datosBaja(m); if(!b||!b.v18)return null;
  const ult=_idxMes(b.ultimoMes,b.ultimoAnio), nAp=aportesConBeneficio(m,ult).length, p=mesPagoBaja(b);
  return {b,ult,nAp,pagoTxt:MONTHS_FULL[MONTHS.indexOf(p.mes)].toLowerCase()+" "+p.anio,
    ini:m.joinMonth?_idxMes(m.joinMonth,m.joinYear):null, ben:_r2(b.beneficioConservado||0), aportes:_r2(b.capitalDevuelto||0),
    ayuda:_r2(b.ayudaDescontada||0), total:_r2(b.total||0), perdido:_r2(b.beneficioPerdido||0), generado:_r2(b.beneficioGenerado||0)};
}
function salidaResumenHTML(m,ancho,sinNombre){
  const d=salidaResumenDatos(m); if(!d)return "";
  const b=d.b, nom=escH(m.name.split(" ")[0]), e=v=>_eurM(Math.abs(v))+" €";
  const sec="padding:12px 14px;border-bottom:1px solid #EEE9DF", tit="font-size:13px;font-weight:800;color:#1B4332;margin-bottom:7px";
  const fila=(ic,l,v,st)=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6px 0;border-bottom:1px dashed #E6E1D6;font-size:14px;${st||""}"><span>${ic} ${l}</span><b style="white-space:nowrap">${v}</b></div>`;
  const perm=m.ciclo===0?"indefinida":(m.ciclo||12)+" meses";
  const tipoTxt=b.tipo==="fin"?`Has completado tu permanencia de ${perm}.`
    :b.tipo==="indefinida"?`Tenías permanencia indefinida.`
    :`Tu permanencia era de ${perm} y sales antes de terminarla.`;
  let porQue="";
  if(b.tipo==="fin")porQue=`Como has completado tu permanencia, <b>cobras todo el beneficio</b> que han ganado tus aportes.`;
  else if(d.ben>0){ const an=b.beneficioAnios||0, k=Math.max(0,d.nAp-an*12), ord=["primer","segundo","tercer","cuarto","quinto"][an]||((an+1)+".º");
    porQue=`Cobras el beneficio de ${an===1?"tu <b>primer año completo</b>":`tus <b>${an} años completos</b>`} (12 meses${an===1?"":" cada uno"}): <b>${e(d.ben)}</b>.`+
      (d.perdido>0&&k>0?` El beneficio se cobra por cada permanencia completa de 12 meses, y de tu ${ord} año tienes ${k} ${k===1?"mes":"meses"}: por eso esos ${e(d.perdido)} no se cobran. Tus aportes se te devuelven completos (son tus ahorros).`:""); }
  else if(d.generado>0)porQue=`Tus aportes han ganado <b>${e(d.generado)}</b> de beneficio. El beneficio se cobra por permanencia completa de 12 meses, y tú tienes ${d.nAp} ${d.nAp===1?"mes":"meses"}: por eso <b>este beneficio no se cobra</b>. Tus aportes se te devuelven completos (son tus ahorros).`;
  const ayudaTxt=d.ayuda>0?(d.total>=0
      ?`Te quedaba${b.ayudaCuotas===1?" 1 cuota":"n "+b.ayudaCuotas+" cuotas"} de tu ayuda (${e(d.ayuda)}). Se descuenta${b.ayudaCuotas===1?"":"n"} de lo que recibes, así que <b>tu ayuda queda pagada</b> y no tienes que pagar nada más.`
      :`Te quedaba${b.ayudaCuotas===1?" 1 cuota":"n "+b.ayudaCuotas+" cuotas"} de tu ayuda (${e(d.ayuda)}). Lo que tienes en el fondo no llega para pagarla entera: faltan <b>${e(d.total)}</b>.`):"";
  return `<div style="${ancho?"width:"+ancho+"px;":""}background:#fff;border-radius:14px;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2a24;border:1px solid #E3DED3">
    <div style="background:#1B4332;color:#fff;padding:14px 15px"><div style="font-size:18px;font-weight:800">🚪 Resumen de tu salida</div>
      ${sinNombre?"":`<div style="font-size:12.5px;opacity:.85;margin-top:2px">${escH(m.name)} · Nuevos Horizontes</div>`}</div>
    <div style="${sec}"><div style="${tit}">Tu permanencia</div>
      ${d.ini!=null?fila("📅","Entraste en",_txtIdx(d.ini)):""}
      ${fila("⏳","Permanencia",perm+(b.tipo==="fin"?" · completada ✓":""))}
      ${fila("🚪","Último aporte",_txtIdx(d.ult),"border-bottom:none")}</div>
    <div style="${sec}"><div style="${tit}">Tus cuentas</div>
      ${fila("💶",`Tus aportes (${d.nAp})`,e(d.aportes))}
      ${fila("📈","Beneficio que cobras",e(d.ben))}
      ${d.ayuda>0?fila("🤝",`Lo que quedaba de tu ayuda (${b.ayudaCuotas} ${b.ayudaCuotas===1?"cuota":"cuotas"})`,"− "+e(d.ayuda),"color:#B04A2C"):""}
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding:9px 0 2px;font-size:16px"><b>${d.total>=0?"✅ Recibes":"⚠️ Falta por pagar"}</b><b style="font-size:21px;color:${d.total>=0?"#1B4332":"#B04A2C"}">${e(d.total)}</b></div></div>
    ${porQue||ayudaTxt?`<div style="${sec};background:#F7F5EF"><div style="${tit}">💡 Cómo se calcula</div>
      ${porQue?`<div style="font-size:13px;line-height:1.55;margin-bottom:${ayudaTxt?6:0}px">📈 ${porQue}</div>`:""}
      ${ayudaTxt?`<div style="font-size:13px;line-height:1.55">🤝 ${ayudaTxt}</div>`:""}</div>`:""}
    <div style="${sec};border-bottom:none"><div style="${tit}">Cuándo se te paga</div>
      <div style="font-size:14px;line-height:1.5">📅 ${d.total>0?`Entre el <b>5 y el 10 de ${d.pagoTxt}</b>.`:`No hay nada que pagarte.`}${b.pagada?` <span style="color:#1B7A3D;font-weight:700">✓ Ya pagado${b.fechaPagada?" el "+escH(b.fechaPagada):""}</span>`:""}</div>
      <div style="font-size:12.5px;color:#58605b;margin-top:8px">Gracias por formar parte de Nuevos Horizontes, ${nom}.</div></div>
  </div>`;
}

// v45.32: aviso en su ficha (enlace personal) mientras la salida está pendiente de pago
function salidaAvisoFichaHTML(m){
  const d=salidaResumenDatos(m); if(!d)return "";
  const k="salida-det-"+m.id, ab=!!DESP[k];
  return `<div style="margin:12px 0 4px;border:1.5px solid #E0A040;background:#FFF8EC;border-radius:14px;padding:12px 14px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div style="font-size:16px;font-weight:800;color:#7A4A10">🚪 Salida</div>
      <button onclick="DESP['${k}']=!DESP['${k}'];render()" style="padding:8px 12px;border-radius:9px;border:1.5px solid #B06A1E;background:#fff;color:#8A4F12;font-size:13px;font-weight:800;cursor:pointer">${ab?"Ocultar el detalle ▲":"Ver el detalle ▼"}</button></div>
    ${ab?`<div style="margin-top:10px">${salidaResumenHTML(m,0,true)}</div>`:""}
    ${ab?"":`<div style="font-size:13.5px;color:#4A3A20;line-height:1.5;margin-top:6px">${d.total>0?`Recibes <b>${_eurM(d.total)} €</b>, que se te pagan entre el <b>5 y el 10 de ${d.pagoTxt}</b>.`:`Tu salida está anotada.`}</div>`}
  </div>`;
}
function _salidaTextoWA(m){
  const d=salidaResumenDatos(m); if(!d)return "";
  const nom=m.name.split(" ")[0];
  return `Hola ${nom} 👋\nTe envío el resumen de tu salida de Nuevos Horizontes.`+
    (d.total>0?` Recibes *${_eurM(d.total)} €*, que se te pagan entre el 5 y el 10 de ${d.pagoTxt}.`:"")+
    `\nEn la imagen tienes el detalle. Si tienes cualquier duda, pregúntame.`;
}
function salidaEnviarWA(mid){
  const m=DATA.members.find(x=>x.id===mid); if(!m||!salidaResumenDatos(m))return;
  _compartirImagenWA(m,salidaResumenHTML(m,380),_salidaTextoWA(m),`Salida_${m.name.split(" ")[0]}.png`);
}
function salidaOkModalHTML(){
  const m=DATA.members.find(x=>x.id===(MODAL&&MODAL.mid)); if(!m)return "";
  const nom=escH(m.name.split(" ")[0]);
  return `<div class="modal-title">✅ Salida anotada — ${escH(m.name)}</div>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px;line-height:1.45">Esto es lo que verá ${nom}: se lo puedes enviar ahora. En su enlace sigue viendo su ficha, con un aviso de su salida arriba, hasta que marques la salida como pagada.</div>
    ${salidaResumenHTML(m)}
    <button onclick="salidaEnviarWA('${esc(m.id)}')" style="width:100%;margin-top:12px;padding:12px;border-radius:12px;border:none;background:#25D366;color:#fff;font-size:15px;font-weight:800;cursor:pointer">💬 Enviar resumen a ${nom}</button>
    <button onclick="closeModal()" style="width:100%;padding:10px;margin-top:8px;border:none;background:transparent;color:var(--muted);font-size:13px;cursor:pointer">Cerrar</button>`;
}
function opcionesSalidaDatos(m){
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), desde=rep+1, meses=3;
  const s=salidaV18(m,rep), ay=ayudaPendienteDe(m), pp=pausaPosible(m,desde);
  let pausa=null;
  if(pp.ok){ const mN=Object.assign({},m,{pausas:[...(m.pausas||[]),{id:"sim",desde,meses}]});
    const fin=m.ciclo>0?finPermanenciaIdx(mN):null, tot=fin!=null?totalPrevistoPerm(mN,fin):null;
    const nv=salidaV18(Object.assign({},m,{loans:[]}),desde-1); // si no vuelve: su ayuda ya está pagada
    pausa={desde,meses,vuelve:desde+meses,fin,total:tot?tot.total:null,cap:tot?tot.capital:null,ben:tot?tot.beneficio:null,noVuelve:_r2(nv.capital+nv.aPagar)}; }
  return {rep,s,ay,pausa,pp};
}
function opcionesSalidaHTML(m,ancho){
  const o=opcionesSalidaDatos(m), s=o.s, p=o.pausa, nom=escH(m.name.split(" ")[0]), e=v=>_eurM(Math.abs(v))+" €";
  const sec="padding:12px 14px;border-bottom:1px solid #EEE9DF", tit="font-size:15px;font-weight:800;margin-bottom:6px";
  const li=(ic,t)=>`<div style="display:flex;gap:7px;font-size:13.5px;line-height:1.5;margin:4px 0"><span>${ic}</span><span>${t}</span></div>`;
  const suma=(ic,l,v,st)=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:5px 0;border-bottom:1px dashed #E6E1D6;font-size:13.5px;${st||""}"><span>${ic} ${l}</span><b style="white-space:nowrap">${v}</b></div>`;
  const recibe=`Recibes <b>${e(s.total)}</b>: tus ${e(s.capital)} de aportes${s.aPagar>0?` + ${e(s.aPagar)} de beneficio`:""}${s.ayuda.importe>0?` menos ${e(s.ayuda.importe)} de ${s.ayuda.n===1?"la última cuota":"lo que te queda"} de tu ayuda, que así queda pagada`:""}.`;
  let h=`<div style="${ancho?"width:"+ancho+"px;":""}background:#fff;border-radius:14px;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2a24;border:1px solid #E3DED3">
    <div style="background:#1B4332;color:#fff;padding:14px 15px"><div style="font-size:18px;font-weight:800">${nom}, tienes dos opciones</div><div style="font-size:12.5px;opacity:.85;margin-top:2px">Elige la que mejor te venga</div></div>
    <div style="${sec}"><div style="${tit};color:#7A4A10">🚪 Opción 1 · Salir ahora</div>
      ${suma("💶",`Tus aportes (${s.nPagados} ${s.nPagados===1?"mes":"meses"})`,e(s.capital))}
      ${s.aPagar>0?suma("📈","Beneficio que cobras",e(s.aPagar)):""}
      ${s.ayuda.importe>0?suma("🤝",s.ayuda.n===1?"Queda pagada tu última cuota":`Quedan pagadas tus últimas ${s.ayuda.n} cuotas`,"− "+e(s.ayuda.importe),"color:#B04A2C"):""}
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding:7px 0 4px;font-size:15px"><b>✅ Recibes</b><b style="font-size:19px">${e(s.total)}</b></div>
      ${li("📅",`Se te paga en <b>${_txtIdx(o.rep+1)}</b>.`)}
      ${s.perdido>0?li("📈",`${e(s.perdido)} de beneficio no se cobran, porque el beneficio se cobra por cada 12 meses completos.`):""}</div>`;
  if(p){ h+=`<div style="${sec};background:#F4F9F6"><div style="${tit};color:#1B4332">⏸ Opción 2 · Pausa de ${p.meses} meses</div>
      ${o.ay.n>0?li("🤝",`En <b>${_mesSolo(p.desde)}</b> pagas ${o.ay.n===1?"tu última cuota":`lo que te queda de tu ayuda (${o.ay.n} cuotas)`} (${e(o.ay.cuotas)}) y tu ayuda queda pagada.`):""}
      ${li("⏸",`<b>${_listaMeses(p.desde,p.meses).replace(/^./,c=>c.toUpperCase())}</b> no aportas. No pierdes ${s.generado>0?`tus <b>${e(_r2(s.generado-s.retirado))}</b> de beneficios ganados`:"tus beneficios ganados"}.`)}
      ${li("📅",`En <b>${_txtIdx(p.vuelve)}</b> vuelves a aportar ${aporteBaseDe(m)} € al mes.${p.fin!=null?` Tu permanencia termina en <b>${_txtIdx(p.fin)}</b>${p.total!=null?` y en ${_txtIdx(p.fin+1)} recibes <b>${e(p.total)}</b> (${e(p.cap)} de aportes + ${e(p.ben)} de beneficio)`:""}.`:" Sigues con tu permanencia indefinida."}`)}
      ${li("🔄",`Si al final de la pausa no puedes volver, recibes tus <b>${e(p.noVuelve)}</b> en ${_txtIdx(p.vuelve)}.`)}</div>
    <div style="padding:12px 14px"><div style="font-size:13px;font-weight:800;color:#1B4332;margin-bottom:6px">Lo que recibes en cada caso</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;border-bottom:1px dashed #E6E1D6">Salir ahora</td><td style="text-align:right;border-bottom:1px dashed #E6E1D6"><b>${e(s.total)}</b> · ${_txtIdx(o.rep+1).replace(/^(\S{3})\S*/,"$1")}</td></tr>
        ${p.total!=null?`<tr><td style="padding:6px 0;border-bottom:1px dashed #E6E1D6">Pausa y vuelves</td><td style="text-align:right;border-bottom:1px dashed #E6E1D6"><b style="color:#1B4332;font-size:15px">${e(p.total)}</b> · ${_txtIdx(p.fin+1).replace(/^(\S{3})\S*/,"$1")}</td></tr>`:""}
        <tr><td style="padding:6px 0">Pausa y no vuelves</td><td style="text-align:right"><b>${e(p.noVuelve)}</b> · ${_txtIdx(p.vuelve).replace(/^(\S{3})\S*/,"$1")}</td></tr></table></div>`; }
  return h+`</div>`;
}
function _opcionesTextoWA(m){ const o=opcionesSalidaDatos(m), nom=m.name.split(" ")[0];
  return `Hola ${nom} 👋\nTe envío tus dos opciones para que elijas la que mejor te venga: salir ahora o hacer una pausa de ${o.pausa?o.pausa.meses:3} meses y seguir después. En la imagen tienes lo que recibirías en cada caso. Dime cuál prefieres y lo dejo preparado.`; }
function opcionesEnviarWA(mid){ const m=DATA.members.find(x=>x.id===mid); if(!m)return; _compartirImagenWA(m,opcionesSalidaHTML(m,380),_opcionesTextoWA(m),`Opciones_${m.name.split(" ")[0]}.png`); }
// «🚪 Salida del fondo»: si puede hacer pausa, primero las dos opciones
function openSalida(mid){
  const m=DATA.members.find(x=>x.id===mid); if(!m)return;
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear), fin=finPermanenciaIdx(m);
  const alFinal=fin!=null&&rep>=fin-1; // al final de la permanencia no tiene sentido la pausa
  if(m.type==="asociado"&&!alFinal&&!pausaVigente(m)&&pausaPosible(m,rep+1).ok)openModal('salida_opciones',{mid});
  else openModal('baja',{mid});
}
function salidaOpcionesModalHTML(){
  const m=DATA.members.find(x=>x.id===(MODAL&&MODAL.mid)); if(!m)return ""; const nom=escH(m.name.split(" ")[0]);
  const st="flex:1;padding:11px 6px;border-radius:11px;font-size:14px;font-weight:800;cursor:pointer;";
  return `<div class="modal-title">🚪 Salida o pausa — ${escH(m.name)}</div>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px;line-height:1.45">Antes de anotar la salida, ${nom} puede elegir una pausa de 1 a 3 meses (Maestro PE-8). Envíale sus dos opciones y, cuando decida, sigue por la que elija.</div>
    ${opcionesSalidaHTML(m)}
    <button onclick="opcionesEnviarWA('${esc(m.id)}')" style="width:100%;margin-top:12px;padding:12px;border-radius:12px;border:none;background:#25D366;color:#fff;font-size:15px;font-weight:800;cursor:pointer">💬 Enviar opciones a ${nom}</button>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button onclick="openModal('pausa',{mid:'${esc(m.id)}'})" style="${st}border:1.5px solid #2D6A4F;background:#2D6A4F;color:#fff">⏸ Pausa</button>
      <button onclick="openModal('baja',{mid:'${esc(m.id)}'})" style="${st}border:1.5px solid #C0492C;background:#fff;color:#C0492C">🚪 Salida</button></div>
    <button onclick="closeModal()" style="width:100%;padding:10px;margin-top:8px;border:none;background:transparent;color:var(--muted);font-size:13px;cursor:pointer">Cancelar</button>`;
}
// Ventana para anotar la pausa
function pausaFormHTML(){
  const m=DATA.members.find(x=>x.id===(MODAL&&MODAL.mid)); if(!m)return "";
  const rep=_idxMes(DATA.reportMonth,DATA.reportYear);
  if(MODAL.pDesde==null)MODAL.pDesde=rep+1; if(MODAL.pMeses==null)MODAL.pMeses=3;
  const desde=MODAL.pDesde, meses=MODAL.pMeses, pp=pausaPosible(m,desde), ay=ayudaPendienteDe(m);
  const finAhora=finPermanenciaIdx(m), finNuevo=finAhora!=null?finAhora+meses:null, armed=!!MODAL.pArmed;
  const chip=(v,on,fn)=>`<button onclick="${fn}" style="flex:1;padding:10px 4px;border-radius:10px;border:1.5px solid ${on?"#1B4332":"#E3DDD2"};background:${on?"#1B4332":"#fff"};color:${on?"#fff":"#3B3B3B"};font-size:14px;font-weight:700;cursor:pointer">${v}</button>`;
  const fila=(l,v)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px dashed #E6E1D6;font-size:13.5px"><span>${l}</span><b style="text-align:right">${v}</b></div>`;
  return `<div class="modal-title">⏸ Pausa de aportes — ${escH(m.name)}</div>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px;line-height:1.45">La apruebas tú. Una por permanencia (indefinida: una cada 12 meses). Durante la pausa no aporta ni gana beneficio, no pierde lo que tiene y su permanencia se alarga lo mismo (Maestro PE-8).</div>
    <label class="m-label">Empieza en</label>
    <div style="display:flex;gap:6px;margin-bottom:10px">${[rep,rep+1].map(i=>chip(_txtIdx(i),desde===i,`MODAL.pDesde=${i};MODAL.pArmed=false;render()`)).join("")}</div>
    <label class="m-label">Meses de pausa</label>
    <div style="display:flex;gap:6px;margin-bottom:12px">${[1,2,3].map(n=>chip(n+(n===1?" mes":" meses"),meses===n,`MODAL.pMeses=${n};MODAL.pArmed=false;render()`)).join("")}</div>
    ${pp.ok?`<div style="background:#F4F9F6;border:1px solid #C9DCCF;border-radius:12px;padding:10px 12px;margin-bottom:12px">
      ${fila("Sin aportar",meses===1?_txtIdx(desde):`${_txtIdx(desde)} – ${_txtIdx(desde+meses-1)}`)}
      ${ay.n>0?fila("Su ayuda",`${_eurM(ay.cuotas)} € en ${_txtIdx(desde)}`):""}
      ${fila("Vuelve a aportar",_txtIdx(desde+meses))}
      ${fila("Su permanencia termina",finAhora!=null?`${_txtIdx(finAhora)} → <span style="color:#1B4332">${_txtIdx(finNuevo)}</span>`:"indefinida")}</div>
      <button class="m-primary" style="${armed?"background:#C0492C":""}" onclick="${armed?`anotarPausa('${esc(m.id)}')`:"MODAL.pArmed=true;render()"}">${armed?"⚠️ Pulsa de nuevo para CONFIRMAR la pausa":"⏸ Anotar la pausa"}</button>`
    :`<div style="background:#FDF0EE;border:1.5px solid #C0492C;border-radius:12px;padding:10px 12px;font-size:13px;color:#7A2418;margin-bottom:12px;line-height:1.45">⛔ ${pp.motivo}</div>`}
    <button onclick="closeModal()" style="width:100%;padding:10px;margin-top:8px;border:none;background:transparent;color:var(--muted);font-size:13px;cursor:pointer">Cancelar</button>`;
}
function anotarPausa(mid){
  const m=DATA.members.find(x=>x.id===mid); if(!m||!MODAL)return;
  const desde=MODAL.pDesde, meses=MODAL.pMeses, pp=pausaPosible(m,desde); if(!pp.ok){ toast("⛔ "+pp.motivo,4000); return; }
  const ay=ayudaPendienteDe(m);
  if(!Array.isArray(m.pausas))m.pausas=[];
  m.pausas.push({id:"p"+Date.now(),desde,meses,creada:_hoyDMA(),ayudaN:ay.n,ayudaImp:ay.cuotas});
  save(); toast("⏸ Pausa anotada ✓"); openModal('pausa_ok',{mid});
}
function pausaResumenHTML(m,ancho,sinNombre){
  const p=pausaVigente(m); if(!p)return "";
  const nom=escH(m.name.split(" ")[0]), fin=finPermanenciaIdx(m), e=v=>_eurM(v)+" €";
  const nv=salidaV18(Object.assign({},m,{loans:[]}),p.desde-1), noV=_r2(nv.capital+nv.aPagar), benG=_r2(nv.generado-nv.retirado);
  const fila=(ic,l,v)=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6px 0;border-bottom:1px dashed #E6E1D6;font-size:14px"><span>${ic} ${l}</span><b style="white-space:nowrap">${v}</b></div>`;
  return `<div style="${ancho?"width:"+ancho+"px;":""}background:#fff;border-radius:14px;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2a24;border:1px solid #E3DED3">
    <div style="background:#1B4332;color:#fff;padding:14px 15px"><div style="font-size:18px;font-weight:800">⏸ Tu pausa de aportes</div>
      ${sinNombre?"":`<div style="font-size:12.5px;opacity:.85;margin-top:2px">${escH(m.name)} · Nuevos Horizontes</div>`}</div>
    <div style="padding:12px 14px;border-bottom:1px solid #EEE9DF">
      ${fila("⏸","Sin aportar",p.meses===1?_txtIdx(p.desde):`${_mesSolo(p.desde).slice(0,3)} ${Math.floor(p.desde/12)} – ${_mesSolo(p.desde+p.meses-1).slice(0,3)} ${Math.floor((p.desde+p.meses-1)/12)}`)}
      ${p.ayudaImp>0?fila("🤝","Tu ayuda",`pagas ${e(p.ayudaImp)} en ${_txtIdx(p.desde)}`):""}
      ${fila("🔄","Vuelves a aportar",_txtIdx(p.desde+p.meses))}
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6px 0 0;font-size:14px"><span>⏳ Tu permanencia termina</span><b style="white-space:nowrap">${fin!=null?_txtIdx(fin):"indefinida"}</b></div></div>
    <div style="padding:12px 14px;background:#F7F5EF"><div style="font-size:13px;font-weight:800;color:#1B4332;margin-bottom:6px">💡 Cómo funciona</div>
      <div style="font-size:13px;line-height:1.55">No pierdes ${benG>0?`tus <b>${e(benG)}</b> de beneficios ganados`:"tus beneficios ganados"}: siguen a tu nombre, igual que tus aportes. Esos meses no aportas ni generan beneficio, y tu permanencia se alarga lo mismo que dura la pausa.${p.ayudaImp>0?` Al pagar ${e(p.ayudaImp)} en ${_mesSolo(p.desde)}, tu ayuda queda pagada.`:""}</div>
      <div style="font-size:13px;line-height:1.55;margin-top:6px">🔄 Si al final de la pausa no puedes volver, recibes tus <b>${e(noV)}</b> en ${_txtIdx(p.desde+p.meses)}.</div>
      <div style="font-size:12.5px;color:#58605b;margin-top:8px">Te esperamos en ${_mesSolo(p.desde+p.meses)}, ${nom}.</div></div>
  </div>`;
}
function _pausaTextoWA(m){ const p=pausaVigente(m), nom=m.name.split(" ")[0]; if(!p)return "";
  return `Hola ${nom} 👋\nTu pausa está anotada: ${p.meses===1?`en ${_mesSolo(p.desde)} no aportas`:`de ${_mesSolo(p.desde)} a ${_mesSolo(p.desde+p.meses-1)} no aportas`} y en ${_txtIdx(p.desde+p.meses)} vuelves a aportar. En la imagen tienes el detalle. Si tienes cualquier duda, pregúntame.`; }
function pausaEnviarWA(mid){ const m=DATA.members.find(x=>x.id===mid); if(!m||!pausaVigente(m))return; _compartirImagenWA(m,pausaResumenHTML(m,380),_pausaTextoWA(m),`Pausa_${m.name.split(" ")[0]}.png`); }
function pausaOkModalHTML(){
  const m=DATA.members.find(x=>x.id===(MODAL&&MODAL.mid)); if(!m)return ""; const nom=escH(m.name.split(" ")[0]);
  return `<div class="modal-title">✅ Pausa anotada — ${escH(m.name)}</div>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px;line-height:1.45">Esto es lo que verá ${nom}: se lo puedes enviar ahora. En su enlace verá su ficha con un aviso de la pausa.</div>
    ${pausaResumenHTML(m)}
    <button onclick="pausaEnviarWA('${esc(m.id)}')" style="width:100%;margin-top:12px;padding:12px;border-radius:12px;border:none;background:#25D366;color:#fff;font-size:15px;font-weight:800;cursor:pointer">💬 Enviar aviso a ${nom}</button>
    <button onclick="closeModal()" style="width:100%;padding:10px;margin-top:8px;border:none;background:transparent;color:var(--muted);font-size:13px;cursor:pointer">Cerrar</button>`;
}
// Aviso en su ficha (enlace personal) mientras la pausa está en curso o por empezar
function pausaAvisoFichaHTML(m){
  const p=pausaVigente(m); if(!p)return ""; const k="pausa-det-"+m.id, ab=!!DESP[k];
  return `<div style="margin:12px 0 4px;border:1.5px solid #8CC5A0;background:#F4F9F6;border-radius:14px;padding:12px 14px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div style="font-size:16px;font-weight:800;color:#1B4332">⏸ Pausa</div>
      <button onclick="DESP['${k}']=!DESP['${k}'];render()" style="padding:8px 12px;border-radius:9px;border:1.5px solid #2D6A4F;background:#fff;color:#1B4332;font-size:13px;font-weight:800;cursor:pointer">${ab?"Ocultar el detalle ▲":"Ver el detalle ▼"}</button></div>
    ${ab?`<div style="margin-top:10px">${pausaResumenHTML(m,0,true)}</div>`:`<div style="font-size:13.5px;color:#1f2a24;line-height:1.5;margin-top:6px">${p.meses===1?`En ${_txtIdx(p.desde)} no aportas`:`De ${_txtIdx(p.desde)} a ${_txtIdx(p.desde+p.meses-1)} no aportas`}. Vuelves a aportar en <b>${_txtIdx(p.desde+p.meses)}</b>.</div>`}
  </div>`;
}
// Administrador: recuadro en la ficha (Gestión) con la pausa
function pausaGestionHTML(m){
  const p=pausaVigente(m); if(!p)return ""; const rep=_idxMes(DATA.reportMonth,DATA.reportYear), empezada=p.desde<=rep;
  const st="flex:1;padding:9px 6px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;";
  const kA="pausa-anular-"+m.id, armA=!!DESP[kA];
  return `<div style="border:1.5px solid #8CC5A0;background:#F4F9F6;border-radius:12px;padding:10px 12px;margin-bottom:10px">
    <div style="font-size:14px;font-weight:800;color:#1B4332">⏸ ${empezada?"En pausa":"Pausa anotada"}: ${p.meses===1?_txtIdx(p.desde):`${_txtIdx(p.desde)} – ${_txtIdx(p.desde+p.meses-1)}`}</div>
    <div style="font-size:12.5px;color:var(--muted);margin-top:2px">Vuelve a aportar en ${_txtIdx(p.desde+p.meses)} · permanencia hasta ${finPermanenciaIdx(m)!=null?_txtIdx(finPermanenciaIdx(m)):"indefinida"}</div>
    <div style="display:flex;gap:6px;margin-top:8px">
      <button onclick="pausaEnviarWA('${esc(m.id)}')" style="${st}border:none;background:#25D366;color:#fff">💬 Enviar aviso</button>
      ${empezada?`<button onclick="salidaDesdePausa('${esc(m.id)}')" style="${st}border:1.5px solid #C0492C;background:#fff;color:#C0492C">🏁 No vuelve</button>`
        :`<button onclick="${armA?`anularPausa('${esc(m.id)}')`:`DESP['${kA}']=true;render()`}" style="${st}border:1.5px solid #C0492C;background:${armA?"#C0492C":"#fff"};color:${armA?"#fff":"#C0492C"}">${armA?"¿Seguro?":"Anular pausa"}</button>`}</div></div>`;
}
function anularPausa(mid){ const m=DATA.members.find(x=>x.id===mid); const p=m&&pausaVigente(m); if(!p)return; p.anulada=true; p.fechaAnulada=_hoyDMA(); delete DESP["pausa-anular-"+mid]; save(); render(); toast("Pausa anulada"); }
function pausaVuelve(mid){ const m=DATA.members.find(x=>x.id===mid); const p=m&&pausaVigente(m); if(!p)return; p.vuelveOk=true; save(); render(); toast("✓ Anotado: vuelve a aportar en "+_txtIdx(p.desde+p.meses)); }
// No vuelve: salida con su último aporte antes de la pausa; se paga el mes siguiente al último de pausa (PE-8)
function salidaDesdePausa(mid){
  const m=DATA.members.find(x=>x.id===mid); const p=m&&pausaVigente(m); if(!p)return;
  const ult=p.desde-1, d=salidaV18(m,ult);
  openModal('baja',{mid,bajaUltimoIdx:ult,bajaAvisoIdx:ult-d.avisoMeses+1,bajaStep:2,desdePausa:p.id});
}
function telefonosGestionHTML(asoc,terc){
  const todos=[...asoc,...terc], con=todos.filter(m=>m.phone).length, ab=!!DESP["mg-tel"];
  let h=`<div class="mg-acc-head" onclick="DESP['mg-tel']=!DESP['mg-tel'];render()">
      <span>📞 Teléfonos <span class="mg-acc-num">${con}/${todos.length}</span></span>
      <span class="mg-acc-fl">${ab?"▲ ocultar":"▼ mostrar"}</span></div>`;
  if(!ab)return h;
  const fila=m=>`<div class="mg-card" data-nombre="${escH(m.name.toLowerCase())}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:8px">
      <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700;color:var(--dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escH(m.name)}</div>
      <div style="font-size:11.5px;color:${m.type==="tercero"?"#C75B0E":"var(--muted)"}">${m.type==="tercero"?"Tercero":"Asociado"}</div></div>
      <input type="tel" inputmode="tel" placeholder="Sin teléfono" value="${escH(m.phone||"")}" onchange="guardarTelefono('${esc(m.id)}',this.value,this)" style="width:150px;padding:9px 10px;border:1.5px solid ${m.phone?"#8CC5A0":"var(--border)"};border-radius:10px;font-size:15px">
    </div>`;
  const lista=l=>(TEL_SOLO_SIN?l.filter(m=>!m.phone):l);
  h+=`<div style="margin:8px 0 14px">
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:8px;line-height:1.4">Escribe el número y pasa a la siguiente casilla: se guarda solo. No se envía ningún mensaje.</div>
    <div style="display:flex;gap:6px;margin-bottom:10px">${[[false,"Todos"],[true,"Solo sin teléfono"]].map(([v,t])=>`<button onclick="TEL_SOLO_SIN=${v};render()" style="flex:1;padding:9px 4px;border-radius:10px;border:1.5px solid ${TEL_SOLO_SIN===v?"#1B4332":"#E3DDD2"};background:${TEL_SOLO_SIN===v?"#1B4332":"#fff"};color:${TEL_SOLO_SIN===v?"#fff":"#3B3B3B"};font-size:13px;font-weight:700;cursor:pointer">${t}</button>`).join("")}</div>
    ${lista(asoc).map(fila).join("")}${lista(terc).map(fila).join("")}
    ${!lista(asoc).length&&!lista(terc).length?`<div style="text-align:center;color:var(--muted);font-size:13px;padding:10px">✓ Todos tienen teléfono</div>`:""}
  </div>`;
  return h;
}
function guardarTelefono(mid,v,el){
  const m=DATA.members.find(x=>x.id===mid); if(!m)return;
  const t=_telLimpio(v); if(t===(m.phone||""))return;
  if(t&&t.replace(/\D/g,"").length<9){ toast("⚠️ Ese número parece incompleto: revisa que tenga 9 cifras (o el prefijo del país)",4000); }
  m.phone=t; save();
  if(el){ el.value=t; el.style.borderColor=t?"#8CC5A0":"var(--border)"; }
  toast(t?`📞 Teléfono de ${m.name.split(" ")[0]} guardado`:`Teléfono de ${m.name.split(" ")[0]} borrado`);
}
function telefonoModalHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid); if(!m)return "";
  return `<div class="modal-title">📞 Teléfono de ${escH(m.name.split(" ")[0])}</div>
<div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Solo se guarda. No se envía ningún mensaje.</div>
<input id="tel-in" class="m-input" type="tel" inputmode="tel" placeholder="Ej.: 612 345 678" value="${escH(m.phone||"")}">
<button class="m-primary" onclick="guardarTelefono('${esc(m.id)}',document.getElementById('tel-in').value);closeModal()">Guardar</button>`;
}

// ══ v45.21 · BIENVENIDA POR WHATSAPP ══════════════════════════════════════════════════════
function _textoBienvenida(m){
  const nom=m.name.split(" ")[0], url=buildMemberUrl(m.id);
  if(m.type==="tercero")return `¡Hola ${nom}! 👋 Te escribo de Nuevos Horizontes.\n\nEn este enlace puedes ver siempre tu ficha: lo que te toca pagar cada mes y tu calendario de cuotas:\n${url}\n\nGuárdalo en favoritos 📌. Cualquier duda, escríbeme.`;
  const fin=finPermanenciaIdx(m);
  const perm=m.ciclo===0?"indefinida":m.ciclo!=null?`${m.ciclo} meses${fin!=null?` (hasta ${_txtIdx(fin)})`:""}`:"—";
  const ini=m.joinMonth?MONTHS_FULL[MONTHS.indexOf(m.joinMonth)].toLowerCase()+" "+m.joinYear:"";
  return `¡Hola ${nom}! 👋 Te damos la bienvenida a Nuevos Horizontes 🌱\n\nYa formas parte del fondo. Tus datos:\n• Aporte mensual: ${m.aporte||50} € (cada mes puedes elegir 50, 100, 150 o 200 €)\n• Permanencia: ${perm}${ini?`\n• Primer aporte: ${ini}`:""}\n\nEn este enlace puedes ver siempre tu ficha: lo que te toca cada mes, tus aportes y tu beneficio. También tienes simuladores para ver cuánto podrías pedir y cuánto puedes ganar:\n${url}\n\nGuárdalo en favoritos 📌. Cualquier duda, escríbeme.`;
}
function abrirBienvenida(mid,trasAlta){ const m=DATA.members.find(x=>x.id===mid); if(!m)return; setTimeout(()=>openModal('bienvenida',{mid,trasAlta:!!trasAlta}),trasAlta?60:0); }
function bienvenidaModalHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid); if(!m)return "";
  const txt=_textoBienvenida(m);
  return `<div class="modal-title">📲 Bienvenida para ${escH(m.name.split(" ")[0])}</div>
${MODAL.trasAlta?`<div style="font-size:12.5px;color:#1B4332;background:#EEF7F1;border-radius:9px;padding:7px 10px;margin-bottom:10px">✓ ${m.type==="tercero"?"Tercero":"Asociado"} dado de alta. Envíale ahora su bienvenida con su enlace.</div>`:""}
<label class="m-label">Teléfono (WhatsApp) · opcional</label>
<input id="bv-tel" class="m-input" type="tel" inputmode="tel" placeholder="Ej.: 612 345 678" value="${escH(m.phone||"")}">
<label class="m-label">Mensaje (puedes cambiarlo)</label>
<textarea id="bv-txt" class="m-input" style="height:230px;font-size:13.5px;line-height:1.4;resize:vertical">${escH(txt)}</textarea>
<div style="font-size:12px;color:var(--muted);margin:-4px 0 12px">Con teléfono se abre directamente su chat; sin teléfono, WhatsApp te deja elegir a quién.</div>
<button style="width:100%;padding:13px;border-radius:14px;background:#25D366;color:#fff;font-size:15px;font-weight:800;border:none;cursor:pointer;margin-bottom:8px" onclick="enviarBienvenida()">💬 Enviar por WhatsApp</button>
<div style="display:flex;gap:8px">
  <button class="link-copy-btn" style="flex:1;margin:0" onclick="_copyFallback(document.getElementById('bv-txt').value)">📋 Copiar mensaje</button>
  <button class="link-copy-btn" style="flex:1;margin:0" onclick="verComoAsociado('${esc(m.id)}')">👁️ Ver su enlace</button>
</div>
<button style="width:100%;margin-top:10px;padding:10px;border:none;background:transparent;color:var(--muted);font-size:13px;text-decoration:underline;cursor:pointer" onclick="closeModal()">Ahora no</button>`;
}
function enviarBienvenida(){
  const m=DATA.members.find(x=>x.id===(MODAL&&MODAL.mid)); if(!m)return;
  const tel=_telLimpio(document.getElementById("bv-tel")?.value), txt=document.getElementById("bv-txt")?.value||_textoBienvenida(m);
  if(tel!==(m.phone||"")){ m.phone=tel; save(); }
  const d=_telWA(tel);
  window.open("https://wa.me/"+(d||"")+"?text="+encodeURIComponent(txt),"_blank");
  closeModal(); toast("📲 Bienvenida abierta en WhatsApp");
}



// ── FICHA COMPLETA ASOCIADO ─────────────────────────────────────────────────
function openFicha(mid){FICHA_ID=mid;FICHA_TAB="resumen";TAB="asociados";render();} // v45.23: se abre en «Resumen»
function closeFicha(){FICHA_ID=null;render();}
function _fichaResumenHTMLbase(m){
  const rm=DATA.reportMonth,ry=DATA.reportYear;
  const isTerc=m.type==="tercero";
  const months=memberMonths(m);
  const d=desgloseDelMes(m);
  const md=getMesData(rm,ry);
  const MS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const MF=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const allLoans=[...(m.loans||[])]; // solo ayudas ACTIVAS en la vista grupal
  const totalLoans=allLoans.length;

  let h=`<div class="card ${isTerc?"terc":""}">`;

  // Cabecera — nombre más grande
  h+=`<div class="card-head">
    <div>
      <div class="card-name" style="font-size:21px">${escH(m.name)}</div>
      ${m.joinMonth?`<div class="member-info" style="font-size:13.5px"><span>📅 Miembro desde ${MF[MS.indexOf(m.joinMonth)]} ${m.joinYear}</span></div>`:`<div style="font-size:13.5px;color:var(--muted);margin-top:2px">${isTerc?"🤝 Tercero · Ref: "+escH(avalistaNombre(m)||"—"):""}</div>`}
    </div>
  </div>`;

  // Aporte mensual: NO se muestra arriba, va en la barra naranja del total

  // Ayudas con timeline visual
  if(allLoans.length===0){
    h+=`<div style="padding:14px 16px;text-align:center;color:var(--muted);font-size:14px">Sin ayudas activas</div>`;
  }
  allLoans.forEach((loan,li)=>{
    const activeIdx=activePayIndex(loan,rm,ry);
    h+=`<div class="loan"${li>0?' style="border-top:1px dashed #E8E0D8"':""}>`;
    h+=`<div class="loan-row"><div><div class="loan-lbl">Ayuda ${escH(loan.gMonth)} ${loan.gYear}</div><div class="loan-amt">${loan.capital},00 €</div></div></div>`;
    h+=`<div class="timeline">`;
    loan.pays.forEach((p,pi)=>{
      const isActive=(pi===activeIdx);
      const st=(p.aplazada&&!p.paid)?"aplazada":p.paid?"paid":isActive?"due":"future";
      // En readonly: div, no botón
      h+=`<div class="cuota cuota-${st}${esUltimaCuota(loan,pi)?" cuota-ultima":""}"><div class="cuota-month">${p.m}</div><div class="cuota-val" style="white-space:nowrap">${fmtEur(cuotaDe(loan,pi))} €</div><div class="cuota-status">${p.aplazada&&!p.paid?"⏸ APLAZ.":p.paid?"PAGADO":isActive?"POR PAGAR":"—"}</div></div>`;
    });
    h+=`</div></div>`;
  });

  // Barra: aporte + cuotas del mes objetivo con su estado (pagado/pendiente).
  // Cada cuota ya viene filtrada al mes objetivo exacto (sin adelantar la siguiente).
  const rmO=d.mesObj, ryO=d.anioObj;
  const tot=totalDelMes(m,rm,ry); // Opción 1: total del MES DE REPORTE (aporte+cuotas)
  const okColor="#8CE0B0", pendColor="#FFD9A3";
  // Opción 1: líneas de detalle del MES DE REPORTE (coherentes con el total).
  const _dr=descuentoReferidoMes(m.id,rm,ry);
  const _descRef=_dr.descuento;
  const _baseR=aporteBrutoMes(m,rm,ry); // v45: aporte elegido ese mes
  const lineaAporte=!isTerc?`<div style="display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.9);padding:3px 0"><span>Aporte</span><span style="font-weight:700;color:${tot.aportePagado?okColor:"#fff"}">${filaAporteValorHTML(m,rm,ry,tot.aportePagado)}</span></div>${aporteMostradoMes(m,rm,ry).base?`<div style="font-size:11px;color:rgba(255,255,255,.7);padding:0 0 3px">${AYUDA_ELIGE_APORTE}</div>`:""}`:"";
  const lineaExtra="";
  const lineaDesc=(!isTerc&&_descRef>0)?(aporteMostradoMes(m,rm,ry).abierto
    ?`<div onclick="DESP['${esc(m.id)}-refdescG']=!DESP['${esc(m.id)}-refdescG'];render()" style="cursor:pointer;font-size:11.5px;color:#F1D58A;padding:0 0 3px">🎁 Por referir te descontamos ${_descRef} € del aporte que elijas <span style="opacity:.7">${DESP[m.id+"-refdescG"]?"▲":"▼"}</span></div>`
    :`<div onclick="DESP['${esc(m.id)}-refdescG']=!DESP['${esc(m.id)}-refdescG'];render()" style="cursor:pointer;display:flex;justify-content:space-between;font-size:12px;color:#F1D58A;padding:3px 0"><span>🎁 Descuento por referir (${_dr.nReferidos}) <span style="opacity:.7">${DESP[m.id+"-refdescG"]?"▲":"▼"}</span></span><span style="font-weight:700">− ${_descRef} €</span></div>`)+referidosDesplegableHTML(m.id,rm,ry,m.id+"-refdescG"):"";
  const lineasCuotas=tot.cuotas.map(c=>{return `<div style="display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.9);padding:3px 0"><span>${etiquetaCuotaHTML(c.idx+1,c.loan.n,rm,ry)}${c.aplazada?` <span style="color:#E8A04B">· aplazada</span>`:""}</span><span style="font-weight:700;color:${c.paid?okColor:"#fff"}">${fmtEur(c.inst)} € ${c.aplazada?"⏸️":c.paid?"✅":"⏳"}</span></div>`;}).join("");
  const hayLineas=lineaAporte||lineaExtra||lineaDesc||lineasCuotas;
  const _tbG=totalMesBloqueHTML(m,rm,ry,tot,isTerc,MF,MS);
  h+=`<div class="total-ban" style="flex-direction:column;align-items:stretch;gap:0">
    ${hayLineas?`<div style="${_tbG?"padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.25);margin-bottom:8px":""}">${lineaAporte}${lineaExtra}${lineaDesc}${lineasCuotas}</div>`:""}
    ${_tbG}
  </div>`;

  h+=`</div>`;
  return h;
}

// Genera un desplegable claro. mid+key identifican el estado en DESP.
// titulo: texto principal; resumen: lo que se ve cerrado (ej. "3 ayudas · 3000€");
// contenido: HTML interno; abierto: bool
function dropFicha(mid,key,titulo,resumen,contenido,abierto){
  const tg=`DESP['${mid}-${key}']=!DESP['${mid}-${key}'];render()`;
  let h=`<button class="ft-drop ${abierto?"abierto":""}" onclick="${tg}">
    <span class="ft-drop-info">
      <span class="ft-drop-titulo">${titulo}</span>
    </span>
    <span class="ft-drop-chevron">›</span>
  </button>`;
  if(abierto) h+=`<div class="ft-drop-body">${contenido}</div>`;
  return h;
}
// Etiqueta con sello dorado para las listas del mes (ficha, reporte grupal, cierre).
function etiquetaCuotaHTML(num,total,rm,ry){
  if(total>1&&num>=total)return `<span class="ult-chip">🏁 Última cuota</span> ${escH(rm)} ${ry}`;
  if(total<=1)return `Cuota única · ${escH(rm)} ${ry}`;
  return `Cuota ${escH(rm)} ${ry} · ${num}/${total}`;
}
function etiquetaCuota(num,total){
  if(total<=1)return "Cuota única";
  if(num>=total)return "Última cuota";
  return `Cuota ${num}/${total}`;
}
function _salidaDetalle(x){ return x.clase==="pos"?(x.tipo==="fin"?`sin decidir: si termina, ${fmtEur(x.importe)} €; si amplía y retira, ${fmtEur(x.retira)} €`:"sin decidir"):""; }
function salidasPrevistasDocHTML(rm,ry){
  const S=salidasPrevistas(rm,ry); if(!S.lista.length)return "";
  return `<h4 style="margin:8px 0 3px">💸 Salidas previstas (${MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase()} y el mes siguiente)</h4>
  <table class="doc-t doc-mini"><tbody>${S.lista.map(x=>`<tr><td>${escH(x.m.name)} — ${x.txt}${x.clase==="pos"?` <span class="doc-sub">(${_salidaDetalle(x)})</span>`:""}</td><td>del 5 al 10 de ${_txtIdx(x.pagoIdx)}</td><td class="n">${x.clase==="pos"?"posible ":""}${_eur(x.importe)}</td><td class="c"><span class="doc-check"></span></td></tr>`).join("")}
  <tr class="doc-subt"><td colspan="2">Pagado${S.posible?` <span class="doc-sub">(posible además: ${_eur(S.posible)})</span>`:""}</td><td class="n">${_eur(S.comprometido)}</td><td></td></tr></tbody></table>`;
}
function salidasPrevistasHTML(rm,ry){
  const S=salidasPrevistas(rm,ry); if(!S.lista.length)return "";
  const k="salidas-prev", ab=!!DESP[k];
  let h=`<div class="mes-card" style="border:1.5px solid #E7B9A8;background:#FFF6F2">
    <button onclick="DESP['${k}']=!DESP['${k}'];render()" style="width:100%;background:none;border:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:0;text-align:left">
      <span class="mes-title" style="margin:0;color:#7A2E18">💸 Salidas previstas — ${fmtEur(S.comprometido)} €${S.posible?` <span style="font-weight:600;font-size:13px;color:#9A5A44">(+ ${fmtEur(S.posible)} € posibles)</span>`:""}</span>
      <span class="ft-drop-chevron" style="${ab?'transform:rotate(90deg)':''}">›</span>
    </button>`;
  if(ab){
    h+=`<div style="margin-top:10px">`+S.lista.map(x=>`<div style="padding:9px 0;border-top:1px solid #F3D9CE;font-size:13.5px;line-height:1.45;color:#3B2A22;display:flex;justify-content:space-between;gap:10px">
      <span><b style="cursor:pointer;color:var(--dark)" onclick="openFicha('${esc(x.m.id)}')">${escH(x.m.name)}</b><br>${x.txt} · del 5 al 10 de ${_txtIdx(x.pagoIdx)}${x.clase==="pos"?`<br><span style="color:#9A5A44">${_salidaDetalle(x)}</span>`:""}</span>
      <b style="white-space:nowrap;color:${x.clase==="pos"?"#9A5A44":"#C0492C"}">${x.clase==="pos"?"¿":""}${fmtEur(x.importe)} €${x.clase==="pos"?"?":""}</b></div>`).join("")+
      `<div style="font-size:12px;color:#7A5A4A;margin-top:8px;line-height:1.4">Antes de aprobar ayudas nuevas, lo que entra estos dos meses debe cubrir lo comprometido (Maestro FO-4). La reserva es solo un dato informativo.</div></div>`;
  }
  return h+`</div>`;
}
function avisosPermanenciaHTML(rm,ry){
  const av=avisosPermanencia(rm,ry); if(!av.length)return "";
  const k="avisos-perm", ab=!!DESP[k];
  let h=`<div class="mes-card" style="border:1.5px solid #E3C766;background:#FFFBEF">
    <button onclick="DESP['${k}']=!DESP['${k}'];render()" style="width:100%;background:none;border:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:0;text-align:left">
      <span class="mes-title" style="margin:0;color:#6B5310">⏰ Permanencias — ${av.length} aviso${av.length>1?"s":""}</span>
      <span class="ft-drop-chevron" style="${ab?'transform:rotate(90deg)':''}">›</span>
    </button>`;
  if(ab){
    h+=`<div style="margin-top:10px">`+av.map(a=>`<div style="padding:9px 0;border-top:1px solid #F0E3B8;font-size:13.5px;line-height:1.45;color:#3B3320">
      <b style="cursor:pointer;color:var(--dark)" onclick="openFicha('${esc(a.m.id)}')">${escH(a.m.name)}</b>${a.tipo==="pasada"?' <span style="color:#C0492C;font-weight:700">· pendiente</span>':""}<br>${a.txt}${avisoBotonesHTML(a)}</div>`).join("")+`<div style="text-align:right;margin-top:8px"><button onclick="irPermanencias()" style="background:none;border:none;color:#2D6A4F;font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer;padding:4px 0">Ver todas las permanencias →</button></div></div>`;
  }
  return h+`</div>`;
}
// v45.1: decisión directa desde el aviso (ampliar, terminar o retirar el beneficio)
function avisoBotonesHTML(a){
  const st="flex:1;padding:9px 6px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;";
  if(a.tipo==="pausa")return `<div style="display:flex;gap:6px;margin-top:7px">
    <button onclick="pausaVuelve('${esc(a.m.id)}')" style="${st}border:1.5px solid #2D6A4F;background:#fff;color:#1B4332">✓ Vuelve</button>
    <button onclick="salidaDesdePausa('${esc(a.m.id)}')" style="${st}border:1.5px solid #C0492C;background:#fff;color:#C0492C">🏁 No vuelve</button></div>`; // v45.33
  if(a.tipo==="aniv"){
    const r=retiradasDe(a.m).find(x=>x.finIdx===a.fin);
    if(r)return `<div style="margin-top:6px;font-size:12.5px;color:#1B7A3D;font-weight:700">✓ Retirada anotada: ${fmtEur(importeRetirada(a.m,r))} € · se paga en ${_txtIdx(a.fin+1)}</div>`;
    return `<div style="display:flex;gap:6px;margin-top:7px"><button onclick="openModal('retirada',{mid:'${esc(a.m.id)}',finIdx:${a.fin}})" style="${st}border:1.5px solid #2D6A4F;background:#2D6A4F;color:#fff">💶 Retira su beneficio</button></div>`;
  }
  return `<div style="display:flex;gap:6px;margin-top:7px">
    <button onclick="openModal('ciclo',{mid:'${esc(a.m.id)}'})" style="${st}border:1.5px solid #2D6A4F;background:#fff;color:#1B4332">🔁 Amplía</button>
    <button onclick="openModal('baja',{mid:'${esc(a.m.id)}',bajaUltimoIdx:${a.fin}})" style="${st}border:1.5px solid #C0492C;background:#fff;color:#C0492C">🏁 Termina</button></div>`;
}
function avisoSubidaNivelHTML(m,rm,ry){
  const s=subidaNivelReciente(m,rm,ry);
  if(!s)return "";
  const clave=m.id+"-nivelaviso";
  const abierto=!!DESP[clave];
  const nombre=escH((m.name||"").trim().split(/\s+/)[0]||"");
  let h=`<button onclick="DESP['${esc(clave)}']=!DESP['${esc(clave)}'];render()" style="width:100%;display:flex;align-items:center;gap:12px;text-align:left;cursor:pointer;margin:0 0 12px;padding:13px 15px;border-radius:16px;border:1.5px solid #E3C766;background:linear-gradient(135deg,#FFF8E1,#FBEFC7);box-shadow:0 2px 8px rgba(201,162,39,.18)">
    <span class="ic-badge">📈</span>
    <span style="flex:1;min-width:0">
      <span style="display:block;font-size:15px;font-weight:800;color:#6B5310">¡Empiezas tu ${s.nivel===3?"3.er":"2.º"} año de permanencia!</span>
      <span style="display:block;font-size:12.5px;color:#8A6D1C;margin-top:2px">Cada 50 € ganan ${s.ahora} € en lugar de ${s.antes} € · ${abierto?"toca para cerrar":"toca para leer"}</span>
    </span>
    <span style="font-size:20px;color:#B08A1E;transform:rotate(${abierto?90:0}deg)">›</span>
  </button>`;
  if(abierto){
    h+=`<div style="margin:-4px 0 14px;padding:16px 18px;border-radius:16px;background:#fff;border:1px solid #EAD9A0;box-shadow:0 2px 10px rgba(0,0,0,.05);font-size:14px;line-height:1.55;color:#2E3B33">
      <div style="font-size:16px;font-weight:800;color:#1B4332;margin-bottom:8px">Enhorabuena, ${nombre} 👏</div>
      <p style="margin:0 0 10px">Has cumplido <b>${s.meses} meses de permanencia</b> en Nuevos Horizontes y empiezas tu <b>${s.nivel===3?"tercer":"segundo"} año</b>.</p>
      <p style="margin:0 0 10px">Desde <b>${s.mesNombre} de ${s.anio}</b>, por cada 50 € que aportes ganas <b>${s.ahora} €</b> en lugar de <b>${s.antes} €</b>. Se suma cada mes a tu beneficio guardado, que puedes consultar en la pestaña <b>Beneficios</b>.</p>
      <p style="margin:0 0 12px">Gracias por tu constancia y tu confianza: cada aportación hace más fuerte el apoyo entre todos los asociados.</p>
      <div style="font-size:12.5px;color:#6B7A70;font-weight:700">— Coordinación de Nuevos Horizontes</div>
    </div>`;
  }
  return h;
}

// v45.2 (Maestro v18.4 · GE-1, SA-6, SA-10): en la ficha (y en el enlace del asociado) se ve quién
// es su aval y de quién es aval él. Sin importes: solo si esa persona tiene una ayuda en curso.
function avalFichaHTML(m){
  if(!m||m.type!=="asociado"||!m.joinMonth)return "";
  const vp=vistaPersonal(); let h="";
  const a=avalDe(m);
  if(a&&!a.fundador)h+=`<div class="ft-row"><span class="ft-lbl">${vp?"Tu aval":"Aval"}</span><span class="ft-val">${escH(a.m?a.m.name:a.nombre)}</span></div>`;
  const activa=o=>(o.loans||[]).some(l=>(l.pays||[]).some(p=>!p.paid));
  const avalados=DATA.members.filter(o=>o.type==="asociado"&&!o.baja&&o.id!==m.id&&((avalDe(o)||{}).m===m))
    .sort((x,y)=>x.name.localeCompare(y.name));
  if(avalados.length){
    h+=`<div class="ft-row" style="border-bottom:none"><span class="ft-lbl"><b>${vp?"Eres aval de":"Es aval de"}</b></span><span class="ft-val">${avalados.length}</span></div>`;
    avalados.forEach(o=>{ h+=`<div class="ft-row"><span class="ft-lbl">${escH(o.name)}</span><span class="ft-val" style="font-size:12.5px;color:#B06A1E">${activa(o)?"ayuda en curso":""}</span></div>`; });
  }
  return h;
}
function fichaHTML(m,readonly=false){ return readonly?_fichaHTMLpersonal(m,true):_fichaHTMLbase(m,false); }
function _fichaHTMLbase(m,readonly=false){
  const rm=DATA.reportMonth,ry=DATA.reportYear;
  const months=memberMonths(m);
  const lv=memberLevel(m);
  const benAcum=memberBenefitAccum(m);
  const d=desgloseDelMes(m); // d.apNeto se usa más abajo en "Estado del aporte"
  // Mes de referencia de TODA la ficha: el mes DEL SISTEMA (rm/ry), no el objetivo.
  // Es deliberado: fichaHTML es lo que ven los asociados (enlace ?socio=, ?yo=, y
  // "Mi reporte" en ?grupo=), y debe coincidir SIEMPRE con fichaResumenHTML (el
  // reporte grupal que reciben por WhatsApp) — que también usa el mes del sistema para
  // que el total del grupo sea "el mismo mes para todos". Si aquí usáramos el mes
  // objetivo, un asociado podría leer "Agosto" en su enlace y "Julio" en el reporte
  // grupal del mismo día. Solo cardHTML (la tarjeta de la lista de Asociados, vista
  // interna de Ángel) usa el mes objetivo — y ahí no hay riesgo porque nadie más la ve.
  const tot=totalDelMes(m,rm,ry);
  const isTerc=m.type==="tercero";
  const md=getMesData(rm,ry);
  const MS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const MF=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const mid=m.id;
  const isOpen=(k)=>!!(DESP[mid+"-"+k]);
  const tog=(k)=>`DESP['${mid}-${k}']=!DESP['${mid}-${k}'];render()`;

  let h=readonly?"":`<div style="display:flex;gap:8px;align-items:center"><button class="btn-back" style="flex:1" onclick="closeFicha()">← Volver a Asociados</button><button class="btn-back" style="flex:0 0 auto;color:#3D4080" onclick="verComoAsociado('${esc(m.id)}')">👁️ Ver como lo ve</button></div>`;

  /* ────────────────────────────────────────────────
     1. TARJETA DE IDENTIDAD
  ──────────────────────────────────────────────── */
  const initials=m.name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const esFundadorF=(!isTerc&&m.joinMonth==="Ago"&&m.joinYear===2025);
  h+=`<div class="fid-card"${esFundadorF?' style="border-left:3px solid #C9A227"':""}>
    <div class="fid-top">
      <div class="fid-avatar">${initials}</div>
      <div>
        <div class="fid-name">${escH(m.name)}</div>
        ${esFundadorF?`<span style="display:inline-block;margin:3px 0 1px;font-size:11px;font-weight:700;color:#9A7B1A;background:#FBF3DC;border:1px solid #EAD9A0;border-radius:20px;padding:2px 10px;letter-spacing:.3px">⭐ Fundador</span>`:""}
        <div class="fid-since">${isTerc?"Persona avalada · Ref: "+escH(avalistaNombre(m)||"—"):"Asociado desde "+escH(MF[MS.indexOf(m.joinMonth)]||m.joinMonth||"")+" "+(m.joinYear||"")}</div>
      </div>
    </div>`;
  if(isTerc){
    h+=`<div class="fid-pills"><span class="fpill fpill-b">Tercero avalado</span></div>`;
  }
  h+=`</div>`;
  h+=avisoSubidaNivelHTML(m,rm,ry); // v44.17: aviso de subida de nivel (mes de la subida y el siguiente)

  /* ────────────────────────────────────────────────
     2. LO QUE DEBES PAGAR ESTE MES
     Mes de referencia: rm/ry (el del sistema) — el mismo que usa el bloque 3
     "Estado del aporte" y fichaResumenHTML (reporte grupal). Deliberado, ver
     comentario junto a "const tot=" más arriba.
  ──────────────────────────────────────────────── */
  const mesLabel=MF[MS.indexOf(rm)]+" "+ry;
  const _dr2=descuentoReferidoMes(m.id,rm,ry);
  const _base2=aporteBrutoMes(m,rm,ry); // v45: aporte elegido ese mes
  h+=`<div class="desg-card">
    <div class="desg-titulo">📋 Corresponde este mes · ${mesLabel}</div>`;

  if(!isTerc&&enPausaMes(m,rm,ry)){ // v45.33
    h+=`<div class="desg-fila"><span class="desg-lbl">Aporte</span><span class="desg-val ok">⏸ En pausa</span></div>`;
  } else if(!isTerc){
    h+=`<div class="desg-fila">
      <span class="desg-lbl">${vistaPersonal()?"Aporte":`Aporte de ${escH(MF[MS.indexOf(rm)].toLowerCase())}`}</span>
      <span class="desg-val ${tot.aportePagado?"ok":"pend"}">${filaAporteValorHTML(m,rm,ry,tot.aportePagado)}</span>
    </div>`;
    if(aporteMostradoMes(m,rm,ry).base)h+=`<div style="font-size:12.5px;color:rgba(255,255,255,.75);margin:-2px 0 6px">${AYUDA_ELIGE_APORTE}</div>`;
    if(_dr2.descuento>0){
      const _kRef=mid+"-refdesc"; // v44.17: toca la línea para ver a quién refirió
      h+=aporteMostradoMes(m,rm,ry).abierto
        ?`<div onclick="DESP['${esc(_kRef)}']=!DESP['${esc(_kRef)}'];render()" style="cursor:pointer;font-size:12.5px;color:#F1D58A;margin:0 0 8px">🎁 Por referir te descontamos ${_dr2.descuento} € del aporte que elijas <span style="font-size:11px;opacity:.75">${DESP[_kRef]?"▲ ocultar":"▼ ver quién"}</span></div>`
        :`<div class="desg-fila" onclick="DESP['${esc(_kRef)}']=!DESP['${esc(_kRef)}'];render()" style="cursor:pointer">
      <span class="desg-lbl">− Descuento por referidos (${_dr2.nReferidos} × 10 €) <span style="font-size:11px;opacity:.7">${DESP[_kRef]?"▲ ocultar":"▼ ver quién"}</span></span>
      <span class="desg-val desc">−${_dr2.descuento} €</span>
    </div>`;
      h+=referidosDesplegableHTML(m.id,rm,ry,_kRef);
    }
  }
  tot.cuotas.forEach(c=>{
    h+=`<div class="desg-fila">
      <span class="desg-lbl">${etiquetaCuotaHTML(c.idx+1,c.loan.n,rm,ry)}${c.aplazada?` · aplazada`:""}</span>
      <span class="desg-val ${c.paid?"ok":"pend"}">${fmtEur(c.inst)} € ${c.aplazada?"⏸️":c.paid?"✅":"⏳"}</span>
    </div>`;
  });
  if(isTerc&&tot.cuotas.length===0){
    h+=`<div style="color:rgba(255,255,255,.55);font-size:13px;padding:8px 0">Sin cuotas este mes</div>`;
  }
  { const _tb=totalMesBloqueHTML(m,rm,ry,tot,isTerc,MF,MS);
    h+=(_tb?`<div class="desg-separador"></div>${_tb}`:"")+`</div>`; }

  /* 3. (v44.16) Aquí estaba el bloque "Estado del aporte" con un botón para marcar el
     aporte. Se quitó entero: el aporte se marca en el Cierre mensual y el estado ya se ve
     arriba, en "Lo que corresponde pagar" (Total del mes: Al día / Falta …). */

  /* ════════════════════════════════════════════════
     DETALLE DEL ASOCIADO — PESTAÑAS
     Resumen · Beneficios · Ayudas · Aportes
     ("Lo que corresponde pagar" ya se mostró arriba, fuera de pestañas)
  ════════════════════════════════════════════════ */
  const totalExtras=0; // v45: el aporte de cada mes ya incluye lo que puso de más o de menos
  const hist=[...(m.history||[])].sort((a,b)=>b.gYear-a.gYear||(MS.indexOf(b.gMonth)-MS.indexOf(a.gMonth)));
  const totalAyudasRec=hist.reduce((s,x)=>s+x.capital,0);
  const aporteBase=aporteBaseDe(m);                  // v45: aporte habitual
  const cuotasPagadas=aportesPagadosCount(m);
  const totalMensuales=totalAportadoMiembro(m);      // suma del aporte de cada mes pagado
  const totalAportado=totalMensuales;                // se devuelve todo (AP-5)
  const puntuales=(DATA.aportesPuntuales&&DATA.aportesPuntuales[m.id])||[];

  // Beneficios por permanencia (cálculo mes a mes)
  let acumBen=0; const benRows=[];
  if(!isTerc&&m.joinMonth){
    const ji=MS.indexOf(m.joinMonth),jy=m.joinYear;
    const ri2=MS.indexOf(rm),ry2=ry;
    let cm=(ji+1)%12, cy=jy+(ji+1>=12?1:0);
    while(cy<ry2||(cy===ry2&&cm<=ri2)){
      const key=cy+"-"+String(cm+1).padStart(2,"0");
      const dg=beneficioMiembroDesglose(m,key);
      const bn=dg.total;
      acumBen=Math.round((acumBen+bn)*100)/100;
      benRows.push({mes:MS[cm],anio:cy,bn,acum:acumBen,base:dg.base,extra:dg.extra,tieneExtra:dg.tieneExtra,bloques:dg.bloques,v18:dg.keyAporte>=V18_APORTES_DESDE,aportado:aporteBrutoKey(m,dg.keyAporte)});
      cm++; if(cm>=12){cm=0;cy++;}
    }
  }
  // v45.1: beneficio ya retirado sin salir (PE-5, PE-7)
  const retiradoF=isTerc?0:beneficioRetirado(m);
  const _rPend=isTerc?[]:retiradasDe(m).filter(r=>!r.pagada);
  const retPendF=_rPend.length?"se paga del 5 al 10 de "+_txtIdx(pagoRetiradaIdx(_rPend[0])):"";
  const mesKeyBen=ry+"-"+String(MS.indexOf(rm)+1).padStart(2,"0");
  const benMes=(!isTerc&&m.joinMonth)?beneficioMiembroMes(m,mesKeyBen):0;

  // Barra de pestañas (terceros no tienen Beneficios ni Aportes)
  const tabs=isTerc
    ? [["resumen","Resumen"],["ayudas","Ayudas"]]
    : [["resumen","Resumen"],["aportes","Aportes"],["ayudas","Ayudas"],["beneficios","Beneficios"]].concat(avalFichaHTML(m)?[["aval","Aval"]]:[]); // v45.2 · v45.23: Resumen primero
  // Si la pestaña activa no aplica a este miembro, ir a la primera disponible
  if(!tabs.some(t=>t[0]===FICHA_TAB))FICHA_TAB=tabs[0][0];
  h+=`<div class="ft-tabs${tabs.length>=5?" t5":""}">`;
  tabs.forEach(([id,lbl])=>{
    h+=`<button class="ft-tab ${FICHA_TAB===id?"active":""}" onclick="FICHA_TAB='${id}';render()">${lbl}</button>`;
  });
  h+=`</div>`;

  /* ── PESTAÑA RESUMEN ── */
  if(FICHA_TAB==="resumen"){
    h+=`<div class="ft-card">
      <div class="ft-card-title">📊 Resumen general</div>`;
    if(!isTerc){
      // Bloque 1: información del asociado (fondo gris muy sutil)
      h+=`<div style="background:#F7F5F0;border-radius:10px;padding:2px 12px;margin-bottom:10px">
        <div class="ft-row"><span class="ft-lbl">Mes de ingreso</span><span class="ft-val">${escH(MF[MS.indexOf(m.joinMonth)]||"")} ${m.joinYear||""}</span></div>
        <div class="ft-row"><span class="ft-lbl">Meses activo</span><span class="ft-val">${months} ${months===1?"mes":"meses"}</span></div>
        <div class="ft-row"><span class="ft-lbl">Permanencia</span><span class="ft-val">${m.ciclo===0?"Indefinida":m.ciclo!=null?m.ciclo+" meses":"⛔ sin guardar"}${finPermanenciaIdx(m)!=null?`<span style="display:block;font-size:11.5px;font-weight:600;color:var(--muted)">hasta ${_txtIdx(finPermanenciaIdx(m))}</span>`:""}</span></div>
        <div class="ft-row" style="border-bottom:none"><span class="ft-lbl">${vistaPersonal()?"Aporte mínimo al mes":"Aporte habitual"}</span><span class="ft-val">${vistaPersonal()?APORTE_MINIMO:aporteBase} €</span></div>
      </div>`;
      // Bloque 2: lo que se lleva (datos económicos, sin fondo)
      h+=`<div class="ft-row"><span class="ft-lbl">Total aportado al fondo</span><span class="ft-val">${totalAportado} €</span></div>
      <div class="ft-row"><span class="ft-lbl">Beneficios acumulados</span><span class="ft-val" style="color:#2D6A4F">+ ${fmtEur(acumBen)} €</span></div>
      ${retiradoF>0?`<div class="ft-row"><span class="ft-lbl">Beneficio ya retirado${retPendF?` <span style="font-size:11.5px;color:var(--muted)">(${retPendF})</span>`:""}</span><span class="ft-val" style="color:#B08D3E">− ${fmtEur(retiradoF)} €</span></div>`:""}
      <div class="ft-row ft-total"><span class="ft-lbl">Llevas acumulado hasta ahora</span><span class="ft-val" style="color:#1B4332">${fmtEur(_r2(totalAportado+Math.max(0,acumBen-retiradoF)))} €</span></div>`;
    } else {
      h+=`<div class="ft-row"><span class="ft-lbl">Tipo</span><span class="ft-val">Tercero avalado</span></div>
      <div class="ft-row"><span class="ft-lbl">Avalista</span><span class="ft-val">${escH(avalistaNombre(m)||"—")}</span></div>`;
      const activasN=(m.loans||[]).length, cerradasN=(m.closedLoans||[]).length;
      h+=`<div class="ft-row"><span class="ft-lbl">Ayudas</span><span class="ft-val">${activasN} activo${activasN!==1?"s":""} · ${cerradasN} cerrado${cerradasN!==1?"s":""}</span></div>`;
    }
    h+=`</div>`;
  }

  /* ── PESTAÑA AVAL (v45.2 · Maestro GE-1) ── */
  if(FICHA_TAB==="aval"&&!isTerc){
    h+=`<div class="ft-card"><div class="ft-card-title">🤝 Aval</div>${avalFichaHTML(m)}</div>`;
  }

  /* ── PESTAÑA BENEFICIOS ── */
  if(FICHA_TAB==="beneficios" && !isTerc && m.joinMonth){
    const cicloTxt=m.ciclo===0?"indefinida":m.ciclo!=null?`de ${m.ciclo} meses`:"(sin guardar)";
    h+=`<div class="ft-card">
      <div class="ft-card-title">🎁 Permanencia ${cicloTxt}</div>
      <div class="ft-hero">
        <div class="ft-hero-lbl">${retiradoF>0?"Beneficio guardado":"Total acumulado"}</div>
        <div class="ft-hero-val">${retiradoF>0?fmtEur(Math.max(0,_r2(acumBen-retiradoF))):fmtEur(acumBen)} €</div>
        ${retiradoF>0?`<div style="font-size:12.5px;opacity:.85;margin-top:4px">Generado ${fmtEur(acumBen)} € · retirado ${fmtEur(retiradoF)} €${retPendF?" ("+retPendF+")":""}</div>`:""}
      </div>
    </div>`;
    // Historial mes a mes (desplegable)
    if(benRows.length>0){
      let cont="";
      benRows.slice().reverse().forEach(r=>{
        const etqExtra = (r.v18&&r.bloques===0)
          ? `<div style="font-size:12px;color:#C0492C;margin-top:2px">el mes anterior no hubo aporte pagado</div>`
          : r.tieneExtra
          ? `<div style="font-size:12px;color:#B08D3E;margin-top:2px">${r.v18?`por ${r.aportado} € aportados (${r.bloques} × 50 €)`:`incluye + ${r.extra} € por aporte de 100 €`}</div>`
          : "";
        cont+=`<div class="ft-row"><span class="ft-lbl">${r.mes} ${r.anio}${etqExtra}</span><span class="ft-val"><span style="color:#2D6A4F;font-weight:700">+ ${fmtEur(r.bn)} €</span></span></div>`;
      });
      cont+=`<div class="ft-row ft-total"><span class="ft-lbl">Total acumulado</span><span class="ft-val" style="color:#1B4332;font-weight:700">${fmtEur(acumBen)} €</span></div>`;
      h+=dropFicha(mid,"benhist","📅 Historial beneficios por mes",benRows.length+" meses",cont,isOpen("benhist"));
    } else {
      h+=`<div class="ft-card"><div class="ft-empty">Aún no hay beneficios registrados.</div></div>`;
    }
    {
      const mesIng=MF[MS.indexOf(m.joinMonth)||0]||m.joinMonth;
      const mesSig=MF[(MS.indexOf(m.joinMonth)+1)%12];
      const notaCont=`Los beneficios se generan <b>a mes vencido</b>, igual que para todos los asociados. El mes en que ingresaste cuenta como tu primer mes de permanencia, y su beneficio se refleja al mes siguiente.<br><br>
        <b>Ejemplo:</b> si ingresaste en <b>${mesIng}</b>, tu permanencia empieza a contar ese mes y tu primer beneficio aparece en <b>${mesSig}</b>.<br><br>
        El importe de cada mes proviene de los recargos efectivamente recaudados por el fondo y se reparte entre los asociados con derecho. Por eso puede variar de un mes a otro y siempre está sujeto a la disponibilidad real del fondo.`;
      h+=dropFicha(mid,"nota","ℹ️ ¿Cómo se calculan tus beneficios?","",notaCont,isOpen("nota"));
    }
  }

  /* ── PESTAÑA AYUDAS ── */
  if(FICHA_TAB==="ayudas"){
    const activasL=(m.loans||[]);
    const pagadasL=(m.closedLoans||[]);
    if(activasL.length===0&&pagadasL.length===0){
      h+=`<div class="ft-card"><div class="ft-empty">Sin ayudas registradas.</div></div>`;
    } else {
      // Función para dibujar una tarjeta de ayuda
      const tarjetaAyuda=(loan,esCerrada)=>{
        const activeIdx=activePayIndex(loan,rm,ry);
        const pagadas=loan.pays.filter(p=>p.paid).length;
        let c=`<div class="ft-card ${esCerrada?"ayuda-pagada":""}">
          <div class="loan-row"><div><div class="loan-lbl">Ayuda ${escH(loan.gMonth)} ${loan.gYear}</div><div class="loan-amt">${loan.capital},00 €</div></div>
            <div style="text-align:right"><div class="ayuda-progreso">${pagadas} / ${loan.n} pagadas</div><div class="ayuda-rest">${esCerrada?"✅ Cerrada":(loan.n-pagadas)+" por pagar"}</div></div>
          </div>
          <div class="timeline">`;
        loan.pays.forEach((p,pi)=>{
          const isActive=(pi===activeIdx)&&!esCerrada;
          const st=(p.aplazada&&!p.paid)?"aplazada":p.paid?"paid":isActive?"due":"future";
          if(readonly){
            c+=`<div class="cuota cuota-${st}${esUltimaCuota(loan,pi)?" cuota-ultima":""}" style="cursor:default"><div class="cuota-month">${p.m}</div><div class="cuota-val" style="white-space:nowrap">${fmtEur(cuotaDe(loan,pi))} €</div><div class="cuota-status">${p.aplazada&&!p.paid?"⏸ APLAZ.":p.paid?"PAGADO":isActive?"POR PAGAR":"—"}</div></div>`;
          } else {
            c+=`<button class="cuota cuota-${st}${esUltimaCuota(loan,pi)?" cuota-ultima":""}" onclick="togglePay('${esc(m.id)}','${esc(loan.id)}',${pi});render()"><div class="cuota-month">${p.m}</div><div class="cuota-val" style="white-space:nowrap">${fmtEur(cuotaDe(loan,pi))} €</div><div class="cuota-status">${p.aplazada&&!p.paid?"⏸ APLAZ.":p.paid?"PAGADO":isActive?"POR PAGAR":"—"}</div></button>`;
          }
        });
        c+=`</div>`;
        if(!readonly&&!esCerrada){ const armedL=(_delLoanArmed===(m.id+"|"+loan.id)); // v45.23: antes solo en Gestión → Personas y ayudas
          c+=`<div style="display:flex;gap:8px;margin-top:10px"><button class="edit-btn" style="flex:1;padding:8px;font-size:13px" onclick="openModal('editloan',{mid:'${esc(m.id)}',lid:'${esc(loan.id)}'})">✏️ Editar ayuda</button><button class="del-btn ${armedL?"armed":""}" style="flex:1;padding:8px;font-size:13px" onclick="delLoan('${esc(m.id)}','${esc(loan.id)}')">${armedL?"¿Seguro? Toca otra vez":"✕ Eliminar ayuda"}</button></div>`; }
        c+=`</div>`;
        return c;
      };

      // AYUDAS ACTIVAS
      h+=`<div class="ft-section-title">🟢 Ayudas activas (${activasL.length})</div>`;
      if(activasL.length>0){
        activasL.forEach(loan=>{ h+=tarjetaAyuda(loan,false); });
      } else {
        h+=`<div class="ft-card"><div class="ft-empty">No tiene ayudas activas.</div></div>`;
      }

      // AYUDAS PAGADAS (desplegable)
      if(pagadasL.length>0){
        let contP="";
        pagadasL.forEach(loan=>{ contP+=tarjetaAyuda(loan,true); });
        const totalPag=pagadasL.reduce((s,l)=>s+l.capital,0);
        h+=dropFicha(mid,"ayudaspag","✅ Ayudas pagadas ("+pagadasL.length+")",totalPag+" €",contP,isOpen("ayudaspag"));
      }

      // Total
      h+=`<div class="ft-card ft-card-soft">
        <div class="ft-row ft-total"><span class="ft-lbl">Total de ayudas recibidas</span><span class="ft-val" style="color:#C75B0E">${totalAyudasRec} €</span></div>
      </div>`;
    }
  }

  /* ── PESTAÑA APORTES ── */
  if(FICHA_TAB==="aportes" && !isTerc){
    // Resumen de aportes (regulares + extra)
    const permTxt=m.ciclo===0?"Indefinida":m.ciclo!=null?`${m.ciclo} meses`:"⛔ sin guardar";
    h+=`<div class="ft-card">
      <div class="ft-card-title">💰 Tus aportes</div>
      <div class="ft-row"><span class="ft-lbl">Meses pagados</span><span class="ft-val">${cuotasPagadas}</span></div>`; // v45.23: ingreso, permanencia y aporte están en «Resumen»
    h+=`<div class="ft-row ft-total"><span class="ft-lbl">Total aportado al fondo</span><span class="ft-val" style="color:#2D6A4F">${totalAportado} €</span></div>
    </div>`;

    // Detalle de aportes extra (con su mes)
    const exMap=(DATA.extras&&DATA.extras[m.id])||{};
    const refMap=(DATA.referidos&&DATA.referidos[m.id])||{};
    const claves=Object.keys(refMap).filter(k=>refMap[k]&&refMap[k].n>0).sort(); // v45: los meses con otro aporte se ven en el historial
    if(claves.length>0){
      h+=`<div class="ft-card">
        <div class="ft-card-title">🎁 Bonos por referido</div>`;
      claves.forEach(k=>{
        const [yy,mm]=k.split("-"); const mesNom=MF[parseInt(mm)-1]+" "+yy;
        if(refMap[k]&&refMap[k].n>0)
          h+=`<div class="ft-row"><span class="ft-lbl">🎁 Bono referido · ${mesNom} (${refMap[k].n})${refMap[k].nombres?" — "+escH(refMap[k].nombres):""}</span><span class="ft-val" style="color:#C0492C">− ${refMap[k].n*10} €</span></div>`;
      });
      h+=`</div>`;
    }

    // Aportaciones puntuales al fondo
    if(puntuales.length>0){
      h+=`<div class="ft-card">
        <div class="ft-card-title">🏦 Aportaciones puntuales al fondo</div>`;
      puntuales.forEach((ap,api)=>{
        h+=`<div class="ft-row" style="align-items:flex-start">
          <span class="ft-lbl">${ap.capital} € · ${escH(ap.mes)} ${ap.anio} · plazo ${ap.plazo}m<br><span style="font-size:11px;color:var(--muted)">Recupera ${ap.total} € (capital +5%) en ${escH(ap.mesDev)} ${ap.anioDev}</span></span>
          <span style="text-align:right;white-space:nowrap">
            <span class="ft-val" style="color:${ap.devuelto?'#2D6A4F':'#B08D3E'};display:block">${ap.devuelto?"Devuelto ✅":"Activo ⏳"}</span>
            ${readonly?"":`<button class="ap-toggle-btn" onclick="togglePuntualDevuelto('${esc(m.id)}',${api});render()">${ap.devuelto?"Marcar activo":"Marcar devuelto"}</button>`}
          </span>
        </div>`;
      });
      h+=`</div>`;
    }

    // Historial de aportes mensuales (qué meses ha aportado, desde su ingreso)
    if(m.joinMonth){
      const filas=[];
      const exMap2=(DATA.extras&&DATA.extras[m.id])||{};
      const ji=MS.indexOf(m.joinMonth), jy=m.joinYear;
      const ri=MS.indexOf(rm), ry3=ry;
      let cm=ji, cy=jy;
      while(cy<ry3||(cy===ry3&&cm<=ri)){
        const k=cy+"-"+String(cm+1).padStart(2,"0");
        const md2=(DATA.monthlyData&&DATA.monthlyData[k])||{};
        const pagado=!!(md2.aportes&&md2.aportes[m.id]);
        filas.push({mes:MS[cm],anio:cy,pagado,importe:aporteBrutoKey(m,k),key:k});
        cm++; if(cm>=12){cm=0;cy++;}
      }
      if(filas.length>0){
        let contH="";
        const nPag=filas.filter(f=>f.pagado).length;
        filas.slice().reverse().forEach(f=>{
          contH+=`<div class="ft-row"><span class="ft-lbl">${escH(f.mes)} ${f.anio}</span><span class="ft-val" style="color:${f.pagado?'#1B4332':'#C0492C'}">${f.pagado?f.importe+" € ✅":vistaPersonal()?"Pendiente ⏳":"Pendiente ⏳ ("+f.importe+" €)"}</span></div>`;
        });
        h+=dropFicha(mid,"apthist","📅 Historial de aportes mensuales",nPag+" de "+filas.length+" pagados",contH,isOpen("apthist"));
      }
    }
  }


  /* ────────────────────────────────────────────────
     7. GESTIÓN RÁPIDA (solo admin)
  ──────────────────────────────────────────────── */
  if(!readonly){
    h+=`<div class="ficha-section" style="margin-top:4px">
      <div class="ficha-sec-title">⚙️ Gestión</div>
      ${pausaGestionHTML(m)}
      <div class="mgmt-grid">
        <button class="mgmt-btn primary" onclick="solDesdeGestion('${esc(m.id)}')">＋ Nueva solicitud</button>
        ${isTerc?"":`<button class="mgmt-btn warn" onclick="openModal('extra',{mid:'${esc(m.id)}'})">💶 Aporte de un mes</button>`}
        <button class="mgmt-btn purple" onclick="openModal('referido',{mid:'${esc(m.id)}'})">🎁 Referido</button>
        ${isTerc?"":`<button class="mgmt-btn secondary" onclick="openModal('ciclo',{mid:'${esc(m.id)}'})">⚙️ Permanencia y aporte</button>`}
        ${isTerc?"":`<button class="mgmt-btn" style="background:#2D6A4F;color:#fff" onclick="abrirSimulador('${esc(m.id)}','ayuda')">🧮 Simuladores</button>`}
        <button class="mgmt-btn" style="background:#25D366;color:#fff" onclick="abrirBienvenida('${esc(m.id)}')">📲 Bienvenida</button>
        <button class="mgmt-btn secondary" onclick="openModal('telefono',{mid:'${esc(m.id)}'})">📞 ${m.phone?escH(m.phone):"Teléfono"}</button>
        <button class="mgmt-btn" style="background:#3D4080;color:#fff" onclick="verComoAsociado('${esc(m.id)}')">👁️ Ver como lo ve</button>
        <button class="mgmt-btn secondary" onclick="copyLink('${esc(m.id)}')">🔗 Copiar su enlace</button>
        ${(m.history||[]).length?`<button class="mgmt-btn secondary" onclick="openModal('histloan',{mid:'${esc(m.id)}'})">📋 Historial de ayudas (${(m.history||[]).length})</button>`:""}
        ${isTerc?"":`<button class="mgmt-btn" style="background:#FDECE8;color:#C0492C" onclick="openSalida('${esc(m.id)}')">🚪 Salida del fondo</button>`}
        <button class="mgmt-btn" style="background:${_delMemberArmed===m.id?"#C0492C":"#fff"};color:${_delMemberArmed===m.id?"#fff":"#C0492C"};border:1.5px solid #C0492C" onclick="eliminarDesdeFicha('${esc(m.id)}')">${_delMemberArmed===m.id?"¿Seguro? Toca otra vez":"🗑️ Eliminar ficha"}</button>
        <button class="mgmt-btn" style="background:#1B4332;color:#fff" onclick="openModal('puntual',{mid:'${esc(m.id)}'})">🏦 Aporte temporal</button>
        ${isTerc?`<button class="mgmt-btn" style="background:var(--terc);color:#fff" onclick="openModal('avalista',{mid:'${esc(m.id)}'})">🤝 Cambiar avalista</button>`:""}
      </div>
    </div>`;
  } else {
    // v45.21: los simuladores también en el enlace del asociado (solo calculan: no guardan nada)
    if(!isTerc&&m.joinMonth)h+=`<div class="ficha-section" style="margin-top:6px;background:linear-gradient(135deg,#F4F9F6,#fff);border:1.5px solid #2D6A4F">
      <div class="ficha-sec-title">🧮 Simuladores</div>
      <div style="font-size:13px;color:var(--muted);margin:-2px 0 10px;line-height:1.4">Haz cuentas con tus datos. Es solo una simulación: no cambia nada de tu ficha.</div>
      <div style="display:flex;gap:8px">
        <button onclick="abrirSimulador('${esc(m.id)}','ayuda')" style="flex:1;padding:12px 6px;border-radius:12px;border:none;background:#1B4332;color:#fff;font-size:14px;font-weight:800;cursor:pointer;line-height:1.25">💡 ¿Cuánto<br>puedo pedir?</button>
        <button onclick="abrirSimulador('${esc(m.id)}','ben')" style="flex:1;padding:12px 6px;border-radius:12px;border:none;background:#2D6A4F;color:#fff;font-size:14px;font-weight:800;cursor:pointer;line-height:1.25">🌱 ¿Cuánto<br>puedo ganar?</button>
      </div>
    </div>`;
    h+=`<div style="text-align:center;padding:16px 0 28px;font-size:12px;color:var(--muted)">
      Vista personal · Solo lectura<br>Para cualquier consulta contacta con el administrador
    </div>`;
  }

  return h;
}


// ── MODALES EXTRA ──────────────────────────────────────────────────────────
// Selector de mes/año reutilizable. Por defecto, el mes del reporte.
function selectorMesAnio(idMes,idAnio,mesSel,anioSel){
  mesSel=mesSel||DATA.reportMonth; anioSel=anioSel||DATA.reportYear;
  let opM='';
  MONTHS.forEach((m,i)=>{opM+=`<option value="${m}" ${m===mesSel?"selected":""}>${MONTHS_FULL[i]}</option>`;});
  let opY='';
  YEARS.forEach(y=>{opY+=`<option value="${y}" ${y===anioSel?"selected":""}>${y}</option>`;});
  return `<div style="display:flex;gap:8px;margin-bottom:14px">
    <select id="${idMes}" class="m-input" style="flex:2">${opM}</select>
    <select id="${idAnio}" class="m-input" style="flex:1">${opY}</select>
  </div>`;
}

function extraFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  if(!m)return "";
  const v=aporteBrutoMes(m,DATA.reportMonth,DATA.reportYear);
  return`<div class="modal-title">💶 Aporte de un mes — ${escH(m.name)}</div>
<p style="font-size:13px;color:var(--muted);margin-bottom:12px">Cada mes puede poner 50, 100, 150 o 200 € (Maestro AP-2). Su aporte habitual es de <b>${aporteBaseDe(m)} €</b>. Normalmente se elige en el cierre al cobrar; aquí puedes corregir otro mes.</p>
<label class="m-label">Mes</label>
${selectorMesAnio("ex-mes","ex-anio")}
<label class="m-label">Aporte de ese mes</label>
<select id="ex-monto" class="m-select" style="font-size:20px;font-weight:700;margin-bottom:16px">${APORTE_OPCIONES.map(o=>`<option value="${o}"${o===v?" selected":""}>${o} €</option>`).join("")}</select>
<button class="m-primary" onclick="saveExtra()">Guardar</button>`;
}
function saveExtra(){
  const monto=parseInt(document.getElementById("ex-monto")?.value)||0;
  const mes=document.getElementById("ex-mes")?.value||DATA.reportMonth;
  const anio=parseInt(document.getElementById("ex-anio")?.value)||DATA.reportYear;
  const mid=MODAL.mid;
  closeModal();
  setAporteMes(mid,monto,getMesKey(mes,anio)); // v45: 50–200 (AP-2, AP-3)
}

function referidoFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  if(!m)return "";
  // Selector de mes: 3 meses anteriores, el mes actual y 3 meses futuros.
  const MS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const ri=MS.indexOf(DATA.reportMonth),ry=DATA.reportYear;
  const meses=[];
  for(let i=-3;i<=3;i++){
    let mi=ri+i, yi=ry;
    while(mi<0){mi+=12;yi--;}
    while(mi>11){mi-=12;yi++;}
    meses.push({m:MS[mi],y:yi,key:yi+"-"+String(mi+1).padStart(2,"0")});
  }
  // Por defecto se selecciona el mes actual (el del medio del rango).
  const mesActualKey=ry+"-"+String(ri+1).padStart(2,"0");
  const selMesKey=MODAL.refMesKey||mesActualKey;
  const actual=(DATA.referidos&&DATA.referidos[m.id]&&DATA.referidos[m.id][selMesKey])||{n:0,nombres:""};
  const mesOpts=meses.map(x=>`<option value="${x.key}" ${x.key===selMesKey?"selected":""}>${x.m} ${x.y}</option>`).join("");
  return`<div class="modal-title">🎁 Bonus referidos — ${escH(m.name)}</div>
<p style="font-size:13px;color:var(--muted);margin-bottom:12px">10€ de descuento en aporte por cada referido nuevo que entre. Máximo 3 por mes (−30€).</p>
<label class="m-label">Mes en que aplica el bonus</label>
<select class="m-input" id="ref-mes-sel" onchange="MODAL.refMesKey=this.value;render()" style="margin-bottom:14px;font-size:14px;font-weight:600">
  ${mesOpts}
</select>
<label class="m-label">Nº de referidos (1-3)</label>
<div style="display:flex;gap:8px;margin-bottom:12px">
  <button class="m-opt l-n-opt ${actual.n===1?"active":""}" data-n="1" onclick="document.querySelectorAll('.l-n-opt').forEach(b=>b.classList.remove('active'));this.classList.add('active')">1 · −10€</button>
  <button class="m-opt l-n-opt ${actual.n===2?"active":""}" data-n="2" onclick="document.querySelectorAll('.l-n-opt').forEach(b=>b.classList.remove('active'));this.classList.add('active')">2 · −20€</button>
  <button class="m-opt l-n-opt ${actual.n===3?"active":""}" data-n="3" onclick="document.querySelectorAll('.l-n-opt').forEach(b=>b.classList.remove('active'));this.classList.add('active')">3 · −30€</button>
</div>
<label class="m-label">Nombres de los nuevos miembros</label>
<input id="ref-nombres" class="m-input" placeholder="Ej: Ana García, Luis Pérez" value="${escH(actual.nombres||"")}">
<button class="m-primary" onclick="saveReferido()">Guardar</button>
${actual.n>0?`<button style="width:100%;margin-top:10px;padding:12px;border:2px solid #C0492C;border-radius:12px;background:#FDECE8;color:#C0492C;font-size:14px;font-weight:700;cursor:pointer" onclick="borrarReferido()">🗑 Eliminar este bono (${actual.n} · ${selMesKey})</button>`:""}`;
}
function saveReferido(){
  const n=parseInt(document.querySelector(".l-n-opt.active")?.dataset.n||"0");
  const nombres=document.getElementById("ref-nombres")?.value.trim()||"";
  const mesKey=MODAL.refMesKey||(DATA.reportYear+"-"+String(MONTHS.indexOf(DATA.reportMonth)+1).padStart(2,"0"));
  if(!DATA.referidos)DATA.referidos={};
  if(!DATA.referidos[MODAL.mid])DATA.referidos[MODAL.mid]={};
  DATA.referidos[MODAL.mid][mesKey]={n,nombres};
  closeModal();save();toast("Referidos guardados para "+mesKey+" ✓");
}
// Eliminar un bono de referido registrado por error, para el mes seleccionado.
function borrarReferido(){
  const mesKey=MODAL.refMesKey||(DATA.reportYear+"-"+String(MONTHS.indexOf(DATA.reportMonth)+1).padStart(2,"0"));
  if(DATA.referidos&&DATA.referidos[MODAL.mid]&&DATA.referidos[MODAL.mid][mesKey]){
    delete DATA.referidos[MODAL.mid][mesKey];
    if(Object.keys(DATA.referidos[MODAL.mid]).length===0)delete DATA.referidos[MODAL.mid];
    save();toast("Bono eliminado de "+mesKey+" ✓");
  }else{
    toast("No había bono registrado en "+mesKey);
  }
  closeModal();render();
}

// v45 (Maestro v18.2 · PE-1, PE-3, AP-4): permanencia (solo se sube) y aporte habitual (50–200).
function _opcionesHTML(clase,attr,valores,actual,etiqueta){
  return valores.map(v=>`<button class="m-opt ${clase} ${actual===v?"active":""}" data-${attr}="${v}"
        onclick="document.querySelectorAll('.${clase}').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${etiqueta(v)}</button>`).join("");
}
const PERM_OPCIONES=[12,24,36,0];
function cicloFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  if(!m)return "";
  const cicloActual=(m.ciclo!=null?m.ciclo:null); // 0 = indefinida (valor válido); null = falta (error PE-1)
  const aporteActual=aporteBaseDe(m), V=MODAL.volver||null, pre=(MODAL.preCiclo!=null?MODAL.preCiclo:cicloActual);
  return `<div class="modal-title">⚙️ Permanencia y aporte — ${escH(m.name)}</div>
    ${V?`<div style="background:#EEF7F1;border:1.5px solid #8CC5A0;border-radius:12px;padding:10px 12px;font-size:13px;color:#1B4332;margin-bottom:10px;line-height:1.45">🤝 Para la ayuda de <b>${fmtEur(parseFloat(V.restore.cap)||0)} € en ${parseInt(V.restore.n)} cuotas</b> necesita al menos <b>${MODAL.preCiclo===0?"permanencia indefinida":MODAL.preCiclo+" meses"}</b> (ya está marcado). Al guardar vuelves a la ayuda.</div>`:""}
    <label class="m-label">Permanencia</label>
    ${cicloActual==null?`<div style="background:#FDF0EE;border:1.5px solid #C0492C;border-radius:12px;padding:10px 12px;font-size:13px;color:#7A2418;margin-bottom:8px">⛔ No tiene permanencia guardada. Elige la que acordó al entrar.</div>`:""}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">${_opcionesHTML("l-ci-opt","ciclo",PERM_OPCIONES,pre,permEtiqueta)}</div>
    <div style="background:#FFF8F0;border:1px solid #F5D5B0;border-radius:12px;padding:12px;font-size:13px;color:#7A4A1E;margin-bottom:16px">
      ⚠️ La permanencia solo se puede subir, nunca bajar (Maestro PE-3). Con 24 meses o más puede pedir ayudas mayores y más largas.
    </div>
    <label class="m-label">Aporte habitual</label>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:4px">${_opcionesHTML("l-ap-opt","ap",APORTE_OPCIONES,aporteActual,v=>v+" €")}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:16px;line-height:1.4">Es lo que suele poner y lo que propone la hoja de cobro. Cada mes puede poner otra cantidad (se elige en el cierre). Cada 50 € ganan su beneficio.</div>
    <label class="m-label">Recomendado por (es su aval · Maestro GE-1)</label>
    ${esFundador(m)?`<div style="font-size:13px;color:var(--muted);margin-bottom:16px">⭐ Fundador: no tiene aval.</div>`:`<select id="ci-aval" class="m-select" style="margin-bottom:${m.referidoPor?16:6}px"><option value="">— Sin anotar —</option>${DATA.members.filter(x=>x.type==="asociado"&&x.id!==m.id&&x.joinMonth).sort((a,b)=>a.name.localeCompare(b.name)).map(x=>`<option value="${esc(x.id)}" ${x.id===m.referidoPor?"selected":""}>${escH(x.name)}</option>`).join("")}</select>
    ${m.referidoPor?"":`<div style="font-size:12px;color:#C0492C;margin-bottom:16px">⚠️ Falta anotar quién lo recomendó${quienRefirio(m)?` (por el bono consta ${escH(quienRefirio(m))})`:""}.</div>`}`}
    ${retiraAlAmpliarHTML(m)}
    <button class="m-primary" onclick="saveCicloYAporte('${esc(m.id)}')">Guardar cambios</button>
    ${V?`<button onclick="volverAAyuda(MODAL.volver)" style="width:100%;padding:10px;margin-top:8px;border:none;background:transparent;color:var(--muted);font-size:13px;text-decoration:underline;cursor:pointer">← Volver a la ayuda sin cambiar nada</button>`:""}`;
}
// v45.1 (PE-5): al ampliar la permanencia al final (o después), puede retirar el beneficio guardado.
function retiraAlAmpliarHTML(m){
  const rp=retiradaPosible(m); if(!rp||rp.motivo!=="fin")return "";
  const imp=Math.max(0,_r2(aportesConBeneficio(m,rp.finIdx).reduce((s,a)=>s+a.ben,0)-beneficioRetirado(m)));
  const falta=!_aportePagadoKey(m,_keyDeIdx(rp.finIdx));
  return `<button type="button" id="ci-retira" data-on="0" onclick="const on=this.dataset.on!=='1';this.dataset.on=on?'1':'0';this.querySelector('.ci-chk').textContent=on?'✅':'⬜';this.style.background=on?'#DDF0E3':'#F6FAF7'" style="display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;background:#F6FAF7;border:1.5px solid #2D6A4F;border-radius:12px;padding:12px;margin-bottom:14px;font-size:13.5px;color:#1B4332;cursor:pointer;line-height:1.45;font-family:inherit">
    <span class="ci-chk" style="font-size:20px;line-height:1;flex-shrink:0">⬜</span>
    <span><b>Al ampliar, retira su beneficio guardado: ${fmtEur(imp)} €</b>${falta?` <span style="font-size:12px">(+ lo que gane su aporte de ${_txtIdx(rp.finIdx)}; la cifra se fija al pagarla)</span>`:""}<br>Se paga entre el 5 y el 10 de ${_txtIdx(rp.finIdx+1)}. Sus aportes siguen dentro y siguen ganando (Maestro PE-5).</span></button>`;
}
function retiradaFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid); if(!m)return "";
  const fin=MODAL.finIdx, n=_mesesPerm(m,fin);
  const imp=Math.max(0,_r2(aportesConBeneficio(m,fin).reduce((s,a)=>s+a.ben,0)-beneficioRetirado(m)));
  const falta=!_aportePagadoKey(m,_keyDeIdx(fin));
  return `<div class="modal-title">💶 Retirar beneficio — ${escH(m.name)}</div>
    <div style="background:#EEF7F1;border:1px solid #B7D9C3;border-radius:12px;padding:14px;font-size:13.5px;color:#1B4332;margin:6px 0 16px;line-height:1.65">
      Permanencia indefinida: cumple <b>${n} meses</b> en ${_txtIdx(fin)}.<br>
      Beneficio guardado hasta ese mes: <b>${fmtEur(imp)} €</b>${falta?` <span style="font-size:12px">(+ lo que gane su aporte de ${_txtIdx(fin)}, aún sin cobrar; la cifra se fija al pagarla)</span>`:""}.<br>
      Se paga <b>entre el 5 y el 10 de ${_txtIdx(fin+1)}</b>. Sus aportes siguen dentro y siguen ganando (Maestro PE-7).
    </div>
    <button class="m-primary" onclick="confirmarRetirada('${esc(m.id)}',${fin})">Anotar la retirada</button>
    <button onclick="closeModal()" style="width:100%;padding:10px;margin-top:8px;border:none;background:transparent;color:var(--muted);font-size:13px;cursor:pointer">Cancelar</button>`;
}
function confirmarRetirada(mid,fin){
  const m=DATA.members.find(x=>x.id===mid); if(!m)return;
  if(retiradasDe(m).some(r=>r.finIdx===fin)){closeModal();toast("Esa retirada ya está anotada");return;}
  nuevaRetirada(m,fin,m.ciclo===0?"aniv":"fin");
  save(); closeModal(); toast("Retirada anotada ✓ · se paga del 5 al 10 de "+_txtIdx(fin+1));
}
// Acción explícita (Histórico): marcar pagada (fija el importe), pendiente o anular (solo si no se pagó).
function setPagoRetirada(mid,rid,campo,valor){
  const m=DATA.members.find(x=>x.id===mid); if(!m)return;
  const r=(m.retiradas||[]).find(x=>x.id===rid); if(!r)return;
  if(campo==="pagada"){
    if(valor){ r.importe=importeRetirada(m,r); r.pagada=true; r.fechaPagada=new Date().toLocaleDateString("es-ES"); }
    else { r.pagada=false; delete r.importe; r.fechaPagada=null; }
  }
  if(campo==="anular"&&!r.pagada){ r.anulada=true; r.fechaAnulada=new Date().toLocaleDateString("es-ES"); }
  save(); render();
  toast(campo==="anular"?"Retirada anulada":valor?"✓ Retirada marcada como pagada":"Retirada marcada como pendiente");
}
// Al cambiar el aporte habitual, los meses ya PAGADOS conservan lo que se pagó (se guarda como
// ajuste de ese mes); solo cambia lo que se propone desde ahora.
function fijarAportesPagados(m,nuevoBase){
  const viejo=aporteBaseDe(m); if(viejo===nuevoBase||!DATA.monthlyData)return;
  Object.keys(DATA.monthlyData).forEach(k=>{
    const md=DATA.monthlyData[k]; if(!(md&&md.aportes&&md.aportes[m.id]===true))return;
    const pagado=aporteBrutoKey(m,k);
    if(!DATA.extras)DATA.extras={}; if(!DATA.extras[m.id])DATA.extras[m.id]={};
    DATA.extras[m.id][k]={monto:pagado-nuevoBase};
  });
}
function saveCicloYAporte(mid){
  const cEl=document.querySelector(".l-ci-opt.active"), aEl=document.querySelector(".l-ap-opt.active");
  if(!cEl){toast("⛔ Elige la permanencia",3000);return;}
  const c=parseInt(cEl.dataset.ciclo), ap=parseInt(aEl?aEl.dataset.ap:"50");
  const m=DATA.members.find(x=>x.id===mid); if(!m)return;
  if(m.ciclo!=null){
    if(m.ciclo===0&&c!==0){toast("⛔ No se puede bajar desde permanencia indefinida",3500);return;}
    if(c!==0&&c<m.ciclo){toast("⛔ La permanencia no se puede bajar (Maestro PE-3)",3500);return;}
  }
  // v45.1 (PE-5): retirar el beneficio guardado solo si amplía la permanencia
  const rEl=document.getElementById("ci-retira"); let retira=false;
  if(rEl&&rEl.dataset.on==="1"){
    const amplia=(m.ciclo!=null&&m.ciclo>0&&(c===0||c>m.ciclo));
    if(!amplia){toast("⛔ Para retirar el beneficio sin salir tiene que ampliar la permanencia (Maestro PE-5)",4000);return;}
    const rp=retiradaPosible(m); if(rp&&rp.motivo==="fin"){nuevaRetirada(m,rp.finIdx,"fin");retira=true;}
  }
  const avEl=document.getElementById("ci-aval"); // v45.1: quien lo recomendó = su aval (GE-1)
  if(avEl){ if(avEl.value)m.referidoPor=avEl.value; else delete m.referidoPor; }
  const volver=MODAL&&MODAL.volver; // v45.28: venía de una ayuda bloqueada por la permanencia
  fijarAportesPagados(m,ap);
  m.ciclo=c;
  m.aporte=ap;
  closeModal();save();toast(retira?"Permanencia ampliada ✓ · retirada del beneficio anotada":volver?"Permanencia actualizada ✓ · sigue con la ayuda":"Permanencia y aporte actualizados ✓");render();
  if(volver)volverAAyuda(volver);
}

// ── CAMBIAR AVALISTA (solo terceros) ─────────────────────────────────────
// Reasigna el aval VIVO (m.ref = avalistaId) de un tercero ya existente a otro
// asociado activo. NO toca avalistaEnConcesion de las ayudas ya concedidas —
// es una foto histórica congelada (ver addLoanSubmit/addCierreLoanSubmit).
function avalistaFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  if(!m)return "";
  const asocActivos=DATA.members.filter(x=>x.type==="asociado"&&x.joinMonth&&activoEnReporte(x)).sort((a,b)=>a.name.localeCompare(b.name));
  const actual=m.ref?DATA.members.find(x=>x.id===m.ref):null;
  const actualFueraDeLista=actual&&!asocActivos.some(a=>a.id===actual.id);
  return`<div class="modal-title">🤝 Cambiar avalista — ${escH(m.name)}</div>
  ${actualFueraDeLista?`<div style="font-size:12px;color:#B08D3E;margin-bottom:8px">Avalista actual (${escH(actual.name)}) ya no está activo. Se mantiene si no cambias la selección.</div>`:""}
  <label class="m-label">Avalista (asociado)</label>
  <select id="av-sel" class="m-select" style="margin-bottom:14px">
    <option value="">Sin avalista</option>
    ${actualFueraDeLista?`<option value="${esc(actual.id)}" selected>${escH(actual.name)} (inactivo)</option>`:""}
    ${asocActivos.map(a=>`<option value="${esc(a.id)}" ${a.id===m.ref?"selected":""}>${escH(a.name)}</option>`).join("")}
  </select>
  <button class="m-primary" onclick="saveAvalista('${esc(m.id)}')">Guardar cambios</button>`;
}
function saveAvalista(mid){
  const nuevoId=document.getElementById("av-sel")?.value||null;
  DATA.members.forEach(m=>{if(m.id===mid)m.ref=nuevoId;});
  closeModal();save();toast("Avalista actualizado ✓");render();
}

// ── APORTACIONES PUNTUALES AL FONDO (500–3000€, capital + 5%) ───────────────
// El aportante entrega un capital al fondo y recupera capital + 5% un mes
// después. Se registra por asociado. Se guardan en DATA.aportesPuntuales[mid].
function puntualFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  if(!m)return "";
  return`<div class="modal-title">🏦 Aporte puntual — ${escH(m.name)}</div>
<p style="font-size:13px;color:var(--muted);margin-bottom:14px">Aportación puntual al fondo. El aportante recupera su capital más un 5% el mes siguiente.</p>
<label class="m-label">Mes de entrega</label>
${selectorMesAnio("pu-mes","pu-anio")}
<label class="m-label">Capital aportado (€) — entre 500 y 3000</label>
<input id="pu-monto" class="m-input" type="number" min="500" max="3000" step="50" placeholder="500" style="font-size:20px;font-weight:700" oninput="puntualCalc()">
<label class="m-label">Plazo (meses)</label>
<div style="display:flex;gap:8px;margin-bottom:14px">
  <button class="m-opt pu-pl-opt active" data-pl="1" onclick="document.querySelectorAll('.pu-pl-opt').forEach(b=>b.classList.remove('active'));this.classList.add('active')">1 mes</button>
  <button class="m-opt pu-pl-opt" data-pl="3" onclick="document.querySelectorAll('.pu-pl-opt').forEach(b=>b.classList.remove('active'));this.classList.add('active')">3 meses</button>
  <button class="m-opt pu-pl-opt" data-pl="5" onclick="document.querySelectorAll('.pu-pl-opt').forEach(b=>b.classList.remove('active'));this.classList.add('active')">5 meses</button>
</div>
<div id="pu-calc" style="background:var(--primary-light,#ECF1ED);border:1px solid #CDE0D4;border-radius:12px;padding:14px;margin-bottom:16px;font-size:14px">
  <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Capital aportado</span><span id="pu-cap" style="font-weight:700">— €</span></div>
  <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Retorno (5%)</span><span id="pu-ret" style="font-weight:700;color:#2D6A4F">— €</span></div>
  <div style="display:flex;justify-content:space-between;padding:6px 0 0;border-top:1px solid #CDE0D4;margin-top:6px"><span style="font-weight:700">Total a recuperar</span><span id="pu-tot" style="font-weight:800;font-size:16px">— €</span></div>
</div>
<button class="m-primary" onclick="savePuntual('${esc(m.id)}')">Guardar aporte puntual</button>`;
}
function puntualCalc(){
  const cap=parseInt(document.getElementById("pu-monto")?.value)||0;
  const ret=Math.round(cap*0.05);
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set("pu-cap",cap+" €"); set("pu-ret",ret+" €"); set("pu-tot",(cap+ret)+" €");
}
function savePuntual(mid){
  const cap=parseInt(document.getElementById("pu-monto")?.value)||0;
  const mes=document.getElementById("pu-mes")?.value||DATA.reportMonth;
  const anio=parseInt(document.getElementById("pu-anio")?.value)||DATA.reportYear;
  const plazo=parseInt(document.querySelector(".pu-pl-opt.active")?.dataset.pl||"1");
  if(cap<500||cap>3000){alert("El capital debe estar entre 500 y 3000 €");return;}
  const ret=Math.round(cap*0.05);
  // Mes de devolución = mes siguiente al de entrega
  let di=MONTHS.indexOf(mes)+1, dy=anio;
  if(di>11){di-=12;dy++;}
  if(!DATA.aportesPuntuales)DATA.aportesPuntuales={};
  if(!DATA.aportesPuntuales[mid])DATA.aportesPuntuales[mid]=[];
  DATA.aportesPuntuales[mid].push({
    id:"ap"+Date.now(), capital:cap, retorno:ret, total:cap+ret, plazo:plazo,
    mes:mes, anio:anio, mesDev:MONTHS[di], anioDev:dy, devuelto:false
  });
  closeModal();save();toast("Aporte puntual registrado ✓");render();
}
function togglePuntualDevuelto(mid,idx){
  const arr=DATA.aportesPuntuales&&DATA.aportesPuntuales[mid];
  if(!arr||!arr[idx])return;
  arr[idx].devuelto=!arr[idx].devuelto;
  save();toast(arr[idx].devuelto?"Marcado como devuelto ✓":"Marcado como activo ✓");render();
}
// ── Modal "Dar de baja" (dos pasos: elegir mes → confirmar cifras). Solo cablea la
//    interfaz; toda la lógica vive en devolucionBaja/darDeBaja/motivoBloqueoBaja. ──
function bajaFormHTML(){
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  if(!m)return "";
  const bloqueo=motivoBloqueoBaja(m);
  if(bloqueo){ // avalista de una ayuda activa → se muestra el bloqueo, no se puede continuar
    return `<div class="modal-title">🚪 Salida — ${escH(m.name)}</div>
      <div style="background:#FDF0EE;border:2px solid #C0492C;border-radius:12px;padding:14px;font-size:13px;color:#7A2418;margin:10px 0 16px;line-height:1.55">⛔ ${escH(bloqueo)}</div>
      <button class="m-primary" onclick="closeModal()">Entendido</button>`;
  }
  const hoyIdx=_idxMes(DATA.reportMonth,DATA.reportYear);
  if(MODAL.bajaStep!==2){ // paso 1: último mes que aporta y mes en que avisó
    const u=_mesDeIdx(MODAL.bajaUltimoIdx!=null?MODAL.bajaUltimoIdx:hoyIdx);
    const fin=finPermanenciaIdx(m);
    return `<div class="modal-title">🚪 Salida — ${escH(m.name)}</div>
      ${fin!=null?`<div style="font-size:12.5px;color:var(--muted);margin:-4px 0 10px">Su permanencia de ${m.ciclo} meses termina en ${_txtIdx(fin)}.</div>`:m.ciclo===0?`<div style="font-size:12.5px;color:var(--muted);margin:-4px 0 10px">Permanencia indefinida.</div>`:""}
      <label class="m-label">Último mes que aporta</label>
      ${selectorMesAnio("baja-mes","baja-anio",u.mes,u.anio)}
      <label class="m-label">Mes en que avisó</label>
      ${selectorMesAnio("baja-am","baja-aa",DATA.reportMonth,DATA.reportYear)}
      <div style="font-size:12px;color:var(--muted);margin:2px 0 16px;line-height:1.4">Se le paga entre el día 5 y el 10 del mes siguiente a su último aporte. Al continuar verás las cifras antes de confirmar.</div>
      <button class="m-primary" onclick="bajaContinuar()">Continuar</button>
      <button onclick="closeModal()" style="width:100%;padding:10px;margin-top:8px;border:none;background:transparent;color:var(--muted);font-size:13px;cursor:pointer">Cancelar</button>`;
  }
  // paso 2: cifras con las reglas v18
  const ult=MODAL.bajaUltimoIdx, aviso=MODAL.bajaAvisoIdx;
  const d=salidaV18(m,ult), armed=!!MODAL.bajaArmed;
  const minUlt=d.tipo==="fin"?null:aviso+d.avisoMeses-1;
  const corto=minUlt!=null&&ult<minUlt;
  const fila=(t,v,st)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;${st||""}"><span>${t}</span><b style="white-space:nowrap">${v}</b></div>`;
  const tipoTxt=d.tipo==="fin"?`🏁 <b>Termina su permanencia</b> de ${m.ciclo} meses (Maestro PE-5): recupera sus aportes y todo el beneficio que no haya retirado.`
    :d.tipo==="anticipada"?`🚪 <b>Sale antes de terminar</b> su permanencia (Maestro SA-2): recupera sus aportes y el beneficio de los años completos (12 aportes pagados cada uno).`
    :`🚪 <b>Sale de la permanencia indefinida</b> (Maestro SA-1): recupera sus aportes y el beneficio de los años completos (12 aportes pagados cada uno).`;
  let h=`<div class="modal-title">🚪 Confirmar salida — ${escH(m.name)}</div>
    <div style="font-size:13.5px;line-height:1.5;color:var(--dark);margin:2px 0 10px">${tipoTxt}</div>
    <div style="background:#FFF8F0;border:1px solid #F5D5B0;border-radius:12px;padding:12px 14px;font-size:13.5px;color:#5A3A1E;margin:0 0 12px;line-height:1.45">
      ${fila(`Aportes pagados (${d.nPagados})`,fmtEur(d.capital)+" €")}
      ${fila("Beneficio generado",fmtEur(d.generado)+" €")}
      ${d.tipo!=="fin"?fila(`Conserva el de ${d.anios} año${d.anios===1?"":"s"} completo${d.anios===1?"":"s"}`,fmtEur(d.conservado)+" €"):""}
      ${d.perdido>0?fila("Pierde (año a medias, queda en el fondo)",fmtEur(d.perdido)+" €","color:#9A6A4A;font-size:12.5px"):""}
      ${d.retirado>0?fila("Ya retirado antes","−"+fmtEur(d.retirado)+" €"):""}
      ${fila("Beneficio que se le paga",fmtEur(d.aPagar)+" €")}
      ${d.ayuda.n>0?fila(`Su ayuda pendiente (${d.ayuda.n} cuota${d.ayuda.n>1?"s":""}: capital + 5 %; quedan saldadas)`,"−"+fmtEur(d.ayuda.importe)+" €","color:#C0492C"):""}
      ${d.ayuda.n>0?(()=>{const cb=Math.min(d.aPagar,d.ayuda.importe), ca=Math.min(d.capital,d.ayuda.importe-cb), falta=_r2(d.ayuda.importe-cb-ca);
        return `<div style="font-size:12.5px;color:#7A2418;margin:2px 0 4px;line-height:1.45">Se cubre primero con su beneficio (${fmtEur(cb)} €), después con sus aportes (${fmtEur(ca)} €)${falta>0?` y faltan <b>${fmtEur(falta)} €</b>: ${destinoFaltaTexto(m)}`:""}.</div>`;})():""}
      ${fila(d.total>=0?"Recibe":"Falta por cubrir",fmtEur(Math.abs(d.total))+" €","border-top:1px solid #F0D2B0;margin-top:4px;padding-top:6px;font-size:15px")}
      <div style="font-size:12.5px;margin-top:4px">${d.total>=0?`Se paga <b>${escH(MODAL.desdePausa?(()=>{const p=(m.pausas||[]).find(x=>x.id===MODAL.desdePausa);return p?"del 5 al 10 de "+_txtIdx(p.desde+p.meses):d.fechaPago;})():d.fechaPago)}</b>.${MODAL.desdePausa?" No vuelve de su pausa: cuenta hasta su último aporte antes de la pausa y la pausa sirve de aviso (Maestro PE-8).":""}`:`Su beneficio y sus aportes no cubren la ayuda: lo que falta ${destinoFaltaTexto(m)} (Maestro SA-10).`}</div>
    </div>`;
  if(d.tipo!=="fin")h+=`<div style="background:${corto?"#FDF0EE":"#F4F7F5"};border:1.5px solid ${corto?"#C0492C":"#C9DCCF"};border-radius:12px;padding:10px 12px;font-size:13px;color:${corto?"#7A2418":"#2E4A3A"};margin-bottom:12px;line-height:1.45">
      Aviso según su saldo (${fmtEur(d.saldo)} €): <b>${d.avisoMeses} mes${d.avisoMeses>1?"es":""}</b> (Maestro SA-1). Avisó en ${_txtIdx(aviso)}${corto?`: su último aporte debería ser, como pronto, el de <b>${_txtIdx(minUlt)}</b>. Solo si lo aceptas como coordinador.`:" ✓"}</div>`;
  // v45.1 (SA-10, decisión de Ángel 03/10/2026): con una ayuda pendiente la salida no es automática
  const negociar=d.ayuda.n>0&&!MODAL.bajaNegociado;
  if(d.ayuda.n>0)h+=`<div style="background:#FDF0EE;border:1.5px solid #C0492C;border-radius:12px;padding:12px;font-size:13px;color:#5A2418;margin-bottom:12px;line-height:1.5">
      ⚠️ <b>Tiene una ayuda pendiente: la salida no es automática</b> (Maestro SA-10). Antes:<br>
      1. Negociar que siga: aplazamiento, pausa de aportes (PE-8), ampliar la permanencia o lo que sea mejor.<br>
      2. Si ya cumplió sus primeros 12 meses: cubrir la ayuda con su beneficio guardado, sin salir.<br>
      3. Si no se puede: sale y la ayuda se cancela con sus aportes y su beneficio (estas cifras).<br>
      4. Si aun así no alcanza: lo que falte ${destinoFaltaTexto(m)}.
      ${negociar?`<button onclick="MODAL.bajaNegociado=true;render()" style="width:100%;margin-top:10px;padding:10px;border-radius:10px;border:1.5px solid #C0492C;background:#fff;color:#C0492C;font-size:13.5px;font-weight:700;cursor:pointer">Ya se negoció: no puede seguir</button>`:`<div style="margin-top:6px;font-weight:700">✓ Negociado: no puede seguir.</div>`}</div>`;
  if(ult>=hoyIdx)h+=`<div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.4">Cuenta los aportes ya cobrados. Las cifras se actualizan solas con los que cobres hasta su último mes y se fijan al marcar la devolución como pagada (Histórico).</div>`;
  if(!negociar)h+=`<button class="m-primary" style="${armed?"background:#C0492C":""}" onclick="${armed?`confirmarBaja('${esc(m.id)}')`:"MODAL.bajaArmed=true;render()"}">${armed?"⚠️ Pulsa de nuevo para CONFIRMAR la salida":corto?"Confirmar con aviso más corto":"Anotar la salida"}</button>
`;
  h+=`<button onclick="MODAL.bajaStep=1;MODAL.bajaArmed=false;render()" style="width:100%;padding:10px;margin-top:8px;border:none;background:transparent;color:var(--muted);font-size:13px;cursor:pointer">← Cambiar meses</button>`;
  return h;
}
function bajaContinuar(){
  const ult=_idxMes(document.getElementById("baja-mes").value,parseInt(document.getElementById("baja-anio").value));
  const av=_idxMes(document.getElementById("baja-am").value,parseInt(document.getElementById("baja-aa").value));
  const m=DATA.members.find(x=>x.id===MODAL.mid);
  if(m&&m.joinMonth&&ult<_idxMes(m.joinMonth,m.joinYear)){toast("⛔ El último mes no puede ser anterior a su entrada",3500);return;}
  if(ult<av-1){toast("⛔ El último mes no puede ser anterior al aviso",3500);return;}
  MODAL.bajaUltimoIdx=ult; MODAL.bajaAvisoIdx=av; MODAL.bajaStep=2; MODAL.bajaArmed=false; render();
}
function confirmarBaja(mid){
  const m=DATA.members.find(x=>x.id===mid);
  if(!m)return;
  const r=darDeBajaV18(m,MODAL.bajaUltimoIdx,MODAL.bajaAvisoIdx);
  if(!r.ok){ closeModal(); toast(r.motivo||"No se pudo anotar la salida"); return; }
  if(MODAL.desdePausa){ const p=(m.pausas||[]).find(x=>x.id===MODAL.desdePausa); // v45.33: se paga el mes siguiente al último de pausa
    if(p&&m.baja){ const pg=_mesDeIdx(p.desde+p.meses); m.baja.pagoMonth=pg.mes; m.baja.pagoYear=pg.anio; m.baja.fechaPago="del 5 al 10 de "+_txtIdx(p.desde+p.meses); m.baja.desdePausa=true; p.cierre="salida"; } }
  save(); toast(m.name+": salida anotada ✓");
  if(m.baja&&m.baja.v18)openModal('salida_ok',{mid:m.id}); else closeModal(); // v45.31: resumen para enviárselo
}

function previewFormHTML(){
  const m=MODAL.member;
  return`<div class="modal-title">👁️ Vista previa — ${escH(m.name)}</div>
<div class="preview-text">${escH(mText(m))}</div>
<button class="copy-full-btn" onclick="copyText(mText(DATA.members.find(x=>x.id==='${esc(m.id)}')),null);closeModal()">📋 Copiar y cerrar</button>`;
}

function memberFormHTML(){
  const pr=MODAL.preset||"asociado";
  // Solo asociados ACTIVOS pueden avalar (regla del Documento Maestro Interno).
  const asocActivos=DATA.members.filter(m=>m.type==="asociado"&&m.joinMonth&&activoEnReporte(m)).sort((a,b)=>a.name.localeCompare(b.name));
  return`<div class="modal-title">${pr==="tercero"?"Nuevo tercero":"Nuevo asociado"}</div>
${MODAL.sol?`<div style="font-size:12.5px;color:#1B4332;background:#EEF7F1;border-radius:9px;padding:7px 10px;margin-bottom:10px">📝 Es nueva: primero se da de alta y después se abre su ayuda ya rellena.</div>`:""}
<input id="m-name" class="m-input" placeholder="Nombre completo" value="${MODAL.solNombre?escH(MODAL.solNombre):""}" oninput="altaNombreCambio()">
<div id="m-conv">${_altaConvHTML(MODAL.solNombre||"",pr)}</div>
<input id="m-phone" class="m-input" type="tel" inputmode="tel" placeholder="Teléfono (WhatsApp) · opcional">
<div style="display:flex;gap:8px;margin-bottom:12px">
<button class="m-opt ${pr==="asociado"?"active":""}" data-type="asociado" onclick="this.classList.add('active');this.nextElementSibling.classList.remove('active');document.getElementById('m-ref-wrap').style.display='none';document.getElementById('m-refdo-wrap').style.display='block';altaNombreCambio()">👥 Asociado</button>
<button class="m-opt ${pr==="tercero"?"active":""}" data-type="tercero" onclick="this.classList.add('active');this.previousElementSibling.classList.remove('active');document.getElementById('m-ref-wrap').style.display='block';document.getElementById('m-refdo-wrap').style.display='none';altaNombreCambio()">🤝 Tercero</button>
</div>
<div id="m-ref-wrap" style="display:${pr==="tercero"?"block":"none"}"><select id="m-ref" class="m-select"><option value="">Avalista (asociado)…</option>${asocActivos.map(m=>`<option value="${esc(m.id)}"${MODAL.solAval===m.id?" selected":""}>${escH(m.name)}</option>`).join("")}</select></div>
<div id="m-refdo-wrap" style="display:${pr==="tercero"?"none":"block"};margin-bottom:12px">
<label class="m-label">Permanencia (obligatoria)</label>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">${_opcionesHTML("l-ci-opt","ciclo",PERM_OPCIONES,null,permEtiqueta)}</div>
<label class="m-label">Aporte habitual</label>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">${_opcionesHTML("l-ap-opt","ap",APORTE_OPCIONES,50,v=>v+" €")}</div>
<label class="m-label">🎁 ¿Quién lo trajo? (referido por)</label>
<select id="m-refdo" class="m-select" onchange="altaReferidoCambio()"><option value="">— Nadie / no aplica —</option>${asocActivos.map(m=>`<option value="${esc(m.id)}"${MODAL.solAval===m.id?" selected":""}>${escH(m.name)}</option>`).join("")}</select>
<div id="m-bono-wrap" style="display:none;margin-top:10px;background:#FBF3DC;border:1px solid #EAD9A0;border-radius:12px;padding:10px 12px">
<label class="m-label" style="color:#7A5A12">Mes en que se aplica el bono de 10 €</label>
<select id="m-bono-mes" class="m-select"></select>
<div id="m-bono-hint" style="font-size:12px;color:#7A5A12;margin-top:6px;line-height:1.4"></div>
</div>
</div>
<button class="m-primary" onclick="addMemberSubmit()">Añadir</button>`;
}

function cierreLoanFormHTML(){
  const rm=DATA.reportMonth, ry=DATA.reportYear;
  // siguiente mes para 1ª cuota
  const ni=(MONTHS.indexOf(rm)+1)%12;
  const ny=MONTHS.indexOf(rm)===11?ry+1:ry;
  const asoc=DATA.members.filter(m=>m.type==="asociado"&&activoEnReporte(m)).sort((a,b)=>a.name.localeCompare(b.name));
  const terc=DATA.members.filter(m=>m.type==="tercero").sort((a,b)=>a.name.localeCompare(b.name));
  const sol=MODAL.sol?(DATA.solicitudes||[]).find(x=>x.id===MODAL.sol):null; // v45.14
  const R=MODAL.restore||null; // v45.28: vuelve de ampliar la permanencia con los datos que tenía
  const selMid=R?R.mid:(sol?sol.mid:null), valCap=R?R.cap:(sol?sol.capital:""), valN=R?parseInt(R.n):(sol?sol.cuotas:3), valEnt=R?R.ent:(sol?sol.grupoGid:"");
  const grs=gruposCierre().map(g=>({g,p:DATA.members.find(m=>m.id===g.principalId)})).filter(x=>x.p);
  return`<div class="modal-title">🤝 Ayuda aprobada${sol?"":" en la reunión"}</div>
${sol?`<div style="font-size:12.5px;color:#1B4332;background:#EEF7F1;border-radius:9px;padding:7px 10px;margin-bottom:10px">📝 Rellenado con la solicitud de <b>${escH(sol.nombre)}</b></div>`:""}
<label class="m-label">¿A quién?</label>
<select id="cl-mid" class="m-select" style="margin-bottom:12px;font-size:15px" onchange="updateCierreLoanPreview()">
  <optgroup label="Asociados">${asoc.map(m=>`<option value="${esc(m.id)}"${selMid===m.id?" selected":""}>${escH(m.name)}</option>`).join("")}</optgroup>
  <optgroup label="Terceros">${terc.map(m=>`<option value="${esc(m.id)}"${selMid===m.id?" selected":""}>${escH(m.name)}</option>`).join("")}</optgroup>
</select>
<label class="m-label">Capital (€)</label>
<input id="cl-cap" class="m-input" type="number" placeholder="500" style="font-size:20px;font-weight:700" oninput="updateCierreLoanPreview()"${valCap!==""&&valCap!=null?` value="${escH(String(valCap))}"`:""}>
<label class="m-label">Nº cuotas</label>
<select id="cl-n" class="m-select" style="margin-bottom:12px;font-size:16px;font-weight:700" onchange="updateCierreLoanPreview()">${Array.from({length:12},(_,i)=>i+1).map(n=>`<option value="${n}"${n===valN?" selected":""}>${n} ${n===1?"cuota":"cuotas"}</option>`).join("")}</select>
<div style="font-size:12px;color:var(--muted);margin-bottom:12px">Otorgada en <b>${rm} ${ry}</b> · 1ª cuota en <b>${MONTHS[ni]} ${ny}</b></div>
${grs.length?`<label class="m-label">¿Quién entrega el dinero?</label>
<select id="cl-entrega" class="m-select" style="margin-bottom:12px;font-size:15px"><option value="">Yo</option>${grs.map(({g,p})=>`<option value="${esc(g.id)}"${valEnt&&valEnt===g.id?" selected":""}>${escH(p.name.split(" ")[0])} (del cobro de su grupo)</option>`).join("")}</select>`:""}
<div id="cl-preview"></div>
<button class="m-primary" onclick="addCierreLoanSubmit()">Registrar ayuda</button>`;
}
function updateCierreLoanPreview(){
  const cap=parseInt(document.getElementById("cl-cap")?.value)||0;
  const nn=parseInt(document.getElementById("cl-n")?.value||"3");
  const el=document.getElementById("cl-preview");
  if(!el)return;
  if(cap<=0){el.innerHTML="";return;}
  const{total,cuotas}=ayudaCuotas(cap,nn,DATA.rate);
  const base=cuotas[0],ultima=cuotas[cuotas.length-1];
  const cuotaTxt=(cuotas.length>1&&base!==ultima)?`${fmtEur(base)} € (última ${fmtEur(ultima)} €)`:`${fmtEur(base)} €`;
  const mC=DATA.members.find(x=>x.id===document.getElementById("cl-mid")?.value), cC=_condicionActual(mC);
  const ni=(MONTHS.indexOf(DATA.reportMonth)+1)%12, ny=MONTHS.indexOf(DATA.reportMonth)===11?DATA.reportYear+1:DATA.reportYear;
  const vC=validarApoyo(mC,cap,nn,cC.tipo,cC.ciclo,{m:MONTHS[ni],y:ny});
  el.innerHTML=_avisoApoyoHTML(vC)+(vC.bloqueo?botonAmpliarAyudaHTML(mC,cap,nn,{m:MONTHS[ni],y:ny}):"")+`<div style="background:var(--bg);border-radius:12px;padding:12px;margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted)"><span>Capital + retorno (${DATA.rate}% × ${nn})</span><b style="color:var(--dark)">${fmtEur(total)} €</b></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-top:4px"><span>Cuota mensual</span><b style="color:var(--warm)">${cuotaTxt}</b></div>
  </div>`;
}
function addCierreLoanSubmit(){
  const mid=document.getElementById("cl-mid").value;
  const cap=parseInt(document.getElementById("cl-cap").value)||0;if(cap<=0){alert("Capital inválido");return;}
  const nn=parseInt(document.getElementById("cl-n")?.value||"3");
  const rm=DATA.reportMonth, ry=DATA.reportYear;
  const ni=(MONTHS.indexOf(rm)+1)%12;
  const ny=MONTHS.indexOf(rm)===11?ry+1:ry;
  const m=DATA.members.find(x=>x.id===mid);
  if(!m)return;
  { const c=_condicionActual(m), v=validarApoyo(m,cap,nn,c.tipo,c.ciclo,{m:MONTHS[ni],y:ny}); // v45: mismas reglas que en la ficha
    if(v.bloqueo){ const el=document.getElementById("cl-preview"); if(el)el.innerHTML=_avisoApoyoHTML(v)+botonAmpliarAyudaHTML(m,cap,nn,{m:MONTHS[ni],y:ny}); toast("⛔ No se puede registrar: revisa el aviso",4000); return; } }
  const rate=DATA.rate;
  const{total,cuotas}=ayudaCuotas(cap,nn,rate);
  const inst=cuotas[0]; // referencia visual (importe de la 1ª cuota); el cálculo real usa l.cuotas
  const pays=[];let mi=ni,yr=ny;
  for(let i=0;i<nn;i++){pays.push({m:MONTHS[mi],y:yr,paid:false});mi++;if(mi>=12){mi=0;yr++;}}
  if(!m.loans)m.loans=[];
  const lid="L"+Date.now();
  // Condición histórica de la ayuda en el momento de concederla (mismo patrón que addLoanSubmit).
  const tipoEnConcesion=m.type;
  const avalistaEnConcesion=(m.type==="tercero")?avalistaNombre(m):null; // nombre resuelto desde el id, texto congelado
  const cicloEnConcesion=(m.ciclo!=null?m.ciclo:null);
  m.loans.push({id:lid,gMonth:rm,gYear:ry,capital:cap,total,n:nn,inst,cuotas,rate,pays,tipoEnConcesion,avalistaEnConcesion,cicloEnConcesion});
  if(!m.history)m.history=[];
  m.history.push({gMonth:rm,gYear:ry,capital:cap,lid});
  // v45.14: viene de una solicitud → queda otorgada; si la entrega el principal de un grupo → cuenta del grupo
  const gidEnt=(document.getElementById("cl-entrega")||{}).value||"";
  if(gidEnt){ _cgW(getMesKey(rm,ry),gidEnt).movs.push({id:"cg"+Date.now()+Math.random().toString(36).slice(2,6),tipo:"ayuda",importe:_r2(cap),fecha:_cgHoy(),mid,lid,nombre:m.name}); }
  if(MODAL&&MODAL.sol){ const so=(DATA.solicitudes||[]).find(x=>x.id===MODAL.sol);
    if(so&&so.grupoGid&&!_grupoDe(mid)){ const gg=gruposCierre().find(x=>x.id===so.grupoGid); if(gg&&gg.principalId!==mid){ if(!gg.miembros)gg.miembros=[]; gg.miembros.push(mid); } } // v45.15
    if(so&&so.avalId&&m.type==="tercero"&&!m.ref)m.ref=so.avalId; // v45.15
    if(so){ so.estado="otorgada"; so.mid=mid; so.lid=lid; so.mesOtorgada=getMesKey(rm,ry); so.capitalOtorgado=cap; so.cuotasOtorgadas=nn; so.entregaGid=gidEnt||null; so.fechaOtorgada=_cgHoy(); } }
  save();closeModal();render();toast("Ayuda registrada ✓");
}
function loanFormHTML(){
  // Predefinir: mes otorgada = mes en curso (rm/ry); 1ª cuota = mes siguiente (regla del fondo)
  const gm=DATA.reportMonth, gy=DATA.reportYear;
  const gi=MONTHS.indexOf(gm);
  const sm=MONTHS[(gi+1)%12];
  const sy=(gi+1)>=12 ? (gy+1) : gy;
  const yStr=y=>String(y);
  return`<div class="modal-title">Nueva ayuda</div>
<label class="m-label">Capital (€)</label>
<input id="l-cap" class="m-input" type="number" placeholder="500" style="font-size:20px;font-weight:700" oninput="updateLoanPreview()">
<label class="m-label">Nº cuotas</label>
<select id="l-n" class="m-select" style="margin-bottom:12px;font-size:16px;font-weight:700" onchange="updateLoanPreview()">${Array.from({length:12},(_,i)=>i+1).map(n=>`<option value="${n}"${n===3?" selected":""}>${n} ${n===1?"cuota":"cuotas"}</option>`).join("")}</select>
<label class="m-label">Retorno mensual (%)</label>
<input id="l-rate" class="m-input" type="number" value="${DATA.rate}" min="0" step="0.5" style="margin-bottom:12px" oninput="updateLoanPreview()">
<div style="display:flex;gap:8px;margin-bottom:12px">
<div style="flex:1"><label class="m-label">Mes otorgada</label><select id="l-gm" class="m-select" onchange="syncPrimeraCuota()">${MONTHS.map(m=>`<option${m===gm?" selected":""}>${m}</option>`).join("")}</select></div>
<div style="flex:1"><label class="m-label">Año</label><select id="l-gy" class="m-select" onchange="syncPrimeraCuota()">${["2025","2026","2027"].map(y=>`<option${y===yStr(gy)?" selected":""}>${y}</option>`).join("")}</select></div>
</div>
<div style="display:flex;gap:8px;margin-bottom:16px">
<div style="flex:1"><label class="m-label">1ª cuota mes</label><select id="l-sm" class="m-select">${MONTHS.map(m=>`<option${m===sm?" selected":""}>${m}</option>`).join("")}</select></div>
<div style="flex:1"><label class="m-label">Año</label><select id="l-sy" class="m-select">${["2025","2026","2027"].map(y=>`<option${y===yStr(sy)?" selected":""}>${y}</option>`).join("")}</select></div>
</div>
<div id="l-preview"></div>
<button class="m-primary" onclick="addLoanSubmit()">Añadir ayuda</button>`;
}
// Al cambiar el mes/año otorgado, ajusta automáticamente la 1ª cuota al mes siguiente
function syncPrimeraCuota(){
  const gm=document.getElementById("l-gm"), gy=document.getElementById("l-gy");
  const sm=document.getElementById("l-sm"), sy=document.getElementById("l-sy");
  if(!gm||!sm)return;
  const gi=MONTHS.indexOf(gm.value);
  const ni=(gi+1)%12;
  sm.value=MONTHS[ni];
  const ny=(gi+1)>=12 ? (parseInt(gy.value)+1) : parseInt(gy.value);
  sy.value=String(ny);
  if(typeof updateLoanPreview==="function")updateLoanPreview();
}

function updateLoanPreview(){
  const cap=parseInt(document.getElementById("l-cap")?.value)||0;
  const nn=parseInt(document.getElementById("l-n")?.value||"3");
  let rate=parseFloat(document.getElementById("l-rate")?.value);
  if(isNaN(rate)||rate<0)rate=DATA.rate;
  if(cap<=0){document.getElementById("l-preview").innerHTML="";return;}
  const{total,cuotas}=ayudaCuotas(cap,nn,rate);
  const base=cuotas[0],ultima=cuotas[cuotas.length-1];
  const cuotaTxt=(cuotas.length>1&&base!==ultima)?`${fmtEur(base)} € (última ${fmtEur(ultima)} €)`:`${fmtEur(base)} €`;
  const mV=DATA.members.find(x=>x.id===MODAL.mid), cV=_condicionActual(mV);
  const aviso=_avisoApoyoHTML(validarApoyo(mV,cap,nn,cV.tipo,cV.ciclo,{m:document.getElementById("l-sm")?.value,y:parseInt(document.getElementById("l-sy")?.value)}));
  document.getElementById("l-preview").innerHTML=aviso+`<div class="m-summary"><div style="font-size:13px;color:var(--muted);margin-bottom:4px">Resumen</div><div style="display:flex;justify-content:space-between;font-size:15px;margin-top:4px"><span>Capital + retorno (${rate}% × ${nn})</span><span style="font-weight:700">${fmtEur(total)} €</span></div><div style="display:flex;justify-content:space-between;font-size:15px;margin-top:4px"><span>Cuota mensual</span><span style="font-weight:700;color:var(--warm)">${cuotaTxt}</span></div></div>`;
}
