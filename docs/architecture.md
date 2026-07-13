# FieldOps — Arquitectura propuesta

**Estado del repositorio al proponer esta arquitectura (2026-07-10, primera versión)**: greenfield.
No existía código de aplicación (`frontend/`, `backend/`, `contracts/`, `package.json`,
`tsconfig.json`); solo tooling de desarrollo (`.specify/`, `.claude/`, `tools/mcp/`) y
documentación (`docs/`, `specs/`).

**Estado revisado en la regeneración (2026-07-10, previa a `/speckit-plan`)**: sigue sin existir
código de aplicación (no hay `package.json` ni `tsconfig.json` en `frontend/`/`backend/`), pero el
scaffold avanzó: `contracts/openapi.yaml` ya existe (contrato inicial de las operaciones FR-002…
FR-009, FR-017/019…025), y `contracts/ai/incident-summary.contract.md` + `evals/incident-summary/`
documentan el contrato del asistente de IA (ADR-0009). Esta revisión confirma que la arquitectura
y los ADR siguen vigentes frente a la constitución v1.2.0 y la spec 001; no se detectó ninguna
decisión que deba cambiar, solo se actualizan referencias de estado (ver `docs/adr/README.md`,
changelog).

**Segunda regeneración (2026-07-10, refresh tras añadir US6 — login/autenticación)**: la spec
incorporó FR-026…FR-029 (login, credenciales inválidas, redirección si no autenticado, logout) y
`contracts/openapi.yaml` ya declara `POST /auth/login` / `POST /auth/logout`. El mecanismo de
autenticación (JWT tras usuario/contraseña, rol como claim) ya estaba decidido en `research.md`
(Q-A) y en ADR-0001; no se reabre. Esta revisión hace **explícita** la frontera de login/logout
que antes era implícita (login screen en frontend, middleware de emisión/validación de JWT en
backend) y añade **ADR-0010** para las piezas genuinamente nuevas: hashing de contraseñas en
provisión (bcrypt) y logout stateless (sin blacklist, sin requisito que lo exija). Ver §2.1, §2.2,
§3.3 y `docs/adr/README.md` (changelog).

**Tercera regeneración (2026-07-13, previa a `/speckit-plan` de `002-cicd-pipeline`)**: repositorio
**existente** (no greenfield) — ya hay `frontend/`, `backend/`, `contracts/openapi.yaml` y un
`.github/workflows/ci.yml` consolidado. Se añade la §7 (CI/CD Pipeline) para gobernar cómo el
código fluye de `feature/*` a producción, bajo la constitución **separada**
`.specify/memory/pipeline-constitution.md` v1.1.0. Esta sección no modifica ninguna decisión de
las §1–6 (arquitectura de aplicación de la feature 001); se añaden ADR-0011…ADR-0015 (ver
`docs/adr/README.md`, changelog).

**Constitución trazada**: v1.2.0 (`.specify/memory/constitution.md`) para la arquitectura de
aplicación (§1–6); v1.1.0 (`.specify/memory/pipeline-constitution.md`) para la arquitectura de
CI/CD (§7).
**Feature que motiva esta propuesta**: `specs/001-order-execution-workflow/spec.md` (ejecución y
revisión de órdenes de trabajo) para §1–6; `specs/002-cicd-pipeline/pipeline-specify.md` (flujo de
CI/CD gobernado) para §7.
**Decisiones de detalle**: ver `docs/adr/` (índice en `docs/adr/README.md`). Este documento resume
la arquitectura; los ADR documentan cada decisión significativa y su alternativa descartada.

---

## 1. Contexto y drivers

### 1.1 Qué exige la spec (001-order-execution-workflow)

- Un técnico registra la ejecución de una orden con evidencia fotográfica obligatoria (JPEG,
  ≤10 MB, hasta 15), ubicación, firma y tiempo dedicado (FR-002…FR-004, FR-014…FR-016).
- Un dispatcher reasigna órdenes antes de que estén Aprobadas (FR-005, FR-006, FR-019).
- Un supervisor revisa, aprueba o rechaza (FR-007…FR-009, FR-020…FR-022), apoyado por un resumen
  automático de incidencia generado a partir de las notas del técnico (FR-017, US5).
- Cada usuario ve solo sus propias órdenes (FR-010); exactamente tres roles (FR-011).
- Acceso autenticado y auditado de principio a fin (FR-012, FR-013).
- El modelo de orden incluye cliente, dirección, servicio, fecha y materiales (FR-018).
- **Login/logout (US6)**: un usuario inicia sesión con usuario/contraseña y obtiene una sesión que
  porta su rol (FR-026); credenciales inválidas devuelven un error genérico (FR-027); cualquier
  acceso no autenticado a una función protegida redirige a login (FR-028, coherente con FR-012);
  el usuario puede cerrar sesión explícitamente (FR-029). Provisión de cuentas, recuperación de
  contraseña, bloqueo por intentos y accesibilidad/offline del login quedan **fuera de alcance**
  (decisión de producto confirmada); la política de contraseña (≥8 car., mayúscula+número+especial)
  se aplica en la provisión, no en esta feature.
- Fuera de alcance ahora (backlog): dashboard de métricas y notificaciones push.

### 1.2 Qué exige la constitución (v1.2.0)

| Principio | Exigencia arquitectónica directa |
|-----------|-----------------------------------|
| I. TypeScript Estricto | `strict: true` en todo `tsconfig.json`; tipos derivados, no `any`. |
| II. Simplicidad/YAGNI | Sin capas, servicios o dependencias sin justificación frente a los requisitos actuales. |
| III. Trazabilidad SDD | Todo módulo/endpoint/test debe señalar su `FR-XXX` de origen. |
| IV. Test-First (TDD) | Cada módulo de dominio y cada operación de API nace con test primero (unitario). |
| V. Observabilidad | Logging estructurado JSON en backend; sin secretos/PII en claro. |
| VI. SemVer | Versión de paquetes y de cambios incompatibles del contrato. |
| VII. Contract-First | `contracts/openapi.yaml` (OpenAPI 3.1) es la única fuente de verdad; tipos derivados. |
| VIII. Tailwind CSS | Único sistema de estilos del frontend Angular; tokens centralizados en `theme`. |

Estos dos conjuntos (spec + constitución) son los **únicos** insumos de diseño. No se añade nada
que no derive de uno de ellos (Principio II).

---

## 2. Vista de arquitectura (componentes y capas)

```
┌───────────────────────────┐        contrato compartido         ┌───────────────────────────┐
│   frontend/ (Angular)     │◄──────────────────────────────────►│   backend/ (Express)      │
│                           │        contracts/openapi.yaml       │                           │
│  core/  (auth, http,      │   (OpenAPI 3.1, fuente de verdad)   │  api/         (routers)   │
│   logging interceptor)   │                                      │  domain/      (reglas)    │
│  features/ (US1..US5)     │   → openapi-typescript genera:      │  infrastructure/ (Prisma, │
│  shared/  (design system  │     - tipos + cliente HTTP (FE)     │   storage, logger)        │
│   basado en tokens        │     - tipos de request/response(BE) │  middleware/  (auth, RBAC,│
│   Tailwind)               │                                      │   error, request-log)    │
└───────────────────────────┘                                      └─────────────┬─────────────┘
                                                                                  │
                                                                     ┌────────────▼────────────┐
                                                                     │  PostgreSQL (Prisma)     │
                                                                     │  - work orders           │
                                                                     │  - execution records     │
                                                                     │  - audit trail           │
                                                                     └────────────┬────────────┘
                                                                                  │
                                                                     ┌────────────▼────────────┐
                                                                     │  Almacén de evidencias   │
                                                                     │  (adaptador de storage;  │
                                                                     │  disco local en dev)     │
                                                                     └──────────────────────────┘
                                                                                  │
                                                                     ┌────────────▼────────────┐
                                                                     │  Proveedor de resumen    │
                                                                     │  de incidencia (IA),     │
                                                                     │  tras interfaz propia     │
                                                                     └──────────────────────────┘
```

### 2.1 Frontend (Angular, Tailwind)

- **`core/`**: interceptor HTTP (adjunta el token, mapea 401/403 del contrato), guard de
  autenticación que redirige a login si no hay token válido (FR-028) y guards de ruta por rol
  (defensa en profundidad — la autoridad real es el backend, ver ADR-0001 y ADR-0010), interceptor
  de logging de errores de cliente. El guard de autenticación también limpia el token al recibir un
  401 (sesión expirada), redirigiendo a login.
- **`features/auth/`**: pantalla de login (usuario/contraseña, FR-026), manejo del mensaje genérico
  de credenciales inválidas (FR-027) y acción de logout explícita y visible (FR-029) — construida
  con los mismos componentes/tokens Tailwind que el resto de `shared/` (Principio VIII, ver
  ADR-0010 §6). No hay pantalla de registro ni de recuperación de contraseña (fuera de alcance).
- **`features/`**: un módulo/standalone-feature por historia de usuario (login, envío de ejecución,
  revisión, reasignación, mis órdenes, resumen de incidencia), cada uno trazable a su `FR-XXX`.
- **`shared/`**: componentes de UI reutilizables construidos con clases utilitarias de Tailwind
  sobre los tokens del `theme` (Principio VIII) — p. ej. tarjeta de orden, badge de estado,
  formulario de firma/ubicación, visor de evidencia.
- Los tipos de request/response y el cliente HTTP del frontend se **generan** desde
  `contracts/openapi.yaml` (ver ADR-0003); nunca se escriben tipos de API a mano.

### 2.2 Backend (Express)

- **`api/`**: routers finos, uno por recurso del contrato (órdenes, ejecuciones, reasignaciones,
  revisiones, **auth** — `POST /auth/login`, `POST /auth/logout`, FR-026…FR-029). Validan la
  request contra el esquema OpenAPI (`express-openapi-validator`) antes de llegar al dominio.
- **`domain/`**: reglas de negocio puras y testeables por historia de usuario (transiciones de
  estado de la orden, validación de evidencia/ubicación/firma, reglas de reasignación,
  aprobación/rechazo). Sin dependencias de Express ni de Prisma — se testean unitariamente
  aislados (Principio IV).
- **`middleware/`**: capa **única y centralizada** de política de autorización (autenticación →
  rol → ownership, según ADR-0001), incluido el sub-módulo `auth.ts` que **emite** el JWT tras
  login válido y lo **valida** en cada request protegida (firma + expiración, ADR-0010); manejador
  de errores con forma de respuesta estándar; logging de requests con `pino` (ADR-0004).
- **`infrastructure/`**: adaptadores concretos — Prisma/PostgreSQL (ADR-0005), almacén de
  evidencias (ADR-0006), cliente del proveedor de resumen de incidencia (ADR-0007). El dominio
  depende de **interfaces**, no de estos adaptadores directamente, para poder testear el dominio
  sin infraestructura real (Principio IV, sin sobre-diseñar: son interfaces mínimas, no un
  framework de DI).

### 2.3 Contrato (`contracts/openapi.yaml`)

Única fuente de verdad de la API (Principio VII). Cada operación:
- trae su `FR-XXX` en la descripción/extensión, para trazabilidad (Principio III);
- declara `security` y `x-required-roles` (ver ADR-0001, `docs/security/rbac-matrix.md`);
- declara los esquemas 401/403/422 con forma de error estándar (ver §3.3).

### 2.4 Persistencia y almacenamiento

- **PostgreSQL vía Prisma** (ADR-0005) para el modelo relacional de órdenes, ejecuciones,
  reasignaciones y auditoría — encaja con la necesidad de integridad transaccional y consultas de
  auditoría (FR-012, FR-013, FR-018).
- **Evidencias fotográficas** (JPEG ≤10 MB, ≤15 por envío) se guardan en un almacén de archivos
  detrás de un adaptador (`infrastructure/storage`), no como BLOB en la base de datos (ADR-0006).

### 2.5 Asistente de resumen de incidencia (FR-017)

Se aísla tras una interfaz de dominio (`IncidentSummaryProvider`) implementada por un adaptador de
infraestructura concreto (ADR-0007). El dominio no conoce el proveedor de IA concreto —
solo el contrato de la interfaz—, lo que permite sustituir el proveedor sin tocar reglas de
negocio ni el contrato OpenAPI expuesto al frontend.

---

## 3. Cross-cutting concerns

### 3.1 Contract-first (Principio VII)

Flujo obligatorio para cualquier tarea que toque la API: **1)** editar/crear la operación en
`contracts/openapi.yaml` → **2)** regenerar tipos (frontend y backend) → **3)** implementar
routers/servicios/UI contra esos tipos generados → **4)** test de conformidad contra el contrato.
Herramientas concretas: ver ADR-0003.

### 3.2 Observabilidad (Principio V)

Logging estructurado (JSON) en cada request del backend: correlación por `requestId`, actor,
acción, recurso y resultado — alimenta el rastro auditable de FR-012/FR-013. Nunca se loguean
contraseñas/tokens/PII en claro (se redactan campos sensibles). Ver ADR-0004.

### 3.3 Auth / RBAC / ownership (FR-011, FR-019…FR-022, FR-026…FR-029)

Ver ADR-0001 (RBAC + ownership) y `docs/security/rbac-matrix.md` (fuente única de la matriz de
permisos); ambos se reutilizan sin reabrir. La frontera de **login/logout** (US6) se hace explícita
en ADR-0010: emisión/validación de JWT, hashing de contraseñas en provisión y logout stateless.
Punto de aplicación único en `backend/src/middleware/` (autenticación → rol → ownership); la
pantalla de login/logout vive en `frontend/src/app/features/auth/` como defensa en profundidad.

### 3.4 Auditoría (FR-013)

Cada acción que cambia estado (envío, reasignación, aprobación, rechazo) escribe una entrada de
auditoría (actor, acción, recurso, timestamp) en la misma transacción que el cambio de estado —
evita el escenario "el estado cambió pero no quedó auditado".

### 3.5 Tailwind / diseño (Principio VIII)

Un único `tailwind.config` en `frontend/` con `theme.extend` para colores, tipografía, espaciado y
breakpoints (sin valores mágicos en componentes). Los patrones de UI repetidos (tarjeta de orden,
badge de estado, formulario de evidencia) se extraen a componentes Angular reutilizables en
`shared/` antes de duplicar clases. No hay ADR dedicado a "usar Tailwind" (ya es principio
constitucional no discutible); si se decide una herramienta de integración concreta más allá de la
config estándar de Angular CLI, se documentará entonces.

---

## 4. Estructura de carpetas objetivo (monorepo)

```
fieldOps/
├── frontend/                      # Angular (última estable), Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/              # auth (guard/interceptor JWT), interceptores HTTP, guards de ruta (defensa en profundidad)
│   │   │   ├── features/          # un directorio por historia de usuario (US1..US6, incl. auth/login)
│   │   │   └── shared/            # componentes UI reutilizables sobre tokens Tailwind
│   │   └── environments/
│   ├── tailwind.config.ts         # tokens centralizados (Principio VIII)
│   └── tsconfig.json              # strict: true (Principio I)
│
├── backend/                       # Node.js + Express (última estable)
│   ├── src/
│   │   ├── api/                   # routers finos por recurso del contrato (incl. auth: login/logout)
│   │   ├── domain/                # reglas de negocio puras, testeadas unitariamente
│   │   ├── infrastructure/        # adaptadores: Prisma, storage de evidencias, proveedor IA
│   │   ├── middleware/            # auth (emisión/validación JWT, ADR-0010) + RBAC+ownership (ADR-0001), logging estructurado, errores
│   │   └── generated/             # tipos derivados de contracts/openapi.yaml (no editar a mano)
│   └── tsconfig.json               # strict: true (Principio I)
│
├── contracts/
│   └── openapi.yaml               # única fuente de verdad de la API (Principio VII)
│
├── docs/
│   ├── architecture.md            # este documento
│   ├── adr/                       # decisiones de arquitectura (una por decisión significativa)
│   └── security/
│       └── rbac-matrix.md         # matriz de permisos (fuente única de autorización)
│
└── specs/
    └── 001-order-execution-workflow/
```

No se introduce un paquete `packages/shared` ni un workspace de tipos comunes: frontend y backend
derivan **cada uno por separado** sus tipos desde `contracts/openapi.yaml` (ver ADR-0003). Añadir
un paquete compartido hoy sería complejidad especulativa sin un segundo consumidor real
(Principio II).

---

## 5. Mapeo de principios → elementos de arquitectura

| Elemento arquitectónico | Principio(s) que satisface |
|--------------------------|------------------------------|
| `tsconfig.json` con `strict: true` en `frontend/` y `backend/` | I |
| Ausencia de `packages/shared`; interfaces mínimas en `domain/` | II |
| `FR-XXX` referenciado en operaciones del contrato, módulos de dominio y tests | III |
| `domain/` sin dependencias de infraestructura, testeado aislado, test-first | IV |
| `middleware/` de logging estructurado (`pino`, ADR-0004) | V |
| Contrato OpenAPI versionado + regla de MAJOR ante cambio incompatible | VI, VII |
| `contracts/openapi.yaml` como fuente de verdad + codegen (ADR-0003) | VII |
| `middleware/` centralizado de autorización RBAC + ownership (ADR-0001) | III, V, VII |
| `middleware/auth.ts` (emisión/validación JWT, hashing bcrypt en provisión, logout stateless, ADR-0010) | I, II, III, V, VII |
| `features/auth/` (pantalla de login/logout con componentes Tailwind, ADR-0010 §6) | VIII |
| `tailwind.config.ts` con tokens centralizados + componentes reutilizables en `shared/` | VIII |
| Adaptador de storage de evidencias fuera de la base relacional (ADR-0006) | II (simplicidad de la BD), FR-004/FR-014 |
| Adaptador `IncidentSummaryProvider` desacoplado del dominio (ADR-0007) | II, FR-017 |
| PostgreSQL + Prisma para auditoría transaccional (ADR-0005) | V, FR-012/FR-013 |

---

## 6. Preguntas abiertas (arquitectura de aplicación, feature 001)

- ✅ **RESUELTO (2026-07-10, US6).** Mecanismo de login/emisión de token: JWT tras
  usuario/contraseña propio (ver `research.md` Q-A y ADR-0010); no hay IdP externo en alcance.
  Provisión de cuentas confirmada fuera de esta feature (3 usuarios semilla, uno por rol).
- **TTL concreto del JWT**: detalle de configuración (no de arquitectura); a fijar en
  `/speckit-plan` (ver ADR-0010, open question).
- **Proveedor concreto del resumen de incidencia (IA)**: se decide la *interfaz* (ADR-0007) pero no
  el proveedor/modelo específico (¿servicio externo? ¿modelo local?) — pendiente de decisión de
  producto/costo.
- **Entorno de despliegue de PostgreSQL y del almacén de evidencias en producción** (self-hosted vs
  gestionado/cloud): fuera del alcance de esta propuesta; no hay requisito de la spec que lo fije.
- **Código de respuesta para fallo de ownership (403 vs 404)**: ya identificado como open question
  en ADR-0001; no se duplica aquí, solo se referencia.

---

## 7. CI/CD Pipeline (feature 002-cicd-pipeline)

**Estado del repositorio para esta propuesta (2026-07-13)**: existente, no greenfield. Ya hay
`frontend/`, `backend/`, `contracts/openapi.yaml` y un único workflow consolidado
(`.github/workflows/ci.yml`) que hace de puerta de calidad genérica sobre `push: main` y
`pull_request` (sin distinguir componente ni rama `develop`). Esta sección **no** rediseña la
arquitectura de aplicación de las secciones 1–6; propone la arquitectura de **entrega continua**
que gobierna cómo ese código llega de `feature/*` a producción, y sustituirá conceptualmente a
`ci.yml` por los 6 workflows descritos abajo (la escritura del YAML es tarea del plan/tasks, no de
esta propuesta).

### 7.1 Contexto y drivers

- **Constitución que gobierna esta feature**: `.specify/memory/pipeline-constitution.md` v1.1.0,
  Principios I–VIII (ramas, independencia de componentes, puertas de PR, CI+deploy a dev, release
  gobernado a prod, inmutabilidad, verificabilidad previa, rollback gobernado).
- **Constitución de proyecto**: `.specify/memory/constitution.md` v1.2.0 — Contract-First (VII,
  puertas Spectral/oasdiff sobre `contracts/openapi.yaml`), SemVer (VI), Observabilidad (V, logs de
  los propios workflows/jobs siguen siendo estructurados donde aplique).
- **Spec**: `specs/002-cicd-pipeline/pipeline-specify.md`, FR-001…FR-017 (+FR-003b/FR-010b), 5
  historias de usuario.
- **Decisiones ya fijadas por el usuario** (no se reabren, solo se documentan y ADRan): GitHub
  Actions como orquestador; GHCR como registro
  (`ghcr.io/<org>/<repo>/fieldops-<componente>:<version>`, auth vía `GITHUB_TOKEN` inyectado,
  `permissions: packages: write`); exactamente 6 workflows; matriz de puertas fija por componente;
  aislamiento por componente vía detección de cambios por rutas; build-once/promote; gate de
  constitución fail-closed (FR-017).

### 7.2 Topología: 6 workflows

Cada componente (frontend, backend) tiene su propio conjunto de 3 workflows, sin dependencias
cruzadas de orquestación (Principio II, pipeline-constitution — independencia). El contrato
(`contracts/openapi.yaml`) es una ruta **compartida**: un cambio en él dispara **ambos** pipelines
del componente correspondiente a esa etapa, ya que ambos consumen el contrato (frontend vía tipos
generados, backend vía validación de esquema) — esto realiza FR-004 también para cambios que solo
tocan el contrato.

| # | Workflow (propuesto) | Trigger | Paths | Jobs (gate matrix, ver 7.4) |
|---|---|---|---|---|
| 1 | `pr-validate-frontend.yml` | `pull_request` → `develop` | `frontend/**`, `contracts/openapi.yaml` | lint+test (`npm test`), Gitleaks, revisión de constitución (agente), code-review-recorded (dummy) |
| 2 | `pr-validate-backend.yml` | `pull_request` → `develop` | `backend/**`, `contracts/openapi.yaml` | lint+test, Spectral, oasdiff, Gitleaks, `check-acceptance.js`, Trivy (imagen de build efímero, no publicado), revisión de constitución, code-review-recorded |
| 3 | `develop-frontend.yml` | `push` → `develop` | `frontend/**`, `contracts/openapi.yaml` | build imagen snapshot (`sha-<gitsha>`) → push GHCR → deploy `dev` |
| 4 | `develop-backend.yml` | `push` → `develop` | `backend/**`, `contracts/openapi.yaml` | build imagen snapshot (`sha-<gitsha>`) → push GHCR → deploy `dev` |
| 5 | `main-frontend.yml` | `push` → `main` | `frontend/**`, `contracts/openapi.yaml` | SemVer (Conventional Commits, tag `frontend-vX.Y.Z`) → build+push GHCR → GitHub Release → deploy `pre` (auto) → aprobación manual (`environment: prod`) → promoción a `prod` (redeploy misma imagen) |
| 6 | `main-backend.yml` | `push` → `main` | `backend/**`, `contracts/openapi.yaml` | ídem, tag `backend-vX.Y.Z` |

Cada workflow arranca con un job de **change detection** (por rutas) que decide si el resto de
jobs se ejecuta; si las rutas del componente no cambiaron, el workflow no ejecuta build/deploy
(FR-003, FR-003b) — ver ADR-0013.

### 7.3 Flujo de artefactos y registro (build once / promote)

- Cada imagen se construye **una sola vez**, en el workflow `develop-*` (snapshot) o `main-*`
  (release), y se publica en GHCR bajo `ghcr.io/<org>/<repo>/fieldops-<componente>:<tag>`.
  - Snapshot (dev): tag = `sha-<gitsha>` (FR-007).
  - Release (main): tag = SemVer limpio del componente (p. ej. `1.4.0`), derivado de Conventional
    Commits; además se etiqueta el release/tag de Git como `<componente>-vX.Y.Z` (Principio V).
- Los jobs de **deploy** (a `dev`, `pre` o `prod`) nunca reconstruyen: referencian la imagen ya
  publicada por su tag/digest (FR-012, FR-013, Principio VI). La promoción `pre → prod` es un
  redeploy de la **misma** referencia de imagen tras la aprobación manual — no un nuevo build.
- **Excepción explícita y documentada**: el job de Trivy en `pr-validate-backend.yml` (workflow 2)
  SÍ construye una imagen — pero es una imagen de **PR**, nunca publicada en GHCR ni desplegada a
  ningún entorno; existe solo para el escaneo y se descarta al terminar el job. No viola build-once
  porque el artefacto inmutable que viaja por dev→pre→prod es el que construye `develop-backend.yml`
  o `main-backend.yml`, no este. Se documenta para que no se confunda con el artefacto canónico
  (ver ADR-0012, riesgo).
- **Rollback** (FR-014, FR-016, Principio VIII): un workflow de reversión (manual,
  `workflow_dispatch`) redespliega el último tag estable conocido desde GHCR a `dev`/`pre` sin
  reconstruir; en `prod` pasa por el mismo `environment: prod` con aprobación manual que un deploy
  normal. Cada ejecución de rollback registra en el log del job (o en un comentario/anotación del
  run) qué versión se revierte, a cuál se vuelve y quién aprobó — trazabilidad exigida por FR-014.

### 7.4 Matriz de puertas (gate → herramienta → componente)

| Puerta | Herramienta | Frontend | Backend | Principio (pipeline-constitution) |
|---|---|---|---|---|
| Lint + tests unitarios | `npm test` | ✅ | ✅ | III |
| Validación de contrato OpenAPI | Spectral | — | ✅ | III; VII (constitution.md) |
| Detección de breaking changes | oasdiff | — | ✅ | III |
| Escaneo de secretos | Gitleaks | ✅ | ✅ | III |
| Acceptance criteria vs API | `check-acceptance.js` | — | ✅ | III |
| Vulnerabilidades de imagen | Trivy | — | ✅ | III |
| Revisión de constitución | Claude Code Action (agente) | ✅ | ✅ | III; fail-closed FR-017 |
| Registro de revisión de código | job/stage dummy que certifica el paso | ✅ | ✅ | III (placeholder hasta que exista revisión humana obligatoria) |

Si **cualquier** puerta del componente afectado falla, el job de merge-gate del workflow PR queda
en rojo y GitHub bloquea el merge vía *required status checks* de `develop` (sin bypass manual,
FR-006) — este mecanismo de bloqueo (branch protection rule) es responsabilidad de configuración
del repositorio, no del propio YAML, y debe activarse junto con el merge del plan (a anotar en
tasks).

### 7.5 Dónde conectan el gate de IA y el de acceptance-criteria

- **Revisión de constitución (agente)**: job dedicado en ambos workflows PR-validator, que invoca
  Claude Code Action contra `.specify/memory/constitution.md` y
  `.specify/memory/pipeline-constitution.md` (el spec deja esto como asunción no confirmada — ver
  §7.7). El job **debe** producir un resultado binario explícito (pass/fail); cualquier resultado
  indeterminado, error de la llamada o timeout se mapea a **fail**, nunca a éxito por omisión
  (FR-017, Principio VII pipeline-constitution — verificabilidad previa). Ver ADR-0015.
- **Acceptance criteria (`check-acceptance.js`)**: job solo en el workflow backend, después de que
  Spectral valide el contrato; contrasta los escenarios de aceptación de la spec activa contra las
  operaciones definidas en `contracts/openapi.yaml` (p. ej.: cada `FR-XXX` con escenario tiene una
  operación/response correspondiente). Es un script propio del repo (no una herramienta de
  terceros), coherente con que la constitución de pipeline deja la herramienta de esta puerta
  agnóstica (Principio VII, pipeline-constitution).

### 7.6 Entornos y promoción

| Entorno | Origen | Disparo | Aprobación |
|---|---|---|---|
| `dev` | `develop` | automático tras merge | ninguna |
| `pre` | `main` | automático tras push a `main` (release) | ninguna |
| `prod` | `pre` (misma imagen) | manual | GitHub Environment `prod` con *required reviewers*; en fase de prueba, cualquier miembro del equipo puede aprobar (Principio V, pipeline-constitution) |

`dev` y `pre` se modelan como GitHub Environments sin protección; `prod` como GitHub Environment
con regla de aprobación manual — mecanismo nativo de GitHub Actions para materializar el "gate" de
aprobación de FR-011/FR-016 sin construir un sistema de aprobaciones ad-hoc (Principio II).

### 7.7 Preguntas abiertas (CI/CD)

- **Alcance de "constitución del sistema" para el agente (Q4 de la spec, sin confirmar)**: se asume
  que son ambos documentos de `.specify/memory/` (`constitution.md` + `pipeline-constitution.md`).
  Pendiente de confirmación explícita del usuario en `/speckit-plan`.
- **Dockerfiles**: hoy no existen `frontend/Dockerfile` ni `backend/Dockerfile` en el repo; son
  prerrequisito de los jobs de build de los workflows 3–6. Su creación es tarea de
  implementación (`/speckit-tasks`), no de esta arquitectura.
- **Endurecimiento de la aprobación a `prod`** (rol/permiso concreto, hoy "cualquier miembro del
  equipo"): explícitamente diferido por la propia constitución de pipeline a una enmienda futura;
  no se decide aquí.
- **Herramienta de change-detection concreta** (p. ej. `dorny/paths-filter` vs. `git diff` manual
  en un job): se fija en ADR-0013 como decisión de plan, no reabre principio alguno.
- **`ci.yml` existente**: queda pendiente de que el plan decida si se retira en el mismo cambio que
  introduce los 6 workflows nuevos o se retira en un paso posterior; no es una decisión de
  arquitectura sino de secuenciación de tareas.
