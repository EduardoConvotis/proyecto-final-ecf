# ADR-0014: Modelo de promoción de entornos (dev auto / pre auto / prod manual) y rollback

- **Estado**: Accepted
- **Fecha**: 2026-07-13
- **Decisores**: equipo FieldOps (usuario) + agente `architect`
- **Principios de constitución**: IV, V, VIII (`.specify/memory/pipeline-constitution.md` v1.1.0)
- **Spec/Feature relacionada**: `specs/002-cicd-pipeline/pipeline-specify.md` — FR-008, FR-010,
  FR-010b, FR-011, FR-014, FR-016
- **Supersede a**: —

## Contexto y problema

La constitución de pipeline exige tres reglas de promoción distintas por entorno: `dev` recibe
snapshots automáticamente desde `develop` sin tocar otros entornos (Principio IV, FR-008); `pre`
recibe releases automáticamente desde `main` (Principio V, FR-010), respetando el aislamiento por
componente (FR-010b); `prod` requiere aprobación manual explícita, sin excepción, y hoy (fase de
prueba) cualquier miembro del equipo puede otorgarla (Principio V, FR-011). Además, ante un fallo
post-deploy debe existir una vía de rollback gobernada que reutilice el artefacto inmutable
anterior y quede registrada (Principio VIII, FR-014, FR-016). Hace falta un mecanismo concreto para
materializar "aprobación manual explícita" sin construir un sistema de aprobaciones ad-hoc.

## Decisión

- Se modelan `dev`, `pre` y `prod` como **GitHub Environments** nativos de GitHub Actions:
  - `dev` y `pre`: sin regla de protección — el job de deploy corre automáticamente al completarse
    el build correspondiente (workflow `develop-*` para `dev`; workflow `main-*` para `pre`).
  - `prod`: con regla de protección de **required reviewers** (aprobación manual); durante la fase
    de prueba actual, el grupo de reviewers autorizados es el equipo completo (Principio V,
    Governance de pipeline-constitution — laxitud temporal y documentada como tal).
- El job de deploy a `prod` en `main-frontend.yml`/`main-backend.yml` se declara con
  `environment: prod`, lo que hace que GitHub Actions pause el job hasta que un reviewer autorizado
  lo apruebe explícitamente desde la UI de Actions — sin necesidad de construir un sistema de
  aprobaciones propio.
- **Rollback**: un workflow adicional, disparado manualmente (`workflow_dispatch`) por componente,
  que toma como entrada el tag/versión estable objetivo (existente en GHCR) y redespliega esa misma
  referencia a `dev`/`pre` sin reconstruir. El job de rollback a `prod` usa el mismo
  `environment: prod` (misma aprobación que un deploy normal, Principio VIII). El log del job de
  rollback registra explícitamente: versión que se revierte, versión a la que se vuelve, y quién
  disparó/aprobó la ejecución — GitHub Actions ya deja este rastro en el historial de runs
  (actor + inputs + aprobador del environment), que se usa como registro de auditoría sin construir
  almacenamiento adicional (Principio II, `constitution.md`).

## Justificación (apoyada en la constitución)

- **Principio IV/V**: usar GitHub Environments materializa exactamente la asimetría exigida
  (auto/auto/manual) sin lógica condicional custom de aprobación — un `environment: prod` con
  reviewers es la primitiva nativa para "requiere aprobación manual explícita" (FR-011).
- **Principio VIII**: el rollback reutiliza el artefacto del registro (coherente con ADR-0012,
  build-once) y pasa por la misma puerta de aprobación que un deploy a `prod`, sin necesitar
  reconstrucción ni un sistema de tracking de versiones aparte — el propio historial de ejecuciones
  de GitHub Actions (actor, inputs, entorno con su aprobador) sirve como registro trazable exigido
  por FR-014, evitando construir infraestructura de auditoría redundante (Principio II,
  `constitution.md`).
- **FR-010b** (aislamiento de componente en `pre`): al tener workflows y environments de deploy
  separados por componente (ADR-0011), redesplegar un componente en `pre` nunca toca el artefacto
  del otro componente.

## Consecuencias

- **Positivas**: cero infraestructura de aprobaciones propia; el historial de aprobaciones/rollback
  vive donde ya vive el resto de la trazabilidad de CI (GitHub Actions), sin un sistema paralelo.
- **Negativas / coste**: la política real de "quién puede aprobar prod" depende de configurar
  correctamente los reviewers del Environment `prod` en la configuración del repositorio (fuera del
  YAML de los workflows) — se deja como tarea explícita de configuración, no de código.
- **Riesgos y mitigaciones**:
  - *Riesgo*: la laxitud actual ("cualquier miembro del equipo" aprueba `prod`) es una decisión
    explícitamente temporal de la constitución (Governance, pipeline-constitution v1.1.0); si no se
    revisa, se vuelve permanente por omisión. *Mitigación*: se documenta aquí y en
    `docs/architecture.md` §7.6 como pendiente de endurecimiento futuro, no se resuelve en este ADR.
  - *Riesgo*: un rollback en `dev`/`pre` no pasa por ningún gate de aprobación — coherente con la
    constitución (solo `prod` la exige), pero implica que cualquiera con permisos de Actions puede
    disparar un redeploy a esos entornos. Se acepta porque `dev`/`pre` no son de producción y la
    constitución no exige aprobación ahí.

## Alternativas consideradas

- **Sistema de aprobaciones propio (p. ej. un bot que espera un comentario `/approve` en un
  issue)** — descartado: reinventa lo que GitHub Environments ya ofrece de forma nativa e integrada
  con el resto del pipeline (Principio II, `constitution.md` — Simplicidad/YAGNI).
- **Aprobar `prod` a nivel de Pull Request (un segundo PR de "promoción") en vez de a nivel de
  Environment** — descartado: mezclaría el modelo de ramas (Principio I, pipeline-constitution, solo
  3 tipos de rama) con un mecanismo de aprobación que no encaja en `feature/develop/main`.
