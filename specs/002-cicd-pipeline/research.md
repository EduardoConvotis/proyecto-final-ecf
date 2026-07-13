# Phase 0 — Research: CI/CD gobernado para FieldOps

Todas las incógnitas del Technical Context están resueltas (spec + respuestas del usuario +
constitución de pipeline v1.1.0). Las decisiones estructurales están razonadas en ADR-0011…0015;
aquí se consolidan en formato decisión/razón/alternativas.

## D1 — Topología: 6 workflows, uno por (componente × etapa)

- **Decision**: `pr-validate-{frontend,backend}`, `develop-{frontend,backend}`,
  `main-{frontend,backend}`. Sin workflow orquestador transversal. (ADR-0011)
- **Rationale**: coincide 1:1 con lo pedido por el usuario; refuerza el aislamiento por componente
  (Principio II) y mantiene cada archivo legible (Principio II simplicidad). Cada etapa
  (PR/develop/main) tiene responsabilidades distintas (gates / snapshot+dev / release+pre+prod).
- **Alternatives**: (a) 1 workflow por componente con jobs condicionales por rama → mezcla
  responsabilidades y complica los gates de PR; (b) 1 workflow monolítico (como el `ci.yml` actual)
  → rompe el aislamiento y despliega de más. Rechazadas.

## D2 — Detección de cambios y paralelismo

- **Decision**: filtros nativos `on.paths`: frontend → `frontend/**` + `contracts/openapi.yaml`;
  backend → `backend/**` + `contracts/openapi.yaml`. Front y back corren en paralelo e
  independientes. (ADR-0013; FR-003/003b/004)
- **Rationale**: `contracts/openapi.yaml` es superficie compartida (un cambio de contrato debe
  validar ambos consumidores). `on.paths` es lo más simple y no requiere tooling extra (Principio
  II). Un cambio solo-docs no toca rutas de componente → no dispara builds (US1-AC6).
- **Alternatives**: acciones de terceros de detección de cambios (dorny/paths-filter) a nivel de
  job → útiles si luego se necesita granularidad intra-workflow; se difieren (YAGNI).

## D3 — Registro y estrategia de artefactos

- **Decision**: GHCR, `ghcr.io/<org>/<repo>/fieldops-<front|back>:<tag>`; tag = `sha-<gitsha>` para
  snapshots de dev y `<semver>` para releases de main. Build once en CI, promote la MISMA imagen a
  dev→pre→prod sin reconstruir. Auth con `GITHUB_TOKEN` + `permissions: packages: write`.
  (ADR-0012; FR-012/013)
- **Rationale**: GHCR no requiere secretos adicionales; la inmutabilidad garantiza "lo que pasó CI
  es lo que llega a prod" (Principio VI). 
- **Excepción documentada**: el escaneo Trivy se hace sobre la imagen antes de publicarla como
  aprobada; es el único punto donde la imagen se construye para análisis (no rompe build-once
  porque es el mismo build que se publica).
- **Alternatives**: Docker Hub / registro externo → requiere secretos y añade superficie; rechazado.

## D4 — Promoción por entornos y rollback

- **Decision**: GitHub Environments `dev`, `pre` (sin protección, deploy automático) y `prod`
  (*required reviewers*, aprobación manual). Rollback = `workflow_dispatch` por componente que
  redepliega un tag GHCR existente; el historial de runs de Actions es el rastro de auditoría.
  (ADR-0014; FR-008/010/011/014/016)
- **Rationale**: los *required reviewers* implementan FR-011/FR-016 sin bypass posible. Rollback
  reutiliza artefacto inmutable (Principio VI/VIII), no reconstruye.
- **Fase de prueba**: cualquier miembro del equipo como reviewer válido (decisión de la
  constitución v1.1.0); endurecer a rol concreto en el futuro.
- **Alternatives**: gates manuales con `environment` protegido a nivel de job vs. entornos
  dedicados → se eligen Environments por dar aprobadores y despliegues por entorno de forma nativa.

## D5 — Gate de revisión de constitución (IA), fail-closed

- **Decision**: Claude Code Action que evalúa la PR contra la constitución del sistema; cualquier
  resultado que no sea "pass explícito" (error, timeout, ambigüedad, proveedor caído) → fallo del
  job. Contrato de E/S en `contracts/constitution-review.contract.md`; evals con umbrales en
  `evals/constitution-review/`. (ADR-0015; FR-005h/FR-017; SC-007)
- **Rationale**: un gate de calidad con IA nunca debe aprobar por defecto (Principio III, no
  bypass). Alinea con el patrón de ADR-0009 (contrato + eval para componentes con IA).
- **Alternatives**: gate informativo no bloqueante → contradice FR-006; rechazado.

## D6 — Matriz de gates (herramienta × componente × principio)

| Gate | Herramienta | Componente | FR | Principio (pipeline / proyecto) |
|------|-------------|-----------|----|--------------------------------|
| Lint + unit tests | `npm test` | front + back | FR-005a | III / I, IV, VIII |
| Validación contrato OpenAPI | Spectral | back | FR-005c | III / VII |
| Breaking changes de contrato | oasdiff | back | FR-005d | III / VI, VII |
| Escaneo de secretos | Gitleaks | front + back | FR-005e | III / V |
| ACs contra la API | `check-acceptance.js` | back | FR-005f | III |
| Vulnerabilidades de imagen | Trivy | back | FR-005g | III |
| Revisión de constitución | Claude Code Action | front + back | FR-005h, FR-017 | III |
| Code review registrado | Job dummy (certifica el paso) | front + back | FR-005 (traza) | III |

- **Nota**: el "job dummy" de code review es un stage que certifica explícitamente el paso de
  revisión para dejarlo trazado en el pipeline (placeholder de una futura revisión obligatoria por
  pares); no ejecuta lógica. Documentado, no oculto (evita cap silencioso).

## Preguntas abiertas que entran al plan (no bloquean Fase 1)

- **Q4 (sin confirmar)**: alcance de "constitución del sistema" para el agente = se asume
  `constitution.md` + `pipeline-constitution.md`. Se fija en el contrato del gate; confirmar con el
  usuario.
- **Dockerfiles**: `frontend/Dockerfile` y `backend/Dockerfile` no existen aún → prerequisito de los
  jobs de build; se crean en `/speckit-tasks`.
- **Retiro de `ci.yml`**: se retira al introducir los 6 workflows; la secuencia exacta
  (mismo PR vs posterior) se decide en tasks (es secuencia, no arquitectura).
- **Q2 (menor)**: Trivy aplica a la imagen de cada componente modificado (asunción); confirmar si
  aplica solo a backend.
