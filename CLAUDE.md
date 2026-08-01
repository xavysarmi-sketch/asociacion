CLAUDE.md — Proyecto Nuevos Horizontes (NH Reportes)

## Contexto
App de gestión de un fondo común de apoyo mutuo en Madrid. Administrador único: Ángel (Xavy),
conocimientos técnicos básicos. Idioma de trabajo: SIEMPRE español. Explicar los cambios en
lenguaje sencillo antes de aplicarlos.

## La app
- Un solo archivo: index.html (HTML/JS vanilla, sin frameworks). PWA usada en iPhone/Safari.
- Firebase (Firestore) + localStorage. Publicada en GitHub Pages (repo público).
- Estructura de datos: objeto DATA con members[], cada miembro con loans[] y closedLoans[],
  cada loan con pays[] {m, año, paid}.
- Colores de marca: verde #1B4332 / #2D6A4F, naranja #E07A3A, crema #F5F0EB.
- Pestañas: Reporte · Cierre · Asociados · Envíos · Gestión.
- Fundadores (ids 1–10): borde dorado + "⭐ Fundador".

## REGLAS CRÍTICAS (no romper nunca)
1. Los datos reales viven en el iPhone (localStorage). El INITIAL dentro de index.html está
   SIEMPRE desactualizado. Nunca tocar datos de miembros/importes sin un JSON exportado
   desde la app (Gestión → Exportar datos). Si falta, pedirlo y no inventar números.
2. La línea `const URL_PARAMS = new URLSearchParams(window.location.search)` debe conservarse
   inmediatamente después de la llave de cierre de sanitizeData(). Si se borra, la app queda
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

## Validación obligatoria antes de dar un cambio por terminado
- `node --check` sobre el JS extraído (sintaxis).
- Si el cambio toca la inicialización o sanitizeData: además, simulación de ejecución con
  DOM simulado (mock) para confirmar que la app arranca.
- Verificar visualmente que las reglas críticas 2, 3 y 4 siguen intactas.

## Versionado y deploy
- El número de versión vive SOLO en la constante APP_VERSION. Al versionar, cambiar
  únicamente APP_VERSION, nunca escribir el número a mano en appVersionTag.
- La versión visible (elemento id="appVersionTag", abajo a la derecha) la rellena el JS
  a partir de APP_VERSION; el div no lleva texto fijo. Incrementar APP_VERSION en cada
  cambio (formato v43.XX).
- Mensaje de commit: empieza con la versión, ej. "v43.20 — descripción breve".
- Antes de hacer commit/push, mostrar resumen de cambios y esperar aprobación de Ángel.
- GitHub Pages tarda 1–2 min en publicar; la PWA puede necesitar recarga con ?_v=timestamp.
- REGLA DE CIERRE OBLIGATORIA (ejecutar siempre al terminar cualquier tarea, no opcional):
  tras aplicar el cambio, validar `node --check` y confirmar la versión en APP_VERSION, y
  como ÚLTIMO paso, sin que Ángel lo pida:
  1. Copiar el index.html final a la carpeta-puente
     `C:\Users\xavys\Documents\NH Oficial\para_subir_a_Claude\`, sobrescribiendo el que haya.
  2. Si la tarea tocó también el Excel (NH_Contabilidad_Maestra.xlsx), el Documento Maestro
     (NH_Documento_Maestro_vNN.docx) o se usó un backup JSON para verificar, copiar igualmente
     esa versión actualizada a la misma carpeta.
  3. Confirmar en el resumen final, en una sección aparte, qué archivos quedaron copiados y
     con qué versión ("sin cambios" si un archivo no se tocó esta vez):
     ```
     ARCHIVOS DEJADOS EN para_subir_a_Claude
     · index.html — v44.1
     · NH_Documento_Maestro_v16.docx — Versión 16, Julio 2026
     · NH_Contabilidad_Maestra.xlsx — sin cambios / actualizado
     · NH_backup_AAAAMMDD.json — sin cambios / nuevo
     ```
  La carpeta-puente nunca debe quedarse en una versión anterior a la del repo. Si este paso no
  se ejecuta, la tarea no está completa.
  COHERENCIA DE VERSIONES: el número de versión del contenido y el del nombre del archivo
  deben coincidir siempre (documento y app). Si no coinciden, corregir el nombre antes de
  seguir — no arrastrar la discrepancia (pasó una vez: un .docx llamado "v13" con contenido
  de la versión 15 hizo que Claude diera instrucciones sobre contenido que ya existía).
  Detalle completo en el CLAUDE.md de NH Oficial, sección "Carpeta para_subir_a_Claude".

## Terminología obligatoria (textos visibles y documentos)
- Usar: asociados, aportaciones/aportes, apoyos, adelantos solidarios, retornos compartidos,
  devoluciones, recargo.
- Evitar: socios, clientes, préstamo, interés. ("Ayudas" solo es aceptable en la interfaz
  de la app, nunca en documentos.)

## Archivos fuera del repo
- Ver Regla Crítica 6. El Excel de contabilidad y los documentos Word están FUERA de esta
  carpeta (el repo es público). Nunca copiar datos de asociados, importes o documentos
  internos dentro del repo, ni siquiera de forma temporal.
- Excel: solo .xlsx, sin macros, funciones compatibles con LibreOffice Calc, decimales solo
  cuando sean necesarios.
- Hay un `.gitignore` en esta carpeta como red de seguridad (bloquea *.json, *.xlsx, *.docx,
  *.pdf, *.csv y carpetas de trabajo) — es un respaldo, no una excusa para copiar archivos
  de datos aquí a propósito.

## Forma de trabajo — protocolo completo por tarea sobre index.html
Contexto: Xavy trabaja desde Windows (ordenador), despliega con GitHub Desktop y verifica en
iPhone (Safari y PWA). Las specs las prepara Claude en el Proyecto; Code las ejecuta sobre el
código.

1. Apertura — antes de proponer nada, declarar:
   `Partida: index.html vXX.XX (leído de <ruta completa>)`
   Si la versión no coincide con la que indica Xavy, DETENERSE y avisar.
2. Cambios visuales — si la tarea afecta a CSS, colores, tamaños, posiciones o layout, generar
   primero un archivo de previsualización `preview_<descripcion>.html` en para_subir_a_Claude,
   con solo el bloque afectado y datos de ejemplo, para revisarlo en el móvil ANTES de tocar
   index.html. No aplicar hasta que Xavy apruebe la preview.
3. Aplicación — búsqueda/reemplazo literal, sin reinterpretar la spec; cambios quirúrgicos, no
   reescribir el archivo entero. Si el texto a buscar no aparece exactamente, DETENERSE y
   avisar; no improvisar.
4. Validación — obligatoria en cada tarea (ver sección "Validación obligatoria" arriba).
5. Reporte — SIEMPRE dentro de un bloque de código markdown (triple backtick), con: versión de
   partida, líneas antes→después de cada cambio, resultado de validaciones, y lista explícita
   de lo NO tocado. No volcar el archivo completo salvo que Ángel lo pida.
6. Cierre — copiar index.html (y Excel/Documento si se tocaron) a para_subir_a_Claude (ver
   "REGLA DE CIERRE OBLIGATORIA" en Versionado y deploy).
7. Commit — NUNCA hacer commit+push sin confirmación explícita de Xavy tras revisar el reporte.
8. Efectos secundarios — al cambiar CSS de layout (padding, position, z-index, safe-area),
   enumerar en el reporte qué otras zonas podrían verse afectadas. Ejemplo real: quitar
   padding-top del body arregló la cabecera pero dejó el contenido bajo la barra de estado al
   hacer scroll.
9. Herramientas — si una tarea requiere instalar, actualizar o configurar algo en el equipo de
   Xavy (paquetes, dependencias, ajustes), AVISAR ANTES con: qué hace falta, por qué, y los
   pasos exactos en Windows. No dar por supuesto que está instalado ni ejecutar instalaciones
   sin avisar.

- Criterio profesional honesto: si algo es mala idea o falta un dato, decirlo, no asumir.
- El "Documento Maestro Interno" manda: si algo lo contradice, es un error a corregir.
