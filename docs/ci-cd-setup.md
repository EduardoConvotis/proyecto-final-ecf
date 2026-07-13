# CI/CD — Configuración y operación (feature 002-cicd-pipeline)

Guía de la infraestructura de CI/CD. Arquitectura en `docs/architecture.md` §7 y ADR-0011…0015.
Spec: `specs/002-cicd-pipeline/pipeline-specify.md`.

## Workflows (`.github/workflows/`)

| Workflow | Disparo | Qué hace |
|----------|---------|----------|
| `pr-validate-backend.yml` | PR → `develop` (paths back/contrato) | 8 gates back, bloqueantes (FR-005/006) |
| `pr-validate-frontend.yml` | PR → `develop` (paths front/contrato) | gates front (lint+test, secrets, constitución, code-review) |
| `develop-backend.yml` | push `develop` / dispatch | build `sha-<gitsha>` + deploy `dev` / rollback dev |
| `develop-frontend.yml` | push `develop` / dispatch | idem frontend |
| `main-backend.yml` | push `main` / dispatch | SemVer + re-tag inmutable + Release + deploy `pre` + `prod` aprobado / rollback |
| `main-frontend.yml` | push `main` / dispatch | idem frontend |
| `_build-push.yml` | `workflow_call` | build+push a GHCR (reutilizable) |

Composite `.github/actions/deploy` promueve la imagen inmutable a un entorno (placeholder de
deploy real — sustituir por la infra de dev/pre/prod).

## Pasos manuales en GitHub (no se configuran desde el repo)

### 1. GitHub Environments (T002, FR-011)
`Settings → Environments` → crear:
- **`dev`** — sin protección (deploy automático).
- **`pre`** — sin protección (deploy automático).
- **`prod`** — activar **Required reviewers** y añadir al equipo. Fase de prueba: cualquier
  miembro puede aprobar (constitución de pipeline v1.1.0). Endurecer a rol concreto más adelante.

### 2. Branch protection (T003, FR-001/006)
`Settings → Branches` → reglas para `develop` y `main`:
- Requerir PR antes de merge; prohibir push directo.
- **Required status checks** (sin bypass): los jobs de `pr-validate-backend` /
  `pr-validate-frontend` (marcar los que apliquen al tocar cada componente).
- No permitir "bypass" ni administradores saltándose los checks.

### 3. Secretos / permisos
- **GHCR**: no requiere secreto; usa el `GITHUB_TOKEN` inyectado con `permissions: packages: write`
  (ya declarado en los workflows). Asegúrate de que el paquete GHCR permite escritura desde Actions.
- **Gate de constitución**: define el secreto `ANTHROPIC_API_KEY` (Settings → Secrets → Actions)
  para la Claude Code Action.

## Convención de imágenes (GHCR, ADR-0012)

```
ghcr.io/sdd-talent-devops/proyecto-final-ecf/fieldops-backend:<tag>
ghcr.io/sdd-talent-devops/proyecto-final-ecf/fieldops-frontend:<tag>
```
`<tag>` = `sha-<gitsha>` (snapshot dev) o `<semver>` (release main). Build-once: `main` **re-etiqueta**
la imagen que pasó CI (no reconstruye).

## Rollback (FR-014/016)

`Actions → develop-<comp>` o `main-<comp>` → **Run workflow** (workflow_dispatch):
- develop: input `rollback_tag` → redeploy a `dev`.
- main: inputs `environment` (pre|prod) + `rollback_tag`. `prod` pasa por el environment con
  aprobación (FR-016). No reconstruye: reutiliza el tag GHCR existente.

## Verificación local

```bash
npx vitest run tools/ci/__tests__/check-acceptance.test.js   # lógica del gate de acceptance
node evals/constitution-review/run.mjs --results <file>      # eval del gate de constitución
```
Los workflows y Dockerfiles se validan ejecutándolos en GitHub / construyendo las imágenes
(ver `specs/002-cicd-pipeline/quickstart.md`).

## Pendiente / notas

- **`ci.yml` (monolítico) sigue presente**: se retira (T034) una vez verificados los 6 workflows,
  para no duplicar gates en PR. Hasta entonces conviven.
- **Deploy real**: el composite `deploy` es un placeholder; conectar la infra de cada entorno.
- **Q4 (sin confirmar)**: la "constitución del sistema" del gate IA se asume
  `.specify/memory/constitution.md` + `pipeline-constitution.md`.
