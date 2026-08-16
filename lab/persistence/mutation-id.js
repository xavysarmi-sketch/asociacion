"use strict";

// Guardia LAB: identificador de mutación (operación lógica). UUID v4
// aleatorio, sin estado, sin persistencia, sin red y sin ningún dato
// personal, de dispositivo o de hardware. La reutilización del mismo
// mutationId durante reintentos se implementará más adelante, en la cola
// de operaciones — este componente solo genera y valida el identificador.

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidMutationId(value) {
  return typeof value === "string" && UUID_V4_PATTERN.test(value);
}

function createMutationId() {
  const globalCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }

  const nodeCrypto = require("node:crypto");
  if (typeof nodeCrypto.randomUUID === "function") {
    return nodeCrypto.randomUUID();
  }

  throw new Error("mutation-id: no hay una fuente de aleatoriedad criptográfica disponible.");
}

module.exports = { createMutationId, isValidMutationId };
