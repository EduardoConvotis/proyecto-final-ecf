# ADR-0001: Modelo de autorización (RBAC + ownership)

- **Estado**: Accepted <!-- Proposed | Accepted | Superseded by ADR-XXXX | Deprecated -->
- **Fecha**: 2026-07-10
- **Decisores**: eduardo.cordero (propuesta de arquitectura)
- **Principios de constitución**: I, II, III, V, VII
- **Spec/Feature relacionada**: specs/001-order-execution-workflow
- **Supersede a**: —

## Contexto y problema

FieldOps opera en un dominio asegurador donde el control de acceso es crítico y auditable. La
spec 001 define acciones que cambian estado restringidas por rol (FR-011: técnico envía;
dispatcher reasigna; supervisor aprueba/rechaza), y además una restricción de **propiedad**:
cada usuario solo ve/actúa sobre **sus** órdenes (FR-010). Hay que decidir un modelo de
autorización coherente para todo el ciclo (spec → contrato → código → tests) sin sobre-diseñar
(Principio II) y que sea verificable y auditable (Principios III y V).

Un matiz clave: **el rol por sí solo no basta**. FR-010 y las acciones sobre órdenes concretas
exigen comprobar también la **propiedad del recurso** (ownership); un técnico no puede enviar la
orden de otro técnico aunque tenga el rol correcto.

## Decisión

Se adopta **RBAC con exactamente tres roles (técnico, dispatcher, supervisor) combinado con
comprobaciones de ownership a nivel de recurso**, con estas reglas innegociables:

1. **El backend es la única autoridad** de autorización. Los guards de Angular y el ocultar UI
   son defensa en profundidad, nunca la fuente de verdad.
2. **Deny-by-default**: rol o acción no reconocidos → denegado (FR-011).
3. **Punto de aplicación centralizado**: una sola capa/módulo de política (middleware en
   Express) evalúa `(rol, acción, recurso)`; nada de checks dispersos (Principio II).
4. **Orden de comprobación**: primero autenticación (401 si falla, FR-012), luego rol (**403** si
   falla), luego ownership del recurso (**404** si falla, para no revelar la existencia de recursos
   ajenos — ver "Open questions", resuelto).
5. **Roles en el token autenticado** (claims); el sistema reconoce solo los tres roles.
6. **Autorización codificada en el contrato OpenAPI** (Principio VII): `securitySchemes`,
   roles por operación (extensión `x-required-roles`) y respuestas **401/403** con schema
   estándar. Los tipos de rol se **derivan** del contrato (Principio I:
   `type Rol = 'técnico' | 'dispatcher' | 'supervisor'`), de modo que un rol inválido es error
   de compilación.
7. **Toda decisión de autorización se registra** de forma estructurada (actor, rol, acción,
   recurso, resultado), alimentando el registro de acceso y el rastro auditable (FR-012, FR-013).
8. La [matriz de permisos](../security/rbac-matrix.md) es la **fuente única** de la que derivan
   contrato, código y tests.

Esta decisión se captura como **ADR** (no como principio de constitución) por elección del
equipo; puede **elevarse a principio** más adelante si se quiere vinculante en toda feature.

## Justificación (apoyada en la constitución)

- **Principio II (Simplicidad/YAGNI)**: tres roles fijos + ownership resuelven todos los
  requisitos actuales sin la maquinaria de ABAC/políticas dinámicas.
- **Principio VII (Contract-First)**: poner la autorización en el OpenAPI elimina la deriva
  frontend/backend sobre "quién puede llamar a qué".
- **Principio I (TypeScript estricto)**: roles como *union type* derivado del contrato → typos
  imposibles en tiempo de compilación.
- **Principios III y V (Trazabilidad y Observabilidad)**: cada decisión trazable a un FR y
  auditada; los `deny` son señal de seguridad prioritaria.

## Consecuencias

- **Positivas**: autorización única, verificable y auditable; tests allow/deny derivables de la
  matriz; contrato como fuente de verdad; seguridad no depende del cliente.
- **Negativas / coste**: exige mantener sincronizados matriz ↔ contrato ↔ política; el ownership
  añade comprobaciones de recurso además del rol.
- **Riesgos y mitigaciones**: olvidar el check de ownership (mitigación: la capa central exige
  `resource` explícito y los tests deny lo cubren); fuga de existencia de recursos (mitigación:
  decidir 403 vs 404 para fallo de ownership — ver open question).

## Alternativas consideradas

- **ABAC / políticas por atributos** — descartada: sobre-ingeniería para tres roles (Principio II).
- **RBAC puro sin ownership** — descartada: no satisface FR-010 (ver solo lo propio) ni impide
  que un técnico actúe sobre la orden de otro.
- **Autorización en el frontend** — descartada: insegura; el cliente no puede ser la autoridad.
- **Checks de rol dispersos por endpoint** — descartada: no auditable, propenso a huecos (Principio II).

## Open questions (resueltas)

- **[RESUELTO 2026-07-10]** Código de respuesta para fallo de **ownership**: se adopta **404** (no
  revelar la existencia de recursos ajenos), reservando **403** para el fallo de **rol** (actor
  autenticado pero sin el rol autorizado). Consistente con `research.md` (Q-D) y con
  `contracts/openapi.yaml` (401 no autenticado, 403 rol no autorizado, 404 recurso no propio). Con
  esta resolución el ADR pasa a **Accepted**.
