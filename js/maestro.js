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
  AYUDA_MAX_CORTA: 500,                 // AY-1 · máximo con permanencia de 12 meses, terceros y asociado libre
  CUOTAS_MAX_CORTA: 5,                  // AY-1 · cuotas máximas en ese caso
  CUOTAS_MAX: 12,                       // AY-1 · cuotas máximas con permanencia de 24, 36 meses o indefinida
  AYUDA_MAX_SIN_APROBACION: 1000,       // AY-5 · hasta aquí no hace falta aprobación previa del coordinador
  AYUDA_MAX: 3000,                      // AY-5 · máximo absoluto de una ayuda
  SIMULADOR_MAX_AYUDA: 1000,            // decisión de Ángel 03/10/2026: el simulador llega hasta 1.000 €
  // ── Salidas (SA) ──
  AVISO_SALDO_2_MESES: 3000,            // SA-1 · con más de 3.000 € de saldo, 2 meses de aviso
  AVISO_SALDO_3_MESES: 6000,            // SA-1 · con más de 6.000 €, 3 meses (si no, 1 mes)
  // ── Bonus por referido (BO) ──
  BONO_REFERIDO: 10,                    // BO · € por cada referido del mes (los asume el fondo)
  REFERIDOS_MAX_MES: 3,                 // BO · como mucho 3 referidos por mes
  // ── Aportes puntuales al fondo ──
  RETORNO_PUNTUAL: 0.05,                // 5 % sobre el capital aportado
  // ── Pausa de aportes (PE-8) ──
  PAUSA_MESES: [1,2,3],                 // PE-8 · de 1 a 3 meses
  PAUSA_INDEFINIDA_CADA: 12,            // PE-8 · en la indefinida, una pausa cada 12 meses
});
