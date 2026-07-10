# contracts/

Contiene `openapi.yaml` (OpenAPI **3.1**), la **única fuente de verdad** de la API de FieldOps
(Principio VII de la constitución). Ningún endpoint se implementa sin su operación previamente
definida aquí; los tipos de cliente (frontend) y servidor (backend) se **derivan** de este
documento (ADR-0003) — nunca se mantienen tipos de API divergentes a mano.

`openapi.yaml` ya existe con una operación inicial por cada `FR-XXX` marcado "Sí" en la tabla de
trazabilidad de `specs/001-order-execution-workflow/spec.md` (envío de ejecución, reasignación,
revisión/decisión, consulta de órdenes, login). `/speckit-plan`/`/speckit-tasks` deben ampliarlo o
ajustarlo si aparecen operaciones nuevas, siempre contract-first (Principio VII) y sin romper las
ya definidas sin pasar por MAJOR (Principio VI). También contiene `ai/incident-summary.contract.md`
(contrato del asistente de resumen de incidencia, FR-017/023…025, ver ADR-0009).

Ver:
- `docs/architecture.md` (§2.3) — qué debe declarar cada operación (seguridad, roles, errores).
- `docs/adr/0003-contract-first-openapi-tooling.md` — tooling de codegen y validación.
- `docs/security/rbac-matrix.md` — roles requeridos por operación (`x-required-roles`).
