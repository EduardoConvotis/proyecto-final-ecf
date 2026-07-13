# Phase 1 — Data Model: dominio del flujo de CI/CD

Este feature no introduce tablas de base de datos. Las "entidades" son conceptos del dominio de
CI/CD materializados en artefactos de GitHub (workflows, imágenes GHCR, releases, environments,
runs). Se modelan para fijar campos, relaciones y reglas verificables trazables a los FR.

## Entidades

### Component
Unidad desplegable independiente del monorepo.
- **id**: `frontend` | `backend`
- **pathFilter**: rutas que lo disparan (`frontend/**`+`contracts/openapi.yaml` / `backend/**`+`contracts/openapi.yaml`)
- **imageRepo**: `ghcr.io/<org>/<repo>/fieldops-<front|back>`
- **dockerfile**: `frontend/Dockerfile` | `backend/Dockerfile` (a crear)
- Reglas: FR-002, FR-003, FR-003b. Cada Component tiene exactamente 3 workflows (PR, develop, main).

### Workflow
Definición de pipeline en `.github/workflows/`.
- **name**, **stage**: `pr-validate` | `develop` | `main`
- **component**: → Component
- **trigger**: `pull_request`→develop (pr-validate) · `push`→develop (develop) · `push`→main (main)
- **paths**: = Component.pathFilter
- Reglas: exactamente **6** Workflows (2 componentes × 3 etapas), FR-001..FR-010b. Corren en
  paralelo entre componentes (FR-004).

### Gate
Validación obligatoria dentro de un Workflow de PR.
- **key**: lint-test | openapi-spectral | breaking-oasdiff | secrets-gitleaks | acceptance | trivy | constitution-review | code-review-dummy
- **tool**, **appliesTo**: front+back | back
- **blocking**: siempre `true` (FR-006, sin bypass)
- **result**: `pass` | `fail` (para constitution-review: cualquier no-pass ⇒ `fail`, FR-017)
- Reglas: un merge a `develop` requiere todos los Gate del componente en `pass` (FR-005/006).

### Artifact (Image)
Imagen de contenedor inmutable en GHCR.
- **ref**: `ghcr.io/<org>/<repo>/fieldops-<comp>:<tag>`
- **tag**: `sha-<gitsha>` (snapshot dev) | `<semver>` (release main)
- **immutable**: `true` — se promueve tal cual dev→pre→prod
- Reglas: FR-012, FR-013. Estados: `built` → `ci-passed/published` → `deployed(env)`.

### Environment
Destino de despliegue (GitHub Environment).
- **name**: `dev` | `pre` | `prod`
- **autoDeploy**: dev=true, pre=true, prod=false
- **requiredReviewers**: prod=sí (fase de prueba: cualquier miembro); dev/pre=no
- **isolationRespected**: solo se (re)despliega el componente cambiado (FR-008/FR-010b)
- Reglas: FR-008, FR-010, FR-010b, FR-011.

### Release
Versión final asociada a `main`.
- **component**, **semver** (derivado de Conventional Commits), **githubReleaseTag**, **assets** (artefactos de build)
- Reglas: FR-009, FR-010. Una Release por componente afectado al llegar a `main`.

### Approval
Acto explícito que habilita `prod` (deploy o rollback).
- **actor** (miembro del equipo), **target**: `prod-deploy` | `prod-rollback`, **timestamp**, **runId**
- Reglas: FR-011, FR-016. Sin Approval ⇒ el sistema impide la acción.

### RollbackRecord
Reversión trazable a un artefacto estable previo.
- **env**, **fromRef**, **toRef** (tag GHCR existente), **actor**, **runId**
- Reglas: FR-014 (dev/pre), FR-016 (prod requiere Approval). No reconstruye: reutiliza Artifact.

## Relaciones

```
Component (1) ──< Workflow (3)           # PR, develop, main
Workflow[pr] (1) ──< Gate (8)
Component (1) ──< Artifact (N)           # por SHA / semver
Artifact (1) ──< Deployment ──> Environment
Component (1) ──< Release (N)            # solo desde main
Environment[prod] (1) ──< Approval       # deploy y rollback
Environment (1) ──< RollbackRecord
```

## Reglas transversales (invariantes verificables)

- **INV-1**: nº de Workflows == 6, uno por (Component × stage). (FR-001..FR-010b)
- **INV-2**: un cambio que solo toca un Component no dispara Workflows del otro. (FR-003b)
- **INV-3**: el `ref` desplegado en `prod` == el `ref` que pasó CI. (FR-013)
- **INV-4**: ningún Gate es no-bloqueante; constitution-review es fail-closed. (FR-006, FR-017)
- **INV-5**: toda acción sobre `prod` (deploy/rollback) tiene un Approval asociado. (FR-011, FR-016)
