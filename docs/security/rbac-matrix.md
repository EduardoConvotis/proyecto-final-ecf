# FieldOps — Matriz de permisos (RBAC + ownership)

**Fuente única de autorización.** De esta matriz derivan el contrato OpenAPI (roles por
operación), la implementación (política centralizada) y los tests (allow/deny por celda).

- **Constitución**: v1.2.0 · **Spec de origen**: `specs/001-order-execution-workflow/spec.md`
- **Decisión de diseño**: [ADR-0001 — Modelo de autorización](../adr/0001-authorization-model.md);
  [ADR-0010 — Login (JWT), hashing y logout](../adr/0010-login-jwt-session-password-hashing.md)
- **Modelo**: RBAC (3 roles) **+ ownership** (autorización a nivel de recurso). El rol por sí
  solo no basta: p. ej. un técnico solo actúa sobre órdenes **asignadas a él**.
- **Regla base**: **deny-by-default** (FR-011). La autoridad de autorización es el **backend**;
  los guards de Angular / ocultar UI son solo defensa en profundidad.

## Roles

| Rol | Descripción | Alcance de lectura |
|-----|-------------|--------------------|
| **técnico** | Ejecuta y envía órdenes asignadas a él. | Solo sus órdenes asignadas (FR-010). |
| **dispatcher** | Reasigna órdenes entre técnicos. | Órdenes de su ámbito. |
| **supervisor** | Revisa ejecuciones enviadas: aprueba o rechaza. | Órdenes de su ámbito. |

El sistema reconoce **exactamente** estos tres roles (FR-011). Cualquier otro valor de rol → deny.

## Matriz acción × rol

Leyenda: ✅ permitido · ❌ denegado · 🔒 = además sujeto a comprobación de *ownership* del recurso.

| # | Acción / operación | técnico | dispatcher | supervisor | FR que la rigen | Ruta de denegación (deny) |
|---|--------------------|:-------:|:----------:|:----------:|-----------------|---------------------------|
| A1 | Listar / leer **sus** órdenes | ✅🔒 | ✅🔒 | ✅🔒 | FR-010, FR-001, FR-018 | FR-010 (SHALL NOT mostrar ajenas) |
| A2 | Enviar ejecución (+evidencia, ubicación, firma, tiempo) | ✅🔒 | ❌ | ❌ | FR-002, FR-003, FR-004, FR-014, FR-015, FR-016 | FR-003/FR-014/FR-015 (validación); FR-011 + EC-005 (rol) |
| A3 | Reasignar orden | ❌ | ✅🔒 | ❌ | FR-005, FR-006 | **FR-019** (rol, EC-008); FR-006 (orden Aprobada) |
| A4 | Revisar ejecución + ver resumen de incidencia | ❌ | ❌ | ✅🔒 | FR-007, FR-017 | **FR-020** (rol, EC-009) |
| A5 | Aprobar ejecución | ❌ | ❌ | ✅🔒 | FR-008 | **FR-021** (rol, EC-010); US1-sc4/EC-005 (técnico no aprueba lo suyo) |
| A6 | Rechazar ejecución | ❌ | ❌ | ✅🔒 | FR-009 | **FR-022** (rol, EC-011) |
| A7 | Cerrar sesión (logout) | ✅🔒 | ✅🔒 | ✅🔒 | FR-029 | FR-028 (sin sesión válida → ya no hay nada que cerrar; 401) |

**A7 (logout)**: no es una acción RBAC en el sentido de "rol vs rol" — **cualquier** rol
autenticado puede cerrar **su propia** sesión; el ownership aquí es trivial (la sesión es siempre
la del propio actor, nunca la de otro usuario). Ver ADR-0010 (logout stateless: el backend audita
el evento pero no mantiene lista de revocación de tokens).

**Login (`POST /auth/login`, FR-026/FR-027)** es una operación **pre-autenticación**: no aplica
RBAC (el actor aún no tiene rol) — solo valida credenciales contra el hash almacenado (ADR-0010) y,
si son válidas, emite el JWT con el rol como claim. No se lista como fila de la matriz porque no
hay "rol" que autorizar todavía; el intento fallido se audita igualmente (FR-012/FR-013).

### Reglas transversales (aplican a todas las operaciones)

| Regla | FR | Detalle |
|-------|----|---------|
| Acceso autenticado + registro de acceso | FR-012 | Toda operación exige autenticación; se registra (actor, recurso, timestamp). |
| Rastro auditable de cambios de estado | FR-013 | Envío, reasignación, aprobación y rechazo quedan auditados (actor, acción, timestamp). |
| Deny-by-default | FR-011 | Rol o acción no reconocidos → denegado. |

## Ownership (autorización a nivel de recurso)

RBAC responde "¿este rol puede hacer esta acción?". Ownership responde "¿sobre **este** recurso?":

- **A2 (enviar)**: la orden debe estar **asignada al técnico** que envía.
- **A3 (reasignar)**: la orden debe estar en el **ámbito del dispatcher** y no estar Aprobada (FR-006).
- **A4–A6 (revisar/aprobar/rechazar)**: la ejecución debe estar en el **ámbito del supervisor** y en estado "Enviada".
- **A1 (listar/leer)**: solo las órdenes propias del usuario (FR-010).

Comprobar **primero rol, luego ownership**; ambos deben pasar. Fallo de rol → **403**; fallo de
autenticación → **401**; recurso no visible por ownership → **404** (no revelar existencia) o **403** según decida el ADR.

## Codificación en el contrato (Principio VII)

Cada operación de `contracts/openapi.yaml` declara:
- `security` (esquema autenticado) — FR-012;
- roles requeridos, p. ej. extensión `x-required-roles: [supervisor]`;
- respuestas **401** y **403** con schema de error estándar.
Cliente y servidor **derivan** los tipos de rol del contrato (Principio I: `type Rol = 'técnico' | 'dispatcher' | 'supervisor'`).

## Verificación (Principios IV y V)

- **Test allow + test deny por cada celda** de la matriz (test-first). Cubre SC-006 ("100% de
  intentos no autorizados bloqueados").
- Cada **decisión** de autorización (allow/deny) se loguea estructurada: actor, rol, acción,
  recurso, resultado → alimenta FR-012/FR-013. Los **deny** son señal de seguridad prioritaria.

## Gaps / follow-ups

1. ✅ **CERRADO (2026-07-10).** Añadidos los FR de denegación por acción en EARS: **FR-019**
   (A3 reasignar), **FR-020** (A4 revisar), **FR-021** (A5 aprobar), **FR-022** (A6 rechazar),
   cada uno con su escenario deny (US2 sc3–5, US3 sc3) y edge case (EC-008…EC-011). Queda
   pendiente añadir, si se desea, un FR de denegación por rol específico para A2 (enviar por
   no-técnico), hoy cubierto por FR-011 + EC-005.
2. **Definir el código de respuesta para fallo de ownership** (403 vs 404) en el ADR-0001.
3. **Provisión/gestión de roles** (cómo se asigna el rol a un usuario) queda fuera del alcance de
   esta feature; abrir ADR aparte cuando entre. **Confirmado (2026-07-10, US6)**: para esta feature
   se siembran 3 usuarios de prueba (uno por rol) fuera del flujo de la aplicación; sin registro,
   recuperación de contraseña ni lockout en alcance (ver ADR-0010).
