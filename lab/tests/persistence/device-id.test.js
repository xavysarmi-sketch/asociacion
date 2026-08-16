"use strict";

// Pruebas aisladas: storage falso en memoria, sin localStorage real, sin
// red y sin Firebase.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modulePath = path.join(__dirname, "..", "..", "persistence", "device-id.js");
const { getOrCreateDeviceId, isValidDeviceId, DEVICE_ID_KEY } = require(modulePath);

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createMemoryStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = value;
    },
  };
}

test("storage vacío -> genera un UUID v4 y lo guarda", () => {
  const storage = createMemoryStorage();
  const id = getOrCreateDeviceId(storage);
  assert.match(id, UUID_V4_PATTERN);
  assert.equal(storage.getItem(DEVICE_ID_KEY), id);
});

test("segunda llamada sobre el mismo storage devuelve exactamente el mismo ID", () => {
  const storage = createMemoryStorage();
  const first = getOrCreateDeviceId(storage);
  const second = getOrCreateDeviceId(storage);
  assert.equal(second, first);
});

test("un UUID v4 existente se conserva", () => {
  const existingId = "11111111-1111-4111-8111-111111111111";
  const storage = createMemoryStorage({ [DEVICE_ID_KEY]: existingId });
  const id = getOrCreateDeviceId(storage);
  assert.equal(id, existingId);
});

test("un UUID v1 existente se sustituye por un UUID v4", () => {
  const uuidV1 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  const storage = createMemoryStorage({ [DEVICE_ID_KEY]: uuidV1 });
  const id = getOrCreateDeviceId(storage);
  assert.match(id, UUID_V4_PATTERN);
  assert.notEqual(id, uuidV1);
  assert.equal(storage.getItem(DEVICE_ID_KEY), id);
});

test("un UUID v5 existente se sustituye por un UUID v4", () => {
  const uuidV5 = "886313e1-3b8a-5372-9b90-0c9aee199e5d";
  const storage = createMemoryStorage({ [DEVICE_ID_KEY]: uuidV5 });
  const id = getOrCreateDeviceId(storage);
  assert.match(id, UUID_V4_PATTERN);
  assert.notEqual(id, uuidV5);
  assert.equal(storage.getItem(DEVICE_ID_KEY), id);
});

test("un ID con formato inválido se sustituye por un UUID v4", () => {
  const storage = createMemoryStorage({ [DEVICE_ID_KEY]: "no-es-un-uuid" });
  const id = getOrCreateDeviceId(storage);
  assert.match(id, UUID_V4_PATTERN);
  assert.notEqual(id, "no-es-un-uuid");
  assert.equal(storage.getItem(DEVICE_ID_KEY), id);
});

test("un storage sin getItem/setItem es rechazado", () => {
  assert.throws(() => getOrCreateDeviceId({}));
  assert.throws(() => getOrCreateDeviceId({ getItem: () => null }));
  assert.throws(() => getOrCreateDeviceId({ setItem: () => {} }));
});

test("un fallo de setItem produce un error explícito, sin generar un ID silencioso", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("almacenamiento lleno");
    },
  };
  assert.throws(() => getOrCreateDeviceId(storage), /fallo al persistir/);
});

test("un storage que acepta setItem pero no guarda nada produce un error explícito", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {},
  };
  assert.throws(() => getOrCreateDeviceId(storage), /no confirmó la persistencia/);
});

test("un storage que guarda un valor distinto al escrito produce un error explícito", () => {
  const storage = {
    getItem: () => "valor-corrompido-por-el-storage",
    setItem: () => {},
  };
  assert.throws(() => getOrCreateDeviceId(storage), /no confirmó la persistencia/);
});

test("la persistencia normal (setItem + relectura coincidente) funciona correctamente", () => {
  let stored = null;
  const storage = {
    getItem: () => stored,
    setItem: (key, value) => {
      stored = value;
    },
  };
  const id = getOrCreateDeviceId(storage);
  assert.match(id, UUID_V4_PATTERN);
  assert.equal(stored, id);
});

test("null o undefined como storage son rechazados", () => {
  assert.throws(() => getOrCreateDeviceId(null));
  assert.throws(() => getOrCreateDeviceId(undefined));
});

test("dos storages independientes obtienen IDs diferentes", () => {
  const storageA = createMemoryStorage();
  const storageB = createMemoryStorage();
  const idA = getOrCreateDeviceId(storageA);
  const idB = getOrCreateDeviceId(storageB);
  assert.notEqual(idA, idB);
});

test("isValidDeviceId acepta solo UUID v4 al leer", () => {
  assert.equal(isValidDeviceId("11111111-1111-4111-8111-111111111111"), true);
  assert.equal(isValidDeviceId("6ba7b810-9dad-11d1-80b4-00c04fd430c8"), false);
  assert.equal(isValidDeviceId("886313e1-3b8a-5372-9b90-0c9aee199e5d"), false);
  assert.equal(isValidDeviceId("no-es-un-uuid"), false);
  assert.equal(isValidDeviceId(""), false);
  assert.equal(isValidDeviceId(undefined), false);
});

test("el módulo no usa red ni Firebase (inspección estática del código fuente)", () => {
  const source = fs.readFileSync(modulePath, "utf8");
  assert.ok(!/require\(\s*["']firebase/.test(source), "no debe requerir el SDK de firebase");
  assert.ok(!/\bfetch\s*\(|http\.request|https\.request/.test(source), "no debe realizar llamadas de red");
});

test("el módulo no contiene mecanismos de fingerprinting de dispositivo o usuario", () => {
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
