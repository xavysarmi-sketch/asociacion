"use strict";

// Pruebas aisladas: sin storage, sin red y sin Firebase.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modulePath = path.join(__dirname, "..", "..", "persistence", "mutation-id.js");
const { createMutationId, isValidMutationId } = require(modulePath);

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("createMutationId() devuelve un UUID v4 válido", () => {
  const id = createMutationId();
  assert.match(id, UUID_V4_PATTERN);
  assert.equal(isValidMutationId(id), true);
});

test("varias llamadas producen mutationId distintos", () => {
  const a = createMutationId();
  const b = createMutationId();
  const c = createMutationId();
  assert.notEqual(a, b);
  assert.notEqual(b, c);
  assert.notEqual(a, c);
});

test("generar al menos 100 IDs -> todos UUID v4 y todos diferentes", () => {
  const ids = Array.from({ length: 100 }, () => createMutationId());
  for (const id of ids) {
    assert.match(id, UUID_V4_PATTERN);
  }
  assert.equal(new Set(ids).size, ids.length);
});

test("isValidMutationId acepta un UUID v4", () => {
  assert.equal(isValidMutationId("11111111-1111-4111-8111-111111111111"), true);
});

test("isValidMutationId rechaza un UUID v1", () => {
  assert.equal(isValidMutationId("6ba7b810-9dad-11d1-80b4-00c04fd430c8"), false);
});

test("isValidMutationId rechaza un UUID v5", () => {
  assert.equal(isValidMutationId("886313e1-3b8a-5372-9b90-0c9aee199e5d"), false);
});

test("isValidMutationId rechaza un string vacío", () => {
  assert.equal(isValidMutationId(""), false);
});

test("isValidMutationId rechaza undefined y null", () => {
  assert.equal(isValidMutationId(undefined), false);
  assert.equal(isValidMutationId(null), false);
});

test("inspección estática: sin Math.random, Date.now, Firebase, red ni storage de navegador", () => {
  const source = fs.readFileSync(modulePath, "utf8");
  assert.ok(!/Math\.random/.test(source), "no debe usar Math.random");
  assert.ok(!/Date\.now/.test(source), "no debe usar Date.now");
  assert.ok(!/require\(\s*["']firebase/.test(source), "no debe requerir el SDK de firebase");
  assert.ok(!/\bfetch\s*\(|http\.request|https\.request/.test(source), "no debe realizar llamadas de red");
  assert.ok(!/localStorage|sessionStorage/.test(source), "no debe usar localStorage/sessionStorage");
});

test("inspección estática: sin mecanismos de fingerprinting de dispositivo o usuario", () => {
  const source = fs.readFileSync(modulePath, "utf8");
  const forbiddenPatterns = [
    /navigator\.userAgent/,
    /\bhostname\b/i,
    /\bMAC\b/,
    /\bIP\b/,
    /os\.hostname/,
    /process\.env\.USERNAME/,
    /process\.env\.USER\b/,
  ];
  for (const pattern of forbiddenPatterns) {
    assert.ok(!pattern.test(source), `no debe contener: ${pattern}`);
  }
});
