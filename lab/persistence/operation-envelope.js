"use strict";

// Guardia LAB: sobre inmutable y validado de una operación lógica. No
// genera IDs — recibe mutationId/deviceId ya existentes y los conserva tal
// cual, para que un reintento use exactamente el mismo mutationId. Sin
// payload, sin timestamps, sin Firebase, sin red y sin estado de cola.

const { isValidMutationId } = require("./mutation-id.js");
const { isValidDeviceId } = require("./device-id.js");

const ALLOWED_OPERATION_TYPES = new Set(["CREATE", "UPDATE", "DELETE"]);

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string") {
    throw new Error(`operation-envelope: ${fieldName} debe ser un string.`);
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new Error(`operation-envelope: ${fieldName} no puede estar vacío.`);
  }
  return trimmed;
}

function assertExpectedRevision(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("operation-envelope: expectedRevision debe ser un entero seguro >= 0.");
  }
  return value;
}

function assertRevisionCoherentWithOperationType(operationType, expectedRevision) {
  if (operationType === "CREATE" && expectedRevision !== 0) {
    throw new Error("operation-envelope: CREATE requiere expectedRevision exactamente 0.");
  }

  if ((operationType === "UPDATE" || operationType === "DELETE") && expectedRevision <= 0) {
    throw new Error(`operation-envelope: ${operationType} requiere expectedRevision > 0.`);
  }
}

function createOperationEnvelope(input) {
  if (input === null || typeof input !== "object") {
    throw new Error("operation-envelope: se requiere un objeto de entrada.");
  }

  const { mutationId, deviceId, operationType, entityType, entityId, expectedRevision } = input;

  if (!isValidMutationId(mutationId)) {
    throw new Error("operation-envelope: mutationId inválido; debe ser un UUID v4 ya existente.");
  }

  if (!isValidDeviceId(deviceId)) {
    throw new Error("operation-envelope: deviceId inválido; debe ser un UUID v4 ya existente.");
  }

  const normalizedOperationType = assertNonEmptyString(operationType, "operationType").toUpperCase();
  if (!ALLOWED_OPERATION_TYPES.has(normalizedOperationType)) {
    throw new Error(`operation-envelope: operationType desconocido — "${normalizedOperationType}".`);
  }

  const normalizedEntityType = assertNonEmptyString(entityType, "entityType");
  const normalizedEntityId = assertNonEmptyString(entityId, "entityId");
  const normalizedExpectedRevision = assertExpectedRevision(expectedRevision);

  assertRevisionCoherentWithOperationType(normalizedOperationType, normalizedExpectedRevision);

  return Object.freeze({
    schemaVersion: 1,
    mutationId,
    deviceId,
    operationType: normalizedOperationType,
    entityType: normalizedEntityType,
    entityId: normalizedEntityId,
    expectedRevision: normalizedExpectedRevision,
  });
}

module.exports = { createOperationEnvelope };
