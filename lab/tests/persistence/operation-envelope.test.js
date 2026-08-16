"use strict";

// Pruebas aisladas: sin storage real, sin red y sin Firebase.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const modulePath = path.join(__dirname, "..", "..", "persistence", "operation-envelope.js");
const { createOperationEnvelope } = require(modulePath);

function validId() {
  return crypto.randomUUID();
}

function baseInput(overrides = {}) {
  return {
    mutationId: validId(),
    deviceId: validId(),
    operationType: "CREATE",
    entityType: "member",
    entityId: "m-001",
    expectedRevision: 0,
    ...overrides,
  };
}

test("crea un envelope válido para CREATE con expectedRevision 0", () => {
  const envelope = createOperationEnvelope(baseInput());
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.operationType, "CREATE");
  assert.equal(envelope.expectedRevision, 0);
});

test("crea un envelope UPDATE válido con revisión > 0", () => {
  const envelope = createOperationEnvelope(baseInput({ operationType: "UPDATE", expectedRevision: 5 }));
  assert.equal(envelope.operationType, "UPDATE");
  assert.equal(envelope.expectedRevision, 5);
});

test("crea un envelope DELETE válido", () => {
  const envelope = createOperationEnvelope(baseInput({ operationType: "DELETE", expectedRevision: 3 }));
  assert.equal(envelope.operationType, "DELETE");
});

test("normaliza operationType a mayúsculas", () => {
  const envelope = createOperationEnvelope(baseInput({ operationType: "create" }));
  assert.equal(envelope.operationType, "CREATE");
});

test("aplica trim a operationType, entityType y entityId", () => {
  const envelope = createOperationEnvelope(
    baseInput({
      operationType: "  update  ",
      entityType: "  member  ",
      entityId: "  m-002  ",
      expectedRevision: 2,
    })
  );
  assert.equal(envelope.operationType, "UPDATE");
  assert.equal(envelope.entityType, "member");
  assert.equal(envelope.entityId, "m-002");
});

test("coherencia operationType/expectedRevision: CREATE + 0 -> aceptado", () => {
  const envelope = createOperationEnvelope(baseInput({ operationType: "CREATE", expectedRevision: 0 }));
  assert.equal(envelope.operationType, "CREATE");
  assert.equal(envelope.expectedRevision, 0);
});

test("coherencia operationType/expectedRevision: CREATE + 1 -> rechazado", () => {
  assert.throws(() => createOperationEnvelope(baseInput({ operationType: "CREATE", expectedRevision: 1 })));
});

test("coherencia operationType/expectedRevision: UPDATE + 1 -> aceptado", () => {
  const envelope = createOperationEnvelope(baseInput({ operationType: "UPDATE", expectedRevision: 1 }));
  assert.equal(envelope.operationType, "UPDATE");
  assert.equal(envelope.expectedRevision, 1);
});

test("coherencia operationType/expectedRevision: UPDATE + 0 -> rechazado", () => {
  assert.throws(() => createOperationEnvelope(baseInput({ operationType: "UPDATE", expectedRevision: 0 })));
});

test("coherencia operationType/expectedRevision: DELETE + 1 -> aceptado", () => {
  const envelope = createOperationEnvelope(baseInput({ operationType: "DELETE", expectedRevision: 1 }));
  assert.equal(envelope.operationType, "DELETE");
  assert.equal(envelope.expectedRevision, 1);
});

test("coherencia operationType/expectedRevision: DELETE + 0 -> rechazado", () => {
  assert.throws(() => createOperationEnvelope(baseInput({ operationType: "DELETE", expectedRevision: 0 })));
});

test("UPDATE con Number.MAX_SAFE_INTEGER -> aceptado", () => {
  const envelope = createOperationEnvelope(
    baseInput({ operationType: "UPDATE", expectedRevision: Number.MAX_SAFE_INTEGER })
  );
  assert.equal(envelope.expectedRevision, Number.MAX_SAFE_INTEGER);
});

test("UPDATE con Number.MAX_SAFE_INTEGER + 1 -> rechazado", () => {
  assert.throws(() =>
    createOperationEnvelope(
      baseInput({ operationType: "UPDATE", expectedRevision: Number.MAX_SAFE_INTEGER + 1 })
    )
  );
});

test("rechaza mutationId inválido", () => {
  assert.throws(() => createOperationEnvelope(baseInput({ mutationId: "no-es-un-uuid" })));
  assert.throws(() => createOperationEnvelope(baseInput({ mutationId: undefined })));
});

test("rechaza deviceId inválido", () => {
  assert.throws(() => createOperationEnvelope(baseInput({ deviceId: "no-es-un-uuid" })));
  assert.throws(() => createOperationEnvelope(baseInput({ deviceId: undefined })));
});

test("rechaza operationType desconocido", () => {
  assert.throws(() => createOperationEnvelope(baseInput({ operationType: "PATCH" })));
});

test("rechaza strings vacíos en operationType/entityType/entityId", () => {
  assert.throws(() => createOperationEnvelope(baseInput({ operationType: "   " })));
  assert.throws(() => createOperationEnvelope(baseInput({ entityType: "   " })));
  assert.throws(() => createOperationEnvelope(baseInput({ entityId: "   " })));
});

test("rechaza expectedRevision negativo", () => {
  assert.throws(() => createOperationEnvelope(baseInput({ expectedRevision: -1 })));
});

test("rechaza expectedRevision decimal", () => {
  assert.throws(() => createOperationEnvelope(baseInput({ expectedRevision: 1.5 })));
});

test("rechaza expectedRevision como string", () => {
  assert.throws(() => createOperationEnvelope(baseInput({ expectedRevision: "0" })));
});

test("rechaza null/undefined donde corresponda", () => {
  assert.throws(() => createOperationEnvelope(null));
  assert.throws(() => createOperationEnvelope(undefined));
  assert.throws(() => createOperationEnvelope(baseInput({ entityType: null })));
  assert.throws(() => createOperationEnvelope(baseInput({ entityId: undefined })));
  assert.throws(() => createOperationEnvelope(baseInput({ expectedRevision: null })));
  assert.throws(() => createOperationEnvelope(baseInput({ expectedRevision: NaN })));
});

test("el objeto resultante está congelado (Object.freeze)", () => {
  const envelope = createOperationEnvelope(baseInput());
  assert.equal(Object.isFrozen(envelope), true);
  assert.throws(() => {
    envelope.entityId = "otro";
  });
});

test("conserva EXACTAMENTE el mutationId recibido", () => {
  const mutationId = validId();
  const envelope = createOperationEnvelope(baseInput({ mutationId }));
  assert.equal(envelope.mutationId, mutationId);
});

test("dos llamadas con el mismo input conservan el mismo mutationId; no generan uno nuevo", () => {
  const input = baseInput();
  const first = createOperationEnvelope(input);
  const second = createOperationEnvelope(input);
  assert.equal(first.mutationId, input.mutationId);
  assert.equal(second.mutationId, input.mutationId);
  assert.equal(first.mutationId, second.mutationId);
});

test("inspección estática: sin Firebase, red, Math.random, Date.now, randomUUID ni storage de navegador", () => {
  const source = fs.readFileSync(modulePath, "utf8");
  assert.ok(!/require\(\s*["']firebase/.test(source), "no debe requerir el SDK de firebase");
  assert.ok(!/\bfetch\s*\(|http\.request|https\.request/.test(source), "no debe realizar llamadas de red");
  assert.ok(!/Math\.random/.test(source), "no debe usar Math.random");
  assert.ok(!/Date\.now/.test(source), "no debe usar Date.now");
  assert.ok(!/randomUUID/.test(source), "no debe generar IDs nuevos (randomUUID)");
  assert.ok(!/localStorage|sessionStorage/.test(source), "no debe usar localStorage/sessionStorage");
});
