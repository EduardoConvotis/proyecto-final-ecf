# backend/

API Node.js + Express (última versión estable) de FieldOps, en TypeScript estricto.

Este directorio es un **placeholder de scaffold greenfield**: aún no contiene el proyecto Node
(no hay `package.json`, `tsconfig.json`, ni código en `src/{api,domain,infrastructure,middleware}`).
La creación real corresponde a `/speckit-plan`/`/speckit-tasks`, no a esta propuesta de
arquitectura.

Ver:
- `docs/architecture.md` (§2.2 y §4) — estructura de carpetas y responsabilidades propuestas.
- `docs/adr/0001-authorization-model.md` — modelo de autorización (RBAC + ownership) que aplica
  el middleware centralizado de este backend.
- `docs/adr/0003-contract-first-openapi-tooling.md` — validación de requests contra
  `contracts/openapi.yaml` con `express-openapi-validator`.
- `docs/adr/0004-structured-logging-pino.md` — logging estructurado.
- `docs/adr/0005-persistence-postgresql-prisma.md` — persistencia (PostgreSQL + Prisma).
- `docs/adr/0006-evidence-file-storage-adapter.md` — almacenamiento de evidencias fotográficas.
- `docs/adr/0007-incident-summary-provider-boundary.md` — frontera del proveedor de resumen de
  incidencia (FR-017).
- `docs/adr/0008-test-runner-strategy.md` — runner de tests del backend (Vitest).
