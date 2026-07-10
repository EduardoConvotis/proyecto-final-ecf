# Quality Checklist — Feature 001 (Polish, Fase 9)

Verificación transversal de cierre. Marca lo verificable por inspección de código; lo que exige
sistema en ejecución se valida con `quickstart.md` (E0–E7) una vez levantado el stack.

## T063 — Validación end-to-end (quickstart)
Los escenarios `E0`–`E7` de [`../specs/001-order-execution-workflow/quickstart.md`](../specs/001-order-execution-workflow/quickstart.md)
cubren login/logout (E0), registro de ejecución (E1), revisión + resumen (E2), reasignación (E3),
visibilidad (E4), denegación por rol (E5), auditoría/logging (E6) y eval-gate (E7). La ejecución
E2E real requiere `npm install` + PostgreSQL + `npm run dev` (ver quickstart). **Pendiente de correr
en un entorno con toolchain.**

## Eval-gate del resumen de incidencia — ⚠️ rojo esperado (pendiente de proveedor)
El `eval:incident-summary` pasa 4/5 golden cases. `gc-005` (notas con longitud suficiente pero **sin
incidencia identificable**) exige abstención por FR-023, pero el adaptador *stopgap* determinista
solo evalúa la longitud de las notas. Detectar "no hay incidencia" requiere el **proveedor de IA
real** (decisión diferida, ADR-0007). El gate se ejecuta en CI con `continue-on-error: true` hasta
que se integre el proveedor; entonces debe volverse bloqueante y pasar 5/5.

## T064 — Gate contract-first en CI ✅
`.github/workflows/ci.yml` ejecuta `gen:api` (tipos derivados del contrato), `typecheck`, `lint`,
`test` y el `eval:incident-summary` en cada push/PR. Ningún endpoint puede divergir del contrato sin
fallar la CI (Principio VII).

## T065 — Cobertura de auditoría / logging estructurado ✅
Todas las operaciones que cambian estado registran auditoría vía `recordAudit` (Principio V, FR-012/013):
- login éxito/fallo y logout (`api/auth.ts`)
- envío de ejecución (`api/execution.ts`)
- apertura de revisión, aprobación y rechazo (`api/review.ts`)
- reasignación (`api/reassign.ts`)
- listado de órdenes (`api/orders.ts`)
El logger Pino (`infrastructure/logger.ts`) redacta `authorization`, `password`, `passwordHash` y
`token` → nunca se registran secretos en claro.

## T066 — Accesibilidad / responsive (pantallas Tailwind) ✅ (inspección)
- Todos los inputs tienen `<label>` asociado; foco visible con `focus:ring` (login, ejecución,
  reasignación).
- Mensajes de error/estado usan `role="alert"` / `role="status"`.
- Layouts fluidos (`max-w-*`, `flex`, `flex-col`) sin anchos fijos → responsive.
- Sin `!important` ni valores arbitrarios; colores/espaciado desde tokens de `tailwind.config.ts`
  (Principio VIII).
- **Pendiente**: verificación de contraste con herramienta (axe/Lighthouse) al levantar el frontend.

## T067 — TTL del JWT como configuración ✅
`JWT_TTL` documentado en `backend/.env.example` y consumido por `middleware/auth.ts`
(`process.env.JWT_TTL ?? '8h'`). Decisión: detalle de configuración, no de negocio (ADR-0010).

## T068 — Versionado SemVer inicial ✅
`0.1.0` en `package.json` raíz, `backend/package.json`, `frontend/package.json` y en
`contracts/openapi.yaml` (`info.version`). Cambios incompatibles del contrato ⇒ MAJOR (Principio VI, VII).
