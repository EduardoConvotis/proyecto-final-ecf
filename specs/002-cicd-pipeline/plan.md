# Implementation Plan: Flujo de CI/CD gobernado para FieldOps

**Branch**: `002-cicd-pipeline` | **Date**: 2026-07-13 | **Spec**: [pipeline-specify.md](./pipeline-specify.md)

**Input**: Feature specification from `specs/002-cicd-pipeline/pipeline-specify.md`

**Governing constitution**: `.specify/memory/pipeline-constitution.md` (v1.1.0, Principios I–VIII).
Constitución de proyecto: `.specify/memory/constitution.md` (v1.2.0).

## Summary

Establecer un flujo de CI/CD gobernado y verificable para el monorepo FieldOps (frontend y
backend como componentes independientes) sobre **GitHub Actions**, con **6 workflows** (uno por
componente × etapa), detección de cambios por rutas, artefactos inmutables en **GHCR** (build
once / promote), promoción por entornos (`dev` y `pre` automáticos, `prod` con aprobación manual)
y una batería de gates obligatorios en cada PR a `develop` —incluida una revisión de constitución
por agente que falla en cerrado—. Enfoque técnico y decisiones estructurales detallados en
`docs/architecture.md` §7 y ADR-0011…ADR-0015.

## Technical Context

**Language/Version**: YAML de GitHub Actions; Node.js 22 (reutiliza toolchain del monorepo);
scripts auxiliares en TypeScript/Node (`check-acceptance.js`).

**Primary Dependencies**: GitHub Actions; GHCR (GitHub Container Registry); Docker/Buildx;
Spectral (lint OpenAPI), oasdiff (breaking changes), Gitleaks (secretos), Trivy (vulnerabilidades
de imagen), Claude Code Action (gate de revisión de constitución vía API del agente).

**Storage**: GHCR para imágenes (`ghcr.io/<org>/<repo>/fieldops-<front|back>:<tag>`); GitHub
Releases para artefactos de `main`. Sin base de datos nueva para este feature.

**Testing**: `npm test` (unit, front+back); validación de gates verificable vía `quickstart.md`
(PR de prueba con fallos inyectados) y evals del gate por IA (`evals/`, ver ADR-0009/§gate IA).

**Target Platform**: `ubuntu-latest` runners; despliegue a entornos `dev`, `pre`, `prod`
(GitHub Environments).

**Project Type**: Web monorepo (frontend Angular + backend Node/Express) — este feature añade la
capa de CI/CD, no código de aplicación.

**Performance Goals**: N/A (no es camino de ejecución de usuario). Objetivo operativo: pipelines
de PR ejecutan solo el componente afectado (aislamiento), front y back en paralelo.

**Constraints**: build-once/immutable-promotion (mismo artefacto dev→pre→prod, sin reconstruir);
gate de constitución **fail-closed**; ninguna vía de bypass de gates; exactamente 3 tipos de rama;
autenticación a GHCR solo con `GITHUB_TOKEN` inyectado (`permissions: packages: write`).

**Scale/Scope**: 6 workflows, 2 componentes, 3 entornos, 8 gates. Reemplaza el `ci.yml`
consolidado actual.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Este feature es **infraestructura de CI/CD**: en su mayoría no escribe código de aplicación, sino
que **automatiza el cumplimiento** de los principios de la constitución de proyecto. Se evalúa
contra `constitution.md` (v1.2.0). También cumple, por diseño, la `pipeline-constitution.md`.

- [x] **I. TypeScript Estricto** — los scripts auxiliares (`check-acceptance.js` y afines) se
  escriben en TS/Node sin `any` injustificado; el gate de lint/typecheck (FR-005a) *hace cumplir*
  este principio en cada PR.
- [x] **II. Simplicidad y YAGNI** — 6 workflows sin orquestador transversal (ADR-0011); no se
  crean ADRs para elecciones triviales de herramienta (ya fijadas); detección de cambios con
  `on.paths` nativo antes que tooling extra (ADR-0013).
- [x] **III. Trazabilidad SDD** — cada workflow/gate traza a un FR del spec y a un principio de
  pipeline-constitution (ver `research.md` y matriz de gates); tasks referenciarán su FR.
- [x] **IV. Test-First (TDD)** — la validación del propio pipeline se hace vía escenarios
  ejecutables (`quickstart.md`: PR con fallo inyectado → merge bloqueado, antes de dar por bueno
  cada gate). El gate `npm test` impone TDD al resto del repo.
- [x] **V. Observabilidad** — los logs de Actions son el rastro de auditoría (quién/qué/cuándo);
  las reversiones se registran (FR-014). No se imprimen secretos (Gitleaks + `GITHUB_TOKEN` con
  scope mínimo).
- [x] **VI. Versionado Semántico** — releases de `main` con SemVer por componente derivado de
  Conventional Commits (FR-009); breaking changes de contrato detectados por oasdiff (FR-005d).
- [x] **VII. Contract-First (OpenAPI)** — el feature **no** añade endpoints, pero el gate valida el
  contrato (`contracts/openapi.yaml`) con Spectral y detecta breaking changes con oasdiff antes de
  mergear (FR-005c/d); `contracts/openapi.yaml` es ruta compartida que dispara ambos componentes
  (ADR-0013). N/A la creación de nuevos endpoints.
- [x] **VIII. Diseño con Tailwind CSS** — N/A (sin UI nueva). El lint del frontend (que incluye
  reglas Tailwind) se ejecuta como gate FR-005a.

**Resultado**: PASS. Sin violaciones que justificar (Complexity Tracking vacío).

## Project Structure

### Documentation (this feature)

```text
specs/002-cicd-pipeline/
├── plan.md                      # Este archivo (/speckit-plan)
├── pipeline-specify.md          # Spec (nombre personalizado en lugar de spec.md)
├── research.md                  # Fase 0 (/speckit-plan)
├── data-model.md                # Fase 1 (/speckit-plan)
├── quickstart.md                # Fase 1 (/speckit-plan)
├── contracts/                   # Fase 1 (/speckit-plan)
│   ├── workflows.contract.md            # Contrato de los 6 workflows (triggers/jobs/gates)
│   └── constitution-review.contract.md  # Contrato E/S del gate por IA (fail-closed)
└── tasks.md                     # Fase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
.github/workflows/
├── pr-validate-frontend.yml     # PR → develop: gates del frontend (FR-005/006)
├── pr-validate-backend.yml      # PR → develop: gates del backend (FR-005/006)
├── develop-frontend.yml         # push develop: snapshot(SHA) + deploy dev (FR-007/008)
├── develop-backend.yml          # push develop: snapshot(SHA) + deploy dev (FR-007/008)
├── main-frontend.yml            # push main: SemVer + Release + deploy pre + prod aprobado (FR-009/010/011)
└── main-backend.yml             # push main: SemVer + Release + deploy pre + prod aprobado (FR-009/010/011)
# ci.yml actual → se retira al introducir los 6 workflows (secuencia en tasks.md)

frontend/
├── Dockerfile                   # NUEVO (prerequisito de build; se crea en tasks)
└── ... (Angular app existente)

backend/
├── Dockerfile                   # NUEVO (prerequisito de build; se crea en tasks)
└── ... (Express app existente)

tools/ci/
└── check-acceptance.js          # Verificación de ACs contra la API (FR-005f, back)

evals/
└── constitution-review/         # Golden cases + umbrales del gate por IA (SC-007, FR-017)
```

**Structure Decision**: Monorepo web (Opción 2). Se adopta la topología de **6 workflows, uno por
(componente × etapa)** sin orquestador transversal (ADR-0011), con filtros de ruta
`frontend/**`+`contracts/openapi.yaml` y `backend/**`+`contracts/openapi.yaml` (ADR-0013).
Artefactos en GHCR con promoción inmutable (ADR-0012). Entornos `dev`/`pre` automáticos y `prod`
con *required reviewers* de GitHub Environments + rollback como `workflow_dispatch` que redepliega
un tag existente (ADR-0014). Gate de constitución fail-closed vía Claude Code Action (ADR-0015).

## Complexity Tracking

| Violación / desviación | Por qué se necesita | Alternativa más simple rechazada porque |
|------------------------|---------------------|-----------------------------------------|
| **Principio IV (TDD test-first) aplicado con matices** — solo el código real (`check-acceptance.js`, T010→T012; y las evals del gate IA, T011) sigue Red→Green estricto; los workflows YAML se verifican ejecutándolos vía escenarios de `quickstart.md` (definidos ANTES de escribir cada workflow) | Un workflow de GitHub Actions es configuración declarativa: no hay unidad de lógica que aislar con un unit test previo; su comportamiento solo se observa al ejecutarlo (PR/push de prueba). La verificación se define antes de implementar (criterio de aceptación por historia) para preservar el espíritu test-first | Escribir "unit tests" de YAML no aporta señal real y añade complejidad (contra Principio II). Un simulador de Actions local sería infra especulativa (YAGNI). La verificación ejecutable por escenario da la garantía equivalente para IaC |
