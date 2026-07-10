<!--
Sync Impact Report
===================
Version change: 1.1.0 → 1.2.0
Bump rationale: MINOR — se añade un nuevo principio (VIII. Diseño con Tailwind CSS). No hay
cambios incompatibles ni redefiniciones de principios existentes.

Principles defined:
  I.    TypeScript Estricto
  II.   Simplicidad y YAGNI
  III.  Trazabilidad Spec-Driven (SDD)
  IV.   Test-First (TDD) — NO NEGOCIABLE
  V.    Observabilidad
  VI.   Versionado Semántico
  VII.  Contract-First (Contratos en OpenAPI)
  VIII. Diseño con Tailwind CSS   ← NUEVO en 1.2.0

Added sections (1.2.0):
  - Principio VIII (Diseño con Tailwind CSS)
  - Restricciones Técnicas: entrada "Estilos / Diseño" (Tailwind CSS última versión estable)

History:
  - 1.1.0: añadido Principio VII (Contract-First / OpenAPI) + entrada de contratos y puerta
    contract-first en el Flujo de Desarrollo.
  - 1.0.0: ratificación inicial (Principios I–VI).

Removed sections: none.

Templates / artefactos requiring updates:
  ⚠ .specify/memory/traceability.md           — re-generar por el hook after_constitution (constitution-traceability) para trazar LAW-08 (Tailwind)
  ✅ .specify/templates/plan-template.md        — sin cambios de token; Constitution Check cubre principios nuevos genéricamente
  ✅ .specify/templates/spec-template.md        — sin conflictos con el nuevo principio
  ✅ .specify/templates/tasks-template.md        — compatible; las tareas de UI deben respetar el principio de diseño

Follow-up TODOs: regenerar traceability.md.
RATIFICATION_DATE se mantiene 2026-07-10 (no cambia en enmiendas).

Nota sobre tasks-template: la plantilla marca los tests como OPCIONALES; bajo esta
constitución el Principio IV los vuelve OBLIGATORIOS. Los comandos /speckit-tasks e
/speckit-implement DEBEN emitir tareas de test primero para cada feature. No se edita
la plantilla base (guía genérica upstream); la obligatoriedad la impone esta constitución.
-->

# FieldOps Constitution

FieldOps es un monorepo que da soporte a las **operaciones de campo que ejecutan las
aseguradoras**. Esta constitución define las reglas innegociables del proyecto y
supersede cualquier práctica o preferencia individual.

## Core Principles

### I. TypeScript Estricto

Todo el código —frontend y backend— se escribe en TypeScript con el modo `strict`
habilitado (`"strict": true` en cada `tsconfig.json`). El tipo `any` está PROHIBIDO
salvo justificación explícita en el mismo lugar del código mediante un comentario que
explique por qué no existe un tipo mejor. `unknown` con validación se prefiere siempre
sobre `any`. No se permite silenciar el compilador (`@ts-ignore`/`@ts-expect-error`)
sin la misma justificación en línea.

**Rationale**: La seguridad de tipos es la primera línea de defensa contra defectos en
un dominio de seguros donde los datos deben ser correctos. Un `any` no justificado
anula esa garantía de forma silenciosa.

### II. Simplicidad y YAGNI

Se elige siempre la solución más simple que resuelva el requisito actual. No se
introduce arquitectura especulativa, capas de abstracción, patrones o dependencias
para necesidades futuras hipotéticas. Cualquier complejidad añadida (nueva capa,
patrón, servicio o dependencia) DEBE justificarse frente a una alternativa más simple;
si no hay justificación, se rechaza.

**Rationale**: La complejidad es el mayor coste de mantenimiento a largo plazo. YAGNI
mantiene el monorepo comprensible y barato de evolucionar.

### III. Trazabilidad Spec-Driven (SDD)

Todo trabajo fluye por la cadena Spec-Driven: **spec → plan → tasks → código → tests**.
Cada artefacto DEBE poder rastrearse hasta el anterior: las tareas referencian
requisitos de la spec, el código referencia tareas, y los tests referencian el
comportamiento especificado. No se implementa código que no tenga origen en una tarea,
ni tareas que no tengan origen en una spec. La trazabilidad se mantiene explícita y
verificable (identificadores de requisito/tarea presentes en el trabajo entregado).

**Rationale**: La trazabilidad permite auditar por qué existe cada línea de código —
crítico para un producto usado por aseguradoras y base del cumplimiento en cada etapa.

### IV. Test-First (TDD) — NO NEGOCIABLE

El desarrollo dirigido por pruebas es OBLIGATORIO: primero se escribe el test, se
confirma que FALLA, y solo entonces se implementa hasta que pase (Red-Green-Refactor).
Cada parte del flujo SDD debe quedar cubierta por tests con trazabilidad hacia su
requisito/tarea de origen. Los tests de integración NO son obligatorios; el foco es la
cobertura unitaria trazable del comportamiento especificado.

**Rationale**: Escribir el test primero obliga a especificar el comportamiento antes de
codificarlo y garantiza que cada requisito tenga una verificación asociada.

### V. Observabilidad

El logging estructurado (formato clave-valor / JSON, no texto libre) es OBLIGATORIO en
el backend y en cualquier proceso de larga duración. Los logs deben permitir seguir una
operación de campo de extremo a extremo. No se registran secretos ni datos personales
sensibles en claro.

**Rationale**: Sin observabilidad estructurada, diagnosticar incidencias en operaciones
de campo reales es inviable.

### VI. Versionado Semántico

El proyecto y sus paquetes publicables siguen **SemVer (MAJOR.MINOR.PATCH)**:
MAJOR para cambios incompatibles, MINOR para funcionalidad retrocompatible, PATCH para
correcciones. Todo cambio incompatible DEBE reflejarse en un incremento MAJOR y
documentarse.

**Rationale**: SemVer comunica el impacto de cada cambio de forma inequívoca a quienes
consumen el software.

### VII. Contract-First (Contratos en OpenAPI)

Toda API HTTP/REST del sistema —entre el frontend Angular y el backend Express, y hacia
cualquier consumidor externo— se define PRIMERO como un contrato **OpenAPI** (3.1) antes de
implementarse. El documento OpenAPI es la **única fuente de verdad** del contrato: vive
versionado en el repositorio y de él se **derivan** los tipos e interfaces de cliente y de
servidor —no se mantienen tipos divergentes a mano—. Reglas innegociables:

- Ningún endpoint se implementa sin su definición previa en el contrato OpenAPI.
- Ningún cambio de contrato se hace en el código antes que en el documento OpenAPI.
- Cada operación del contrato DEBE trazarse a su requisito (`FR-XXX`) (Principio III).
- La implementación DEBE validarse contra el contrato mediante tests (Principio IV).
- Todo cambio incompatible del contrato (eliminar/renombrar campos, operaciones o cambiar su
  semántica) obliga a un incremento MAJOR y se documenta (Principio VI).

**Rationale**: Con frontend y backend independientes en un dominio de seguros, el contrato
explícito elimina la deriva entre ambos y hace el acoplamiento verificable y auditable.
Encaja con TypeScript estricto (tipos generados desde el contrato) y con la trazabilidad SDD
(cada operación del API nace de un requisito), reforzando —no duplicando— los principios I,
III, IV y VI.

### VIII. Diseño con Tailwind CSS

Toda la interfaz de la aplicación Angular se estiliza con **Tailwind CSS** en su última versión
estable, siguiendo las buenas prácticas del framework. Reglas innegociables:

- **Utility-first**: se componen estilos con clases utilitarias de Tailwind; no se escribe CSS
  ad-hoc paralelo salvo justificación explícita (Principio II).
- **Tokens centralizados**: colores, tipografía, espaciado y breakpoints se definen en el `theme`
  de la configuración de Tailwind; los componentes consumen esos tokens y NO valores mágicos.
- **Sin valores arbitrarios injustificados**: se evitan las *arbitrary values* (`w-[137px]`) salvo
  que no exista token adecuado y se justifique.
- **Componentes reutilizables**: los patrones de UI repetidos se extraen a componentes Angular
  reutilizables antes que duplicar cadenas largas de clases; `@apply` se usa con moderación y solo
  para patrones estables.
- **Responsive y accesible**: los diseños son responsive mediante los breakpoints de Tailwind y
  respetan accesibilidad básica (contraste, foco, roles/etiquetas ARIA cuando aplique).
- **Consistencia**: se prohíbe `!important` y los overrides de estilo fuera del sistema de diseño;
  la coherencia visual proviene del `theme` compartido.

**Rationale**: Un único sistema de diseño basado en utilidades y tokens mantiene una UI coherente,
barata de evolucionar y alineada con la simplicidad (Principio II), evitando la deriva de estilos
en un frontend que crecerá con nuevas operaciones de campo.

## Restricciones Técnicas

- **Monorepo** con frontend y backend en el mismo repositorio.
- **Frontend**: Angular en sus últimas versiones estables, TypeScript.
- **Estilos / Diseño**: Tailwind CSS en su última versión estable como único sistema de estilos,
  con tokens de diseño centralizados en su configuración (Principio VIII).
- **Backend**: Node.js con Express en sus últimas versiones estables, TypeScript.
- **Contratos de API**: definidos en **OpenAPI 3.1** como única fuente de verdad, versionados
  en el repositorio (p. ej. `contracts/openapi.yaml`); los tipos de cliente y servidor se
  derivan del contrato (Principio VII).
- Se favorece la biblioteca estándar y dependencias mínimas; cada nueva dependencia se
  justifica bajo el Principio II (Simplicidad y YAGNI).

## Flujo de Desarrollo y Puertas de Calidad

- Todo trabajo pasa por el flujo SDD (Principio III).
- **Contract-first**: cuando la tarea toca una API, el contrato OpenAPI se define o actualiza
  ANTES de implementar el endpoint, y la implementación se valida contra él (Principio VII).
- TDD obligatorio en cada tarea de implementación (Principio IV).
- Tests de integración: no requeridos.
- Revisión de código por pares: no obligatoria por ahora; se sustituirá/complementará
  con **CI** más adelante, que hará cumplir estas reglas de forma automatizada.
- Logging estructurado presente en el código entregado (Principio V).

## Governance

Esta constitución supersede cualquier otra práctica del proyecto.

- **Autoridad**: el propio desarrollador ratifica y enmienda la constitución.
- **Enmiendas**: se documentan en este archivo, incrementando la versión según SemVer
  (MAJOR: cambios incompatibles de gobernanza o eliminación/redefinición de principios;
  MINOR: nuevo principio o sección; PATCH: aclaraciones y correcciones).
- **Revisión de cumplimiento**: se verifica el cumplimiento en **cada ejecución de un
  comando SDD** (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`,
  `/speckit-implement`, etc.). Cualquier desviación se justifica o se corrige antes de
  continuar.

**Version**: 1.2.0 | **Ratified**: 2026-07-10 | **Last Amended**: 2026-07-10
