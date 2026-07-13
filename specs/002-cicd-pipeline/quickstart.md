# Quickstart — Validación del flujo de CI/CD

Escenarios ejecutables que prueban que el feature funciona de extremo a extremo. No incluye la
implementación de los workflows (eso va en `tasks.md` / `/speckit-implement`); es la guía para
**verificar** que se comporta según el spec.

## Prerrequisitos

- Los 6 workflows presentes en `.github/workflows/` (ver `contracts/workflows.contract.md`).
- `frontend/Dockerfile` y `backend/Dockerfile` creados.
- GitHub Environments `dev`, `pre`, `prod` configurados; `prod` con *required reviewers*.
- Ramas `develop` y `main` con branch protection: check requerido = workflow `pr-validate-<comp>`.
- `tools/ci/check-acceptance.js` presente; secretos NO necesarios para GHCR (usa `GITHUB_TOKEN`).

## Escenario 1 — Gate de PR bloquea lo que no cumple (US1 / FR-005/006/017)

1. Crear `feature/x`, introducir un fallo en **backend** (p. ej. test roto **o** secreto en un
   archivo **o** cambio incompatible del contrato).
2. Abrir PR → `develop`.
3. **Esperado**: corre solo `pr-validate-backend`; el gate correspondiente falla; el check
   requerido queda en rojo; **el merge está bloqueado**. `pr-validate-frontend` no se ejecuta
   (aislamiento, US1-AC6/FR-003b).
4. Repetir con una PR limpia ⇒ todos los gates `pass` ⇒ merge permitido.
5. **Fail-closed**: simular indisponibilidad del gate de constitución ⇒ job en fallo, merge
   bloqueado (nunca verde por defecto). (FR-017, SC-007)

## Escenario 2 — Integración a dev, solo el componente cambiado (US2 / FR-007/008)

1. Mergear a `develop` un cambio que solo toca `frontend/**`.
2. **Esperado**: `develop-frontend` construye imagen `fieldops-front:sha-<gitsha>`, la publica en
   GHCR y la despliega en `dev`. `develop-backend` no corre. Ni `pre` ni `prod` cambian.

## Escenario 3 — Release y promoción gobernada (US3 / FR-009/010/010b/011)

1. Llevar el cambio a `main`.
2. **Esperado**: se calcula SemVer (Conventional Commits), se publica **GitHub Release** con
   assets, y se despliega automáticamente en `pre` **solo** el componente afectado (FR-010b).
3. Intentar promover a `prod` sin aprobación ⇒ **no** se despliega.
4. Aprobar como reviewer del environment `prod` ⇒ se despliega en `prod`.

## Escenario 4 — Inmutabilidad build-once (US4 / FR-012/013)

1. Anotar el `ref` (tag/digest) publicado tras CI.
2. Comprobar que dev, pre y prod despliegan **el mismo** `ref` (mismo digest), sin reconstrucción.

## Escenario 5 — Reversión gobernada (US5 / FR-014/016)

1. Forzar un fallo de despliegue en `dev` o `pre`.
2. Ejecutar el `workflow_dispatch` de rollback del componente ⇒ redepliega el último tag estable
   (mismo `ref`, sin rebuild); el run queda registrado (actor/from/to).
3. Rollback en `prod` sin aprobación ⇒ impedido (FR-016).

## Comandos locales de apoyo

```bash
npm test            # lint + unit (front+back) — mismo gate FR-005a
npx spectral lint contracts/openapi.yaml     # gate FR-005c (equivalente local)
```

## Criterios de éxito verificados

SC-001 (100% integraciones pasan gates), SC-002 (100% prod con aprobación), SC-003 (mismo artefacto
en todos los entornos), SC-004 (aislamiento por componente), SC-005 (versión visible por entorno),
SC-006 (rollback sin rebuild), SC-007 (gate IA fail-closed).
