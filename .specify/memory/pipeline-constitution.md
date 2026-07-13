<!--
Sync Impact Report
===================
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — se añade el Principio VIII (Reversión / Rollback) y se resuelven
las cinco preguntas diferidas de la ratificación inicial (paralelismo de componentes,
mecanismo SemVer, autorización a prod, rollback y agnosticismo de herramienta en acceptance
criteria). No hay cambios incompatibles ni redefiniciones de principios existentes.

Constitución SEPARADA que gobierna exclusivamente el flujo de CI/CD de FieldOps. No
modifica ni sustituye la constitución principal del proyecto
(.specify/memory/constitution.md); la complementa.

Fuente: texto normalizado por el agente constitution-author-normalizer
(.specify/memory/constitution-input-normalized.txt). Dominio: ci-cd (primario),
con frontend/backend como componentes.

Principles defined (1.1.0):
  I.    Estrategia de Ramas (feature → develop → main)
  II.   Independencia de Componentes y Change Detection
  III.  Puertas de Calidad en PR a develop — NO NEGOCIABLE
  IV.   Integración Continua y Despliegue a dev
  V.    Release desde main y Promoción Gobernada a Producción
  VI.   Inmutabilidad de Artefactos (build once, promote)
  VII.  Verificabilidad Previa a la Configuración
  VIII. Reversión (Rollback) Gobernada   ← NUEVO en 1.1.0

Added sections: Alcance, Restricciones Técnicas y Herramientas, Flujo y Puertas de
CI/CD, Governance.
Removed sections: none.

History:
  - 1.1.0: añadido Principio VIII (Rollback); resueltas las 5 preguntas diferidas.
  - 1.0.0: ratificación inicial (Principios I–VII).

Templates / artefactos: esta constitución NO altera las plantillas SDD ni la
constitución principal. Los pipelines de GitHub Actions (⚠ pendientes de crear) deberán
implementar y hacer cumplir estos principios.

Decisiones sobre las preguntas diferidas (resueltas por el usuario 2026-07-13):
  - PR que toca front y back a la vez: ambos pipelines corren EN PARALELO (Principio II).
  - Incremento SemVer: versionado independiente por componente, derivado de Conventional
    Commits (Principio V; herramienta de release no fijada, ver Principio VII).
  - Autorización a prod: fase de prueba → cualquier miembro del equipo puede aprobar;
    a endurecer más adelante (Principio V, Governance).
  - Rollback: SÍ hay política de reversión (nuevo Principio VIII).
  - Acceptance criteria: la puerta se mantiene AGNÓSTICA de herramienta en la constitución
    (Principio VII), para no atarla a una herramienta concreta.

RATIFICATION_DATE: 2026-07-13.
-->

# FieldOps CI/CD Pipeline Constitution

Esta constitución gobierna **cómo fluye el código de FieldOps desde el desarrollo hasta
producción**. Define las reglas innegociables del pipeline de integración y despliegue
continuos, y supersede cualquier práctica individual sobre ramas, validaciones, builds o
despliegues. Es un documento **independiente** de la constitución principal del proyecto
(`.specify/memory/constitution.md`), a la que complementa sin sustituir.

## Alcance

Aplica a todo el ciclo de vida del código en el monorepo: estrategia de ramas, puertas de
calidad en pull requests, construcción de artefactos, publicación de releases y despliegue
a los entornos `dev`, `pre` y `prod`. Frontend y backend se tratan como **componentes
independientes**, cada uno con su propio pipeline.

## Core Principles

### I. Estrategia de Ramas

El repositorio opera con **exactamente tres tipos de rama**, sin otras ramas de larga vida:

- `feature/*` — trabajo diario; se abren desde `develop` y se integran vía pull request.
- `develop` — línea de **integración continua**; refleja lo desplegado en el entorno `dev`.
- `main` — código de **producción**; cada estado de `main` corresponde a una versión final.

Reglas innegociables:

- No se permite crear otras ramas de larga vida (p. ej. `release/*`, `hotfix/*` permanentes)
  salvo enmienda de esta constitución.
- Ningún cambio entra en `develop` ni en `main` sin pasar por una pull request (Principio III).

**Rationale**: Un modelo de ramas mínimo y explícito elimina el "cada uno hace lo que
quiere" y hace inequívoco qué hay desplegado en cada entorno.

### II. Independencia de Componentes y Change Detection

Frontend y backend son componentes independientes con pipelines separados. Cada pipeline
DEBE detectar qué componente ha cambiado (detección por rutas del monorepo) y ejecutar
**solo** el pipeline del componente afectado.

Reglas innegociables:

- Un cambio que solo toca el frontend NO dispara ninguna ejecución del backend, y viceversa.
- La detección de cambios es explícita y verificable (basada en las rutas modificadas), no
  en convenciones implícitas.
- Cuando una pull request toca **ambos** componentes, sus dos pipelines se ejecutan **en
  paralelo** e independientemente; cada uno aplica sus propias puertas (Principio III) y no
  hay dependencia de orden ni coordinación entre ellos.

**Rationale**: Ejecutar solo lo que corresponde ahorra tiempo y recursos y evita
despliegues innecesarios de un componente que no ha cambiado.

### III. Puertas de Calidad en PR a develop — NO NEGOCIABLE

Toda pull request de una rama `feature/*` hacia `develop` DEBE superar la batería completa
de validaciones automáticas **del componente modificado** antes de poder mergearse:

- **Lint** del código del componente.
- **Tests** del componente.
- **Validación del contrato OpenAPI** con Spectral.
- **Detección de breaking changes** del contrato con oasdiff.
- **Escaneo de secretos** con Gitleaks.
- **Verificación de acceptance criteria** contra la API.
- **Análisis de vulnerabilidades** de la imagen con Trivy.
- **Revisión de cumplimiento de la constitución** mediante la llamada a la API del agente.

Regla innegociable: si **cualquier** puerta falla, el merge queda **bloqueado**. No existe
mecanismo de bypass manual sin enmienda de esta constitución.

**Rationale**: Las puertas hacen cumplir la calidad de forma automatizada y uniforme, de
modo que lo que entra en `develop` está verificado y es trazable, no fruto de criterio
individual.

### IV. Integración Continua y Despliegue a dev

Cuando un merge a `develop` se completa, el pipeline DEBE, de forma automática y solo para
el componente que ha cambiado:

- Construir una versión **snapshot** del componente.
- Desplegar esa snapshot **únicamente** en el entorno `dev`.

Regla innegociable: un merge a `develop` no despliega en `pre` ni en `prod` bajo ninguna
circunstancia.

**Rationale**: `develop` es la línea de integración; su entorno espejo es `dev`. Acotar el
despliegue a `dev` evita sorpresas en entornos superiores.

### V. Release desde main y Promoción Gobernada a Producción

Cuando un cambio llega a `main` se considera una **versión final**. El pipeline DEBE:

- Construir el artefacto con una versión **SemVer limpia** (no snapshot).
- Publicar una **release en GitHub** con los artefactos de build.
- Desplegar automáticamente en el entorno `pre`.

**Cálculo de la versión** — Al ser un monorepo con componentes independientes, cada
componente se versiona **de forma independiente** (etiquetas por componente, p. ej.
`backend-vX.Y.Z` y `frontend-vX.Y.Z`). El incremento MAJOR/MINOR/PATCH se **deriva
automáticamente** del historial de mensajes de commit siguiendo **Conventional Commits**
(`feat:` → MINOR, `fix:` → PATCH, `feat!:`/`BREAKING CHANGE:` → MAJOR). No se decide la
versión a mano. La herramienta concreta que automatiza este cálculo no se fija aquí
(Principio VII).

La promoción a `prod` está **gobernada**:

- El despliegue a producción REQUIERE **aprobación manual explícita** antes de ejecutarse.
- Ningún despliegue a `prod` puede ocurrir sin esa aprobación.
- **Fase de prueba (actual)**: cualquier miembro del equipo puede otorgar la aprobación.
  Esta laxitud es temporal; el rol/permiso concreto se endurecerá en una enmienda futura
  cuando el pipeline salga de fase de prueba.

**Rationale**: Separar la publicación automática (`pre`) de la promoción aprobada (`prod`)
da trazabilidad de releases y control humano sobre el último paso hacia producción.

### VI. Inmutabilidad de Artefactos (build once, promote)

Las imágenes Docker DEBEN residir en un **registro centralizado**. Una vez que una imagen
pasa CI y se publica en el registro, los jobs de despliegue la usan **tal cual** en todos
los entornos posteriores.

Reglas innegociables:

- El job de deploy **no reconstruye** la imagen; referencia la que pasó CI.
- La imagen desplegada en `prod` es, bit a bit, la misma que superó las puertas de calidad.

**Rationale**: "Lo que pasó CI es lo que llega a producción." Reconstruir por entorno
introduce deriva y anula la garantía que dieron las puertas de calidad.

### VII. Verificabilidad Previa a la Configuración

Antes de escribir una sola línea de configuración de pipeline (YAML u otra), cada requisito
DEBE traducirse en **criterios verificables** que la configuración implementará y que podrán
comprobarse automáticamente.

Regla innegociable: no se acepta configuración de pipeline cuyo comportamiento no pueda
verificarse contra un requisito enunciado previamente.

**Rationale**: Quien monte el pipeline debe entender el requisito y convertirlo en algo
verificable primero; esto evita YAML dictado a ciegas y mantiene la trazabilidad
requisito → verificación → configuración.

### VIII. Reversión (Rollback) Gobernada

Ante un fallo detectado tras un despliegue en `pre` o `prod`, DEBE existir una vía de
reversión rápida a la última versión estable conocida (*last known good*).

Reglas innegociables:

- El rollback **reutiliza el artefacto inmutable** de la versión estable anterior ya
  presente en el registro; **no** se reconstruye ni se reparchea en caliente (coherente con
  el Principio VI).
- El rollback en `prod` está sujeto a la **misma autorización** que un despliegue a `prod`
  (Principio V): requiere aprobación manual explícita (en fase de prueba, cualquier miembro
  del equipo).
- Toda reversión queda **registrada y trazable**: qué versión se revierte, a cuál se vuelve
  y quién la autorizó.
- El rollback restablece un estado ya verificado; no es una vía para desplegar código que
  no ha pasado las puertas del Principio III.

**Rationale**: Poder volver de forma inmediata y auditable a una versión que ya superó CI
acota el impacto de un fallo en producción sin romper la garantía de inmutabilidad ni la de
que solo lo verificado llega a los entornos.

## Restricciones Técnicas y Herramientas

- **Orquestación de CI/CD**: pipelines por componente (frontend, backend), activados por
  detección de cambios en el monorepo.
- **Entornos**: `dev` (desde `develop`), `pre` (desde `main`, automático), `prod` (desde
  `main`, con aprobación manual).
- **Herramientas de puerta obligatorias**: Spectral (lint de OpenAPI), oasdiff (breaking
  changes de contrato), Gitleaks (secretos), Trivy (vulnerabilidades de imagen),
  verificación de acceptance criteria contra la API, y revisión de constitución vía API del
  agente.
- **Artefactos**: imágenes Docker en un registro centralizado; snapshots para `dev`,
  versiones SemVer limpias para releases de `main`.
- **Versionado**: independiente por componente (etiquetas `backend-vX.Y.Z` /
  `frontend-vX.Y.Z`), calculado automáticamente desde **Conventional Commits**. La
  herramienta que automatiza el cálculo/publicación no se fija en la constitución.
- **Releases**: publicadas en GitHub con los artefactos de build.
- **Reversión**: redeploy del artefacto estable anterior desde el registro (Principio VIII).

## Flujo y Puertas de CI/CD

1. Se trabaja en `feature/*` (Principio I).
2. PR de `feature/*` → `develop`: se ejecutan las puertas del componente tocado; si alguna
   falla, no se mergea (Principio III).
3. Merge a `develop` → build snapshot + deploy automático a `dev`, solo del componente
   cambiado (Principios II y IV).
4. Cambio en `main` → build SemVer + release en GitHub + deploy automático a `pre`
   (Principio V).
5. Promoción a `prod` → requiere aprobación manual (en fase de prueba, cualquier miembro
   del equipo) (Principio V).
6. En todo deploy se reutiliza la imagen que pasó CI; no se reconstruye (Principio VI).
7. Ante un fallo post-deploy → reversión al artefacto estable anterior, trazable y con la
   misma autorización que un deploy a `prod` (Principio VIII).

## Governance

Esta constitución de CI/CD supersede cualquier práctica del proyecto sobre ramas,
validaciones, builds y despliegues. Es independiente de la constitución principal
(`.specify/memory/constitution.md`) y no la modifica.

- **Autoridad**: el equipo de FieldOps ratifica y enmienda esta constitución.
- **Enmiendas**: se documentan en este archivo incrementando la versión según SemVer
  (MAJOR: cambios incompatibles de gobernanza o eliminación/redefinición de principios;
  MINOR: nuevo principio o sección; PATCH: aclaraciones y correcciones).
- **Cumplimiento**: las puertas del Principio III (incluida la revisión de constitución vía
  API del agente) hacen cumplir estas reglas en cada pull request. Cualquier desviación se
  justifica o se corrige antes de continuar.
- **Aprobación de producción**: el despliegue a `prod` (y toda reversión en `prod`) requiere
  aprobación manual explícita (Principios V y VIII). Durante la **fase de prueba** actual
  cualquier miembro del equipo puede aprobar; el rol/permiso concreto se restringirá en una
  enmienda futura al salir de fase de prueba.

**Version**: 1.1.0 | **Ratified**: 2026-07-13 | **Last Amended**: 2026-07-13
