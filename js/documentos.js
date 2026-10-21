// Nuevos Horizontes · documentos.js
// Papeles del mes: hoja de cobro, acta, carpeta, libro de caja y PDF
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).
function abrirDocImp(tipo){ DOC_IMP={tipo,rm:DATA.reportMonth,ry:DATA.reportYear}; PDF_LISTO=null; window.scrollTo(0,0); render(); }
function cerrarDocImp(){ DOC_IMP=null; PDF_LISTO=null; document.body.classList.remove("doc-abierto"); render(); }
function _mdSoloLectura(rm,ry){ return (DATA.monthlyData&&DATA.monthlyData[getMesKey(rm,ry)])||{aportes:{}}; }
// Personas del documento agrupadas por grupos de cierre (principal primero) y, al final,
// quien no esté en ningún grupo. Solo quien tiene algo que pagar ese mes.
function bloquesCobroMes(rm,ry){
  const porId=new Map(DATA.members.map(m=>[m.id,m])); const usados=new Set(); const bloques=[];
  const fila=m=>{const it=itemsMiembroMes(m,rm,ry); return it.length?{m,items:it}:null;};
  (DATA.gruposCierre||[]).forEach(g=>{
    const filas=[g.principalId,...(g.miembros||[])].map(id=>porId.get(id)).filter(Boolean)
      .map(m=>{usados.add(m.id);return fila(m);}).filter(Boolean);
    const p=porId.get(g.principalId);
    if(filas.length)bloques.push({titulo:"Grupo de "+(p?p.name:"—"),filas});
  });
  const resto=DATA.members.filter(m=>!usados.has(m.id)).sort((a,b)=>a.name.localeCompare(b.name)).map(fila).filter(Boolean);
  if(resto.length)bloques.push({titulo:"Sin grupo de cierre",filas:resto});
  return bloques;
}
function resumenMesDoc(rm,ry){
  const key=getMesKey(rm,ry), md=_mdSoloLectura(rm,ry);
  const bloques=bloquesCobroMes(rm,ry);
  let apPrev=0,apCob=0,nAp=0,nApPag=0,cuPrev=0,cuCob=0,nCu=0,nCuPag=0,recPrev=0,recCob=0,noCob=0,
      bonosPrev=0,bonosCob=0,apBrutoCob=0;
  const noCobLista=[];
  bloques.forEach(b=>b.filas.forEach(f=>f.items.forEach(it=>{
    if(it.noCobrable){noCob+=it.importe;noCobLista.push({m:f.m,it});}
    if(it.tipo==="aporte"){apPrev+=it.importe;nAp++;if(!it.noCobrable)bonosPrev+=it.descuento||0;
      if(it.pagado){apCob+=it.importe;nApPag++;bonosCob+=it.descuento||0;apBrutoCob+=it.bruto||it.importe;}}
    else{cuPrev+=it.importe;nCu++;recPrev+=it.recargo;if(it.pagado){cuCob+=it.importe;nCuPag++;recCob+=it.recargo;}}
  })));
  const r2=x=>Math.round(x*100)/100;
  const terminan=[],concedidos=[],aplazadas=[];
  cuotasDelMes(rm,ry).forEach(c=>{
    if(c.totalCuotas>1&&c.numCuota>=c.totalCuotas)terminan.push(c);
    if(c.aplazada)aplazadas.push(c);
  });
  DATA.members.forEach(m=>[...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{
    if(l.gMonth===rm&&l.gYear===ry)concedidos.push({m,l});
  }));
  const niveles=DATA.members.map(m=>({m,s:subidaNivelReciente(m,rm,ry)})).filter(x=>x.s);
  const referidos=DATA.members.filter(m=>descuentoReferidoMes(m.id,rm,ry).nReferidos>0)
    .map(m=>({m,nombres:nombresReferidosMes(m.id,rm,ry)}));
  const altas=DATA.members.filter(m=>m.type==="asociado"&&m.joinMonth===rm&&m.joinYear===ry);
  const bajas=resumenBajasMes(rm,ry);
  const retiradas=[]; DATA.members.forEach(m=>retiradasDe(m).forEach(r=>{ if(pagoRetiradaIdx(r)===_idxMes(rm,ry))retiradas.push({m,r}); })); // v45.1
  const pendAnt=DATA.members.map(m=>({m,p:pendienteMesAnterior(m,rm,ry)})).filter(x=>x.p.pendiente>0);
  const recargoMes=(typeof md.recargo==="number")?md.recargo:recargoAutoMes(rm,ry); // el guardado del mes manda
  return {bloques,apPrev:r2(apPrev),apCob:r2(apCob),nAp,nApPag,cuPrev:r2(cuPrev),cuCob:r2(cuCob),nCu,nCuPag,
    recPrev:r2(recPrev),recCob:r2(recCob),totPrev:r2(apPrev+cuPrev),totCob:r2(apCob+cuCob),
    noCob:r2(noCob),noCobLista,pendiente:r2(apPrev+cuPrev-apCob-cuCob-noCob),
    bonosPrev:r2(bonosPrev),bonosCob:r2(bonosCob),apBrutoCob:r2(apBrutoCob),
    terminan,concedidos,aplazadas,niveles,referidos,altas,bajas,retiradas,pendAnt,recargoMes};
}
// v45.4 (fase de crecimiento: todo se reinvierte): el acta muestra solo lo que entró y salió en el
// mes, un hueco para el efectivo contado y el dinero del fondo, sin saldo arrastrado desde 2025.
function cajaMesHTML(rm,ry){
  const c=cajaMensual()[getMesKey(rm,ry)]; if(!c)return "";
  const mesF=MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase();
  const neto=Math.round((c.entradas-c.salidas)*100)/100;
  return `<h3>4. Caja del mes</h3>
  <div class="doc-caja2">
  <table class="doc-t doc-caja"><tbody>
    <tr class="doc-subt"><td colspan="2">Entró en ${mesF}</td></tr>
    <tr><td>Aportes cobrados${c.bonos?` <span class="doc-sub">(íntegros ${_eur(c.aportesBrutos)} − bonos ${_eur(c.bonos)})</span>`:""}</td><td class="n">${_eur(c.aportes)}</td></tr>
    <tr><td>Cuotas cobradas <span class="doc-sub">(capital ${_eur(c.capDev)} + retornos ${_eur(c.retornos)})</span></td><td class="n">${_eur(c.cuotas)}</td></tr>
    ${c.puntIn?`<tr><td>Aportes temporales recibidos (${c.nPuntIn})</td><td class="n">${_eur(c.puntIn)}</td></tr>`:""}
    <tr><td><b>Total entró</b></td><td class="n"><b>${_eur(c.entradas)}</b></td></tr>
    <tr class="doc-subt"><td colspan="2">Salió en ${mesF}</td></tr>
    <tr><td>Ayudas entregadas (${c.nApoyos})</td><td class="n">${_eur(c.apoyos)}</td></tr>
    ${c.puntOut?`<tr><td>Aportes temporales devueltos (${c.nPuntOut})</td><td class="n">${_eur(c.puntOut)}</td></tr>`:""}
    ${c.bajas?`<tr><td>Salidas del fondo pagadas</td><td class="n">${_eur(c.bajas)}</td></tr>`:""}
    ${c.retir?`<tr><td>Beneficio retirado sin salir (${c.nRetir})</td><td class="n">${_eur(c.retir)}</td></tr>`:""}
    ${c.gastos?`<tr><td>Gastos administrativos (${c.nGastos})</td><td class="n">${_eur(c.gastos)}</td></tr>`:""}
    <tr><td><b>Total salió</b></td><td class="n"><b>${_eur(c.salidas)}</b></td></tr>
    <tr class="doc-subt"><td>Queda del mes (entró − salió)</td><td class="n">${neto>0?"+":""}${_eur(neto)}</td></tr>
    <tr><td>Efectivo contado</td><td class="n"><span class="doc-raya-e"></span>€</td></tr>
    <tr><td>Diferencia</td><td class="n"><span class="doc-raya-e"></span>€</td></tr>
  </tbody></table>
  <table class="doc-t doc-caja"><tbody>
    <tr class="doc-subt"><td colspan="2">Dinero del fondo al cerrar ${mesF}</td></tr>
    <tr><td>Prestado en ayudas <span class="doc-sub">(falta que lo devuelvan)</span></td><td class="n">${_eur(c.cartera)}</td></tr>
    <tr class="doc-subt"><td colspan="2">De los asociados</td></tr>
    <tr><td>Sus aportes</td><td class="n">${_eur(c.acAp)}</td></tr>
    <tr><td>Su beneficio guardado</td><td class="n">${_eur(c.acBen)}</td></tr>
    ${c.puntPend?`<tr><td>Aportes temporales por devolver</td><td class="n">${_eur(c.puntPend)}</td></tr>`:""}
    <tr><td><b>Total de los asociados</b></td><td class="n"><b>${_eur(c.acAp+c.acBen+c.puntPend)}</b></td></tr>
  </tbody></table></div>`;
}
function _lista(items){ return items.length?`<ul class="doc-ul">${items.map(x=>`<li>${x}</li>`).join("")}</ul>`:`<div class="doc-vacio">— Ninguno este mes</div>`; }
function _seccionesReunion(R,rm,ry,cerrado){
  const mesF=MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase();
  const rep=repartoBeneficioMes(cerrado?R.recargoMes:R.recPrev,rm,ry);
  const bonos=cerrado?R.bonosCob:R.bonosPrev; // v44.19: los bonos por referido los asume el fondo
  const exc=Math.round((rep.excedente-bonos)*100)/100;
  let h=`<div class="doc-kpis">
    <div class="doc-kpi"><div class="k">${cerrado?"Cobrado":"Total previsto"}</div><div class="v">${_eur(cerrado?R.totCob:R.totPrev)}</div>${cerrado?`<div class="s">de ${_eur(R.totPrev)} previstos</div>`:""}</div>
    <div class="doc-kpi"><div class="k">Aportaciones</div><div class="v">${_eur(cerrado?R.apCob:R.apPrev)}</div><div class="s">${cerrado?`${R.nApPag} de ${R.nAp} asociados`:`${R.nAp} asociados`}</div></div>
    <div class="doc-kpi"><div class="k">Cuotas de ayudas</div><div class="v">${_eur(cerrado?R.cuCob:R.cuPrev)}</div><div class="s">${cerrado?`${R.nCuPag} de ${R.nCu} cuotas`:`${R.nCu} cuotas`}</div></div>
  </div>
  <table class="doc-t doc-mini"><tbody>
    <tr><td>Retornos compartidos ${cerrado?"del mes":"previstos"} (5 % de cada cuota)</td><td class="n">${_eur(cerrado?R.recargoMes:R.recPrev)}</td></tr>
    <tr><td>Beneficio para los asociados según su permanencia y aporte (${rep.conDerecho.length} con derecho)</td><td class="n">${_eur(rep.obligacion)}</td></tr>
    ${bonos?`<tr><td>Bonos por referido ${cerrado?"del mes":"previstos"} (los asume el fondo)</td><td class="n">${_eur(bonos)}</td></tr>`:""}
    <tr><td><b>${exc>=0?"Excedente":"Diferencia que pone el fondo"}</b> ${exc>=0?`(retornos − beneficio${bonos?" − bonos":""})`:""} <span class="doc-sub">· dato informativo: se reinvierte en ayudas (Maestro FO-2)</span></td><td class="n"><b>${_eur(exc)}</b></td></tr>
  </tbody></table>
  ${(()=>{ // v44.17: solo los apartados con contenido; los vacíos en una línea (ahorra papel)
    const secs=[];
    // v45.4: las ayudas que terminan y las cuotas cobradas se ven en el detalle por persona del acta
    secs.push(["🤝 Ayudas concedidas en "+mesF,"ayudas concedidas",R.concedidos.map(x=>`${escH(x.m.name)}${x.m.type==="tercero"?" (tercero)":""} — ${_eur(x.l.capital)} a ${x.l.n} meses`)]);
    // v45.4: solo el resumen (cuántos y de qué tarifa a cuál), sin la lista de nombres
    if(cerrado)secs.push(["🎉 Empiezan un nuevo año de permanencia","nuevos años de permanencia",(()=>{const g={};R.niveles.forEach(x=>{const k=x.s.antes+"→"+x.s.ahora;g[k]=(g[k]||0)+1;});
      return Object.entries(g).map(([k,n])=>{const [a,b]=k.split("→");return `${n} asociado${n>1?"s":""} — de ${a} € a ${b} € por cada 50 €`;});})()]);
    secs.push(["🎁 Bonos por referido","bonos por referido",R.referidos.map(x=>`${escH(x.m.name)} — ${x.nombres.map(escH).join(", ")}`)]);
    secs.push(["👋 Nuevos asociados","nuevos asociados",R.altas.map(m=>{const q=quienRefirio(m);return escH(m.name)+(q?` <span class="doc-sub">(referido por ${escH(q)})</span>`:"");})]);
    secs.push(["↩️ Devoluciones por baja","devoluciones por baja",R.bajas.lista.map(m=>`${escH(m.name)} — ${_eur(datosBaja(m).total)}${m.baja.pagada?" (pagada)":" (pendiente)"}`)]);
    secs.push(["💶 Beneficio retirado sin salir","retiradas de beneficio",R.retiradas.map(x=>`${escH(x.m.name)} — ${_eur(importeRetirada(x.m,x.r))}${x.r.pagada?" (pagado)":" (pendiente)"}`)]);
    secs.push(["⏸️ Aplazamientos","aplazamientos",R.aplazadas.map(c=>`${escH(c.nombre)} — ayuda ${c.gMonth} ${c.gYear} (paga ${_eur(c.inst)} de retorno)`)]);
    secs.push(["⚠️ Pendiente del mes anterior","pendientes del mes anterior",R.pendAnt.map(x=>`${escH(x.m.name)} — ${_eur(x.p.pendiente)} de ${MONTHS_FULL[MONTHS.indexOf(x.p.mes)].toLowerCase()}`)]);
    const llenas=secs.filter(x=>x[2].length), vacias=secs.filter(x=>!x[2].length).map(x=>x[1]);
    return (llenas.length?`<div class="doc-cols">${llenas.map(x=>`<div><h4>${x[0]}</h4>${_lista(x[2])}</div>`).join("")}</div>`:"")
      +""; // v45.4: ni en la hoja de cobro ni en el acta se lista lo que no hay («Este mes sin…»)
  })()}`;
  return h;
}
function docCobroHTML(rm,ry){
  const R=resumenMesDoc(rm,ry), mesF=MONTHS_FULL[MONTHS.indexOf(rm)];
  let h=`<div class="doc-cab"><div><div class="doc-org">NUEVOS HORIZONTES</div><div class="doc-tit">Hoja de cobro · ${mesF} ${ry}</div></div>
    <div class="doc-fecha">Reunión del ____ / ____ / ________</div></div>
  <h3>1. Resumen para la reunión</h3>`+_seccionesReunion(R,rm,ry,false)+salidasPrevistasDocHTML(rm,ry)+`
  <div class="doc-grupos" data-cab="1"><div class="doc-cabgrupos"><h3>2. Cobro por grupos (efectivo)</h3>
  </div>`;
  // v44.19b: una línea por concepto (aportación / cada cuota) con su detalle completo
  // ("Cuota 4/9 · apoyo de junio 2026", nombres de los referidos del bono) y el importe en su
  // columna (Aporte o Cuota). Persona, Total, ✓ y Recibido ocupan todas sus líneas.
  // Al pie de cada grupo: total de aportes, de cuotas y de los dos (lo que queda por cobrar).
  let totPend=0,totYa=0;
  const mesL=(m,y)=>MONTHS_FULL[MONTHS.indexOf(m)].toLowerCase()+" "+y;
  const lista=a=>a.length<=1?a.join(""):a.slice(0,-1).join(", ")+" y "+a[a.length-1];
  R.bloques.forEach(b=>{
    let gAp=0,gCu=0,subYa=0;
    h+=`<div class="doc-grupo"><table class="doc-t doc-fija doc-cobro"><colgroup><col style="width:20%"><col style="width:45%"><col style="width:10%"><col style="width:10%"><col style="width:10%"><col style="width:5%"></colgroup><thead><tr><th colspan="6" class="doc-gtit">${escH(b.titulo)}</th></tr>
      <tr><th>Persona</th><th>Concepto</th><th class="n">Aporte</th><th class="n">Cuota</th><th class="n">Total</th><th class="c">✓</th></tr></thead><tbody>`; // v45.3: sin columna «Recibido»
    b.filas.forEach(f=>{
      // v44.20: hoja para apuntar el cobro a mano → no usa lo ya marcado en la app (para eso está el acta)
      const total=f.items.reduce((s,i)=>s+i.importe,0), ya=0;
      const pend=Math.round(total*100)/100;
      const todoPagado=false, n=f.items.length;
      f.items.forEach(i=>{ if(i.tipo==="aporte")gAp+=i.importe; else gCu+=i.importe; });
      f.items.forEach((i,k)=>{
        let txt;
        if(i.tipo==="aporte"){
          const nom=nombresReferidosMes(f.m.id,rm,ry);
          txt="Aportación mensual" // v45: el importe del mes (50–200) va en la columna Aporte
            +(i.descuento?`<div class="doc-sub">bono −${i.descuento} € por ${escH(lista(nom))}</div>`:"");
        }else{
          const base=i.aplazada?"Cuota aplazada (solo retorno)":i.de<=1?"Cuota única":i.ultima?`🏁 <b>Última cuota</b> ${i.num}/${i.de}`:`Cuota ${i.num}/${i.de}`;
          txt=`${base} · ayuda de ${mesL(i.gMonth,i.gYear)}`;
        }
        const imp=_eur(i.importe);
        h+=`<tr class="${todoPagado?"doc-ya":""}${k>0?" doc-cont":""}${i.tipo==="aporte"?" doc-fila-ap":""}">`
          +(k===0?`<td class="doc-nom" rowspan="${n}">${escH(f.m.name)}<div class="doc-sub">${f.m.type==="tercero"?"tercero":"asociado"}</div></td>`:"")
          +`<td class="doc-cpt">${txt}</td><td class="n">${i.tipo==="aporte"?imp:""}</td><td class="n">${i.tipo==="cuota"?imp:""}</td>`
          +(k===0?`<td class="n" rowspan="${n}"><b>${_eur(pend)}</b>${ya>0&&!todoPagado?`<div class="doc-sub">de ${_eur(total)}</div>`:""}</td><td class="c" rowspan="${n}">${todoPagado?"✓":`<span class="doc-check"></span>`}</td>`:"")
          +`</tr>`;
      });
    });
    const gTot=Math.round((gAp+gCu)*100)/100;
    totPend+=gTot; totYa+=subYa;
    h+=`<tr class="doc-subt"><td colspan="2">Total del grupo</td><td class="n">${_eur(gAp)}</td><td class="n">${_eur(gCu)}</td><td class="n">${_eur(gTot)}</td><td></td></tr></tbody></table></div>`;
  });
  // v45.3: huecos para apuntar a mano en la reunión los nuevos asociados y las ayudas nuevas
  const filasVacias=(n,cols)=>Array.from({length:n},()=>`<tr class="doc-hueco">${cols.map(c=>`<td class="${c}">${c==="perm"?`<span class="doc-sub">12 · 24 · 36 · ∞</span>`:c==="c"?`<span class="doc-check"></span>`:""}</td>`).join("")}</tr>`).join("");
  h+=`</div><div class="doc-final"><h3>3. Nuevos asociados</h3>
  <table class="doc-t doc-fija doc-nuevos"><colgroup><col style="width:30%"><col style="width:27%"><col style="width:20%"><col style="width:15%"><col style="width:8%"></colgroup>
    <thead><tr><th>Nombre</th><th>Recomendado por (aval)</th><th class="c">Permanencia</th><th class="n">Aporte</th><th class="c">✓</th></tr></thead>
    <tbody>${filasVacias(3,["","","perm","n","c"])}</tbody></table>
  <h3>4. Arqueo de caja</h3>
  <table class="doc-t doc-arq"><tbody>
    <tr><td><b>Total a cobrar del mes</b> <span class="doc-sub">(aportes ${_eur(R.apPrev)} + cuotas ${_eur(R.cuPrev)})</span></td><td class="n"><b>${_eur(totPend)}</b></td></tr>
    <tr><td>Efectivo contado</td><td class="n"><span class="doc-raya-e"></span>€</td></tr>
    <tr><td>Diferencia (contado − a cobrar)</td><td class="n"><span class="doc-raya-e"></span>€</td></tr>
    <tr><td colspan="2" style="height:54px;vertical-align:top">Observaciones:</td></tr>
  </tbody></table>
  <h3>5. Ayudas nuevas</h3>
  <table class="doc-t doc-fija doc-nuevos"><colgroup><col style="width:30%"><col style="width:15%"><col style="width:13%"><col style="width:15%"><col style="width:27%"></colgroup>
    <thead><tr><th>Nombre</th><th class="n">Importe</th><th class="c">Meses</th><th class="n">Cuota</th><th>Aval (si es tercero)</th></tr></thead>
    <tbody>${filasVacias(10,["","n","c0","n",""])}</tbody></table></div>`;
  return h;
}
function docActaHTML(rm,ry){
  const R=resumenMesDoc(rm,ry), mesF=MONTHS_FULL[MONTHS.indexOf(rm)];
  const hoy=new Date().toLocaleDateString("es-ES");
  let h=`<div class="doc-cab"><div><div class="doc-org">NUEVOS HORIZONTES</div><div class="doc-tit">Acta de cierre · ${mesF} ${ry}</div></div>
    <div class="doc-fecha">Generada el ${hoy}</div></div>
  <h3>1. Resumen del mes</h3>`+_seccionesReunion(R,rm,ry,true);
  const pend=[];
  h+=`<div class="doc-grupos"><div class="doc-cabgrupos"><h3>2. Detalle por persona</h3></div>`;
  // v45.4: como la hoja de cobro, una línea por concepto (aportación / cada cuota con «cuota N/M · ayuda de mes»)
  const mesLA=(m,y)=>MONTHS_FULL[MONTHS.indexOf(m)].toLowerCase()+" "+y;
  R.bloques.forEach(b=>{
    let gAp=0,gCu=0,gCob=0;
    h+=`<div class="doc-grupo"><table class="doc-t doc-fija doc-cobro doc-actad"><colgroup><col style="width:19%"><col style="width:37%"><col style="width:10%"><col style="width:10%"><col style="width:10%"><col style="width:14%"></colgroup><thead><tr><th colspan="6" class="doc-gtit">${escH(b.titulo)}</th></tr>
      <tr><th>Persona</th><th>Concepto</th><th class="n">Aporte</th><th class="n">Cuota</th><th class="n">Cobrado</th><th>Estado</th></tr></thead><tbody>`;
    b.filas.forEach(f=>{
      const total=f.items.reduce((s,i)=>s+i.importe,0), cob=f.items.filter(i=>i.pagado).reduce((s,i)=>s+i.importe,0);
      const nc=f.items.filter(i=>i.noCobrable).reduce((s,i)=>s+i.importe,0);
      const falta=Math.round((total-cob-nc)*100)/100;
      const apl=f.items.some(i=>i.aplazada);
      if(falta>0)pend.push({m:f.m,falta,items:f.items.filter(i=>!i.pagado&&!i.noCobrable)});
      const bajaTxt=f.m.baja?` · causó baja en ${MONTHS_FULL[MONTHS.indexOf(f.m.baja.month)].toLowerCase()} (no se reclama)`:"";
      const estado=(falta>0?`⏳ Pendiente ${_eur(falta)}`:nc>0?`— No cobrado ${_eur(nc)}${bajaTxt}`:"✓ Pagado")+(apl?" · ⏸️ aplazamiento":"")+(f.items.some(i=>i.ultima&&i.pagado)?" · 🏁 ayuda terminada":"");
      const n=f.items.length; gCob+=cob;
      f.items.forEach((i,k)=>{
        let txt;
        if(i.tipo==="aporte"){
          const nom=nombresReferidosMes(f.m.id,rm,ry);
          txt="Aportación mensual"+(i.descuento?`<div class="doc-sub">bono −${i.descuento} € por ${escH(nom.join(", "))}</div>`:"");
          gAp+=i.importe;
        }else{
          const base=i.aplazada?"Cuota aplazada (solo retorno)":i.de<=1?"Cuota única":i.ultima?`🏁 <b>Última cuota</b> ${i.num}/${i.de}`:`Cuota ${i.num}/${i.de}`;
          txt=`${base} · ayuda de ${mesLA(i.gMonth,i.gYear)}`; gCu+=i.importe;
        }
        if(!i.pagado)txt+=i.noCobrable?` <span class="doc-sub">· no se reclama</span>`:` <b>· pendiente</b>`;
        h+=`<tr class="${falta>0?"doc-pend":""}${k>0?" doc-cont":""}${i.tipo==="aporte"?" doc-fila-ap":""}">`
          +(k===0?`<td class="doc-nom" rowspan="${n}">${escH(f.m.name)}<div class="doc-sub">${f.m.type==="tercero"?"tercero":"asociado"}</div></td>`:"")
          +`<td class="doc-cpt">${txt}</td><td class="n">${i.tipo==="aporte"?_eur(i.importe):""}</td><td class="n">${i.tipo==="cuota"?_eur(i.importe):""}</td>`
          +(k===0?`<td class="n" rowspan="${n}"><b>${_eur(cob)}</b></td><td rowspan="${n}" style="font-size:.92em">${estado}</td>`:"")
          +`</tr>`;
      });
    });
    h+=`<tr class="doc-subt"><td colspan="2">Total del grupo</td><td class="n">${_eur(gAp)}</td><td class="n">${_eur(gCu)}</td><td class="n">${_eur(gCob)}</td><td></td></tr></tbody></table></div>`;
  });
  h+=`</div><div class="doc-final">`+(pend.length?`<h3>3. Pendientes de cobro</h3>`+_lista(pend.map(x=>`${escH(x.m.name)} — ${_eur(x.falta)} (${x.items.map(i=>escH(i.txt)).join("; ")})`)):`<h3>3. Pendientes de cobro: ninguno</h3>`);
  h+=`<div class="doc-pie">Totales: previsto ${_eur(R.totPrev)} · cobrado ${_eur(R.totCob)}${R.noCob>0?` · no cobrado por baja ${_eur(R.noCob)}`:""} · pendiente ${_eur(R.pendiente)}.</div>`;
  h+=cajaMesHTML(rm,ry)+`</div>`;
  return h;
}
function quedaAsociacionHTML(rm,ry){
  const q=quedaAsociacionMes(rm,ry), mesF=MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase();
  const ab=!!DESP["queda-asoc-meses"], r2=x=>fmtEur(Math.round(x*100)/100);
  let h=`<div class="rf-divider"></div>
    <div class="rf-sec">Para la asociación · ${mesF} <small style="opacity:.7">(solo para ti${q.enCurso?" · previsto":""})</small></div>
    <div class="rf-row"><span>Retornos ${q.enCurso?"previstos":"cobrados"} del mes</span><span class="rf-val">${r2(q.retornos)} €</span></div>
    <div class="rf-row"><span>− Beneficio de los asociados</span><span class="rf-val">${r2(q.beneficio)} €</span></div>
    ${q.bonos?`<div class="rf-row"><span>− Bonos por referido</span><span class="rf-val">${r2(q.bonos)} €</span></div>`:""}
    <div class="rf-total"><span>${q.queda>=0?"QUEDA PARA LA ASOCIACIÓN":"FALTA (lo pone el fondo)"}</span><span>${r2(Math.abs(q.queda))} €</span></div>
    <div class="rf-row" style="cursor:pointer" onclick="DESP['queda-asoc-meses']=!DESP['queda-asoc-meses'];render()"><span>Ver otros meses</span><span class="rf-val">${ab?"▲":"▼"}</span></div>`;
  if(ab){
    const meses=[]; let y=2025,i=7; const fin=_idxMes(rm,ry);
    while(y*12+i<=fin){ meses.push({rm:MONTHS[i],ry:y}); i++; if(i>11){i=0;y++;} }
    meses.reverse().forEach(m=>{ const x=quedaAsociacionMes(m.rm,m.ry);
      h+=`<div class="rf-row"><span>${MONTHS_FULL[MONTHS.indexOf(m.rm)]} ${m.ry}${x.enCurso?" <small style=\"opacity:.7\">(previsto)</small>":""}</span><span class="rf-val" style="${x.queda<0?"color:#FFB4A3":""}">${x.queda<0?"−":""}${r2(Math.abs(x.queda))} €</span></div>`; });
    h+=`<div style="font-size:11px;opacity:.7;margin-top:4px;line-height:1.35">Cada mes por separado: retornos − beneficio − bonos. No se acumula de un mes a otro. Hasta noviembre 2025 el beneficio era todo el retorno repartido, por eso esos meses dan 0. El mes en curso es previsto (como en la hoja de cobro); al cerrarlo cuenta lo cobrado.</div>`;
  }
  return h;
}
function mesesCarpeta(){
  const out=[]; let y=2025, i=7; // Ago 2025
  const fin=DATA.reportYear*12+MONTHS.indexOf(DATA.reportMonth); // excluye el mes en curso
  while(y*12+i<fin){ out.push({rm:MONTHS[i],ry:y}); i++; if(i>11){i=0;y++;} }
  return out;
}
function docCarpetaHTML(){
  const meses=mesesCarpeta(); if(!meses.length)return `<div class="doc-vacio">No hay meses cerrados todavía.</div>`;
  const hoy=new Date().toLocaleDateString("es-ES");
  const ini=meses[0], ult=meses[meses.length-1];
  const nom=m=>MONTHS_FULL[MONTHS.indexOf(m.rm)]+" "+m.ry;
  let T={prev:0,cob:0,ap:0,cu:0,ret:0,ben:0,exc:0,nConc:0,conc:0};
  const filas=meses.map(m=>{
    const R=resumenMesDoc(m.rm,m.ry), rep=repartoBeneficioMes(R.recargoMes,m.rm,m.ry), exc=Math.round((rep.excedente-R.bonosCob)*100)/100;
    const conc=R.concedidos.reduce((s,x)=>s+(x.l.capital||0),0);
    T.prev+=R.totPrev;T.cob+=R.totCob;T.ap+=R.apCob;T.cu+=R.cuCob;T.ret+=R.recargoMes;T.ben+=rep.obligacion;T.bon=(T.bon||0)+R.bonosCob;T.exc+=exc;T.nConc+=R.concedidos.length;T.conc+=conc;
    T.noCob=(T.noCob||0)+R.noCob;
    return `<tr><td>${nom(m)}</td><td class="n">${_eur(R.totPrev)}</td><td class="n">${_eur(R.totCob)}</td><td class="n">${_eur(R.pendiente)}${R.noCob>0?`<div class="doc-sub">+${_eur(R.noCob)} baja</div>`:""}</td>
      <td class="n">${_eur(R.recargoMes)}</td><td class="n">${_eur(rep.obligacion)}</td><td class="n">${_eur(R.bonosCob)}</td><td class="n">${_eur(exc)}</td><td class="n">${R.concedidos.length} · ${_eur(conc)}</td></tr>`;
  }).join("");
  let h=`<div class="doc-unidad doc-portada"><div class="doc-cab"><div><div class="doc-org">NUEVOS HORIZONTES</div><div class="doc-tit">Carpeta de control · Actas de cierre</div></div>
    <div class="doc-fecha">De ${nom(ini)} a ${nom(ult)}<br>Generada el ${hoy}</div></div>
    <h3>Índice y resumen por mes</h3>
    <table class="doc-t doc-mini"><thead><tr><th>Mes</th><th class="n">Previsto</th><th class="n">Cobrado</th><th class="n">Pendiente</th><th class="n">Retornos</th><th class="n">Beneficio</th><th class="n">Bonos</th><th class="n">Excedente</th><th class="n">Ayudas concedidas</th></tr></thead>
    <tbody>${filas}<tr class="doc-subt"><td>Total</td><td class="n">${_eur(T.prev)}</td><td class="n">${_eur(T.cob)}</td><td class="n">${_eur(T.prev-T.cob-(T.noCob||0))}</td><td class="n">${_eur(T.ret)}</td><td class="n">${_eur(T.ben)}</td><td class="n">${_eur(T.bon||0)}</td><td class="n">${_eur(T.exc)}</td><td class="n">${T.nConc} · ${_eur(T.conc)}</td></tr></tbody></table>
    <div class="doc-nota">Retornos = 5 % de cada cuota cobrada · Beneficio = lo que corresponde a los asociados por cada 50 € aportado y su año de permanencia · Bonos = bonos por referido (los asume el fondo) · Excedente = retornos − beneficio − bonos (dato informativo: en la fase de crecimiento se reinvierte en ayudas) · Pendiente no incluye lo no cobrado a quien causó baja.</div>
    <h3>Libro de caja por mes</h3>
    <table class="doc-t doc-mini"><thead><tr><th>Mes</th><th class="n">Saldo inicial</th><th class="n">Entradas</th><th class="n">Salidas</th><th class="n">Saldo final</th><th class="n">Capital prestado</th><th class="n">Total fondo</th><th class="n">Excedente acum.</th></tr></thead>
    <tbody>${meses.map(m=>{const c=cajaMensual()[getMesKey(m.rm,m.ry)];return `<tr><td>${nom(m)}</td><td class="n">${_eur(c.ini)}</td><td class="n">${_eur(c.entradas)}</td><td class="n">${_eur(c.salidas)}</td><td class="n">${_eur(c.fin)}</td><td class="n">${_eur(c.cartera)}</td><td class="n">${_eur(c.fin+c.cartera)}</td><td class="n">${_eur(c.reserva)}</td></tr>`;}).join("")}</tbody></table>
    <div class="doc-nota">Saldo inicial (ago-2025): 0 €. Total fondo = caja + capital prestado; de él, aportaciones (íntegras) y beneficios acumulados son de los asociados y el resto es el excedente del fondo. Detalle de cada mes en su acta.</div></div>`;
  meses.forEach(m=>{ h+=`<div class="doc-unidad doc-nueva-pag">${docActaHTML(m.rm,m.ry)}</div>`; });
  return h;
}
function renderDocImp(){
  const {tipo,rm,ry}=DOC_IMP;
  _CAJA_CACHE=null; // se recalcula con los datos actuales en cada apertura
  document.body.classList.add("doc-abierto");
  let h=`<div class="no-print doc-barra">
      <button onclick="cerrarDocImp()">← Volver al Cierre</button>
      ${_esIphoneApp()?"":`<button class="doc-imp" onclick="imprimirDoc()">🖨️ Imprimir / guardar PDF</button>`}
      <button id="doc-pdf-btn" class="${_esIphoneApp()?"doc-imp":""}" onclick="pdfDocBoton()">📄 PDF · compartir o imprimir</button>
      <div id="doc-aviso-imp" class="doc-aviso-imp" style="display:none"></div>
    </div>
    <div class="doc-a4">${tipo==="carpeta"?docCarpetaHTML():`<div class="doc-unidad">${tipo==="acta"?docActaHTML(rm,ry):docCobroHTML(rm,ry)}</div>`}
      <div class="doc-gen">Documento generado por la app de Nuevos Horizontes · ${escH(APP_VERSION)}</div></div>`;
  document.getElementById("app").innerHTML=h;
  try{ paginarGruposSinCortes(); }catch(e){ console.warn("paginación",e); }
}
// v44.17: coloca los grupos para que ninguno quede partido entre dos páginas A4 y se
// aproveche el papel. Mide cada grupo con el ancho y la letra de impresión y los reparte
// por páginas (primero los más grandes; cada uno en la primera página donde quepa).
// Además cada grupo lleva break-inside:avoid: aunque la medida fallase, nunca se parte.
// v44.18: imprime y, si el iPhone no abre el cuadro de impresión (pasa en algunas apps
// instaladas en la pantalla de inicio), lo avisa con la alternativa en vez de no hacer nada.
function imprimirDoc(){
  let abierto=false; const f=()=>{abierto=true;};
  window.addEventListener("beforeprint",f);
  try{ window.print(); }catch(e){}
  setTimeout(()=>{
    window.removeEventListener("beforeprint",f);
    if(abierto)return;
    const el=document.getElementById("doc-aviso-imp"); if(!el)return;
    el.innerHTML="El móvil no abrió la impresión. Toca <b>«📄 PDF · compartir o imprimir»</b>: desde ahí puedes imprimirlo, guardarlo o enviarlo por WhatsApp.";
    el.style.display="block";
  },1500);
}
// v45.19: PDF del documento dentro de la app. El iPhone, con la app instalada en la pantalla de
// inicio, no deja imprimir; con el PDF se abre el menú de compartir (Imprimir, Guardar en Archivos,
// WhatsApp…). Se hace en dos toques: el 1.º prepara el PDF y el 2.º lo comparte (Safari solo deja
// compartir justo después de tocar un botón). Las librerías se cargan solo al pedir el PDF.
const _PDF_LIBS=["https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"];
function _esIphoneApp(){ return window.navigator.standalone===true; }
function _cargarScript(u){ return new Promise((ok,ko)=>{ const ya=u.includes("html2canvas")?window.html2canvas:(window.jspdf&&window.jspdf.jsPDF); if(ya)return ok();
  const s=document.createElement("script"); s.src=u; s.onload=()=>ok(); s.onerror=()=>ko(new Error("No se pudo cargar "+u)); document.head.appendChild(s); }); }
function _nombrePdf(){ const {tipo,rm,ry}=DOC_IMP||{}; const mes=rm?MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase()+"_"+ry:"";
  return "NH_"+(tipo==="cobro"?"Hoja_de_cobro_"+mes:tipo==="acta"?"Acta_de_cierre_"+mes:"Carpeta_de_actas")+".pdf"; }
function pdfDocBoton(){ if(PDF_LISTO)compartirPdf(); else crearPdfDoc(); }
function compartirPdf(){
  const {file,url,nombre}=PDF_LISTO;
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    navigator.share({files:[file],title:nombre}).then(()=>toast("Listo ✓")).catch(e=>{ if(e&&e.name==="AbortError")return; _descargarPdf(url,nombre); });
  } else _descargarPdf(url,nombre);
}
function _descargarPdf(url,nombre){ const a=document.createElement("a"); a.href=url; a.download=nombre; a.target="_blank"; document.body.appendChild(a); a.click(); a.remove(); }
// Dónde cortar las hojas dentro de un bloque ya maquetado: saltos forzados y, si no, antes de una
// fila o bloque que no quepa (nunca dentro de un grupo, una fila o un bloque «sin partir»)
function _cortesPdf(el,H){
  const t0=el.getBoundingClientRect().top, alto=el.getBoundingClientRect().height, y=e=>e.getBoundingClientRect().top-t0;
  const forz=[...el.querySelectorAll(".doc-salto,.doc-salto-antes")].map(y).filter(v=>v>2).sort((a,b)=>a-b);
  const evitar=[...el.querySelectorAll(".doc-grupo,.doc-final,.doc-arq,.doc-mini,.doc-kpis,.doc-cab,tr,.doc-lin,.doc-cols>div")].map(e=>{const r=e.getBoundingClientRect();return [r.top-t0,r.bottom-t0];});
  const libre=v=>!evitar.some(([a,b])=>v>a+0.5&&v<b-0.5);
  const cand=[...new Set([...el.querySelectorAll("tr,.doc-grupo,.doc-kpis,.doc-final,h3,h4,.doc-nota,.doc-cols,table,.doc-lin,.doc-cabgrupos,.doc-cols>div,.doc-arq,.doc-mini")].map(y).filter(v=>v>2&&libre(v)).map(v=>Math.floor(v)))].sort((a,b)=>a-b);
  const pags=[]; let ini=0;
  while(ini<alto-2){
    const lim=ini+H, f=forz.find(v=>v>ini+2&&v<=lim);
    let fin; if(f!=null)fin=f; else if(lim>=alto)fin=alto; else { const c=cand.filter(v=>v>ini+H*0.3&&v<=lim); fin=c.length?c[c.length-1]:lim; }
    pags.push([ini,fin]); ini=fin;
  }
  return {pags,alto};
}
async function crearPdfDoc(){
  const btn=document.getElementById("doc-pdf-btn"); const txt=t=>{ if(btn)btn.textContent=t; };
  if(btn)btn.disabled=true; txt("⏳ Preparando PDF…");
  try{
    for(const u of _PDF_LIBS) await _cargarScript(u);
    const unidades=[...document.querySelectorAll("#app .doc-a4 .doc-unidad")]; if(!unidades.length)throw new Error("No hay documento abierto");
    const W=Math.round(186*96/25.4), H=273*96/25.4; // ancho y alto útiles de un A4 con márgenes de 12 mm
    // Mismos estilos que al imprimir: las reglas de @media print pasan a ser normales en la copia
    let css=""; for(const sh of document.styleSheets){ let rs; try{rs=sh.cssRules;}catch(e){continue;}
      for(const r of rs){ if(r.media&&/print/.test(r.media.mediaText)&&!/screen/.test(r.media.mediaText)){ for(const x of r.cssRules) if(!/^@page/.test(x.cssText))css+=x.cssText+"\n"; } } }
    css+=".doc-barra{display:none!important}body{margin:0!important;padding:0!important;background:#fff!important}.doc-a4{width:"+W+"px!important;max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important;border-radius:0!important}.doc-nueva-pag{margin-top:0!important;border-top:none!important;padding-top:0!important}";
    const {jsPDF}=window.jspdf, pdf=new jsPDF({unit:"mm",format:"a4",compress:true}); let n=0;
    for(let k=0;k<unidades.length;k++){
      txt("⏳ Preparando PDF… "+(k+1)+"/"+unidades.length);
      const est=Math.max(unidades[k].getBoundingClientRect().height,H), sc=Math.min(2,Math.sqrt(12e6/(W*est*1.3))); // el iPhone no admite lienzos enormes
      let corte=null;
      _icFix(unidades[k]);
      const cv=await window.html2canvas(unidades[k],{scale:sc,backgroundColor:"#ffffff",logging:false,windowWidth:W,scrollX:0,scrollY:0,
        onclone:(cd,el)=>{ const st=cd.createElement("style"); st.textContent=css; cd.head.appendChild(st); corte=_cortesPdf(el,H); }});
      const f=cv.height/corte.alto;
      corte.pags.forEach(([a,b])=>{
        const c=document.createElement("canvas"); c.width=cv.width; c.height=Math.max(1,Math.round((b-a)*f));
        const g=c.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,c.width,c.height); g.drawImage(cv,0,Math.round(a*f),cv.width,c.height,0,0,cv.width,c.height);
        if(n++)pdf.addPage();
        pdf.addImage(c.toDataURL("image/jpeg",0.85),"JPEG",12,12,186,(b-a)*25.4/96);
      });
    }
    const nombre=_nombrePdf(), blob=pdf.output("blob");
    PDF_LISTO={file:new File([blob],nombre,{type:"application/pdf"}),url:URL.createObjectURL(blob),nombre};
    if(btn){btn.disabled=false; btn.className="doc-imp"; txt("📤 Compartir / imprimir PDF");}
    toast("PDF listo ("+n+(n===1?" hoja":" hojas")+"). Toca «Compartir / imprimir».",4000);
  }catch(e){
    console.warn("pdf",e); if(btn)btn.disabled=false; txt("📄 PDF · compartir o imprimir");
    toast("No se pudo preparar el PDF. Revisa la conexión a internet y vuelve a intentarlo.",5000);
  }
}
function paginarGruposSinCortes(){
  document.querySelectorAll(".doc-unidad").forEach(u=>paginarUnidad(u));
}
function paginarUnidad(u){
  // v44.17: si un documento se pasa poco de una hoja (hasta un 35 %), se compacta un poco la
  // letra para que quepa en una sola hoja y no quede una página casi vacía.
  {
    const m0=document.createElement("div"); m0.className="doc-a4 doc-medir";
    m0.style.cssText="position:absolute;left:-9999px;top:0;width:186mm;padding:0;font-size:10px;line-height:1.32;visibility:hidden";
    document.body.appendChild(m0); const c0=u.cloneNode(true); m0.appendChild(c0);
    const h0=c0.getBoundingClientRect().height; document.body.removeChild(m0);
    const P=273*96/25.4;
    if(h0>P*0.96&&h0<P*1.35)u.classList.add("doc-compacta");
  }
  const cont=u.querySelector(".doc-grupos"); if(!cont)return;
  const grupos=[...cont.querySelectorAll(":scope > .doc-grupo")]; if(grupos.length<2)return;
  const cab=cont.querySelector(":scope > .doc-cabgrupos");
  const fin=u.querySelector(".doc-final");
  const med=document.createElement("div");
  const compacta=u.classList.contains("doc-compacta");
  med.className="doc-a4 doc-medir"+(compacta?" doc-compacta":""); med.style.cssText="position:absolute;left:-9999px;top:0;width:186mm;padding:0;font-size:"+(compacta?"9px":"10px")+";line-height:1.32;visibility:hidden";
  document.body.appendChild(med);
  const alto=el=>{const c=el.cloneNode(true); med.appendChild(c); const hh=c.getBoundingClientRect().height; med.removeChild(c); return hh+10;};
  const PAG=(273*96/25.4)*0.94; // alto útil de un A4 con márgenes de 12 mm, con holgura
  const hCab=cab?alto(cab):0, hFin=fin?alto(fin):0;
  // Lo que ya ocupa la unidad antes de los grupos (resumen): se aprovecha el hueco de esa página.
  // Se mide la unidad completa tal cual (con márgenes reales) para saber dónde empiezan los grupos.
  const cu=u.cloneNode(true); med.appendChild(cu);
  const cc=cu.querySelector(".doc-grupos");
  const antes=cc?cc.getBoundingClientRect().top-cu.getBoundingClientRect().top:0;
  med.removeChild(cu);
  const PAG1=(273*96/25.4)*0.9; // la primera página se calcula con más holgura
  const usadoPrimera=antes>0?(antes%PAG1)+(PAG-PAG1):0;
  const items=grupos.map((g,i)=>({g,i,h:alto(g)})).sort((a,b)=>b.h-a.h);
  const pags=[{libre:PAG-usadoPrimera-hCab,items:[]}]; // página 0 = la del resumen (hueco restante)
  items.forEach(it=>{
    let p=pags.find(p=>p.libre>=it.h);
    if(!p){p={libre:PAG,items:[]};pags.push(p);}
    p.items.push(it); p.libre-=it.h;
  });
  if(!pags[0].items.length){ pags.shift(); if(pags.length)pags[0].libre-=hCab; }
  document.body.removeChild(med);
  pags.forEach(p=>p.items.sort((a,b)=>a.i-b.i)); // dentro de cada página, el orden de siempre
  const frag=document.createDocumentFragment();
  if(cab)frag.appendChild(cab);
  // Sin saltos forzados: el orden calculado llena cada hoja y, como ningún grupo ni el bloque
  // final se pueden partir, el navegador pasa a la hoja siguiente solo lo que no cabe.
  pags.forEach(p=>p.items.forEach(it=>frag.appendChild(it.g)));
  cont.innerHTML=""; cont.appendChild(frag);
}
