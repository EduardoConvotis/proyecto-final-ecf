---
description: "Task list for feature 002-cicd-pipeline"
---

# Tasks: Flujo de CI/CD gobernado para FieldOps

**Input**: Design documents from `specs/002-cicd-pipeline/`

**Prerequisites**: plan.md ✅, spec.md/pipeline-specify.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Este feature es infraestructura de CI/CD. La "verificación" se hace mediante los
escenarios de `quickstart.md` (por historia) y, para el código real, con TDD: test unitario de
`check-acceptance.js` y evals del gate por IA (Principio IV de la constitución + SC-007). Los
workflows YAML se validan ejecutándolos (PR de prueba), no con unit tests. **Test-first para IaC**:
el criterio de aceptación de cada historia (escenario de `quickstart.md`) se define ANTES de
escribir sus workflows; T017/T021/T026/T033 son la ejecución de ese criterio ya definido. Esta
interpretación del Principio IV está justificada en `plan.md` → Complexity Tracking (A001).

**Organization**: agrupado por historia de usuario (US1–US5) en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1..US5 (fases de historia); Setup/Foundational/Polish sin etiqueta

## Path Conventions

Monorepo web: workflows en `.github/workflows/`, scripts CI en `tools/ci/`, evals en `evals/`,
Dockerfiles en `frontend/` y `backend/` (raíz del repo).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: preparar estructura y configuración del repositorio.

- [x] T001 [P] Crear directorios `tools/ci/` y `evals/constitution-review/` (con `.gitkeep`)
- [ ] T002 [P] Configurar GitHub Environments `dev`, `pre` (sin protección) y `prod` (con *required reviewers*; fase de prueba: cualquier miembro) — settings del repo (FR-011, ADR-0014)
- [ ] T003 Configurar branch protection en `develop` y `main`: checks requeridos = `pr-validate-frontend` / `pr-validate-backend`, sin bypass (FR-001, FR-006)
- [x] T004 [P] Documentar el bloque `permissions: { contents: read, packages: write }` y auth GHCR vía `GITHUB_TOKEN` como base de los workflows en `docs/architecture.md` §7 (Q1, ADR-0012)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: piezas compartidas que TODAS las historias necesitan (build/deploy reutilizables e imágenes).

**⚠️ CRITICAL**: ninguna historia puede completarse hasta terminar esta fase.

- [x] T005 [P] Crear `backend/Dockerfile` (imagen del backend, prerequisito de build) — research.md D3
- [x] T006 [P] Crear `frontend/Dockerfile` (imagen del frontend, prerequisito de build) — research.md D3
- [x] T007 Crear workflow reutilizable/composite de **build + push a GHCR** parametrizado por tag (`sha-<gitsha>` | `<semver>`) en `.github/workflows/_build-push.yml` (build-once, FR-012/013, ADR-0012)
- [x] T008 [P] Crear composite de **deploy de un `ref` a un environment** en `.github/actions/deploy/action.yml` (reutilizado por dev/pre/prod) (FR-008/010/011)
- [x] T009 [P] Definir los filtros de ruta compartidos (front → `frontend/**`+`contracts/openapi.yaml`; back → `backend/**`+`contracts/openapi.yaml`) como convención documentada (FR-003/003b, ADR-0013)

**Checkpoint**: base lista — las historias pueden empezar.

---

## Phase 3: User Story 1 - Ningún cambio sin verificar entra en develop (Priority: P1) 🎯 MVP

**Goal**: los 2 workflows validadores de PR ejecutan la batería de gates del componente afectado y bloquean el merge si algo falla.

**Independent Test**: PR con fallo inyectado (test roto / secreto / breaking change) → merge bloqueado; PR limpia → merge permitido; el validador del componente no tocado no corre (quickstart Escenario 1).

### Tests / Verificación primero (Principio IV)

- [x] T010 [P] [US1] Test unitario (Red) de `check-acceptance.js` en `tools/ci/__tests__/check-acceptance.test.js` — casos pasa/falla contra la API (FR-005f)
- [x] T011 [P] [US1] Crear golden cases + arnés de eval del gate de constitución en `evals/constitution-review/` según `contracts/constitution-review.contract.md` (fail-closed; umbral 0 falsos negativos, SC-007/FR-017)
- [x] T011b [US1] Crear `evals/constitution-review/thresholds.json` (0 falsos negativos) y una tarea/script `evals/constitution-review/run.mjs` que ejecute el eval y falle si no se cumple el umbral (verificación del feature, no por-PR) (SC-007, FR-017)

### Implementation for User Story 1

- [x] T012 [US1] Implementar `tools/ci/check-acceptance.js` (Green) según contrato (FR-005f)
- [x] T013 [P] [US1] Crear `.github/workflows/pr-validate-backend.yml` con gates back: `npm test`, Spectral, oasdiff, Gitleaks, `check-acceptance.js`, Trivy, revisión de constitución, code-review dummy (FR-005 a–h; **FR-002** componente independiente; **FR-004** corre en paralelo con el de frontend; contracts/workflows.contract.md)
- [x] T014 [P] [US1] Crear `.github/workflows/pr-validate-frontend.yml` con gates front: `npm test`, Gitleaks, revisión de constitución, code-review dummy (FR-005 a/e/h; **FR-002** componente independiente; **FR-004** corre en paralelo con el de backend)
- [x] T015 [US1] Integrar la **Claude Code Action** como gate fail-closed en ambos validadores según `contracts/constitution-review.contract.md` (FR-017)
- [x] T016 [US1] Configurar los `on.pull_request` con `base: develop` y `paths` por componente para el aislamiento (FR-003b, US1-AC6)
- [ ] T017 [US1] Validar con quickstart **Escenario 1** (fallo inyectado bloquea; limpia pasa; fail-closed del gate IA)

**Checkpoint**: US1 funcional e independientemente testeable — MVP.

---

## Phase 4: User Story 2 - Integración continua desplegada solo en dev (Priority: P2)

**Goal**: al mergear a `develop`, build snapshot (SHA) del componente cambiado y deploy automático solo a `dev`.

**Independent Test**: merge a `develop` que solo toca un componente → aparece snapshot en `dev` de ese componente; el otro no corre; `pre`/`prod` intactos (quickstart Escenario 2).

- [x] T018 [P] [US2] Crear `.github/workflows/develop-backend.yml`: build `fieldops-back:sha-<gitsha>` (usa T007) + deploy `dev` (usa T008) (FR-007/008)
- [x] T019 [P] [US2] Crear `.github/workflows/develop-frontend.yml`: build `fieldops-front:sha-<gitsha>` + deploy `dev` (FR-007/008)
- [x] T020 [US2] Asegurar aislamiento: `paths` por componente y que ningún otro entorno se ve afectado (FR-008, INV-2)
- [ ] T021 [US2] Validar con quickstart **Escenario 2**

**Checkpoint**: US1 y US2 funcionan independientemente.

---

## Phase 5: User Story 3 - Release final y promoción gobernada a producción (Priority: P3)

**Goal**: en `main`, versión SemVer + GitHub Release + deploy automático a `pre` (solo componente afectado) + `prod` con aprobación manual.

**Independent Test**: cambio a `main` → Release en GitHub con assets + deploy a `pre`; `prod` no se despliega sin aprobación; con aprobación, sí (quickstart Escenario 3).

- [x] T022 [P] [US3] Crear `.github/workflows/main-backend.yml`: SemVer desde Conventional Commits, re-tag/publish `fieldops-back:<semver>`, GitHub Release con assets, deploy `pre` (FR-009/010/010b)
- [x] T023 [P] [US3] Crear `.github/workflows/main-frontend.yml`: idem para frontend (FR-009/010/010b)
- [x] T024 [US3] Añadir job de deploy a `prod` gobernado por *required reviewers* del environment `prod` (FR-011)
- [x] T025 [US3] Garantizar que el deploy a `pre` respeta el aislamiento por componente (FR-010b, US3-AC4)
- [x] T025b [US3] Exponer la versión desplegada por entorno de forma identificable (etiqueta/anotación de deployment y salida del job que registra `component@version@env`) para poder saber en todo momento qué hay en dev/pre/prod (**SC-005**)
- [ ] T026 [US3] Validar con quickstart **Escenario 3** (incluye verificar SC-005: versión visible por entorno)

**Checkpoint**: US1–US3 independientes.

---

## Phase 6: User Story 4 - Lo que pasó CI es lo que llega a producción (Priority: P3)

**Goal**: build-once; los deploys reutilizan la misma imagen por referencia, sin reconstruir.

**Independent Test**: el `ref`/digest publicado tras CI es el mismo desplegado en dev/pre/prod (quickstart Escenario 4).

- [x] T027 [US4] Ajustar los workflows de `main` para **re-etiquetar/reutilizar** la imagen que pasó CI en lugar de reconstruir (FR-012/013, ADR-0012)
- [ ] T028 [US4] Añadir verificación de que el `ref`/digest desplegado == el que pasó CI en cada entorno (INV-3)
- [ ] T029 [US4] Validar con quickstart **Escenario 4**

**Checkpoint**: inmutabilidad garantizada de extremo a extremo.

---

## Phase 7: User Story 5 - Reversión gobernada ante fallos (Priority: P3)

**Goal**: rollback al último artefacto estable conocido, sin rebuild, trazable; en `prod` con aprobación.

**Independent Test**: fallo de deploy en dev/pre → rollback redepliega tag estable previo (mismo ref); rollback en prod requiere aprobación (quickstart Escenario 5).

- [x] T030 [P] [US5] Añadir job `workflow_dispatch` de rollback (redeploy de un tag GHCR existente) para `dev`/`pre` en los workflows de componente (FR-014, ADR-0014)
- [x] T031 [US5] Añadir rollback a `prod` gobernado por la misma aprobación que el deploy (FR-016)
- [x] T032 [US5] Registrar en el rollback actor/from/to/runId (rastro vía historial de runs) (FR-014)
- [ ] T033 [US5] Validar con quickstart **Escenario 5**

**Checkpoint**: las 5 historias funcionan independientemente.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T034 Retirar el `.github/workflows/ci.yml` consolidado una vez verificados los 6 workflows (research.md, ADR-0011)
- [ ] T035 [P] Confirmar con el usuario Q4 (alcance de la "constitución del sistema" del gate IA) y Q2 (alcance de Trivy); actualizar `contracts/constitution-review.contract.md` si cambia
- [x] T036 [P] Actualizar `docs/architecture.md` §7 y marcar ADR-0011…0015 como `Accepted` si procede
- [ ] T037 Ejecutar la validación completa de `quickstart.md` (los 5 escenarios de extremo a extremo)
- [x] T038 [P] Documentar los 6 workflows y el flujo de ramas/entornos en `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; **bloquea** todas las historias.
- **User Stories (Phase 3–7)**: dependen de Foundational.
  - US1 (P1) es el MVP. US2 depende de la base de build/deploy (T007/T008).
  - US4 refina a US3 (build-once sobre los workflows de `main`): hacer US3 antes que US4.
  - US5 (rollback) reutiliza los workflows de US2/US3: hacer después.
- **Polish (Phase 8)**: tras verificar las historias deseadas (T034 solo tras validar los 6 workflows).

### User Story Dependencies

- **US1 (P1)**: tras Foundational. Independiente. (check-acceptance.js + 2 validadores de PR)
- **US2 (P2)**: tras Foundational (T007/T008). Independiente de US1.
- **US3 (P3)**: tras Foundational. Reutiliza build/deploy; independientemente testeable.
- **US4 (P3)**: refina los workflows de `main` de US3 → después de US3.
- **US5 (P3)**: reutiliza workflows de US2/US3 → después de ellos.

### Parallel Opportunities

- Setup: T001, T002, T004 en paralelo.
- Foundational: T005, T006, T008, T009 en paralelo (T007 tras Dockerfiles).
- US1: T010 y T011 en paralelo; T013 y T014 en paralelo (archivos distintos).
- US2: T018 y T019 en paralelo. US3: T022 y T023 en paralelo.
- Con equipo: tras Foundational, US1/US2/US3 pueden repartirse.

---

## Parallel Example: User Story 1

```bash
# Verificación primero (en paralelo):
Task: "T010 Unit test de check-acceptance.js en tools/ci/__tests__/check-acceptance.test.js"
Task: "T011 Golden cases + eval del gate de constitución en evals/constitution-review/"

# Workflows de PR (archivos distintos, en paralelo):
Task: "T013 pr-validate-backend.yml"
Task: "T014 pr-validate-frontend.yml"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → 4. **Validar Escenario 1** → demo del gate de PR.

### Incremental Delivery

Setup+Foundational → US1 (MVP: gate de PR) → US2 (dev) → US3 (release/pre/prod) → US4 (inmutabilidad) → US5 (rollback) → Polish (retirar `ci.yml`, docs).

---

## Notes

- `spec.md` es una copia canónica de `pipeline-specify.md` para compatibilidad con el tooling SDD;
  mantener ambos en sync o consolidar más adelante.
- [P] = archivos distintos, sin dependencias. [Story] mapea a US para trazabilidad.
- Verificar que los tests fallan antes de implementar (T010).
- Los workflows se validan ejecutándolos (PR/push de prueba), guiados por `quickstart.md`.
- No retirar `ci.yml` (T034) hasta que los 6 workflows estén verdes y verificados.
