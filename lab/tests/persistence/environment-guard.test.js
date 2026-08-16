"use strict";

// Pruebas aisladas: sin red, sin Firebase real, sin datos reales.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const guardPath = path.join(__dirname, "..", "..", "persistence", "environment-guard.js");
const { assertSafeFirebaseEnvironment, PRODUCTION_PROJECT_ID } = require(guardPath);

test("rechaza el projectId de producción exacto", () => {
  assert.throws(() => assertSafeFirebaseEnvironment({ projectId: PRODUCTION_PROJECT_ID }));
});

test("rechaza el projectId de producción con espacios alrededor", () => {
  assert.throws(() => assertSafeFirebaseEnvironment({ projectId: ` ${PRODUCTION_PROJECT_ID} ` }));
  assert.throws(() => assertSafeFirebaseEnvironment({ projectId: `\t${PRODUCTION_PROJECT_ID}\n` }));
});

test("rechaza un string directo (solo se acepta un objeto de configuración)", () => {
  assert.throws(() => assertSafeFirebaseEnvironment("nh-local-dev"));
  assert.throws(() => assertSafeFirebaseEnvironment(PRODUCTION_PROJECT_ID));
});

test("rechaza projectId vacío o solo espacios", () => {
  assert.throws(() => assertSafeFirebaseEnvironment({ projectId: "" }));
  assert.throws(() => assertSafeFirebaseEnvironment({ projectId: "   " }));
});

test("rechaza undefined, null y un objeto sin projectId", () => {
  assert.throws(() => assertSafeFirebaseEnvironment(undefined));
  assert.throws(() => assertSafeFirebaseEnvironment(null));
  assert.throws(() => assertSafeFirebaseEnvironment({}));
});

test("acepta un objeto de configuración LAB válido distinto de producción", () => {
  assert.doesNotThrow(() => assertSafeFirebaseEnvironment({ projectId: "nh-local-dev" }));
  assert.doesNotThrow(() => assertSafeFirebaseEnvironment({ projectId: "  lab-fixture-project  " }));
});

test("el guardia no importa firebase ni realiza llamadas de red (inspección estática del código fuente)", () => {
  const source = fs.readFileSync(guardPath, "utf8");
  assert.ok(!/require\(\s*["']firebase/.test(source), "no debe requerir el SDK de firebase");
  assert.ok(!/\bfetch\s*\(|http\.request|https\.request/.test(source), "no debe realizar llamadas de red");
  assert.ok(!/credenciales|credential|apiKey/i.test(source), "no debe referenciar credenciales");
});
