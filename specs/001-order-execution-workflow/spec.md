# Feature Specification: Ejecución y Revisión de Órdenes de Trabajo

**Feature Branch**: `001-order-execution-workflow`

**Created**: 2026-07-10

**Status**: Draft

**Input**: User description: "Necesitamos que el técnico pueda registrar la ejecución de una orden y que el dispatcher pueda reasignarla si hace falta. Cuando el técnico envía la ejecución, debe adjuntar al menos una foto de evidencia. Luego el supervisor revisa y aprueba o rechaza. El usuario puede ver sus órdenes. Ah, y esto tiene que ser rápido y seguro, que manejamos datos de clientes. Sería ideal también tener un pequeño asistente que resuma la incidencia de cada orden a partir de las notas del técnico… Y ya puestos, estaría genial un dashboard de métricas de productividad y notificaciones push a los técnicos… pero bueno, eso lo vemos."

## Constitution Alignment

Esta especificación respeta la constitución de FieldOps v1.2.0. Referencias relevantes para la
trazabilidad (ver `.specify/memory/constitution.md` y `.specify/memory/traceability.md`):

- **Principio III (Trazabilidad SDD)**: cada requisito lleva un identificador `FR-XXX` que las
  fases de plan/tasks/código/test deben referenciar.
- **Principio IV (Test-First)**: cada requisito funcional y caso límite de esta spec es testable y
  DEBE tener un test asociado en la fase de tareas.
- **Principio V (Observabilidad)**: los requisitos de auditoría/registro reflejan el logging
  estructurado obligatorio.
- **Principio VII (Contract-First / OpenAPI)**: las operaciones de API que se derivan de esta spec se
  rigen por el contrato **OpenAPI 3.1** en `contracts/openapi.yaml` (fuente de verdad). Cada requisito
  funcional que expone comportamiento vía API se implementará SÓLO tras definir su operación en el
  contrato, y cada operación del contrato trazará de vuelta a su `FR-XXX`. La correspondencia
  FR ↔ operación de contrato se detalla en la fase `/speckit-plan` (carpeta `contracts/` del plan).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Técnico registra la ejecución de una orden (Priority: P1)

Un técnico de campo abre una orden que tiene asignada, realiza el trabajo y registra su ejecución
adjuntando al menos una foto de evidencia antes de enviarla para revisión.

**Why this priority**: Es el núcleo del producto — sin el registro de ejecución con evidencia no
hay valor entregado. Constituye el MVP.

**Independent Test**: Se puede probar de forma aislada asignando una orden a un técnico, dejando
que registre su ejecución con una foto y confirmando que la orden queda en estado "Enviada" y
disponible para revisión.

**Acceptance Scenarios**:

1. **Given** un técnico con una orden asignada, **When** registra la ejecución adjuntando al menos
   una foto de evidencia y la envía, **Then** el sistema guarda la ejecución y la orden pasa a
   estado "Enviada".
2. **Given** un técnico con una orden asignada, **When** intenta enviar la ejecución sin ninguna
   foto de evidencia, **Then** el sistema rechaza el envío y la orden permanece en su estado previo.
3. **Given** un técnico con una orden asignada, **When** registra la ejecución adjuntando varias
   fotos de evidencia (JPEG, ≤10 MB, hasta 15) con ubicación y firma, y la envía, **Then** el
   sistema acepta las fotos, registra el tiempo dedicado al trabajo y guarda la ejecución.
4. **Given** un técnico autenticado, **When** intenta aprobar su propia ejecución (acción reservada
   al supervisor), **Then** el sistema bloquea la acción por falta de rol autorizado.
5. **Given** un técnico con una orden asignada, **When** intenta enviar la ejecución sin ubicación o
   sin firma, **Then** el sistema rechaza el envío y la orden permanece en su estado previo.

---

### User Story 2 - Supervisor revisa y aprueba o rechaza (Priority: P2)

Un supervisor consulta las ejecuciones enviadas, revisa la evidencia y las notas, y decide
aprobar o rechazar cada una.

**Why this priority**: Cierra el ciclo de control de calidad de la ejecución; depende de que exista
el registro de ejecución (US1).

**Independent Test**: Con una orden en estado "Enviada", el supervisor la aprueba o la rechaza y se
verifica la transición de estado resultante.

**Acceptance Scenarios**:

1. **Given** una orden en estado "Enviada", **When** el supervisor la aprueba, **Then** la orden
   pasa a estado "Aprobada".
2. **Given** una orden en estado "Enviada", **When** el supervisor la rechaza, **Then** la orden
   pasa a estado "Rechazada" y queda disponible para que el técnico la corrija y reenvíe.
3. **Given** una orden en estado "Enviada", **When** un actor sin el rol supervisor intenta
   aprobarla, **Then** el sistema bloquea la acción y la orden permanece en su estado previo
   (deny — FR-021).
4. **Given** una orden en estado "Enviada", **When** un actor sin el rol supervisor intenta
   rechazarla, **Then** el sistema bloquea la acción y la orden permanece en su estado previo
   (deny — FR-022).
5. **Given** una ejecución enviada, **When** un actor sin el rol supervisor intenta abrirla para
   revisión, **Then** el sistema bloquea la acción (deny — FR-020).

---

### User Story 3 - Dispatcher reasigna una orden (Priority: P3)

Un dispatcher reasigna una orden a otro técnico cuando el técnico asignado no puede completarla.

**Why this priority**: Aporta flexibilidad operativa pero no es imprescindible para el ciclo básico
ejecutar→revisar.

**Independent Test**: Con una orden asignada a un técnico, el dispatcher la reasigna a otro técnico
y se verifica que el técnico asignado cambia y se registra la reasignación.

**Acceptance Scenarios**:

1. **Given** una orden asignada al técnico A y aún no aprobada, **When** el dispatcher la reasigna
   al técnico B, **Then** el técnico asignado pasa a ser B y se registra la reasignación.
2. **Given** una orden en estado "Aprobada", **When** el dispatcher intenta reasignarla, **Then** el
   sistema rechaza la reasignación y el técnico asignado no cambia.
3. **Given** una orden asignada al técnico A y aún no aprobada, **When** un actor sin el rol
   dispatcher intenta reasignarla, **Then** el sistema bloquea la acción y el técnico asignado no
   cambia (deny — FR-019).

---

### User Story 4 - Usuario consulta sus órdenes (Priority: P4)

Un usuario visualiza el listado de órdenes que le corresponden según su rol.

**Why this priority**: Es soporte de visibilidad; útil pero secundario frente al flujo operativo.

**Independent Test**: Autenticado un usuario, solicita sus órdenes y se verifica que solo ve las que
le corresponden.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con órdenes asignadas, **When** consulta sus órdenes, **Then**
   el sistema muestra únicamente las órdenes asignadas a sí mismo y ninguna de otros usuarios.
2. **Given** un usuario autenticado sin órdenes asignadas, **When** consulta sus órdenes, **Then**
   el sistema muestra una lista vacía sin error.

---

### User Story 5 - Asistente resume la incidencia para el supervisor (Priority: P5)

Al revisar una ejecución enviada, el supervisor recibe un resumen generado automáticamente de la
incidencia a partir de las notas del técnico, para no tener que leerlas todas.

**Why this priority**: Mejora la eficiencia de la revisión (US2) pero no es imprescindible para
cerrar el ciclo operativo; se apoya en que exista el registro de ejecución con notas.

**Independent Test**: Con una ejecución enviada que incluye notas del técnico, el supervisor la abre
para revisión y se verifica que se presenta un resumen de la incidencia derivado de esas notas.

**Acceptance Scenarios**:

1. **Given** una ejecución enviada con notas del técnico, **When** el supervisor la abre para
   revisión, **Then** el sistema presenta un resumen de la incidencia derivado de dichas notas.
2. **Given** una ejecución enviada cuyas notas son insuficientes (vacías o sin incidencia
   identificable), **When** el supervisor la abre para revisión, **Then** el sistema devuelve un
   resultado "evidencia insuficiente", no muestra un resumen inventado y el supervisor ve las
   notas crudas (abstención — FR-023).
3. **Given** una ejecución enviada con notas del técnico, **When** el sistema genera el resumen,
   **Then** cada punto clave del resumen referencia el fragmento de nota del que procede
   (grounding — FR-024).
4. **Given** una ejecución enviada con notas del técnico, **When** el proveedor de resumen no está
   disponible al abrir la revisión, **Then** el sistema presenta las notas crudas y registra el
   fallo sin bloquear la revisión (FR-025).

---

### User Story 6 - Inicio de sesión y autenticación (Priority: P1, fundacional)

Un usuario (técnico, dispatcher o supervisor) accede a una pantalla de inicio de sesión, introduce
sus credenciales y, si son válidas, entra al sistema con su rol; el acceso a cualquier otra función
requiere haber iniciado sesión.

**Why this priority**: Es **prerequisito** de todas las demás historias (US1–US5): sin sesión
autenticada no se puede registrar, revisar, reasignar ni consultar órdenes. Habilita FR-010/FR-011.

**Independent Test**: Se puede probar de forma aislada abriendo la pantalla de login, iniciando
sesión con credenciales válidas de cada rol y verificando el acceso; y comprobando que credenciales
inválidas y accesos sin sesión son bloqueados.

**Acceptance Scenarios**:

1. **Given** un usuario con credenciales válidas en la pantalla de login, **When** inicia sesión,
   **Then** el sistema concede una sesión autenticada con su rol (técnico/dispatcher/supervisor).
2. **Given** un usuario con credenciales inválidas, **When** intenta iniciar sesión, **Then** el
   sistema deniega el acceso, lo mantiene sin autenticar y muestra un mensaje de error genérico.
3. **Given** un usuario no autenticado, **When** intenta acceder a una función protegida (registro,
   revisión, reasignación o consulta de órdenes), **Then** el sistema bloquea la acción y lo redirige
   a la pantalla de login.
4. **Given** un usuario autenticado, **When** cierra la sesión, **Then** el sistema finaliza la
   sesión y vuelve a exigir login para las funciones protegidas.

---

### Edge Cases

- **EC-001**: El técnico intenta enviar una ejecución sin foto de evidencia → el envío se rechaza
  (relacionado con FR-003).
- **EC-002**: El dispatcher intenta reasignar una orden ya aprobada → la reasignación se rechaza
  (relacionado con FR-006).
- **EC-003**: El supervisor rechaza una ejecución → el técnico puede corregirla y reenviarla
  (relacionado con FR-009).
- **EC-004**: Un usuario sin órdenes asociadas consulta sus órdenes → el sistema muestra una lista
  vacía sin error (relacionado con FR-010).
- **EC-005**: Un actor intenta una acción para la que no tiene rol autorizado (p. ej. un técnico
  aprueba su propia ejecución) → la acción se bloquea (relacionado con FR-011).
- **EC-006**: El técnico adjunta un archivo que no es JPEG o supera 10 MB → el adjunto se rechaza
  (relacionado con FR-014).
- **EC-007**: El técnico intenta enviar la ejecución sin ubicación o sin firma → el envío se rechaza
  (relacionado con FR-015).
- **EC-008**: Un actor sin el rol dispatcher intenta reasignar una orden → la acción se bloquea y el
  técnico asignado no cambia (relacionado con FR-019).
- **EC-009**: Un actor sin el rol supervisor intenta abrir una ejecución para revisión → la acción se
  bloquea (relacionado con FR-020).
- **EC-010**: Un actor sin el rol supervisor intenta aprobar una ejecución → la acción se bloquea y la
  orden permanece en su estado previo (relacionado con FR-021).
- **EC-011**: Un actor sin el rol supervisor intenta rechazar una ejecución → la acción se bloquea y la
  orden permanece en su estado previo (relacionado con FR-022).
- **EC-012**: Las notas del técnico están vacías o son demasiado cortas → el resumen devuelve
  "evidencia insuficiente" sin inventar contenido (relacionado con FR-023).
- **EC-013**: Las notas no contienen una incidencia identificable → el resumen se abstiene
  ("evidencia insuficiente") en lugar de fabricar una (relacionado con FR-023).
- **EC-014**: El proveedor de resumen no responde o falla → el sistema muestra las notas crudas y
  registra el fallo, sin bloquear la revisión (relacionado con FR-025).
- **EC-015**: Un usuario introduce credenciales inválidas en el login → acceso denegado, sin sesión,
  mensaje de error genérico (relacionado con FR-027).
- **EC-016**: Un usuario no autenticado intenta abrir una pantalla/función protegida → se bloquea y
  se le redirige a la pantalla de login (relacionado con FR-028).

## Requirements *(mandatory)*

### Functional Requirements

Requisitos escritos en sintaxis EARS (Easy Approach to Requirements Syntax).

- **FR-001**: The system SHALL maintain each work order with an assigned technician and a lifecycle
  state.
- **FR-002**: WHEN a technician submits the execution of a work order assigned to them, the system
  SHALL record the execution and transition the order to the "Enviada" (Submitted) state.
- **FR-003**: IF a technician attempts to submit an execution without at least one evidence photo
  attached, THEN the system SHALL reject the submission and SHALL leave the order in its prior state.
- **FR-004**: WHEN a technician attaches evidence to an execution, the system SHALL accept one or
  more photo attachments, up to a maximum of 15 per execution.
- **FR-005**: WHEN a dispatcher reassigns a work order to a different technician, the system SHALL
  update the assigned technician and SHALL record the reassignment (who, from, to, when).
- **FR-006**: IF a dispatcher attempts to reassign a work order that is already in the "Aprobada"
  (Approved) state, THEN the system SHALL reject the reassignment.
- **FR-007**: WHEN a supervisor reviews a submitted execution, the system SHALL allow the supervisor
  to approve or reject it.
- **FR-008**: WHEN a supervisor approves a submitted execution, the system SHALL transition the
  order to the "Aprobada" (Approved) state.
- **FR-009**: WHEN a supervisor rejects a submitted execution, the system SHALL transition the order
  to the "Rechazada" (Rejected) state and SHALL make it available to the assigned technician for
  correction and resubmission.
- **FR-010**: WHEN a user requests their work orders, the system SHALL display only the work orders
  assigned to that user, and SHALL NOT display work orders assigned to other users.
- **FR-011**: The system SHALL permit each state-changing action only to the role authorized to
  perform it (technician: submit execution; dispatcher: reassign; supervisor: approve/reject). The
  system recognizes exactly three roles: técnico, dispatcher, supervisor.
- **FR-012**: The system SHALL enforce authenticated access and SHALL record access to work-order
  data (actor, resource, timestamp).
- **FR-013**: The system SHALL maintain an auditable trail (actor, action, timestamp) for execution
  submission, reassignment, approval, and rejection.
- **FR-014**: IF a technician attaches an evidence file that is not JPEG or exceeds 10 MB, THEN the
  system SHALL reject that attachment.
- **FR-015**: IF a technician attempts to submit an execution without a location and a signature,
  THEN the system SHALL reject the submission and SHALL leave the order in its prior state.
- **FR-016**: WHEN a technician submits an execution, the system SHALL record the time spent
  performing the work.
- **FR-017**: WHEN a supervisor opens a submitted execution for review, the system SHALL provide an
  automatically generated summary of the incident derived from the technician's notes.
- **FR-018**: The system SHALL maintain, for each work order, the customer, address, service, and
  date. WHERE materials were required to complete the order, the system SHALL record each material
  with its quantity and price.
- **FR-019**: IF an actor without the dispatcher role attempts to reassign a work order, THEN the
  system SHALL reject the action and SHALL leave the assigned technician unchanged.
- **FR-020**: IF an actor without the supervisor role attempts to open a submitted execution for
  review, THEN the system SHALL reject the action.
- **FR-021**: IF an actor without the supervisor role attempts to approve a submitted execution,
  THEN the system SHALL reject the action and SHALL leave the order in its prior state.
- **FR-022**: IF an actor without the supervisor role attempts to reject a submitted execution, THEN
  the system SHALL reject the action and SHALL leave the order in its prior state.
- **FR-023**: IF the technician's notes are insufficient to summarize the incident, THEN the system
  SHALL return an "insufficient evidence" result and SHALL NOT fabricate summary content.
- **FR-024**: The system SHALL ground each incident-summary key point in the technician's notes,
  referencing the source note fragment for that key point.
- **FR-025**: IF the incident-summary provider is unavailable, THEN the system SHALL present the raw
  technician notes and SHALL record the failure.
- **FR-026**: WHEN a user submits valid credentials on the login screen, the system SHALL grant
  an authenticated session that carries the user's role (técnico, dispatcher or supervisor).
- **FR-027**: IF a user submits invalid credentials on the login screen, THEN the system SHALL deny
  access, keep the user unauthenticated, and present a generic authentication-failure message that
  does not reveal whether the username or the password was wrong.
- **FR-028**: IF an unauthenticated user attempts to access any function that requires authentication
  (per FR-012), THEN the system SHALL deny the action and redirect the user to the login screen.
- **FR-029**: WHEN an authenticated user logs out, the system SHALL end the session and SHALL
  require login again before any protected function can be used.

### Trazabilidad Requisito → Principio (Constitución v1.2.0)

| Requisito | Principio(s) que lo sustentan | Operación de API (contrato) |
|-----------|-------------------------------|-----------------------------|
| FR-001 | III (Trazabilidad) | — (modelo de datos, no operación) |
| FR-002 | III, IV, VII | Sí — envío de ejecución |
| FR-003 | IV, VII | Sí — envío de ejecución (validación de evidencia) |
| FR-004 | IV, VII | Sí — adjuntar evidencia |
| FR-005 | III, V (auditoría de reasignación), VII | Sí — reasignación |
| FR-006 | IV, VII | Sí — reasignación (regla de estado) |
| FR-007 | IV, VII | Sí — revisión (aprobar/rechazar) |
| FR-008 | IV, VII | Sí — aprobación |
| FR-009 | IV, VII | Sí — rechazo |
| FR-010 | III, VII | Sí — consulta de órdenes |
| FR-011 | V (registro de accesos), III, VII | Transversal — control de acceso por operación del contrato |
| FR-012 | V (Observabilidad / registro de acceso a datos) | Transversal — seguridad de todas las operaciones |
| FR-013 | III, V (rastro auditable con logging estructurado) | Transversal — auditoría de las operaciones de cambio de estado |
| FR-014 | IV, VII | Sí — adjuntar evidencia (validación de formato/tamaño) |
| FR-015 | IV, VII | Sí — envío de ejecución (validación de ubicación y firma) |
| FR-016 | III, V | Sí — envío de ejecución (registro de duración del trabajo) |
| FR-017 | III, IV, VII | Sí — resumen de incidencia para revisión |
| FR-018 | III, VII | Sí — modelo de orden y materiales expuestos vía contrato |
| FR-019 | V (registro de accesos), III, VII | Sí — reasignación (denegación por rol) |
| FR-020 | V (registro de accesos), III, VII | Sí — revisión (denegación por rol) |
| FR-021 | V (registro de accesos), III, VII | Sí — aprobación (denegación por rol) |
| FR-022 | V (registro de accesos), III, VII | Sí — rechazo (denegación por rol) |
| FR-023 | IV (eval-gate), VII | Sí — revisión (abstención del resumen; `status=insufficient_evidence`) |
| FR-024 | III (grounding/trazabilidad), VII | Sí — revisión (puntos clave con referencia a nota) |
| FR-025 | V (registro del fallo), VII | Sí — revisión (fallback a notas crudas si el proveedor falla) |
| FR-026 | III, V (registro de acceso), VII | Sí — login (emite sesión con rol) |
| FR-027 | V (registro de intento fallido), VII | Sí — login (credenciales inválidas) |
| FR-028 | III, V, VII | Transversal — toda operación protegida exige sesión |
| FR-029 | VII | Sí — logout (fin de sesión) |

**Nota de IA verificable (FR-017, FR-023…FR-025)**: el componente de resumen se especifica como
contrato en `contracts/ai/incident-summary.contract.md` (entradas/salidas + regla de abstención +
grounding + failure modes) y se valida con una eval de golden cases con umbrales en
`evals/incident-summary/`. Decisión de diseño: [ADR-0009](../../docs/adr/0009-ai-component-contract-and-eval.md)
(amplía [ADR-0007](../../docs/adr/0007-incident-summary-provider-boundary.md)).

**Nota de autorización (RBAC)**: FR-019…FR-022 son los requisitos de *denegación por rol*
(patrón EARS unwanted-behavior) que complementan a FR-011 por acción; su matriz de allow/deny
está en `docs/security/rbac-matrix.md` y su decisión de diseño en
[ADR-0001](../../docs/adr/0001-authorization-model.md).

**Nota de contract-first (Principio VII)**: todos los FR marcados "Sí" arriba se implementarán tras
definir su operación en `contracts/openapi.yaml` (OpenAPI 3.1); los tipos de cliente/servidor se
derivan de ese contrato. FR-011/012/013 son transversales al contrato (se aplican a todas las
operaciones) más que operaciones individuales.

**Principios no trazados a nivel de FR (y por qué)**: el Principio I (TypeScript Estricto) y el
Principio II (Simplicidad y YAGNI) son restricciones de implementación/proceso que se verifican en
las fases de plan/tasks/código, no a nivel de requisito de negocio. El Principio VI (Versionado
Semántico) aplica a la publicación del software y a los cambios incompatibles del contrato OpenAPI
(Principio VII); no se traza como FR individual. El Principio VIII (Diseño con Tailwind CSS) aplica a
la implementación de la UI —incluida la nueva pantalla de login (US6)—, no como requisito de negocio;
se verifica en el Constitution Check de `/speckit-plan` y en CI. Estos se hacen cumplir en las puertas
de `/speckit-plan` (Constitution Check) y en CI, no en la spec.

### Key Entities *(include if feature involves data)*

- **Orden de trabajo (Work Order)**: unidad de trabajo de campo; atributos clave: identificador,
  técnico asignado, estado del ciclo de vida, cliente, dirección, servicio y fecha.
- **Registro de ejecución (Execution Record)**: datos que el técnico envía al ejecutar una orden;
  incluye notas del técnico, evidencia adjunta, ubicación, firma y tiempo dedicado al trabajo;
  relacionado 1:1 con la orden en su envío vigente.
- **Foto de evidencia (Evidence Photo)**: adjunto de un registro de ejecución; formato JPEG, hasta
  10 MB cada una; al menos una y hasta 15 por envío.
- **Material (Material)**: insumo empleado en la orden cuando fue necesario; atributos: descripción,
  cantidad y precio; una orden puede tener cero o varios materiales.
- **Resumen de incidencia (Incident Summary)**: texto generado automáticamente a partir de las notas
  del técnico para asistir al supervisor en la revisión.
- **Usuario / Rol (User / Role)**: actor del sistema; exactamente tres roles: técnico, dispatcher,
  supervisor. Tiene credenciales (usuario/contraseña) para iniciar sesión. Determina permisos y qué
  órdenes puede ver (solo las asignadas a sí mismo).
- **Sesión (Session)**: acceso autenticado emitido tras un login válido; porta el rol del usuario y
  condiciona el acceso a las funciones protegidas (FR-026, FR-028); finaliza con el logout (FR-029).
- **Decisión de revisión (Review Decision)**: resultado (aprobación/rechazo) que el supervisor
  registra sobre una ejecución enviada.
- **Reasignación (Reassignment)**: registro del cambio de técnico asignado realizado por un
  dispatcher.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un técnico completa el registro de una ejecución con evidencia en menos de 3 minutos.
- **SC-002**: El 95% de las consultas de órdenes se presentan al usuario en menos de 2 segundos.
- **SC-003**: Un supervisor puede revisar y decidir sobre una ejecución enviada en menos de 1 minuto.
- **SC-004**: El 100% de las ejecuciones enviadas incluyen al menos una foto de evidencia.
- **SC-005**: El 100% de las acciones que cambian el estado de una orden son atribuibles a un usuario
  identificado (auditable).
- **SC-006**: El 100% de los intentos de ejecutar una acción sin el rol autorizado son bloqueados.
- **SC-007**: El 100% de las ejecuciones enviadas incluyen ubicación y firma.
- **SC-008**: El 100% de las ejecuciones enviadas tienen registrado el tiempo dedicado al trabajo.
- **SC-010**: En el conjunto dorado de evaluación del resumen, el 0% de las afirmaciones del
  resumen carecen de respaldo en las notas (0 alucinaciones).
- **SC-011**: El sistema devuelve "evidencia insuficiente" en ≥95% de los casos dorados con
  evidencia insuficiente (abstención correcta).
- **SC-012**: El recall de puntos clave del resumen es ≥0.8 en el conjunto dorado.
- **SC-009**: Al abrir una ejecución para revisión, el supervisor dispone de un resumen de la
  incidencia sin tener que leer todas las notas del técnico.
- **SC-010**: Un usuario con credenciales válidas inicia sesión y llega a su pantalla inicial en
  menos de 1 minuto.
- **SC-011**: El 100% de los intentos de acceder a funciones protegidas sin sesión son bloqueados y
  redirigidos al login.

## Scope

### In Scope

- Registro de ejecución de órdenes por el técnico con evidencia fotográfica (JPEG, ≤10 MB, ≤15),
  ubicación, firma y tiempo dedicado al trabajo obligatorios.
- Reasignación de órdenes por el dispatcher (en cualquier momento antes de la aprobación).
- Revisión con aprobación/rechazo por el supervisor y reenvío tras rechazo.
- Consulta de órdenes por cada rol, viendo solo las asignadas a sí mismo.
- Asistente de resumen automático de la incidencia a partir de las notas del técnico.
- Registro de cliente, dirección, servicio, fecha y materiales (con cantidad y precio) por orden.
- Pantalla de inicio de sesión y autenticación de usuarios por rol, con cierre de sesión (US6).
- Control de acceso por rol y auditoría de acciones.

### Out of Scope (backlog — "eso lo vemos")

- Dashboard de métricas de productividad (se registra el tiempo de trabajo para habilitarlo a futuro).
- Notificaciones push a los técnicos.
- Alta y gestión de cuentas de usuario (se aprovisionan 3 usuarios de prueba, uno por rol; la política
  de contraseña —≥8 caracteres con mayúscula, número y carácter especial— se aplica en esa provisión).
- Recuperación/reseteo de contraseña ("olvidé mi contraseña").
- Bloqueo de cuenta por intentos fallidos de login.
- Accesibilidad/UI específica del login: idioma, uso en móvil de campo y modo offline.

## Assumptions

Decisiones confirmadas por el Product Owner (respuestas a las preguntas diferidas del
`.specify/memory/spec-open-questions.md`):

- **Ciclo de vida de la orden** (confirmado): Asignada → En ejecución → Enviada →
  (Aprobada | Rechazada); una orden Rechazada vuelve al técnico para corrección y reenvío.
- **Reasignación** (confirmado): permitida en cualquier momento **antes** de que la orden esté
  Aprobada; una orden Aprobada no se reasigna (FR-006).
- **Roles** (confirmado): exactamente tres — técnico, dispatcher, supervisor. No hay rol de cliente
  final ni admin.
- **Visibilidad de órdenes** (confirmado): cada usuario ve únicamente las órdenes asignadas a sí
  mismo; no puede ver las de otros usuarios (FR-010).
- **Evidencia** (confirmado): máximo 15 fotos, formato JPEG, hasta 10 MB cada una; ubicación y firma
  son obligatorias en el envío (FR-004, FR-014, FR-015).
- **Duración del trabajo** (confirmado): se registra el tiempo empleado en realizar el trabajo, para
  una futura feature de productividad (FR-016).
- **Rendimiento y seguridad** (confirmado): no aplica ninguna normativa de protección de datos por
  el momento; se mantiene acceso autenticado, control por rol y auditoría (FR-011, FR-012, FR-013).
  Los umbrales de rendimiento (SC-002/SC-003) son expectativas estándar de app web interactiva.
- **Modelo de la orden** (confirmado): cliente, dirección, servicio, fecha y, cuando aplique,
  materiales con cantidad y precio (FR-018).
- **Asistente de resumen de incidencia** (confirmado): forma parte del alcance de esta feature
  (US5, FR-017).
- **Inicio de sesión** (US6/FR-026…FR-029): login por usuario/contraseña con sesión que porta el rol
  (mecanismo JWT ya decidido en `research.md` Q-A y ADR-0001). Decisiones confirmadas por el PO:
  - **Mensaje de credenciales inválidas**: genérico, no distingue usuario de contraseña (FR-027).
  - **Logout**: explícito y visible para el usuario (FR-029).
  - **Expiración de sesión / "recordarme"**: detalle técnico del JWT, sin requisito de producto.
  - **Política de contraseña**: mínimo 8 caracteres, con al menos una mayúscula, un número y un
    carácter especial. Se aplica al establecer/provisionar contraseñas (fuera de esta feature; ver
    Out of Scope); el login solo valida credenciales.
  - **Provisión de usuarios de prueba**: se aprovisionarán 3 usuarios (uno por rol: técnico,
    dispatcher, supervisor) para pruebas; el alta/gestión de cuentas queda fuera de esta feature.
