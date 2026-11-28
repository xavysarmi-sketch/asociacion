CLAUDE.md — Proyecto Nuevos Horizontes (NH Reportes)

Guía general de NH (qué es cada cosa, carpetas, reglas para cualquier IA): `..\..\LEEME_PRIMERO.md`.
Este archivo solo añade las reglas técnicas de la app.

## Contexto
App de gestión de un fondo común de apoyo mutuo en Madrid. Administrador único: Ángel (Ángel),
conocimientos técnicos básicos. Idioma de trabajo: SIEMPRE español. Explicar los cambios en
lenguaje sencillo antes de aplicarlos.

## La app
- HTML/JS vanilla, sin frameworks. PWA usada en iPhone/Safari. Desde v45.36 la app está REPARTIDA
  en archivos (antes era un solo index.html de unas 9.000 líneas):
  · index.html — solo el esqueleto HTML y la lista de archivos, en orden;
  · css/nh.css — todos los estilos;
  · js/firebase.js — entorno y conexión (se ejecuta al cargarse);
  · js/maestro.js — LAS REGLAS DEL FONDO EN UN SOLO SITIO (desde v45.38): límites de ayudas,
    beneficios por bloque, avisos de salida, referidos, pausa… cada número con su código del
    Maestro. Si el Maestro cambia una regla, se cambia ahí y en ningún otro sitio (y en la tabla
    REGLAS de NH Oficial\nh_auditoria.py, que debe coincidir);
  · js/utilidades.js, datos.js, reglas.js, iconos.js, general.js, cierre.js, grupos.js, documentos.js,
    personas.js, ayudas.js, gestion.js, enlaces.js, inicio.js (barra de abajo, Inicio, Ayudas, «Ayuda
    registrada», Texto grande) — SOLO declaraciones (funciones y constantes fijas),
    agrupadas por tema; no ejecutan nada al cargarse;
  · js/arranque.js — las variables de estado y el arranque, en el mismo orden de siempre;
  · js/aviso-version.js — aviso de nueva versión.
  Son scripts clásicos (no módulos): todo comparte el ámbito global, igual que antes. El ORDEN de
  los <script> en index.html importa: no cambiarlo. Código que se ejecute al cargarse va solo en
  arranque.js (o firebase.js / aviso-version.js), nunca en los archivos de declaraciones.
- Firebase (Firestore) + localStorage. Publicada en GitHub Pages (repo público).
- Estructura de datos: objeto DATA con members[], cada miembro con loans[] y closedLoans[],
  cada loan con pays[] {m, año, paid}.
- Colores de marca: verde #1B4332 / #2D6A4F, naranja #E07A3A, crema #F5F0EB.
- Qué se hizo en cada versión y por qué (pantallas, nombres de funciones, decisiones): `docs/HISTORIAL.md`.
- Fundadores (ids 1–10): borde dorado + "⭐ Fundador".

## Diseño que se adapta solo (norma permanente desde el 18/11/2026, Ángel)
Las dos apps tienen que verse bien solas en cualquier pantalla (iPhone pequeño o grande, Android, tablet, ordenador) y con
cualquier tamaño de letra del móvil. Vale para TODO cambio nuevo:
- Sin anchos fijos en px para textos o cajas: flex o grid con `min-width:0`, `flex:1 1 <base>` y `flex-wrap:wrap`; como mucho
  un ancho máximo en pantallas grandes (`max-width`).
- Letra relativa en lo nuevo (`rem`; `clamp()` en títulos y cifras grandes). OJO: la letra del iPhone se aplica con el zoom
  de `#app` (js/general.js, nhEscalaLetra, ×1 a ×1,2): con zoom, cada px ya crece; lo que importa es que, al crecer, todo
  quepa (con ×1,3 un móvil de 375 px se comporta como uno de unos 288 px).
- Filas «nombre · dato»: si no caben, el dato baja debajo del nombre (`flex-wrap:wrap` y `margin-left:auto` en el dato), nunca
  `white-space:nowrap` + `overflow:hidden` + puntos suspensivos en textos que hay que leer (nombres, cifras, botones).
- Botones en fila: bajan a la línea siguiente en vez de cortarse o salirse.
- Antes de publicar, `verificar_app.js` pasa la prueba «pantallas y letra» (apartado 3b, o `--solo-pantallas`): 320, 375, 430
  y 768 px, letra normal y +30 %; ningún texto ni botón puede cortarse ni salirse de su caja o de la pantalla. Si algo falla,
  NO se publica. Con `--capturas <carpeta>` guarda fotos del Inicio y del simulador de cada caso para enseñárselas a Ángel.
- Lo que la prueba no ve (un texto que queda feo pero cabe, una palabra sola abajo): mirarlo en las capturas.

## REGLAS CRÍTICAS (no romper nunca)
1. Los datos reales viven en Firestore (con copia en el móvil). El INITIAL del código está
   SIEMPRE desactualizado. Nunca tocar datos de miembros/importes sin datos reales: el último
   `NH Oficial\json\auto_*.json` (lo guarda la sincronización cada noche) o una exportación
   desde la app. Si falta, pedirlo y no inventar números.
2. La línea `const URL_PARAMS = new URLSearchParams(window.location.search)` debe conservarse
   inmediatamente después de la llave de cierre de sanitizeData() (las dos en js/datos.js). Si se borra, la app queda
   en pantalla en blanco.
3. sanitizeData() debe preservar los miembros creados en la app (flag origen:"app" o id que
   empieza por "m") además de los de INITIAL. Fue la causa raíz del bug "apoyos que no se
   guardaban" (corregido en v39.0). No revertir esta lógica.
4. Sin Service Worker. La caché se controla con metaetiquetas anti-caché + recarga forzada
   con ?_v=timestamp (conservando los parámetros socio/grupo/yo). No eliminar.
5. No usar confirm() nativo: en PWA/iPhone es poco fiable. Usar confirmación de dos toques.
6. El repo se publica en GitHub Pages. Dentro de asociacion\ solo puede haber código
   (index.html y configuración). Los JSON exportados, el Excel, los Word y las copias
   de trabajo viven en `C:\Users\xavys\Documents\NH Oficial\`. Si necesitas un archivo
   de datos para trabajar, LÉELO desde NH Oficial\; no lo copies al repo ni siquiera de
   forma temporal. Antes de cualquier commit, ejecuta `git status` y confirma que no
   aparece ningún .json, .xlsx, .docx ni carpeta de trabajo. (Incidente real: el 2026-07-31
   se dejaron NH_backup_Ago2026.json, NH_fixture_pruebas.json y una carpeta _trabajo_v44\
   dentro del repo — nunca llegaron a commitearse, pero fue un error evitable.)
7. El render NUNCA escribe datos. Las funciones de pintado (render() y sus sub-bloques
   por pestaña) solo CALCULAN y COMPARAN — nunca deben guardar en DATA como efecto
   colateral de mostrar la pantalla. Toda escritura debe venir de una acción explícita
   del usuario (marcar un aporte, una cuota, pulsar "Reconciliar") o de una migración
   declarada (migrateData). Si al renderizar hace falta inicializar un dato que no
   existe todavía, se hace SOLO cuando el registro no existía previamente (comprobar
   la existencia ANTES de llamar a cualquier función tipo getMesData que pueda crearlo),
   nunca sobre uno ya guardado. (Causa raíz real del bug "recargo de julio cambió de
   565 a 615 sin que Ángel lo supiera", corregido en v44.2: recalcMesRecargo() se
   ejecutaba en cada render de Cierre y pisaba el recargo guardado del mes activo.)
8. Todo punto de creación o edición de una ayuda debe pasar por ayudaCuotas() o
   recalcularApoyo() y guardar total, cuotas y rate. Antes de cerrar cualquier tarea
   que toque el cálculo, auditar TODOS los puntos donde se crea o modifica una ayuda,
   no solo el formulario principal. (Causa raíz real: addCierreLoanSubmit — el botón
   "＋ Registrar ayuda aprobada" de Cierre — reimplementaba el cálculo por su cuenta y
   guardaba la ayuda sin total/cuotas/rate; corregido en v44.3.)
9. Campos que guardan una referencia a otra persona (avalistaEnConcesion, ref, y
   similares) SIEMPRE guardan el ID, nunca el nombre. El nombre se resuelve EN EL
   MOMENTO DE MOSTRAR (pantalla, Excel, mensajes), no al guardar — así, si alguien
   se renombra (ver ALIAS_NOMBRES), el dato histórico
   sigue apuntando a la persona correcta en vez de quedar congelado con el nombre
   antiguo.

## Reglas y decisiones vigentes que vienen del historial
Estaban dentro de notas de versión (ahora en `docs/HISTORIAL.md`); comprobadas en el código el 25/11/2026.
- Persona autorizada (SA-11): `m.autorizado={nombre,desde}` guarda el NOMBRE, no el id (excepción a la regla
  crítica 9: puede no ser asociado; sin número de documento). Solo va en la ficha del propio asociado
  (datosPrivadosDe): el responsable no ve la de su grupo. (v46.45)
- «Si sales hoy» (siSalesHoyHTML) no se pone en Inicio: decisión de Ángel, no invitar a salir. (v46.39)
- El simulador no ofrece la permanencia indefinida: llega a 36 meses; quien ya es indefinido la sigue viendo como
  la suya (decisión de Ángel 25/10/2026). (v45.53)
- Aviso de salida (SA-1): la app NO aplica sola el corte del día 15; el mes del aviso lo elige el coordinador. (v46.40)
- Permanencia que se amplía sola (PE-5): no es automática; la anota el coordinador con dos toques (ampliarSola),
  porque el render nunca escribe (regla crítica 7). (v46.37)
- Al probar cálculos del mes, probar también con el aporte del mes en curso sin pagar (lo normal en la primera
  quincena). (v46.41)
- `DATA.cuentasGrupo[mes][gid].tarde` («paga más tarde») va APARTE de `movs` a propósito: no cambia _cgFalta ni los
  cuadres de la auditoría, ni lo que leen sync_nh.py y nh_balance.py. (v46.38)
- Ficha del administrador: lo que cambia solo para él va con `!vistaPersonal()`; la app de asociados lee las filas
  de la vista personal (nhaFilas): no tocar la vista personal. (v46.6)
- `NHA_COORD_WA` (app/app.js) = `COORD` (info/index.html): si cambia el WhatsApp del coordinador, cambiar los dos. (v46.30)
- Enlaces antiguos (?socio=, ?grupo=, ?grupoppal=): en producción solo «Este enlace ya no se usa»
  (pintarEnlaceRetirado, js/datos.js) y no leen la nube; en modo desarrollo siguen funcionando porque las pruebas
  (verificar_app.js, revisor) los usan. (v46.4)
- App de asociados: el manifest se pone SOLO en Android y nunca en iPhone (allí cambiaría la dirección guardada y se
  perdería el ?c= de cada persona), y no lleva service worker (regla crítica 4). (v45.52, v45.82)
- Tras «Darle de alta de nuevo» a quien salió: la sincronización no cambia nombres, así que hay que renombrar a mano
  (con respaldo) la fila antigua de la Maestra, porque Ayudas_Activas busca la permanencia por nombre (VLOOKUP). (v46.57)
- Al imprimir actas: `.doc-final` sin break-inside:avoid y `.doc-caja2` en flex (css/nh.css, @media print); si no,
  Chrome pierde la caja en las actas de una hoja. (v46.31)
- Mes cerrado: toda función que cambie cobros comprueba `_mesBloqueado` (js/cierre.js) y no hace nada si el mes está
  cerrado (no deja marcar ni desmarcar). Vale también para las funciones nuevas. (v45.46)
- La app de asociados nunca usa sanitizeData, y arranque.js no llama a load() cuando existe `window.NH_APP_ASOCIADOS`
  (la app arranca por su cuenta en app/app.js). (v45.52)
- El texto «Te faltan N aportes para sumar X € de beneficio. Si sales antes, no se suman» (siSalesHoyHTML) lo eligió
  Ángel (no quiso «Beneficio que dejarías»): no cambiarlo sin preguntarle. (v46.39)
- Un tipo nuevo de petición desde la app de asociados (peticiones/) necesita ANTES ampliar las reglas de Firebase
  (peticionValida, en NH Oficial\pruebas_app\reglas_firebase) y probarlas con el emulador; sin eso, la petición no
  llega. (v46.45)
- El registro de uso de la Torre (js/torre.js) solo guarda pantalla, tiempo y número de anotaciones: nunca nombres ni
  importes. (v46.50)
- Los pasos para instalar la app de asociados se ven siempre en la misma pantalla del enlace (nhaInstPanelHTML),
  nunca en otra dirección: el icono guarda la dirección donde se pulsa «Añadir» y, sin el código ?c=, no abre la
  cuenta. (v46.60)

## Validación obligatoria antes de dar un cambio por terminado
- PRUEBAS ANTES DE PUBLICAR (obligatorias desde v45.36): `NH Oficial\pruebas_app\verificar_app.js`
  compara la versión nueva con la publicada usando una copia real de los datos (json\auto_*.json,
  que nunca entra en el repo): reglas críticas, sintaxis, ?v= de cada archivo = APP_VERSION,
  arranque sin errores, auditoría, auto-chequeo, enlaces, y 345 pantallas y cálculos (cada
  pestaña, cada ficha, cada enlace de asociado y de grupo, papeles del mes). Si no da PASA, NO se
  publica. Las diferencias con la versión publicada se enseñan a Ángel: solo se publica con
  --permitir-diferencias si son exactamente las del cambio pedido. Ver pruebas_app\LEEME.md.
- APP DE ASOCIADOS (desde el 16/11/2026, tras la v46.50): la app de asociados (app/) carga los js/
  con su propia lista, NHA_ARCHIVOS (app/app.js). Todo archivo nuevo de js/ que cargue index.html
  va también en NHA_ARCHIVOS, o en NO_ASOCIADOS de verificar_app.js si de verdad no lo usa; y
  app/index.html lleva el mismo ?v= y NH_APP_V que APP_VERSION. La comprobación rápida (gancho
  pre-push) lo exige, y la verificación completa abre app/?c= con una ficha ficticia y recorre sus
  pantallas (también `--solo-asociados`, unos 4 s). La v46.50 dejó la app de asociados en
  «Cargando tu cuenta…» 1 h 26 min porque faltaba torre en NHA_ARCHIVOS.
- `node --check` sobre el JS extraído (sintaxis).
- Si el cambio toca la inicialización o sanitizeData: además, simulación de ejecución con
  DOM simulado (mock) para confirmar que la app arranca.
- Verificar visualmente que las reglas críticas 2, 3 y 4 siguen intactas.

## Versionado y deploy
- El número de versión vive en la constante APP_VERSION (js/datos.js). Al versionar, cambiar
  APP_VERSION y el ?v= de TODOS los archivos de index.html (css y js) al mismo número: así el
  iPhone descarga los archivos nuevos y nunca mezcla viejos con nuevos. verificar_app.js lo
  comprueba. Nunca escribir el número a mano en appVersionTag.
- La versión visible (elemento id="appVersionTag", abajo a la derecha) la rellena el JS
  a partir de APP_VERSION; el div no lleva texto fijo. Incrementar APP_VERSION en cada
  cambio (formato v45.XX; el número lo elige Claude y lo dice en el resumen).
- Mensaje de commit: empieza con la versión, ej. "v45.55 — descripción breve".
- Antes de hacer commit/push, mostrar resumen de cambios y esperar aprobación de Ángel.
- GitHub Pages tarda 1–2 min en publicar; la PWA puede necesitar recarga con ?_v=timestamp.
- CIERRE: el informe final incluye una sección con los archivos tocados y su versión («sin
  cambios» si no se tocó). Ya no hay carpeta-puente: Claude, ChatGPT y Grok leen los archivos
  directamente de su sitio. No se dejan copias de la app ni del Maestro en otras carpetas.
  COHERENCIA DE VERSIONES: el número de versión del contenido y el del nombre del archivo
  deben coincidir siempre (documento y app). Si no coinciden, corregir el nombre antes de seguir.
- HISTORIAL: el historial de versiones está en `docs/HISTORIAL.md`. Añade ahí la línea de cada versión nueva
  (al final, con fecha), no en este archivo.
- MAESTRO Y LEEME EN EL MISMO PASO (norma de Ángel desde el 28/11/2026): CADA publicación de una versión de la app incluye,
  en el mismo paso y sin esperar al aviso del revisor: (1) el Documento Maestro con la sección 13 al día con esa versión
  (portada «Sección 13 al día con la app vXX.XX», «Estado a la versión de la app vXX.XX…», la fila de la regla afectada y una
  fila nueva en el registro de versiones del propio Maestro; si la versión no cambia reglas, «solo vista, sin cambios de
  reglas»); se saca como versión nueva del Maestro siguiendo `NH Oficial\Documento_Maestro\REGISTRO_VERSIONES.md` (la
  anterior a `Historico\`, PDF a `Revisiones\`, copia del registro antes del cambio, `verificar_vigente.py` en OK); y
  (2) la cabecera de `..\..\LEEME_PRIMERO.md` («Documento Maestro vXX.XX · App vXX.XX», con respaldo previo en
  `NH Oficial\respaldos\`). El revisor diario lee exactamente esas dos líneas (sección 2 «App del administrador» y 6 «Orden»).
- AFECTA A LA GUÍA (Maestro v18.98 · GE-6, Ángel 28/11/2026): cada versión nueva del Maestro termina su fila de
  `NH Oficial\Documento_Maestro\REGISTRO_VERSIONES.md` (y la de la tabla de versiones del propio Maestro) con «Afecta a la Guía: sí.»
  o «Afecta a la Guía: no.». «Sí» si cambia algo que ven los asociados (una regla o cifra que explica la Guía, o una regla nueva
  que deban conocer): entonces se revisa la Guía para asociados en el mismo paso. «No» si solo pone al día la sección 13 o cambia
  pantallas. El revisor (v2.7) solo avisa de la Guía si alguna versión posterior a la que cita («ref. M…») dice «sí» o no lo dice.

## Terminología obligatoria (textos visibles y documentos)
- Usar: asociados, aportes, ayudas, retorno, permanencia, devoluciones/cuotas, aval.
- Evitar: socios, clientes, préstamo, crédito, interés, inversión, «nivel» y «ciclo» (decía así
  hasta el Maestro v18; en el código el campo sigue llamándose `ciclo` y no se renombra).
- Al citar reglas del Maestro, usar su código (AY-1, PE-8…).
- En todo lo que ve el asociado: «coordinador», nunca «administrador» (como el Maestro y la Guía). (v46.30)
- En las dos apps: «persona autorizada», no «persona de confianza» (Maestro v18.71). Los nombres internos
  (nhaConfianzaHTML, .nha-conf, m.autorizado) no cambian; «personas de confianza» de info/ y del mensaje de Invitar
  es otra cosa (quién puede entrar) y se queda. (v46.49)

## Archivos fuera del repo
- Ver Regla Crítica 6. El Excel de contabilidad y los documentos Word están FUERA de esta
  carpeta (el repo es público). Nunca copiar datos de asociados, importes o documentos
  internos dentro del repo, ni siquiera de forma temporal.
- Excel: solo .xlsx, sin macros, funciones compatibles con LibreOffice Calc, decimales solo
  cuando sean necesarios.
- Hay un `.gitignore` en esta carpeta como red de seguridad (bloquea *.json, *.xlsx, *.docx,
  *.pdf, *.csv y carpetas de trabajo) — es un respaldo, no una excusa para copiar archivos
  de datos aquí a propósito.

## Forma de trabajo — protocolo completo por tarea sobre la app
Contexto: Ángel trabaja desde Windows y verifica en iPhone (Safari y PWA). Las decisiones de reglas
se toman con Ángel en el Proyecto de Claude; Claude Code las ejecuta sobre el código y hace commit y
push solo tras su «SÍ».

1. Apertura — antes de proponer nada, declarar:
   `Partida: vXX.XX (APP_VERSION de js/datos.js)`
   Si la versión no coincide con la que indica Ángel, DETENERSE y avisar.
2. Cambios visuales — si la tarea afecta a CSS, colores, tamaños, posiciones o layout, generar
   primero una previsualización (`preview_<descripcion>.html`, FUERA del repo) con solo el
   bloque afectado y datos de ejemplo, para revisarla en el móvil ANTES de tocar el código. No aplicar hasta que Ángel apruebe la preview.
3. Aplicación — búsqueda/reemplazo literal, sin reinterpretar la spec; cambios quirúrgicos, no
   reescribir el archivo entero. Si el texto a buscar no aparece exactamente, DETENERSE y
   avisar; no improvisar.
4. Validación — obligatoria en cada tarea (ver sección "Validación obligatoria" arriba).
5. Reporte — SIEMPRE dentro de un bloque de código markdown (triple backtick), con: versión de
   partida, líneas antes→después de cada cambio, resultado de validaciones, y lista explícita
   de lo NO tocado. No volcar el archivo completo salvo que Ángel lo pida.
6. Cierre — informe con los archivos tocados y su versión (ver «CIERRE» en Versionado y deploy).
7. Commit — NUNCA hacer commit+push sin confirmación explícita de Ángel tras revisar el reporte.
8. Efectos secundarios — al cambiar CSS de layout (padding, position, z-index, safe-area),
   enumerar en el reporte qué otras zonas podrían verse afectadas. Ejemplo real: quitar
   padding-top del body arregló la cabecera pero dejó el contenido bajo la barra de estado al
   hacer scroll.
9. Herramientas — si una tarea requiere instalar, actualizar o configurar algo en el equipo de
   Ángel (paquetes, dependencias, ajustes), AVISAR ANTES con: qué hace falta, por qué, y los
   pasos exactos en Windows. No dar por supuesto que está instalado ni ejecutar instalaciones
   sin avisar.

- Criterio profesional honesto: si algo es mala idea o falta un dato, decirlo, no asumir.
- El "Documento Maestro Interno" manda: si algo lo contradice, es un error a corregir.
