# ADR-0003: Tooling contract-first — OpenAPI 3.1 + openapi-typescript + express-openapi-validator

- **Estado**: Proposed
- **Fecha**: 2026-07-10
- **Decisores**: eduardo.cordero (propuesta de arquitectura)
- **Principios de constitución**: I, III, IV, VI, VII
- **Spec/Feature relacionada**: specs/001-order-execution-workflow
- **Supersede a**: —

## Contexto y problema

El Principio VII (Contract-First) exige que `contracts/openapi.yaml` (OpenAPI 3.1) sea la única
fuente de verdad de la API, y que los tipos de cliente y servidor se **deriven** del contrato sin
mantenerse a mano. Hay que elegir el tooling concreto de generación de tipos y de validación en
runtime que haga cumplible esa regla para Angular (frontend) y Express (backend), sin introducir
un framework de API completo que ya decida más de lo necesario (Principio II).

## Decisión

Se adopta:

1. **`contracts/openapi.yaml`** escrito a mano en OpenAPI **3.1**, con cada operación anotada con
   su `FR-XXX` de origen (Principio III), `security` y `x-required-roles` (ver ADR-0001).
2. **`openapi-typescript`** para generar, a partir del contrato, los tipos TypeScript de
   request/response/paths — consumidos tanto por `frontend/` (cliente HTTP tipado) como por
   `backend/` (tipos de los handlers de `api/`). Se ejecuta como script de build (`npm run
   generate:types`), y el resultado se trata como artefacto derivado (no se edita a mano; se
   commitea o se regenera en CI, a decidir cuando exista CI).
3. **`express-openapi-validator`** en el backend como middleware que valida cada request/response
   contra `contracts/openapi.yaml` en runtime, antes de que la request llegue a `domain/`. Esto
   hace el contrato ejecutable, no solo documental.
4. Un **test de conformidad de contrato** por operación (Principio IV): confirma que la
   implementación real cumple el esquema declarado (status codes, shape de error 401/403/422).

## Justificación (apoyada en la constitución)

- **Principio VII**: es la traducción operativa directa de "el documento OpenAPI es la única
  fuente de verdad… los tipos se derivan, no se mantienen a mano".
- **Principio I (TypeScript estricto)**: los tipos generados eliminan la posibilidad de `any`
  implícito en las fronteras de API; cualquier divergencia contrato↔código es error de
  compilación, no un bug en producción.
- **Principio III (Trazabilidad)**: anotar cada operación con su `FR-XXX` hace que el contrato sea
  además un artefacto de trazabilidad, no solo técnico.
- **Principio IV (TDD)**: el test de conformidad es el test-first natural de "esta operación
  cumple lo que el contrato promete".
- **Principio VI (SemVer)**: un cambio incompatible en `openapi.yaml` (campo/operación eliminada o
  resemantizada) es detectable por diff del propio archivo versionado, disparando el incremento
  MAJOR que exige el principio.
- **Principio II**: se evita adoptar un framework de API-first más pesado (p. ej. generación de
  todo el servidor desde el contrato) cuando solo se necesita generación de tipos + validación de
  runtime.

## Consecuencias

- **Positivas**: imposible que frontend y backend diverjan silenciosamente sobre la forma de la
  API; el contrato es ejecutable (valida requests reales) y no solo documentación.
- **Negativas / coste**: paso de generación de tipos añadido al flujo de build; cualquier cambio de
  contrato exige regenerar antes de compilar.
- **Riesgos y mitigaciones**: olvidar regenerar tras editar el contrato (mitigación: script único
  `generate:types` referenciado en el flujo de contract-first del plan; a futuro, gate de CI que
  falle si los tipos generados están desactualizados respecto al contrato).

## Alternativas consideradas

- **GraphQL** — descartada: la constitución fija HTTP/REST + OpenAPI 3.1 explícitamente
  (Restricciones Técnicas); no hay margen de elección aquí.
- **Tipos mantenidos a mano en ambos lados** — descartada: es exactamente lo que el Principio VII
  prohíbe ("no se mantienen tipos divergentes a mano").
- **Generación de servidor completo desde el contrato (p. ej. herramientas *code-first-from-spec*
  tipo NSwag/OpenAPI Generator "server stub")** — descartada: sobre-ingeniería para el tamaño
  actual de la API; se prefiere una capa fina de validación + tipos (Principio II).
- **Zod/io-ts como fuente de verdad de esquemas (schema-first en TS, exportando a OpenAPI)** —
  descartada: invertiría la fuente de verdad (el contrato dejaría de ser el documento OpenAPI),
  contradiciendo literalmente el Principio VII.

## Open questions

Ninguna.
