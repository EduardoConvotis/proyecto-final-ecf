# Implementation Plan: Ejecución y Revisión de Órdenes de Trabajo

**Branch**: `001-order-execution-workflow` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-order-execution-workflow/spec.md`

## Summary

Flujo de ejecución y revisión de órdenes de trabajo de campo para aseguradoras. El técnico registra
la ejecución de una orden asignada adjuntando evidencia fotográfica (JPEG ≤10 MB, hasta 15),
ubicación, firma y tiempo de trabajo; el dispatcher puede reasignar antes de la aprobación; el
supervisor revisa y aprueba/rechaza, con un resumen de incidencia generado a partir de las notas del
técnico; cada usuario ve solo sus órdenes. Enfoque técnico: monorepo Angular + Express en TypeScript
estricto, **contract-first** con OpenAPI 3.1 como fuente de verdad, RBAC de 3 roles, persistencia
PostgreSQL/Prisma con auditoría, y logging estructurado (Pino). El resumen de incidencia (FR-017,
FR-023…FR-025) se especifica como **contrato de IA verificable** (`contracts/ai/incident-summary.contract.md`)
con **eval-gate** de golden cases (`evals/incident-summary/`): abstención ante evidencia insuficiente,
grounding en las notas y fallback a notas crudas si el proveedor falla. La **autenticación** (US6,
FR-026…FR-029) usa login usuario/contraseña con JWT (rol como claim), hashing bcrypt en la provisión
(3 usuarios semilla, alta fuera de la feature), mensaje 401 genérico y **logout stateless** (ADR-0010).
La arquitectura de referencia y las decisiones están en [docs/architecture.md](../../docs/architecture.md)
y los ADR [docs/adr/](../../docs/adr/) (0001–0010).

## Technical Context

**Language/Version**: TypeScript (modo `strict`), Node.js LTS más reciente; Angular última versión
estable; Express última versión estable.

**Primary Dependencies**: Angular + Tailwind CSS (frontend); Express, `openapi-typescript` +
`express-openapi-validator` (contract-first), Prisma (ORM), Pino (logging), autenticación JWT +
`bcrypt` para hashing en provisión (backend, ADR-0010). Gestión de monorepo con **npm workspaces**
(ADR-0002).

**Storage**: PostgreSQL vía Prisma (ADR-0005). Evidencias fotográficas en almacén de archivos
separado de la BD tras un adaptador (ADR-0006).

**Testing**: Vitest en el backend (capa `domain/`, test-first); runner nativo de Angular en el
frontend (ADR-0008). **Eval-gate** de golden cases para el resumen de incidencia (`evals/incident-summary/`,
ADR-0009). Tests de integración NO obligatorios (Principio IV).

**Target Platform**: Aplicación web (backend Linux server + frontend navegador).

**Project Type**: Web application (monorepo frontend + backend).

**Performance Goals**: SC-002 (95% de consultas <2 s), SC-003 (revisión/decisión <1 min); umbrales
estándar de app web interactiva (sin normativa específica — confirmado en spec).

**Constraints**: Contract-first (ningún endpoint sin operación previa en `contracts/openapi.yaml`);
TypeScript estricto sin `any` injustificado; logging estructurado sin secretos/PII —ni contraseñas ni
tokens— en claro; UI con Tailwind (tokens centralizados), incluida la pantalla de login. Sin normativa
de protección de datos aplicable por ahora. Autenticación requerida en toda función protegida (FR-012).

**Scale/Scope**: 6 historias de usuario (US1–US6, incl. login), 29 requisitos funcionales, 16 casos
límite, 3 roles.

**NEEDS CLARIFICATION**: TTL concreto del JWT — detalle de configuración (no de arquitectura),
a fijar en despliegue; no bloquea el plan (ADR-0010).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` (FieldOps v1.2.0).

- [x] **I. TypeScript Estricto** — `tsconfig.json` con `strict: true` en ambos workspaces; sin `any`
  injustificado. Tipos de API derivados del contrato (no manuales).
- [x] **II. Simplicidad y YAGNI** — sin paquete `packages/shared` (cada lado deriva sus tipos del
  contrato); sin tooling de monorepo pesado (npm workspaces, no Nx/Turborepo — ADR-0002).
- [x] **III. Trazabilidad SDD** — cada operación del contrato, módulo y test referencia su `FR-XXX`
  (ver tabla FR→operación en la spec y en `data-model.md`).
- [x] **IV. Test-First (TDD)** — las tareas programarán tests antes de la implementación (Red→Green)
  para cada unidad de comportamiento; runners fijados en ADR-0008. El resumen de incidencia se
  verifica con eval-gate de golden cases (ADR-0009). **Se anulará el "OPTIONAL" de
  `tasks-template.md`**: los tests son obligatorios.
- [x] **V. Observabilidad** — middleware de logging estructurado con Pino y redacción de datos
  sensibles —nunca contraseñas ni tokens— (ADR-0004); auditoría de acciones, accesos, intentos de
  login fallidos y logout (FR-012, FR-013).
- [x] **VI. Versionado Semántico** — versión SemVer por workspace; cambios incompatibles del
  contrato OpenAPI ⇒ MAJOR.
- [x] **VII. Contract-First (OpenAPI)** — `contracts/openapi.yaml` (OpenAPI 3.1) definido ANTES de
  cualquier endpoint; codegen `openapi-typescript` + validación `express-openapi-validator`; cada
  operación traza a un `FR-XXX` (ADR-0003).
- [x] **VIII. Diseño con Tailwind CSS** — `frontend/tailwind.config.ts` con tokens centralizados;
  utility-first, componentes reutilizables, responsive + accesible, sin `!important`. Aplica también
  a la **pantalla de login** (`features/auth/`), con los mismos tokens (sin sistema de estilos nuevo).

**Nota YAGNI (Principio II) en auth**: sin refresh tokens, sin blacklist de logout, sin lockout —
ningún requisito lo exige (confirmado fuera de alcance); logout stateless (ADR-0010).

**Resultado (inicial y post-diseño)**: PASS (sin violaciones). No se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-order-execution-workflow/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 — decisiones y preguntas abiertas resueltas
├── data-model.md        # Fase 1 — entidades, relaciones, validaciones, estados
├── quickstart.md        # Fase 1 — guía de validación end-to-end
└── tasks.md             # Fase 2 (/speckit-tasks — NO creado aquí)
```

Contrato de API: **fuente de verdad en la raíz del repo** en `contracts/openapi.yaml` (Principio VII,
única fuente de verdad del monorepo), no duplicado bajo `specs/` (YAGNI, Principio II). El plan lo
referencia; `/speckit-tasks` generará tareas a partir de él.

### Source Code (repository root)

```text
frontend/
├── src/app/
│   ├── core/            # guard de autenticación + interceptor JWT, cliente HTTP tipado (del contrato)
│   ├── features/
│   │   ├── auth/        # pantalla de login y logout (Tailwind, Principio VIII) — US6
│   │   └── orders/      # ejecución, revisión, reasignación, listado, resumen (US1–US5)
│   └── shared/          # componentes UI reutilizables (Tailwind), pipes, utilidades
├── tailwind.config.ts   # tokens de diseño centralizados (Principio VIII)
└── tsconfig.json        # strict

backend/
├── src/
│   ├── api/             # routers/handlers Express por recurso, incl. router auth (login/logout)
│   ├── domain/          # lógica de negocio y transiciones de estado (test-first, Vitest)
│   ├── infrastructure/  # Prisma, almacén de evidencias, proveedor de resumen IA
│   ├── middleware/      # auth.ts (emisión/validación JWT + RBAC/ownership), logging Pino, validación
│   └── generated/       # tipos derivados de openapi.yaml (openapi-typescript)
└── tsconfig.json        # strict

contracts/
├── openapi.yaml         # OpenAPI 3.1 — única fuente de verdad del contrato HTTP
└── ai/
    └── incident-summary.contract.md  # contrato del componente de IA (FR-017/023…025)

evals/
└── incident-summary/    # golden cases + umbrales (eval-gate, ADR-0009)

docs/
├── architecture.md      # arquitectura de referencia
├── adr/                 # ADR-0001…0010 + índice
└── security/            # rbac-matrix.md (incl. fila A7 logout)
```

**Structure Decision**: Monorepo "web application" (Opción 2 del template) con `frontend/` (Angular +
Tailwind, capas core/features/shared) y `backend/` (Express por capas api/domain/infrastructure/
middleware), más `contracts/openapi.yaml` como fuente de verdad. Adoptada de
[docs/architecture.md](../../docs/architecture.md); cada elemento traza a un principio o a un `FR-XXX`.

## Complexity Tracking

> Sin violaciones del Constitution Check — no aplica.

## Phase 0 — Research

Ver [research.md](./research.md): resuelve las preguntas abiertas (mecanismo de auth, proveedor de
resumen IA y fallback, hosting de BD/almacenamiento, 403 vs 404 en fallo de ownership) y consolida
las decisiones de los ADR.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md): entidades, relaciones, validaciones y máquina de estados de la
  orden.
- [contracts/openapi.yaml](../../contracts/openapi.yaml): operaciones de API (OpenAPI 3.1), cada una
  trazada a su `FR-XXX`.
- [contracts/ai/incident-summary.contract.md](../../contracts/ai/incident-summary.contract.md):
  contrato del componente de IA (entradas/salidas, abstención FR-023, grounding FR-024, fallback
  FR-025) validado por el eval-gate en `evals/incident-summary/` (ADR-0009).
- [quickstart.md](./quickstart.md): guía de validación end-to-end del MVP y del flujo completo.

## Phase 2 — Tasks

Fuera del alcance de `/speckit-plan`. `/speckit-tasks` generará `tasks.md` (test-first obligatorio,
organizado por historia de usuario y partiendo del contrato OpenAPI).
