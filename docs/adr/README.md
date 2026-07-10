# Architecture Decision Records (ADR)

Historial de decisiones de arquitectura de FieldOps. Cada decisión significativa es un ADR
inmutable; los cambios se hacen creando un ADR nuevo que *supersede* al anterior (nunca se
renumera ni se borra). Formato: `.specify/templates/adr-template.md`.

Mantenido junto al ciclo por el agente `architect` (hook `before_plan`, extensión
`architecture-guardian`). Entradas creadas fuera de ese flujo se anotan igualmente aquí.

## Índice

| ADR | Título | Estado | Fecha | Supersede | Superseded by |
|-----|--------|--------|-------|-----------|---------------|
| [0001](0001-authorization-model.md) | Modelo de autorización (RBAC + ownership) | Accepted | 2026-07-10 | — | — |
| [0002](0002-monorepo-workspace-tooling.md) | Monorepo con npm workspaces (sin Nx/Turborepo) | Accepted | 2026-07-10 | — | — |
| [0003](0003-contract-first-openapi-tooling.md) | Tooling contract-first: OpenAPI 3.1 + openapi-typescript + express-openapi-validator | Accepted | 2026-07-10 | — | — |
| [0004](0004-structured-logging-pino.md) | Logging estructurado con Pino | Accepted | 2026-07-10 | — | — |
| [0005](0005-persistence-postgresql-prisma.md) | Persistencia relacional: PostgreSQL + Prisma | Accepted | 2026-07-10 | — | — |
| [0006](0006-evidence-file-storage-adapter.md) | Almacenamiento de evidencias fuera de la base relacional | Accepted | 2026-07-10 | — | — |
| [0007](0007-incident-summary-provider-boundary.md) | Frontera de proveedor para el asistente de resumen de incidencia | Accepted | 2026-07-10 | — | — |
| [0008](0008-test-runner-strategy.md) | Estrategia de test runner (Vitest backend / runner nativo Angular frontend) | Accepted | 2026-07-10 | — | — |
| [0009](0009-ai-component-contract-and-eval.md) | Componente de IA como contrato + eval como puerta de calidad | Accepted | 2026-07-10 | — | — |
| [0010](0010-login-jwt-session-password-hashing.md) | Login (JWT), hashing de contraseñas en provisión y logout stateless | Accepted | 2026-07-10 | — | — |

## Changelog (append-only)

- **2026-07-10** — Alta de **ADR-0001** (Modelo de autorización: RBAC + ownership), en estado
  Proposed. Deriva de la spec 001 (FR-010/FR-011/FR-012/FR-013) y de la
  [matriz de permisos](../security/rbac-matrix.md). Creado como propuesta de arquitectura; el
  agente `architect` continuará la numeración a partir de 0002 en su próxima ejecución.
- **2026-07-10** — Regeneración de la arquitectura por el agente `architect` (previa a
  `/speckit-plan` de la feature 001-order-execution-workflow). Se crea `docs/architecture.md` y
  se dan de alta **ADR-0002..ADR-0008**, todos en estado Proposed, ninguno supersede a otro:
  monorepo/tooling (0002), contract-first OpenAPI (0003), logging estructurado (0004),
  persistencia PostgreSQL+Prisma (0005), almacenamiento de evidencias (0006), frontera del
  proveedor de resumen de incidencia (0007) y estrategia de test runner (0008). Se hace scaffold
  greenfield de `frontend/`, `backend/` y `contracts/` (solo marcadores de posición y READMEs, sin
  código de aplicación).
- **2026-07-10** — Alta de **ADR-0009** (Componente de IA como contrato + eval como puerta),
  Proposed. Amplía ADR-0007 resolviendo su open question de fallback y fija la política
  IA-como-contrato + abstención/grounding + eval-gate. Deriva de FR-017/FR-023..025 (US5).
  Acompañado de `contracts/ai/incident-summary.contract.md` y `evals/incident-summary/`.
- **2026-07-10** — Corrección de alcance: se retira el paquete ejecutable de la eval
  (`evals/incident-summary/src|test|package.json|dist`) por ser **implementación** (violaba
  Principios III/IV al pre-existir al ciclo). Se conserva solo la **definición** (golden cases +
  `thresholds.json`); el runner se producirá en `/speckit-tasks`→`/speckit-implement`, trazado a
  FR-023…025 / SC-010…012.
- **2026-07-10** — **Regeneración de revisión** (previa a `/speckit-plan` de
  `001-order-execution-workflow`), solicitada explícitamente como refresh, no como propuesta
  greenfield. Se contrastó `docs/architecture.md`, ADR-0001…0009 y `docs/security/rbac-matrix.md`
  contra la constitución v1.2.0 (Principios I–VIII) y contra el spec vigente (22 FR, RBAC deny
  FR-019…FR-022, evidencia JPEG ≤10MB/≤15 + ubicación + firma + duración, resumen de incidencia
  FR-017/023…025). **No se encontró ninguna decisión desactualizada ni contradicha**: los ADR
  existentes ya reflejan Tailwind (Principio VIII, sin ADR dedicado por decisión explícita en
  §3.5 de `architecture.md`) y el contrato de IA con eval-gate (ADR-0009). Cambios aplicados (solo
  de estado, ninguno de decisión): se actualizó la nota de "estado del repositorio" en
  `docs/architecture.md` y la nota de scaffold en `contracts/README.md` para reflejar que
  `contracts/openapi.yaml` ya existe. **No se creó ningún ADR nuevo** (no surgió ninguna decisión
  arquitectónica genuinamente nueva) y **no se renumeró ni modificó el estado** de ningún ADR
  existente (todos permanecen Proposed, pendientes de aceptación en el plan).
- **2026-07-10** — **Refresh** tras ampliar la spec con **US6 (login/autenticación)**: FR-026
  (login emite sesión con rol), FR-027 (credenciales inválidas → error genérico), FR-028
  (acceso no autenticado → redirección a login, FR-012), FR-029 (logout explícito).
  `contracts/openapi.yaml` ya incluye `POST /auth/login` y `POST /auth/logout` con sus `x-fr`. El
  mecanismo de autenticación (JWT, rol como claim) ya estaba decidido en `research.md` (Q-A) y en
  ADR-0001 — **no se reabre**. Se hace explícita en `docs/architecture.md` la frontera de
  login/logout (pantalla de login en `features/auth/`, middleware `auth.ts` de emisión/validación
  de JWT) y se añade la fila **A7 (logout)** a `docs/security/rbac-matrix.md`. Se da de alta
  **ADR-0010** (Proposed) para las piezas genuinamente nuevas: hashing de contraseñas en provisión
  (bcrypt) y logout stateless sin blacklist (sin requisito que exija revocación inmediata). No se
  renumera ni cambia el estado de ningún ADR previo.
- **2026-07-10** — **Aceptación de ADRs** tras `/speckit-analyze` (hallazgo A3). Se resuelve la
  open question de **ADR-0001** (fallo de ownership → **404**; fallo de rol → **403**) y se marcan
  **ADR-0001…ADR-0010** como **Accepted**. Ninguno se supersede ni renumera. Con ello el
  Constitution Check del plan deja de depender de decisiones en estado Proposed.
