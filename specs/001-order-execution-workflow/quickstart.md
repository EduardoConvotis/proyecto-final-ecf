# Quickstart / Validación: Ejecución y Revisión de Órdenes de Trabajo

Guía de validación end-to-end que prueba que la feature funciona. Los detalles de modelo y contrato
están en [data-model.md](./data-model.md) y [contracts/openapi.yaml](../../contracts/openapi.yaml);
aquí solo escenarios ejecutables y resultados esperados.

## Prerequisitos

- Node.js LTS + npm (workspaces).
- PostgreSQL disponible (local/contenedor) y almacén de archivos para evidencias (local en dev).
- Variables de entorno: cadena de conexión de BD, secreto JWT, ruta/credenciales del almacén de
  evidencias, config del proveedor de resumen (opcional; sin él aplica el fallback).

## Setup (una vez)

```bash
npm install                          # instala workspaces frontend + backend
npm run gen:api        --workspace backend   # genera tipos desde contracts/openapi.yaml
npm run gen:api        --workspace frontend  # genera cliente tipado desde el mismo contrato
npm run db:migrate     --workspace backend   # aplica el esquema Prisma
npm run db:seed        --workspace backend   # provisiona 3 usuarios de prueba (uno por rol; bcrypt)
npm run dev            # levanta backend (Express) + frontend (Angular)
```

## Comprobaciones de puertas de la constitución

```bash
npm run typecheck   # tsconfig strict en ambos workspaces (Principio I)
npm test            # tests unitarios test-first: dominio (Vitest) + frontend (Principio IV)
npm run lint        # incluye eslint-plugin-tailwindcss (Principio VIII)
npm run contract:validate  # el arranque valida requests/responses vs OpenAPI (Principio VII)
npm run eval:incident-summary  # eval-gate de golden cases del resumen IA (ADR-0009, FR-023/024/025)
```

## Escenarios de validación (mapeados a historias/FR)

### E0 — Login y logout (US6 · FR-026/027/028/029) — prerequisito
1. Abrir la pantalla de login. Con credenciales válidas de un usuario semilla → **200** con sesión
   JWT que porta el rol; se accede a la pantalla inicial (SC-010).
2. Con credenciales inválidas (usuario inexistente **o** contraseña incorrecta) → **401** con mensaje
   **genérico** idéntico en ambos casos, sin sesión (FR-027, EC-015).
3. Sin sesión, invocar cualquier función protegida (p. ej. `GET /orders`) → **401**/redirección a
   login (FR-028, EC-016, SC-011).
4. `POST /auth/logout` → **204**; reintentar función protegida con la sesión anterior → requiere
   login de nuevo (FR-029).

### E1 — MVP: técnico registra ejecución (US1 · FR-002/003/004/014/015/016)
1. Login como técnico con una orden `Asignada`.
2. `POST /orders/{id}/execution` con 1–15 fotos JPEG (≤10 MB), ubicación, firma y duración.
3. **Esperado**: 201; la orden pasa a `Enviada`.
4. Reintentar sin fotos → **400** (FR-003); sin ubicación o firma → **400** (FR-015); foto no JPEG o
   >10 MB → **400** (FR-014). La orden no cambia de estado.

### E2 — Supervisor revisa y decide (US2 · FR-007/008/009 + resumen US5/FR-017/023/024/025)
1. Login como supervisor. `GET /orders/{id}/review` → **200** con `incidentSummary`:
   - notas suficientes → `status=ok` y `keyPoints[]` con `sourceNoteFragment` (grounding, FR-024).
   - notas vacías/insuficientes → `status=insufficient_evidence`, sin contenido fabricado (FR-023,
     EC-012/013).
   - proveedor caído → `status=provider_failed`, se muestran las notas crudas y se registra el fallo,
     sin bloquear la revisión (FR-025, EC-014).
2. `POST /orders/{id}/review` con `outcome=approve` → **200**; orden `Aprobada`.
3. En otra orden `Enviada`, `outcome=reject` → **200**; orden `Rechazada` y reenviable por el técnico.

### E3 — Dispatcher reasigna (US3 · FR-005/006)
1. Login como dispatcher. `POST /orders/{id}/reassignment` con `toTechnicianId` en una orden no
   aprobada → **200**; técnico asignado cambia; queda registro de reasignación.
2. Intentar reasignar una orden `Aprobada` → **403** (FR-006); técnico sin cambios.

### E4 — Visibilidad por usuario (US4 · FR-010)
1. Login como técnico. `GET /orders` → solo sus órdenes asignadas.
2. `GET /orders/{idAjena}` de una orden de otro → **404** (no se revela existencia).
3. Usuario sin órdenes → `GET /orders` devuelve lista vacía, sin error.

### E5 — Denegación por rol (FR-011/019/020/021/022)
1. Técnico intenta `POST /orders/{id}/reassignment` → **403** (FR-019).
2. Técnico/dispatcher intenta `GET`/`POST /orders/{id}/review` → **403** (FR-020/021/022); estado sin
   cambios.

### E6 — Auditoría y logging (FR-012/013 · Principio V)
1. Tras E1–E3, verificar que existen entradas de auditoría (actor, acción, recurso, timestamp) para
   envío, reasignación, aprobación y rechazo.
2. Verificar logs estructurados (JSON) sin secretos/PII en claro.

### E7 — Eval-gate del resumen de incidencia (FR-023/024/025 · ADR-0009)
1. `npm run eval:incident-summary` ejecuta los golden cases de `evals/incident-summary/`.
2. **Esperado**: se cumplen los umbrales de grounding/abstención; los casos de notas insuficientes
   devuelven `insufficient_evidence` y los de proveedor caído activan el fallback. La puerta falla el
   build si no se alcanzan los umbrales.

## Criterios de éxito verificados
E0→SC-010/011 (login/acceso protegido); E1→SC-001/004/007/008; E2→SC-003/009; E4→SC-002; E5→SC-006;
E6→SC-005; E7→SC-009 (calidad del resumen).
