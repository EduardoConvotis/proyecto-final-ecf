# Contract — Los 6 workflows de CI/CD

Contrato de comportamiento (no la implementación YAML) de los 6 workflows. Cada uno traza a FRs y
principios. La sintaxis concreta se escribe en `/speckit-implement`.

## Convenciones comunes

- **Registro/tag**: `ghcr.io/<org>/<repo>/fieldops-<front|back>:<tag>` — `sha-<gitsha>` (dev) o
  `<semver>` (main). (FR-012, ADR-0012)
- **Auth**: `GITHUB_TOKEN` inyectado; `permissions: { contents: read, packages: write }` (y
  `id-token`/`deployments` según deploy). Sin secretos adicionales para GHCR. (Q1)
- **Paths**: front → `frontend/**`, `contracts/openapi.yaml`; back → `backend/**`,
  `contracts/openapi.yaml`. (FR-003/003b, ADR-0013)
- **Aislamiento/paralelo**: front y back son workflows separados; corren en paralelo. (FR-004)

## 1–2. `pr-validate-{frontend,backend}.yml` — PR `feature/*` → `develop`

- **Trigger**: `pull_request` con `base: develop` + `paths` del componente.
- **Jobs (gates, todos bloqueantes, FR-005/006)** según componente:

| Gate | front | back |
|------|:----:|:----:|
| `npm test` (lint+unit) | ✅ | ✅ |
| Spectral (OpenAPI) | — | ✅ |
| oasdiff (breaking) | — | ✅ |
| Gitleaks (secretos) | ✅ | ✅ |
| `check-acceptance.js` (ACs vs API) | — | ✅ |
| Trivy (imagen) | — | ✅ |
| Claude Code Action (constitución, **fail-closed**) | ✅ | ✅ |
| Code-review dummy (certifica paso) | ✅ | ✅ |

- **Salida esperada**: todos los gates `pass` ⇒ el PR es mergeable; cualquier `fail` ⇒ el check de
  rama requerido falla y el merge queda bloqueado (branch protection sobre `develop`). Sin bypass.
- **Postcondición**: no despliega nada (solo valida).

## 3–4. `develop-{frontend,backend}.yml` — push a `develop`

- **Trigger**: `push` a `develop` + `paths` del componente.
- **Jobs**: build de imagen del componente → tag `sha-<gitsha>` → push a GHCR → deploy a
  environment `dev`. (FR-007/008)
- **Postcondición**: solo el componente cambiado se construye/despliega; ningún otro entorno se ve
  afectado. (FR-008, INV-2)

## 5–6. `main-{frontend,backend}.yml` — push a `main`

- **Trigger**: `push` a `main` + `paths` del componente.
- **Jobs**:
  1. Calcular **SemVer** por componente desde Conventional Commits (FR-009).
  2. Build + tag `<semver>` + push a GHCR (o **re-tag** del artefacto que ya pasó CI, sin
     reconstruir — preferente para respetar build-once; ver nota).
  3. Publicar **GitHub Release** con assets de build (FR-010).
  4. Deploy automático a environment `pre` — solo el componente afectado (FR-010b).
  5. Deploy a `prod` gobernado por **required reviewers** del environment `prod` (FR-011).
- **Rollback**: job `workflow_dispatch` que redepliega un tag GHCR existente al env indicado;
  `prod` exige aprobación (FR-014/016). Registra `from/to/actor/runId` (INV via run history).

> **Nota build-once**: idealmente el artefacto de `main` es el mismo que pasó CI en el PR,
> re-etiquetado a semver (no rebuild). Si el flujo obliga a un build en `main`, debe ser
> byte-idéntico y publicarse una sola vez; los deploys posteriores reutilizan ese `ref` (FR-012/013).

## Trazabilidad

| Workflow | FRs | ADR |
|----------|-----|-----|
| pr-validate-* | FR-003/003b/004/005/005a-h/006/017 | 0011, 0013, 0015 |
| develop-* | FR-007/008 | 0011, 0012, 0013 |
| main-* | FR-009/010/010b/011/012/013/014/016 | 0011, 0012, 0014 |
