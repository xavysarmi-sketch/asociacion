// Nuevos Horizontes · arranque.js
// Estado de la app (variables) y arranque: se ejecuta en el MISMO orden que en el archivo único.
const NH_ES_DESARROLLO=detectarEntornoNH().modo==="desarrollo";
// Producción y desarrollo nunca comparten claves locales: una copia de pruebas no
// puede imponerse a datos reales ni una copia real filtrarse al entorno de laboratorio.
const KEY=NH_ES_DESARROLLO?"nh-app-v9-dev":"nh-app-v9";
const KEY_BACKUPS=NH_ES_DESARROLLO?"nh-app-v9-backups-dev":"nh-app-v9-backups"; // máx 3
// Mientras hay un conflicto de sincronización pendiente de decidir (modal en pantalla),
// save() NO debe subir a Firebase: si lo hiciera, lo local viejo pisaría lo más reciente
// de la nube antes de que el usuario decida. Se reanuda al resolver el modal.
let SYNC_DECISION_PENDING=false;
const READONLY_ID=URL_PARAMS.get("socio")||null;
const GRUPO_IDS=URL_PARAMS.get("grupo")?URL_PARAMS.get("grupo").split(",").map(id=>decodeURIComponent(id)):null;
// Enlace grupal ESTABLE: apunta al asociado principal del grupo (?grupoppal=ID).
// La lista de miembros se lee del grupo guardado (gruposCierre) en el momento de abrir,
// así el enlace se actualiza solo al editar el grupo y no hay que reenviarlo.
const GRUPO_PPAL=URL_PARAMS.get("grupoppal")?decodeURIComponent(URL_PARAMS.get("grupoppal")):null;
// ¿Estamos en cualquier modo grupo? (formato nuevo por principal o formato antiguo por lista)
const ES_MODO_GRUPO = !!(GRUPO_IDS || GRUPO_PPAL);
const GRUPO_YO=URL_PARAMS.get("yo")?decodeURIComponent(URL_PARAMS.get("yo")):null;
let GRUPO_VISTA="elegir"; // pestaña activa en el enlace grupal: "elegir" | "grupo" | "mi"

let DATA,TAB="inicio",BUSY=false,MODAL=null,FICHA_ID=null,DESP={};
let FICHA_TAB="resumen"; // pestaña activa dentro del detalle del asociado
let CODE_CHECKS={ran:false,running:false,online:true,ok1:null,ok2:null,ok3:null,ok4:null,ts:null}; // resultados del auto-chequeo de código
let UPDATE_CONFIRMED=false; // true en cuanto se confirma que se está viendo la versión publicada
let REPORT_FILTER="todos"; // "todos" (orden de entrada) | "activas" (solo con ayudas activas)
let LISTA_ABIERTA=false; // la lista de asociados arranca plegada para ver el control contable de un vistazo
let AYUDAS_NUEVAS_ABIERTA=false; // detalle de "Ayudas nuevas del mes" en Resumen General, arranca plegado
let CIERRE_SEARCH=""; // texto del buscador del Cierre
let ASOC_SEARCH=""; // texto del buscador de Asociados
// Grupos de cierre: se guardan en DATA.gruposCierre = [{id, principalId, miembros:[mid,...]}]
// Los items (aporte/cuotas) se calculan en vivo según el mes seleccionado.
let VISTA_ASOC=null; // v45.21: «👁️ Ver como lo ve» — {tipo:"socio"|"grupo", mid, ppal, ids, yo, volver}
let MG_INT_OPEN=false, MG_EXT_OPEN=false; // desplegables de Gestión (arrancan cerrados)
let AUDIT_OPEN=false; // desplegable de la tarjeta "🔍 Auditoría interna" (arranca cerrado)
let SEND_SELECTED=new Set(),SEND_FILTER="all",SEND_SEARCH="";
let WA_QUEUE=[],WA_IDX=0;
let UNDO_SNAPSHOT=null,UNDO_TIMER=null;


// ══ v45.27 · SESIÓN DEL ADMINISTRADOR ═══════════════════════════════════════════════════════
// La app del administrador (sin ?socio= ni ?grupo…) solo se abre con la cuenta de Firebase del
// administrador. Los enlaces de los asociados no piden nada. La sesión se recuerda en el
// dispositivo: se entra una vez y no se vuelve a pedir hasta «Cerrar sesión».
let SESION_OK=false, _SESION_ESCUCHA=false;

let SYNC_STATUS="init";
const _IC_RE=new RegExp("("+Object.keys(_IC_M).join("|")+")\\uFE0F?","gu");
(function(){
  const ob=new MutationObserver(ms=>{ ms.forEach(m=>{ if(m.type==="characterData")iconizar(m.target); else m.addedNodes.forEach(iconizar); }); });
  const go=()=>{ iconizar(document.body); ob.observe(document.body,{childList:true,subtree:true,characterData:true}); };
  if(document.body)go(); else document.addEventListener("DOMContentLoaded",go,{once:true});
})();

// auditarNH() recorre TODO DATA — barato hoy (27 asociados), pero crece con el nº de
// asociados × ayudas × meses. El chip de cabecera y la tarjeta de Gestión lo llaman en
// CADA render(), así que se cachea aquí e invalida solo cuando cambian los datos
// (save() lo invalida explícitamente; la clave por updatedAt+nº miembros es la 2ª red
// de seguridad). auditarNH() en sí sigue sin caché, para pruebas y el botón manual.
let _audCache=null,_audKey=null;
// v45.0 (decisión de Ángel 03/10/2026): en lo que ve el asociado (su enlace, el del grupo y la
// vista previa) un aporte AÚN NO PAGADO se muestra como «desde 50 €» (el mínimo, Maestro AP-1),
// nunca con lo que puso el mes pasado: no está obligado a repetirlo. Lo ya pagado se ve tal cual.
// El administrador sigue viendo el aporte habitual / elegido para cobrar.
let _VP=0;
// ══ v45.14 · PESTAÑA AYUDAS: SOLICITUDES Y DINERO DISPONIBLE (decisión de Ángel 08/10/2026) ══════════
// DATA.solicitudes = [{id, mid|null, nombre, capital, cuotas, fecha, estado:"pendiente"|"otorgada"|"no", lid?, mesOtorgada?, entregaGid?}]
// Lo no otorgado sigue en la lista, en su orden. Otorgar abre «Ayuda aprobada» ya relleno (y antes el alta si es nueva).
let SOL_FORM=false;
let SOL_PREFILL=null; // v45.17: {simGid, simRef} cuando la solicitud viene de una simulación del cierre grupal
// ── v45.13: CUENTA CON EL RESPONSABLE DEL GRUPO (decisión de Ángel 07/10/2026) ──────────────
// Solo control del administrador: lo que el principal del grupo le va entregando y las ayudas
// nuevas que paga en su nombre con el dinero cobrado. No toca la caja, el reparto ni lo pagado
// de cada asociado (eso se sigue marcando uno a uno). DATA.cuentasGrupo[mesKey][gid] = {movs:[…]}
// movs: {id, tipo:"entrega"|"ayuda"|"arrastre"|"pasado", importe, fecha, lid?, mid?, nombre?, de?}
let CG_FORM=null; // {gid, tipo} formulario abierto
let CG_SIM_MES={}; // v45.17: mes de la simulación por grupo {gid:idx} (por defecto, el del cierre)
let CG_SIM={};    // v45.13: simulación de ayudas por grupo {gid:[{v,nombre},…]} — solo en memoria, no se guarda

let _delMemberArmed=null;
let _delLoanArmed=null;
// v45.21: marcar una cuota como pagada desde la tarjeta: 1.er toque la señala, 2.º la marca (desmarcar va directo, como antes)
let _cuotaArmada=null;

// FIX IPHONE: cancelar timeout anterior para evitar renders acumulados
let _copyRenderTimer=null;

// Lista de copias de seguridad locales (hasta 3), con confirmación de doble toque
// por copia (mismo patrón que eliminar una ayuda: primer toque arma, segundo restaura).
let _restoreArmedIdx=null;

// ══ v45.28 · PERMANENCIAS (Maestro PE-2, PE-5, PE-7, BE-3, SA-5) ═══════════════════════════
// Solo lectura. Para cada asociado activo: mes de su último aporte (hoja de calendario), mes en que
// se le paga (el siguiente: ahí se anota su último beneficio, mes vencido) y el total previsto.
let PERM_FIL="todas"; // todas | prox (próximos 3 meses) | indef

// ══ v45.22 · TELÉFONOS ══════════════════════════════════════════════════════════════════
// Solo guardan el número (no envían nada). Se guarda al salir de la casilla, sin repintar la pantalla.
let TEL_SOLO_SIN=false;

// v44.21: reglas del Maestro (§11.1) al conceder o editar un apoyo — las mismas que revisa la
// auditoría. Devuelve {bloqueo, aviso}: con bloqueo no se guarda; el aviso solo informa.
// v45 (Maestro v18.2 · AY-1, AY-5, AY-6): reglas al conceder o editar una ayuda. Devuelve
// {bloqueo, aviso}: con bloqueo no se guarda. Las ayudas concedidas antes de octubre 2026 se
// juzgan con las reglas del v17 (conservan sus condiciones · Maestro 16.1).
const AY_V18_DESDE=2026*12+MONTHS.indexOf("Oct");
let _delHistArmed=null;
let _saveEditArmed=false;

// FIX IPHONE: debounce para el buscador — evita render() en cada tecla
let _searchTimer=null;

let _exportArmed=false;

const fichaResumenHTML=_enVistaPersonal(_fichaResumenHTMLbase); // solo se usa en los enlaces de grupo
const _fichaHTMLpersonal=_enVistaPersonal((m,ro)=>_fichaHTMLbase(m,ro));
// ══════════════════════════════════════════════════════════════════════════════
// v44.17 — DOCUMENTOS DEL MES PARA IMPRIMIR (solo lectura: no escriben datos)
//  · Hoja de cobro: resumen para comentar en la reunión + tabla por grupos de cierre
//    para apuntar el cobro en efectivo + arqueo de caja.
//  · Acta de cierre: lo previsto frente a lo cobrado del mes ya cerrado.
// Se abren desde el Cierre (mes seleccionado) y se imprimen o guardan en PDF.
// ══════════════════════════════════════════════════════════════════════════════
let DOC_IMP=null; // {tipo:"cobro"|"acta", rm, ry}
// ── v44.17: LIBRO DE CAJA ────────────────────────────────────────────────────────
// Entradas y salidas reales de dinero mes a mes desde agosto de 2025 (saldo inicial 0 €,
// como en el acta original de agosto). Entradas: aportaciones y cuotas cobradas, aportes
// puntuales recibidos. Salidas: apoyos entregados, aportes puntuales devueltos (con su
// retorno) y devoluciones por baja pagadas. Capital prestado = lo que falta por devolver de
// los apoyos al cerrar el mes. Solo lectura.
let _CAJA_CACHE=null;
let PDF_LISTO=null; // {file, url, nombre}
// ══ v45.6 · SIMULADORES (Maestro v18.4: AY-1, AY-3, AY-6, BE-1/2/3, PE-5) ═══════════════════
// Solo calculan y pintan: no guardan nada. De momento se abren desde la ficha en la app del
// administrador; están escritos para poder enseñarlos después en el enlace del asociado.
let SIM=null; // {mid, tab:"ayuda"|"ben", ciclo, cap, n, ap}
const renderGrupo=_enVistaPersonal(_renderGrupoBase);



load();
