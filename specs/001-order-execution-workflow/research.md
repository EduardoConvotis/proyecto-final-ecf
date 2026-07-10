# Phase 0 Research: Ejecución y Revisión de Órdenes de Trabajo

Consolida las decisiones técnicas (de los ADR en `docs/adr/`) y resuelve las preguntas abiertas que
dejó la propuesta de arquitectura. Formato por decisión: **Decisión / Rationale / Alternativas**.

## Decisiones consolidadas (desde ADRs)

### D1. Gestión del monorepo — npm workspaces (ADR-0002)
- **Decisión**: `frontend/` y `backend/` como npm workspaces; sin Nx/Turborepo.
- **Rationale**: Simplicidad y YAGNI (Principio II); dos workspaces no justifican tooling pesado.
- **Alternativas**: Nx/Turborepo (más caché/generadores, pero complejidad no necesaria aún).

### D2. Contract-first — OpenAPI 3.1 + codegen (ADR-0003)
- **Decisión**: `contracts/openapi.yaml` como fuente de verdad; `openapi-typescript` genera tipos y
  `express-openapi-validator` valida requests/responses contra el contrato.
- **Rationale**: Principio VII; tipos derivados, no divergentes (Principio I).
- **Alternativas**: tipos a mano (deriva), tRPC (acopla front-back, rompe contract-first).

### D3. Logging estructurado — Pino (ADR-0004)
- **Decisión**: Pino con middleware HTTP y redacción de campos sensibles.
- **Rationale**: Principio V; JSON estructurado, rápido, sin PII en claro.
- **Alternativas**: Winston (más pesado), console (no estructurado).

### D4. Persistencia — PostgreSQL + Prisma (ADR-0005)
- **Decisión**: PostgreSQL vía Prisma; auditoría transaccional (FR-012/FR-013).
- **Rationale**: Modelo relacional claro (orden, ejecución, materiales, auditoría); tipos generados
  encajan con TS estricto.
- **Alternativas**: TypeORM (menos type-safe), Mongo (relaciones/transacciones menos naturales).

### D5. Almacenamiento de evidencias fuera de la BD (ADR-0006)
- **Decisión**: fotos en almacén de archivos tras un adaptador; la BD guarda metadatos/referencias.
- **Rationale**: hasta 15 fotos ×10 MB por ejecución no deben vivir en la BD relacional.
- **Alternativas**: BLOBs en Postgres (hinchazón, backups costosos).

### D6. Componente de IA como contrato + eval-gate (ADR-0007 + ADR-0009)
- **Decisión**: FR-017 tras una interfaz de dominio `IncidentSummarizer` intercambiable (ADR-0007),
  especificada como **contrato** en `contracts/ai/incident-summary.contract.md` (entradas/salidas,
  regla de **abstención** ante evidencia insuficiente [FR-023], **grounding** de cada punto clave en
  las notas [FR-024], y **failure mode**/fallback [FR-025]) y validada por una **eval de golden
  cases** con umbrales en `evals/incident-summary/` como puerta de calidad (ADR-0009).
- **Rationale**: aísla el proveedor concreto; hace verificable un componente no determinista mediante
  eval (Principio IV) en lugar de tests unitarios frágiles; permite fallback y test sin llamadas
  externas.
- **Alternativas**: llamada directa al SDK en el handler (acopla, no verificable); solo tests
  unitarios (insuficiente para salida no determinista).

### D7. Test runners (ADR-0008)
- **Decisión**: Vitest en backend (`domain/` test-first); runner nativo de Angular en frontend.
- **Rationale**: Principio IV; rápido y sin configuración extra.

## Preguntas abiertas resueltas (defaults para desbloquear el plan)

### Q-A. Mecanismo de autenticación y login (RESUELTO — ADR-0001 + ADR-0010)
- **Decisión**: sesión autenticada con **JWT** emitido por el backend tras login usuario/contraseña;
  el rol (técnico/dispatcher/supervisor) viaja como claim (`sub`, `role`) y alimenta el RBAC
  (ADR-0001). Contraseñas hasheadas con **bcrypt** en la provisión; **login screen** en
  `features/auth/` (US6, FR-026…FR-029); mensaje **401 genérico** ante credenciales inválidas
  (FR-027); **logout stateless** sin blacklist (ADR-0010).
- **Alcance confirmado por el PO**: alta de cuentas fuera de la feature (3 usuarios semilla, uno por
  rol); sin recuperación de contraseña, sin lockout, sin accesibilidad/offline específicos del login;
  política de contraseña (≥8, mayúscula+número+especial) aplicada en la provisión.
- **Rationale**: default estándar de app web; YAGNI en refresh/blacklist/lockout (Principio II).
- **Marca**: **TTL del JWT** = detalle de configuración (no de arquitectura), a fijar en despliegue;
  no bloquea el plan.

### Q-B. Proveedor/modelo de IA y fallback (FR-017, FR-023…FR-025)
- **Decisión**: proveedor concreto **diferido**; se implementa contra la interfaz `IncidentSummarizer`
  (ADR-0007) conforme al contrato de IA. Comportamiento fijado y verificable por eval (ADR-0009):
  **abstención** con `status=insufficient_evidence` si las notas no bastan (FR-023), **grounding** de
  cada punto clave a un fragmento de nota (FR-024), y **fallback** a notas crudas + registro del
  fallo si el proveedor no responde (FR-025), sin bloquear la revisión.
- **Rationale**: no acoplar el ciclo de revisión a un servicio externo; cumple US5 con degradación
  elegante y salida verificable.
- **Marca**: elegir proveedor/modelo concreto antes de implementar el adaptador real (decisión de
  negocio); el contrato y la eval no cambian al cambiar de proveedor.

### Q-C. Hosting de PostgreSQL y almacén de evidencias en producción
- **Decisión**: **diferido a despliegue**; en desarrollo, Postgres local/contenedor y almacén de
  archivos local tras el adaptador (ADR-0006). No afecta al diseño de dominio ni al contrato.
- **Rationale**: la feature no depende del proveedor de hosting; se decide en la fase de operación.

### Q-D. 403 vs 404 en fallo de ownership/rol (FR-010, FR-019…FR-022)
- **Decisión**: **403 Forbidden** cuando el actor está autenticado pero no autorizado por rol
  (FR-019…FR-022); para ownership (FR-010) el listado simplemente **no incluye** órdenes ajenas y el
  acceso directo a una orden ajena responde **404** (no revelar existencia). Se fija en ADR-0001.
- **Rationale**: distingue "no puedes por rol" (403) de "no es tuyo / no existe para ti" (404),
  evitando fuga de existencia de recursos.
- **Marca**: pendiente de aceptar ADR-0001 (Proposed).

## Salida
Todas las incógnitas del Technical Context quedan resueltas o explícitamente diferidas con default
seguro. Listo para Fase 1 (data-model, contrato, quickstart).
