# ADR-0004: Logging estructurado con Pino

- **Estado**: Proposed
- **Fecha**: 2026-07-10
- **Decisores**: eduardo.cordero (propuesta de arquitectura)
- **Principios de constitución**: II, V
- **Spec/Feature relacionada**: specs/001-order-execution-workflow (FR-012, FR-013)
- **Supersede a**: —

## Contexto y problema

El Principio V exige logging estructurado (clave-valor/JSON, no texto libre) en el backend, capaz
de seguir una operación de campo de extremo a extremo, sin registrar secretos ni PII en claro.
FR-012 exige registrar el acceso a datos de órdenes (actor, recurso, timestamp) y FR-013 exige un
rastro auditable de envío/reasignación/aprobación/rechazo. Hay que elegir una librería de logging
concreta para `backend/`.

## Decisión

Se adopta **Pino** como librería de logging estructurado del backend Express, con:

- un **logger raíz** configurado en `backend/src/middleware/logging` que emite JSON por línea;
- un **middleware de request logging** que añade un `requestId` de correlación a cada log de la
  petición (permite reconstruir el flujo de una operación de campo de punta a punta);
- una **lista de redacción** (`pino` `redact`) para cabeceras de autenticación, contraseñas y
  cualquier campo marcado como sensible, de forma que nunca se registren en claro;
- los eventos de auditoría de FR-012/FR-013 (actor, acción, recurso, resultado, timestamp) se
  emiten como logs estructurados con un campo `event` reconocible, distinguibles del resto de logs
  operativos.

## Justificación (apoyada en la constitución)

- **Principio V**: Pino emite JSON estructurado por diseño (no texto libre), cumpliendo la letra
  del principio; su soporte nativo de `redact` resuelve el requisito "no se registran secretos ni
  datos personales sensibles en claro" sin código propio de scrubbing.
- **Principio II (Simplicidad)**: Pino es una dependencia mínima, de bajo overhead en runtime
  (diseñada para alto rendimiento), sin necesitar infraestructura de logging adicional (no se
  introduce aquí ningún agregador/backend de logs — eso es una decisión operativa fuera del
  alcance de esta feature).

## Consecuencias

- **Positivas**: logs consistentes y parseables desde el primer commit del backend; correlación de
  requests lista para depurar incidentes de campo.
- **Negativas / coste**: una dependencia más en `backend/package.json`; el equipo debe seguir la
  convención de no loguear objetos completos de request/usuario sin pasar por la redacción.
- **Riesgos y mitigaciones**: olvidar añadir un campo sensible nuevo a la lista de redacción
  (mitigación: revisar la lista de redacción como parte de cualquier tarea que añada un campo
  nuevo al modelo de usuario/orden).

## Alternativas consideradas

- **Winston** — descartada: más configuración por defecto para lograr JSON estructurado, mayor
  huella y menor rendimiento que Pino para el mismo resultado exigido por el Principio V.
- **`console.log` con formato manual** — descartada: no garantiza estructura consistente ni
  redacción, y el Principio V prohíbe explícitamente "texto libre".
- **Logging solo a través de un servicio externo (APM comercial) desde el día 1** — descartada:
  complejidad y coste operativo no justificados por ningún requisito de la spec (Principio II);
  puede añadirse después como *sink* adicional sin cambiar la librería.

## Open questions

Ninguna.
