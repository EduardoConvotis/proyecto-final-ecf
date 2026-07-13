# Feature Specification: Flujo de CI/CD gobernado para FieldOps

**Feature Branch**: `002-cicd-pipeline`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "Necesitamos ordenar cómo fluye el código de FieldOps desde el desarrollo hasta producción. [...] Necesito que quien monte esto entienda el requisito y lo convierta en algo verificable antes de escribir una línea de configuración."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ningún cambio sin verificar entra en la línea de integración (Priority: P1)

Una persona desarrolladora abre una pull request de su rama de feature hacia `develop`. Antes
de poder integrarse, el cambio debe superar una batería completa de validaciones automáticas
del componente afectado. Si alguna falla, el merge queda bloqueado hasta que se corrija.

**Why this priority**: Es el corazón del objetivo: "cada uno hace lo que quiere y no sabemos
qué hay desplegado" se resuelve garantizando que **solo lo verificado** entra en la línea de
integración. Sin esta puerta, el resto del flujo hereda cambios no fiables.

**Independent Test**: Se prueba abriendo una PR con un fallo introducido a propósito (p. ej. un
test roto, un secreto filtrado o un cambio incompatible de contrato) y comprobando que el merge
queda bloqueado; y abriendo una PR limpia y comprobando que se permite integrarla.

**Acceptance Scenarios**:

1. **Given** una PR de `feature/*` → `develop` que solo modifica un componente, **When** se
   ejecutan las validaciones, **Then** se ejecutan únicamente las del componente modificado.
2. **Given** una PR cuyo lint, tests, validación de contrato, detección de breaking changes,
   escaneo de secretos, verificación de acceptance criteria, análisis de vulnerabilidades de
   imagen o revisión de constitución **falla**, **When** se intenta mergear, **Then** el merge
   queda bloqueado y no puede completarse.
3. **Given** una PR en la que **todas** las validaciones pasan, **When** se solicita el merge,
   **Then** el merge se permite.
4. **Given** una PR que modifica **ambos** componentes, **When** se ejecutan las validaciones,
   **Then** los pipelines de frontend y backend se ejecutan en paralelo e independientemente y
   ambos deben pasar para permitir el merge. *(FR-004)*
5. **Given** un intento de crear/usar una rama de larga vida distinta de `feature/*`, `develop` o
   `main`, **When** se intenta integrarla al flujo, **Then** el sistema no la reconoce como línea
   válida del modelo de ramas y no la admite. *(FR-001)*
6. **Given** una PR que solo toca documentación (ninguna ruta de componente reconocida cambia),
   **When** se ejecuta el pipeline, **Then** no se dispara build ni despliegue de ningún componente.
   *(FR-003, FR-003b)*
7. **Given** un gate fallido, **When** alguien intenta forzar/omitir manualmente esa validación,
   **Then** el sistema no ofrece ninguna vía de bypass y el merge permanece bloqueado. *(FR-006)*
8. **Given** una PR en revisión, **When** el agente de constitución no puede determinar con
   evidencia suficiente si cumple, **Then** el gate se marca como fallido (fail-closed) y el merge
   queda bloqueado, nunca aprobado por defecto. *(FR-017)*

---

### User Story 2 - Integración continua desplegada solo en dev (Priority: P2)

Cuando una PR se integra en `develop`, el sistema construye automáticamente una versión snapshot
del componente que cambió y la despliega, sin intervención, únicamente en el entorno `dev`.

**Why this priority**: Da retroalimentación inmediata sobre lo integrado y hace visible "qué hay
en dev" en todo momento, sin arriesgar otros entornos. Depende de que la puerta P1 garantice la
calidad de lo integrado.

**Independent Test**: Se integra un cambio en `develop` y se verifica que aparece una nueva
snapshot desplegada en `dev` del componente cambiado, y que ni `pre` ni `prod` se ven alterados.

**Acceptance Scenarios**:

1. **Given** un merge a `develop` que afecta a un solo componente, **When** finaliza el merge,
   **Then** se construye una snapshot solo de ese componente y se despliega automáticamente en
   `dev`.
2. **Given** un merge a `develop`, **When** se realiza el despliegue, **Then** ningún entorno
   distinto de `dev` resulta afectado.

---

### User Story 3 - Release final y promoción gobernada a producción (Priority: P3)

Cuando un cambio llega a `main`, se considera versión final: se construye con versión SemVer
limpia, se publica como release en GitHub con sus artefactos y se despliega automáticamente en
`pre`. El paso de `pre` a `prod` exige una aprobación manual explícita.

**Why this priority**: Formaliza la salida a producción con trazabilidad de releases y control
humano del último paso. Se apoya en las historias anteriores (lo que llega a `main` ya pasó las
puertas y estuvo en dev/pre).

**Independent Test**: Se lleva un cambio a `main` y se verifica: (a) release publicada en GitHub
con artefactos y versión SemVer, (b) despliegue automático en `pre`, (c) que `prod` no se
despliega hasta que una persona del equipo lo aprueba explícitamente.

**Acceptance Scenarios**:

1. **Given** un cambio en `main`, **When** se procesa, **Then** se genera una versión SemVer
   limpia, se publica una release en GitHub con los artefactos de build y se despliega
   automáticamente en `pre`.
2. **Given** un release desplegado en `pre`, **When** no existe aprobación manual, **Then** el
   despliegue a `prod` no ocurre.
3. **Given** un release en `pre`, **When** un miembro del equipo autoriza explícitamente el paso
   a producción, **Then** se despliega en `prod`.
4. **Given** un release de `main` que solo afectó a un componente, **When** se despliega en `pre`,
   **Then** solo se redespliega ese componente (por su artefacto inmutable) y los componentes no
   modificados permanecen intactos. *(FR-010b)*

---

### User Story 4 - Lo que pasó CI es lo que llega a producción (Priority: P3)

Las imágenes de contenedor se publican en un registro centralizado una vez superada la CI. Los
despliegues posteriores reutilizan exactamente esa imagen, sin reconstruirla, en cualquier
entorno.

**Why this priority**: Garantiza la integridad de la cadena: elimina la deriva entre lo validado
y lo desplegado. Es transversal a las historias 2 y 3.

**Independent Test**: Se identifica el artefacto (por referencia/tag) publicado tras CI y se
verifica que el mismo artefacto es el desplegado en dev, pre y prod, sin reconstrucción
intermedia.

**Acceptance Scenarios**:

1. **Given** una imagen que superó CI y se publicó en el registro, **When** se ejecuta un
   despliegue a cualquier entorno, **Then** se usa esa misma imagen por referencia y no se
   reconstruye.
2. **Given** un despliegue a `prod`, **When** se compara el artefacto desplegado con el que
   superó CI, **Then** son idénticos (misma referencia/tag).

---

### User Story 5 - Reversión gobernada ante fallos (Priority: P3)

Cuando un despliegue automático falla en `dev` o `pre`, o cuando hay que revertir producción, el
equipo puede volver al último artefacto estable conocido reutilizando la imagen ya publicada, de
forma trazable y —para `prod`— con la misma aprobación que un despliegue.

**Why this priority**: Acota el impacto de un fallo sin romper la inmutabilidad ni la garantía de
que solo lo verificado llega a los entornos. Depende de US4 (artefactos inmutables en el registro).

**Independent Test**: Se fuerza un fallo de despliegue en `dev`/`pre` y se verifica que el sistema
permite revertir al artefacto estable anterior (misma referencia, sin reconstruir) y que la
reversión queda registrada; para `prod`, que sin aprobación no se puede revertir.

**Acceptance Scenarios**:

1. **Given** un despliegue automático fallido en `dev` o `pre`, **When** se dispara la reversión,
   **Then** el sistema redepliega el último artefacto estable conocido por referencia, sin
   reconstruirlo, y registra qué versión se revierte, a cuál se vuelve y quién autoriza. *(FR-014)*
2. **Given** un intento de rollback en `prod`, **When** no existe aprobación manual explícita,
   **Then** el sistema impide la reversión. *(FR-016)*

---

### Edge Cases

- **PR que toca frontend y backend a la vez**: ambos pipelines corren en paralelo; el merge se
  bloquea si cualquiera de los dos falla (FR-004, US1-AC4).
- **Fallo de un despliegue automático en dev o pre**: reversión al último artefacto estable
  conocido, de forma trazable (FR-014, US5-AC1).
- **Intento de saltarse un gate**: no existe vía de bypass manual de las validaciones de PR
  (FR-006, US1-AC7).
- **Agente de constitución sin evidencia suficiente**: el gate falla en cerrado (fail-closed), no
  aprueba por defecto (FR-017, US1-AC8).
- **Intento de desplegar/revertir prod sin aprobación**: el sistema lo impide (FR-011/US3-AC2;
  FR-016/US5-AC2).
- **Cambio que no toca ningún componente reconocido** (p. ej. solo documentación): no dispara
  builds/despliegues de componentes (FR-003/FR-003b, US1-AC6).
- **Reejecución de un deploy**: reutiliza la imagen ya publicada, nunca reconstruye (FR-012,
  US4-AC1).

## Requirements *(mandatory)*

### Functional Requirements

Cada requisito cita el principio de `pipeline-constitution.md` (v1.1.0) que sostiene, y cuando
procede el de `constitution.md` (v1.2.0).

- **FR-001**: El sistema MUST admitir exactamente tres tipos de rama —ramas de feature (trabajo
  diario), `develop` (integración continua) y `main` (producción)— y MUST NOT permitir otras ramas
  de larga vida. *(Principio I, pipeline-constitution)*
- **FR-002**: El sistema MUST tratar frontend y backend como componentes independientes, cada uno
  con su propio pipeline de CI/CD. *(Principio II, pipeline-constitution)*
- **FR-003**: Cuando se recibe un cambio, el sistema MUST determinar qué componente(s) han cambiado
  y MUST ejecutar únicamente los pasos del/de los componente(s) afectado(s). *(Principio II)*
- **FR-003b**: Si un cambio afecta solo a un componente, entonces el sistema MUST NOT ejecutar el
  pipeline del otro componente. *(Principio II)*
- **FR-004**: Cuando un cambio afecta a ambos componentes, el sistema MUST ejecutar sus pipelines
  en paralelo e independientemente, y ambos MUST aprobarse para permitir el avance. *(Principio II)*
- **FR-005**: Cuando una PR de `feature/*` se dirige a `develop`, el sistema MUST ejecutar sobre el
  componente afectado todos los gates siguientes: (a) lint, (b) tests, (c) validación del contrato
  OpenAPI, (d) detección de breaking changes del contrato, (e) escaneo de secretos, (f)
  verificación de acceptance criteria contra la API, (g) análisis de vulnerabilidades de la imagen,
  (h) revisión automatizada del cumplimiento de la constitución del sistema mediante un agente.
  *(Principio III, pipeline-constitution; contrato OpenAPI → Principio VII de constitution.md)*
- **FR-006**: Si cualquier gate de FR-005 falla, entonces el sistema MUST bloquear el merge; ningún
  gate es opcional y el sistema MUST NOT ofrecer ninguna vía de bypass manual. *(Principio III)*
- **FR-007**: Cuando una PR se integra en `develop`, el sistema MUST construir automáticamente una
  versión snapshot solo del componente que cambió, identificada de forma única y trazable por el
  **SHA del commit**. *(Principio IV)*
- **FR-008**: El sistema MUST desplegar la snapshot de FR-007 automática y exclusivamente en el
  entorno `dev`. Si se completa ese despliegue, el sistema MUST NOT desplegar en ningún otro
  entorno como consecuencia del mismo evento. *(Principio IV)*
- **FR-009**: Cuando un cambio llega a `main`, el sistema MUST construir una versión final con
  numeración SemVer limpia (no snapshot) del/de los componente(s) afectado(s). *(Principio V,
  pipeline-constitution; SemVer → Principio VI de constitution.md)*
- **FR-010**: Cuando un cambio llega a `main`, el sistema MUST publicar una release en GitHub
  adjuntando los artefactos de build y MUST desplegar automáticamente en el entorno `pre`.
  *(Principio V)*
- **FR-010b**: Cuando se despliega en `pre`, el sistema MUST desplegar únicamente el/los
  componente(s) afectado(s) por el cambio, reutilizando su artefacto inmutable, y MUST NOT
  redesplegar componentes no modificados. *(Principio II + Principio VI — aislamiento por
  componente extendido a `pre`)*
- **FR-011**: Si no existe una aprobación manual explícita de un miembro del equipo, entonces el
  sistema MUST impedir el despliegue a `prod`. *(Principio V)*
- **FR-012**: El sistema MUST publicar cada imagen de contenedor en un registro centralizado tras
  superar la CI, y MUST reutilizar esa misma imagen por referencia —sin reconstruirla— en cada
  despliegue posterior a cualquier entorno. *(Principio VI)*
- **FR-013**: El sistema MUST garantizar que el artefacto desplegado en `prod` sea idéntico (misma
  referencia) al que superó la CI. *(Principio VI)*
- **FR-014**: Si un despliegue automático en `dev` o `pre` falla, entonces el sistema MUST permitir
  la reversión al último artefacto estable conocido, reutilizando el artefacto inmutable del
  registro y de forma trazable (qué versión se revierte, a cuál se vuelve y quién autoriza).
  *(Principio VIII)*
- **FR-016**: Si se intenta un rollback a `prod` sin una aprobación manual explícita, entonces el
  sistema MUST impedirlo. *(Principio VIII; misma autorización que FR-011)*
- **FR-017**: Si el agente de revisión de constitución (gate FR-005h) no puede determinar con
  evidencia suficiente si la PR cumple, entonces el sistema MUST tratarlo como fallo del gate
  (*fail-closed*) y MUST NOT interpretarlo como aprobación implícita. *(Principio III; verificabilidad
  → Principio VII de pipeline-constitution)*

> **Restricción de proceso (no funcional)** — Cada requisito debe expresarse como criterios de
> aceptación verificables antes de traducirse a configuración de pipeline; esta especificación no
> prescribe sintaxis de configuración concreta. *(Principio VII, pipeline-constitution — Verificabilidad
> Previa.)* Es una regla sobre cómo se autoría el trabajo, no un comportamiento del sistema, por lo
> que se registra como restricción y no como FR con escenario de aceptación.

### Key Entities *(include if feature involves data)*

- **Componente**: unidad desplegable independiente del monorepo (frontend o backend), con su
  propio pipeline, artefacto y versión.
- **Pull Request**: solicitud de integración de `feature/*` en `develop`; portadora del conjunto
  de resultados de los gates.
- **Artefacto / Imagen**: unidad construida y publicada en el registro central; se identifica por
  referencia/tag y es inmutable a lo largo de los entornos.
- **Release**: versión final asociada a `main`, con numeración SemVer y artefactos publicados en
  GitHub.
- **Entorno**: destino de despliegue (`dev`, `pre`, `prod`) con reglas de promoción distintas.
- **Aprobación de producción**: acto explícito y trazable que habilita el despliegue a `prod`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las integraciones en `develop` proceden de una PR que superó todos los
  gates; ninguna integración omite validaciones.
- **SC-002**: El 100% de los despliegues a `prod` cuentan con una aprobación manual explícita
  registrada.
- **SC-003**: El 100% de los despliegues (dev, pre, prod) usan un artefacto idéntico al que superó
  la CI; cero reconstrucciones entre entornos.
- **SC-004**: Un cambio que afecta a un solo componente no dispara ejecución del otro en el 100% de
  los casos.
- **SC-005**: En cualquier momento se puede identificar de forma inequívoca qué versión está
  desplegada en cada entorno (dev, pre, prod).
- **SC-006**: Ante un fallo de despliegue en dev o pre, el equipo puede revertir al último estado
  estable conocido sin reconstruir artefactos.
- **SC-007**: El gate de revisión de constitución nunca aprueba una PR por defecto ante evidencia
  insuficiente; en el 100% de esos casos el resultado es "fallo" (fail-closed). El umbral de
  precisión concreto (p. ej. 0 falsos negativos sobre un conjunto de golden cases) se fija en
  planificación junto al contrato y las evals del agente.

## Assumptions

Estas asunciones se derivan de la constitución de pipeline ya ratificada
(`.specify/memory/pipeline-constitution.md` v1.1.0) y de defaults razonables; sustituyen a
varias de las preguntas diferidas por el normalizador cuando ya existe decisión:

- **Versionado en `main`**: numeración SemVer por componente, derivada automáticamente de
  Conventional Commits (decisión de la constitución v1.1.0). [resuelve Q7]
- **Aprobación a `prod`**: durante la fase de prueba actual, cualquier miembro del equipo puede
  aprobar; el rol concreto se endurecerá más adelante. [resuelve Q5]
- **Rollback**: existe política de reversión al último artefacto estable conocido, reutilizando el
  artefacto inmutable del registro (Principio VIII de la constitución). [resuelve Q9]
- **Aislamiento por componente en `pre`**: mejor práctica adoptada — `pre` respeta el aislamiento
  por componente; solo se redespliega el componente cambiado, reutilizando su artefacto inmutable
  (FR-010b, US3-AC4). [resuelve Q8]
- **Herramientas de gate**: la especificación describe los gates por su función; las herramientas
  concretas se fijan en la fase de planificación y no en esta spec, para no atar el requisito a una
  herramienta (coherente con la Restricción de proceso y la constitución). Selecciones ya conocidas
  por el equipo: contrato/acceptance criteria → **Spectral**; breaking changes → oasdiff; secretos
  → Gitleaks; vulnerabilidades de imagen → Trivy.
- **Empaquetado (frontend y backend)**: ambos componentes se empaquetan como **imágenes de
  contenedor** publicadas en **GHCR** (GitHub Container Registry). El registro es
  `ghcr.io/<org-o-usuario>/<repo>/fieldops-<componente>:<version>` (p. ej.
  `fieldops-back`, `fieldops-front`). El push se autentica con el `GITHUB_TOKEN` que GitHub inyecta
  automáticamente (sin secretos adicionales) y requiere `permissions: packages: write` en el
  workflow. [resuelve Q1]
- **Fuente de acceptance criteria**: se verifican mediante **Spectral** (reglas contra el contrato
  OpenAPI / la API). [resuelve Q3]
- **Esquema de versión snapshot en dev**: **SHA del commit** como identificador único y trazable
  (FR-007). [resuelve Q6]
- **"Constitución del sistema" validada por el agente (Q4 — sin confirmar)**: se ASUME que son los
  documentos de constitución del repositorio en `.specify/memory/` (`constitution.md` y, para este
  flujo, `pipeline-constitution.md`). Pendiente de confirmación explícita del usuario; afecta al
  contrato del gate por IA (FR-005h/FR-017), a resolver en `/speckit-plan`.
