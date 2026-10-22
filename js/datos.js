// Nuevos Horizontes · datos.js
// Datos: migración, limpieza (sanitizeData), sesión del administrador, carga y guardado (local y nube), copias
// Parte de la app (versión en APP_VERSION, js/utilidades… se cargan en el orden de index.html).
// Solo declaraciones: no ejecuta nada al cargarse (el arranque está en js/arranque.js).
const MONTHS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTHS_FULL=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const YEARS=[2025,2026,2027,2028];
const DATA_VERSION=11; // versión del esquema/datos; independiente de APP_VERSION
const APP_VERSION="v45.39"; // v45.39: nuevo orden de la app del administrador (barra de abajo: Inicio · Cobros · Personas · Ayudas · Más), letra más grande, «Texto grande», fecha de cada cobro en la ficha y ayuda nueva con resumen y WhatsApp en el mismo paso · v45.38: las reglas del Maestro (límites de ayudas, beneficios, avisos, referidos, pausa) en un solo sitio: js/maestro.js · v45.37: se anota la fecha de cada cobro (aportes y cuotas) desde ahora; no cambia nada de lo que se ve · v45.36: la app se reparte en archivos (index.html + css/ + js/), sin cambiar nada de lo que se ve; el auto-chequeo examina js/datos.js · v45.35: enlaces: si el número no existe solo vale el nombre completo · guardado sin pisadas: si otro aparato guardó antes, se pregunta en vez de borrar lo suyo · v45.34: «Así lo ve»: botón «← Volver» también abajo y la barra de arriba respeta la zona de la hora del móvil · v45.33: pausa de aportes (Maestro PE-8): opciones al pedir la salida, pausa de 1 a 3 meses, avisos y enlace · v45.32: salida pendiente de pago: el asociado sigue viendo su ficha, con un aviso de su salida y el detalle · v45.31: salida: resumen para el asociado (por WhatsApp y en su enlace hasta que se le pague) · v45.30: cuenta del grupo: si todo está marcado como cobrado en el Cierre, queda a 0 («resto entregado») · v45.29: Permanencias: sin la frase de cada mes (ya está en el calendario); el total del mes va debajo de las fichas · v45.28: Gestión › ⏳ Permanencias (mes del último aporte, cuándo se le paga y total previsto) · si una ayuda no cabe por la permanencia, botón para ampliarla sin salir de la ayuda · simulador de ayuda: enviar por WhatsApp (imagen + texto) · v45.27: v45.27: la app del administrador pide iniciar sesión (correo y contraseña de Firebase); los enlaces de los asociados no cambian · v45.26: sin datos personales en el archivo público (lista de personas, parches puntuales y nombres en comentarios) · nunca se guarda en la nube si los datos no se cargaron · grupo: «Liquidado» solo si la cuenta del responsable también cuadra · lista: «Cuotas de <mes>» · el historial de versiones está en git y en REGISTRO_VERSIONES

// BEGIN NH_TERCEROS_REF_MIGRATION
// Normalización compatible con el resto de la app: ignora caja, tildes y espacios
// repetidos, pero exige que el nombre normalizado completo coincida exactamente.
function _normNombre(s){
  return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
}

// Convierte únicamente el avalista VIVO (member.ref). Las ayudas y, en especial,
// avalistaEnConcesion no se recorren ni se modifican. Los casos sin solución única
// se conservan literalmente y quedan expuestos como avisos estructurados.
function migrarRefsTerceros(data,{convertir=true}={}){
  const resultado={convertidos:[],conservados:[],avisos:[]};
  if(!data||!Array.isArray(data.members))return resultado;

  const idsExistentes=new Set(data.members.filter(Boolean).map(m=>m.id));
  const asociadosPorNombre=new Map();
  data.members.forEach(m=>{
    if(!m||m.type!=="asociado"||typeof m.name!=="string")return;
    const nombre=_normNombre(m.name);
    if(!nombre)return;
    if(!asociadosPorNombre.has(nombre))asociadosPorNombre.set(nombre,[]);
    asociadosPorNombre.get(nombre).push(m);
  });

  data.members.forEach(m=>{
    if(!m||m.type!=="tercero"||typeof m.ref!=="string"||!m.ref.trim())return;
    if(idsExistentes.has(m.ref)){
      resultado.conservados.push({terceroId:m.id,ref:m.ref,motivo:"id_valido"});
      return;
    }

    const candidatos=asociadosPorNombre.get(_normNombre(m.ref))||[];
    if(candidatos.length===1&&convertir){
      const refAnterior=m.ref;
      m.ref=candidatos[0].id;
      resultado.convertidos.push({terceroId:m.id,refAnterior,refNueva:m.ref});
      return;
    }

    const tipo=candidatos.length===0?"sin_coincidencia":candidatos.length>1?"ambiguo":"nombre_pendiente";
    resultado.avisos.push({
      tipo,
      terceroId:m.id,
      refConservada:m.ref,
      candidatos:candidatos.map(a=>a.id)
    });
  });

  if(typeof window!=="undefined")window.NH_TERCEROS_REF_WARNINGS=resultado.avisos;
  resultado.avisos.forEach(aviso=>{
    console.warn(`[NH MIGRACIÓN TERCEROS] ${aviso.tipo}: tercero=${aviso.terceroId}; ref conservada; candidatos=${aviso.candidatos.length}`);
  });
  return resultado;
}

function migrarRefsTercerosAV11(data){
  if(!data||(data._version!==9&&data._version!==10))return{aplicada:false,resultado:null};
  const resultado=migrarRefsTerceros(data);
  data._version=11;
  return{aplicada:true,resultado};
}
// END NH_TERCEROS_REF_MIGRATION

// Migration: merge INITIAL metadata into existing DATA without losing payment states
function migrateData(data){
  if(!data||!data.members)return data;
  // Necesario para el bloque v7→v8 de abajo: recalcularApoyo/recargoPorCuota/ayudaTotal
  // usan DATA.rate como fallback cuando una ayuda no tiene su propio l.rate, pero
  // migrateData() se ejecuta ANTES de que el global DATA se reasigne al resultado
  // (DATA=sanitizeData(migrateData(...))) — en la primera carga DATA aún es undefined.
  // Se sobrescribe de todos modos justo después de esta función, así que es seguro.
  DATA=data;

  // Alias de renombrados conocidos (cesiones de plaza — cláusula 7.6, o cambios de
  // nombre). Se aplican AQUÍ, antes de cualquier comparación por nombre contra
  // INITIAL más abajo, para que ningún paso de alta cree un "fantasma" duplicado
  // con el nombre antiguo (así se creó el id 13 duplicado: [asociado],
  // porque el renombrado solo vivía en sanitizeData, que corre DESPUÉS de esto).
  // Único sitio del archivo donde se mantiene esta tabla — no duplicar en sanitizeData.
  const ALIAS_NOMBRES={}; // v45.26: los renombrados antiguos ya están aplicados en los datos
  data.members.forEach(m=>{
    const alias=ALIAS_NOMBRES[_normNombre(m.name)];
    if(alias)m.name=alias;
  });
  if(data.aportesPuntuales){
    Object.values(data.aportesPuntuales).forEach(arr=>{
      if(!Array.isArray(arr))return;
      arr.forEach(ap=>{
        if(ap&&ap.destino){
          const alias=ALIAS_NOMBRES[_normNombre(ap.destino)];
          if(alias)ap.destino=alias;
        }
      });
    });
  }

  // ── → v6: re-sincronizar datos maestros desde INITIAL, INCLUIDO el id ──
  // Los datos del ARCHIVO (INITIAL) son la fuente de verdad. Refrescamos id,
  // type, ref, ciclo, fechas de ingreso, loans e history de cada miembro
  // (cruce por nombre), y damos de alta los nuevos. Reasignar el id corrige
  // fichas cruzadas (p. ej. [asociado] abriendo otra persona) por ids mal guardados.
  if((data._version||0) < 6){
    const imap={};
    INITIAL.members.forEach(m=>{imap[m.name.toLowerCase().trim()]=m;});
    data.members.forEach(m=>{
      const ref=imap[(m.name||"").toLowerCase().trim()];
      if(ref){
        m.id=ref.id;                 // ← clave: anclar el id al del archivo
        m.type=ref.type;
        m.ref=ref.ref;
        m.ciclo=ref.ciclo;
        m.joinMonth=ref.joinMonth;
        m.joinYear=ref.joinYear;
        // MODO B: las ayudas (loans) e historial se registran desde la app y son
        // la fuente de verdad del usuario. NO se sobrescriben con las del archivo;
        // solo se reponen si el miembro guardado no tuviera ninguna.
        if(!Array.isArray(m.loans))m.loans=JSON.parse(JSON.stringify(ref.loans||[]));
        if(!Array.isArray(m.history))m.history=JSON.parse(JSON.stringify(ref.history||[]));
        if(!m.phone)m.phone="";
      }
    });
    // Altas que están en INITIAL pero no en los datos guardados — por ID, no por
    // nombre (mismo criterio que sanitizeData desde v43.23; el bucle de arriba ya
    // ancla m.id=ref.id a los que hacen match por nombre, así que para cuando
    // llegamos aquí los ids ya están correctos). Comparar por nombre fue la causa
    // raíz del id 13 duplicado ([asociado]) y del mismo patrón en
    // [asociado] — con 100+ personas, nombres iguales o parecidos generarían
    // más duplicados silenciosos. ALIAS_NOMBRES sigue haciendo falta, pero solo para
    // actualizar el NOMBRE visible — ya no es la barrera contra altas fantasma.
    const haveIds=new Set(data.members.map(m=>m.id));
    INITIAL.members.forEach(im=>{
      if(!haveIds.has(im.id)){
        const nuevo=JSON.parse(JSON.stringify(im));
        // Si INITIAL todavía usa el nombre antiguo (nadie lo ha renombrado ahí),
        // aplicar el alias también al alta fresca — si no, entraría con el nombre
        // viejo porque el barrido de ALIAS_NOMBRES de arriba ya había terminado.
        const alias=ALIAS_NOMBRES[_normNombre(nuevo.name)];
        if(alias)nuevo.name=alias;
        data.members.push(nuevo);
      }
    });
    // El mes de reporte es un dato VIVO del usuario, no de INITIAL — solo se toma de
    // INITIAL si de verdad falta (v44.2, mismo bug que causó el "615 de julio").
    if(data.reportMonth==null)data.reportMonth=INITIAL.reportMonth;
    if(data.reportYear==null)data.reportYear=INITIAL.reportYear;
    data._version=6;
    return data;
  }

  // ── v8→v9: v44.1 cambió el redondeo de ayudaTotal/ayudaCuotas de céntimos exactos
  // a euros enteros y equilibró el reparto (decisión de Ángel). Vuelve a pasar
  // recalcularApoyo(l) por cada ayuda para que total/cuotas queden en euros enteros
  // — es la ÚNICA diferencia con v8, así que este bloque es MÍNIMO a propósito: NO
  // reejecuta el resto de la migración (resincronizar con INITIAL, resetear
  // reportMonth/reportYear, dar de alta miembros nuevos...), que sería incorrecto
  // para datos que ya están al día en todo lo demás (p. ej. le resetearía el mes de
  // reporte de Ángel de vuelta a "Jul" aunque ya esté en "Ago"). Idempotente: no
  // toca pays[].paid, aplazada, instAplazada, ni monthlyData (incluido el recargo).
  if(data._version===8){
    data.members.forEach(m=>{
      [...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{
        recalcularApoyo(l);
      });
    });
    data._version=9;
    return data;
  }

  // ── v9/v10→v11: refs históricas por nombre pasan a IDs sin tabla fija ──
  // La conversión exige una coincidencia normalizada única entre asociados. Un ID
  // válido se conserva; cero o varias coincidencias no se resuelven automáticamente.
  // Esta es la única migración estructural nueva: APP_VERSION sigue siendo v44.5.
  const migracionTerceros=migrarRefsTercerosAV11(data);
  if(migracionTerceros.aplicada)return data;

  if(data._version>=DATA_VERSION){
    // Recalcular solo los avisos en cada carga. convertir:false garantiza que una
    // versión ya migrada nunca vuelva a mutar datos de forma silenciosa.
    migrarRefsTerceros(data,{convertir:false});
    return data;
  }
  // El mes de reporte es un dato VIVO del usuario — solo se toma de INITIAL si falta
  // (v44.2: esta línea reseteaba el mes de Ángel de "Ago" a "Jul" en cada migración,
  // lo que a su vez disparó el recalculo silencioso del recargo de julio, 565→615).
  if(data.reportMonth==null)data.reportMonth=INITIAL.reportMonth;
  if(data.reportYear==null)data.reportYear=INITIAL.reportYear;
  if(!data.monthlyData)data.monthlyData={};
  
  const initialMap={};
  INITIAL.members.forEach(m=>{initialMap[m.name.toLowerCase()]=m;});
  
  // Update existing members with new fields + loans frescos del INITIAL
  data.members.forEach(m=>{
    const ref=initialMap[m.name.toLowerCase()];
    if(ref){
      if(!m.joinMonth&&ref.joinMonth){m.joinMonth=ref.joinMonth;m.joinYear=ref.joinYear;}
      // MODO B: las ayudas (loans) se registran desde la app y mandan. Solo se
      // reponen desde el archivo si el miembro guardado no tuviera NINGUNA ayuda —
      // ni activa ni cerrada. Antes solo miraba m.loans: a quien tenía todo cerrado
      // (closedLoans no vacío, loans vacío) lo trataba como "sin ayudas" y le
      // inyectaba una copia vieja desde INITIAL con el mismo id (caso real: [asociado]
      // [asociado], l4_1 duplicada).
      const sinNinguna=(!Array.isArray(m.loans)||m.loans.length===0)
                      &&(!Array.isArray(m.closedLoans)||m.closedLoans.length===0);
      if(sinNinguna){
        if(ref.loans&&ref.loans.length>0){
          m.loans=JSON.parse(JSON.stringify(ref.loans));
        }
      }
      if(!m.history||m.history.length===0){m.history=JSON.parse(JSON.stringify(ref.history||[]));}
      if(!m.phone)m.phone="";
      if(m.ciclo==null&&ref.ciclo!=null){m.ciclo=ref.ciclo;} // ciclo 0 = indefinido, es un valor válido, no "falta"
    }
    if(!m.history)m.history=[];
    if(!m.joinMonth)m.joinMonth=null;
    if(!m.joinYear)m.joinYear=null;
  });
  
  // Add members that exist in INITIAL but not in saved data — por ID, no por nombre.
  // Ver el comentario detallado más arriba (misma corrección, mismo motivo: el id 13
  // duplicado [asociado] y el mismo patrón en [asociado]).
  const haveIds2=new Set(data.members.map(m=>m.id));
  INITIAL.members.forEach(im=>{
    if(!haveIds2.has(im.id)){
      const nuevo=JSON.parse(JSON.stringify(im));
      // Igual que arriba: aplicar el alias al alta fresca si INITIAL aún usa el nombre antiguo.
      const alias=ALIAS_NOMBRES[_normNombre(nuevo.name)];
      if(alias)nuevo.name=alias;
      data.members.push(nuevo);
    }
  });
  
  // Update report month/year — solo si falta, mismo motivo que arriba (v44.2).
  if(data.reportMonth==null)data.reportMonth=INITIAL.reportMonth;
  if(data.reportYear==null)data.reportYear=INITIAL.reportYear;

  // ── v7→v8: recalcular total/cuotas con la función central, y corregir [asociado] ──
  // Idempotente: puede ejecutarse N veces con resultado idéntico (recalcularApoyo y el
  // patrón exacto de M2 son deterministas y no dependen de si ya se aplicaron antes).
  {
    // M1: recalcular total y cuotas de TODA ayuda (loans + closedLoans) con
    // recalcularApoyo(l) — es la única función que puede escribir total/inst/cuotas
    // (REGLA PERMANENTE) y respeta los aplazamientos ([asociado]). NO toca pays[].paid,
    // aplazada, ni instAplazada.
    data.members.forEach(m=>{
      [...(m.loans||[]),...(m.closedLoans||[])].forEach(l=>{
        recalcularApoyo(l);
      });
    });
    // M2: [asociado] (id 15) — SOLO si coincide EXACTAMENTE el patrón: en su
    // historial, un registro de Jun 2026 con capital 400 y SIN lid → capital 500 y
    // lid "l15_1". No crea una segunda ayuda, no duplica historial, no cambia la fecha.
    data.members.forEach(m=>{
      if(m.id!=="15"||!Array.isArray(m.history))return;
      m.history.forEach(h=>{
        if(h.gMonth==="Jun"&&h.gYear===2026&&h.capital===400&&!h.lid){
          h.capital=500; h.lid="l15_1";
        }
      });
    });
  }

  // Versiones antiguas que llegan por la ruta general también adoptan la regla
  // dinámica antes de marcarse como v11.
  migrarRefsTerceros(data);
  data._version=DATA_VERSION;
  return data;
}

// Saneamiento que corre SIEMPRE al cargar (venga de localStorage o Firebase),
// sin depender de la versión. Reancla el id de cada miembro al del archivo
// (INITIAL) cruzando por nombre, para que las fichas nunca queden cruzadas
// aunque los datos guardados estén corruptos. NO toca pagos ni aportes.
function sanitizeData(data){
  if(!data||!data.members)return data;
  // Renombrados conocidos (cesiones de plaza, cambios de nombre): se aplican en
  // ALIAS_NOMBRES dentro de migrateData (que corre siempre, antes que esta función),
  // no aquí — un único sitio evita que dos mecanismos hagan lo mismo en lugares
  // distintos y que uno de los dos llegue tarde (así se creó el id 13 duplicado).
  const byName={};
  INITIAL.members.forEach(m=>{byName[m.name.toLowerCase().trim()]=m;});
  // Eliminar SOLO miembros fantasma (datos viejos que ya no existen en el archivo).
  // Se CONSERVAN: los del archivo (INITIAL) y los que tú creaste desde la app
  // (marcados con origen:"app" o con id que empieza por "m"+timestamp).
  // Antes este filtro borraba por error a los asociados nuevos y con ellos sus ayudas.
  const validNames=new Set(INITIAL.members.map(m=>m.name.toLowerCase().trim()));
  const validIds=new Set(INITIAL.members.map(m=>m.id));
  // v45.26: el archivo ya no trae personas → sin lista de referencia no se descarta a nadie
  if(INITIAL.members.length)data.members=data.members.filter(m=>{
    if(validNames.has((m.name||"").toLowerCase().trim()))return true; // está en el archivo
    if(validIds.has(m.id))return true;                                // está en el archivo (por id, aunque le hayan cambiado el nombre)
    if(m.origen==="app")return true;                                  // creado desde la app
    if(typeof m.id==="string" && m.id.charAt(0)==="m")return true;     // id de la app
    return false; // fantasma real: descartar
  });
  data.members.forEach(m=>{
    const ref=byName[(m.name||"").toLowerCase().trim()];
    if(ref){
      m.id=ref.id;          // id correcto del archivo (fuente de verdad)
      // tipo: por defecto lo fija el archivo (INITIAL); es la fuente de verdad y evita
      // que un dato viejo del navegador falsee el tipo (regla crítica). ÚNICA excepción:
      // una conversión tercero→asociado hecha DELIBERADAMENTE desde la app deja la marca
      // m.convertido===true. Esa sí persiste, porque no es un dato viejo sino un cambio
      // real, y solo la app puede escribirla (en Firestore solo escribe la app).
      // Fallo cerrado: sin la marca, manda el archivo. El anclaje de id no se toca nunca.
      if(m.convertido===true && ref.type==="tercero"){
        m.type="asociado";
      }else{
        m.type=ref.type;      // asociado / tercero
      }
      // avalista (ref = avalistaId): ahora EDITABLE desde la app (Fase 1B, "Cambiar
      // avalista"). Igual que loans/history, NO se sobrescribe con el de INITIAL si
      // el miembro ya lo trae guardado — si no, cada carga revertiría la edición del
      // admin. Solo se repone si faltase (primera sincronización de un alta nueva).
      if(m.ref===undefined)m.ref=ref.ref;
    }
  });
  // Fusionar referidos del archivo (INITIAL) sin pisar los ya registrados
  if(INITIAL.referidos){
    if(!data.referidos)data.referidos={};
    Object.keys(INITIAL.referidos).forEach(mid=>{
      if(!data.referidos[mid])data.referidos[mid]={};
      Object.keys(INITIAL.referidos[mid]).forEach(k=>{
        if(!data.referidos[mid][k])data.referidos[mid][k]=INITIAL.referidos[mid][k];
      });
    });
  }
  // Reponer el HISTORIAL FIJO de aportes mensuales desde el archivo (INITIAL).
  // Los meses cerrados (hasta junio 2026) son dato histórico que no debe perderse
  // aunque el navegador tenga datos viejos. El mes en curso y futuros se respetan.
  if(INITIAL.monthlyData){
    if(!data.monthlyData)data.monthlyData={};
    const CIERRE="2026-06"; // último mes del histórico fijo (inclusive)
    Object.keys(INITIAL.monthlyData).forEach(k=>{
      if(k<=CIERRE){
        // reponer/garantizar los aportes históricos de ese mes
        if(!data.monthlyData[k])data.monthlyData[k]={};
        if(!data.monthlyData[k].aportes)data.monthlyData[k].aportes={};
        const ini=INITIAL.monthlyData[k].aportes||{};
        Object.keys(ini).forEach(mid=>{
          if(ini[mid])data.monthlyData[k].aportes[mid]=true;
        });
      }
    });
  }
  // Vinculación automática del historial: para cada entrada de historial sin lid,
  // buscar su ayuda (loans o closedLoans) que coincida EXACTO en capital+mes+año y
  // asignarle el lid. Solo vincula cuando el emparejamiento es único (sin ambigüedad),
  // así el historial queda conectado a sus ayudas sin tocar importes ni borrar nada.
  if(data.members){
    data.members.forEach(m=>{
      if(!Array.isArray(m.history)||!m.history.length)return;
      const todas=[...(m.loans||[]),...(m.closedLoans||[])];
      m.history.forEach(h=>{
        if(h.lid)return;
        const matches=todas.filter(l=>l.capital===h.capital&&l.gMonth===h.gMonth&&l.gYear===h.gYear);
        if(matches.length===1) h.lid=matches[0].id;
      });
    });
  }
  parcheBonosReferidos2026(data); // v44.12: bonos de referido pendientes (una sola vez, idempotente)
  parcheAporteHuerfano2026(data); // v45.35: marca de aporte de una ficha que ya no existe (una sola vez)
  // v45.26: los parches puntuales de 2026 (ya aplicados y marcados en data.parches) se retiraron del archivo:
  // llevaban nombres e importes de personas y no hacen nada con los datos actuales.
  return data;
}

const URL_PARAMS=new URLSearchParams(window.location.search);

const INITIAL={_version:11,reportMonth:"Oct",reportYear:2026,monthlyFee:50,rate:5,
// v45.26: sin datos de personas. Los datos reales viven SOLO en la nube (Firestore) y en
// las copias locales del administrador; este archivo es público y no debe llevarlos.
monthlyData:{},referidos:{},members:[],aportesPuntuales:{}};

// Registra el año actual del sistema en la lista de años (sin tocar el mes/año elegido)
function setCurrentMonthYear(persistir){
  if(!DATA)return;
  const now=new Date();
  const curY=now.getFullYear();
  if(YEARS.indexOf(curY)===-1)YEARS.push(curY);
  // Opción A: respetar el mes/año que el usuario dejó guardado.
  // Solo se fija el mes actual si por algún motivo no hubiera ninguno guardado.
  if(!DATA.reportMonth)DATA.reportMonth=MONTHS[now.getMonth()];
  if(!DATA.reportYear)DATA.reportYear=curY;
  // v44.12: excepción declarada — cambio automático de mes en el día de aviso.
  avanceMesPorDiaAviso(now,!!persistir);
}
// Mes "operativo" según la fecha de hoy: desde el día de aviso (Configuración →
// "Día de aviso del próximo aporte", por defecto 25) ya es el mes siguiente.
function mesOperativoHoy(now){
  now=now||new Date();
  const dia=(DATA.diaAvisoProximo!=null?DATA.diaAvisoProximo:25);
  let mi=now.getMonth(), y=now.getFullYear();
  if(now.getDate()>=dia){mi++; if(mi>11){mi=0;y++;}}
  return {mes:MONTHS[mi],anio:y,key:y+"-"+String(mi+1).padStart(2,"0")};
}
// Desde el día de aviso la app pasa sola al mes siguiente (lo mismo que hacía el
// administrador a mano), para que asociados y administrador vean ya los aportes y
// cuotas del mes que viene. Reglas:
//  · Solo avanza, nunca retrocede, y solo si el mes guardado es anterior al operativo.
//  · UNA vez por mes (marca DATA.mesAutoAplicado): si después el administrador vuelve
//    a un mes anterior a mano, se respeta su decisión hasta el siguiente día de aviso.
//  · Solo se guarda (persistir) en modo administrador y tras la comprobación con la
//    nube; en los enlaces de asociados se aplica solo en pantalla, sin escribir nada,
//    para que vean el mes nuevo aunque el administrador aún no haya abierto la app.
//  · Se llama desde la carga de datos, nunca desde render() (regla crítica 7).
function avanceMesPorDiaAviso(now,persistir){
  const obj=mesOperativoHoy(now);
  // v45.23: en los enlaces de asociados el mes es SIEMPRE el operativo de hoy (no el que el
  // administrador tenga abierto para revisar). Solo en pantalla: no se guarda nada.
  if(READONLY_ID||ES_MODO_GRUPO){ DATA.reportMonth=obj.mes; DATA.reportYear=obj.anio; if(YEARS.indexOf(obj.anio)===-1)YEARS.push(obj.anio); return; }
  if(DATA.mesAutoAplicado===obj.key)return;
  const repKey=getMesKey(DATA.reportMonth,DATA.reportYear);
  if(repKey<obj.key){
    DATA.reportMonth=obj.mes; DATA.reportYear=obj.anio;
    if(YEARS.indexOf(obj.anio)===-1)YEARS.push(obj.anio);
  }
  if(persistir&&!READONLY_ID&&!ES_MODO_GRUPO){
    DATA.mesAutoAplicado=obj.key;
    save();
  }
}
// ¿Mostrar ya el mes siguiente al del reporte (aviso "Próximo", cascada de cuotas)?
// Solo si hoy es día de aviso o posterior Y el reporte sigue en un mes anterior al
// operativo. Si la app ya pasó al mes siguiente, no se adelanta un segundo mes.
function avisoSiguienteActivo(){
  const hoy=new Date();
  const dia=(DATA.diaAvisoProximo!=null?DATA.diaAvisoProximo:25);
  if(hoy.getDate()<dia)return false;
  return getMesKey(DATA.reportMonth,DATA.reportYear)<mesOperativoHoy(hoy).key;
}
function _esperarFirebase(){ return new Promise(res=>{ if(window._fbReady)return res(); const t=setTimeout(res,9000); window.addEventListener("firebase-ready",()=>{clearTimeout(t);res();},{once:true}); }); }
async function pedirSesionAdmin(){
  pintarLogin("cargando");
  await _esperarFirebase();
  const auth=window._fbAuth;
  if(!auth){ pintarLogin("sin-conexion"); return; }
  if(_SESION_ESCUCHA)return; _SESION_ESCUCHA=true;
  auth.onAuthStateChanged(u=>{
    if(u){ if(!SESION_OK){ SESION_OK=true; load(); } }
    else{ const habia=SESION_OK; SESION_OK=false; if(habia){ location.reload(); return; } pintarLogin(); }
  });
}
function pintarLogin(estado,msg){
  const app=document.getElementById("app"); if(!app)return;
  const caja=c=>`<div style="max-width:380px;margin:0 auto;padding:40px 22px">
      <div style="text-align:center;margin-bottom:22px"><div class="h-title" style="color:#1B4332;font-size:21px">NUEVOS HORIZONTES</div>
      <div style="font-size:13px;color:var(--muted);margin-top:4px">Acceso del administrador</div></div>${c}</div>`;
  if(estado==="cargando"){ app.innerHTML=caja(`<div style="text-align:center;color:var(--muted);font-size:14px">Comprobando tu acceso…</div>`); return; }
  if(estado==="sin-conexion"){ app.innerHTML=caja(`<div style="text-align:center;color:#8A4F12;background:#FFF4E5;border:1px solid #E0A040;border-radius:12px;padding:14px;font-size:14px;line-height:1.45">No se puede comprobar tu acceso sin conexión. Conéctate y vuelve a abrir la app.<br><button class="m-primary" style="margin-top:12px" onclick="location.reload()">Reintentar</button></div>`); return; }
  const ultimo=(()=>{try{return localStorage.getItem("nh-admin-email")||"";}catch{return "";}})();
  app.innerHTML=caja(`<form onsubmit="event.preventDefault();entrarAdmin()" style="background:#fff;border:1px solid var(--border);border-radius:16px;padding:18px">
      <label class="m-label">Correo</label>
      <input id="lg-mail" class="m-input" type="email" autocomplete="username" inputmode="email" value="${escH(ultimo)}" style="font-size:16px">
      <label class="m-label">Contraseña</label>
      <input id="lg-pass" class="m-input" type="password" autocomplete="current-password" style="font-size:16px">
      ${msg?`<div style="margin:4px 0 10px;color:#C0492C;font-size:13px;font-weight:700;line-height:1.4">${escH(msg)}</div>`:""}
      <button class="m-primary" type="submit" id="lg-btn">Entrar</button>
      <button type="button" onclick="recordarClave()" style="width:100%;margin-top:10px;background:none;border:none;color:#2D6A4F;font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer">He olvidado la contraseña</button>
    </form>
    <div style="font-size:12px;color:var(--muted);text-align:center;margin-top:14px;line-height:1.4">Los asociados no necesitan entrar aquí: usan su enlace.</div>`);
}
function _msgLogin(code){
  if(/invalid-credential|wrong-password|user-not-found|invalid-login/.test(code||""))return "Correo o contraseña incorrectos.";
  if(/too-many-requests/.test(code||""))return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  if(/network/.test(code||""))return "Sin conexión. Comprueba internet y vuelve a probar.";
  if(/invalid-email/.test(code||""))return "Ese correo no es válido.";
  return "No se ha podido entrar ("+(code||"error")+").";
}
async function entrarAdmin(){
  const e=(document.getElementById("lg-mail")?.value||"").trim(), c=document.getElementById("lg-pass")?.value||"";
  if(!e||!c){ pintarLogin(null,"Escribe tu correo y tu contraseña."); return; }
  const b=document.getElementById("lg-btn"); if(b){b.disabled=true;b.textContent="Entrando…";}
  try{ try{localStorage.setItem("nh-admin-email",e);}catch{} await window._fbAuth.signInWithEmailAndPassword(e,c); }
  catch(err){ pintarLogin(null,_msgLogin(err&&err.code)); }
}
async function recordarClave(){
  const e=(document.getElementById("lg-mail")?.value||"").trim();
  if(!e){ pintarLogin(null,"Escribe tu correo y vuelve a pulsar «He olvidado la contraseña»."); return; }
  try{ await window._fbAuth.sendPasswordResetEmail(e); pintarLogin(null,"Te hemos enviado un correo para cambiar la contraseña."); }
  catch(err){ pintarLogin(null,_msgLogin(err&&err.code)); }
}
async function cerrarSesion(){
  const k="cerrar-sesion"; if(!DESP[k]){ DESP[k]=true; render(); setTimeout(()=>{ if(DESP[k]){ delete DESP[k]; render(); } },4000); return; }
  delete DESP[k]; try{ await window._fbAuth.signOut(); }catch(e){} location.reload();
}
function sesionHTML(){
  if(NH_ES_DESARROLLO||!window._fbAuth||!window._fbAuth.currentUser)return "";
  const arm=!!DESP["cerrar-sesion"];
  return `<div style="background:#fff;border-radius:16px;padding:14px 16px;margin-top:14px;border:1px solid var(--border);display:flex;align-items:center;gap:10px">
    <div style="flex:1;min-width:0;font-size:13px;color:var(--muted)">🔐 Sesión iniciada como <b style="color:var(--dark)">${escH(window._fbAuth.currentUser.email||"")}</b></div>
    <button onclick="cerrarSesion()" style="padding:8px 12px;border-radius:10px;border:1.5px solid #C0492C;background:${arm?"#C0492C":"#fff"};color:${arm?"#fff":"#C0492C"};font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">${arm?"¿Seguro?":"Cerrar sesión"}</button></div>`;
}

function load(){
  if(READONLY_ID||ES_MODO_GRUPO){
    DATA=sanitizeData(migrateData(JSON.parse(JSON.stringify(INITIAL))));
    document.getElementById("app").innerHTML='<div style="text-align:center;padding:60px 20px"><div style="font-size:40px;margin-bottom:12px">⏳</div><div style="font-size:16px;font-weight:600;color:#2D6A4F">Cargando datos...</div></div>';
    const tryLoad=async()=>{
      if(!window._fbReady){
        await new Promise(res=>{
          const t=setTimeout(res,7000);
          window.addEventListener("firebase-ready",()=>{clearTimeout(t);res();},{once:true});
        });
      }
      try{
        const fbData=await window._fbLoad();
        if(fbData){DATA=sanitizeData(migrateData(fbData));if(DATA.members)DATA.members.forEach(m=>{if(!m.phone)m.phone="";if(!m.history)m.history=[];if(!m.joinMonth)m.joinMonth=null;if(!m.joinYear)m.joinYear=null;});}
        SYNC_STATUS="ok";
      }catch(e){console.error("Firebase readonly load failed:",e);SYNC_STATUS="error";}
      setCurrentMonthYear();
      render();
    };
    tryLoad();
    return;
  }

  // v45.27: el administrador entra con su cuenta (solo en producción; en desarrollo no hay sesión)
  if(!NH_ES_DESARROLLO&&!SESION_OK){ pedirSesionAdmin(); return; }

  // Modo administrador: localStorage primero (inmediato), Firebase después (en background)
  try{
    const s=localStorage.getItem(KEY);
    DATA=s?sanitizeData(migrateData(JSON.parse(s))):sanitizeData(migrateData(JSON.parse(JSON.stringify(INITIAL))));
    if(DATA.members)DATA.members.forEach(m=>{if(!m.phone)m.phone="";if(!m.history)m.history=[];if(!m.joinMonth)m.joinMonth=null;if(!m.joinYear)m.joinYear=null;});
  }catch{DATA=sanitizeData(migrateData(JSON.parse(JSON.stringify(INITIAL))));}
  // Respetar el mes/año guardado (solo se fija el actual si no hubiera ninguno)
  setCurrentMonthYear();
  SYNC_STATUS="init";
  render(); // Renderizar con datos locales inmediatamente

  // FIX IPHONE: sincronizar con Firebase UNA SOLA VEZ al cargar
  // Sin onSnapshot — sin WebSocket persistente — sin congelados
  const tryFirebase=async()=>{
    if(!window._fbReady){
      await new Promise(res=>{
        const t=setTimeout(res,5000);
        window.addEventListener("firebase-ready",()=>{clearTimeout(t);res();},{once:true});
      });
    }
    try{
      const fbData=await window._fbLoad();
      const hayLocal = !!localStorage.getItem(KEY) && DATA && DATA.members && DATA.members.length>0;
      if(!hayLocal && fbData){
        // localStorage vacío (teléfono nuevo, app reinstalada o caché borrada):
        // recuperar los datos desde el respaldo de la nube.
        DATA=sanitizeData(migrateData(fbData));
        if(DATA.members)DATA.members.forEach(m=>{if(!m.phone)m.phone="";if(!m.history)m.history=[];if(!m.joinMonth)m.joinMonth=null;if(!m.joinYear)m.joinYear=null;});
        localStorage.setItem(KEY,JSON.stringify(DATA));
      }else if(hayLocal && fbData && typeof fbData.updatedAt==="number" && fbData.updatedAt>(DATA.updatedAt||0)){
        // La nube tiene datos MÁS RECIENTES que este dispositivo (editaste desde otro
        // aparato). No se decide en automático: se pregunta. Mientras esté pendiente,
        // save() no debe subir nada a Firebase (evitaría pisar lo reciente con esto viejo).
        SYNC_DECISION_PENDING=true;
        MODAL={type:"sync_conflict",cloudData:fbData,localUpdatedAt:DATA.updatedAt||null,cloudUpdatedAt:fbData.updatedAt};
        SYNC_STATUS="ok";
        render();
        return; // el flujo continúa en resolverConflictoSync() cuando se elija una opción
      }else{
        // CASO NORMAL (un solo dispositivo): lo LOCAL es la verdad. Firebase NUNCA
        // pisa lo local; solo se usa como respaldo, subiendo la copia local a la nube.
        // Así una ayuda recién registrada no puede desaparecer al reabrir.
        // v45.26: si no hay datos (ni locales ni de la nube) no se sube nada.
        if(_datosVacios()){ SYNC_STATUS="error"; render(); toast(_AVISO_SIN_DATOS,8000); return; }
        try{await window._fbSave(DATA);}catch(e){}
      }
      SYNC_STATUS="ok";
    }catch(e){
      console.error("Firebase load failed:",e);
      SYNC_STATUS="error";
    }
    setCurrentMonthYear(SYNC_STATUS==="ok"); // v44.12: guarda el cambio automático de mes solo si la nube respondió bien
    render();
    // FIX IPHONE: NO llamamos a _fbListen aquí — eliminado completamente
  };
  tryFirebase();
}

// Guarda una copia de `data` en los respaldos locales (máx 3, se descarta la más
// antigua). origen indica de dónde viene esa copia ("local" o "nube") y ts la fecha
// de esos datos (DATA.updatedAt), para mostrarla luego en Gestión.
function guardarRespaldoLocal(data,origen,ts){
  try{
    const raw=localStorage.getItem(KEY_BACKUPS);
    const arr=raw?JSON.parse(raw):[];
    arr.push({ts:ts||Date.now(),origen,guardadoEn:Date.now(),data});
    while(arr.length>3)arr.shift();
    localStorage.setItem(KEY_BACKUPS,JSON.stringify(arr));
  }catch(e){console.error("No se pudo guardar el respaldo local:",e);}
}
function listarRespaldosLocales(){
  try{const raw=localStorage.getItem(KEY_BACKUPS);return raw?JSON.parse(raw):[];}catch{return[];}
}

// v45.35: la nube cambió desde otro aparato mientras esta app estaba abierta → no se ha subido
// nada; se abre el mismo aviso que al cargar para que el administrador elija. true si lo abrió.
function _abrirConflictoNube(){
  const nube=window._nubeConflicto; if(!nube)return false;
  window._nubeConflicto=null;
  SYNC_DECISION_PENDING=true; SYNC_STATUS="ok";
  MODAL={type:"sync_conflict",cloudData:nube,localUpdatedAt:DATA.updatedAt||null,cloudUpdatedAt:nube.updatedAt,enSesion:true};
  render();
  return true;
}
// El usuario decide qué hacer ante un conflicto de sincronización (modal "sync_conflict").
async function resolverConflictoSync(choice){
  if(!MODAL||MODAL.type!=="sync_conflict")return;
  const cloudData=MODAL.cloudData;
  if(choice==="cloud"){
    // Antes de reemplazar lo local por lo de la nube, respaldar lo local actual con su fecha.
    guardarRespaldoLocal(DATA,"local",MODAL.localUpdatedAt);
    DATA=sanitizeData(migrateData(cloudData));
    if(DATA.members)DATA.members.forEach(m=>{if(!m.phone)m.phone="";if(!m.history)m.history=[];if(!m.joinMonth)m.joinMonth=null;if(!m.joinYear)m.joinYear=null;});
    try{localStorage.setItem(KEY,JSON.stringify(DATA));}catch{}
    if(typeof cloudData.updatedAt==="number")window._nubeTs=cloudData.updatedAt; // v45.35: esta es ya la versión de la nube
    toast("☁️ Datos de la nube cargados ✓");
  }else{
    // Mantener local: los de la nube van a quedar pisados por la subida de abajo, así
    // que primero se respaldan (con su propia fecha) para que no se destruyan sin copia.
    guardarRespaldoLocal(cloudData,"nube",MODAL.cloudUpdatedAt);
    toast("📱 Mantienes los datos de este dispositivo");
  }
  MODAL=null;
  SYNC_DECISION_PENDING=false; // se reanuda el flujo normal de save()
  render();
  if(choice==="local"){
    // Continúa el flujo normal (caso de siempre): lo local es la verdad, se sube como respaldo.
    // v45.35: el administrador ya eligió este dispositivo → se sube aunque la nube sea distinta
    try{ const ok=await window._fbSave(DATA,{forzar:true}); SYNC_STATUS=ok?"ok":"error"; }catch(e){}
  }
  setCurrentMonthYear(true); // v44.12: conflicto resuelto → se puede guardar el cambio automático de mes
  render();
}

// Restaura una copia de respaldo (por índice en listarRespaldosLocales()). Antes de
// restaurar, guarda el estado actual como respaldo también: ninguna restauración
// puede destruir datos sin que quede su copia.
async function restaurarRespaldoLocal(idx){
  const arr=listarRespaldosLocales();
  const bk=arr[idx];
  if(!bk)return;
  guardarRespaldoLocal(DATA,"local",DATA.updatedAt||Date.now());
  DATA=sanitizeData(migrateData(JSON.parse(JSON.stringify(bk.data))));
  if(DATA.members)DATA.members.forEach(m=>{if(!m.phone)m.phone="";if(!m.history)m.history=[];if(!m.joinMonth)m.joinMonth=null;if(!m.joinYear)m.joinYear=null;});
  closeModal();
  await save();
  toast("♻️ Copia de seguridad restaurada ✓");
  render();
}

// Diagnóstico: releer localStorage SIN tocar nada y comparar con memoria
function diagLeerLS(){
  let raw=""; try{raw=localStorage.getItem(KEY)||"";}catch(e){toast("No se puede leer localStorage: "+e.message);return;}
  if(!raw){toast("⚠️ localStorage VACÍO — el teléfono está borrando los datos");return;}
  let c=0; try{const o=JSON.parse(raw);(o.members||[]).forEach(m=>{c+=(m.loans||[]).length;});}catch(e){toast("localStorage corrupto");return;}
  let mem=0; DATA.members.forEach(m=>{mem+=(m.loans||[]).length;});
  toast("Teléfono: "+c+" ayudas · Memoria: "+mem+" ayudas");
}
async function subirAhoraNube(){
  if(_datosVacios()){ toast(_AVISO_SIN_DATOS,6000); return; }
  if(!NH_ES_DESARROLLO&&!SESION_OK){ toast("Inicia sesión para subir datos"); return; }
  DATA.updatedAt=Date.now();
  try{localStorage.setItem(KEY,JSON.stringify(DATA));}catch{}
  if(!window._fbReady){toast("Conectando con la nube, espera un momento e inténtalo de nuevo");return;}
  toast("Subiendo a la nube...");
  try{
    const ok=await window._fbSave(DATA);
    if(ok){SYNC_STATUS="ok";toast("✓ Datos subidos a la nube ("+DATA.members.length+" miembros)");}
    else if(_abrirConflictoNube())return;
    else{SYNC_STATUS="error";toast("No se pudo subir. Revisa tu conexión.");}
  }catch(e){SYNC_STATUS="error";toast("Error al subir a la nube");}
  const dot=document.querySelector(".sync-indicator");
  if(dot)dot.innerHTML=syncHTML();
}

// v45.26: unos datos sin personas solo pueden venir de un arranque sin conexión (el archivo
// ya no trae la lista): NUNCA se guardan, ni en este dispositivo ni en la nube.
function _datosVacios(){ return !DATA||!Array.isArray(DATA.members)||DATA.members.length===0; }
const _AVISO_SIN_DATOS="⛔ No se han podido cargar los datos. No se guardará nada: cierra la app y vuelve a abrirla con conexión.";
async function save(){
  if(_datosVacios()){ toast(_AVISO_SIN_DATOS,6000); return; }
  if(!NH_ES_DESARROLLO&&!READONLY_ID&&!ES_MODO_GRUPO&&!SESION_OK)return; // v45.27: sin sesión no se guarda nada
  DATA.updatedAt=Date.now(); // marca de tiempo: para que gane siempre la versión más reciente
  invalidateAuditCache(); // los datos cambiaron: la próxima lectura del chip/tarjeta recalcula
  try{localStorage.setItem(KEY,JSON.stringify(DATA));}catch{}

  if(SYNC_DECISION_PENDING)return; // hay un conflicto de sync sin resolver: solo local, nada de Firebase

  if(!READONLY_ID&&!ES_MODO_GRUPO){
    SYNC_STATUS="saving";
    // FIX IPHONE: actualizar solo el indicador, sin re-renderizar todo
    const dot=document.querySelector(".sync-indicator");
    if(dot)dot.innerHTML=syncHTML();

    try{
      if(window._fbReady){
        const ok=await window._fbSave(DATA);
        SYNC_STATUS=ok?"ok":"error";
        if(!ok&&_abrirConflictoNube())return;
      }else{
        SYNC_STATUS="offline";
      }
    }catch{SYNC_STATUS="error";}

    // Actualizar solo el indicador de sync, no todo el render
    const dot2=document.querySelector(".sync-indicator");
    if(dot2)dot2.innerHTML=syncHTML();
  }
}

function syncHTML(){
  if(SYNC_STATUS==="ok")return'<span class="sync-dot sync-ok"></span>Sincronizado';
  if(SYNC_STATUS==="saving")return'<span class="sync-dot sync-ing"></span>Guardando...';
  if(SYNC_STATUS==="error")return'<span class="sync-dot sync-err"></span>Sin conexión — guardado local';
  if(SYNC_STATUS==="offline")return'<span class="sync-dot sync-err"></span>Offline — guardado local';
  return'<span class="sync-dot sync-ing"></span>Conectando...';
}

// Aviso de conflicto: hay datos más recientes en la nube que en este dispositivo.
// No se puede cerrar tocando fuera — hay que elegir una de las dos opciones.
function syncConflictModalHTML(){
  const localT=MODAL.localUpdatedAt?new Date(MODAL.localUpdatedAt).toLocaleString("es-ES"):"(sin fecha)";
  const cloudT=MODAL.cloudUpdatedAt?new Date(MODAL.cloudUpdatedAt).toLocaleString("es-ES"):"(sin fecha)";
  const enSesion=!!MODAL.enSesion; // v45.35: otro aparato guardó mientras esta app estaba abierta
  return`<div class="modal-title">☁️ ${enSesion?"Se guardó desde otro dispositivo":"Hay datos más recientes en la nube"}</div>
<div style="font-size:15px;line-height:1.6;color:var(--dark);margin-bottom:18px">
  ${enSesion?"Mientras tenías la app abierta se guardaron cambios desde <b>otro dispositivo</b>. Lo último que has hecho aquí <b>no se ha subido</b>, para no borrar lo del otro. ¿Con cuáles te quedas? Los que no elijas se guardan como copia de seguridad.":"Parece que se editaron los datos desde <b>otro dispositivo</b>. ¿Cuáles quieres usar?"}
</div>
<div style="background:#F5F0EB;border-radius:14px;padding:14px;margin-bottom:10px">
  <div style="font-size:13px;color:var(--muted);font-weight:600">📱 Este dispositivo</div>
  <div style="font-size:18px;font-weight:800;color:var(--dark)">${localT}</div>
</div>
<div style="background:#F5F0EB;border-radius:14px;padding:14px;margin-bottom:22px">
  <div style="font-size:13px;color:var(--muted);font-weight:600">☁️ La nube</div>
  <div style="font-size:18px;font-weight:800;color:var(--dark)">${cloudT}</div>
</div>
<button class="backup-btn" style="background:#2D6A4F;color:#fff;font-size:16px;padding:16px" onclick="resolverConflictoSync('cloud')">☁️ Usar los de la nube${enSesion?"":" (más recientes)"}</button>
<button class="backup-btn" style="background:#fff;color:var(--dark);border:2px solid var(--dark);font-size:16px;padding:16px" onclick="resolverConflictoSync('local')">📱 Mantener los de este dispositivo</button>`;
}
function armarRestaurar(idx){
  if(_restoreArmedIdx!==idx){
    _restoreArmedIdx=idx;
    render();
    toast("Toca de nuevo ♻️ Restaurar para confirmar");
    setTimeout(()=>{if(_restoreArmedIdx===idx){_restoreArmedIdx=null;render();}},4000);
    return;
  }
  _restoreArmedIdx=null;
  restaurarRespaldoLocal(idx);
}
function restaurarBackupsModalHTML(){
  const arr=listarRespaldosLocales();
  let h=`<div class="modal-title">🗄️ Restaurar copia de seguridad local</div>`;
  if(!arr.length){
    h+=`<p style="font-size:14px;color:var(--muted);text-align:center;padding:12px 0">Todavía no hay copias de seguridad guardadas.</p>`;
  }else{
    h+=`<p style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.5">Se crean automáticamente cuando se resuelve una diferencia entre este dispositivo y la nube. Restaurar una copia guarda antes el estado actual, así que nunca se pierde nada.</p>`;
    arr.forEach((bk,i)=>{
      const fecha=bk.ts?new Date(bk.ts).toLocaleString("es-ES"):"(sin fecha)";
      const origenTxt=bk.origen==="nube"?"☁️ Copia de la nube":"📱 Copia de este dispositivo";
      const armed=_restoreArmedIdx===i;
      h+=`<div style="background:#F5F0EB;border-radius:14px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div>
          <div style="font-size:12px;color:var(--muted);font-weight:600">${origenTxt}</div>
          <div style="font-size:15px;font-weight:700;color:var(--dark)">${fecha}</div>
        </div>
        <button style="padding:10px 14px;border:none;border-radius:12px;background:${armed?"#C75B0E":"var(--dark)"};color:#fff;font-size:13px;font-weight:700;white-space:nowrap" onclick="armarRestaurar(${i})">${armed?"♻️ Confirmar":"Restaurar"}</button>
      </div>`;
    });
  }
  h+=`<button style="width:100%;padding:12px;border:2px solid #ddd;border-radius:14px;background:transparent;color:#999;font-size:13px;font-weight:600;margin-top:6px" onclick="closeModal()">Cerrar</button>`;
  return h;
}

function saveCfg(){
  // El aporte mensual ya no se edita aquí (se gestiona por asociado en ⚙️ Nivel/Ciclo).
  // Se conserva DATA.monthlyFee como valor por defecto de seguridad.
  const rate=parseFloat(document.getElementById("cfg-rate")?.value)||5;
  let dia=parseInt(document.getElementById("cfg-diaaviso")?.value);
  if(isNaN(dia)||dia<1||dia>28)dia=25; // rango seguro; 28 evita meses cortos
  DATA.rate=rate;DATA.diaAvisoProximo=dia;
  save();toast("Configuración guardada ✓");
}
// Si la auditoría interna encuentra errores, pide confirmación de dos toques antes de
// exportar (sin confirm() nativo, poco fiable en PWA/iPhone — regla crítica del proyecto).
function exportData(){
  const r=auditarNH();
  const btn=document.querySelector(".backup-export");
  if(r.errores.length>0&&!_exportArmed){
    _exportArmed=true;
    if(btn)btn.textContent=`⚠️ ${r.errores.length} error(es) en la auditoría — toca de nuevo para exportar igual`;
    toast("La auditoría interna encontró errores (ver Gestión → 🔍 Auditoría interna). Toca \"Exportar\" otra vez para exportar de todas formas",5000);
    setTimeout(()=>{_exportArmed=false;if(btn)btn.textContent="📤 Exportar datos (JSON)";},5000);
    return;
  }
  _exportArmed=false;
  if(btn)btn.textContent="📤 Exportar datos (JSON)";
  const json=JSON.stringify(DATA,null,2);
  const blob=new Blob([json],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=`NH_backup_${DATA.reportMonth}${DATA.reportYear}.json`;a.click();URL.revokeObjectURL(url);
  toast("💾 Backup exportado ✓");
}
function importarModalHTML(){
  const p=MODAL.parsed; if(!p)return "";
  const nAsoc=x=>(x.members||[]).filter(m=>m.type==="asociado").length, nTerc=x=>(x.members||[]).filter(m=>m.type==="tercero").length;
  const fecha=p.updatedAt?new Date(p.updatedAt).toLocaleString("es-ES"):"sin fecha";
  return `<div class="modal-title">📂 Importar copia de seguridad</div>
<div style="background:#FFF4E5;border:1.5px solid #E0A040;border-radius:12px;padding:12px;font-size:13.5px;color:#6B4210;line-height:1.5;margin-bottom:12px">
  ⚠️ Esto <b>reemplaza todos los datos actuales</b> por los de la copia.</div>
<div style="font-size:13.5px;line-height:1.7;margin-bottom:14px">
  <div>Archivo: <b>${escH(MODAL.archivo||"")}</b></div>
  <div>Copia del: <b>${escH(fecha)}</b> · mes ${escH(p.reportMonth||"?")} ${escH(String(p.reportYear||""))}</div>
  <div>En la copia: <b>${nAsoc(p)}</b> asociados y <b>${nTerc(p)}</b> terceros</div>
  <div>Ahora tienes: <b>${nAsoc(DATA)}</b> asociados y <b>${nTerc(DATA)}</b> terceros</div>
</div>
<button style="width:100%;padding:13px;border-radius:14px;background:#B42318;color:#fff;font-size:15px;font-weight:800;border:none;cursor:pointer;margin-bottom:8px" onclick="importarConfirmado()">Sí, reemplazar mis datos</button>
<button style="width:100%;padding:12px;border-radius:14px;background:var(--bg);color:var(--dark);font-size:14px;font-weight:700;border:2px solid var(--border);cursor:pointer" onclick="closeModal()">Cancelar</button>`;
}
function importarConfirmado(){
  const p=MODAL&&MODAL.parsed; if(!p)return;
  DATA=p; MODAL=null;
  save();toast("📂 Datos importados ✓");render();
}
function importData(){
  const input=document.createElement("input");input.type="file";input.accept=".json,application/json";
  input.onchange=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const parsed=JSON.parse(ev.target.result);
        if(!parsed.members||!Array.isArray(parsed.members))throw new Error("Formato inválido");
        openModal('importar',{parsed,archivo:file.name}); // v45.21: sin confirm() (regla 5)
      }catch(err){toast("Error al importar: "+err.message);}
    };
    reader.readAsText(file);
  };
  input.click();
}
