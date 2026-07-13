# ADR-0015: Gate de revisión de constitución fail-closed vía Claude Code Action

- **Estado**: Accepted
- **Fecha**: 2026-07-13
- **Decisores**: equipo FieldOps (usuario) + agente `architect`
- **Principios de constitución**: III, VII (`.specify/memory/pipeline-constitution.md` v1.1.0)
- **Spec/Feature relacionada**: `specs/002-cicd-pipeline/pipeline-specify.md` — FR-005(h), FR-017
- **Supersede a**: —

## Contexto y problema

El Principio III exige, entre las puertas obligatorias de toda PR a `develop`, una "revisión de
cumplimiento de la constitución mediante la llamada a la API del agente". FR-017 endurece esto: si
el agente no puede determinar con evidencia suficiente si la PR cumple, el gate MUST tratarse como
**fallo** (fail-closed), nunca como aprobación implícita — el propio SC-007 de la spec fija esto
como criterio medible ("nunca aprueba por defecto ante evidencia insuficiente"). Hace falta decidir
qué herramienta concreta ejecuta esta puerta y cómo se garantiza el comportamiento fail-closed a
nivel de configuración de CI (no solo de intención).

## Decisión

El gate de "revisión de constitución" se implementa como un job dedicado, presente en ambos
workflows PR-validator (`pr-validate-frontend.yml`, `pr-validate-backend.yml`), que invoca la
**Claude Code Action** de GitHub Actions para evaluar el diff de la PR contra los documentos de
constitución del repositorio. El job:

- Se configura para que **cualquier** resultado que no sea un "cumple" explícito y con evidencia —
  incluyendo error de la acción, timeout, respuesta ambigua o ausencia de veredicto — haga que el
  **paso/job termine en fallo** (exit code distinto de 0 / `conclusion: failure`), nunca en éxito.
  No existe una rama de "si no se puede evaluar, se aprueba por defecto".
- Se declara como parte de los *required status checks* de la branch protection de `develop`
  (mismo mecanismo que el resto de gates de FR-005/FR-006): si el job no reporta éxito explícito, el
  merge queda bloqueado (FR-006).
- El alcance exacto de "constitución del sistema" a evaluar (qué documento(s) de
  `.specify/memory/`) queda como pregunta abierta explícita para `/speckit-plan` (ver
  `docs/architecture.md` §7.7) — se asume, sin confirmar, que son
  `.specify/memory/constitution.md` + `.specify/memory/pipeline-constitution.md`.

## Justificación (apoyada en la constitución)

- **Principio III (pipeline-constitution)**: fija la herramienta ("API del agente") de forma
  genérica; el usuario ya concretó la herramienta (Claude Code Action) para esta arquitectura, y
  este ADR documenta esa elección y sus consecuencias operativas.
- **FR-017 / fail-closed**: la garantía "no aprobado por defecto" solo es verificable si el
  contrato del job es "todo lo que no sea un pase explícito es fallo" — esto se traduce
  directamente en la semántica de exit code de un job de GitHub Actions (un job sin `conclusion:
  success` bloquea el *required status check*), sin necesitar lógica adicional de "interpretación"
  del resultado en otro sitio.
- **Principio VII (pipeline-constitution) — Verificabilidad previa**: este ADR convierte el
  requisito "fail-closed" en un criterio verificable *antes* de escribir el YAML: el job debe
  demostrarse (con un caso de prueba deliberadamente ambiguo/erróneo) que termina en fallo, no en
  éxito — esta verificación es una tarea a incluir en `/speckit-tasks`, no se implementa aquí.

## Consecuencias

- **Positivas**: el comportamiento de seguridad (fail-closed) queda anclado en la semántica nativa
  de GitHub Actions (job status), auditable y sin lógica de interpretación adicional que pueda
  desviarse con el tiempo.
- **Negativas / coste**: depende de la disponibilidad y latencia de la Claude Code Action; un fallo
  transitorio de la propia acción (p. ej. rate limit) bloqueará el merge igual que un
  incumplimiento real de constitución — es la consecuencia directa y deseada de fail-closed
  (Principio VII), pero implica que la disponibilidad de la acción se vuelve parte del *lead time*
  de todo merge a `develop`.
- **Riesgos y mitigaciones**:
  - *Riesgo*: falsos positivos de fallo (la acción falla por causas ajenas al cumplimiento real)
    generan fricción y podrían tentar a introducir un bypass — expresamente prohibido por Principio
    III ("no existe mecanismo de bypass manual sin enmienda de esta constitución"). *Mitigación*: no
    se introduce bypass; cualquier fricción sistemática se resuelve mejorando la fiabilidad de la
    acción/su prompt, no relajando el gate.
  - *Riesgo*: el alcance de qué documentos de constitución evalúa el agente no está confirmado
    (pregunta abierta, spec Q4). *Mitigación*: se dejará explícito como decisión a confirmar en
    `/speckit-plan` antes de escribir el YAML (Principio VII).

## Alternativas consideradas

- **Revisión humana obligatoria en vez de agente** — descartada: la propia constitución de pipeline
  fija la "API del agente" como mecanismo del Principio III; una revisión humana ya existe como
  placeholder separado (el job "code-review-recorded" dummy) y no sustituye este gate.
- **Gate "best-effort" que aprueba si el agente no responde a tiempo** — descartada explícitamente:
  contradice FR-017 y SC-007 de forma directa (aprobación implícita ante evidencia insuficiente).
