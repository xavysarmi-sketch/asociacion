// Nuevos Horizontes · general.js
// Pantalla principal: render, pestañas, tarjetas, modales, compartir, auto-chequeo y Gestión
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).
function toast(msg,dur=2500){const t=document.getElementById("toast");t.textContent=msg;t.classList.remove("hidden");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.add("hidden"),dur);}
async function copyText(text,btnId){
  let ok=false;
  if(navigator.clipboard&&navigator.clipboard.writeText){try{await navigator.clipboard.writeText(text);ok=true;}catch{}}
  if(!ok){try{const ta=document.createElement("textarea");ta.value=text;ta.style.cssText="position:fixed;left:-9999px;top:0";document.body.appendChild(ta);ta.focus();ta.select();document.execCommand("copy");document.body.removeChild(ta);ok=true;}catch{}}
  if(btnId){const btn=document.getElementById(btnId);if(btn){btn.textContent="✅ ¡Copiado!";btn.classList.add("copied");clearTimeout(_copyRenderTimer);_copyRenderTimer=setTimeout(()=>render(),1800);}}
  toast(ok?"📋 Copiado — pega en WhatsApp ✓":"Error al copiar");
}

function openWA(text){
  window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank");
}
async function shareT(text){
  if(navigator.share){try{await navigator.share({text});toast("Compartido ✓");return;}catch(e){if(e.name==="AbortError")return;}}
  openWA(text);
}

// FIX IPHONE: html2canvas y jsPDF se cargan LAZY aquí, solo cuando se necesitan
async function loadPDFLibs(){
  if(window.html2canvas&&window.jspdf)return true;
  return new Promise((resolve)=>{
    const s1=document.createElement("script");
    s1.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s1.onload=()=>{
      const s2=document.createElement("script");
      s2.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s2.onload=()=>resolve(true);
      s2.onerror=()=>resolve(false);
      document.head.appendChild(s2);
    };
    s1.onerror=()=>resolve(false);
    document.head.appendChild(s1);
  });
}

async function sharePDF(){
  if(BUSY)return;
  BUSY=true;render();
  toast("⏳ Cargando librerías PDF...",4000);

  const loaded=await loadPDFLibs();
  if(!loaded){toast("Error al cargar PDF. Comprueba tu conexión.");BUSY=false;render();return;}

  toast("📄 Generando PDF...",4000);
  try{
    const el=document.getElementById("capture");
    _icFix(el);
    const canvas=await html2canvas(el,{backgroundColor:"#F5F0EB",scale:2,useCORS:true,logging:false});
    const{jsPDF}=window.jspdf;
    const imgData=canvas.toDataURL("image/jpeg",.92);
    const pW=100,pH=170,ratio=pW/canvas.width,totalH=canvas.height*ratio,pages=Math.ceil(totalH/pH);
    const pdf=new jsPDF({unit:"mm",format:[pW,pH]});
    for(let i=0;i<pages;i++){if(i>0)pdf.addPage([pW,pH]);pdf.addImage(imgData,"JPEG",0,-i*pH,pW,totalH);}
    const blob=pdf.output("blob");
    const file=new File([blob],`Reporte_${DATA.reportMonth}_${DATA.reportYear}.pdf`,{type:"application/pdf"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:"Reporte NH"});toast("Compartido ✓");BUSY=false;render();return;}catch(e){if(e.name==="AbortError"){BUSY=false;render();return;}}
    }
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();URL.revokeObjectURL(url);toast("PDF descargado ✓");
  }catch(err){console.error(err);toast("Error al generar PDF");}
  BUSY=false;render();
}

function fullText(){
  const{reportMonth:rm,reportYear:ry,members}=DATA;
  const a=members.filter(m=>m.type==="asociado"&&activoEnReporte(m)),t=members.filter(m=>m.type==="tercero");
  let sA=0,sT=0;
  let tx=`━━━━━━━━━━━━━━━━━━━━\n📋 *NUEVOS HORIZONTES*\nResumen ${rm} ${ry}\n━━━━━━━━━━━━━━━━━━━━\n\n*👥 ASOCIADOS*\n\n`;
  a.forEach(m=>{const d=due(m,rm,ry);if(d>0){tx+=`• ${m.name}: *${fmtEur(d)} €*\n`;sA+=d;}});
  tx+=`\n*🤝 TERCEROS*\n\n`;
  t.forEach(m=>{const d=due(m,rm,ry);if(d>0){tx+=`• ${m.name}: *${fmtEur(d)} €*\n`;sT+=d;}});
  sA=Math.round(sA*100)/100; sT=Math.round(sT*100)/100;
  tx+=`\n━━━━━━━━━━━━━━━━━━━━\n💰 *TOTAL ${rm.toUpperCase()} ${ry}*\n   Asociados: ${fmtEur(sA)} €\n   Terceros: ${fmtEur(sT)} €\n   *TOTAL: ${fmtEur(sA+sT)} €*\n━━━━━━━━━━━━━━━━━━━━`;
  return tx;
}

function sendFilteredMembers(){
  const{reportMonth:rm,reportYear:ry}=DATA;
  return DATA.members.filter(m=>{
    const hasAnyPending=m.loans.some(l=>l.pays.some(p=>!p.paid));
    if(!hasAnyPending)return false;
    if(SEND_FILTER!=="all"&&m.type!==SEND_FILTER)return false;
    if(SEND_SEARCH&&!m.name.toLowerCase().includes(SEND_SEARCH.toLowerCase()))return false;
    return true;
  });
}

function toggleSendSelect(mid){if(SEND_SELECTED.has(mid))SEND_SELECTED.delete(mid);else SEND_SELECTED.add(mid);render();}
function toggleSel(mid){toggleSendSelect(mid);}
function selectAll(){(SEND_FILTER==="tercero"?DATA.members.filter(m=>m.type==="tercero"&&m.loans.some(l=>l.pays.some(p=>!p.paid))):SEND_FILTER==="asociado"?DATA.members.filter(m=>m.type==="asociado"&&m.joinMonth&&activoEnReporte(m)):DATA.members.filter(m=>m.joinMonth||m.loans.some(l=>l.pays.some(p=>!p.paid)))).forEach(m=>SEND_SELECTED.add(m.id));render();}
function selectNone(){SEND_SELECTED.clear();render();}

async function copyBatch(){
  const members=DATA.members.filter(m=>SEND_SELECTED.has(m.id));
  if(!members.length)return;
  const combined=members.map(m=>mText(m)).join("\n\n"+"═".repeat(20)+"\n\n");
  await copyText(combined,null);
}

function startWAQueue(){
  const allVisible=DATA.members;
  const ids=[...SEND_SELECTED].filter(id=>allVisible.some(m=>m.id===id));
  if(!ids.length){toast("Selecciona al menos un asociado");return;}
  WA_QUEUE=ids;
  WA_IDX=0;
  MODAL={type:"wa_queue"};
  render();
}
function waQueueNext(){
  if(WA_IDX>=WA_QUEUE.length){
    SEND_SELECTED.clear();WA_QUEUE=[];WA_IDX=0;MODAL=null;render();
    toast("✅ Todos los mensajes enviados");return;
  }
  const m=DATA.members.find(x=>x.id===WA_QUEUE[WA_IDX]);
  if(!m){WA_IDX++;waQueueNext();return;}
  const text=mText(m);
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).catch(()=>{});}
  openWA(text);
  WA_IDX++;
  render();
}
function waQueueSkip(){
  WA_IDX++;
  if(WA_IDX>=WA_QUEUE.length){
    SEND_SELECTED.clear();WA_QUEUE=[];WA_IDX=0;MODAL=null;render();toast("Envíos completados");return;
  }
  render();
}
function waQueueCancel(){WA_QUEUE=[];WA_IDX=0;MODAL=null;render();}
function waQueueModalHTML(){
  const done=WA_IDX,total=WA_QUEUE.length,remaining=total-done;
  if(done>=total){
    return`<div class="modal-title">✅ Envíos completados</div>
<p style="font-size:15px;color:var(--muted);text-align:center;padding:12px 0">Se han procesado ${total} mensaje${total>1?"s":""}.</p>
<button class="m-primary" onclick="waQueueCancel()">Cerrar</button>`;
  }
  const m=DATA.members.find(x=>x.id===WA_QUEUE[done]);
  const name=m?escH(m.name):"(desconocido)";
  const firstName=m?escH(m.name.split(" ")[0]):"";
  const isTerc=m&&m.type==="tercero";
  return`<div class="modal-title" style="font-size:17px">📤 Envío por WhatsApp</div>
<div style="background:linear-gradient(135deg,#1a472a,#25855a);border-radius:14px;padding:14px;margin-bottom:16px;text-align:center">
  <div style="font-size:12px;color:rgba(255,255,255,.7);font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Enviando ${done+1} de ${total}</div>
  <div style="font-size:20px;font-weight:800;color:#fff">${name}</div>
  ${isTerc?`<div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px">🤝 Ref: ${escH(avalistaNombre(m)||"—")}</div>`:""}
  <div style="background:rgba(255,255,255,.15);border-radius:20px;margin:10px auto 0;height:6px;max-width:200px;overflow:hidden">
    <div style="background:#fff;height:100%;width:${Math.round((done/total)*100)}%;border-radius:20px;transition:width .3s"></div>
  </div>
</div>
<p style="font-size:13px;color:var(--muted);text-align:center;margin-bottom:16px;line-height:1.5">
  Se abrirá WhatsApp con el mensaje listo.<br>
  <b style="color:var(--dark)">Selecciona el contacto y envía.</b><br>
  Luego vuelve aquí y pulsa <b>Siguiente ▶</b>
</p>
<button class="m-primary" style="margin-bottom:10px" onclick="waQueueNext()">
  ${done===0?"📲 Abrir WhatsApp — "+firstName:"▶ Siguiente — "+firstName}
</button>
${done>0?`<button style="width:100%;padding:14px;border:none;border-radius:14px;background:#F5F5F5;color:#777;font-size:14px;font-weight:600;margin-bottom:8px" onclick="waQueueSkip()">⏭ Saltar este</button>`:""}
<button style="width:100%;padding:12px;border:2px solid #ddd;border-radius:14px;background:transparent;color:#999;font-size:13px;font-weight:600" onclick="waQueueCancel()">✕ Cancelar</button>
${remaining>1?`<div style="text-align:center;font-size:12px;color:var(--muted);margin-top:10px">Quedan ${remaining} mensaje${remaining>1?"s":""} después de este</div>`:""}`;
}

function openPreview(mid){previewMiembro(mid);}
function setReportMonth(val){DATA.reportMonth=val;save();}
function setReportYear(val){DATA.reportYear=parseInt(val);save();}
function openModal(type,extra){MODAL={type,...extra};render();}
function closeModal(){MODAL=null;render();}

// FIX IPHONE: shareImg también carga html2canvas lazy
async function shareImg(mid){
  const loaded=await loadPDFLibs();
  if(!loaded||typeof html2canvas==="undefined"){toast("⏳ Error al cargar. Inténtalo de nuevo.");return;}
  const el=document.getElementById("card-capture-"+mid);
  if(!el){toast("Error: ficha no encontrada");return;}
  const clone=el.cloneNode(true);
  clone.style.cssText="position:fixed;left:-9999px;top:0;width:380px;background:#F5F0EB;padding:12px;";
  clone.querySelectorAll("*").forEach(n=>{n.style.overflow="visible";n.style.maxHeight="none";});
  document.body.appendChild(clone);
  _icFix(clone);
  toast("📸 Generando imagen...",4000);
  try{
    const canvas=await html2canvas(clone,{backgroundColor:"#F5F0EB",scale:2.5,useCORS:true,logging:false,width:380,windowWidth:400});
    // FIX IPHONE: eliminar clone inmediatamente tras captura, antes de procesar blob
    if(document.body.contains(clone))document.body.removeChild(clone);
    canvas.toBlob(async(blob)=>{
      if(!blob){toast("Error al generar imagen");return;}
      const file=new File([blob],`Reporte_${DATA.reportMonth}_${DATA.reportYear}.png`,{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file],title:"Reporte Nuevos Horizontes"});toast("📸 Imagen enviada ✓");}
        catch(e){if(e.name!=="AbortError"){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();URL.revokeObjectURL(url);toast("📸 Imagen descargada ✓");}}
      }else{const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();URL.revokeObjectURL(url);toast("📸 Imagen descargada ✓");}
    },"image/png");
  }catch(e){
    if(document.body.contains(clone))document.body.removeChild(clone);
    console.error(e);toast("Error al generar imagen: "+e.message);
  }
}
function setSearch(val){
  SEND_SEARCH=val;
  // Filtrar mostrando/ocultando tarjetas por CSS, SIN render() (así no se cierra el teclado)
  const t=(val||"").trim().toLowerCase();
  document.querySelectorAll('.send-card[data-envio-nombre]').forEach(card=>{
    const nom=card.getAttribute('data-envio-nombre')||"";
    card.style.display = (!t || nom.indexOf(t)>=0) ? "" : "none";
  });
}

function filtrarEnVivo(texto, scopeSelector){
  const q=(texto||"").toLowerCase().trim();
  const scope=document.querySelector(scopeSelector)||document;
  scope.querySelectorAll("[data-nombre]").forEach(el=>{
    const n=(el.getAttribute("data-nombre")||"").toLowerCase();
    el.style.display=(!q||n.includes(q))?"":"none";
  });
}

// v45.46: mientras se pinta una pantalla los datos no cambian (el render no escribe), así que lo que
// se calcula muchas veces (las cuotas del mes) se guarda solo durante ese pintado.
let _MEMO_RENDER=null;
function render(){ _MEMO_RENDER={}; try{ _renderPantalla(); } finally { _MEMO_RENDER=null; } }
function _renderPantalla(){
  // v45.39: el nuevo orden y la letra más grande son solo para la app del administrador
  // (los enlaces de los asociados, «Así lo ve» y los papeles del mes se ven como siempre)
  document.body.classList.toggle("nh-admin",!READONLY_ID&&!VISTA_ASOC&&!ES_MODO_GRUPO&&!DOC_IMP);
  document.body.classList.toggle("nh-grande",!READONLY_ID&&!VISTA_ASOC&&!ES_MODO_GRUPO&&!DOC_IMP&&textoGrandeActivo());
  if(READONLY_ID){renderReadonly();return;}
  if(VISTA_ASOC){if(DATA.members.some(x=>x.id===VISTA_ASOC.mid)){renderVistaAsoc();return;}VISTA_ASOC=null;}
  if(ES_MODO_GRUPO){renderGrupo();return;}
  if(DOC_IMP){renderDocImp();return;} // v44.17: documento del mes para imprimir
  const{reportMonth:rm,reportYear:ry,monthlyFee:fee}=DATA;
  const asoc=DATA.members.filter(m=>m.type==="asociado");
  const terc=DATA.members.filter(m=>m.type==="tercero");
  const tA=asoc.reduce((s,m)=>s+due(m,rm,ry),0);
  const tT=terc.reduce((s,m)=>s+due(m,rm,ry),0);
  const mOpts=MONTHS.map(mo=>`<option value="${mo}"${mo===rm?" selected":""}>${mo}</option>`).join("");
  const yOpts=YEARS.map(y=>`<option value="${y}"${y===ry?" selected":""}>${y}</option>`).join("");

  let h=`<div class="header">
    <div class="h-title">NUEVOS HORIZONTES</div>
    <div class="h-date-row">
      <span style="color:rgba(255,255,255,.75);font-size:13px;font-weight:600">📅 Mes de trabajo</span>
      <select class="h-date-sel" onchange="setReportMonth(this.value)" title="Cambiar mes">${mOpts}</select>
      <span style="color:rgba(255,255,255,.5);font-weight:700">·</span>
      <select class="h-date-sel" onchange="setReportYear(this.value)" title="Cambiar año">${yOpts}</select>
    </div>
    <div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,.6)"><span class="sync-indicator">${syncHTML()}</span> <span class="h-version">· ${APP_VERSION}</span></div><!-- v45.39: la versión va en la cabecera (abajo está la barra) -->
  </div>`; // v45.39: la auditoría se ve en Inicio («Cómo va el mes»)

  if(TAB==="send")TAB="asociados"; // v45.22: la pestaña Envíos se quitó (los enlaces se actualizan solos; enlace y bienvenida están en la ficha)
  // v45.39: las pestañas de arriba pasan a la barra de abajo (navInferiorHTML, js/inicio.js)
  h+=`<div class="content">`;

  // ── INICIO (v45.39) ──
  if(TAB==="inicio")h+=inicioHTML();
  // ── AYUDAS (v45.39): dinero disponible, solicitudes y cartera ──
  if(TAB==="ayudas")h+=ayudasPantallaHTML();

  // ── PESTAÑA MES ──
  if(TAB==="mes"){
    // v44.2: el render ya NO escribe el recargo del mes activo (antes, recalcMesRecargo()
    // lo sobrescribía en silencio en cada render, anulando el banner de reconciliación
    // para ese mes — así cambió el recargo de julio de 565 a 615 sin que Ángel lo supiera).
    // El render solo CALCULA (recAuto) y COMPARA; guardar es siempre una acción explícita
    // (togglePay/toggleAporte/toggleCuotaCierre, o el botón "Reconciliar" del banner).
    // Única excepción legítima: un mes que nunca se ha tocado (monthlyData no lo tenía
    // todavía) se inicializa con el automático — eso no sobrescribe nada existente.
    const _mesYaExistia=!!(DATA.monthlyData&&DATA.monthlyData[getMesKey(rm,ry)]);
    const md=getMesData(rm,ry);
    if(!_mesYaExistia&&!md.recargoManual)md.recargo=recargoAutoMes(rm,ry);
    const recAuto=recargoAutoMes(rm,ry);
    const asocMesTodos=DATA.members.filter(m=>m.type==="asociado"&&m.joinMonth&&activoEnReporte(m));
    const asocMes=asocMesTodos.filter(m=>!enPausaMes(m,rm,ry)), asocPausa=asocMesTodos.filter(m=>enPausaMes(m,rm,ry)); // v45.33
    const ri2=MONTHS.indexOf(rm);
    const conDerecho=asocMes.filter(m=>{const ji=MONTHS.indexOf(m.joinMonth),jy=m.joinYear;return(jy<ry)||(jy===ry&&ji<ri2);});
    // v44.13: beneficio por nivel de cada asociado (Documento Maestro), no un tope igual para todos
    const _rep=repartoBeneficioMes(md.recargo,rm,ry);
    // v44.13: contar SOLO a los asociados de la lista (activos). Antes contaba todas las marcas
    // guardadas del mes, incluidas las de fichas borradas o dadas de baja → "31/30".
    const aptPagados=asocMes.filter(m=>!!(md.aportes&&md.aportes[m.id])).length;

    h+=bannerRecargoHTML();
    // v45.39: los avisos de permanencias y las salidas previstas están en Inicio

    // Modo enfoque: si hay un bloque abierto, solo se ve ese
    // v45.42: un grupo abierto (desde su tarjeta) se ve solo, a pantalla completa
    const _grDet=gruposCierre().find(g=>!!DESP["grupo-"+g.id])||null;
    const apAbierto=!_grDet&&!!DESP["cierre-aportes"];
    const cuAbierto=!_grDet&&!!DESP["cierre-cuotas"];
    const grAbierto=!!_grDet;
    const hayAbierto=apAbierto||cuAbierto||grAbierto;

    // ── CABECERA: título + cuánto se lleva cobrado + buscador ── (v45.42: los papeles del mes van abajo)
    const idxMes=MONTHS.indexOf(rm);
    const _dmMes=grAbierto?null:dineroAyudasMes(); // v45.46: una sola vez por pantalla
    if(!grAbierto){
      const _dm=_dmMes, _cobM=_r2(_dm.previsto-_dm.porCobrar), _pctM=_dm.previsto>0?Math.round(_cobM/_dm.previsto*100):100;
      h+=`<div class="mes-card">
      <div class="mes-title" style="margin-bottom:4px">💶 Cobros de ${MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase()} ${ry}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px">Para ver otro mes, cámbialo arriba (📅 Mes de trabajo).</div>
      ${_dm.previsto>0?`<div class="cgt-cifras" style="font-size:15px">Cobrado <b>${fmtEur(_cobM)} €</b> de ${fmtEur(_dm.previsto)} €${_dm.porCobrar>0?` · faltan <b style="color:var(--warm)">${fmtEur(_dm.porCobrar)} €</b>`:" · ✅ todo"}</div>
      <div class="reserva-bar-bg" style="margin:6px 0 12px"><div class="reserva-bar-fill" style="width:${_pctM}%"></div></div>`:""}
      ${mesCerrado(getMesKey(rm,ry))?`<div style="margin:0 0 10px;padding:9px 11px;border-radius:10px;background:#1B4332;color:#fff;font-size:14px;font-weight:800">🔒 Este mes está cerrado: no se puede marcar ni desmarcar nada. Para cambiarlo, reábrelo abajo.</div>`:""}
      <input id="cierre-search" type="text" placeholder="Buscar persona…" oninput="filtrarEnVivo(this.value,'#cierre-listas')"
        style="width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:15px;box-sizing:border-box">
    </div>`;
    }

    // Contenedor de listas filtrables en vivo
    h+=`<div id="cierre-listas">`;
    // v45.42: primero los grupos (casi todo se cobra a través de ellos); debajo, «Por persona»
    if(!hayAbierto){
      h+=cobrosGruposHTML();
      const _dmR=_dmMes.resto;
      h+=`<div class="mes-title" style="margin:18px 2px 8px">👤 Por persona</div>`;
      if(_dmR.total>0)h+=`<div class="ini-sin" style="margin:-4px 2px 8px">Sin grupo: ${fmtEur(_dmR.cobrado)} € cobrados de ${fmtEur(_dmR.total)} €. Se marcan aquí abajo.</div>`;
    }

    // KPIs (se muestran AL FINAL)
    const _bonM=bonosReferidoMes(rm,ry), _excN=Math.round((_rep.excedente-_bonM)*100)/100; // v44.19
    // v45.22: «💰 Las cuentas del mes» — antes 4 recuadros; ahora una cuenta que se lee de arriba abajo
    const kpiHTML=`<div class="mes-card">
      <div class="mes-title" style="margin-bottom:10px">💰 Las cuentas del mes</div>
      <div id="mes-cuentas">${cuentasMesHTML(md,rm,ry)}</div>
      ${md.recargoManual
        ?`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;margin-top:10px"><span style="color:var(--warm)">✏️ Retorno corregido a mano (calculado: ${fmtEur(recAuto)} €)</span><button onclick="recalcRecargoForzar()" style="background:none;border:none;color:#2D6A4F;font-size:12px;font-weight:700;cursor:pointer;padding:2px 4px">↻ Volver al calculado</button></div>`
        :`<button onclick="DESP['ret-edit']=!DESP['ret-edit'];render()" style="background:none;border:none;color:var(--muted);font-size:12px;text-decoration:underline;cursor:pointer;padding:8px 0 0">${DESP["ret-edit"]?"Ocultar":"✏️ Corregir el retorno a mano"}</button>`}
      ${(md.recargoManual||DESP["ret-edit"])?`<div style="display:flex;align-items:center;gap:10px;margin-top:8px">
        <label style="font-size:13px;font-weight:600;color:var(--muted);flex:1">Retorno cobrado este mes (€)</label>
        <input type="number" value="${md.recargo}" style="width:90px;padding:8px;border:2px solid ${md.recargoManual?'var(--warm)':'var(--border)'};border-radius:10px;font-size:15px;font-weight:700;text-align:right" oninput="setMesRecargo(this.value)">
      </div>`:""}
    </div>`;

    // Lista de aportes por asociado (DESPLEGABLE)
    if(!hayAbierto||apAbierto){
    h+=`<div class="mes-card" style="padding-bottom:${apAbierto?'18px':'8px'}">
      <button onclick="DESP['cierre-aportes']=!DESP['cierre-aportes'];render()" style="width:100%;background:none;border:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:0;text-align:left">
        <span class="mes-title" style="margin:0">✅ Aportes del mes — ${aptPagados}/${asocMes.length}</span>
        <span class="ft-drop-chevron" style="${apAbierto?'transform:rotate(90deg)':''}">›</span>
      </button>`;
    if(apAbierto){
      h+=`<div style="margin-top:14px">`;
      // Barra de progreso
      const pct=asocMes.length>0?Math.round(aptPagados/asocMes.length*100):0;
      h+=`<div class="reserva-bar-bg"><div class="reserva-bar-fill" style="width:${pct}%"></div></div>
        <div style="text-align:right;font-size:12px;color:var(--muted);margin-bottom:12px">${pct}% cobrado</div>`;
      // Botones de acción rápida
      h+=`<div style="display:flex;gap:8px;margin-bottom:14px">
        <button onclick="marcarTodosAportes()" style="flex:2;padding:11px;border:none;border-radius:10px;background:#2D6A4F;color:#fff;font-size:14px;font-weight:700;cursor:pointer">✅ Marcar todos pagados</button>
        <button onclick="desmarcarToque()" style="flex:1;padding:11px;border:1.5px solid ${DESP['ap-desm']?"#C0492C":"#D9C9B0"};border-radius:10px;background:${DESP['ap-desm']?"#C0492C":"#fff"};color:${DESP['ap-desm']?"#fff":"#8A7A60"};font-size:13px;font-weight:700;cursor:pointer">${DESP['ap-desm']?"¿Desmarcar todo? Toca otra vez":"Desmarcar todo"}</button><!-- v45.43: dos toques -->
      </div>
      <div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:12px">Luego desmarca abajo a quien no haya pagado</div>`;
      // Orden FIJO por ingreso
      const ingKey=m=>{const mi=MONTHS.indexOf(m.joinMonth);return (m.joinYear||9999)*100+(mi>=0?mi:99);};
      const aporteSorted=[...asocMes].sort((a,b)=>ingKey(a)-ingKey(b)||a.name.localeCompare(b.name));
      aporteSorted.forEach(m=>{
        const paid=!!(md.aportes&&md.aportes[m.id]);
        const months=memberMonths(m);
        const lv=memberLevel(m);
        const _dRef=descuentoReferidoMes(m.id,rm,ry).descuento;
        h+=`<div class="aporte-row" data-nombre="${escH(m.name)}">
          <div>
            <div class="aporte-name">${escH(m.name)}</div>
            <div class="aporte-meta">Mes ${months} · <span class="nivel-badge">Año ${lv}</span>${_dRef>0?` · <span style="color:#8A6D1E">🎁 −${_dRef} € bono</span>`:""}</div>
          </div>
          <div class="aporte-toggle">
            <span class="aporte-amt ${paid?"ap-ok":""}">${selectorAporteHTML(m,getMesKey(rm,ry),false)}</span>
            <button class="toggle-btn ${paid?"on":"off"}" onclick="toggleAporte('${esc(m.id)}')"></button>
          </div>
        </div>`;
      });
      asocPausa.forEach(m=>{ const p=pausasDe(m).find(x=>enPausaIdx(m,_idxMes(rm,ry))&&x.desde<=_idxMes(rm,ry)&&_idxMes(rm,ry)<x.desde+x.meses); // v45.33
        h+=`<div class="aporte-row" data-nombre="${escH(m.name)}" style="opacity:.85">
          <div><div class="aporte-name">${escH(m.name)}</div><div class="aporte-meta">⏸ En pausa · vuelve a aportar en ${p?_txtIdx(p.desde+p.meses):"—"}</div></div>
          <div style="font-size:12.5px;font-weight:800;color:#6B5310;background:#FFF4D6;border-radius:20px;padding:4px 10px">Sin aporte</div></div>`; });
      h+=`</div>`;
    }
    h+=`</div>`;
    } // fin modo enfoque aportes

    // ── BLOQUE: CUOTAS COBRADAS (DESPLEGABLE) ──
    const cuotas=cuotasDelMes(rm,ry);
    const cuotasPagadas=cuotas.filter(c=>c.paid).length;
    const totalCuotasCobr=Math.round(cuotas.filter(c=>c.paid).reduce((s,c)=>s+c.inst,0)*100)/100;
    if(!hayAbierto||cuAbierto){
    h+=`<div class="mes-card" style="padding-bottom:${cuAbierto?'18px':'8px'}">
      <button onclick="DESP['cierre-cuotas']=!DESP['cierre-cuotas'];render()" style="width:100%;background:none;border:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:0;text-align:left">
        <span class="mes-title" style="margin:0">💵 Cuotas del mes — ${cuotasPagadas}/${cuotas.length}</span>
        <span class="ft-drop-chevron" style="${cuAbierto?'transform:rotate(90deg)':''}">›</span>
      </button>`;
    if(cuAbierto){
      h+=`<div style="margin-top:14px">`;
      if(cuotas.length===0){
        h+=`<div style="text-align:center;color:var(--muted);font-size:14px;padding:14px 0">No hay cuotas que venzan este mes.</div>`;
      } else {
        h+=`<div style="font-size:12px;color:var(--muted);margin-bottom:10px">Marca las cuotas que se cobran en la reunión. El retorno se actualiza solo.</div>`;
        // Agrupar por persona, manteniendo separación asociados/terceros
        const orden=[];
        const porPersona={};
        cuotas.forEach(c=>{ if(!porPersona[c.mid]){porPersona[c.mid]=[];orden.push(c.mid);} porPersona[c.mid].push(c); });
        let tipoActual="";
        let _cuotaIdx=0;
        orden.forEach(pid=>{
          const lista=porPersona[pid];
          const tipo=lista[0].tipo;
          if(tipo!==tipoActual){
            tipoActual=tipo;
            h+=`<div style="font-size:12px;font-weight:700;color:${tipo==="asociado"?"var(--dark)":"var(--terc)"};margin:12px 0 6px">${tipo==="asociado"?"🏠 Asociados":"🤝 Terceros"}</div>`;
          }
          const subtotal=Math.round(lista.reduce((s,x)=>s+x.inst,0)*100)/100;
          h+=`<div data-nombre="${escH(lista[0].nombre)}" style="border-bottom:1px solid var(--border);padding:8px 0 6px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div class="aporte-name" style="font-size:16px">${escH(lista[0].nombre)}</div>
              <span style="font-size:13px;color:var(--muted)">${fmtEur(subtotal)} €</span>
            </div>`;
          lista.forEach(c=>{
            _cuotaIdx++;
            h+=`<div style="display:flex;align-items:flex-start;gap:8px;justify-content:space-between;padding:4px 0 4px 10px">
              <span class="cuota-num">${_cuotaIdx}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;color:var(--muted)">Ayuda ${escH(c.gMonth)} ${c.gYear} · ${c.numCuota>=c.totalCuotas&&c.totalCuotas>1?`<span class="ult-chip">🏁 Última cuota</span>`:c.totalCuotas<=1?"cuota única":`cuota ${c.numCuota}/${c.totalCuotas}`}</div>
                ${c.aplazada?`<span class="asoc-badge badge-deuda" style="display:inline-block;margin-top:4px">cuota aplazada</span>`:""}
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <span class="aporte-amt" style="color:${c.paid?"#2D6A4F":"var(--warm)"};font-size:14px">${fmtEur(c.inst)} €</span>
                <button class="toggle-btn ${c.paid?"on":"off"}" onclick="toggleCuotaCierre('${esc(c.mid)}','${esc(c.lid)}',${c.pi})"></button>
              </div>
            </div>`;
          });
          h+=`</div>`;
        });
        h+=`<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--dark);border-top:2px solid var(--border);margin-top:10px;padding-top:10px">
          <span>Total cobrado este mes <span style="font-weight:400;color:var(--muted);font-size:12px">(${cuotas.length} ${cuotas.length===1?"cuota":"cuotas"})</span></span><span>${fmtEur(totalCuotasCobr)} €</span>
        </div>`;
      }
      { const nP=(DATA.solicitudes||[]).filter(x=>x.estado==="pendiente").length; // v45.16: las ayudas nuevas se otorgan en Solicitudes
        h+=`<button class="mgmt-btn primary" style="width:100%;margin-top:14px" onclick="irSolicitudes()">📝 Solicitudes de ayuda${nP?` (${nP} pendiente${nP>1?"s":""})`:""}</button>`; }
      h+=`</div>`;
    }
    h+=`</div>`;
    } // fin modo enfoque cuotas

    // ── BLOQUE: CIERRE GRUPAL ── v45.42: aquí solo se ve el grupo abierto desde su tarjeta
    const grupos=gruposCierre();
    if(grAbierto){
    h+=`<button class="btn-back" style="margin:6px 0 10px;width:auto" onclick="DESP['grupo-${_grDet.id}']=false;CG_FORM=null;render();window.scrollTo(0,0)">← Todos los grupos</button>`;
    h+=`<div class="mes-card" style="padding-bottom:18px">`;
    {
      h+=`<div>`;
      const grupoAbierto=_grDet; // v45.42: crear grupo está debajo de las tarjetas (crearGrupoHTML)
      // Cada grupo, plegable (si hay uno abierto, solo se muestra ese)
      grupos.forEach(g=>{
        if(grupoAbierto&&g.id!==grupoAbierto.id)return;
        const principal=DATA.members.find(m=>m.id===g.principalId);
        if(!principal)return;
        const items=itemsDeGrupo(g);
        const pendientes=items.filter(it=>!it.yaPagado);
        const totalPend=Math.round(pendientes.reduce((s,it)=>s+it.importe,0)*100)/100;
        const totalPagado=Math.round(items.filter(it=>it.yaPagado).reduce((s,it)=>s+it.importe,0)*100)/100;
        const gKey="grupo-"+g.id;
        const gOpen=!!DESP[gKey];
        h+=`<div style="border:1.5px solid var(--border);border-radius:14px;padding:12px;margin-bottom:12px;background:#fff">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <button onclick="DESP['${gKey}']=!DESP['${gKey}'];render()" style="flex:1;background:none;border:none;text-align:left;cursor:pointer;padding:0">
              <div style="font-size:16px;font-weight:800;color:var(--dark)">${escH(principal.name)}${_cgCerrada(g)?' <span style="font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:20px;background:#E3F1E7;color:#1B7A3D;white-space:nowrap;vertical-align:middle">✅ Liquidado</span>':""}</div>
              <div style="font-size:12px;color:var(--muted)">${(()=>{const d=_cgTarjetaDatos(g,cuotasDelMes(rm,ry),getMesKey(rm,ry));return `${items.length} ${items.length===1?"cobro":"cobros"} · ${d.falta>0?"faltan "+fmtEur(d.falta)+" €":"nada pendiente"}`;})()}</div><!-- v45.42: la misma cuenta que su tarjeta -->
            </button>
            <span class="ft-drop-chevron" style="width:28px;height:28px;font-size:24px;${gOpen?'transform:rotate(90deg)':''}" onclick="DESP['${gKey}']=!DESP['${gKey}'];render()">›</span>
          </div>`;
        if(gOpen){
          h+=cuentaGrupoHTML(g,principal); // v45.13 · v45.42: la cuenta con el responsable va arriba (es lo que más se mira)
          h+=cuentasAnterioresHTML(g); // v45.47: historial de cuentas de meses anteriores
          h+=`<div style="margin-top:10px">`;
          // Agrupar items por persona (mid), preservando orden de aparición
          const orden=[];
          const porPersona={};
          items.forEach(it=>{ if(!porPersona[it.mid]){porPersona[it.mid]=[];orden.push(it.mid);} porPersona[it.mid].push(it); });
          let _cuotaIdxGrupo=0;
          orden.forEach(pid=>{
            const lista=porPersona[pid];
            const esPrincipal=(pid===g.principalId);
            const nombre=lista[0].nombre;
            const subtotal=Math.round(lista.reduce((s,x)=>s+x.importe,0)*100)/100;
            h+=`<div style="border-bottom:1px solid var(--border);padding:10px 0 8px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <div class="aporte-name" style="font-size:16px">${escH(nombre)}${esPrincipal?' <span style="font-size:12px;color:var(--muted);font-weight:700">(responsable)</span>':''}</div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:13px;color:var(--muted)">${fmtEur(subtotal)} €</span>
                  ${!esPrincipal?(()=>{const kq="qm-"+g.id+"-"+pid, aq=!!DESP[kq]; return `<button class="qm-btn${aq?" arm":""}" onclick="quitarToque('${g.id}','${esc(pid)}')" title="Quitar del grupo">${aq?"¿Quitar?":"✕"}</button>`;})():""}<!-- v45.43: dos toques y más grande -->
                </div>
              </div>`;
            lista.forEach(it=>{
              const colorImp=it.yaPagado?"#2D6A4F":"var(--warm)";
              const esCuota=it.tipo==="cuota";
              if(esCuota)_cuotaIdxGrupo++;
              h+=`<div style="display:flex;align-items:flex-start;gap:8px;justify-content:space-between;padding:4px 0 4px 10px">
                ${esCuota?`<span class="cuota-num">${_cuotaIdxGrupo}</span>`:""}
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;color:var(--muted)">${it.concepto}</div>
                  ${it.aplazada?`<span class="asoc-badge badge-deuda" style="display:inline-block;margin-top:4px">cuota aplazada</span>`:""}
                </div>
                <div style="display:flex;align-items:center;gap:10px">
                  ${it.tipo==="aporte"?`<span class="aporte-amt ${it.yaPagado?"ap-ok":""}">${selectorAporteHTML(DATA.members.find(x=>x.id===it.mid),getMesKey(DATA.reportMonth,DATA.reportYear),false)}</span>`:`<span class="aporte-amt" style="color:${colorImp};font-size:14px">${fmtEur(it.importe)} €</span>`}
                  <button class="toggle-btn ${it.yaPagado?"on":"off"}" onclick="marcarItemGrupo('${it.tipo}','${esc(it.mid)}','${it.lid?esc(it.lid):''}',${it.pi!==undefined?it.pi:-1})"></button>
                </div>
              </div>`;
            });
            h+=`</div>`;
          });
          // Añadir miembro a este grupo — excluir a quien ya esté en CUALQUIER grupo
          const enCualquierGrupo=new Set();
          grupos.forEach(gg=>{enCualquierGrupo.add(gg.principalId);(gg.miembros||[]).forEach(x=>enCualquierGrupo.add(x));});
          // v44.16: fuera quien no tiene nada que pagar — bajas y terceros sin ayuda activa
          const cand=DATA.members.filter(m=>!enCualquierGrupo.has(m.id)&&activoEnReporte(m)&&(m.type==="asociado"||(m.loans||[]).length>0)).sort((a,b)=>a.name.localeCompare(b.name));
          h+=`<label class="m-label" style="margin-top:8px">Añadir a este grupo</label>
            <select class="m-select" style="margin-bottom:10px;font-size:14px" onchange="if(this.value)añadirMiembroGrupo('${g.id}',this.value);this.value=''">
              <option value="">— Añadir persona —</option>
              ${cand.map(m=>`<option value="${esc(m.id)}">${escH(m.name)}${m.type==="tercero"?" (tercero)":""}</option>`).join("")}
            </select>`;
          h+=`<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--dark);border-top:1.5px solid var(--border);margin-top:4px;padding-top:10px">
            <span>Sin marcar en la lista</span><span>${fmtEur(totalPend)} €</span>
          </div>
          ${totalPagado>0?`<div style="display:flex;justify-content:space-between;font-size:12px;color:#2D6A4F;margin-top:2px"><span>Marcado como cobrado</span><span>${fmtEur(totalPagado)} €</span></div>`:""}`;
          if(totalPend>0){
            h+=`<button class="mgmt-btn primary" style="width:100%;margin-top:10px${DESP['cgtodo-'+g.id]?";background:#C75B0E":""}" onclick="cgTodoToque('${g.id}')">${DESP['cgtodo-'+g.id]?"¿Marcar todo pagado? Toca otra vez":"✅ Marcar todo pagado"}</button>`; // v45.43: dos toques, como en la tarjeta
          }
          // Enlace estable del grupo (se auto-actualiza; no hay que reenviarlo al editar el grupo)
          h+=`<button style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:10px;background:#25D366;color:#fff;font-size:14px;font-weight:700;cursor:pointer" onclick="compartirGrupoCierre('${g.id}')">💬 Compartir enlace del grupo</button>`;
          // ── Resumen del grupo: aportes, cuotas y total (completo) ──
          const _aportes=items.filter(it=>it.tipo==="aporte");
          const _cuotas=items.filter(it=>it.tipo==="cuota");
          const _totAportes=_aportes.reduce((s,it)=>s+it.importe,0);
          const _nAportes=_aportes.length;
          const _totCuotas=_cuotas.reduce((s,it)=>s+it.importe,0);
          const _nCuotas=_cuotas.length;
          const _totTodo=_totAportes+_totCuotas;
          h+=`<div style="background:var(--cream);border-radius:12px;padding:12px 14px;margin-top:12px">
            <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Resumen del grupo</div>`;
          if(_nAportes>0){
            h+=`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:13px;color:var(--dark)">Aportes <span style="color:var(--muted)">· ${_nAportes} ${_nAportes===1?"asociado":"asociados"}</span></span>
              <span style="font-size:14px;font-weight:700;color:var(--dark)">${fmtEur(_totAportes)} €</span>
            </div>`;
          }
          if(_nCuotas>0){
            h+=`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:13px;color:var(--dark)">Cuotas de ayudas <span style="color:var(--muted)">· ${_nCuotas} ${_nCuotas===1?"cuota":"cuotas"}</span></span>
              <span style="font-size:14px;font-weight:700;color:var(--dark)">${fmtEur(_totCuotas)} €</span>
            </div>`;
          }
          h+=`<div style="display:flex;justify-content:space-between;align-items:center;padding-top:9px;margin-top:2px">
              <span style="font-size:13px;font-weight:800;color:var(--dark)">Total de todo</span>
              <span style="font-size:20px;font-weight:900;color:var(--brand,#1B4332)">${fmtEur(_totTodo)} €</span>
            </div>
          </div>`;
          // ── Eliminar grupo (confirmación de dos toques) ──
          const delKey="del-"+g.id;
          if(DESP[delKey]){
            h+=`<div style="display:flex;align-items:center;gap:8px;margin-top:16px">
              <span style="flex:1;font-size:13px;color:#C0492C;font-weight:700">¿Eliminar este grupo?</span>
              <button onclick="DESP['${delKey}']=false;render()" style="background:none;border:1.5px solid var(--border);border-radius:10px;color:var(--muted);font-size:13px;font-weight:700;cursor:pointer;padding:8px 14px">No</button>
              <button onclick="DESP['${delKey}']=false;borrarGrupo('${g.id}')" style="background:#C0492C;border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;padding:8px 16px">Sí, eliminar</button>
            </div>`;
          } else {
            h+=`<button onclick="DESP['${delKey}']=true;render()" style="width:100%;background:none;border:1px solid #E8C9BE;border-radius:10px;color:#C0492C;font-size:13px;font-weight:700;cursor:pointer;padding:10px;margin-top:16px">🗑 Eliminar grupo</button>`;
          }
          h+=`</div>`;
        }
        h+=`</div>`;
      });
      h+=`</div>`;
    }
    h+=`</div>`;
    } // fin modo enfoque grupal

    h+=`</div>`; // cierra #cierre-listas
    // KPIs al final (solo si no hay ningún bloque abierto) · v45.42: + crear grupo y papeles del mes
    if(!hayAbierto){
      h+=crearGrupoHTML();
      h+=cierreMesHTML(); // v45.46: comprobación, papeles del mes y cerrar el mes
      h+=kpiHTML;
    }
  }


  // ── PESTAÑA ASOCIADOS ──
  if(TAB==="asociados"){
    if(FICHA_ID){
      // Vista ficha individual
      const mFicha=DATA.members.find(x=>x.id===FICHA_ID);
      if(mFicha){h+=fichaHTML(mFicha);}
    } else {
      // Vista fusionada: filtros + fichas estilo reporte (tocables) + Recaudación + Resumen General
      const ordered=buildOrderedMembers().filter(activoEnReporte); // baja: fuera de la lista de Asociados (solo en Histórico)
      const totApt=totalAportesMes(rm,ry);
      h+=`<div id="capture" style="background:#F5F0EB;padding-bottom:10px">`;
      // 1) Recaudación — cobrado vs pendiente del MES EN CURSO (cálculos; el bloque se
      // pinta más abajo, DESPUÉS del desplegable de asociados — ver punto 3)
      const asocC=DATA.members.filter(m=>m.type==="asociado");
      const tercC=DATA.members.filter(m=>m.type==="tercero");
      const intSplit=asocC.reduce((a,m)=>{const s=dueSplit(m,rm,ry);a.cob+=s.cobrado;a.pen+=s.pendiente;return a;},{cob:0,pen:0});
      const extSplit=tercC.reduce((a,m)=>{const s=dueSplit(m,rm,ry);a.cob+=s.cobrado;a.pen+=s.pendiente;return a;},{cob:0,pen:0});
      const aptSplit=aportesSplit(rm,ry);
      // Aportes extra del mes (p.ej. aporte adicional al fondo). Se registran ya entregados,
      // por eso cuentan como cobrado dentro de "Aportes del mes".
      const aptCob=aptSplit.cobrado; // v45: el aporte elegido ese mes ya va en aportesSplit
      const totCob=intSplit.cob+extSplit.cob+aptCob;
      const totPen=intSplit.pen+extSplit.pen+aptSplit.pendiente;
      // Contador de aportes cobrados X/Y para mostrar junto a "Aportes del mes"
      const _mdRec=getMesData(rm,ry),_riRec=MONTHS.indexOf(rm);
      const _asocAct=DATA.members.filter(m=>m.type==="asociado"&&m.joinMonth&&((m.joinYear<ry)||(m.joinYear===ry&&MONTHS.indexOf(m.joinMonth)<=_riRec))&&activoEnReporte(m)&&!enPausaMes(m,rm,ry));
      const _aptPag=_asocAct.filter(m=>_mdRec.aportes&&_mdRec.aportes[m.id]).length;
      // Subtotal de devoluciones (internas + externas) antes de aportes
      const devCob=intSplit.cob+extSplit.cob;
      // Desglose de aportes puntuales a devolver este mes (pendiente vs ya devuelto) —
      // se calcula aquí porque Recaudación (punto 3, abajo) también lo necesita.
      const spl=salidasPuntualesSplit(rm,ry);
      const bj=resumenBajasMes(rm,ry); // v44.13: devoluciones por baja que se pagan este mes
      const rt=retiradasMes(rm,ry);    // v45.1: beneficio retirado sin salir que se paga este mes
      const salidasYaDevueltas=spl.items.filter(it=>it.devuelto).reduce((s,it)=>s+it.total,0);
      // 2) Botón para desplegar/plegar la lista de asociados (arranca plegada)
      const nAsociados=DATA.members.filter(m=>m.type==="asociado"&&activoEnReporte(m)).length;
      const nAyudasActivas=ordered.filter(m=>(m.loans||[]).some(l=>(l.pays||[]).some(p=>!p.paid))).length; // v45.23: personas, no ayudas
      // v45.39: Personas — la lista se ve siempre, con buscador arriba y filtros
      const nTerc=ordered.length-nAsociados;
      {
        h+=`<div class="mes-title" style="margin:6px 2px 10px">👥 Personas <span style="font-weight:600;color:var(--muted)">· ${nAsociados} asociados${nTerc>0?` + ${nTerc} terceros`:""}</span></div>`;
        // Buscador de miembros
        h+=`<input id="asoc-search" type="text" placeholder="Buscar por nombre…" oninput="filtrarEnVivo(this.value,'#asoc-listas')"
          style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:16px;box-sizing:border-box;margin-bottom:10px">`;
        // Botones de filtro
        h+=`<div class="rep-filtros">
          <button class="rep-filtro ${REPORT_FILTER==="todos"?"on":""}" onclick="REPORT_FILTER='todos';render()">Todos<span class="filtro-num">${ordered.length}</span></button>
          <button class="rep-filtro ${REPORT_FILTER==="asoc"?"on":""}" onclick="REPORT_FILTER='asoc';render()">Asociados<span class="filtro-num">${nAsociados}</span></button>
          ${nTerc>0?`<button class="rep-filtro ${REPORT_FILTER==="terc"?"on":""}" onclick="REPORT_FILTER='terc';render()">Terceros<span class="filtro-num">${nTerc}</span></button>`:""}
          <button class="rep-filtro ${REPORT_FILTER==="activas"?"on":""}" onclick="REPORT_FILTER='activas';render()">Con ayuda<span class="filtro-num">${nAyudasActivas}</span></button>
        </div>`;
        // Fichas estilo reporte (tocables → abren la ficha completa)
        let lista=ordered;
        if(REPORT_FILTER==="activas"){
          const tieneActiva=m=>m.loans.some(l=>l.pays.some(p=>!p.paid));
          lista=ordered.filter(tieneActiva);
        }
        if(REPORT_FILTER==="asoc")lista=ordered.filter(m=>m.type==="asociado");
        if(REPORT_FILTER==="terc")lista=ordered.filter(m=>m.type==="tercero");
        h+=`<div id="asoc-listas">`;
        h+=listaPersonasHTML(lista); // v45.42: una línea por persona, por grupos (antes, la tarjeta grande de cada una)
        { // v45.47: quien ya salió pero aún no se le ha pagado sigue a mano aquí (si no, solo estaría en Histórico)
          const pend=DATA.members.filter(m=>m.baja&&!m.baja.pagada&&!activoEnReporte(m));
          if(pend.length)h+=`<div class="pl-sec" data-nombre="${escH(pend.map(m=>m.name).join(" | "))}"><div class="pl-tit">🚪 Han salido · falta pagarles <span>· ${pend.length}</span></div>${pend.map(m=>{const b=datosBaja(m);return `<button class="pl-fila" data-nombre="${escH(m.name)}" onclick="openFicha('${esc(m.id)}')"><span class="pl-txt"><span class="pl-nom">${escH(m.name)}</span><span class="pl-meta">Se le paga ${escH(b.fechaPago||"")}</span></span><span class="pl-est pend">${fmtEur(Math.abs(b.total||0))} €</span><span class="pl-fl">›</span></button>`;}).join("")}</div>`; }
        if(lista.length===0){
          h+=`<p style="text-align:center;color:var(--muted);font-size:14px;padding:20px 0">No hay miembros con ayudas activas este mes.</p>`;
        }
        h+=`</div>`;
        h+=`<div class="ini-rapidos" style="margin-top:14px">
          <button class="ini-rapido" onclick="openModal('member',{preset:'asociado'})">👤 Alta de asociado</button>
          <button class="ini-rapido" onclick="openModal('member',{preset:'tercero'})">🤝 Alta de tercero</button></div>`;
      }
      // v45.39: «Dinero del mes» está en Inicio y en Ayudas; la cartera pendiente, en Ayudas
      h+=`</div>`;
    }
  }

  // ── PESTAÑA HISTÓRICO (solo admin; nunca se renderiza en enlaces de asociado/grupo,
  //    porque render() hace return antes en READONLY_ID / ES_MODO_GRUPO / VISTA_ASOC) ──
  if(TAB==="historico"){
    const bajas=DATA.members.filter(m=>m.baja).sort((a,b)=>{
      const ka=a.baja.year*12+MONTHS.indexOf(a.baja.month), kb=b.baja.year*12+MONTHS.indexOf(b.baja.month);
      return kb-ka || a.name.localeCompare(b.name);
    });
    h+=`<button class="btn-back" style="margin:6px 0 10px" onclick="irGestion();window.scrollTo(0,0)">← Más</button>`; // v45.39: el Histórico está dentro de «Más»
    h+=`<div class="mes-card"><div class="mes-title" style="margin-bottom:10px">📜 Histórico — Bajas de asociados</div>`;
    if(bajas.length===0){
      h+=`<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">Aún no hay bajas registradas.</div>`;
    }else{
      // v44.13: tarjetas (legibles en el iPhone) con la gestión del pago de cada baja
      bajas.forEach(m=>{
        const b=datosBaja(m), pAct=mesPagoBaja(b);
        let optsPago="";{let i=MONTHS.indexOf(b.month)+(b.v18?0:1),y=b.year; /* v45.1: la salida v18 se paga el mes de baja (día 5) */ for(let k=0;k<6;k++){if(i>11){i=0;y++;}const sel=(MONTHS[i]===pAct.mes&&y===pAct.anio)?"selected":"";optsPago+=`<option value="${MONTHS[i]}|${y}" ${sel}>${MONTHS_FULL[i]} ${y}</option>`;i++;}}
        h+=`<div style="border:1px solid #ece5da;border-radius:14px;padding:12px 14px;margin-bottom:12px;background:#fff">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div><div style="font-size:16px;font-weight:800;color:var(--dark)">${escH(m.name)}</div>
              <div style="font-size:12.5px;color:var(--muted);margin-top:2px">Baja: ${escH(MONTHS_FULL[MONTHS.indexOf(b.month)]||b.month)} ${b.year}</div></div>
            <span style="flex-shrink:0;font-size:12px;font-weight:800;padding:4px 10px;border-radius:20px;background:${b.pagada?"#E3F1E7":"#FDECE8"};color:${b.pagada?"#1B7A3D":"#C0492C"}">${b.pagada?"✓ Pagado":"Pendiente"}</span>
          </div>
          ${b.v18?`<div style="font-size:12.5px;color:var(--muted);margin-top:2px">${b.tipo==="fin"?"Termina su permanencia":b.tipo==="indefinida"?"Sale de la indefinida":"Sale antes de terminar"} · último aporte: ${escH(MONTHS_FULL[MONTHS.indexOf(b.ultimoMes)]||"")} ${b.ultimoAnio}</div>`:""}
          <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-top:10px"><span>Capital a devolver</span><b>${fmtEur(b.capitalDevuelto)} €</b></div>
          ${b.v18?`<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-top:4px"><span>Beneficio que se le paga</span><b>${fmtEur(b.beneficioConservado)} €</b></div>
          ${b.ayudaDescontada?`<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-top:4px;color:#C0492C"><span>Ayuda pendiente descontada</span><b>−${fmtEur(b.ayudaDescontada)} €</b></div>`:""}
          <div style="display:flex;justify-content:space-between;font-size:14.5px;margin-top:6px;padding-top:6px;border-top:1px solid #ece5da"><span>${b.total>=0?"Recibe":"Falta por cubrir (pasa a su avalista)"}</span><b>${fmtEur(Math.abs(b.total))} €</b></div>`:""}
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-top:4px"><span>Beneficio perdido (queda en el fondo)</span><span>${fmtEur(b.beneficioPerdido)} €</span></div>
          ${b.v18&&!b.pagada?`<div style="font-size:11.5px;color:var(--muted);margin-top:3px">Cifras provisionales: se fijan al marcarla como pagada.</div>`:""}
          ${b.pagada&&b.fechaPagada?`<div style="font-size:12px;color:#1B7A3D;margin-top:4px">Pagado el ${escH(b.fechaPagada)}</div>`:""}
          <div style="margin-top:12px;background:#FAF6F0;border:1px solid #ece5da;border-radius:10px;padding:10px">
            <label class="m-label" style="margin-bottom:6px">${b.v18?"Se paga en (entre el día 5 y el 10)":"Se paga en (día 5)"}</label>
            <select class="m-select" style="font-size:14px;margin-bottom:10px" onchange="setPagoBaja('${esc(m.id)}','mes',this.value)">${optsPago}</select>
            <button onclick="setPagoBaja('${esc(m.id)}','pagada',${b.pagada?"false":"true"})" style="width:100%;padding:11px;border-radius:10px;border:1.5px solid ${b.pagada?"#D9C9B0":"#2D6A4F"};background:${b.pagada?"#fff":"#2D6A4F"};color:${b.pagada?"#8A7A60":"#fff"};font-size:14px;font-weight:800;cursor:pointer">${b.pagada?"↩ Marcar como pendiente":"✓ Marcar como pagada"}</button>
            ${b.v18?`<button onclick="salidaEnviarWA('${esc(m.id)}')" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:none;background:#25D366;color:#fff;font-size:13.5px;font-weight:800;cursor:pointer">💬 Enviar resumen a ${escH(m.name.split(" ")[0])}</button>`:""}
          </div>
        </div>`;
      });
      const totalDev=_r2(bajas.reduce((s,m)=>s+(datosBaja(m).total||0),0));
      const totalPag=_r2(bajas.filter(m=>m.baja.pagada).reduce((s,m)=>s+(m.baja.total||0),0));
      h+=`<div style="text-align:right;margin-top:4px;font-weight:800;color:#7A2418;line-height:1.5">Total a devolver: ${fmtEur(totalDev)} €<br><span style="font-size:13px">Pagado: ${fmtEur(totalPag)} € · Pendiente: ${fmtEur(totalDev-totalPag)} €</span></div>`;
    }
    h+=`</div>`+historicoRetiradasHTML()+`<div class="mes-card" style="padding-top:10px;padding-bottom:10px"><div style="font-size:11px;color:var(--muted)">Sección de administración. Preparada para crecer (futuros: reingresos, cesiones de plaza).</div></div>`;
  }

  // ── PESTAÑA ENVÍOS ──
  // ── PESTAÑA GESTIÓN ──
  if(TAB==="manage"){
    const asocAll=DATA.members.filter(m=>m.type==="asociado"&&activoEnReporte(m)); // baja: fuera de Gestión (solo en Histórico)
    const tercAll=DATA.members.filter(m=>m.type==="tercero");

    // v45.42: sin buscador ni «👥 Personas y ayudas» aquí: las personas (con su buscador) están en «Personas»
    // y editar o eliminar sus ayudas, en la ficha de cada una.
    // v45.39: las Solicitudes están en la pestaña «Ayudas». Aquí, lo de consultar y los ajustes.
    h+=`<div class="mas-sec">📂 Consultas</div>`; // v45.43: Más en tres apartados
    h+=`<div class="mg-acc-head" onclick="TAB='historico';render();window.scrollTo(0,0)">
      <span>📜 Histórico <span style="font-weight:600;color:var(--muted)">· bajas y retiradas</span></span>
      <span class="mg-acc-fl">›</span></div>`;
    // ⏳ v45.28: fechas de fin de permanencia de los asociados (solo lectura)
    h+=permanenciasGestionHTML();
    // 📞 v45.22: teléfonos de todos (para tenerlos guardados, sin enviar nada)
    h+=telefonosGestionHTML(asocAll,tercAll);
    // 🧾 v45.23: gastos administrativos (Maestro v18.9 · FO-6)
    h+=gastosGestionHTML();
    h+=`<div class="mas-sec">🔍 Revisión</div>`;
    // 🔍 Auditoría interna (dinero/reglas) — antes del auto-chequeo técnico
    h+=auditoriaInternaHTML();
    // 🛡️ Auto-chequeo del sistema · v45.43: plegado si todo está en verde (se abre solo si hay un aviso)
    h+=chequeoPlegableHTML();
    h+=`<div class="mas-sec">⚙️ Datos y ajustes</div>`;
    { const ab=!!DESP["mg-copia"], upd=DATA.updatedAt?new Date(DATA.updatedAt).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";
      h+=`<div class="mg-acc-head" onclick="DESP['mg-copia']=!DESP['mg-copia'];render()"><span>💾 Copia de seguridad <span style="font-weight:600;color:var(--muted)">· subida ${escH(upd)}</span></span><span class="mg-acc-fl">${ab?"▲ ocultar":"▼ mostrar"}</span></div>`;
      if(ab)h+=`<div style="background:#fff;border-radius:16px;padding:16px;margin:-4px 0 12px;border:1px solid var(--border)">
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px">Cada noche se guarda una copia en tu ordenador (si está encendido). Aquí puedes guardar o recuperar los datos a mano.</div>
      <button class="backup-btn" style="background:#2D6A4F;color:#fff" onclick="subirAhoraNube()">☁️ Subir ahora a la nube</button>
      <button class="backup-btn backup-export" onclick="exportData()">📤 Exportar datos (JSON)</button>
      <button class="backup-btn backup-import" onclick="importData()">📂 Importar backup</button>
      <button style="width:100%;padding:8px;border:none;background:transparent;color:var(--muted);font-size:13px;text-decoration:underline;cursor:pointer" onclick="openModal('restaurar_backups',{})">Restaurar copia de seguridad local</button>
    </div>`; }
    { const ab=!!DESP["mg-cfg"];
      h+=`<div class="mg-acc-head" onclick="DESP['mg-cfg']=!DESP['mg-cfg'];render()"><span>⚙️ Configuración <span style="font-weight:600;color:var(--muted)">· retorno ${DATA.rate} % · mes nuevo el día ${DATA.diaAvisoProximo!=null?DATA.diaAvisoProximo:25}</span></span><span class="mg-acc-fl">${ab?"▲ ocultar":"▼ mostrar"}</span></div>`;
      if(ab)h+=configHTML(); }
    h+=pantallaAjustesHTML(); // v45.39: Texto grande
    h+=sesionHTML(); // v45.27

  }

  h+=`</div>`;
  h+=navInferiorHTML(); // v45.39: barra de abajo

  if(MODAL){
    const dismissable=MODAL.type!=="wa_queue"&&MODAL.type!=="sync_conflict";
    h+=`<div class="modal-bg" ${dismissable?`onclick="closeModal()"`:""} ><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>`;
    if(MODAL.type==="member")h+=memberFormHTML();
    if(MODAL.type==="loan")h+=loanFormHTML();
    if(MODAL.type==="cierreloan")h+=cierreLoanFormHTML();
    if(MODAL.type==="editloan")h+=editLoanFormHTML();
    if(MODAL.type==="histloan")h+=histLoanFormHTML();
    if(MODAL.type==="preview")h+=previewFormHTML();
    if(MODAL.type==="link")h+=linkModalHTML();
    if(MODAL.type==="wa_queue")h+=waQueueModalHTML();
    if(MODAL.type==="history")h+=historyModalHTML();
    if(MODAL.type==="extra")h+=extraFormHTML();
    if(MODAL.type==="referido")h+=referidoFormHTML();
    if(MODAL.type==="ciclo")h+=cicloFormHTML();
    if(MODAL.type==="puntual")h+=puntualFormHTML();
    if(MODAL.type==="avalista")h+=avalistaFormHTML();
    if(MODAL.type==="grupo_link")h+=grupoLinkModalHTML();
    if(MODAL.type==="sync_conflict")h+=syncConflictModalHTML();
    if(MODAL.type==="restaurar_backups")h+=restaurarBackupsModalHTML();
    if(MODAL.type==="baja")h+=bajaFormHTML();
    if(MODAL.type==="salida_ok")h+=salidaOkModalHTML(); // v45.31
    if(MODAL.type==="salida_opciones")h+=salidaOpcionesModalHTML(); // v45.33
    if(MODAL.type==="pausa")h+=pausaFormHTML(); // v45.33
    if(MODAL.type==="pausa_ok")h+=pausaOkModalHTML(); // v45.33
    if(MODAL.type==="retirada")h+=retiradaFormHTML();
    if(MODAL.type==="sim")h+=simuladorHTML();
    if(MODAL.type==="importar")h+=importarModalHTML(); // v45.21
    if(MODAL.type==="bienvenida")h+=bienvenidaModalHTML(); // v45.21
    if(MODAL.type==="telefono")h+=telefonoModalHTML(); // v45.22
    if(MODAL.type==="ayuda_ok")h+=ayudaOkModalHTML(); // v45.39
    if(MODAL.type==="cg_cola")h+=cgColaModalHTML(); // v45.43
    h+=`</div></div>`;
  }
  document.getElementById("app").innerHTML=h;
}

function sendCardHTML(m,rm,ry,dimmed){
  const dMes=due(m,rm,ry);
  const dTot=pendAll(m);
  const isTerc=m.type==="tercero";
  const isSel=SEND_SELECTED.has(m.id);
  const selClass=isSel?(isTerc?"terc-selected":"selected"):"";
  const btnId=`copy-${m.id}`;
  return`<div class="send-card ${selClass}${dimmed?" no-cuota-this-month":""}" data-envio-nombre="${escH(m.name.toLowerCase())}" onclick="toggleSendSelect('${esc(m.id)}')">
    <div class="send-card-head">
      <div class="send-card-info">
        <div class="send-card-name">${escH(m.name)}</div>
        <div class="send-card-meta">${isTerc?"🤝 ref: "+escH(avalistaNombre(m)||"—"):"👥 Asociado"} · ${m.loans.length} ayuda${m.loans.length>1?"s":""}</div>
      </div>
      <div class="send-amt-wrap">
        ${dMes>0
          ?`<div class="send-amt-this">${fmtEur(dMes)} €</div><div class="send-amt-label">este mes</div>`
          :`<div class="send-amt-none">sin cuota<br>en ${rm}</div>`
        }
        ${dTot>dMes?`<div class="send-amt-future">Pend. total: ${fmtEur(dTot)} €</div>`:""}
      </div>
      <div class="send-card-check">${isSel?"✓":""}</div>
    </div>
    <div class="send-card-bottom">
      <button id="${btnId}" class="copy-btn ${isTerc?"terc-type":""}" onclick="event.stopPropagation();copyText(mText(DATA.members.find(x=>x.id==='${esc(m.id)}')),this.id)">📋 Copiar mensaje</button>
      <button class="preview-btn" onclick="event.stopPropagation();openPreview('${esc(m.id)}')">👁️</button>
    </div>
  </div>`;
}

function cardHTML(m,isT,tappable){
  const{reportMonth:rm,reportYear:ry}=DATA;
  // Total: SIEMPRE el mes del sistema (misma fuente que fichaHTML y fichaResumenHTML —
  // Bloque 8 v2: antes esta tarjeta usaba el mes OBJETIVO como mes principal y podía no
  // coincidir con lo que el asociado ve al entrar en su ficha o en el reporte grupal).
  const totSis=totalDelMes(m,rm,ry);
  const d=totSis.totalCuotas; // Total de cuotas del MES DEL SISTEMA (sin el aporte mensual)
  // mesObjetivo (desgloseDelMes) se usa SOLO para decidir si mostrar el aviso secundario
  // "Próximo": informa de quien ya pagó por adelantado, sin cambiar el total principal.
  const dObj=desgloseDelMes(m);
  const hayAdelanto=(dObj.mesObj!==rm||dObj.anioObj!==ry);
  let proximoHTML="";
  if(hayAdelanto){
    const iRep=MONTHS.indexOf(rm);
    const iSig=(iRep+1)%12, ySig=ry+(iRep+1>=12?1:0);
    const totSig=totalDelMes(m,MONTHS[iSig],ySig).totalCuotas;
    if(totSig>0){
      proximoHTML=`<div style="font-size:11px;color:rgba(255,255,255,.75);margin-top:2px">Próximo: ${fmtEur(totSig)} € de ${MONTHS_FULL[iSig]} ${ySig}</div>`;
    }
  }
  const hCount=memberHistoryCount(m);
  // Fundador: asociado que ingresó en agosto 2025
  const esFundador=(m.type==="asociado"&&m.joinMonth==="Ago"&&m.joinYear===2025);
  let h=`<div id="card-capture-${m.id}" style="background:#F5F0EB;padding:4px 0 8px">`;
  const tapAttr=tappable?` onclick="openFicha('${esc(m.id)}')" style="cursor:pointer${esFundador?';border-left:3px solid #C9A227':''}"`:(esFundador?' style="border-left:3px solid #C9A227"':"");
  h+=`<div class="card ${isT?"terc":""}"${tapAttr}><div class="card-head" style="display:block"><div class="card-name" style="font-size:23px">${escH(m.name)}</div>${esFundador?`<span style="display:inline-block;margin-top:4px;font-size:11px;font-weight:700;color:#9A7B1A;background:#FBF3DC;border:1px solid #EAD9A0;border-radius:20px;padding:2px 10px;letter-spacing:.3px">⭐ Fundador</span>`:""}${avalistaNombre(m)?`<div class="card-ref">Referido por ${escH(avalistaNombre(m))}</div>`:""}`;
  if(m.joinMonth){
    const lv=memberLevel(m);
    const months=memberMonths(m);
    const ben=beneficioGuardado(m); // v45.1: descontado lo ya retirado
    h+=`<div class="member-info" style="font-size:14px"><span>📅 Miembro desde ${MONTHS_FULL[MONTHS.indexOf(m.joinMonth)]} ${m.joinYear}</span></div>`;
    h+=`<div class="member-stat-grid">
      <div class="mstat"><div class="mstat-val">${months}</div><div class="mstat-lbl">meses</div></div>
      <div class="mstat"><div class="mstat-val nivel-badge" style="font-size:14px">${m.ciclo===0?"∞":m.ciclo!=null?m.ciclo:"⛔"}</div><div class="mstat-lbl">permanencia</div></div>
      <div class="mstat"><div class="mstat-val" style="color:#2D6A4F">${fmtEur(ben)}€</div><div class="mstat-lbl">beneficio</div></div>
    </div>`;
  }
  h+=`</div>`;
  if(m.loans.length===0){
    h+=`<div style="padding:16px;text-align:center;color:var(--muted);font-size:14px">Sin ayudas activas</div>`;
  }
  m.loans.forEach((loan,li)=>{
    const activeIdx=activePayIndex(loan,rm,ry);
    h+=`<div class="loan"${li>0?' style="border-top:1px dashed #E8E0D8"':""}>`;
    h+=`<div class="loan-row"><div><div class="loan-lbl">Ayuda ${loan.gMonth} ${loan.gYear}</div><div class="loan-amt">${fmtEur(loan.capital)},00 €</div></div></div>`;
    h+=`<div class="timeline">`;
    loan.pays.forEach((p,pi)=>{
      const isActive=(pi===activeIdx);
      const st=(p.aplazada&&!p.paid)?"aplazada":p.paid?"paid":isActive?"due":"future";
      const impPi=fmtEur(cuotaDe(loan,pi));
      if(tappable){
        h+=`<div class="cuota cuota-${st}${esUltimaCuota(loan,pi)?" cuota-ultima":""}"><div class="cuota-month">${p.m}</div><div class="cuota-val" style="white-space:nowrap">${impPi} €</div><div class="cuota-status">${p.aplazada&&!p.paid?"⏸ APLAZ.":p.paid?"PAGADO":isActive?"POR PAGAR":"—"}</div></div>`;
      } else {
        const armadaC=_cuotaArmada===m.id+"|"+loan.id+"|"+pi; // v45.21: dos toques (sin confirm)
        h+=`<button class="cuota cuota-${st}${esUltimaCuota(loan,pi)?" cuota-ultima":""}"${armadaC?' style="outline:3px solid #C75B0E;outline-offset:1px"':""} onclick="cuotaToque('${esc(m.id)}','${esc(loan.id)}',${pi})"><div class="cuota-month">${p.m}</div><div class="cuota-val" style="white-space:nowrap">${impPi} €</div><div class="cuota-status">${p.aplazada&&!p.paid?"⏸ APLAZ.":p.paid?"PAGADO":isActive?"POR PAGAR":"—"}</div></button>`;
      }
    });
    h+=`</div></div>`;
  });
  if(m.loans.length>0){
    h+=`<div class="total-ban"><div class="total-ban-lbl">Cuotas de ${MONTHS_FULL[MONTHS.indexOf(rm)].toLowerCase()} ${ry}${m.loans.length>1?` (${m.loans.length} ayudas)`:""}</div><div class="total-ban-val">${fmtEur(d)} €</div>${proximoHTML}</div>`;
  }
  h+=`</div></div>`;
  return h;
}

// Abre la pestaña Gestión y lanza el auto-chequeo de código la primera vez.
function irGestion(){
  TAB="manage";
  if(!CODE_CHECKS.ran && !CODE_CHECKS.running) runCodeChecks();
  render();
}
// Comprueba que el archivo PUBLICADO sigue teniendo los arreglos críticos intactos.
// Se descarga a sí mismo (igual que el aviso de "nueva versión") y examina el texto;
// la comprobación del tope/beneficio extra no necesita descarga: ejecuta el cálculo
// real con datos de prueba que no tocan la información de ningún asociado.
function runCodeChecks(force){
  if(CODE_CHECKS.running) return;
  if(CODE_CHECKS.ran && !force) return;
  CODE_CHECKS.running=true;
  if(TAB==="manage")render();
  const url=location.href.split("?")[0]+"?_selfcheck="+Date.now();
  fetch(url,{cache:"no-store"}).then(r=>r.text()).then(async html=>{
    // v45.36: la app está repartida en archivos; sanitizeData vive en js/datos.js. Se descarga
    // ese archivo (con la misma versión) y se examina igual. Si no lo hay (app de un solo
    // archivo), se examina el propio index.html como antes.
    const mDat=html.match(/<script src="(js\/datos\.js[^"]*)"/);
    let src=html;
    if(mDat){ const u=new URL(mDat[1],location.href); u.searchParams.set("_selfcheck",Date.now());
      src=await fetch(u.href,{cache:"no-store"}).then(r=>{ if(!r.ok)throw new Error("datos.js "+r.status); return r.text(); }); }
    // Solo se examina el texto ANTERIOR a este propio auto-chequeo: así el código
    // de esta comprobación (que menciona estos mismos textos) no se confunde consigo
    // mismo y da un falso "todo bien" si algo real hubiera sido borrado.
    const limite=src.indexOf('function runCodeChecks');
    const zona=limite>-1?src.slice(0,limite):src;
    const iSD=zona.indexOf('function sanitizeData(');
    let ok1=false,ok2=false,ok5=false;
    if(iSD>-1){
      // Busca la llave '}' que cierra de verdad sanitizeData (contando llaves,
      // no basta con mirar si el texto siguiente "termina en }").
      let i=zona.indexOf('{',iSD),depth=0,iClose=-1;
      for(;i<zona.length;i++){
        if(zona[i]==='{')depth++;
        else if(zona[i]==='}'){depth--;if(depth===0){iClose=i;break;}}
      }
      if(iClose>-1){
        const resto=zona.slice(iClose+1,iClose+1+200);
        ok1=/^\s*const URL_PARAMS=new URLSearchParams\(window\.location\.search\);/.test(resto);
        const entre=zona.slice(iSD,iClose);
        ok2=/origen\s*===\s*"app"/.test(entre) && /id\.charAt\(0\)\s*===\s*"m"/.test(entre);
        // Protección añadida en v43.23: un asociado del archivo (INITIAL) al que le
        // cambian el nombre en caliente debe seguir reconociéndose por su id, si no
        // sanitizeData lo trata como fantasma y lo borra (bug real: caso [asociado]).
        ok5=/validIds\.has\(m\.id\)/.test(entre);
      }
    }
    const zonaMeta=mDat?html:zona; // las etiquetas anti-caché están siempre en index.html
    const ok3 = zonaMeta.includes('Cache-Control" content="no-cache, no-store, must-revalidate"')
      && zonaMeta.includes('http-equiv="Pragma" content="no-cache"')
      && zonaMeta.includes('http-equiv="Expires" content="0"');
    CODE_CHECKS.online=true; CODE_CHECKS.ok1=ok1; CODE_CHECKS.ok2=ok2; CODE_CHECKS.ok3=ok3; CODE_CHECKS.ok5=ok5;
  }).catch(()=>{ CODE_CHECKS.online=false; }).then(()=>{
    try{
      const t1=tarifaNivelMes({joinMonth:"Ago",joinYear:2025,ciclo:24},"2026-08")===10; // mes venc 12 → Nivel 1
      const t2=tarifaNivelMes({joinMonth:"Ago",joinYear:2025,ciclo:24},"2026-09")===12; // mes venc 13 → Nivel 2
      const b1=levelBenefit({joinMonth:DATA.reportMonth,joinYear:DATA.reportYear,aporte:100});
      const b2=levelBenefit({joinMonth:DATA.reportMonth,joinYear:DATA.reportYear,aporte:50});
      CODE_CHECKS.ok4 = t1 && t2 && b1===20 && b2===10;
    }catch(e){ CODE_CHECKS.ok4=false; }
    CODE_CHECKS.ran=true; CODE_CHECKS.running=false; CODE_CHECKS.ts=Date.now();
    if(TAB==="manage")render();
  });
}
// Tarjeta "🔍 Auditoría interna" (Gestión): SOLO informa (auditarNH nunca corrige nada).
function auditoriaInternaHTML(){
  const r=auditarNHCached();
  const nE=r.errores.length,nA=r.advertencias.length;
  const ok=nE===0;
  const linea=(txt,esError)=>`<div style="display:flex;align-items:flex-start;gap:8px;margin:4px 0;font-size:12.5px"><span>${esError?"❌":"⚠️"}</span><span>${escH(txt)}</span></div>`;
  return `<div style="background:${ok?"#F0F7F2":"#FDF0EE"};border:2px solid ${ok?"#2D6A4F":"#C0492C"};border-radius:14px;padding:14px;margin-top:16px;margin-bottom:16px;font-size:13px;line-height:1.5;color:${ok?"#1B4332":"#7A2418"}">
    <button onclick="AUDIT_OPEN=!AUDIT_OPEN;render()" style="width:100%;background:none;border:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:0;text-align:left;color:inherit">
      <span style="font-weight:800;font-size:15px">🔍 Auditoría interna — ${ok?"✅ Todo cuadra":`${nE} error${nE>1?"es":""}`}${nA>0?` · ${nA} aviso${nA>1?"s":""}`:""}</span>
      <span style="font-size:18px">${AUDIT_OPEN?"▲":"▼"}</span>
    </button>
    ${AUDIT_OPEN?`<div style="margin-top:10px">
      ${nE===0&&nA===0?`<div style="font-size:12.5px">Sin errores ni avisos. Los ${(function(){let c=0;DATA.members.forEach(m=>{c+=(m.loans||[]).length+(m.closedLoans||[]).length;});return c;})()} ayudas registradas cuadran.</div>`:""}
      ${r.errores.map(e=>linea(e,true)).join("")}
      ${r.advertencias.map(a=>linea(a,false)).join("")}
      <div style="border-top:1px solid ${ok?"#cfe0d5":"#f0c9c2"};margin:10px 0 8px"></div>
      <button style="width:100%;padding:10px;border:none;border-radius:10px;background:${ok?"#2D6A4F":"#C0492C"};color:#fff;font-weight:700" onclick="AUDIT_OPEN=false;render();toast('Auditoría cerrada — no se ha corregido nada automáticamente')">Cerrar</button>
    </div>`:""}
  </div>`;
}
function chequeoHTML(){
  let totalLoans=0; DATA.members.forEach(m=>{totalLoans+=(m.loans||[]).length;});
  let lsRaw=""; try{lsRaw=localStorage.getItem(KEY)||"";}catch(e){lsRaw="";}
  let lsLoans=null;
  try{const lsObj=JSON.parse(lsRaw);let c=0;(lsObj.members||[]).forEach(m=>{c+=(m.loans||[]).length;});lsLoans=c;}catch(e){lsLoans=null;}
  const upd=DATA.updatedAt?new Date(DATA.updatedAt).toLocaleString("es-ES"):"(sin fecha)";
  const chk=[];
  const linea=(ok,txt)=>`<div style="display:flex;align-items:flex-start;gap:8px;margin:3px 0"><span>${ok?"✅":"⚠️"}</span><span>${txt}</span></div>`;
  // Igual que linea(), pero admite un tercer estado "aún comprobando" (⏳) y uno
  // de "sin conexión" para no dar una falsa alarma cuando no hay internet.
  const lineaEstado=(estado,txtOk,txtMal,txtEspera,txtSinConexion)=>{
    const icono = estado===true?"✅":estado===false?"⚠️":"⏳";
    const txt = estado===true?txtOk:estado===false?txtMal:estado==="offline"?txtSinConexion:txtEspera;
    return `<div style="display:flex;align-items:flex-start;gap:8px;margin:3px 0"><span>${icono}</span><span>${txt}</span></div>`;
  };
  const coincide = (lsLoans===null) || (lsLoans===totalLoans);
  chk.push(linea(coincide, coincide
    ? "Ayudas guardadas correctamente ("+totalLoans+" en memoria y en el teléfono)"
    : "Descuadre: "+totalLoans+" en memoria vs "+lsLoans+" en el teléfono — avisar al soporte"));
  const syncOk = SYNC_STATUS==="ok";
  chk.push(linea(syncOk, syncOk
    ? "Conectado con la nube — los asociados ven tus cambios"
    : "Sin confirmar subida a la nube — pulsa «Subir ahora» antes de cerrar"));

  const s1 = !CODE_CHECKS.ran ? null : (!CODE_CHECKS.online ? "offline" : CODE_CHECKS.ok1);
  chk.push(lineaEstado(s1,
    "Código de arranque intacto (no se queda en pantalla en blanco)",
    "Aviso: el código de arranque cambió de posición — avisar al soporte",
    "Comprobando código de arranque…",
    "Sin conexión: no se pudo comprobar el código de arranque"));
  const s2 = !CODE_CHECKS.ran ? null : (!CODE_CHECKS.online ? "offline" : CODE_CHECKS.ok2);
  chk.push(lineaEstado(s2,
    "Protección de asociados creados en la app activa",
    "Aviso: no se detecta la protección de asociados creados en la app — avisar al soporte",
    "Comprobando protección de asociados…",
    "Sin conexión: no se pudo comprobar la protección de asociados"));
  const s3 = !CODE_CHECKS.ran ? null : (!CODE_CHECKS.online ? "offline" : CODE_CHECKS.ok3);
  chk.push(lineaEstado(s3,
    "Etiquetas anti-caché presentes (el iPhone no usa versiones viejas)",
    "Aviso: faltan etiquetas anti-caché — avisar al soporte",
    "Comprobando etiquetas anti-caché…",
    "Sin conexión: no se pudo comprobar la caché"));
  const s5 = !CODE_CHECKS.ran ? null : (!CODE_CHECKS.online ? "offline" : CODE_CHECKS.ok5);
  chk.push(lineaEstado(s5,
    "Miembros del archivo (INITIAL) se conservan por id al renombrarlos",
    "Aviso: un asociado renombrado en caliente podría borrarse solo al recargar — avisar al soporte",
    "Comprobando protección de renombrados…",
    "Sin conexión: no se pudo comprobar la protección de renombrados"));
  const s4 = !CODE_CHECKS.ran ? null : CODE_CHECKS.ok4;
  chk.push(lineaEstado(s4,
    "Cálculo de tope de mes y beneficio extra correcto",
    "Aviso: el cálculo de tope de mes o beneficio extra no da el resultado esperado — avisar al soporte",
    "Comprobando cálculo de tope y beneficio extra…",
    "Comprobando cálculo de tope y beneficio extra…"));

  return `<div style="background:#F0F7F2;border:2px solid #2D6A4F;border-radius:14px;padding:14px;margin-top:-4px;margin-bottom:12px;font-size:13px;line-height:1.5;color:#1B4332">
    ${chk.join("")}
    <div style="border-top:1px solid #cfe0d5;margin:10px 0 8px"></div>
    <div>☁️ Última subida a la nube: <b>${upd}</b></div>
    <div style="display:flex;gap:8px;margin-top:10px">
      ${syncOk?"":`<button style="flex:1;padding:10px;border:none;border-radius:10px;background:#2D6A4F;color:#fff;font-weight:700" onclick="subirAhoraNube()">☁️ Subir ahora</button>`}<!-- v45.43: solo si hace falta (también está en Copia de seguridad) -->
      <button style="flex:1;padding:10px;border:none;border-radius:10px;background:#E07A3A;color:#fff;font-weight:700" onclick="diagLeerLS();runCodeChecks(true)">🔄 Re-verificar</button>
    </div>
  </div>`;
}
function chequeoPlegableHTML(){ // v45.43
  const html=chequeoHTML(), nMal=(html.match(/⚠️/g)||[]).length, nEsp=(html.match(/⏳/g)||[]).length;
  const ab=DESP["mg-chq"]!=null?!!DESP["mg-chq"]:nMal>0; // con un aviso se abre solo
  const est=nMal?`<span style="color:#A93C25">⚠️ ${nMal} ${nMal===1?"aviso":"avisos"}</span>`:nEsp?`<span style="color:var(--muted)">⏳ sin terminar de comprobar</span>`:`<span style="color:#1B7A3D">✅ todo en verde</span>`;
  return `<div class="mg-acc-head" onclick="DESP['mg-chq']=!${ab};render()"><span>🛡️ Auto-chequeo · ${est}</span><span class="mg-acc-fl">${ab?"▲ ocultar":"▼ mostrar"}</span></div>`+(ab?html:"");
}
function configHTML(){
  return `<div style="background:#fff;border-radius:16px;padding:16px;margin:-4px 0 12px;border:1px solid var(--border)">
    <div class="cfg-row">
      <div><div class="cfg-label">Retorno compartido por cuota</div><div class="cfg-sub">% sobre el capital en cada cuota. Es una regla del Documento Maestro: cámbialo solo si cambia el Maestro. Afecta a las ayudas nuevas.</div></div>
      ${DESP["cfg-rate"]?`<input id="cfg-rate" class="cfg-input" type="number" value="${DATA.rate}" min="0" step="0.5"> %`:`<span style="white-space:nowrap;font-weight:800;font-size:16px">${DATA.rate} %</span>`}
    </div>
    ${DESP["cfg-rate"]?"":`<button onclick="DESP['cfg-rate']=true;render()" style="background:none;border:none;color:var(--muted);font-size:13px;text-decoration:underline;cursor:pointer;padding:0 0 8px">🔒 Cambiar el retorno</button>`}<!-- v45.43: protegido -->
    <div class="cfg-row">
      <div><div class="cfg-label">Día en que se pasa al mes siguiente</div><div class="cfg-sub">Desde este día la app y los enlaces de los asociados muestran ya el mes siguiente (aportes y cuotas). Normalmente el 25.</div></div>
      <input id="cfg-diaaviso" class="cfg-input" type="number" value="${DATA.diaAvisoProximo!=null?DATA.diaAvisoProximo:25}" min="1" max="28">
    </div>
    <button style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent);color:#fff;font-size:14px;font-weight:700;margin-top:12px" onclick="saveCfg()">💾 Guardar configuración</button>
  </div>`;
}
function manageHTML(m,isT){
  const memArmed=(_delMemberArmed===m.id);
  let h=`<div class="mg-card" data-nombre="${escH((m.name||"").toLowerCase())}"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div><div style="font-weight:700;font-size:16px;color:${isT?"var(--terc)":"var(--dark)"}">${escH(m.name)}</div><div style="font-size:12px;color:var(--muted)">${isT?"Ref: "+escH(avalistaNombre(m)||"—"):"Asociado"} · ${m.loans.length} ayuda${m.loans.length>1?"s":""}</div></div><button class="del-btn ${memArmed?"armed":""}" onclick="delMember('${esc(m.id)}')">${memArmed?"¿Seguro?":"🗑️"}</button></div>`;
  if(memArmed&&esPrincipalDeGrupo(m.id)){
    h+=`<div style="background:#FFF8F0;border:1px solid #F5D5B0;border-radius:10px;padding:9px 11px;margin:-2px 0 12px;font-size:12px;color:#7A4A1E">⚠️ Es principal de un grupo de Cierre — su enlace de grupo dejará de funcionar. Toca 🗑️ otra vez para confirmar.</div>`;
  }
  m.loans.forEach(l=>{
    const armed=(_delLoanArmed===(m.id+"|"+l.id));
    const _cu=(l.cuotas&&l.cuotas.length===l.n)?l.cuotas:ayudaCuotas(l.capital,l.n,l.rate).cuotas;
    const _iguales=_cu.every(x=>x===_cu[0]);
    const _txt=_iguales
      ?`${l.n} cuotas de ${fmtEur(_cu[0])} € · total ${fmtEur(l.total)} €`
      :`${l.n} cuotas · total ${fmtEur(l.total)} € (${fmtEur(Math.max(..._cu))} € y ${fmtEur(Math.min(..._cu))} €)`;
    h+=`<div class="mg-loan"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
      <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:#555">${l.gMonth} ${l.gYear} · ${fmtEur(l.capital)} €</div><div style="font-size:12px;color:#999">${_txt}</div></div>
      <button class="edit-btn" style="padding:6px 10px;font-size:12px" onclick="openModal('editloan',{mid:'${esc(m.id)}',lid:'${esc(l.id)}'})">✏️</button>
      <button class="del-btn ${armed?"armed":""}" style="padding:6px 10px;font-size:12px" onclick="delLoan('${esc(m.id)}','${esc(l.id)}')">${armed?"¿Seguro?":"✕"}</button>
    </div></div>`;
  });
  h+=`<button class="add-loan-btn" onclick="solDesdeGestion('${esc(m.id)}')">+ Nueva solicitud</button>`; // v45.16: las ayudas nuevas entran por Solicitudes
  if((m.history||[]).length>0){
    h+=`<button class="add-loan-btn" style="background:#EFE7DC;color:#7A6A55;margin-top:6px" onclick="openModal('histloan',{mid:'${esc(m.id)}'})">📋 Historial de ayudas (${(m.history||[]).length})</button>`;
  }
  if(!isT){ // Dar de baja: solo asociados (los terceros salen del grupo por otro mecanismo — ver TAREA FUTURA)
    h+=`<button class="add-loan-btn" style="background:#FDECE8;color:#C0492C;margin-top:6px" onclick="openSalida('${esc(m.id)}')">🚪 Salida del fondo</button>`;
  }
  h+=`</div>`;
  return h;
}

// v45.1: retiradas del beneficio guardado sin salir (PE-5, PE-7) con su gestión de pago
function historicoRetiradasHTML(){
  const lista=[]; DATA.members.forEach(m=>(m.retiradas||[]).filter(r=>!r.anulada).forEach(r=>lista.push({m,r})));
  lista.sort((a,b)=>b.r.finIdx-a.r.finIdx||a.m.name.localeCompare(b.m.name));
  let h=`<div class="mes-card"><div class="mes-title" style="margin-bottom:10px">💶 Retiradas de beneficio (sin salir)</div>`;
  if(!lista.length)return h+`<div style="text-align:center;padding:12px;color:var(--muted);font-size:13px">Aún no hay retiradas anotadas. Se anotan al ampliar la permanencia (⚙️) o en el aniversario de la indefinida (aviso del cierre).</div></div>`;
  lista.forEach(({m,r})=>{
    const imp=importeRetirada(m,r), k="anular-"+r.id, armado=!!DESP[k];
    h+=`<div style="border:1px solid #ece5da;border-radius:14px;padding:12px 14px;margin-bottom:12px;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div><div style="font-size:16px;font-weight:800;color:var(--dark)">${escH(m.name)}</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:2px">${r.motivo==="aniv"?"Aniversario de la indefinida":"Al ampliar su permanencia"} · beneficio hasta ${_txtIdx(r.finIdx)}</div></div>
        <span style="flex-shrink:0;font-size:12px;font-weight:800;padding:4px 10px;border-radius:20px;background:${r.pagada?"#E3F1E7":"#FDECE8"};color:${r.pagada?"#1B7A3D":"#C0492C"}">${r.pagada?"✓ Pagado":"Pendiente"}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14.5px;margin-top:10px"><span>Importe${r.pagada?"":" (provisional)"}</span><b>${fmtEur(imp)} €</b></div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Se paga del 5 al 10 de ${_txtIdx(pagoRetiradaIdx(r))}${r.pagada&&r.fechaPagada?` · pagado el ${escH(r.fechaPagada)}`:""}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button onclick="setPagoRetirada('${esc(m.id)}','${esc(r.id)}','pagada',${r.pagada?"false":"true"})" style="flex:2;padding:11px;border-radius:10px;border:1.5px solid ${r.pagada?"#D9C9B0":"#2D6A4F"};background:${r.pagada?"#fff":"#2D6A4F"};color:${r.pagada?"#8A7A60":"#fff"};font-size:14px;font-weight:800;cursor:pointer">${r.pagada?"↩ Marcar como pendiente":"✓ Marcar como pagada"}</button>
        ${r.pagada?"":`<button onclick="${armado?`setPagoRetirada('${esc(m.id)}','${esc(r.id)}','anular',true)`:`DESP['${k}']=true;render()`}" style="flex:1;padding:11px;border-radius:10px;border:1.5px solid #D9C9B0;background:${armado?"#C0492C":"#fff"};color:${armado?"#fff":"#8A7A60"};font-size:13px;font-weight:700;cursor:pointer">${armado?"¿Anular?":"Anular"}</button>`}
      </div></div>`;
  });
  return h+`</div>`;
}
