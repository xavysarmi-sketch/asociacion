// Nuevos Horizontes · maestro.js
// LAS REGLAS DEL FONDO EN UN SOLO SITIO (v45.38). Cada número viene del Documento Maestro y
// lleva su código. Si el Maestro cambia una regla, se cambia AQUÍ y en ningún otro sitio de la
// app: cálculos, avisos, auditoría y simuladores leen de esta tabla.
// (El % de retorno de las cuotas NO está aquí: es un dato guardado, DATA.rate, que se cambia
// en Gestión → Configuración. La auditoría de Python, nh_auditoria.py, tiene su propia tabla
// REGLAS que debe coincidir con esta.)
// Solo declaraciones: no ejecuta nada al cargarse.
const REGLAS=Object.freeze({
  // ── Aportes (AP) ──
  APORTE_MINIMO: 50,                    // AP-1 · todos entran con 50 € al mes
  APORTE_OPCIONES: [50,100,150,200],    // AP-2/AP-3 · cada mes 50, 100, 150 o 200 € (tope 200 €)
  // ── Beneficio (BE) ──
  BLOQUE_APORTE: 50,                    // BE-1 · el beneficio se cuenta por cada bloque de 50 €
  BLOQUES_MAX: 4,                       // BE-1 · como mucho 4 bloques (200 €)
  BENEFICIO_ANIO1: 10,                  // BE-2 · € por bloque en el 1.er año de permanencia
  BENEFICIO_ANIO2: 12,                  // BE-2 · 2.º año
  BENEFICIO_ANIO3: 15,                  // BE-2 · 3.er año en adelante (36 meses o indefinida)
  // ── Ayudas (AY) ──
  AYUDA_MIN: 100,                       // AY-1 · importe mínimo
  AYUDA_MAX_CORTA: 500,                 // AY-1 · máximo para terceros con aval y Asociado Libre
  CUOTAS_MAX_CORTA: 5,                  // AY-1 · cuotas máximas en ese caso
  // AY-10 (Maestro v18.82, «Tu ayuda crece con tu aporte»): lo máximo = «veces» el aporte que cuenta, con el tope AY-5
  VECES_12: 14,                         // AY-10 · permanencia 12: 50 € × 14 = 700 €
  VECES_24: 20,                         // AY-10 · permanencia 24: 50 € × 20 = 1.000 €
  VECES_36: 30,                         // AY-10 · permanencia 36 o indefinida: 50 € × 30 = 1.500 €
  AYUDA_12_APORTE_ALTO: 1500,           // AY-10 · excepción fija: 12 meses con 100 € o más → 1.500 € (Ángel 17/11/2026)
  APORTE_ALTO: 100,                     // AY-10 · aporte que sube el límite: habitual de 100 € o más Y un mes ya pagado a 100 € o más
  CUOTAS_12_50: 8,                      // AY-10 · cuotas: 12 meses con 50 €
  CUOTAS_12_100: 11,                    // AY-10 · 12 meses con 100 € o más (Maestro v18.84: nunca caben 12 con 12 meses, AY-1 y AY-3)
  CUOTAS_24_50: 12,                     // AY-10 · 24 meses con 50 €
  CUOTAS_24_100: 15,                    // AY-10 · 24 meses con 100 € o más
  CUOTAS_36: 15,                        // AY-10 · 36 meses o indefinida, con cualquier aporte
  CUOTAS_MAX: 15,                       // AY-5 · cuotas máximas (parámetro que solo sube el coordinador; antes 12)
  CUOTAS_SIN_APROBACION: 12,            // AY-5 · más de 12 cuotas necesita la aprobación previa del coordinador
  AY_PENDIENTE_DESDE: "2026-12",      // AY-10/LI-4 · v18.87: lo pendiente cuenta para el máximo en lo que se conceda desde este mes (GE-5: desde el mes siguiente; las anteriores conservan sus condiciones, AY-2)
  AYUDA_MAX_SIN_APROBACION: 1000,       // AY-5 · hasta aquí no hace falta aprobación previa del coordinador
  AYUDA_MAX: 2000,                      // AY-5 · tope de ayuda (parámetro que solo sube el coordinador; hasta v18.74, 3.000 €)
  AY10_DESDE: "2026-11",                // AY-10 · la auditoría juzga con esta tabla las ayudas desde noviembre 2026 (la anterior,
                                        // v18.75–v18.81, era más estricta en todo: lo que cumplía aquella cumple esta)
  AYUDAS_MAX_TERCERO: 1,                // AY-8 · una sola ayuda como tercero; para la 2.ª, se asocia
  TERCERO_UNA_DESDE: "2026-12-01",      // AY-8 · vale para las solicitudes desde el 01/12/2026
  SIMULADOR_MAX_AYUDA: 2000,            // simulador guiado: la barra «¿Necesitas otra cantidad?» llega al tope AY-5
  // ── Salidas (SA) ──
  AVISO_MESES: 1,                       // SA-1 (Maestro v18.64, 12/11/2026): un mes de aviso para todos, con cualquier saldo. Antes: · con más de 3.000 € de saldo, 2 meses de aviso
  AVISO_DIA_CORTE: 15,                  // SA-1 (v18.64): el aviso vale para el mes si llega hasta este día; desde el siguiente, para el mes siguiente. Antes: · con más de 6.000 €, 3 meses (si no, 1 mes)
  VUELTA_MESES: 3,                      // SA-8 (Maestro, decisión de Ángel 28/11/2026): quien salió puede volver desde 3 meses después del mes en que cobró su salida
  // ── Bonus por referido (BO) ──
  BONO_REFERIDO: 10,                    // BO · € por cada referido del mes (los asume el fondo)
  REFERIDOS_MAX_MES: 3,                 // BO · como mucho 3 referidos por mes
  // ── Aportes puntuales al fondo ──
  RETORNO_PUNTUAL: 0.05,                // 5 % sobre el capital aportado
  APORTE_TEMPORAL_MIN: 100,             // AT-1 (Maestro v18.76) · aporte temporal de 100 a 2.000 € (la app pedía 500–3.000)
  APORTE_TEMPORAL_MAX: 2000,            // AT-1 · nunca más de lo que falta para una ayuda (tope de ayuda 2.000 €, AY-5)
  // ── Pausa de aportes (PE-8) ──
  PAUSA_MESES: [1,2,3],                 // PE-8 · de 1 a 3 meses
  PAUSA_INDEFINIDA_CADA: 12,            // PE-8 · en la indefinida, una pausa cada 12 meses
});
