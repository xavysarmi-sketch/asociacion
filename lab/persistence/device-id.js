"use strict";

// Guardia LAB: identificador anónimo de dispositivo. Es un UUID aleatorio
// sin ningún dato personal ni de hardware, persistido a través de una
// abstracción de storage clave/valor (compatible con localStorage), sin
// red y sin Firebase.

const DEVICE_ID_KEY = "nh-lab-device-id";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidDeviceId(value) {
  return typeof value === "string" && UUID_V4_PATTERN.test(value);
}

function generateDeviceId() {
  const globalCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }

  const nodeCrypto = require("node:crypto");
  if (typeof nodeCrypto.randomUUID === "function") {
    return nodeCrypto.randomUUID();
  }

  throw new Error("device-id: no hay una fuente de aleatoriedad criptográfica disponible.");
}

function assertValidStorage(storage) {
  if (
    storage === null ||
    typeof storage !== "object" ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function"
  ) {
    throw new Error("device-id: se requiere un storage compatible con getItem/setItem.");
  }
}

function getOrCreateDeviceId(storage) {
  assertValidStorage(storage);

  const existing = storage.getItem(DEVICE_ID_KEY);
  if (isValidDeviceId(existing)) {
    return existing;
  }

  const deviceId = generateDeviceId();

  let readBack;
  try {
    storage.setItem(DEVICE_ID_KEY, deviceId);
    readBack = storage.getItem(DEVICE_ID_KEY);
  } catch (err) {
    throw new Error(`device-id: fallo al persistir el identificador — ${err && err.message}`);
  }

  if (readBack !== deviceId) {
    throw new Error("device-id: el storage no confirmó la persistencia del identificador.");
  }

  return deviceId;
}

module.exports = { getOrCreateDeviceId, isValidDeviceId, DEVICE_ID_KEY };
