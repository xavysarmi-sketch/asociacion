"use strict";

// Pruebas aisladas: sin storage, sin red y sin Firebase.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modulePath = path.join(__dirname, "..", "..", "persistence", "operation-payload.js");
const { createOperationPayload } = require(modulePath);

// 1. CREATE con objeto simple válido.
test("CREATE con objeto simple válido devuelve una copia con los mismos datos", () => {
  const result = createOperationPayload("CREATE", { nombre: "Ana", activo: true });
  assert.deepEqual(result, { nombre: "Ana", activo: true });
});

// 2. UPDATE con objeto simple válido.
test("UPDATE con objeto simple válido devuelve una copia con los mismos datos", () => {
  const result = createOperationPayload("UPDATE", { saldo: 12.5 });
  assert.deepEqual(result, { saldo: 12.5 });
});

// 3. normaliza operationType.
test("normaliza operationType (trim + mayúsculas)", () => {
  const result = createOperationPayload("  create  ", { a: 1 });
  assert.deepEqual(result, { a: 1 });
  assert.throws(() => createOperationPayload("  patch  ", { a: 1 }));
});

// 4. DELETE + null -> devuelve null.
test("DELETE con payload null devuelve null", () => {
  assert.equal(createOperationPayload("DELETE", null), null);
});

// 5. DELETE + undefined -> devuelve null.
test("DELETE con payload undefined devuelve null", () => {
  assert.equal(createOperationPayload("DELETE", undefined), null);
  assert.equal(createOperationPayload("DELETE"), null);
});

// 6. DELETE con payload -> rechazado.
test("DELETE con cualquier dato en el payload es rechazado", () => {
  assert.throws(() => createOperationPayload("DELETE", { a: 1 }));
  assert.throws(() => createOperationPayload("DELETE", "algo"));
  assert.throws(() => createOperationPayload("DELETE", 0));
  assert.throws(() => createOperationPayload("DELETE", []));
});

// 7. CREATE/UPDATE sin payload -> rechazado.
test("CREATE/UPDATE sin payload (undefined o null) son rechazados", () => {
  assert.throws(() => createOperationPayload("CREATE", undefined));
  assert.throws(() => createOperationPayload("CREATE", null));
  assert.throws(() => createOperationPayload("UPDATE", undefined));
  assert.throws(() => createOperationPayload("UPDATE", null));
});

// 8. CREATE/UPDATE con objeto vacío -> rechazado.
test("CREATE/UPDATE con objeto vacío son rechazados", () => {
  assert.throws(() => createOperationPayload("CREATE", {}));
  assert.throws(() => createOperationPayload("UPDATE", {}));
});

// 9. admite objetos y arrays anidados válidos.
test("admite objetos y arrays anidados válidos", () => {
  const input = {
    persona: { nombre: "Luis", tags: ["a", "b", { nivel: 2 }] },
    lista: [1, 2, 3],
  };
  const result = createOperationPayload("CREATE", input);
  assert.deepEqual(result, input);
});

// 10. admite null dentro del payload.
test("admite null dentro del payload, en cualquier nivel", () => {
  const result = createOperationPayload("CREATE", { a: null, b: { c: null }, d: [null] });
  assert.deepEqual(result, { a: null, b: { c: null }, d: [null] });
});

// 11. admite decimal finito.
test("admite números decimales finitos", () => {
  const result = createOperationPayload("CREATE", { valor: 12.345, negativo: -0.5 });
  assert.deepEqual(result, { valor: 12.345, negativo: -0.5 });
});

// 12. rechaza NaN e Infinity.
test("rechaza NaN e Infinity/-Infinity en cualquier nivel", () => {
  assert.throws(() => createOperationPayload("CREATE", { a: NaN }));
  assert.throws(() => createOperationPayload("CREATE", { a: Infinity }));
  assert.throws(() => createOperationPayload("CREATE", { a: -Infinity }));
  assert.throws(() => createOperationPayload("CREATE", { nested: { a: NaN } }));
});

// 13. rechaza entero > Number.MAX_SAFE_INTEGER.
test("rechaza enteros fuera del rango seguro", () => {
  assert.throws(() => createOperationPayload("CREATE", { a: Number.MAX_SAFE_INTEGER + 1 }));
  assert.throws(() => createOperationPayload("CREATE", { a: Number.MIN_SAFE_INTEGER - 1 }));
  const result = createOperationPayload("CREATE", { a: Number.MAX_SAFE_INTEGER });
  assert.equal(result.a, Number.MAX_SAFE_INTEGER);
});

// 14. rechaza undefined en cualquier profundidad.
test("rechaza undefined en cualquier profundidad", () => {
  assert.throws(() => createOperationPayload("CREATE", { a: undefined }));
  assert.throws(() => createOperationPayload("CREATE", { nested: { a: undefined } }));
  assert.throws(() => createOperationPayload("CREATE", { lista: [1, undefined] }));
});

// 15. rechaza function/symbol/bigint.
test("rechaza function, symbol y bigint en cualquier profundidad", () => {
  assert.throws(() => createOperationPayload("CREATE", { a: function () {} }));
  assert.throws(() => createOperationPayload("CREATE", { a: Symbol("x") }));
  assert.throws(() => createOperationPayload("CREATE", { a: 10n }));
  assert.throws(() => createOperationPayload("CREATE", { nested: { a: () => {} } }));
});

// 16. rechaza Date/Map/Set/RegExp.
test("rechaza Date, Map, Set y RegExp en cualquier profundidad", () => {
  assert.throws(() => createOperationPayload("CREATE", { a: new Date() }));
  assert.throws(() => createOperationPayload("CREATE", { a: new Map() }));
  assert.throws(() => createOperationPayload("CREATE", { a: new Set() }));
  assert.throws(() => createOperationPayload("CREATE", { a: /regex/ }));
  assert.throws(() => createOperationPayload("CREATE", { nested: { a: new Date() } }));
});

// 17. rechaza instancia de clase.
test("rechaza instancias de clase (prototipo no plano)", () => {
  class Miembro {
    constructor() {
      this.nombre = "x";
    }
  }
  assert.throws(() => createOperationPayload("CREATE", new Miembro()));
  assert.throws(() => createOperationPayload("CREATE", { a: new Miembro() }));
});

// 18. rechaza __proto__/prototype/constructor en cualquier profundidad.
test("rechaza __proto__ como clave propia en la raíz", () => {
  const malicious = { safe: 1, ["__proto__"]: { polluted: true } };
  assert.throws(() => createOperationPayload("CREATE", malicious));
});

test("rechaza constructor como clave propia en la raíz", () => {
  assert.throws(() => createOperationPayload("CREATE", { safe: 1, constructor: "x" }));
});

test("rechaza prototype como clave propia en la raíz", () => {
  assert.throws(() => createOperationPayload("CREATE", { safe: 1, prototype: "x" }));
});

test("rechaza __proto__/constructor/prototype anidados en profundidad", () => {
  assert.throws(() =>
    createOperationPayload("CREATE", { safe: 1, nested: { ["__proto__"]: { polluted: true } } })
  );
  assert.throws(() => createOperationPayload("CREATE", { safe: 1, nested: { constructor: "x" } }));
  assert.throws(() => createOperationPayload("CREATE", { safe: 1, nested: { prototype: "x" } }));
});

// 19. resultado raíz congelado.
test("el resultado raíz está congelado", () => {
  const result = createOperationPayload("CREATE", { a: 1 });
  assert.equal(Object.isFrozen(result), true);
  assert.throws(() => {
    result.a = 2;
  });
});

// 20. objetos y arrays anidados congelados.
test("los objetos y arrays anidados también quedan congelados", () => {
  const result = createOperationPayload("CREATE", { nested: { b: 1 }, lista: [1, { c: 2 }] });
  assert.equal(Object.isFrozen(result.nested), true);
  assert.equal(Object.isFrozen(result.lista), true);
  assert.equal(Object.isFrozen(result.lista[1]), true);
  assert.throws(() => {
    result.nested.b = 2;
  });
  assert.throws(() => {
    result.lista.push(3);
  });
});

// 21. modificar el input después no altera el resultado.
test("modificar el objeto original después de crear el payload no altera el resultado", () => {
  const input = { nested: { valor: 1 }, lista: [1, 2] };
  const result = createOperationPayload("CREATE", input);
  input.nested.valor = 999;
  input.lista.push(3);
  input.nuevo = "x";
  assert.equal(result.nested.valor, 1);
  assert.deepEqual(result.lista, [1, 2]);
  assert.equal("nuevo" in result, false);
});

// 22. no devuelve la misma referencia que el input.
test("no devuelve la misma referencia que el input (ni en objetos anidados)", () => {
  const input = { nested: { a: 1 }, lista: [1, 2] };
  const result = createOperationPayload("CREATE", input);
  assert.notEqual(result, input);
  assert.notEqual(result.nested, input.nested);
  assert.notEqual(result.lista, input.lista);
});

// 23. inspección estática.
test("inspección estática: sin Firebase, red, storage, Date.now, Math.random ni randomUUID", () => {
  const source = fs.readFileSync(modulePath, "utf8");
  assert.ok(!/require\(\s*["']firebase/.test(source), "no debe requerir el SDK de firebase");
  assert.ok(!/\bfetch\s*\(|http\.request|https\.request/.test(source), "no debe realizar llamadas de red");
  assert.ok(!/localStorage|sessionStorage/.test(source), "no debe usar storage de navegador");
  assert.ok(!/Date\.now/.test(source), "no debe usar Date.now");
  assert.ok(!/Math\.random/.test(source), "no debe usar Math.random");
  assert.ok(!/randomUUID/.test(source), "no debe generar IDs");
});

// Ciclo directo -> rechazado.
test("ciclo directo -> rechazado", () => {
  const obj = { a: 1 };
  obj.self = obj;
  assert.throws(() => createOperationPayload("CREATE", obj));
});

// Ciclo indirecto -> rechazado.
test("ciclo indirecto -> rechazado", () => {
  const a = { name: "a" };
  const b = { name: "b", ref: a };
  a.ref = b;
  assert.throws(() => createOperationPayload("CREATE", a));
});

// Symbol como clave propia -> rechazado.
test("Symbol como clave propia -> rechazado", () => {
  const sym = Symbol("secreto");
  const obj = { safe: 1, [sym]: "oculto" };
  assert.throws(() => createOperationPayload("CREATE", obj));
});

// Getter propio -> rechazado SIN ejecutar el getter.
test("getter propio -> rechazado sin ejecutar el getter", () => {
  let getterCalled = false;
  const obj = { safe: 1 };
  Object.defineProperty(obj, "secret", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalled = true;
      return 42;
    },
  });
  assert.throws(() => createOperationPayload("CREATE", obj));
  assert.equal(getterCalled, false);
});

// Setter propio -> rechazado.
test("setter propio -> rechazado", () => {
  const obj = { safe: 1 };
  Object.defineProperty(obj, "secret", {
    enumerable: true,
    configurable: true,
    set(_v) {},
  });
  assert.throws(() => createOperationPayload("CREATE", obj));
});

// Array disperso -> rechazado.
test("array disperso -> rechazado", () => {
  const sparse = [1, 2, 3];
  delete sparse[1];
  assert.throws(() => createOperationPayload("CREATE", { lista: sparse }));
});

// Array normal -> aceptado.
test("array normal -> aceptado", () => {
  const result = createOperationPayload("CREATE", { lista: [1, 2, 3] });
  assert.deepEqual(result.lista, [1, 2, 3]);
});

// Array con propiedad extra -> rechazado.
test("array con propiedad extra -> rechazado", () => {
  const arr = [1, 2];
  arr.foo = "bar";
  assert.throws(() => createOperationPayload("CREATE", { lista: arr }));
});

// Array con propiedad extra NO enumerable -> rechazado.
test("array con propiedad extra NO enumerable -> rechazado", () => {
  const arr = ["a", "b"];
  Object.defineProperty(arr, "hidden", {
    value: "oculto",
    enumerable: false,
    writable: true,
    configurable: true,
  });
  assert.throws(() => createOperationPayload("CREATE", { lista: arr }));
});

// Array con propiedad propia no enumerable "constructor" -> rechazado.
test("array con propiedad propia no enumerable 'constructor' -> rechazado", () => {
  const arr = ["a", "b"];
  Object.defineProperty(arr, "constructor", {
    value: Array,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  assert.throws(() => createOperationPayload("CREATE", { lista: arr }));
});
