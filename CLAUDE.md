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
  2. Si la tarea tocó también el Excel (NH_Contabilidad_Maestra.xlsx) o el Documento Maestro
     (NH_Documento_Maestro_*.docx), copiar igualmente esa versión actualizada a la misma carpeta.
  3. Confirmar en el resumen final qué archivos quedaron copiados y con qué versión, así:
     `✔ para_subir_a_Claude actualizada → index.html v43.XX`
  La carpeta-puente nunca debe quedarse en una versión anterior a la del repo. Si este paso no
  se ejecuta, la tarea no está completa. Detalle completo en el CLAUDE.md de NH Oficial,
  sección "Carpeta para_subir_a_Claude".

## Terminología obligatoria (textos visibles y documentos)
- Usar: asociados, aportaciones/aportes, apoyos, adelantos solidarios, retornos compartidos,
  devoluciones, recargo.
- Evitar: socios, clientes, préstamo, interés. ("Ayudas" solo es aceptable en la interfaz
  de la app, nunca en documentos.)

## Archivos fuera del repo
- El Excel de contabilidad y los documentos Word están FUERA de esta carpeta (el repo es
  público). Nunca copiar datos de asociados, importes o documentos internos dentro del repo.
- Excel: solo .xlsx, sin macros, funciones compatibles con LibreOffice Calc, decimales solo
  cuando sean necesarios.

## Forma de trabajo
- Avanzar bloque por bloque; explicar qué se va a cambiar y por qué ANTES de tocar código.
- Cambios quirúrgicos, no reescribir el archivo entero.
- Criterio profesional honesto: si algo es mala idea o falta un dato, decirlo, no asumir.
- El "Documento Maestro Interno" manda: si algo lo contradice, es un error a corregir.
- Al terminar cualquier tarea, entregar el resumen en Markdown, compacto: archivos tocados,
  líneas cambiadas con antes/después, resultado de node --check y número de versión. No
  volcar el archivo completo salvo que Ángel lo pida.
