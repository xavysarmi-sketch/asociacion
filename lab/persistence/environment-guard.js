"use strict";

// Guardia técnico LAB: evita que el entorno LAB inicialice Firebase con la
// configuración del proyecto de PRODUCCIÓN. Es una función pura y aislada:
// no se conecta a Firebase, no depende de red y no requiere ningún módulo
// externo de autenticación.

const PRODUCTION_PROJECT_ID = "nuevos-horizontes-6d924";

function assertSafeFirebaseEnvironment(firebaseConfig) {
  if (firebaseConfig === null || typeof firebaseConfig !== "object") {
    throw new Error(
      "environment-guard: se requiere un objeto de configuración de Firebase con projectId."
    );
  }

  const rawProjectId = firebaseConfig.projectId;
  const projectId = typeof rawProjectId === "string" ? rawProjectId.trim() : "";

  if (projectId === "") {
    throw new Error(
      "environment-guard: projectId ausente, vacío o indeterminable; se bloquea la inicialización de Firebase por seguridad."
    );
  }

  if (projectId === PRODUCTION_PROJECT_ID) {
    throw new Error(
      `environment-guard: bloqueado — "${projectId}" es el proyecto de PRODUCCIÓN. ` +
        "El entorno LAB no puede inicializar Firebase con esta configuración."
    );
  }

  return true;
}

module.exports = { assertSafeFirebaseEnvironment, PRODUCTION_PROJECT_ID };
