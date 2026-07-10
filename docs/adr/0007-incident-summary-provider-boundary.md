# ADR-0007: Frontera de proveedor para el asistente de resumen de incidencia

- **Estado**: Proposed
- **Fecha**: 2026-07-10
- **Decisores**: eduardo.cordero (propuesta de arquitectura)
- **Principios de constitución**: II, III, VII
- **Spec/Feature relacionada**: specs/001-order-execution-workflow (FR-017, US5)

## Contexto y problema

FR-017/US5 exigen que, al abrir una ejecución enviada, el supervisor reciba un resumen
automáticamente generado de la incidencia a partir de las notas del técnico. La spec no especifica
qué proveedor/modelo genera ese resumen (no hay `FR` que fije un proveedor de IA concreto), y
elegir uno ahora sería una decisión de producto/costo que la spec no respalda. Hay que decidir
cómo se estructura el sistema para soportar FR-017 sin acoplar el dominio a un proveedor concreto.

## Decisión

Se define una interfaz de dominio **`IncidentSummaryProvider`** (`backend/src/domain`, p. ej.
`summarize(notes: string): Promise<string>`), consumida por el caso de uso "abrir ejecución para
revisión" (US2/FR-017). La implementación concreta vive en
`backend/src/infrastructure/incident-summary` como un **adaptador único e intercambiable**; el
dominio y el contrato OpenAPI (operación de revisión) solo conocen el campo `incidentSummary`
resultante, no el proveedor que lo produjo. La operación de contrato que expone la revisión
(FR-007) incluye este campo, trazado a FR-017.

## Justificación (apoyada en la constitución)

- **Principio II (Simplicidad/YAGNI)**: se implementa exactamente lo que pide FR-017 (un resumen
  disponible al abrir la revisión) sin construir una plataforma de IA genérica ni múltiples
  proveedores intercambiables en runtime — un único adaptador basta hoy.
- **Principio III (Trazabilidad)**: la interfaz y el caso de uso se anclan explícitamente a
  FR-017/US5; el campo de la respuesta del contrato se anota con ese mismo `FR-XXX`.
- **Principio VII (Contract-First)**: el contrato solo compromete la **forma** del resultado
  (`incidentSummary: string`, con posible estado de "no disponible" si el proveedor falla), nunca
  detalles del proveedor — así un cambio de proveedor de IA no es un cambio de contrato.

## Consecuencias

- **Positivas**: el proveedor de resumen se puede sustituir (o mockear en tests, Principio IV) sin
  tocar el dominio ni el contrato; el acoplamiento externo queda contenido en un único adaptador.
- **Negativas / coste**: hay que definir un comportamiento de *fallback* si el proveedor no
  responde (p. ej. mostrar las notas crudas o un estado "resumen no disponible") para no bloquear
  la revisión del supervisor (US2 no debe depender de la disponibilidad de un servicio externo).
- **Riesgos y mitigaciones**: latencia/errores del proveedor externo → mitigación: timeout +
  fallback definido en la tarea de implementación; nunca debe impedir aprobar/rechazar (FR-007 no
  depende de FR-017).

## Alternativas consideradas

- **Resumen generado en el frontend (Angular) llamando directamente a un proveedor externo** —
  descartada: expondría credenciales/llamadas a terceros desde el cliente y rompería el patrón
  "el backend es la única autoridad" ya establecido para autorización (ADR-0001); el mismo
  principio de control centralizado aplica aquí.
- **Comprometerse ya con un proveedor/modelo de IA específico** — descartada: ningún requisito fija
  el proveedor; se documenta como pregunta abierta en `docs/architecture.md` en vez de inventar una
  elección sin respaldo.
- **Generar el resumen de forma síncrona y bloqueante dentro de la misma transacción de envío de
  ejecución (FR-002)** — descartada: acoplaría la disponibilidad del envío del técnico (US1, el
  núcleo del MVP) a la disponibilidad de un servicio externo; se genera al **abrir la revisión**
  (US5), no al enviar.

## Open questions

- Proveedor/modelo concreto de IA para el resumen — ver `docs/architecture.md`, §6.
- Comportamiento exacto de fallback (mostrar notas crudas vs mensaje de error) — a definir en la
  fase de plan/tasks de esta feature.
