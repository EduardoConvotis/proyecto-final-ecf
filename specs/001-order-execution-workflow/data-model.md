# Phase 1 Data Model: Ejecución y Revisión de Órdenes de Trabajo

Entidades derivadas de la spec (Key Entities y FR-001…FR-022). Los tipos concretos se derivarán del
contrato OpenAPI (`contracts/openapi.yaml`) y del esquema Prisma; aquí se define el modelo lógico.

## Entidades

### WorkOrder (Orden de trabajo) — FR-001, FR-018
| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| customer | string | requerido (FR-018) |
| address | string | requerido (FR-018) |
| service | string | requerido (FR-018) |
| date | date | requerida (FR-018) |
| assignedTechnicianId | UUID → User | requerido; rol=técnico |
| state | enum `OrderState` | ver máquina de estados |
- Relaciones: 1—N `Material`; 1—N `ExecutionRecord` (histórico de envíos); 1—N `Reassignment`.

### Material — FR-018
| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| workOrderId | UUID → WorkOrder | requerido |
| description | string | requerido |
| quantity | number | > 0 |
| price | decimal | ≥ 0 |
- Cardinalidad: una orden tiene 0..N materiales (solo si fueron necesarios).

### ExecutionRecord (Registro de ejecución) — FR-002, FR-015, FR-016
| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| workOrderId | UUID → WorkOrder | requerido |
| technicianNotes | string | opcional (fuente del resumen FR-017) |
| location | geo/string | **requerido** al enviar (FR-015) |
| signature | ref firma | **requerido** al enviar (FR-015) |
| workDurationMinutes | number | **requerido**, ≥ 0 (FR-016) |
| submittedAt | timestamp | fijado al enviar |
- Reglas: al enviar exige ≥1 `EvidencePhoto` (FR-003), `location` y `signature` (FR-015).
- Cardinalidad: la orden puede tener varios registros (reenvíos tras rechazo, FR-009); uno "vigente".

### EvidencePhoto (Foto de evidencia) — FR-003, FR-004, FR-014
| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| executionRecordId | UUID → ExecutionRecord | requerido |
| storageRef | string | referencia al almacén de archivos (ADR-0006) |
| contentType | string | **JPEG** únicamente (FR-014) |
| sizeBytes | number | ≤ 10 MB (FR-014) |
- Cardinalidad: 1..15 por `ExecutionRecord` (FR-003 mínimo 1, FR-004 máximo 15).

### IncidentSummary (Resumen de incidencia) — FR-017, FR-023, FR-024, FR-025
| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| executionRecordId | UUID → ExecutionRecord | requerido |
| status | enum {`ok`,`insufficient_evidence`,`provider_failed`} | abstención (FR-023) / fallo (FR-025) |
| keyPoints | array<{ text, sourceNoteFragment }> | cada punto referencia su fragmento de nota (grounding, FR-024) |
| generatedAt | timestamp | |
- Contrato y comportamiento en `contracts/ai/incident-summary.contract.md`; verificado por eval-gate
  (`evals/incident-summary/`, ADR-0009).
- `insufficient_evidence`: no se fabrica contenido (FR-023). `provider_failed`: la revisión muestra
  las notas crudas y se registra el fallo, sin bloquear (FR-025, research Q-B).

### User / Role — FR-010, FR-011, FR-026, FR-027
| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| username | string | único; credencial de login |
| passwordHash | string | bcrypt; contraseña nunca en claro (ADR-0010); política ≥8, mayúscula+número+especial aplicada en provisión |
| role | enum {`tecnico`,`dispatcher`,`supervisor`} | exactamente 3 roles (FR-011) |
- Visibilidad: un usuario ve solo órdenes asignadas a sí mismo (FR-010).
- Provisión: 3 usuarios semilla (uno por rol) creados fuera de la feature; sin auto-registro.

### Session (Sesión) — FR-026, FR-028, FR-029
| Campo | Tipo | Reglas |
|-------|------|--------|
| token | JWT | claims mínimos `sub` (userId) + `role`; TTL = config (ADR-0010) |
- Emitida tras login válido (FR-026); requerida en toda función protegida (FR-028); finaliza con
  logout stateless (FR-029, sin blacklist). Credenciales inválidas → 401 genérico (FR-027).

### ReviewDecision (Decisión de revisión) — FR-007, FR-008, FR-009
| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| executionRecordId | UUID → ExecutionRecord | requerido |
| supervisorId | UUID → User | rol=supervisor |
| outcome | enum {`approved`,`rejected`} | |
| decidedAt | timestamp | |

### Reassignment (Reasignación) — FR-005, FR-006
| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| workOrderId | UUID → WorkOrder | requerido |
| dispatcherId | UUID → User | rol=dispatcher |
| fromTechnicianId | UUID → User | |
| toTechnicianId | UUID → User | rol=técnico |
| at | timestamp | |
- Regla: permitida solo si la orden no está `Aprobada` (FR-006).

### AuditEntry (Rastro de auditoría) — FR-012, FR-013
| Campo | Tipo | Reglas |
|-------|------|--------|
| id | UUID | PK |
| actorId | UUID → User | |
| action | string | submit/reassign/approve/reject/access |
| resource | string | |
| timestamp | timestamp | |
- Cubre auditoría de cambios de estado (FR-013) y accesos a datos (FR-012).

## Máquina de estados de la orden (`OrderState`) — FR-002/008/009, Assumptions

```
Asignada ──(técnico ejecuta)──▶ EnEjecucion ──(envía ejecución, FR-002)──▶ Enviada
Enviada ──(supervisor aprueba, FR-008)──▶ Aprobada   [estado terminal]
Enviada ──(supervisor rechaza, FR-009)──▶ Rechazada ──(técnico corrige y reenvía)──▶ Enviada
Reasignación (FR-005): permitida en cualquier estado ≠ Aprobada; no cambia el estado, cambia el técnico.
```

Reglas de transición (validadas en `backend/src/domain/`, test-first):
- Solo el técnico asignado puede pasar de EnEjecucion→Enviada (FR-002, FR-011).
- El envío requiere ≥1 foto JPEG ≤10 MB, ubicación y firma (FR-003, FR-014, FR-015).
- Solo el supervisor aprueba/rechaza (FR-007/008/009); denegación por rol → 403 (FR-020/021/022).
- Solo el dispatcher reasigna y solo si ≠ Aprobada (FR-005/006); denegación por rol → 403 (FR-019).

## Componente de IA (resumen de incidencia) — FR-017, FR-023…FR-025

No es una entidad relacional persistida como las anteriores, sino un componente con contrato propio
(`contracts/ai/incident-summary.contract.md`). Entrada: `technicianNotes`. Salida: `IncidentSummary`
(arriba). Reglas verificables por eval-gate (ADR-0009):
- **Abstención (FR-023)**: notas insuficientes → `status=insufficient_evidence`, sin fabricar.
- **Grounding (FR-024)**: cada `keyPoint` referencia el fragmento de nota que lo respalda.
- **Fallback (FR-025)**: proveedor caído → `status=provider_failed`, notas crudas + log del fallo.

## Trazabilidad entidad/regla → FR
Cada tabla y regla de arriba cita su `FR-XXX`. Las operaciones de API que exponen estas reglas están
en `contracts/openapi.yaml`, cada una anotada con su `FR-XXX` (Principio III y VII).
