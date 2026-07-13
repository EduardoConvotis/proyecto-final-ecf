# ADR-0013: Detección de cambios por rutas y ejecución en paralelo de componentes

- **Estado**: Accepted
- **Fecha**: 2026-07-13
- **Decisores**: equipo FieldOps (usuario) + agente `architect`
- **Principios de constitución**: II (`.specify/memory/pipeline-constitution.md` v1.1.0)
- **Spec/Feature relacionada**: `specs/002-cicd-pipeline/pipeline-specify.md` — FR-002, FR-003,
  FR-003b, FR-004
- **Supersede a**: —

## Contexto y problema

El Principio II exige que la detección de cambios sea "explícita y verificable (basada en las
rutas modificadas), no en convenciones implícitas", y que un cambio que solo toca un componente no
dispare ninguna ejecución del otro (FR-003b), mientras que un cambio que toca ambos dispare ambos
pipelines en paralelo, sin dependencia de orden (FR-004). Con 6 workflows independientes (ADR-0011)
hace falta un mecanismo concreto y uniforme para decidir, dentro de cada workflow, si sus jobs
posteriores (gates, build, deploy) deben ejecutarse.

## Decisión

Cada uno de los 6 workflows filtra su propio disparo mediante `paths` a nivel de trigger de GitHub
Actions (`on.pull_request.paths` / `on.push.paths`), usando los siguientes conjuntos de rutas:

- Frontend (`pr-validate-frontend.yml`, `develop-frontend.yml`, `main-frontend.yml`):
  `frontend/**`, `contracts/openapi.yaml`.
- Backend (`pr-validate-backend.yml`, `develop-backend.yml`, `main-backend.yml`): `backend/**`,
  `contracts/openapi.yaml`.

`contracts/openapi.yaml` se declara como ruta **compartida** en ambos conjuntos: al ser la única
fuente de verdad del contrato (Principio VII, `constitution.md`) y consumirla ambos componentes
(codegen de tipos en frontend, validación de esquema en backend), un cambio que solo toca el
contrato debe considerarse un cambio que afecta a ambos componentes — esto realiza FR-004 también
para el caso "solo cambia el contrato".

Un cambio que no toca ninguna de las rutas anteriores (p. ej. solo `docs/**` o `specs/**`) no
dispara ningún workflow de build/deploy — realiza FR-003/FR-003b/el escenario 6 de US1 (cambio que
solo toca documentación).

## Justificación (apoyada en la constitución)

- **Principio II — "detección explícita y verificable, no convenciones implícitas"**: el filtro
  `paths` de GitHub Actions es una condición declarativa, versionada en el propio YAML del
  workflow, e inspeccionable sin ejecutar nada — es la forma más directa de cumplir "verificable"
  sin construir un mecanismo propio de detección de cambios (Principio II de `constitution.md`,
  Simplicidad/YAGNI: se usa la primitiva nativa de la plataforma, no una herramienta añadida).
- **Paralelismo real (FR-004)**: al ser 6 workflows independientes (ADR-0011) sin
  `workflow_call`/dependencias entre sí, cuando ambos conjuntos de rutas coinciden en una misma PR,
  GitHub Actions arranca ambos workflows de forma nativamente paralela — no hace falta orquestación
  adicional para lograr "en paralelo e independientemente".

## Consecuencias

- **Positivas**: el comportamiento de aislamiento es auditable leyendo el `on:` de cada workflow,
  sin necesitar entender lógica de scripting; cero coste de mantenimiento de una herramienta de
  detección de cambios de terceros.
- **Negativas / coste**: los filtros `paths` de GitHub Actions operan sobre el *disparo* del
  workflow completo, no sobre jobs individuales dentro de un mismo workflow — esto es coherente con
  la topología de 6 workflows (ADR-0011) pero exigiría reconsiderarse si en el futuro se
  consolidaran etapas en un único workflow por componente.
- **Riesgos y mitigaciones**:
  - *Riesgo*: los `required status checks` de branch protection (que bloquean el merge, FR-006)
    deben marcarse como "requeridos" en GitHub para los jobs de `pr-validate-frontend.yml` /
    `pr-validate-backend.yml`; si el workflow no se dispara (porque no cambió ninguna ruta del
    componente), GitHub por defecto considera el check ausente, no fallido, lo que podría
    interpretarse como "aprobado" en checks no marcados como obligatorios para ese path. *Mitigación*
    (a validar en el plan): configurar los checks requeridos por componente de forma que un check
    ausente por no-disparo no bloquee el merge cuando el componente no cambió, pero si cambió y el
    workflow no corre (fallo de configuración), sí lo bloquee — este comportamiento fino de GitHub
    branch protection se verifica en `/speckit-plan`/tasks, no se resuelve en esta ADR.

## Alternativas consideradas

- **Un job inicial de "change detection" con una acción de terceros (p. ej.
  `dorny/paths-filter`) que produce outputs consumidos condicionalmente por jobs posteriores
  dentro de un único workflow** — descartado como base de la topología: reintroduce la necesidad de
  condicionales de job (`if:`) para lograr lo que el propio `on.paths` de GitHub ya ofrece de forma
  nativa a nivel de disparo de workflow completo (Principio II, `constitution.md`); no se descarta
  su uso *dentro* de un workflow si en el futuro hiciera falta granularidad de job a job, pero no es
  necesario para el diseño actual de 6 workflows.
- **Detectar cambios comparando `git diff` manualmente en un script propio** — descartado por
  Principio II de `constitution.md` (Simplicidad): reinventa lo que la primitiva `paths` de GitHub
  Actions ya resuelve.
