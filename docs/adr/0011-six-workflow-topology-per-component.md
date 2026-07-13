# ADR-0011: Topología de 6 workflows GitHub Actions, uno por (componente × etapa)

- **Estado**: Accepted
- **Fecha**: 2026-07-13
- **Decisores**: equipo FieldOps (usuario) + agente `architect`
- **Principios de constitución**: I, II, III, IV, V (`.specify/memory/pipeline-constitution.md` v1.1.0)
- **Spec/Feature relacionada**: `specs/002-cicd-pipeline/pipeline-specify.md` — FR-001…FR-010b
- **Supersede a**: —

## Contexto y problema

El repositorio opera con exactamente tres tipos de rama (`feature/*`, `develop`, `main` —
Principio I) y trata frontend y backend como componentes independientes, cada uno con su propio
pipeline (Principio II). Cada etapa del flujo (PR a `develop`, merge a `develop`, push a `main`)
tiene un comportamiento distinto y no negociable: puertas de calidad (Principio III), build
snapshot + deploy a `dev` (Principio IV), o build SemVer + release + deploy a `pre`/`prod`
(Principio V). Hoy existe un único `.github/workflows/ci.yml` que mezcla estas etapas y no
distingue componente ni rama `develop`, lo que no permite expresar el aislamiento de componentes ni
las reglas de despliegue por etapa (FR-003, FR-003b, FR-008).

## Decisión

Se adoptan **exactamente 6 workflows de GitHub Actions**, resultado de cruzar 2 componentes
(frontend, backend) × 3 etapas (PR-validate, develop, main):

`pr-validate-frontend.yml`, `pr-validate-backend.yml`, `develop-frontend.yml`,
`develop-backend.yml`, `main-frontend.yml`, `main-backend.yml`.

Cada workflow es autónomo: no invoca ni depende de la ejecución de otro workflow (sin
`workflow_call` entre componentes), y cada uno filtra su propio disparo por rutas del componente
(ver ADR-0013).

## Justificación (apoyada en la constitución)

- **Principio II (Independencia de componentes)**: un workflow por componente, sin orquestación
  cruzada, hace la independencia estructural y verificable, no una convención — "un cambio que solo
  toca el frontend NO dispara ninguna ejecución del backend" se cumple porque no existe ni siquiera
  el *archivo* de workflow que podría dispararse.
- **Principio III/IV/V**: cada etapa (PR, develop, main) tiene reglas de gate/build/deploy
  distintas e innegociables; separar por etapa evita condicionales complejos dentro de un único
  workflow gigante que tendría que "adivinar" en qué etapa está (Principio II — Simplicidad y
  YAGNI de `constitution.md`: un job condicional gigante es más complejo que 3 workflows simples).
- **Principio IV (`constitution.md`) — Simplicidad**: 6 workflows pequeños y de responsabilidad
  única son más fáciles de razonar, testear y modificar de forma aislada que 1-2 workflows con
  lógica condicional por rama y por componente.

## Consecuencias

- **Positivas**: cada workflow es legible y auditable de un vistazo; el fallo de un componente
  nunca bloquea al otro (FR-004); añadir un tercer componente en el futuro es "copiar 3
  workflows", no reescribir uno monolítico.
- **Negativas / coste**: hay algo de duplicación entre `pr-validate-frontend.yml` y
  `pr-validate-backend.yml` (p. ej. el job de revisión de constitución aparece en ambos). Se acepta
  como coste menor frente a la simplicidad de lectura (Principio II, `constitution.md`); si la
  duplicación crece, se podría extraer a un *reusable workflow* (`workflow_call`) común de gates
  compartidos — no se hace ahora por YAGNI.
- **Riesgos y mitigaciones**: 6 workflows implican 6 puntos de configuración de secretos/permisos;
  se mitiga fijando en todos el mismo patrón de permisos mínimos (`packages: write` solo en
  develop-*/main-*, no en pr-validate-*).

## Alternativas consideradas

- **Un único workflow con `if:` condicionales por rama/componente/etapa** — descartado: viola
  Principio II (`constitution.md`, Simplicidad) al concentrar toda la lógica de ramificación en un
  archivo, y dificulta verificar visualmente que un cambio de frontend nunca ejecuta pasos de
  backend (Principio II, pipeline-constitution).
- **2 workflows (uno por componente) con `if:` por etapa dentro de cada uno** — descartado: cada
  etapa tiene triggers de GitHub Actions distintos (`pull_request` vs `push`) y permisos distintos
  (`packages: write` no debería existir en el workflow de PR-validate); mezclarlos en un solo
  archivo por componente reintroduce condicionales de etapa sin necesidad.
