# frontend/

Aplicación Angular (última versión estable) de FieldOps, estilizada con Tailwind CSS
(Principio VIII de la constitución).

Este directorio es un **placeholder de scaffold greenfield**: aún no contiene el proyecto Angular
(no se ha ejecutado `ng new`), ni `package.json`, ni configuración de Tailwind. La creación del
proyecto real (con `tsconfig.json` en modo `strict`, `tailwind.config` con tokens centralizados, y
la estructura `src/app/{core,features,shared}`) corresponde a `/speckit-plan`/`/speckit-tasks`,
no a esta propuesta de arquitectura.

Ver:
- `docs/architecture.md` (§2.1 y §4) — estructura de carpetas y responsabilidades propuestas.
- `docs/adr/0002-monorepo-workspace-tooling.md` — por qué este directorio es un workspace de npm.
- `docs/adr/0003-contract-first-openapi-tooling.md` — cómo el frontend deriva sus tipos de API
  desde `contracts/openapi.yaml` (no se escriben tipos de API a mano).
- `docs/adr/0008-test-runner-strategy.md` — runner de tests del frontend.
