// Nuevos Horizontes · reglas.js
// Reglas y cálculos del fondo (Documento Maestro): aportes, cuotas, retorno, beneficios, permanencia, pausa, salidas, auditoría
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).

// Devuelve la cuota "activa" de una ayuda en el mes-año dado.
// Lógica:
//  1) Si hay alguna cuota anterior al mes actual sin pagar (atraso), devolver la más antigua.
//  2) Si no hay atrasos y la cuota del mes actual existe y no está pagada, devolverla.
//  3) Si no hay atrasos y la cuota del mes actual está pagada (o no existe),
//     devolver la siguiente cuota futura no pagada (cascada).
function activePayIndex(loan,rm,ry){
  const ri=MONTHS.indexOf(rm);
  // 1) Buscar atraso más antiguo (cuotas estrictamente anteriores al mes actual)
  for(let i=0;i<loan.pays.length;i++){
    const p=loan.pays[i];
    if(p.paid)continue;
    const pi=MONTHS.indexOf(p.m);
    const isBefore=(p.y<ry)||(p.y===ry&&pi<ri);
    if(isBefore)return i;
  }
  // 2) ¿Hay cuota del mes actual sin pagar?
  for(let i=0;i<loan.pays.length;i++){
    const p=loan.pays[i];
    if(p.m===rm&&p.y===ry&&!p.paid)return i;
  }
  // 3) Cascada: primera cuota futura sin pagar — SOLO a partir del día de aviso
  // (si no, una cuota de un mes que aún no ha llegado se vería "POR PAGAR").
  if(avisoSiguienteActivo()){
    for(let i=0;i<loan.pays.length;i++){
      if(!loan.pays[i].paid)return i;
    }
  }
  return -1;
}

// Construye el orden de la lista única en pantalla principal:
// 1) Asociados con ayudas activas (con sus terceros referidos justo debajo)
// 2) Asociados sin ayudas activas (con sus terceros referidos justo debajo)
// 3) Terceros huérfanos (sin asociado avalista que coincida) al final
function buildOrderedMembers(){
  const asoc=DATA.members.filter(m=>m.type==="asociado");
  const terc=DATA.members.filter(m=>m.type==="tercero");
  // Clave de fecha de ingreso (año*100+mes) para ordenar cronológicamente
  const ingresoKey=m=>{
    const mi=MONTHS.indexOf(m.joinMonth);
    return (m.joinYear||9999)*100+(mi>=0?mi:99);
  };
  // Asociados por orden de ingreso a la asociación (más antiguos primero)
  const asocOrdenados=[...asoc].sort((a,b)=>ingresoKey(a)-ingresoKey(b));
  // Terceros al final, ordenados por nº de ayudas activas (más ayudas primero)
  const ayudasActivas=m=>m.loans.filter(l=>l.pays.some(p=>!p.paid)).length;
  const tercOrdenados=[...terc].sort((a,b)=>ayudasActivas(b)-ayudasActivas(a));
  return [...asocOrdenados,...tercOrdenados];
}

// Fusiona un tercero existente en un asociado nuevo cuando comparten nombre.
// Mantiene historial, ayudas activas y aportes; convierte el tipo a asociado.
function mergeTerceroIntoAsociado(name,joinMonth,joinYear){
  const key=_normNombre(name); // mismo criterio que el detector y la auditoría (control 7)
  const tercero=DATA.members.find(m=>m.type==="tercero"&&_normNombre(m.name)===key);
  if(!tercero)return false;
  // Antes de perder el ref: congelar en cada ayuda a nombre de quién estaba avalada,
  // para conservar esa constancia. Solo se rellena si falta; nunca se pisa una condición
  // histórica ya registrada (mismo criterio "texto congelado" que addLoanSubmit).
  const avalNombre=avalistaNombre(tercero);
  if(avalNombre&&avalNombre!=="⚠️ avalista no encontrado"){
    [...(tercero.loans||[]),...(tercero.closedLoans||[])].forEach(l=>{
      if(l.tipoEnConcesion===undefined)l.tipoEnConcesion="tercero";
      if(l.avalistaEnConcesion===undefined||l.avalistaEnConcesion===null)l.avalistaEnConcesion=avalNombre;
    });
  }
  tercero.type="asociado";
  tercero.convertido=true;   // marca deliberada: sanitizeData respeta esta conversión y no la revierte con INITIAL
  tercero.ref=null;
  tercero.joinMonth=joinMonth||DATA.reportMonth;
  tercero.joinYear=joinYear||DATA.reportYear;
  if(!tercero.history)tercero.history=[];
  if(!tercero.phone)tercero.phone="";
  return true;
}

// Resuelve el nombre del avalista de un tercero a partir de su avalistaId (m.ref).
// Busca en TODOS los miembros (no solo activos) para no romper apoyos vivos cuyo
// avalista ya no esté activo. Si el id no resuelve, avisa en vez de romper el render.
function avalistaNombre(m){
  if(!m||!m.ref)return null;
  const a=DATA.members.find(x=>x.id===m.ref);
  return a?a.name:"⚠️ avalista no encontrado";
}


function memberMonths(m){
  if(!m.joinMonth||!m.joinYear)return 0;
  const ji=MONTHS.indexOf(m.joinMonth),jy=m.joinYear;
  const ri=MONTHS.indexOf(DATA.reportMonth),ry=DATA.reportYear;
  return (ry-jy)*12+(ri-ji)+1-mesesPausaAntes(m,ry*12+ri+1); // v45.33: sin los meses de pausa
}
// Nº de cuotas mensuales REALMENTE marcadas como pagadas (aportes[id]===true),
// no meses de permanencia transcurridos.
function aportesPagadosCount(m){
  if(!DATA.monthlyData)return 0;
  let n=0;
  Object.values(DATA.monthlyData).forEach(md=>{ if(md.aportes&&md.aportes[m.id]===true)n++; });
  return n;
}
function memberTotalAportes(m){
  if(!m.joinMonth)return 0;
  return totalAportadoMiembro(m);
}
// v45 (Maestro v18.2 · AP-1..AP-4): cada mes el asociado pone 50, 100, 150 o 200 €.
// m.aporte = APORTE HABITUAL (lo que suele poner; la hoja de cobro lo propone).
// DATA.extras[id][mes].monto = AJUSTE de ese mes respecto al habitual (puede ser negativo:
// habitual 100 que un mes pone 50 → −50). Aporte del mes = habitual + ajuste.
const APORTE_OPCIONES=REGLAS.APORTE_OPCIONES; // v45.38: la regla vive en js/maestro.js
function aporteBaseDe(m){ return (m&&m.aporte)||DATA.monthlyFee; }
function ajusteAporteKey(m,key){ const e=DATA.extras&&DATA.extras[m.id]&&DATA.extras[m.id][key]; return (e&&e.monto)||0; }
function aporteBrutoKey(m,key){ return Math.max(0,aporteBaseDe(m)+ajusteAporteKey(m,key)); }
function aporteBrutoMes(m,rm,ry){ return aporteBrutoKey(m,getMesKey(rm,ry)); }
// Total aportado = suma del aporte de cada mes PAGADO (se devuelve al terminar o salir · AP-5)
function totalAportadoMiembro(m){
  if(!DATA.monthlyData)return 0;
  let t=0;
  Object.keys(DATA.monthlyData).forEach(k=>{ const md=DATA.monthlyData[k]; if(md&&md.aportes&&md.aportes[m.id]===true)t+=aporteBrutoKey(m,k); });
  return t;
}

// Total real de aportes de un mes: aporte de cada asociado que pagó (50 o 100)
// + sus aportes extra de ese mes. Refleja el dinero real aportado.
function totalAportesMes(rm,ry){
  const md=getMesData(rm,ry);
  const aportes=(md&&md.aportes)||{};
  const mesKey=getMesKey(rm,ry);
  let t=0;
  DATA.members.forEach(m=>{
    if(m.type==="tercero")return;
    if(aportes[m.id]) t+=aporteNetoMes(m,rm,ry); // v45: aporte elegido ese mes − bono por referido
  });
  return t;
}

// Salidas por devoluciones de aportaciones puntuales en un mes (capital+5% que se
// devuelve al aportante). Es dinero que SALE del fondo ese mes.
function salidasPuntualesMes(rm,ry){
  let t=0;
  if(DATA.aportesPuntuales){
    Object.values(DATA.aportesPuntuales).forEach(arr=>{
      (arr||[]).forEach(ap=>{ if(ap.mesDev===rm&&ap.anioDev===ry) t+=ap.total; });
    });
  }
  return t;
}
// Desglose de las devoluciones de aportes puntuales que TOCAN devolverse en rm/ry,
// separando lo ya devuelto de lo aún pendiente (devuelto:false). Ambos importes salen
// del disponible: el pendiente es un compromiso ya adquirido, no dinero disponible.
function salidasPuntualesSplit(rm,ry){
  let devuelto=0,pendiente=0;const items=[];
  if(DATA.aportesPuntuales){
    Object.entries(DATA.aportesPuntuales).forEach(([mid,arr])=>{
      (arr||[]).forEach(ap=>{
        if(ap.mesDev===rm&&ap.anioDev===ry){
          const nom=(DATA.members.find(x=>x.id===mid)||{}).name||"";
          if(ap.devuelto){devuelto+=ap.total;}else{pendiente+=ap.total;}
          items.push({nombre:nom,total:ap.total,devuelto:!!ap.devuelto});
        }
      });
    });
  }
  return {devuelto,pendiente,total:devuelto+pendiente,items};
}

function due(m,rm,ry){
  // Suma la cuota cuyo mes es EXACTAMENTE rm/ry (no la próxima sin pagar),
  // incluyendo ayudas cerradas (una cuota pagada ese mes es devolución contable real).
  // Usa cuotaDe() (respeta aplazamientos y ayudas sin migrar) — no leer l.inst aquí.
  let t=0;
  const todas=[...(m.loans||[]),...(m.closedLoans||[])];
  todas.forEach(l=>{
    l.pays.forEach((p,i)=>{ if(p.m===rm&&p.y===ry) t+=cuotaDe(l,i); });
  });
  return Math.round(t*100)/100;
}
// Pendiente real de una ayuda: suma las cuotas NO pagadas usando cuotaDe() (fuente de verdad,
// respeta aplazamientos y genera cuotas al vuelo con ayudaCuotas si la ayuda no está migrada).
function pendLoan(l){
  let t=0;
  l.pays.forEach((p,i)=>{ if(!p.paid) t+=cuotaDe(l,i); });
  return Math.round(t*100)/100;
}
function pendAll(m){let t=0;m.loans.forEach(l=>t+=pendLoan(l));return Math.round(t*100)/100;}

// Cuotas de un miembro que vencen EXACTAMENTE en rm/ry, separando pagado/pendiente.
// (No arrastra atrasos de meses anteriores: solo el mes en curso.)
function dueSplit(m,rm,ry){
  let cobrado=0,pendiente=0;
  const todas=[...(m.loans||[]),...(m.closedLoans||[])];
  todas.forEach(l=>{
    l.pays.forEach((p,i)=>{ if(p.m===rm&&p.y===ry){ const imp=cuotaDe(l,i); if(p.paid)cobrado+=imp; else pendiente+=imp; } });
  });
  cobrado=Math.round(cobrado*100)/100; pendiente=Math.round(pendiente*100)/100;
  return {cobrado,pendiente};
}
// Aportes del mes rm/ry: cobrado (los que pagaron) y pendiente (asociados activos
// con derecho a aportar ese mes que aún no han pagado).
function aportesSplit(rm,ry){
  const md=getMesData(rm,ry);
  const aportes=(md&&md.aportes)||{};
  const ri=MONTHS.indexOf(rm);
  let cobrado=0,pendiente=0;
  DATA.members.forEach(m=>{
    if(m.type==="tercero"||!m.joinMonth)return;
    // Solo cuenta si el asociado ya estaba activo ese mes (ingresó antes o en ese mes)
    const ji=MONTHS.indexOf(m.joinMonth),jy=m.joinYear;
    const activoEseMes=(jy<ry)||(jy===ry&&ji<=ri);
    if(!activoEseMes)return;
    // Baja: desde el mes de baja (inclusive) el asociado deja de aportar, así que
    // no debe contar ni como cobrado ni como pendiente en la recaudación de ese mes.
    if(!cuentaComoActivo(m,getMesKey(rm,ry)))return;
    if(enPausaMes(m,rm,ry))return; // v45.33: en pausa no se pide aporte
    const cuota=aporteNetoMes(m,rm,ry);
    if(aportes[m.id])cobrado+=cuota; else pendiente+=cuota;
  });
  return {cobrado,pendiente};
}

// Recargo por cuota de una ayuda = % del capital (una vez por cuota), en céntimos exactos.
function recargoPorCuota(l){return Math.round(l.capital*((l.rate!=null?l.rate:DATA.rate)/100)*100)/100;}

// Total de una ayuda = capital + recargo simple por cada cuota (capital*rate/100*n),
// SIEMPRE redondeado al alza a euro entero (v44.1 — decisión de Ángel: lo que se cobra
// en mano nunca lleva céntimos; el fondo se queda con la fracción de más). El -1e-9 es
// solo para que el redondeo de coma flotante no empuje un total exacto al euro siguiente.
// rate puede venir undefined (ayudas antiguas) → usa DATA.rate como fallback.
// OJO: esto es independiente de recargoPorCuota(), que se queda en céntimos exactos a
// propósito (es una magnitud contable, no un importe que nadie paga en efectivo).
function ayudaTotal(capital,n,rate){
  const r=(rate!=null?rate:DATA.rate)/100;
  return Math.ceil(capital+capital*r*n-1e-9);
}

// Reparte el total (ya entero) en n cuotas ENTERAS de forma EQUILIBRADA (v44.1,
// corrección de Ángel): las primeras "resto" cuotas llevan 1€ más que el resto —
// el salto máximo entre cuotas es de 1€, nunca se concentra toda la diferencia en
// la última (evita que una última cuota mucho más baja parezca un descuento/error).
// sum(cuotas) === total SIEMPRE.
function ayudaCuotas(capital,n,rate){
  const total=ayudaTotal(capital,n,rate);
  if(!n||n<1)return {total,cuotas:[]};
  const base=Math.floor(total/n);
  const resto=total-base*n; // nº de cuotas (las primeras) que llevan 1€ más
  const cuotas=[];
  for(let i=0;i<n;i++) cuotas.push(i<resto?base+1:base);
  return {total,cuotas};
}

// Importe EXACTO de la cuota i de una ayuda (respeta aplazamientos). Único helper de lectura
// para dinero por-cuota: úsalo en vez de leer l.inst directamente en cualquier sitio nuevo.
function cuotaDe(l,i){
  const p=(l.pays||[])[i];
  if(p&&p.aplazada) return (p.instAplazada!=null?p.instAplazada:recargoPorCuota(l));
  if(l.cuotas&&l.cuotas.length===(l.pays||[]).length) return l.cuotas[i];
  return ayudaCuotas(l.capital,l.n,l.rate).cuotas[i]; // fallback ayudas sin migrar
}

// Recargo automático del mes = suma del recargo de cada cuota PAGADA cuyo mes es rm/ry
function recargoAutoMes(rm,ry){
  let t=0;
  DATA.members.forEach(m=>{
    [...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{
      l.pays.forEach(p=>{ if(p.m===rm&&p.y===ry&&p.paid&&!p.compensada) t+=recargoPorCuota(l); });
    });
  });
  return Math.round(t*100)/100;
}

// La app registra el recargo desde jun-2026. Los meses anteriores son históricos y
// viven en NH_Contabilidad_Maestra.xlsx (hoja Reparto_Mensual, celdas azules fijas).
const RECARGO_DESDE="2026-06";

// Auditoría interna: SOLO informa, nunca corrige nada. Devuelve {errores, advertencias}
// (arrays de texto legible). Recorre TODO DATA (miembros, ayudas, meses) — con ~50-60
// personas y ~55 ayudas es barato, por eso el chip de cabecera puede llamarla en cada render().
function auditarNH(){
  const errores=[],advertencias=[];
  const todasLasAyudas=[]; // {m,l,cerrada} — para controles 3,4,5,11,12
  DATA.members.forEach(m=>{
    (m.loans||[]).forEach(l=>todasLasAyudas.push({m,l}));
    (m.closedLoans||[]).forEach(l=>todasLasAyudas.push({m,l}));
  });

  // 1 y 2: historial vs ayuda vinculada
  DATA.members.forEach(m=>{
    const todas=[...(m.loans||[]),...(m.closedLoans||[])];
    (m.history||[]).forEach(h=>{
      if(h.lid){
        const l=todas.find(x=>x.id===h.lid);
        if(l&&l.capital!==h.capital){
          errores.push(`Historial: ${m.name} — ${h.gMonth} ${h.gYear} capital ${fmtEur(h.capital)}€ ≠ ayuda vinculada (${fmtEur(l.capital)}€)`);
        }
      }else{
        const hayMismoPeriodo=todas.some(l=>l.gMonth===h.gMonth&&l.gYear===h.gYear);
        if(hayMismoPeriodo){
          errores.push(`Historial: ${m.name} — ${h.gMonth} ${h.gYear} sin lid, pero hay una ayuda del mismo periodo sin vincular`);
        }
      }
    });
  });

  // 3 y 4: total y cuotas de cada ayuda
  todasLasAyudas.forEach(({m,l})=>{
    const n=l.n||l.pays.length;
    const totalEsperado=ayudaTotal(l.capital,n,l.rate);
    // v44.17: importeHistorico = apoyo de antes de la regla de redondeo (se cobró el importe exacto de entonces)
    if(!l.importeHistorico&&Math.abs((l.total!=null?l.total:0)-totalEsperado)>0.005){
      errores.push(`Total: ${m.name} — ayuda ${l.gMonth} ${l.gYear} tiene total ${fmtEur(l.total)}€, calculado ${fmtEur(totalEsperado)}€`);
    }
    if(Array.isArray(l.cuotas)){
      const sumaCuotas=Math.round(l.cuotas.reduce((s,c)=>s+c,0)*100)/100;
      const totalRef=l.total!=null?l.total:totalEsperado;
      if(Math.abs(sumaCuotas-totalRef)>0.005){
        errores.push(`Cuotas: ${m.name} — ayuda ${l.gMonth} ${l.gYear} suma de cuotas ${fmtEur(sumaCuotas)}€ ≠ total ${fmtEur(totalRef)}€`);
      }
    }
  });

  // 5: pagos duplicados dentro de una misma ayuda (mismo mes/año dos veces)
  todasLasAyudas.forEach(({m,l})=>{
    const vistos=new Set();
    (l.pays||[]).forEach(p=>{
      const k=p.m+"-"+p.y;
      if(vistos.has(k)){
        errores.push(`Pago duplicado: ${m.name} — ayuda ${l.gMonth} ${l.gYear} tiene dos cuotas en ${p.m} ${p.y}`);
      }
      vistos.add(k);
    });
  });

  // 6: recargo mensual guardado vs calculado, desde RECARGO_DESDE en adelante (no solo
  // el mes activo). Antes de esa fecha el recargo es histórico fijo de la Maestra
  // (Excel) y nunca se llevó en la app — no son errores, se excluyen del todo.
  // Si Ángel lo fijó a mano (recargoManual), es una decisión suya: no se marca como error.
  const mesesRecargoAusente=[];
  Object.keys(DATA.monthlyData||{}).sort().forEach(k=>{
    if(k<RECARGO_DESDE)return; // histórico anterior a la app: vive en la Maestra, no se audita
    const md=DATA.monthlyData[k];
    if(!md||md.recargoManual)return;
    const[ys,ms]=k.split("-");
    const ry=parseInt(ys),rm=MONTHS[parseInt(ms)-1];
    if(!rm)return;
    if(md.recargo==null){
      mesesRecargoAusente.push(`${rm} ${ry}`);
      return;
    }
    const calculado=recargoAutoMes(rm,ry);
    const guardado=md.recargo;
    if(Math.abs(guardado-calculado)>0.005){
      errores.push(`Retorno ${rm} ${ry}: guardado ${fmtEur(guardado)}€, calculado ${fmtEur(calculado)}€ (diferencia ${Math.round((calculado-guardado)*100)/100}€)`);
    }
  });
  if(mesesRecargoAusente.length>0){
    advertencias.push(`${mesesRecargoAusente.length} mes${mesesRecargoAusente.length>1?"es":""} desde ${RECARGO_DESDE} sin retorno registrado en la app (${mesesRecargoAusente.join(", ")}) — revisar si están pendientes de cerrar`);
  }

  // 7: personas duplicadas por nombre (tildes/mayúsculas/espacios)
  {
    const porNombre={};
    DATA.members.forEach(m=>{
      const k=_normNombre(m.name);
      if(!porNombre[k])porNombre[k]=[];
      porNombre[k].push(m);
    });
    Object.values(porNombre).forEach(grupo=>{
      if(grupo.length>1)errores.push(`Nombre duplicado: "${grupo[0].name}" aparece ${grupo.length} veces (ids: ${grupo.map(x=>x.id).join(", ")})`);
    });
  }

  // 8: ids de miembro duplicados
  {
    const vistos={};
    DATA.members.forEach(m=>{
      vistos[m.id]=(vistos[m.id]||0)+1;
    });
    Object.keys(vistos).forEach(id=>{ if(vistos[id]>1)errores.push(`Id de miembro duplicado: "${id}" (${vistos[id]} veces)`); });
  }

  // 9: lids (ids de ayuda) duplicados ENTRE personas distintas
  {
    const dueño={};
    todasLasAyudas.forEach(({m,l})=>{
      if(dueño[l.id]&&dueño[l.id]!==m.id){
        errores.push(`Id de ayuda duplicado: "${l.id}" existe en ${dueño[l.id+"__name"]} y en ${m.name}`);
      }
      dueño[l.id]=m.id; dueño[l.id+"__name"]=m.name;
    });
  }

  // 10: terceros sin avalista
  DATA.members.forEach(m=>{
    if(m.type==="tercero"&&!m.ref)errores.push(`Tercero sin avalista: ${m.name}`);
  });

  // 10b: refs históricas que la migración v11 no pudo resolver de forma segura.
  // Son avisos, nunca autocorrecciones. Se recalculan en cada carga y no se guardan
  // dentro de DATA, por lo que no añaden campos ni alteran el documento histórico.
  (window.NH_TERCEROS_REF_WARNINGS||[]).forEach(aviso=>{
    const tercero=DATA.members.find(m=>m.id===aviso.terceroId);
    const nombre=tercero?tercero.name:aviso.terceroId;
    if(aviso.tipo==="ambiguo"){
      advertencias.push(`Avalista ambiguo: ${nombre} — ${aviso.candidatos.length} asociados coinciden; revisar manualmente`);
    }else if(aviso.tipo==="sin_coincidencia"){
      advertencias.push(`Avalista pendiente: ${nombre} — la referencia histórica no coincide con ningún asociado; revisar manualmente`);
    }else if(aviso.tipo==="nombre_pendiente"){
      advertencias.push(`Avalista pendiente de migración: ${nombre} — revisar manualmente`);
    }
  });

  // 11: reglas del Documento Maestro §11/§12 sobre plazos y capital máximo.
  // MATIZ OBLIGATORIO: plazoBase excluye las cuotas aplazadas (un aplazamiento con causa
  // justificada no convierte una ayuda corta en plazo largo — caso [asociado]).
  todasLasAyudas.forEach(({m,l})=>{
    const nAplazadas=(l.pays||[]).filter(p=>p.aplazada).length;
    const n=l.n||l.pays.length;
    const plazoBase=n-nAplazadas;
    const esTerc=(l.tipoEnConcesion!=null?l.tipoEnConcesion:m.type)==="tercero"; // v44.17: se juzga con la condición de la concesión
    // Doc Maestro §11.1: asociados 100–1.000€ libre; 1.000–3.000€ con aprobación previa
    // del coordinador (aviso, no error); por encima de 3.000€ no se concede ninguna ayuda.
    // Terceros: tope fijo de 500€ (no está sujeto a esta escala).
    const R=REGLAS; // v45.38: límites del Maestro desde js/maestro.js
    if(esTerc){
      if(l.capital>R.AYUDA_MAX_CORTA){
        errores.push(`Capital excedido: ${m.name} (tercero) — ayuda ${l.gMonth} ${l.gYear} de ${fmtEur(l.capital)}€ supera el máximo de ${R.AYUDA_MAX_CORTA}€`);
      }
    }else{
      if(l.capital>R.AYUDA_MAX){
        errores.push(`Capital excedido: ${m.name} (asociado) — ayuda ${l.gMonth} ${l.gYear} de ${fmtEur(l.capital)}€ supera el máximo absoluto de ${_miles(R.AYUDA_MAX)}€ (Maestro AY-5)`);
      }else if(l.capital>R.AYUDA_MAX_SIN_APROBACION){
        advertencias.push(`Requiere aprobación del coordinador: ${m.name} (asociado) — ayuda ${l.gMonth} ${l.gYear} de ${fmtEur(l.capital)}€ está entre ${_miles(R.AYUDA_MAX_SIN_APROBACION)}€ y ${_miles(R.AYUDA_MAX)}€ (Maestro AY-5)`);
      }
    }
    if(esTerc&&plazoBase>R.CUOTAS_MAX_CORTA){
      errores.push(`Plazo excedido: ${m.name} (tercero) — ayuda ${l.gMonth} ${l.gYear} con plazo base ${plazoBase} meses (máximo ${R.CUOTAS_MAX_CORTA} para terceros)`);
    }
    if(!esTerc&&_idxMes(l.gMonth,l.gYear)>=AY_V18_DESDE){
      const cicloC=l.cicloEnConcesion!=null?l.cicloEnConcesion:m.ciclo;
      if(cicloC===12&&l.capital>R.AYUDA_MAX_CORTA)errores.push(`Importe excedido: ${m.name} — ayuda ${l.gMonth} ${l.gYear} de ${fmtEur(l.capital)}€ con permanencia de 12 meses (máximo ${R.AYUDA_MAX_CORTA} €, Maestro AY-1)`);
    }
    if(!esTerc&&plazoBase>R.CUOTAS_MAX_CORTA){
      const ciclo=l.cicloEnConcesion!=null?l.cicloEnConcesion:m.ciclo;
      const cicloOk=(ciclo===24||ciclo===36||ciclo===0);
      if(!cicloOk){
        errores.push(`Plazo largo sin permanencia suficiente: ${m.name} — ayuda ${l.gMonth} ${l.gYear} con plazo base ${plazoBase} meses requiere permanencia de 24, 36 meses o indefinida; tenía ${ciclo===0?"indefinida":ciclo+" meses"} (Maestro AY-1)`);
      }
    }
  });

  // 11b (v45 · Maestro PE-1): asociados activos sin permanencia guardada (la ficha no debe suponer 12)
  DATA.members.filter(m=>m.type==="asociado"&&!m.baja&&m.ciclo==null).forEach(m=>{
    errores.push(`Sin permanencia: ${m.name} no tiene permanencia guardada — guárdala en Gestión → ⚙️ Permanencia y aporte (Maestro PE-1)`);
  });

  // 12: ayudas sin condición histórica (tipoEnConcesion) — UNA sola advertencia agrupada.
  const sinCondicion=todasLasAyudas.filter(({l})=>l.tipoEnConcesion==null);
  if(sinCondicion.length>0){
    advertencias.push(`${sinCondicion.length} ayuda${sinCondicion.length>1?"s":""} sin condición histórica registrada (tipoEnConcesion/avalistaEnConcesion/cicloEnConcesion) — de antes de esta actualización, no se han migrado`);
  }

  // 13: el plazo del apoyo no puede exceder la permanencia comprometida (el apoyo puede
  // obligar a subir de ciclo, pero no al revés). Ciclo 0 (indefinido) nunca se marca —
  // no tiene fecha de cierre. Solo aplica a asociados con joinMonth conocido.
  todasLasAyudas.forEach(({m,l})=>{
    if(m.type==="tercero"||m.ciclo===0||m.ciclo==null||!m.joinMonth)return;
    const pays=l.pays||[];
    if(!pays.length)return;
    const finCiclo=_finCon(m,m.ciclo); // v45.8 (Maestro v18.5): último mes de permanencia
    const ultima=pays[pays.length-1];
    const idxUltima=_idxMes(ultima.m,ultima.y);
    if(idxUltima>finCiclo){
      errores.push(`Plazo excede permanencia: ${m.name} ${l.id} — la última cuota (${ultima.m} ${ultima.y}) pasa del último mes de su permanencia (${m.ciclo} meses desde ${m.joinMonth} ${m.joinYear}) en ${idxUltima-finCiclo} mes(es)`);
    }
  });

  // 14: nombres citados en aportesPuntuales[*].destino que no corresponden a ninguna
  // persona existente (por nombre normalizado) — detecta solos futuros renombrados
  // que aún no se hayan añadido a ALIAS_NOMBRES (migrateData).
  if(DATA.aportesPuntuales){
    const nombresValidos=new Set(DATA.members.map(m=>_normNombre(m.name)));
    const huerfanos=new Set();
    Object.values(DATA.aportesPuntuales).forEach(arr=>{
      if(!Array.isArray(arr))return;
      arr.forEach(ap=>{
        if(ap&&ap.destino&&!nombresValidos.has(_normNombre(ap.destino))){
          huerfanos.add(ap.destino);
        }
      });
    });
    huerfanos.forEach(nombre=>{
      advertencias.push(`Destino huérfano en aportesPuntuales: "${nombre}" no corresponde a ninguna persona actual — ¿renombrado sin actualizar?`);
    });
  }

  // v44.19: un mismo referido no puede dar bono en dos meses (bono duplicado)
  Object.keys(DATA.referidos||{}).forEach(rid=>{
    const r=DATA.referidos[rid], vistos={};
    Object.keys(r).forEach(k=>String(r[k].nombres||"").split(",").map(x=>x.trim()).filter(Boolean).forEach(nm=>{
      const n=_normNombre(nm); (vistos[n]=vistos[n]||{nombre:nm,meses:[]}).meses.push(k);
    }));
    const quien=(DATA.members.find(m=>m.id===rid)||{}).name||rid;
    Object.values(vistos).filter(v=>v.meses.length>1).forEach(v=>
      advertencias.push(`Bono por referido duplicado: ${quien} tiene el bono de ${v.nombre} en ${v.meses.sort().map(k=>{const[yy,mm]=k.split("-").map(Number);return MONTHS_FULL[mm-1]+" "+yy;}).join(" y ")} — dejarlo solo en un mes (Ficha → 🎁 Referido)`));
  });
  return {errores,advertencias};
}
function invalidateAuditCache(){_audCache=null;_audKey=null;}
function auditarNHCached(){
  const key=(DATA.updatedAt||"")+"|"+(DATA.members||[]).length;
  if(_audKey===key&&_audCache)return _audCache;
  _audCache=auditarNH();_audKey=key;
  return _audCache;
}

// Lista de cuotas cuyo mes es rm/ry (para el bloque de cuotas cobradas del cierre)
// ── CIERRE GRUPAL (varios grupos, persistentes) ──
function gruposCierre(){ if(!DATA.gruposCierre)DATA.gruposCierre=[]; return DATA.gruposCierre; }

// Descuento por referido de un asociado en un mes concreto (misma regla en toda la app):
// 10€ por referido, máximo 3 (30€). Se usa TANTO en la ficha como en el Cierre para
// que las sumas coincidan siempre. Devuelve {nReferidos, descuento}.
function descuentoReferidoMes(mid,rm,ry){
  const refData=(DATA.referidos&&DATA.referidos[mid]&&DATA.referidos[mid][getMesKey(rm,ry)])||null;
  const nReferidos=refData?Math.min(refData.n,REGLAS.REFERIDOS_MAX_MES):0; // v45.38: BO desde js/maestro.js
  return {nReferidos, descuento:nReferidos*REGLAS.BONO_REFERIDO};
}
// v44.17: nombres de las personas referidas que generan el descuento de ese mes.
function nombresReferidosMes(mid,rm,ry){
  const r=(DATA.referidos&&DATA.referidos[mid]&&DATA.referidos[mid][getMesKey(rm,ry)])||null;
  if(!r||!(r.n>0))return [];
  const lista=String(r.nombres||"").split(/\s*,\s*/).map(x=>x.trim()).filter(Boolean);
  return lista.length?lista:["(nombre no registrado)"];
}
// Aporte NETO que corresponde pagar a un asociado ese mes (base − descuento, mínimo 0).
function aporteNetoMes(m,rm,ry){
  const {descuento}=descuentoReferidoMes(m.id,rm,ry);
  return Math.max(0, aporteMostradoMes(m,rm,ry).importe-descuento); // v45: incluye el aporte elegido ese mes
}
function aportePagadoMes(m,rm,ry){ const md=DATA.monthlyData&&DATA.monthlyData[getMesKey(rm,ry)]; return !!(md&&md.aportes&&md.aportes[m.id]===true); }
// En la vista personal, un aporte sin pagar queda «abierto»: no tiene importe (lo elige el asociado
// al pagar) y no suma en los totales; el total muestra lo que sí es fijo (cuotas) «+ tu aporte».
// v45.0 (decisión de Ángel 03/10/2026): en la vista del asociado un aporte sin pagar se muestra
// simplemente como «Aporte 50 €» (el aporte base, Maestro AP-1). Si paga más, Ángel lo cambia en
// el cierre y ya se ve lo pagado. La Guía para asociados explica que puede poner hasta 200 €.
function aporteMostradoMes(m,rm,ry){
  // v45.9 (decisión de Ángel 04/10/2026): quien tiene anotado un aporte habitual mayor de 50 € (AP-4,
  // hoy [asociado] con 100 €) lo ve tal cual, para que su enlace y el del grupo cuadren con el cierre.
  if(vistaPersonal()&&m.type==="asociado"&&!aportePagadoMes(m,rm,ry)){
    if(aporteBaseDe(m)>APORTE_MINIMO)return {importe:aporteBrutoMes(m,rm,ry),abierto:false};
    return {importe:APORTE_MINIMO,abierto:false,base:true};
  }
  return {importe:aporteBrutoMes(m,rm,ry),abierto:false};
}
// v44.12: lo que quedó SIN PAGAR del mes anterior al del reporte (aporte + cuotas).
// Con el cambio automático de mes, evita que una deuda del mes pasado deje de verse.
// Solo lectura: no crea el registro del mes si no existe (regla crítica 7). Las cuotas
// aplazadas no cuentan (tienen su propio tratamiento) y la baja se respeta.
function pendienteMesAnterior(m,rm,ry){
  let pi=MONTHS.indexOf(rm)-1, py=ry; if(pi<0){pi=11;py--;}
  const pm=MONTHS[pi], pk=getMesKey(pm,py);
  let pend=0;
  [...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{
    (l.pays||[]).forEach((p,idx)=>{ if(p.m===pm&&p.y===py&&!p.paid&&!p.aplazada) pend+=cuotaDe(l,idx); });
  });
  const md=DATA.monthlyData&&DATA.monthlyData[pk];
  if(m.type!=="tercero"&&m.joinMonth&&md){
    const ji=MONTHS.indexOf(m.joinMonth), jy=m.joinYear;
    const yaEstaba=(jy<py)||(jy===py&&ji<=pi);
    if(yaEstaba&&cuentaComoActivo(m,pk)&&!enPausaKey(m,pk)&&!(md.aportes&&md.aportes[m.id])){
      if(aporteMostradoMes(m,pm,py).abierto) var aporteAbierto=true; // vista personal: el aporte no tiene importe fijo
      else pend+=aporteNetoMes(m,pm,py);
    }
  }
  return {mes:pm,anio:py,pendiente:Math.round(pend*100)/100,aporteAbierto:!!aporteAbierto};
}
// ── v44.12: BONO POR REFERIDO (Documento Maestro §15.2) ─────────────────────────
// Registra un bono de 10 € para el asociado 'refId' por traer a 'nombre', en el mes
// 'mesKey' ("AAAA-MM"). Máximo 3 bonos por mes: si ese mes ya tiene 3, pasa al
// siguiente con hueco (el excedente no se pierde). Devuelve la clave del mes usado.
function registrarBonoReferido(refId,nombre,mesKey,d){
  d=d||DATA;
  if(!d.referidos)d.referidos={};
  if(!d.referidos[refId])d.referidos[refId]={};
  let [y,mo]=mesKey.split("-").map(Number);
  for(let i=0;i<36;i++){
    const k=y+"-"+String(mo).padStart(2,"0");
    const r=d.referidos[refId][k]||{n:0,nombres:""};
    if((r.n||0)<3){
      const nombres=(r.nombres||"").split(",").map(s=>s.trim()).filter(Boolean);
      nombres.push(nombre);
      d.referidos[refId][k]={n:(r.n||0)+1,nombres:nombres.join(", ")};
      return k;
    }
    mo++; if(mo>12){mo=1;y++;}
  }
  return null;
}
// Mes por defecto del bono: el mes del reporte; si el asociado que refirió ya pagó
// el aporte de ese mes, el siguiente (el descuento ya no se puede aplicar a un aporte cobrado).
function mesBonoPorDefecto(refId){
  const rm=DATA.reportMonth, ry=DATA.reportYear;
  const md=DATA.monthlyData&&DATA.monthlyData[getMesKey(rm,ry)];
  if(!(md&&md.aportes&&md.aportes[refId]))return getMesKey(rm,ry);
  let i=MONTHS.indexOf(rm)+1,y=ry; if(i>11){i=0;y++;}
  return getMesKey(MONTHS[i],y);
}
// Opciones del selector de mes del bono: 3 meses antes, el del reporte y 3 después.
function opcionesMesBono(selKey){
  const ri=MONTHS.indexOf(DATA.reportMonth),ry=DATA.reportYear;let h="";
  for(let i=-3;i<=3;i++){
    let mi=ri+i,yi=ry; while(mi<0){mi+=12;yi--;} while(mi>11){mi-=12;yi++;}
    const k=getMesKey(MONTHS[mi],yi);
    h+=`<option value="${k}" ${k===selKey?"selected":""}>${MONTHS_FULL[mi]} ${yi}</option>`;
  }
  return h;
}
// Alta: al elegir "¿Quién lo trajo?", se propone el mes del bono (modificable).
function altaReferidoCambio(){
  const refId=document.getElementById("m-refdo")?.value||"";
  const w=document.getElementById("m-bono-wrap"); if(!w)return;
  if(!refId){w.style.display="none";return;}
  const def=mesBonoPorDefecto(refId);
  document.getElementById("m-bono-mes").innerHTML=opcionesMesBono(def);
  const ref=DATA.members.find(x=>x.id===refId);
  const nom=ref?ref.name.split(" ")[0]:"el asociado";
  const repKey=getMesKey(DATA.reportMonth,DATA.reportYear);
  document.getElementById("m-bono-hint").textContent= def!==repKey
    ? `${nom} ya pagó el aporte de ${MONTHS_FULL[MONTHS.indexOf(DATA.reportMonth)]}, por eso el bono se propone para el mes siguiente. Puedes cambiarlo.`
    : `Se descontarán 10 € del aporte de ${nom} en el mes elegido. Puedes cambiarlo.`;
  w.style.display="block";
}
// Guarda quién trajo al nuevo asociado (ID, regla crítica 9) y le activa el bono al que refirió.
function aplicarReferidoAlta(m,refId,mesKey){
  if(!m||!refId)return null;
  m.referidoPor=refId;
  // v44.19: si quien lo trajo ya tiene el bono de esta persona en algún mes, no se duplica.
  const ya=mesBonoDe(refId,m.name);
  if(ya){ aplicarReferidoAlta.yaExistia=true; return ya; }
  aplicarReferidoAlta.yaExistia=false;
  return registrarBonoReferido(refId,m.name,mesKey||mesBonoPorDefecto(refId));
}
// v44.19: mes ("AAAA-MM") en el que 'refId' ya tiene registrado el bono por 'nombre', o null.
function mesBonoDe(refId,nombre,d){
  d=d||DATA; const r=(d.referidos&&d.referidos[refId])||{}; const n=_normNombre(nombre);
  return Object.keys(r).sort().find(k=>String(r[k].nombres||"").split(",").map(x=>_normNombre(x)).includes(n))||null;
}
// v44.19: quita el bono por 'nombre' de la ficha de 'refId' en los meses cuyo aporte aún no
// se ha cobrado (los meses ya cobrados no se tocan: ese descuento ya se aplicó en caja).
// Devuelve {quitados:[meses], cobrados:[meses que se dejan]}.
function quitarBonoReferido(refId,nombre){
  const out={quitados:[],cobrados:[]};
  const r=DATA.referidos&&DATA.referidos[refId]; if(!r)return out;
  const n=_normNombre(nombre);
  Object.keys(r).forEach(k=>{
    const lista=String(r[k].nombres||"").split(",").map(x=>x.trim()).filter(Boolean);
    if(!lista.some(x=>_normNombre(x)===n))return;
    const md=DATA.monthlyData&&DATA.monthlyData[k];
    if(md&&md.aportes&&md.aportes[refId]){ out.cobrados.push(k); return; }
    const resto=lista.filter(x=>_normNombre(x)!==n);
    const nNuevo=Math.max(0,(r[k].n||0)-(lista.length-resto.length));
    if(nNuevo>0)r[k]={n:nNuevo,nombres:resto.join(", ")}; else delete r[k];
    out.quitados.push(k);
  });
  if(Object.keys(r).length===0)delete DATA.referidos[refId];
  return out;
}
// PARCHE PUNTUAL (una sola vez, idempotente) — datos dados por Ángel el 23/09/2026:
// deja constancia de quién trajo a cada asociado y acredita los 6 bonos que faltaban.
// Los 6 bonos pendientes van a Octubre 2026 (primer mes con aporte aún sin cobrar; no se
// tocan meses ya cerrados). Si hace falta, el mes se cambia en Ficha → 🎁 Referido.
// v45.35: en septiembre 2026 quedó una marca de aporte de una ficha que ya no existe
// (m1788619343091, creada y borrada). No contaba en ningún total; se quita una sola vez.
// Solo esa marca y solo si esa ficha sigue sin existir.
function parcheAporteHuerfano2026(data){
  if(!data||!Array.isArray(data.members)||!data.members.length)return;
  if(data.parches&&data.parches.aporteHuerfano2026_09)return;
  const id="m1788619343091";
  if(data.members.some(m=>m.id===id))return;
  const ap=data.monthlyData&&data.monthlyData["2026-09"]&&data.monthlyData["2026-09"].aportes;
  if(ap&&Object.prototype.hasOwnProperty.call(ap,id))delete ap[id];
  if(!data.parches)data.parches={};
  data.parches.aporteHuerfano2026_09=true;
}
function parcheBonosReferidos2026(data){
  if(!data||!data.members)return;
  const byId=id=>data.members.find(m=>m.id===id);
  // [nuevo asociado, quién lo trajo] — por ID, nunca por nombre
  const conBono=[["23","20"],["22","21"],["25","21"],["24","22"],["27","22"]]; // ya tenían su bono registrado
  const pendientes=[["26","6"],["m1785779716462","20"],["m1786048607199","4"],["m1786181034106","2"],["m1788688212630","20"],["m1788793088810","26"]];
  [...conBono,...pendientes].forEach(([nid,rid])=>{const n=byId(nid);if(n&&byId(rid)&&n.referidoPor===undefined)n.referidoPor=rid;});
  if(!data.parches)data.parches={};
  if(data.parches.bonosReferidos2026_09)return;
  if(!pendientes.every(([nid,rid])=>byId(nid)&&byId(rid)))return; // datos incompletos (p.ej. el archivo base): no marcar
  const yaTiene=(rid,nombre)=>Object.values((data.referidos&&data.referidos[rid])||{})
    .some(r=>(r.nombres||"").split(",").map(s=>_normNombre(s)).includes(_normNombre(nombre)));
  pendientes.forEach(([nid,rid])=>{const n=byId(nid); if(!yaTiene(rid,n.name))registrarBonoReferido(rid,n.name,"2026-10",data);});
  data.parches.bonosReferidos2026_09=true;
}
// ── v44.13: PAGO DE DEVOLUCIONES POR BAJA ─────────────────────────────────────
// Es devolución del CAPITAL aportado (no un gasto): sale del fondo el mes en que se
// PAGA. Mes de pago: el que fije el administrador (b.pagoMonth/pagoYear) o, por
// defecto, el mes siguiente a la baja (día 5, decisión de Ángel). Si se paga con la
// reserva (b.conReserva), la reserva aporta ese importe y el mes no lo soporta.
function mesPagoBaja(b){
  if(b.pagoMonth&&b.pagoYear)return {mes:b.pagoMonth,anio:b.pagoYear};
  const i=MONTHS.indexOf(b.month);
  return {mes:MONTHS[(i+1)%12],anio:b.year+(i+1>=12?1:0)};
}
function bajasDelMes(rm,ry){
  return DATA.members.filter(m=>{if(!m.baja)return false;const p=mesPagoBaja(m.baja);return p.mes===rm&&p.anio===ry;});
}
// Resumen de las bajas que se pagan en rm/ry (total, parte con reserva, parte ya pagada).
function resumenBajasMes(rm,ry){
  const bm=bajasDelMes(rm,ry), suma=f=>bm.filter(f).reduce((s,m)=>s+(datosBaja(m).total||0),0);
  // v45.1 (fase de crecimiento, Maestro v18.3 FO-2/FO-5): la reserva es solo un dato informativo,
  // así que «con la reserva» ya no descuenta nada del mes: el dinero sale de la caja.
  return {lista:bm,total:suma(()=>true),reserva:0,reservaInfo:suma(m=>m.baja.conReserva),
    pagadas:suma(m=>m.baja.pagada),pagadasReserva:0};
}
// v45.1: retiradas de beneficio que se pagan en rm/ry (total y parte ya pagada)
function retiradasMes(rm,ry){
  const idx=_idxMes(rm,ry), lista=[];
  DATA.members.forEach(m=>retiradasDe(m).forEach(r=>{ if(pagoRetiradaIdx(r)===idx)lista.push({m,r,imp:importeRetirada(m,r)}); }));
  return {lista,total:_r2(lista.reduce((s,x)=>s+x.imp,0)),pagadas:_r2(lista.filter(x=>x.r.pagada).reduce((s,x)=>s+x.imp,0))};
}
// Acción explícita del administrador (Histórico): mes de pago, "con la reserva" y "pagada".
function setPagoBaja(mid,campo,valor){
  const m=DATA.members.find(x=>x.id===mid); if(!m||!m.baja)return;
  const b=m.baja;
  if(campo==="mes"){const[mm,yy]=String(valor).split("|");b.pagoMonth=mm;b.pagoYear=parseInt(yy);b.fechaPago=(b.v18?"del 5 al 10 de "+MONTHS_FULL[MONTHS.indexOf(mm)].toLowerCase():"5 "+MONTHS_FULL[MONTHS.indexOf(mm)])+" "+yy;}
  if(campo==="reserva")b.conReserva=!!valor;
  if(campo==="pagada"){
    if(b.v18&&valor){ const d=salidaV18(m,_idxMes(b.ultimoMes,b.ultimoAnio)); _fijarCifrasBaja(m,d);
      const p=mesPagoBaja(b); if(d.ayuda.n>0)_compensarAyudas(m,_idxMes(p.mes,p.anio),false); }
    if(b.v18&&!valor)_compensarAyudas(m,0,true);
    b.pagada=!!valor;b.estado=valor?"Pagado":"Pendiente";b.fechaPagada=valor?new Date().toLocaleDateString("es-ES"):null;}
  save();render();
  toast(campo==="pagada"?(valor?"✓ Devolución marcada como pagada":"Devolución marcada como pendiente"):"Pago de la baja actualizado ✓");
}
function pendienteMesAnteriorHTML(m,rm,ry){
  const p=pendienteMesAnterior(m,rm,ry);
  if(!(p.pendiente>0)&&!p.aporteAbierto)return "";
  const mf=(typeof MONTHS_FULL!=="undefined"?MONTHS_FULL[MONTHS.indexOf(p.mes)]:p.mes);
  const que=p.pendiente>0?`${fmtEur(p.pendiente)} €${p.aporteAbierto?` y tu aporte de ${escH(mf.toLowerCase())}`:""}`:`tu aporte de ${escH(mf.toLowerCase())}`;
  return `<div style="margin-top:10px;padding:9px 12px;border-radius:10px;background:rgba(233,196,106,.14);border:1px solid rgba(233,196,106,.5);color:#F1D58A;font-size:12.5px;font-weight:700;line-height:1.4">⚠️ Además queda pendiente de ${escH(mf)} ${p.anio}: ${que}</div>`;
}

// Items (aporte + cuotas) de un miembro en el mes seleccionado
function itemsDeMiembro(mid,rm,ry,cuotasPre){ // v45.42: cuotasPre = cuotasDelMes(rm,ry) ya calculado (listas largas)
  rm=rm||DATA.reportMonth; ry=ry||DATA.reportYear; // v45.13: mes opcional (cuenta del grupo del mes anterior)
  const m=DATA.members.find(x=>x.id===mid);
  if(!m)return [];
  const items=[];
  if(m.type==="asociado"&&!enPausaMes(m,rm,ry)){ // v45.33: en pausa no hay aporte que cobrar
    const md=getMesData(rm,ry);
    const pagado=!!(md.aportes&&md.aportes[m.id]);
    const {nReferidos,descuento}=descuentoReferidoMes(m.id,rm,ry);
    const neto=aporteNetoMes(m,rm,ry);
    // v44.20: con bono por referido se muestran también los nombres de los referidos
    const nomRef=descuento>0?nombresReferidosMes(m.id,rm,ry):[];
    const concepto=descuento>0?`Aporte mensual (−${descuento}€ por ${nReferidos} referido${nReferidos>1?"s":""})`
      +`<div style="font-size:12px;color:#8A6D1E;margin-top:2px">🎁 ${nomRef.map(escH).join(", ")}</div>`:"Aporte mensual";
    items.push({tipo:"aporte",mid:m.id,nombre:m.name,concepto,importe:neto,yaPagado:pagado});
  }
  (cuotasPre||cuotasDelMes(rm,ry)).filter(c=>c.mid===mid).forEach(c=>{
    items.push({tipo:"cuota",mid:c.mid,lid:c.lid,pi:c.pi,nombre:c.nombre,concepto:etiquetaCuota(c.numCuota,c.totalCuotas),importe:c.inst,recargo:c.recargo,yaPagado:c.paid,aplazada:c.aplazada});
  });
  return items;
}
function itemsDeGrupo(g,rm,ry,cuotasPre){ // v45.42: cuotasPre opcional (ver itemsDeMiembro)
  const ids=[g.principalId,...(g.miembros||[])];
  let items=[];
  ids.forEach(id=>{ items=items.concat(itemsDeMiembro(id,rm,ry,cuotasPre)); });
  return items;
}
// Dinero previsto de la asociación en un mes siguiente: aportes + cuotas que tocan ese mes − salidas comprometidas de ese mes (sin sobrante del mes anterior)
function previstoMes(mi){ return _sinCrearMes(mi,()=>{ const {mes,anio}=_mesDeIdx(mi); let ent=0;
  DATA.members.filter(m=>activoEnReporte(m)).forEach(m=>itemsDeMiembro(m.id,mes,anio).forEach(it=>{ ent+=it.importe; }));
  const sal=_r2(salidasPrevistas(mes,anio).lista.filter(x=>x.clase==="comp"&&x.pagoIdx===mi).reduce((a,x)=>a+x.importe,0));
  return {ent:_r2(ent),sal,prev:_r2(ent-sal)}; }); }
// Dinero del mes para ayudas: lo cobrado (marcado en el cierre, o entregado por el principal de un grupo)
// − lo que ya salió este mes − las salidas comprometidas que se pagan este mes (FO-4)
function dineroAyudasMes(){
  _CAJA_CACHE=null;
  const rm=DATA.reportMonth, ry=DATA.reportYear, idx=_idxMes(rm,ry), key=getMesKey(rm,ry);
  const c=cajaMensual()[key]||{salidas:0,apoyos:0,puntIn:0};
  const enGrupo=new Set(), grupos=[];
  gruposCierre().forEach(g=>{ const p=DATA.members.find(m=>m.id===g.principalId); if(!p)return;
    [g.principalId,...(g.miembros||[])].forEach(x=>enGrupo.add(x));
    const items=itemsDeGrupo(g), total=_r2(items.reduce((a,it)=>a+it.importe,0)), pagado=_r2(items.filter(it=>it.yaPagado).reduce((a,it)=>a+it.importe,0));
    const movs=_cgMovs(key,g.id), ent=_r2(movs.filter(x=>x.tipo==="entrega"||x.tipo==="ayuda").reduce((a,x)=>a+x.importe,0));
    grupos.push({g,p,total,cobrado:Math.max(pagado,ent)}); });
  let rT=0,rC=0; DATA.members.filter(m=>!enGrupo.has(m.id)&&activoEnReporte(m)).forEach(m=>itemsDeMiembro(m.id).forEach(it=>{ rT+=it.importe; if(it.yaPagado)rC+=it.importe; }));
  const cobrado=_r2(grupos.reduce((a,x)=>a+x.cobrado,0)+rC+(c.puntIn||0));
  const porPagar=_r2(salidasPrevistas(rm,ry).lista.filter(x=>x.clase==="comp"&&x.pagoIdx<=idx).reduce((a,x)=>a+x.importe,0));
  const salido=_r2(c.salidas||0), disponible=_r2(cobrado-salido-porPagar);
  // v45.23: lo previsto del mes (mismas cuentas que lo cobrado) para «si se cobra todo»
  const previsto=_r2(grupos.reduce((a,x)=>a+x.total,0)+rT), cobradoMes=_r2(grupos.reduce((a,x)=>a+Math.min(x.cobrado,x.total),0)+rC);
  const porCobrar=Math.max(0,_r2(previsto-cobradoMes)), alCierre=_r2(disponible+porCobrar);
  return {grupos,resto:{total:_r2(rT),cobrado:_r2(rC)},puntIn:c.puntIn||0,cobrado,salido,ayudasDadas:c.apoyos||0,gastos:c.gastos||0,porPagar,disponible,previsto,porCobrar,alCierre,enCaja:_r2(cobrado-salido)};
}

function cuotasDelMes(rm,ry){
  const out=[];
  DATA.members.forEach(m=>{
    [...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{
      l.pays.forEach((p,pi)=>{
        if(p.m===rm&&p.y===ry&&!p.compensada){ // v45.1: compensada al pagar una baja (SA-10)
          const rec=recargoPorCuota(l);
          const imp=cuotaDe(l,pi); // aplazada = solo retorno; normal = cuota exacta (l.cuotas)
          const cap=p.aplazada?0:Math.round((imp-rec)*100)/100;
          out.push({mid:m.id,nombre:m.name,tipo:m.type,lid:l.id,pi,inst:imp,
            recargo:rec,capital:cap,paid:p.paid,aplazada:!!p.aplazada,
            numCuota:pi+1,totalCuotas:l.pays.length,gMonth:l.gMonth,gYear:l.gYear});
        }
      });
    });
  });
  // asociados primero, terceros después
  return out.sort((a,b)=>(a.tipo===b.tipo?0:a.tipo==="asociado"?-1:1));
}
// Recalcula los importes de un apoyo. ÚNICA función (junto con ayudaCuotas) que puede
// escribir total/inst/cuotas — ver REGLA PERMANENTE en las instrucciones del proyecto.
// - Sin cuotas aplazadas: usa ayudaCuotas tal cual (total y cuotas exactas, en euros
//   enteros, sum(cuotas)===total).
// - Con cuotas APLAZADAS: la aplazada paga en efectivo instAplazada = Math.ceil(capital*
//   tasa/100) — euro entero, v44.1 (NO es recargoPorCuota: esa función se queda en
//   céntimos exactos a propósito para recargoAutoMes/control 6/banner, que son magnitudes
//   contables, no importes que nadie paga en mano). El resto del total (también entero,
//   mismo criterio que ayudaTotal) se reparte de forma EQUILIBRADA entre las cuotas
//   normales (salto máximo de 1€, mismo criterio que ayudaCuotas — no se concentra la
//   diferencia en una sola cuota). l.cuotas queda en el mismo orden que l.pays;
//   l.total=suma(l.cuotas).
// l.inst queda solo como referencia visual (1ª cuota normal); el cálculo real usa l.cuotas.
function recalcularApoyo(l){
  const tasa=(l.rate!=null?l.rate:DATA.rate);
  l.n=l.pays.length;
  const nAplazadas=l.pays.filter(p=>p.aplazada).length;
  if(nAplazadas===0){
    const{total,cuotas}=ayudaCuotas(l.capital,l.n,tasa);
    l.total=total; l.cuotas=cuotas; l.inst=cuotas[0];
    return;
  }
  const instAplazada=Math.ceil(l.capital*(tasa/100)-1e-9); // importe en efectivo, euro entero
  const totalAyuda=ayudaTotal(l.capital,l.n,tasa); // también entero, mismo criterio que sin aplazadas
  const nNormales=l.n-nAplazadas;
  const restante=totalAyuda-nAplazadas*instAplazada; // lo que queda por repartir entre las normales
  // Reparto EQUILIBRADO (mismo criterio que ayudaCuotas): las primeras "restoN"
  // cuotas normales llevan 1€ más — salto máximo de 1€ entre cuotas normales.
  const baseN=nNormales>0?Math.floor(restante/nNormales):0;
  const restoN=nNormales>0?restante-baseN*nNormales:0;
  const cuotas=[];
  let iNormal=0;
  l.pays.forEach(p=>{
    if(p.aplazada){
      p.instAplazada=instAplazada;
      cuotas.push(instAplazada);
    }else{
      cuotas.push(iNormal<restoN?baseN+1:baseN);
      iNormal++;
    }
  });
  l.cuotas=cuotas;
  l.total=cuotas.reduce((s,c)=>s+c,0);
  const iPrimeraNormal=l.pays.findIndex(p=>!p.aplazada);
  l.inst=iPrimeraNormal>=0?cuotas[iPrimeraNormal]:instAplazada;
}
// Total previsto hasta 'fin' (incluido): aportes pagados + los que le quedan desde el mes de reporte
// (con su aporte actual), y el beneficio de cada uno (se anota el mes siguiente). Menos lo ya retirado.
// Los meses pasados sin pagar no cuentan. Es una previsión: el importe exacto sale al pagar.
function totalPrevistoPerm(m,fin){
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear); let cap=0,ben=0;
  for(let i=_idxMes(m.joinMonth,m.joinYear);i<=fin;i++){
    const k=_keyDeIdx(i), nk=_keyDeIdx(i+1), a=aporteBrutoKey(m,k);
    if(_aportePagadoKey(m,k)){ cap+=a; ben+=beneficioMiembroDesglose(m,nk).total; }
    else if(i>=idx&&!enPausaIdx(m,i)){ const h=BENEFICIO_MES[nk], base=h!==undefined?h:tarifaNivelMes(m,nk);
      const bl=k>=V18_APORTES_DESDE?Math.max(0,Math.min(4,Math.floor(a/50))):(a>=100?2:1);
      cap+=a; ben+=_r2(base*bl); }
  }
  const ret=beneficioRetirado(m);
  return {capital:_r2(cap),beneficio:_r2(ben),total:_r2(cap+ben-ret),soloBeneficio:Math.max(0,_r2(ben-ret))};
}
function permanenciasLista(){
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), out=[];
  DATA.members.forEach(m=>{
    if(m.type!=="asociado"||!activoEnReporte(m))return;
    if(!m.joinMonth||m.ciclo==null){ out.push({m,tipo:"sin",orden:1e9}); return; }
    const ini=_idxMes(m.joinMonth,m.joinYear);
    if(m.ciclo===0){
      let aniv=idx; for(let a=idx;a<idx+60;a++){ const n=_mesesPerm(m,a); if(!enPausaIdx(m,a)&&n>=12&&n%12===0){ aniv=a; break; } } // v45.33: sin contar pausas
      const ret=retiradasDe(m).find(r=>r.finIdx===aniv);
      out.push({m,tipo:"indef",ini,fin:aniv,n:_mesesPerm(m,aniv),ret,prox:aniv-idx<=2,orden:5e8+aniv,
        importe:ret?importeRetirada(m,ret):totalPrevistoPerm(m,aniv).soloBeneficio});
      return;
    }
    const fin=_finCon(m,m.ciclo);
    const estado=idx>fin?"pasada":fin-idx<=1?"decide":fin-idx===2?"pronto":"normal";
    out.push({m,tipo:"fija",ini,fin,estado,prox:fin-idx<=2,orden:fin,importe:totalPrevistoPerm(m,fin).total});
  });
  out.sort((a,b)=>a.orden-b.orden||String(a.m.name).localeCompare(String(b.m.name)));
  return out;
}
function validarApoyo(m,cap,nn,tipo,ciclo,ini,concedida){
  const nom=escH(m?m.name.split(" ")[0]:"Esta persona");
  const v17=concedida&&_idxMes(concedida.m,concedida.y)<AY_V18_DESDE;
  const dondePerm="Gestión → ⚙️ Permanencia y aporte";
  const R=REGLAS; // v45.38: límites del Maestro desde js/maestro.js
  if(cap<R.AYUDA_MIN)return {bloqueo:`El mínimo de una ayuda es ${R.AYUDA_MIN} € (Maestro AY-1).`};
  if(tipo==="tercero"||tipo==="libre"){
    if(cap>R.AYUDA_MAX_CORTA)return {bloqueo:`Un ${tipo==="libre"?"asociado libre":"tercero"} puede recibir como máximo ${R.AYUDA_MAX_CORTA} € (Maestro AY-1).`};
    if(nn>R.CUOTAS_MAX_CORTA)return {bloqueo:`Un ${tipo==="libre"?"asociado libre":"tercero"} devuelve la ayuda en ${R.CUOTAS_MAX_CORTA} cuotas como máximo (Maestro AY-1).`};
    return {};
  }
  if(ciclo==null)return {bloqueo:`${nom} no tiene permanencia guardada. Guárdala primero en ${dondePerm} (Maestro PE-1).`};
  if(cap>R.AYUDA_MAX)return {bloqueo:`El máximo de una ayuda es ${_miles(R.AYUDA_MAX)} € (Maestro AY-5).`};
  if(nn>R.CUOTAS_MAX)return {bloqueo:`Una ayuda se devuelve en ${R.CUOTAS_MAX} cuotas como máximo (Maestro AY-1).`};
  if(ciclo===12&&(nn>R.CUOTAS_MAX_CORTA||(!v17&&cap>R.AYUDA_MAX_CORTA))){
    return {bloqueo:v17
      ?`Con permanencia de 12 meses, la ayuda se devuelve en ${R.CUOTAS_MAX_CORTA} cuotas como máximo (regla del v17).`
      :`Con permanencia de 12 meses, ${nom} puede recibir de ${R.AYUDA_MIN} a ${R.AYUDA_MAX_CORTA} € y devolverlos en ${R.CUOTAS_MAX_CORTA} cuotas como máximo (Maestro AY-1). Para más importe o más plazo, sube primero su permanencia a 24, 36 meses o indefinida en ${dondePerm}.`};
  }
  // No puede pasar del final de su permanencia (Maestro AY-1 y AY-6; misma regla que la auditoría, control 13)
  if(!v17&&ciclo!==0&&ini&&m&&m.joinMonth){
    const fin=_finCon(m,ciclo), ult=_idxMes(ini.m,ini.y)+nn-1; // v45.8 (Maestro v18.5): fin = último mes de permanencia
    if(ult>fin){
      const t=x=>MONTHS_FULL[x%12].toLowerCase()+" "+Math.floor(x/12);
      return {bloqueo:`La última cuota sería en ${t(ult)}, pero la permanencia de ${nom} (${ciclo} meses) termina en ${t(fin)} y la última cuota tiene que pagarse como mucho ese mes (Maestro AY-1). Usa menos cuotas o sube primero su permanencia en ${dondePerm}.`};
    }
  }
  if(cap>R.AYUDA_MAX_SIN_APROBACION)return {aviso:`Entre ${_miles(R.AYUDA_MAX_SIN_APROBACION)} € y ${_miles(R.AYUDA_MAX)} € necesita la aprobación previa del coordinador (Maestro AY-5).`};
  return {};
}
function _condicionActual(m){ return {tipo:m?m.type:"asociado", ciclo:m&&m.ciclo!=null?m.ciclo:null}; } // v45: sin permanencia guardada → se bloquea (PE-1)
// v45.28: si una ayuda nueva no cabe por la permanencia, botón para ampliarla sin salir de la ayuda.
// Abre la MISMA ventana «⚙️ Permanencia y aporte» y, al guardar, vuelve a la ayuda con los datos puestos.
function permNecesariaApoyo(m,cap,nn,ini){
  if(!m||m.type!=="asociado"||m.ciclo==null||m.ciclo===0)return null;
  for(const c of [24,36,0]){ if(c!==0&&c<=m.ciclo)continue; if(!validarApoyo(m,cap,nn,"asociado",c,ini).bloqueo)return c; }
  return null;
}

// Devuelve el "mes objetivo" del asociado: el primer mes (desde el mes del
// reporte hacia adelante) en el que todavía queda algo pendiente — ya sea el
// aporte mensual sin marcar o alguna cuota de ayuda de ese mes sin pagar.
// Si junio está completo (aporte Y cuotas), avanza solo a julio, etc.
function mesObjetivo(m){
  const esTerc=m.type==="tercero";
  let mi=MONTHS.indexOf(DATA.reportMonth);
  let y=DATA.reportYear;
  // Tope normal: el mes de reporte (nadie "debe" un mes que aún no ha llegado).
  // A partir del día de aviso (por defecto 25), se permite avanzar UN mes más,
  // para que los que pagan por anticipado vean ya el próximo pago pendiente.
  const permiteSiguiente = avisoSiguienteActivo(); // v44.12: no adelanta si la app ya pasó de mes
  const topeMi=mi + (permiteSiguiente?1:0);
  const todosLoans=[...(m.loans||[]),...(m.closedLoans||[])];
  // Avanzar como máximo 24 meses para evitar bucles
  for(let step=0; step<24; step++){
    const mm=MONTHS[mi%12];
    const yy=y+Math.floor(mi/12);
    // ¿aporte de este mes pendiente? (terceros no pagan aporte)
    const md=getMesData(mm,yy);
    const aporteOk = esTerc ? true : (!!(md.aportes&&md.aportes[m.id])||enPausaMes(m,mm,yy));
    // ¿alguna cuota de ayuda corresponde a este mes y está sin pagar?
    let cuotaPendiente=false;
    todosLoans.forEach(l=>{
      l.pays.forEach(p=>{
        if(p.m===mm && p.y===yy && !p.paid)cuotaPendiente=true;
      });
    });
    // Este mes tiene algo pendiente si: el aporte falta, o hay una cuota sin pagar
    if((!esTerc && !aporteOk) || cuotaPendiente){
      return {mes:mm, anio:yy};
    }
    // Todo cubierto en este mes. No pasar del tope permitido: si ya llegamos,
    // el asociado está al día (aunque haya adelantado meses futuros).
    if(mi>=topeMi){
      const tm=MONTHS[topeMi%12], ty=DATA.reportYear+Math.floor(topeMi/12);
      return {mes:tm, anio:ty};
    }
    mi++;
  }
  // Fallback: mes del reporte
  return {mes:DATA.reportMonth, anio:DATA.reportYear};
}

// Total de lo que corresponde a una ficha en el MES DE REPORTE (Opción A):
// aporte (con descuento por referido) + TODAS las cuotas de ese mes (aplazadas
// cuentan su retorno). "Al día" SOLO si aporte Y todas las cuotas están pagados.
// Función única usada por la ficha personal y el reporte grupal para que nunca
// se descuadren entre sí.
function totalDelMes(m,rm,ry){
  const esTerc=m.type==="tercero";
  const md=getMesData(rm,ry);
  // Aporte (terceros no aportan)
  const enPausa=!esTerc&&enPausaMes(m,rm,ry); // v45.33
  const aportePagado=(esTerc||enPausa)?true:!!(md.aportes&&md.aportes[m.id]);
  // Aporte neto = base + extra puntual − descuento por referido (mínimo 0)
  const aporteImporte=(esTerc||enPausa)?0:aporteNetoMes(m,rm,ry); // v45: aporte elegido ese mes − bono
  // Cuotas que vencen ESTE mes (todos los apoyos), con importe real (aplazada=retorno)
  const cuotas=[];
  [...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{
    l.pays.forEach((p,idx)=>{
      if(p.m===rm&&p.y===ry){
        const imp=cuotaDe(l,idx);
        cuotas.push({inst:imp,paid:!!p.paid,aplazada:!!p.aplazada,idx,loan:l});
      }
    });
  });
  const totalCuotas=Math.round(cuotas.reduce((s,c)=>s+c.inst,0)*100)/100;
  const total=Math.round(((esTerc?0:aporteImporte)+totalCuotas)*100)/100; // total del mes (todo lo que corresponde)
  // Pendiente = lo que aún NO está pagado
  const aportePend=(!esTerc&&!aportePagado)?aporteImporte:0;
  const cuotasPend=Math.round(cuotas.filter(c=>!c.paid).reduce((s,c)=>s+c.inst,0)*100)/100;
  const pendiente=Math.round((aportePend+cuotasPend)*100)/100;
  // Al día SOLO si aporte pagado (o tercero) Y todas las cuotas pagadas
  const alDia=(esTerc||aportePagado)&&cuotas.every(c=>c.paid);
  return {total,pendiente,alDia,aporteImporte,aportePagado,cuotas,totalCuotas,esTerc};
}

function desgloseDelMes(m){
  // El cuadro se basa en el MES OBJETIVO (próximo mes con algo pendiente),
  // no en el mes del sistema. Así, al pagar junio completo, salta a julio.
  const obj=mesObjetivo(m);
  const rm=obj.mes, ry=obj.anio;
  const md=getMesData(rm,ry);
  const fee=DATA.monthlyFee;

  // Aporte base
  const enPausaD=m.type!=="tercero"&&enPausaMes(m,rm,ry); // v45.33
  const aportePagado=!!(md.aportes&&md.aportes[m.id])||enPausaD;
  const apExtra=0; // v45: el aporte elegido ese mes ya va en aporteBrutoMes

  // Descuento por referidos
  const refData=(DATA.referidos&&DATA.referidos[m.id]&&DATA.referidos[m.id][getMesKey(rm,ry)])||null;
  const nReferidos=refData?Math.min(refData.n,3):0;
  const descuento=nReferidos*10;

  // Cuotas que corresponden EXACTAMENTE al mes objetivo (no adelantar la
  // siguiente por cascada). Si la cuota de este mes ya está pagada, se muestra
  // marcada como pagada; la del mes siguiente no aparece hasta que el mes
  // objetivo avance (día de aviso). El desplegable de Ayudas sigue mostrando todas.
  const cuotasMes=[];
  const todosLoans=[...(m.loans||[]),...(m.closedLoans||[])];
  todosLoans.forEach(l=>{
    (l.pays||[]).forEach((p,idx)=>{
      if(p.m===rm && p.y===ry){
        const imp=cuotaDe(l,idx);
        cuotasMes.push({loan:l,idx,inst:imp,paid:p.paid,aplazada:!!p.aplazada});
      }
    });
  });
  // Solo suman al total las cuotas de este mes que estén SIN pagar
  const totalCuotas=Math.round(cuotasMes.reduce((s,c)=>s+(c.paid?0:c.inst),0)*100)/100;

  // Total neto — terceros solo pagan cuotas, no aporte mensual
  const esTerc=m.type==="tercero";
  const apNeto=(esTerc||enPausaD)?0:aporteNetoMes(m,rm,ry); // v45 · v45.33: en pausa, 0
  const totalNeto=Math.round((apNeto+totalCuotas)*100)/100;

  // Valores de PENDIENTE REAL (descontando lo ya pagado), para el cuadro individual:
  // si el aporte del mes objetivo ya está pagado, no cuenta como pendiente.
  const apNetoPend = (esTerc || aportePagado) ? 0 : apNeto;
  const totalPendiente = Math.round((apNetoPend+totalCuotas)*100)/100; // totalCuotas ya excluye las pagadas
  const alDia = totalPendiente===0;

  return{fee,apExtra,descuento,nReferidos,cuotasMes,totalCuotas,apNeto,totalNeto,apNetoPend,totalPendiente,alDia,aportePagado,esTerc,mesObj:rm,anioObj:ry};
}


// Suma de todos los aportes extra registrados de un miembro (todos los meses)
function totalExtrasMiembro(m){
  const ex=(DATA.extras&&DATA.extras[m.id])||{};
  return Object.values(ex).reduce((s,e)=>s+((e&&e.monto)||0),0);
}

// v44.17 — Etiqueta de una cuota: la última se nombra como tal ("Última cuota") para que el
// asociado sepa que con ella termina el apoyo; si el apoyo es de una sola cuota, "Cuota única".
function esUltimaCuota(loan,pi){ return !!loan&&Array.isArray(loan.pays)&&loan.pays.length>1&&pi===loan.pays.length-1; }
// v44.17 — ¿Ha subido de nivel el beneficio por permanencia este mes o el anterior (respecto
// al mes del sistema)? Devuelve {antes,ahora,nivel,meses,mesNombre,anio,doble} o null. El
// aviso se ve en la ficha durante el mes de la subida y el siguiente. Solo lectura: no escribe.
function subidaNivelReciente(m,rm,ry){
  if(!m||m.type!=="asociado"||!m.joinMonth||!m.joinYear)return null;
  const k=(y,i)=>y+"-"+String(i+1).padStart(2,"0");
  const i0=MONTHS.indexOf(rm);
  for(let atras=0;atras<=1;atras++){
    let i=i0-atras,y=ry; if(i<0){i+=12;y--;}
    let ip=i-1,yp=y; if(ip<0){ip+=12;yp--;}
    if(!cuentaComoActivo(m,k(y,i)))continue;
    const antes=tarifaNivelMes(m,k(yp,ip)), ahora=tarifaNivelMes(m,k(y,i));
    if(antes>0&&ahora>antes){
      const nivel=ahora>=15?3:2;
      return {antes,ahora,nivel,meses:nivel===3?24:12,
              mesNombre:MONTHS_FULL[i].toLowerCase(),anio:y,doble:false};
    }
  }
  return null;
}
// v45 (Maestro v18.2 · PE-5, PE-7): permanencias que terminan (aviso un mes antes) y aniversarios
// de la indefinida (cada 12 meses puede retirar el beneficio guardado). Solo lectura.
function avisosPermanencia(rm,ry){
  const idx=_idxMes(rm,ry), out=[];
  const t=x=>MONTHS_FULL[x%12].toLowerCase()+" "+Math.floor(x/12);
  DATA.members.forEach(m=>{
    if(m.type!=="asociado"||!m.joinMonth||m.ciclo==null||!activoEnReporte(m))return;
    const ini=_idxMes(m.joinMonth,m.joinYear);
    { const p=pausaVigente(m); if(p&&!p.vuelveOk&&idx===p.desde+p.meses-1){ out.push({m,tipo:"pausa",fin:p.desde+p.meses,txt:`Termina su pausa en ${t(idx)}: vuelve a aportar en ${t(p.desde+p.meses)}. ¿Vuelve o sale?`}); return; } } // v45.33
    if(m.ciclo===0){
      for(const fin of [idx,idx+1]){ // aniversario este mes o el siguiente
        const n=_mesesPerm(m,fin); if(enPausaIdx(m,fin))continue; // meses de permanencia cumplidos en 'fin' (sin pausas)
        if(n>=12&&n%12===0){ out.push({m,tipo:"aniv",fin,txt:`Cumple ${n} meses de permanencia indefinida en ${t(fin)}: puede retirar su beneficio guardado (hoy ${fmtEur(beneficioGuardado(m))} €) y seguir.`}); break; }
      }
      return;
    }
    const fin=_finCon(m,m.ciclo); // último mes de su permanencia (v45.33: + pausas)
    if(idx===fin-1||idx===fin){
      out.push({m,tipo:"fin",fin,txt:`Su permanencia de ${m.ciclo} meses termina en ${t(fin)}. Acordad si amplía (puede retirar su beneficio guardado, hoy ${fmtEur(beneficioGuardado(m))} €) o termina (cobra en ${t(fin+1)}).`});
    }else if(idx>fin){
      out.push({m,tipo:"pasada",fin,txt:`Su permanencia de ${m.ciclo} meses terminó en ${t(fin)} y no consta que la haya ampliado. Anota la decisión: amplía en ⚙️ Permanencia y aporte, o da la salida.`});
    }
  });
  return out;
}
// v45.1 (Maestro v18.3 · FO-4): salidas de dinero de este mes y del siguiente. «Comprometido» =
// ya decidido (salidas, retiradas de beneficio, aportes temporales a devolver); «posible» =
// permanencias que terminan o aniversarios de la indefinida sin decisión anotada. Solo lectura.
function salidasPrevistas(rm,ry){
  const idx=_idxMes(rm,ry), hasta=idx+1, out=[];
  DATA.members.forEach(m=>{
    if(m.baja&&!m.baja.pagada){ const p=mesPagoBaja(m.baja), pi=_idxMes(p.mes,p.anio);
      if(pi<=hasta)out.push({m,clase:"comp",tipo:"baja",pagoIdx:pi,importe:datosBaja(m).total,txt:"Salida del fondo"}); }
    retiradasDe(m).forEach(r=>{ if(r.pagada)return; const pi=pagoRetiradaIdx(r);
      if(pi<=hasta)out.push({m,clase:"comp",tipo:"retirada",pagoIdx:pi,importe:importeRetirada(m,r),txt:"Retira su beneficio guardado"}); });
    if(m.type!=="asociado"||m.baja||!m.joinMonth||m.ciclo==null)return;
    if(m.ciclo>0){ const fin=finPermanenciaIdx(m);
      if(fin+1>=idx-2&&fin+1<=hasta&&!retiradasDe(m).some(r=>r.finIdx===fin)){
        const d=salidaV18(m,fin);
        out.push({m,clase:"pos",tipo:"fin",pagoIdx:fin+1,importe:d.total,retira:Math.max(0,_r2(d.generado-d.retirado)),txt:`Termina su permanencia de ${m.ciclo} meses`}); }
    } else {
      const ini=_idxMes(m.joinMonth,m.joinYear);
      for(const fin of [idx-1,idx]){ const n=_mesesPerm(m,fin); if(n>=12&&n%12===0&&!retiradasDe(m).some(r=>r.finIdx===fin)){
        const imp=Math.max(0,_r2(aportesConBeneficio(m,fin).reduce((s,a)=>s+a.ben,0)-beneficioRetirado(m)));
        out.push({m,clase:"pos",tipo:"aniv",pagoIdx:fin+1,importe:imp,txt:`Cumple ${n} meses de indefinida: puede retirar su beneficio`}); } }
    }
  });
  Object.entries(DATA.aportesPuntuales||{}).forEach(([mid,arr])=>(arr||[]).forEach(a=>{
    if(a.devuelto)return; const pi=_idxMes(a.mesDev,a.anioDev);
    if(pi<=hasta){ const m=DATA.members.find(x=>x.id===mid)||{name:"—",id:mid}; out.push({m,clase:"comp",tipo:"temporal",pagoIdx:pi,importe:a.total,txt:"Devolución de aporte temporal"}); }
  }));
  out.sort((a,b)=>a.pagoIdx-b.pagoIdx||String(a.m.name).localeCompare(String(b.m.name)));
  const sum=c=>_r2(out.filter(x=>x.clase===c).reduce((s,x)=>s+x.importe,0));
  return {lista:out,comprometido:sum("comp"),posible:sum("pos")};
}
function memberLevel(m){
  const months=memberMonths(m);
  if(months<=12)return 1;
  if(months<=24)return 2;
  return 3;
}
function levelBenefit(m){
  const lv=memberLevel(m);
  const R=REGLAS, base=lv===1?R.BENEFICIO_ANIO1:lv===2?R.BENEFICIO_ANIO2:R.BENEFICIO_ANIO3; // v45.38: js/maestro.js
  return base*Math.min(R.BLOQUES_MAX,Math.floor(aporteBaseDe(m)/R.BLOQUE_APORTE)); // v45: por cada 50 € del aporte habitual
}

// Beneficio real pagado por mes (fuente: Reparto_Mensual del Excel).
// Meses históricos con recargo real medido (hasta jun 2026): valor de la tabla.
const BENEFICIO_MES = {
  "2025-09": 2.50,
  "2025-10": 5.00,
  "2025-11": 105/13, // v44.17: exacto (105 € entre 13); antes 8.08 → 105,04 € (4 céntimos de más)
  "2025-12": 10.00,
  "2026-01": 10.00,
  "2026-02": 10.00,
  "2026-03": 10.00,
  "2026-04": 10.00,
  "2026-05": 10.00,
  "2026-06": 10.00,
};
// Beneficio por NIVEL de permanencia (réplica de Reparto_Mensual del Excel).
// "Meses vencidos" = idx(mes) - idx(ingreso): el mes de ingreso cuenta 0 y el primer
// beneficio es el mes siguiente (a mes vencido, §5.1 del Maestro). Nivel 1 = 10 € (1-12) ·
// Nivel 2 = 12 € (13-24, ciclo != 12) · Nivel 3 = 15 € (>=25, ciclo 36 o indefinido).
// Un ciclo 12 que pasa del mes 12 se queda en Nivel 1.
function tarifaNivelMes(m, mesKey){
  if(!m.joinMonth || !m.joinYear) return 0;
  const [y,mm]=mesKey.split("-").map(Number);
  const idxK = y*12 + mm;                                // mm es 1-based, igual que el Excel
  const idxJoin = m.joinYear*12 + (MONTHS.indexOf(m.joinMonth)+1);
  const elapsed = idxK - idxJoin - mesesPausaAntes(m, y*12+mm-1); // meses vencidos (mes de ingreso = 0) · v45.33: sin los de pausa
  if(elapsed < 1) return 0;                              // aún no genera beneficio
  const ciclo = (m.ciclo != null ? m.ciclo : 12);       // 0 = indefinido
  if(elapsed <= 12) return REGLAS.BENEFICIO_ANIO1;       // Nivel 1 · v45.38: importes desde js/maestro.js (BE-2)
  if(elapsed <= 24 && ciclo !== 12) return REGLAS.BENEFICIO_ANIO2; // Nivel 2 (ciclo != 12)
  if(elapsed >= 25 && (ciclo === 36 || ciclo === 0)) return REGLAS.BENEFICIO_ANIO3; // Nivel 3 (ciclo 36 o indefinido)
  return REGLAS.BENEFICIO_ANIO1;                         // ciclo 12 tras el mes 12, etc. → Nivel 1
}
function beneficioRealMes(mesKey){
  // Solo meses históricos (tabla). Para meses futuros devuelve undefined y el importe
  // lo resuelve por NIVEL beneficioMiembroDesglose (tarifaNivelMes).
  return BENEFICIO_MES[mesKey];
}
// Desglose del beneficio de un miembro para el mes 'mesKey' (mes en que se COBRA, a mes vencido).
// El aporte que genera el beneficio es el del MES ANTERIOR (el extra de junio se refleja en julio).
function beneficioMiembroDesglose(m, mesKey){
  const historico = BENEFICIO_MES[mesKey];
  const base = (historico !== undefined) ? historico : tarifaNivelMes(m, mesKey);
  const keyAporte = mesKeyAnterior(mesKey);
  const aportadoEseMes = aporteBrutoKey(m,keyAporte);
  const bloques = bloquesBeneficio(m,keyAporte,aportadoEseMes);
  // v44.17: los meses históricos (BENEFICIO_MES) no se redondean mes a mes: 105 € entre 13 da
  // 8,0769… a cada uno y la suma cuadra al céntimo; el total acumulado se redondea al final.
  const r2=x=>historico!==undefined?x:Math.round(x*100)/100;
  const total = r2(base*bloques);
  const benBase = r2(base*Math.min(bloques,1));               // primer bloque de 50 €
  const benExtra = r2(total-benBase);                         // bloques 2.º a 4.º
  return { base: benBase, extra: benExtra, total, tieneExtra: bloques>1, bloques, keyAporte };
}
// v45 (Maestro v18.2 · BE-1, BE-4, BE-7): el beneficio es por cada bloque de 50 € aportado ese
// mes (máx. 4) y un mes sin aporte pagado no gana. v45.20 (Maestro v18.8 · BE-7): desde los
// aportes de OCTUBRE 2026 (antes noviembre). Hasta septiembre 2026, regla v17: doble si el aporte
// del mes fue de 100 € o más.
const V18_APORTES_DESDE="2026-10";
function bloquesBeneficio(m,keyAporte,aportado){
  if(keyAporte>=V18_APORTES_DESDE){
    const md=DATA.monthlyData&&DATA.monthlyData[keyAporte];
    const pagado=!!(md&&md.aportes&&md.aportes[m.id]===true);
    return pagado?Math.max(0,Math.min(REGLAS.BLOQUES_MAX,Math.floor(aportado/REGLAS.BLOQUE_APORTE))):0; // v45.38: BE-1 desde js/maestro.js
  }
  return aportado>=100?2:1;
}
function beneficioMiembroMes(m, mesKey){
  return beneficioMiembroDesglose(m, mesKey).total;
}

function memberBenefitAccum(m){
  // Beneficio real acumulado desde el mes SIGUIENTE al ingreso hasta el mes de reporte
  // (mes vencido: el beneficio de agosto se cobra en septiembre)
  if(!m.joinMonth||!m.joinYear)return 0;
  const MS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  let total=0;
  const ji=MS.indexOf(m.joinMonth),jy=m.joinYear;
  const ri=MS.indexOf(DATA.reportMonth),ry=DATA.reportYear;
  // Primer mes con derecho = mes siguiente al ingreso
  // Iterar desde ese mes hasta reportMonth (inclusive)
  let cm=(ji+1)%12, cy=jy+(ji+1>=12?1:0);
  const rmIdx=ri, ryIdx=ry;
  while(cy<ryIdx||(cy===ryIdx&&cm<=rmIdx)){
    const key=cy+"-"+String(cm+1).padStart(2,"0");
    total+=beneficioMiembroMes(m,key);
    cm++; if(cm>=12){cm=0;cy++;}
  }
  return Math.round(total*100)/100;
}

// ── BAJA DE ASOCIADO (salida anticipada, §7 del Documento Maestro) ────────────
// La baja es un CAMBIO DE ESTADO: el miembro se conserva con su historial (nunca se
// borra; regla crítica 3). Devolución = capital efectivamente PAGADO + bonificaciones
// de los niveles COMPLETADOS. Nivel completado = 12/24/36 meses PAGADOS (decisión de
// Ángel), topado por el ciclo declarado. El beneficio del nivel en curso se pierde y
// se queda en el fondo. Bonificación por nivel: §6.1 (aporte 50); aporte 100 = el doble.
const BONO_NIVEL = {1:120, 2:144, 3:180};
// Niveles COMPLETADOS según meses realmente pagados, topados por el ciclo declarado.
function nivelesCompletadosPagados(mesesPagados, ciclo){
  let n = 0;
  if(mesesPagados >= 12) n = 1;
  if(mesesPagados >= 24) n = 2;
  if(mesesPagados >= 36) n = 3;
  const tope = (ciclo===12) ? 1 : (ciclo===24) ? 2 : 3; // ciclo 36 o 0(indef) → hasta N3
  return Math.min(n, tope);
}
// Fecha de pago de la devolución: día 5 del mes SIGUIENTE a la baja (decisión de Ángel).
function fechaPagoBaja(mesBaja, anioBaja){
  const i = MONTHS.indexOf(mesBaja);
  const im = (i+1)%12, iy = anioBaja + (i+1>=12 ? 1 : 0);
  return "5 " + MONTHS_FULL[im] + " " + iy;
}
// Beneficio acumulado contando SOLO los meses realmente PAGADOS (decisión de Ángel),
// excluyendo el mes de ingreso (que no genera beneficio, §5.1). Se usa solo para el
// informativo "beneficio perdido"; no altera el total de la devolución.
function beneficioAcumuladoPagados(m){
  if(!DATA.monthlyData || !m.joinMonth || !m.joinYear) return 0;
  const ingKey = m.joinYear + "-" + String(MONTHS.indexOf(m.joinMonth)+1).padStart(2,"0");
  let total = 0;
  Object.keys(DATA.monthlyData).forEach(k=>{
    const md = DATA.monthlyData[k];
    if(md && md.aportes && md.aportes[m.id] === true && k !== ingKey){
      total += beneficioMiembroMes(m, k);
    }
  });
  return Math.round(total*100)/100;
}
// Cálculo de la devolución de una baja. NO marca nada: solo calcula y devuelve el desglose.
function devolucionBaja(m, mesBaja, anioBaja){
  const aporte = m.aporte || DATA.monthlyFee;
  const mesesPagados = aportesPagadosCount(m);
  // v44.19: + aportes extra de meses pagados (Maestro §9.1: se devuelven con el resto del capital)
  const extrasPag = Object.entries((DATA.extras&&DATA.extras[m.id])||{}).reduce((s,[k,e])=>{
    const md=DATA.monthlyData&&DATA.monthlyData[k]; return s+((md&&md.aportes&&md.aportes[m.id]===true&&e&&e.monto)||0);},0);
  const capital = mesesPagados * aporte + extrasPag;           // solo lo efectivamente pagado
  const ciclo = (m.ciclo != null ? m.ciclo : 12);
  const niveles = nivelesCompletadosPagados(mesesPagados, ciclo);
  const mult = (aporte >= 100) ? 2 : 1;                        // §6.2: aporte 100 = el doble
  let beneficioConservado = 0;
  for(let l = 1; l <= niveles; l++) beneficioConservado += BONO_NIVEL[l] * mult;
  const total = capital + beneficioConservado;                // lo que recibe el asociado
  const acumulado = beneficioAcumuladoPagados(m); // solo meses pagados (decisión de Ángel)
  const beneficioPerdido = Math.max(0, Math.round((acumulado - beneficioConservado)*100)/100); // queda en el fondo (informativo)
  return {
    mesesPagados, capital, niveles, beneficioConservado, beneficioPerdido,
    total, fechaPago: fechaPagoBaja(mesBaja, anioBaja)
  };
}
// ¿Es 'm' avalista de alguna ayuda ACTIVA de otro miembro? Devuelve el mensaje de
// bloqueo, o null si puede darse de baja. Control de seguridad simple (Regla 2):
// verificar y bloquear en la misma operación; ante la duda, no permitir.
// PENDIENTE (fase futura): baja de un asociado CON DEUDA PROPIA — compensar la deuda
// contra sus aportes, calcular el faltante, o trasladar la deuda a su avalista. Aquí
// solo se contempla el caso simple: sin deuda propia y sin avalar nada activo.
function motivoBloqueoBaja(m){
  const activa = l => Array.isArray(l.pays) && l.pays.some(p => !p.paid);
  for(const o of DATA.members){
    if(o.id === m.id) continue;
    // (a) tercero avalado por m (o.ref === m.id) con alguna ayuda activa
    if(o.type === "tercero" && o.ref === m.id && (o.loans||[]).some(activa)){
      return `No se puede dar de baja a ${m.name}: es avalista de una ayuda activa de ${o.name} (tercero).`;
    }
    // (b) cualquier ayuda activa que registró a m como avalista en su concesión
    if((o.loans||[]).some(l => l.avalistaEnConcesion === m.id && activa(l))){
      return `No se puede dar de baja a ${m.name}: es avalista de una ayuda activa de ${o.name}.`;
    }
    // (c) v45.1 (Maestro v18.3 · GE-1, SA-6): es aval del asociado que recomendó y este tiene una ayuda activa
    if(o.type === "asociado" && !o.baja && (o.loans||[]).some(activa)){
      const a=avalDe(o);
      if(a && a.m && a.m.id === m.id) return `No puede salir ${m.name} mientras sea aval: ${o.name} (lo recomendó) tiene una ayuda activa (Maestro SA-6).`;
    }
  }
  return null;
}
// Marca la baja (CAMBIO DE ESTADO explícito; nunca desde render(), regla crítica 7).
// Conserva el miembro con su historial; solo añade el objeto 'baja'. Si el asociado
// avala una ayuda activa, NO procede: devuelve {ok:false, motivo} sin tocar nada.
function darDeBaja(m, mesBaja, anioBaja){
  const motivo = motivoBloqueoBaja(m);
  if(motivo) return {ok:false, motivo};
  const d = devolucionBaja(m, mesBaja, anioBaja);
  m.baja = {
    month: mesBaja, year: anioBaja,
    capitalDevuelto: d.capital,
    beneficioConservado: d.beneficioConservado,
    beneficioPerdido: d.beneficioPerdido,
    total: d.total,
    fechaPago: d.fechaPago
  };
  return {ok:true, baja:m.baja};
}
function _aportePagadoKey(m,k){ const md=DATA.monthlyData&&DATA.monthlyData[k]; return !!(md&&md.aportes&&md.aportes[m.id]===true); }
function finPermanenciaIdx(m,ciclo){ const c=(ciclo!==undefined?ciclo:(m&&m.ciclo)); return (m&&m.joinMonth&&c>0)?_idxMes(m.joinMonth,m.joinYear)+c-1+mesesPausaTotal(m):null; } // v45.33: + meses de pausa (PE-8)
// ══ v45.33 · PAUSA DE APORTES (Maestro PE-8) ═══════════════════════════════════════════════
// m.pausas=[{id, desde (idx del 1.er mes de pausa), meses (1–3), creada, ayudaN, ayudaImp, anulada?, cierre?:"salida"}]
function pausasDe(m){ return (m&&Array.isArray(m.pausas)?m.pausas:[]).filter(p=>!p.anulada); }
function enPausaIdx(m,idx){ return pausasDe(m).some(p=>idx>=p.desde&&idx<p.desde+p.meses); }
function enPausaKey(m,key){ const [y,mm]=String(key).split("-").map(Number); return enPausaIdx(m,y*12+mm-1); }
function enPausaMes(m,rm,ry){ return enPausaIdx(m,_idxMes(rm,ry)); }
function mesesPausaAntes(m,idx){ let n=0; pausasDe(m).forEach(p=>{ for(let i=p.desde;i<p.desde+p.meses;i++) if(i<idx)n++; }); return n; }
function mesesPausaTotal(m){ return pausasDe(m).reduce((s,p)=>s+(p.meses||0),0); }
function _mesesPerm(m,i){ return i-_idxMes(m.joinMonth,m.joinYear)+1-mesesPausaAntes(m,i+1); } // meses de permanencia cumplidos en i, sin contar las pausas
function _finCon(m,c){ return _idxMes(m.joinMonth,m.joinYear)+c-1+mesesPausaTotal(m); }
// Pausa en curso o por empezar (la que se gestiona)
function pausaVigente(m){ const idx=_idxMes(DATA.reportMonth,DATA.reportYear); return pausasDe(m).find(p=>p.cierre!=="salida"&&p.desde+p.meses>idx)||null; }
// ¿Puede empezar una pausa en 'desde'? Devuelve {ok, motivo}
function pausaPosible(m,desde){
  if(!m||m.type!=="asociado"||!m.joinMonth||m.ciclo==null||m.baja)return {ok:false,motivo:"Solo para asociados con permanencia, sin salida anotada."};
  const ini=_idxMes(m.joinMonth,m.joinYear), rep=_idxMes(DATA.reportMonth,DATA.reportYear);
  if(desde<rep)return {ok:false,motivo:"La pausa no puede empezar en un mes ya pasado."};
  if(desde<=ini)return {ok:false,motivo:"La pausa no puede empezar en su primer mes."};
  if(m.ciclo===0){ if(pausasDe(m).some(p=>p.desde>desde-REGLAS.PAUSA_INDEFINIDA_CADA))return {ok:false,motivo:"Con permanencia indefinida, solo una pausa cada 12 meses (Maestro PE-8)."}; }
  else { if(pausasDe(m).length)return {ok:false,motivo:"Ya tuvo una pausa en esta permanencia: solo una por permanencia (Maestro PE-8)."};
    const fin=finPermanenciaIdx(m); if(desde>fin)return {ok:false,motivo:"Su permanencia termina antes: no hay meses para la pausa."}; }
  if(_aportePagadoKey(m,_keyDeIdx(desde)))return {ok:false,motivo:`Ya pagó el aporte de ${_txtIdx(desde)}: la pausa tiene que empezar un mes sin aporte pagado.`};
  const ant=desde-1; if(ant>=ini&&!_aportePagadoKey(m,_keyDeIdx(ant)))return {ok:false,motivo:`Para empezar la pausa tiene que estar al día: falta el aporte de ${_txtIdx(ant)}.`};
  let atras=false, despues=false;
  (m.loans||[]).forEach(l=>(l.pays||[]).forEach(q=>{ if(q.paid)return; const qi=_idxMes(q.m,q.y); if(qi<desde)atras=true; if(qi>desde)despues=true; }));
  if(atras)return {ok:false,motivo:"Tiene cuotas de ayuda atrasadas: tiene que estar al día para la pausa."};
  if(despues)return {ok:false,motivo:`Le quedan cuotas de ayuda después de ${_txtIdx(desde)}: para la pausa tiene que pagar lo que le quede, como tarde en ${_txtIdx(desde)} (Maestro PE-8).`};
  return {ok:true};
}
// Aportes PAGADOS desde la entrada hasta 'hastaIdx' (incluido), en orden, con el beneficio que
// genera cada uno (BE-3: se anota el mes siguiente; incluye el histórico BE-6 y los bloques BE-7).
function aportesConBeneficio(m,hastaIdx){
  const out=[]; if(!m||!m.joinMonth)return out;
  for(let i=_idxMes(m.joinMonth,m.joinYear);i<=hastaIdx;i++){
    const k=_keyDeIdx(i); if(!_aportePagadoKey(m,k))continue;
    out.push({idx:i,key:k,aporte:aporteBrutoKey(m,k),ben:beneficioMiembroDesglose(m,_keyDeIdx(i+1)).total});
  }
  return out;
}
// ── Retiradas de beneficio (PE-5 al ampliar · PE-7 cada 12 meses de la indefinida) ──
// m.retiradas = [{id, finIdx (último mes del periodo), motivo:"fin"|"aniv", pagada, importe (se fija
// al pagarla), fechaPagada, anulada}]. Se paga el día 5 del mes siguiente a finIdx.
function retiradasDe(m){ return (m&&Array.isArray(m.retiradas)?m.retiradas:[]).filter(r=>!r.anulada); }
function importeRetirada(m,r){
  if(r.pagada&&typeof r.importe==="number")return r.importe;
  const prev=retiradasDe(m).filter(x=>x!==r&&x.finIdx<r.finIdx).reduce((s,x)=>s+importeRetirada(m,x),0);
  const gen=aportesConBeneficio(m,r.finIdx).reduce((s,a)=>s+a.ben,0);
  return Math.max(0,_r2(gen-prev));
}
function pagoRetiradaIdx(r){ return r.finIdx+1; }
function beneficioRetirado(m){ return _r2(retiradasDe(m).reduce((s,r)=>s+importeRetirada(m,r),0)); }
function beneficioGuardado(m){ return Math.max(0,_r2(memberBenefitAccum(m)-beneficioRetirado(m))); }
// ¿Puede retirar ahora el beneficio de un periodo? Fin de permanencia (al ampliarla) desde el mes
// antes del final; aniversario de la indefinida (meses 12, 24, 36…) del mes antes al siguiente.
function retiradaPosible(m,cicloAnterior){
  if(!m||m.type!=="asociado"||!m.joinMonth||m.baja)return null;
  const idx=_idxMes(DATA.reportMonth,DATA.reportYear), ini=_idxMes(m.joinMonth,m.joinYear);
  const c=(cicloAnterior!==undefined?cicloAnterior:m.ciclo);
  const ya=f=>retiradasDe(m).some(r=>r.finIdx===f);
  if(c>0){ const fin=_finCon(m,c); if(idx>=fin-1&&!ya(fin))return {finIdx:fin,motivo:"fin"}; return null; }
  if(c===0){ for(const fin of [idx-1,idx,idx+1]){ const n=_mesesPerm(m,fin); if(n>=12&&n%12===0&&!ya(fin))return {finIdx:fin,motivo:"aniv"}; } }
  return null;
}
function nuevaRetirada(m,finIdx,motivo){
  if(!Array.isArray(m.retiradas))m.retiradas=[];
  const p=_mesDeIdx(finIdx+1);
  m.retiradas.push({id:"r"+Date.now(),finIdx,motivo,pagoMes:p.mes,pagoAnio:p.anio,pagada:false,creada:new Date().toLocaleDateString("es-ES")});
}
// ── Salida (SA) ──
// SA-10: lo que le quede por devolver de sus ayudas se descuenta de lo que recibe.
const SA10_SOLO_CAPITAL=false; // false = las cuotas que le quedan (capital + retorno) · true = solo el capital pendiente
function ayudaPendienteDe(m){
  let t=0,cap=0,n=0;
  (m.loans||[]).forEach(l=>(l.pays||[]).forEach((p,pi)=>{ if(p.paid)return; n++;
    const c=cuotaDe(l,pi), r=recargoPorCuota(l); t+=c; cap+=p.aplazada?0:Math.max(0,c-r); }));
  return {cuotas:_r2(t),capital:_r2(cap),n,importe:_r2(SA10_SOLO_CAPITAL?cap:t)};
}
// v45.1 (Maestro v18.3 · GE-1): el aval de un asociado es quien lo recomendó. Los 10 fundadores
// (agosto 2025) no tienen aval. Devuelve {fundador} | {m} | {nombre} (solo por el bono) | null.
function esFundador(m){ return !!(m&&m.type==="asociado"&&m.joinMonth==="Ago"&&m.joinYear===2025); }
function avalDe(m){
  if(!m)return null; if(esFundador(m))return {fundador:true};
  const r=m.referidoPor&&DATA.members.find(x=>x.id===m.referidoPor); if(r)return {m:r};
  const n=quienRefirio(m); return n?{nombre:n}:null;
}
function avalTexto(m){ const a=avalDe(m); return !a?"sin aval anotado":a.fundador?"fundador (sin aval)":escH(a.m?a.m.name:a.nombre); }
// SA-10 paso 4: lo que no cubren su beneficio y sus aportes lo paga su aval; si es fundador, el fondo.
function destinoFaltaTexto(m){ const a=avalDe(m);
  return !a?"pasa a su aval (⚠️ sin anotar: anótalo en ⚙️ Permanencia y aporte)":a.fundador?"lo asume el fondo (fundador, sin aval)":`pasa a su aval: <b>${escH(a.m?a.m.name:a.nombre)}</b>`; }
function avisoMesesPorSaldo(saldo){ return saldo>REGLAS.AVISO_SALDO_3_MESES?3:saldo>REGLAS.AVISO_SALDO_2_MESES?2:1; } // SA-1 · v45.38: js/maestro.js
// Salida con las reglas v18. 'ultimoIdx' = último mes en que aporta. Se paga el día 5 del mes
// siguiente (PE-5, SA-5). Al terminar la permanencia conserva todo el beneficio; antes de tiempo
// (o saliendo de la indefinida) solo el de los años completos = 12 aportes pagados (SA-2/3/4).
function salidaV18(m,ultimoIdx){
  const aps=aportesConBeneficio(m,ultimoIdx);
  const capital=_r2(aps.reduce((s,a)=>s+a.aporte,0));
  const generado=_r2(aps.reduce((s,a)=>s+a.ben,0));
  const fin=finPermanenciaIdx(m);
  const tipo=m.ciclo===0?"indefinida":(fin!=null&&ultimoIdx>=fin)?"fin":"anticipada";
  let anios=null, conservado=generado;
  if(tipo!=="fin"){
    const tope=m.ciclo===12?1:m.ciclo===24?2:m.ciclo===36?3:Infinity;
    anios=Math.min(Math.floor(aps.length/12),tope);
    conservado=_r2(aps.slice(0,anios*12).reduce((s,a)=>s+a.ben,0));
  }
  const retirado=beneficioRetirado(m);
  const aPagar=Math.max(0,_r2(conservado-retirado));
  const perdido=Math.max(0,_r2(generado-conservado));
  const ay=ayudaPendienteDe(m);
  const total=_r2(capital+aPagar-ay.importe);
  const saldo=_r2(capital+Math.max(0,generado-retirado));
  const avisoMeses=tipo==="fin"?1:avisoMesesPorSaldo(saldo);
  const p=_mesDeIdx(ultimoIdx+1);
  return {tipo,ultimoIdx,nPagados:aps.length,anios,capital,generado,conservado,retirado,aPagar,perdido,ayuda:ay,total,saldo,avisoMeses,
    pagoMes:p.mes,pagoAnio:p.anio,fechaPago:"del 5 al 10 de "+MONTHS_FULL[MONTHS.indexOf(p.mes)].toLowerCase()+" "+p.anio};
}
// Baja v18: mes de baja = el siguiente al último aporte (desde él ya no cuenta como activo).
// Las cifras se guardan provisionales y se fijan al marcarla como pagada.
function darDeBajaV18(m,ultimoIdx,avisoIdx){
  const motivo=motivoBloqueoBaja(m); if(motivo)return {ok:false,motivo};
  const d=salidaV18(m,ultimoIdx), b=_mesDeIdx(ultimoIdx+1), u=_mesDeIdx(ultimoIdx), a=_mesDeIdx(avisoIdx);
  m.baja={v18:true,month:b.mes,year:b.anio,ultimoMes:u.mes,ultimoAnio:u.anio,avisoMes:a.mes,avisoAnio:a.anio,
    pagoMonth:d.pagoMes,pagoYear:d.pagoAnio,fechaPago:d.fechaPago,pagada:false,estado:"Pendiente"};
  _fijarCifrasBaja(m,d);
  return {ok:true,baja:m.baja};
}
function _fijarCifrasBaja(m,d){
  Object.assign(m.baja,{tipo:d.tipo,capitalDevuelto:d.capital,beneficioGenerado:d.generado,beneficioAnios:d.anios,
    beneficioRetiradoAntes:d.retirado,beneficioConservado:d.aPagar,beneficioPerdido:d.perdido,
    ayudaDescontada:d.ayuda.importe,ayudaCuotas:d.ayuda.n,total:d.total,saldoAviso:d.saldo,avisoMeses:d.avisoMeses});
}
// Cifras de una baja: las guardadas (bajas antiguas o ya pagadas) o, si es v18 y aún no se ha
// pagado, recalculadas con los datos de hoy (p. ej. el último aporte se cobra después de anotarla).
function datosBaja(m){
  const b=m&&m.baja; if(!b)return null;
  if(!b.v18||b.pagada)return b;
  const d=salidaV18(m,_idxMes(b.ultimoMes,b.ultimoAnio));
  return Object.assign({},b,{tipo:d.tipo,capitalDevuelto:d.capital,beneficioGenerado:d.generado,beneficioAnios:d.anios,
    beneficioRetiradoAntes:d.retirado,beneficioConservado:d.aPagar,beneficioPerdido:d.perdido,
    ayudaDescontada:d.ayuda.importe,ayudaCuotas:d.ayuda.n,total:d.total,saldoAviso:d.saldo,avisoMeses:d.avisoMeses});
}
// SA-10: al pagar la baja, sus cuotas pendientes quedan saldadas con lo que se le descuenta
// (compensadas): no se cobran en efectivo ni aparecen en la hoja de cobro.
function _compensarAyudas(m,pagoIdx,deshacer){
  const todas=[...(m.loans||[]),...(m.closedLoans||[])];
  todas.forEach(l=>(l.pays||[]).forEach(p=>{
    if(!deshacer&&!p.paid){p.paid=true;p.compensada=true;p.compIdx=pagoIdx;}
    if(deshacer&&p.compensada){p.paid=false;delete p.compensada;delete p.compIdx;}
  }));
  m.loans=todas.filter(l=>l.pays.some(p=>!p.paid));
  m.closedLoans=todas.filter(l=>l.pays.every(p=>p.paid));
}
// ¿Cuenta como activo en el mes 'mesKey' ("AAAA-MM")? Activo si no tiene baja, o si la
// baja es POSTERIOR a ese mes. Desde el mes de baja (inclusive) deja de contar.
function cuentaComoActivo(m, mesKey){
  if(!m.baja) return true;
  const bajaKey = m.baja.year + "-" + String(MONTHS.indexOf(m.baja.month)+1).padStart(2,"0");
  return mesKey < bajaKey;
}
// Conveniencia: ¿activo en el MES DE REPORTE actual? (para conteos/reparto/envíos).
function activoEnReporte(m){
  return cuentaComoActivo(m, DATA.reportYear + "-" + String(MONTHS.indexOf(DATA.reportMonth)+1).padStart(2,"0"));
}
function getMesData(m,y){
  if(!DATA.monthlyData)DATA.monthlyData={};
  const k=getMesKey(m,y);
  if(!DATA.monthlyData[k])DATA.monthlyData[k]={aportes:{},recargo:0,reservaPct:15,beneficioPagado:10};
  return DATA.monthlyData[k];
}
// v44.13: reparto del mes según el Documento Maestro (§4.1 y §14.1). La obligación del
// mes es la SUMA del beneficio de CADA asociado con derecho según su nivel (aporte 100 =
// doble), la misma función que acumula el beneficio de cada ficha. Retorno (recargo) −
// obligación = excedente, que en esta fase de crecimiento se reinvierte en ayudas. Si el
// retorno no alcanza, los asociados siguen ganando su nivel y la diferencia la pone el fondo.
// v44.19: bonos por referido del mes (descuentos en el aporte; los asume el fondo, Maestro §15.2)
function bonosReferidoMes(rm,ry,soloCobrados){
  let t=0; DATA.members.forEach(m=>{ if(m.type!=="asociado")return;
    const it=itemsMiembroMes(m,rm,ry).find(i=>i.tipo==="aporte");
    if(!it||it.noCobrable||(soloCobrados&&!it.pagado))return; t+=it.descuento||0; });
  return t;
}
function repartoBeneficioMes(recargo,rm,ry){
  const ri=MONTHS.indexOf(rm), key=getMesKey(rm,ry);
  // v45.1 (BE-3): quien sale con las reglas v18 cobra el beneficio de su último aporte el mes
  // siguiente (el de su baja), así que ese mes aún cuenta en el reparto.
  const conDerecho=DATA.members.filter(m=>m.type==="asociado"&&m.joinMonth&&(cuentaComoActivo(m,key)||!!(m.baja&&m.baja.v18&&getMesKey(m.baja.month,m.baja.year)===key))
    &&((m.joinYear<ry)||(m.joinYear===ry&&MONTHS.indexOf(m.joinMonth)<ri)));
  const obligacion=Math.round(conDerecho.reduce((s,m)=>s+beneficioMiembroMes(m,key),0)*100)/100;
  const excedente=Math.round(((recargo||0)-obligacion)*100)/100;
  const media=conDerecho.length?Math.round(obligacion/conDerecho.length*100)/100:0;
  return {conDerecho,obligacion,excedente,media};
}
// Lo que corresponde a una persona en rm/ry: aportación (neta) + cuotas de ese mes.
function itemsMiembroMes(m,rm,ry){
  const out=[]; const key=getMesKey(rm,ry); const md=_mdSoloLectura(rm,ry);
  if(m.type==="asociado"&&m.joinMonth){
    const ji=MONTHS.indexOf(m.joinMonth), ri=MONTHS.indexOf(rm);
    const yaEstaba=(m.joinYear<ry)||(m.joinYear===ry&&ji<=ri);
    if(yaEstaba&&cuentaComoActivo(m,key)&&!enPausaKey(m,key)){ // v45.33: en pausa no hay aporte
      const {nReferidos,descuento}=descuentoReferidoMes(m.id,rm,ry);
      const neto=aporteNetoMes(m,rm,ry);
      const pagado=!!(md.aportes&&md.aportes[m.id]);
      // v45: el aporte del mes (50–200) ya incluye lo que el asociado elige poner ese mes
      const bruto=aporteBrutoKey(m,key), ex=bruto-aporteBaseDe(m);
      out.push({tipo:"aporte",txt:"Aportación"+(descuento>0?` (−${descuento} € por ${nReferidos} referido${nReferidos>1?"s":""})`:""),
        importe:neto,pagado,recargo:0,
        // v44.19: el bono lo asume el fondo (Maestro BO-3): al asociado se le acredita el aporte íntegro
        bruto,descuento,nReferidos,extra:ex,
        // v44.17: no pagó y después causó baja → no se reclama (su devolución ya cuenta solo lo pagado)
        noCobrable:!pagado&&!!m.baja});
    }
  }
  cuotasDelMes(rm,ry).filter(c=>c.mid===m.id).forEach(c=>{
    const ult=c.totalCuotas>1&&c.numCuota>=c.totalCuotas;
    out.push({tipo:"cuota",txt:(c.aplazada?"Cuota aplazada (solo retorno)":ult?"🏁 Última cuota":c.totalCuotas<=1?"Cuota única":`Cuota ${c.numCuota}/${c.totalCuotas}`)+` · ayuda ${c.gMonth} ${c.gYear}`,
      importe:c.inst,pagado:!!c.paid,recargo:c.recargo,ultima:ult,aplazada:!!c.aplazada,
      num:c.numCuota,de:c.totalCuotas,gMonth:c.gMonth,gYear:c.gYear});
  });
  return out;
}
// Quién trajo a un asociado: campo referidoPor (id) o, si falta, el bono registrado con su nombre.
function quienRefirio(m){
  if(m.referidoPor){const r=DATA.members.find(x=>x.id===m.referidoPor); if(r)return r.name;}
  const n=_normNombre(m.name);
  for(const [rid,meses] of Object.entries(DATA.referidos||{})){
    for(const v of Object.values(meses||{})){
      if(String((v&&v.nombres)||"").split(",").some(x=>_normNombre(x)===n)){const r=DATA.members.find(x=>x.id===rid); if(r)return r.name;}
    }
  }
  return "";
}
function cajaMensual(){
  if(_CAJA_CACHE)return _CAJA_CACHE;
  const fin=DATA.reportYear*12+MONTHS.indexOf(DATA.reportMonth);
  const out={}; let saldo=0, y=2025, i=7, acAp=0, acBen=0, puntPend=0;
  const loans=[]; DATA.members.forEach(m=>[...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>loans.push({m,l})));
  while(y*12+i<=fin){
    const rm=MONTHS[i], key=getMesKey(rm,y), idx=y*12+i;
    const R=resumenMesDoc(rm,y);
    let puntIn=0,puntOut=0,nPuntIn=0,nPuntOut=0;
    Object.values(DATA.aportesPuntuales||{}).forEach(arr=>(arr||[]).forEach(a=>{
      if(a.mes===rm&&a.anio===y){puntIn+=a.capital||0;nPuntIn++;}
      if(a.devuelto&&a.mesDev===rm&&a.anioDev===y){puntOut+=a.total||0;nPuntOut++;}
    }));
    const apoyos=R.concedidos.reduce((s,x)=>s+(x.l.capital||0),0);
    const bajas=DATA.members.filter(m=>m.baja&&m.baja.pagada&&(()=>{const p=mesPagoBaja(m.baja);return p.mes===rm&&p.anio===y;})())
      .reduce((s,m)=>s+(m.baja.total||0),0);
    // v45.1: beneficio retirado sin salir (PE-5, PE-7) que ya se pagó este mes
    let retir=0,nRetir=0; DATA.members.forEach(m=>retiradasDe(m).forEach(r=>{ if(r.pagada&&pagoRetiradaIdx(r)===idx){retir+=importeRetirada(m,r);nRetir++;} }));
    let cartera=0;
    loans.forEach(({l})=>{
      if(l.gYear*12+MONTHS.indexOf(l.gMonth)>idx)return;
      let dev=0; (l.pays||[]).forEach((p,pi)=>{ if(p.paid&&!p.aplazada&&(p.compensada?p.compIdx:p.y*12+MONTHS.indexOf(p.m))<=idx) dev+=cuotaDe(l,pi)-recargoPorCuota(l); }); // v45.1: compensada → cuenta el mes en que se pagó la baja
      cartera+=Math.max(0,l.capital-dev);
    });
    const r2=x=>Math.round(x*100)/100;
    const gL=(DATA.gastos||[]).filter(g=>g.mes===key), gastos=r2(gL.reduce((s,g)=>s+(+g.importe||0),0)); // v45.23
    const ent=r2(R.apCob+R.cuCob+puntIn), sal=r2(apoyos+puntOut+bajas+retir+gastos);
    const ini=r2(saldo); saldo=r2(saldo+ent-sal);
    // ¿De quién es el dinero? aportaciones acumuladas (se devuelven al terminar el ciclo),
    // beneficios devengados (idem) y aportes puntuales aún no devueltos; el resto es el
    // excedente acumulado del fondo (retornos − beneficios − bonos por referido − retornos
    // pagados a puntuales). v44.19: a cada asociado se le acredita su aporte ÍNTEGRO aunque
    // pagara menos por un bono por referido (lo asume el fondo, Maestro §15.2) + sus extras.
    acAp+=R.apBrutoCob; acBen+=repartoBeneficioMes(R.recargoMes,rm,y).obligacion;
    Object.values(DATA.aportesPuntuales||{}).forEach(arr=>(arr||[]).forEach(a=>{
      if(a.mes===rm&&a.anio===y)puntPend+=a.capital||0;
      if(a.devuelto&&a.mesDev===rm&&a.anioDev===y)puntPend-=a.capital||0;
    }));
    DATA.members.forEach(m=>{ if(!m.baja)return; const b=m.baja;
      if(b.month===rm&&b.year===y)acBen-=(datosBaja(m).beneficioPerdido||0); // lo que pierde pasa al fondo
      if(b.pagada){const p=mesPagoBaja(b); if(p.mes===rm&&p.anio===y){acAp-=(b.capitalDevuelto||0);acBen-=(b.beneficioConservado||0);}}
    });
    acBen-=retir; // v45.1: el beneficio retirado ya no se le debe
    out[key]={ini,retir:r2(retir),nRetir,aportes:R.apCob,bonos:R.bonosCob,aportesBrutos:R.apBrutoCob,cuotas:R.cuCob,retornos:R.recCob,capDev:r2(R.cuCob-R.recCob),puntIn,nPuntIn,entradas:ent,
      apoyos,nApoyos:R.concedidos.length,puntOut,nPuntOut,bajas,gastos,nGastos:gL.length,salidas:sal,fin:saldo,cartera:r2(cartera),
      acAp:r2(acAp),acBen:r2(acBen),puntPend:r2(puntPend),reserva:r2(saldo+cartera-acAp-acBen-puntPend)};
    i++; if(i>11){i=0;y++;}
  }
  _CAJA_CACHE=out;
  return out;
}
// v44.17: CARPETA DE CONTROL — todas las actas de cierre desde agosto de 2025 hasta el mes
// anterior al del Cierre (el mes en curso aún no está cerrado), con un índice resumen.
// v45.5 (solo para el administrador): lo que queda para la asociación en un mes = retornos
// del mes − beneficio de los asociados − bonos por referido. Cada mes por separado, sin acumular.
function quedaAsociacionMes(rm,ry){
  // El mes de reporte (aún sin cerrar) usa los retornos PREVISTOS, como la hoja de cobro; los cerrados, los cobrados.
  const enCurso=_idxMes(rm,ry)>=_idxMes(DATA.reportMonth,DATA.reportYear);
  const R=resumenMesDoc(rm,ry), ret=enCurso?R.recPrev:R.recargoMes, rep=repartoBeneficioMes(ret,rm,ry), bonos=bonosReferidoMes(rm,ry);
  return {enCurso,retornos:ret,beneficio:rep.obligacion,bonos,queda:Math.round((ret-rep.obligacion-bonos)*100)/100};
}
