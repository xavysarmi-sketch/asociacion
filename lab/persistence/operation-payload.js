"use strict";

// Guardia LAB: valida, clona recursivamente y congela el payload de una
// operación antes de que pueda entrar en la futura cola/persistencia. Sin
// Firebase, sin red, sin storage, sin IDs ni timestamps — solo datos.

const ALLOWED_OPERATION_TYPES = new Set(["CREATE", "UPDATE", "DELETE"]);
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertSafeKeys(value) {
  const dangerousKey = Object.getOwnPropertyNames(value).find((key) => DANGEROUS_KEYS.has(key));
  if (dangerousKey) {
    throw new Error(`operation-payload: clave no permitida — "${dangerousKey}".`);
  }
}

function assertNoSymbolKeys(value) {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new Error("operation-payload: no se permiten claves Symbol.");
  }
}

function assertNoAccessorProperties(value) {
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && (descriptor.get || descriptor.set)) {
      throw new Error(`operation-payload: la propiedad "${key}" es un getter/setter; no se permite.`);
    }
  }
}

function assertDenseNormalArray(value) {
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== value.length + 1) {
    throw new Error("operation-payload: array disperso o con propiedades adicionales no permitido.");
  }
  for (let i = 0; i < value.length; i++) {
    if (names[i] !== String(i)) {
      throw new Error("operation-payload: array disperso o con propiedades adicionales no permitido.");
    }
  }
  if (names[value.length] !== "length") {
    throw new Error("operation-payload: array disperso o con propiedades adicionales no permitido.");
  }
}

function validateAndClone(value, ancestors) {
  if (value === null) {
    return null;
  }

  const type = typeof value;

  if (type === "string" || type === "boolean") {
    return value;
  }

  if (type === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("operation-payload: número inválido (NaN/Infinity no permitido).");
    }
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
      throw new Error("operation-payload: entero fuera del rango seguro.");
    }
    return value;
  }

  if (type === "undefined" || type === "function" || type === "symbol" || type === "bigint") {
    throw new Error(`operation-payload: tipo no permitido (${type}).`);
  }

  // A partir de aquí, type === "object" y value !== null.
  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw new Error("operation-payload: referencia circular detectada.");
    }
    assertSafeKeys(value);
    assertNoSymbolKeys(value);
    assertDenseNormalArray(value);
    assertNoAccessorProperties(value);

    ancestors.add(value);
    const clone = value.map((item) => validateAndClone(item, ancestors));
    ancestors.delete(value);
    return Object.freeze(clone);
  }

  if (
    value instanceof Date ||
    value instanceof Map ||
    value instanceof Set ||
    value instanceof RegExp
  ) {
    throw new Error("operation-payload: tipo de objeto no permitido (Date/Map/Set/RegExp).");
  }

  if (!isPlainObject(value)) {
    throw new Error("operation-payload: solo se permiten objetos planos, no instancias de clase.");
  }

  if (ancestors.has(value)) {
    throw new Error("operation-payload: referencia circular detectada.");
  }

  assertSafeKeys(value);
  assertNoSymbolKeys(value);
  assertNoAccessorProperties(value);

  ancestors.add(value);
  const clone = {};
  for (const key of Object.keys(value)) {
    clone[key] = validateAndClone(value[key], ancestors);
  }
  ancestors.delete(value);
  return Object.freeze(clone);
}

function assertCreateOrUpdatePayloadRoot(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("operation-payload: el payload de CREATE/UPDATE debe ser un objeto plano.");
  }
  if (!isPlainObject(payload)) {
    throw new Error("operation-payload: el payload debe ser un objeto plano, no una instancia de clase.");
  }
  assertSafeKeys(payload);
  if (Object.keys(payload).length === 0) {
    throw new Error("operation-payload: el payload de CREATE/UPDATE no puede estar vacío.");
  }
}

function createOperationPayload(operationType, payload) {
  if (typeof operationType !== "string") {
    throw new Error("operation-payload: operationType debe ser un string.");
  }

  const normalizedOperationType = operationType.trim().toUpperCase();
  if (!ALLOWED_OPERATION_TYPES.has(normalizedOperationType)) {
    throw new Error(`operation-payload: operationType desconocido — "${normalizedOperationType}".`);
  }

  if (normalizedOperationType === "DELETE") {
    if (payload !== null && payload !== undefined) {
      throw new Error("operation-payload: DELETE no admite payload; use null o undefined.");
    }
    return null;
  }

  assertCreateOrUpdatePayloadRoot(payload);
  return validateAndClone(payload, new Set());
}

module.exports = { createOperationPayload };
