---
description: "Task list for Ejecución y Revisión de Órdenes de Trabajo"
---

# Tasks: Ejecución y Revisión de Órdenes de Trabajo

**Input**: Design documents from `specs/001-order-execution-workflow/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, quickstart.md, `contracts/openapi.yaml`

**Tests**: OBLIGATORIOS. La constitución de FieldOps (Principio IV — Test-First, NO NEGOCIABLE) exige
tests escritos antes de la implementación (Red→Green). La plantilla base los trata como no
obligatorios; esta constitución lo anula y los vuelve requeridos. Backend: Vitest en `domain/`;
frontend: runner nativo de Angular; resumen de IA: eval-gate.

**Organization**: Tareas agrupadas por historia de usuario. Orden de fases por dependencia:
autenticación (US6) es prerequisito de las demás, por eso va primero entre las historias.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1…US6
- Rutas de archivo exactas en la descripción

## Path Conventions (del plan.md)

- Frontend: `frontend/src/app/{core,features,shared}/`
- Backend: `backend/src/{api,domain,infrastructure,middleware,generated}/`
- Contrato (fuente de verdad): `contracts/openapi.yaml`; contrato IA: `contracts/ai/incident-summary.contract.md`
- Eval: `evals/incident-summary/`

---

## Phase 1: Setup (infraestructura compartida)

- [X] T001 Inicializar monorepo con **npm workspaces** (`package.json` raíz con workspaces `frontend`, `backend`) según ADR-0002
- [X] T002 [P] Crear app Angular en `frontend/` (standalone; `angular.json`, `tsconfig{,.app,.spec}.json` strict, `main.ts`, `index.html`, `styles.css`, `proxy.conf.json`)
- [X] T003 [P] Crear app Express en `backend/` con `backend/tsconfig.json` en `strict: true` (Principio I)
- [X] T004 [P] Configurar Tailwind CSS en `frontend/tailwind.config.ts` con tokens de diseño centralizados — Principio VIII
- [X] T005 [P] Configurar ESLint en ambos workspaces (`backend/eslint.config.js`, `frontend/eslint.config.js`) con `eslint-plugin-tailwindcss` y `no-explicit-any` (Principios I, VIII)
- [X] T006 [P] Añadir Vitest a `backend/` (`vitest.config.ts`) y runner de Angular en `frontend/package.json` (ADR-0008)
- [X] T007 [P] Configurar Pino en `backend/src/infrastructure/logger.ts` con redacción de campos sensibles — ADR-0004, Principio V
- [X] T008 [P] Añadir tooling contract-first: `openapi-typescript` y `express-openapi-validator` en `backend/` (ADR-0003)
- [X] T009 [P] Añadir Prisma al `backend/` con conexión PostgreSQL configurable por entorno (ADR-0005)

**Checkpoint**: workspaces compilan en modo strict, lint y test runners operativos.

---

## Phase 2: Foundational (prerequisitos bloqueantes — antes de CUALQUIER historia)

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta completar esta fase.

- [X] T010 Tipos del contrato en `backend/src/generated/api-types.ts` (Principio VII). Stopgap hecho a mano; **regenerar** con `npm run gen:api` tras `npm install`
- [X] T011 [P] Tipos del frontend en `frontend/src/app/core/api/api-types.ts` (Principio VII). Stopgap; **regenerar** con `npm run gen:api`
- [X] T012 Definir esquema Prisma en `backend/prisma/schema.prisma` para las entidades de `data-model.md`. Nota: la **migración** se crea con `npm run db:migrate` (requiere PostgreSQL)
- [X] T013 Implementar `backend/src/middleware/openapi.ts` (express-openapi-validator contra `contracts/openapi.yaml`) — Principio VII. Nota: pendiente de wiring en `server.ts` cuando se generen tipos
- [X] T014 [P] Logging Pino por request montado en `backend/src/server.ts` vía `pino-http` (Principio V)
- [X] T015 [P] Servicio de auditoría en `backend/src/infrastructure/audit.ts` — FR-012, FR-013
- [X] T016 Test de auditoría en `backend/src/infrastructure/audit.test.ts` (persistencia + log) — FR-013
- [X] T017 Máquina de estados en `backend/src/domain/order-state.ts` + test `order-state.test.ts` (test-first) — FR-001
- [X] T018 [P] Adaptador de almacén de evidencias en `backend/src/infrastructure/evidence-store.ts` — ADR-0006

**Checkpoint**: base lista — tipos del contrato, BD, logging, auditoría y estados disponibles.

---

## Phase 3: User Story 6 — Inicio de sesión y autenticación (Priority: P1, fundacional) 🎯 prerequisito

**Goal**: login usuario/contraseña con sesión JWT (rol como claim), logout y bloqueo de accesos sin sesión.

**Independent Test**: iniciar sesión con cada rol semilla; credenciales inválidas → 401 genérico;
acceso sin sesión → redirección a login; logout finaliza la sesión.

### Tests for User Story 6 (escribir primero, deben FALLAR) ⚠️

- [X] T019 [P] [US6] Test unitario de bcrypt + política de contraseña en `backend/src/domain/credentials.test.ts` — FR-026/FR-027, ADR-0010
- [X] T020 [P] [US6] Test de endpoint `POST /auth/login` (200 token+rol; 401 genérico idéntico usuario/contraseña) en `backend/src/api/auth.test.ts` (supertest) — FR-026/027, EC-015
- [X] T021 [P] [US6] Test de endpoint `POST /auth/logout` (401 sin sesión; 204 con sesión) en `backend/src/api/auth.test.ts` — FR-029
- [X] T022 [P] [US6] Test del middleware auth/RBAC (401 sin token; 403 rol no autorizado) en `backend/src/middleware/auth.test.ts` — FR-028, EC-016
- [X] T023 [P] [US6] Test del guard del frontend (sin sesión → /login) en `frontend/src/app/core/auth.guard.spec.ts` — FR-028

### Implementation for User Story 6

- [X] T024 [US6] Hashing/verificación de credenciales + política en `backend/src/domain/credentials.ts` — ADR-0010
- [X] T025 [US6] `backend/src/middleware/auth.ts`: emisión/validación JWT (`sub`,`role`), RBAC — FR-011, FR-012, ADR-0001/0010
- [X] T026 [US6] Router auth en `backend/src/api/auth.ts` (`POST /auth/login`, `POST /auth/logout`); 401 genérico y logout stateless — FR-026, FR-027, FR-029
- [X] T027 [US6] Seed en `backend/prisma/seed.ts` (3 usuarios, uno por rol, hasheados) — provisión fuera de la app
- [X] T028 [P] [US6] Pantalla de login en `frontend/src/app/features/auth/login/login.component.ts` (Tailwind, accesible) — FR-026, Principio VIII
- [X] T029 [P] [US6] Logout (`app.component.ts`) + guard e interceptor JWT en `frontend/src/app/core/` — FR-028, FR-029
- [X] T030 [US6] Auditoría de login fallido/exitoso y logout en el router auth (sin datos sensibles) — FR-012, FR-013, Principio V

**Checkpoint**: autenticación funcional; el resto de historias ya puede protegerse.

---

## Phase 4: User Story 1 — Técnico registra la ejecución (Priority: P1) 🎯 MVP

**Goal**: el técnico envía la ejecución con evidencia (JPEG ≤10 MB, ≤15), ubicación, firma y duración; la orden pasa a Enviada.

**Independent Test**: con orden asignada, enviar ejecución válida → Enviada; envíos inválidos (sin foto / no JPEG / >10 MB / sin ubicación o firma) → rechazados.

### Tests for User Story 1 (escribir primero, deben FALLAR) ⚠️

- [X] T031 [P] [US1] Test unitario de reglas de envío (≥1 foto, JPEG ≤10 MB, ≤15, ubicación/firma obligatorias, duración) en `backend/src/domain/execution.test.ts` — FR-002/003/004/014/015/016, EC-001/006/007
- [X] T032 [P] [US1] Test de endpoint `POST /orders/{orderId}/execution` (201/400/403/404 ownership) en `backend/src/api/execution.test.ts` (supertest) — FR-002/003/011/015
- [X] T033 [P] [US1] Test de UI del formulario de ejecución en `frontend/.../execution.component.spec.ts` (sin fotos/no-JPEG/sin ubicación) — FR-003/014/015

### Implementation for User Story 1

- [X] T034 [US1] Servicio de envío de ejecución en `backend/src/domain/execution.ts` (reglas + transición a Enviada) — FR-002, FR-016
- [X] T035 [US1] Validación de evidencia (JPEG, ≤10 MB, 1..15) en `execution.ts` + persistencia vía `evidence-store.ts` — FR-003, FR-004, FR-014
- [X] T036 [US1] Handler `POST /orders/{orderId}/execution` en `backend/src/api/execution.ts` (solo técnico asignado; ownership → 404) — FR-002, FR-011, FR-015
- [X] T037 [P] [US1] Pantalla de registro de ejecución en `frontend/src/app/features/orders/execution/execution.component.ts` (Tailwind) — Principio VIII
- [X] T038 [US1] Auditoría del envío de ejecución en el handler — FR-013

**Checkpoint**: MVP — técnico puede registrar ejecución de forma autenticada y validada.

---

## Phase 5: User Story 2 — Supervisor revisa y aprueba/rechaza (Priority: P2)

**Goal**: el supervisor abre una ejecución enviada, la aprueba (→Aprobada) o rechaza (→Rechazada, reenviable).

**Independent Test**: con orden Enviada, aprobar → Aprobada; rechazar → Rechazada y reenviable; actor sin rol supervisor → bloqueado.

### Tests for User Story 2 (escribir primero, deben FALLAR) ⚠️

- [X] T039 [P] [US2] Test unitario de transiciones aprobar/rechazar y reenvío en `backend/src/domain/review.test.ts` — FR-007/008/009, EC-003
- [X] T040 [P] [US2] Test de endpoint `GET`/`POST /orders/{orderId}/review` (200; 403 no supervisor) en `backend/src/api/review.test.ts` — FR-020/021/022

### Implementation for User Story 2

- [X] T041 [US2] Servicio de revisión en `backend/src/domain/review.ts` (aprobar/rechazar, reenvío) — FR-007, FR-008, FR-009
- [X] T042 [US2] Handlers `GET`/`POST /orders/{orderId}/review` en `backend/src/api/review.ts` (solo supervisor; deny → 403) — FR-020, FR-021, FR-022
- [X] T043 [P] [US2] Pantalla de revisión en `frontend/src/app/features/orders/review/review.component.ts` (Tailwind) — Principio VIII
- [X] T044 [US2] Auditoría de aprobación y rechazo en el handler — FR-013

**Checkpoint**: ciclo ejecutar→revisar completo.

---

## Phase 6: User Story 3 — Dispatcher reasigna (Priority: P3)

**Goal**: el dispatcher reasigna una orden a otro técnico si no está Aprobada.

**Independent Test**: reasignar orden no aprobada → cambia técnico + registro; orden Aprobada → 403; actor sin rol dispatcher → 403.

### Tests for User Story 3 (escribir primero, deben FALLAR) ⚠️

- [X] T045 [P] [US3] Test unitario de reglas de reasignación (permitida si ≠ Aprobada) en `backend/src/domain/reassign.test.ts` — FR-005/006, EC-002
- [X] T046 [P] [US3] Test de endpoint `POST /orders/{orderId}/reassignment` (200; 403 Aprobada; 403 no dispatcher) en `backend/src/api/reassign.test.ts` — FR-006, FR-019, EC-008

### Implementation for User Story 3

- [X] T047 [US3] Servicio de reasignación en `backend/src/domain/reassign.ts` — FR-005, FR-006
- [X] T048 [US3] Handler `POST /orders/{orderId}/reassignment` en `backend/src/api/reassign.ts` (solo dispatcher; deny → 403) — FR-019
- [X] T049 [P] [US3] UI de reasignación en `frontend/src/app/features/orders/reassign/reassign.component.ts` (Tailwind) — Principio VIII
- [X] T050 [US3] Auditoría de la reasignación en el handler — FR-013

**Checkpoint**: flexibilidad operativa disponible.

---

## Phase 7: User Story 4 — Usuario consulta sus órdenes (Priority: P4)

**Goal**: cada usuario ve solo las órdenes asignadas a sí mismo.

**Independent Test**: listar → solo propias; acceder a orden ajena → 404; usuario sin órdenes → lista vacía.

### Tests for User Story 4 (escribir primero, deben FALLAR) ⚠️

- [X] T051 [P] [US4] Test de endpoint `GET /orders` (solo propias; vacío) y `GET /orders/{orderId}` (404 ajena) en `backend/src/api/orders-list.test.ts` — FR-010, FR-018, EC-004
- [X] T052 [P] [US4] Test unitario del filtro de visibilidad en `backend/src/domain/orders-query.test.ts` — FR-010

### Implementation for User Story 4

- [X] T053 [US4] Servicio de consulta con filtro de ownership en `backend/src/domain/orders-query.ts` — FR-010
- [X] T054 [US4] Handlers `GET /orders` y `GET /orders/{orderId}` en `backend/src/api/orders.ts` (404 orden ajena) — FR-010, FR-018
- [X] T055 [P] [US4] Pantalla de listado de órdenes en `frontend/src/app/features/orders/list/list.component.ts` (Tailwind) — Principio VIII

**Checkpoint**: visibilidad por rol/ownership operativa.

---

## Phase 8: User Story 5 — Resumen de incidencia (Priority: P5)

**Goal**: al abrir la revisión, se presenta un resumen de la incidencia derivado de las notas, con abstención, grounding y fallback.

**Independent Test**: notas suficientes → resumen con puntos referenciados; insuficientes → `insufficient_evidence`; proveedor caído → notas crudas + log.

### Tests for User Story 5 (escribir primero, deben FALLAR) ⚠️

- [X] T056 [P] [US5] Golden cases y umbrales verificados en `evals/incident-summary/` (5 casos + thresholds) conforme al contrato de IA — FR-023/024/025, ADR-0009
- [X] T057 [P] [US5] Runner del eval-gate en `evals/incident-summary/run.ts` (`npm run eval:incident-summary`; falla si no cumple umbrales) — ADR-0009
- [X] T058 [P] [US5] Test unitario del componente (abstención, grounding, degradación a provider_failed) en `backend/src/domain/incident-summary.test.ts` — FR-023/024/025

### Implementation for User Story 5

- [X] T059 [US5] Interfaz `IncidentSummarizer` + helpers (abstención, grounding, validación) en `backend/src/domain/incident-summary.ts` — FR-017, FR-023, FR-024, ADR-0007
- [X] T060 [US5] Adaptador por defecto + fallback (provider_failed → notas crudas, registra fallo) en `backend/src/infrastructure/incident-summary-provider.ts` — FR-025
- [X] T061 [US5] Resumen integrado en `GET /orders/{orderId}/review` en `backend/src/api/review.ts` — FR-017
- [X] T062 [P] [US5] Resumen (o notas crudas si `provider_failed`) mostrado en `review.component.ts` — FR-017, FR-025

**Checkpoint**: revisión asistida por resumen verificable.

---

## Phase 9: Polish & Cross-Cutting

- [X] T063 [P] Escenarios de validación E0–E7 mapeados en `quickstart.md` + `docs/quality-checklist.md`; ejecución E2E real pendiente de entorno con toolchain
- [X] T064 [P] Gate contract-first en CI: `.github/workflows/ci.yml` (gen:api + typecheck + lint + test + eval) — Principio VII
- [X] T065 [P] Cobertura de auditoría/logging verificada en todas las operaciones de cambio de estado (`docs/quality-checklist.md`) — Principio V, FR-012/013
- [X] T066 [P] Accesibilidad/responsive de pantallas Tailwind revisada por inspección (labels, foco, roles, tokens); contraste vía herramienta pendiente — Principio VIII
- [X] T067 TTL del JWT como configuración (`JWT_TTL` en `.env.example`, leído por `auth.ts`) — ADR-0010
- [X] T068 [P] Versión SemVer inicial `0.1.0` en workspaces y `contracts/openapi.yaml` — Principio VI

---

## Dependencies & Execution Order

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de Setup; BLOQUEA todas las historias.
- **US6 (Fase 3)**: depende de Foundational; **prerequisito** de US1–US5 (protección de rutas y roles).
- **US1 (Fase 4)**: depende de US6 (rutas protegidas) + Foundational.
- **US2 (Fase 5)**: depende de US1 (requiere ejecuciones enviadas).
- **US3 (Fase 6)**: depende de US6/Foundational; independiente de US1/US2 salvo estado de la orden.
- **US4 (Fase 7)**: depende de US6/Foundational.
- **US5 (Fase 8)**: depende de US2 (se muestra en la revisión).
- **Polish (Fase 9)**: tras las historias deseadas.

### Regla test-first (Principio IV, NO NEGOCIABLE)
En cada historia, los tests (T0xx marcados "escribir primero") DEBEN escribirse y fallar antes de su
implementación. No se marca ninguna tarea de test como opcional.

### Parallel Opportunities
- Setup: T002–T009 en paralelo tras T001.
- Foundational: T014, T015, T018 en paralelo; T011 en paralelo con T010.
- Dentro de cada historia: los tests [P] entre sí, y las tareas de UI [P] frente a las de backend.

---

## Implementation Strategy

- **MVP**: Fase 1 + Fase 2 + Fase 3 (US6, login) + Fase 4 (US1). Entrega el núcleo autenticado:
  el técnico inicia sesión y registra ejecuciones válidas.
- **Incremental**: añadir US2 (revisión) → US3 (reasignación) → US4 (consulta) → US5 (resumen IA),
  validando cada historia de forma independiente con su criterio de test.

## Trazabilidad FR → tareas (resumen)
FR-001→T017; FR-002/016→T031/T034/T036; FR-003/004/014→T031/T035; FR-005/006→T045/T047; FR-007/008/009→T039/T041;
FR-010→T051/T053; FR-011/012→T025; FR-013→T015/T030/T038/T044/T050; FR-015→T031/T036; FR-017→T059/T061;
FR-018→T051/T054; FR-019→T046/T048; FR-020/021/022→T040/T042; FR-023/024/025→T056/T058/T059/T060;
FR-026/027→T020/T024/T026; FR-028→T022/T023/T025/T029; FR-029→T021/T026/T029.
