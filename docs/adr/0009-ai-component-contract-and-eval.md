# ADR-0009: Componente de IA como contrato + eval como puerta de calidad

- **Estado**: Proposed <!-- Proposed | Accepted | Superseded by ADR-XXXX | Deprecated -->
- **Fecha**: 2026-07-10
- **Decisores**: eduardo.cordero (propuesta de arquitectura)
- **Principios de constitución**: II, III, IV, V, VII
- **Spec/Feature relacionada**: specs/001-order-execution-workflow (FR-017, FR-023, FR-024, FR-025; US5)
- **Supersede a**: — (amplía y complementa a ADR-0007; no lo reemplaza)

## Contexto y problema

FR-017/US5 introducen un componente de **IA** (resumen de incidencia). El [ADR-0007](0007-incident-summary-provider-boundary.md)
ya aísla el **proveedor** tras una interfaz de dominio, pero dejó abiertas dos cuestiones propias
de la IA: (1) qué hace el componente **cuando no tiene evidencia suficiente** y (2) cómo se
**verifica** un comportamiento no determinista sin acoplar la calidad a un proveedor concreto. Sin
reglas explícitas, un componente de IA puede **inventar** contenido —inaceptable en un dominio
asegurador— y no habría forma objetiva de aceptar/rechazar un cambio de prompt o de modelo.

## Decisión

Todo componente de IA del sistema se trata como un **contrato verificable con eval como puerta**:

1. **IA-como-contrato.** Se especifica en un contrato de capacidad
   (`contracts/ai/<name>.contract.md`) con entradas, salidas y semántica; el **shape** de la salida
   vive además en `contracts/openapi.yaml` (Principio VII). Para el resumen:
   `contracts/ai/incident-summary.contract.md`.
2. **Abstención / no invención (FR-023).** Ante evidencia insuficiente devuelve
   `status="insufficient_evidence"` con `summary=null`; **nunca** fabrica contenido. El caso de uso
   muestra las notas crudas.
3. **Grounding (FR-024).** Con `status="ok"`, cada punto clave referencia el fragmento de nota que
   lo respalda (`sourceNoteRef`). Un punto sin respaldo es alucinación → fallo de contrato.
4. **Fallback ante fallo del proveedor (FR-025).** Proveedor no disponible/salida malformada →
   `status="provider_unavailable"`, se muestran notas crudas y **se registra** (Principio V). La
   revisión (FR-007) nunca se bloquea. *(Resuelve la open question de fallback del ADR-0007.)*
5. **Advisory only.** El componente no decide aprobar/rechazar (eso es supervisor + RBAC, ADR-0001)
   ni cambia estado de órdenes.
6. **Eval-como-puerta (Principio IV).** El componente se acompaña de una eval de **golden cases con
   umbrales de aceptación** (`evals/incident-summary/`), tratada como los tests: sin eval en verde
   no se acepta la feature de IA. Umbrales iniciales → **0 alucinaciones (SC-010)**, **abstención
   ≥0.95 (SC-011)**, **recall de puntos clave ≥0.8 (SC-012)**.
   La **definición** de la eval (golden cases + `thresholds.json`) es un artefacto de diseño y vive
   ya en `evals/incident-summary/`. El **runner** que la ejecuta es **implementación** y se produce
   dentro del ciclo (`/speckit-tasks` → `/speckit-implement`), test-first y trazado a FR-023…025 /
   SC-010…012 — no pre-existe al ciclo (Principios III y IV).
7. **Reproducibilidad.** Cada salida registra `model` y `promptVersion`; un cambio incompatible de
   prompt/salida obliga a bump y a re-correr la eval (Principio VI).

Esta política se captura como **ADR** (no como principio de constitución) por decisión del equipo;
el chequeo "IA verificable" del agente `spec-reviewer` la hace cumplir en cada `/speckit-specify`.

## Justificación (apoyada en la constitución)

- **Principio III (Trazabilidad)**: grounding = cada afirmación traza a su fuente; contrato y eval
  se anclan a FR-017/FR-023..025.
- **Principio IV (Test-First)**: la eval es la verificación del comportamiento de IA, con umbrales
  medibles (SC-010..012), igual que un test es la verificación de un FR.
- **Principio VII (Contract-First)**: el consumidor depende de un contrato estable, no del proveedor.
- **Principios II y V**: un único componente advisory (sin plataforma genérica de IA) y toda
  decisión/fallo logueado.

## Consecuencias

- **Positivas**: comportamiento de IA predecible y auditable; los cambios de prompt/modelo se
  aceptan por evidencia (eval), no por opinión; "no invención" es una regla verificable, no un deseo.
- **Negativas / coste**: mantener el conjunto dorado y los umbrales; definir y respetar el umbral de
  "evidencia insuficiente".
- **Riesgos y mitigaciones**: golden set poco representativo → ampliarlo cuando aparezcan fallos
  reales; deriva del proveedor → la eval en CI la detecta antes del merge.

## Alternativas consideradas

- **Sin abstención (siempre devolver un resumen)** — descartada: invita a alucinaciones en un
  dominio donde los datos deben ser correctos (Principio I/III).
- **Verificar la IA solo con tests unitarios convencionales** — descartada: no capturan calidad ni
  alucinación en salida no determinista; se necesita una eval con umbrales.
- **Elevarlo a principio de constitución** — pospuesta: se captura como ADR + chequeo del reviewer
  (como RBAC); puede elevarse si se quiere vinculante en toda feature.

## Open questions

- Valor exacto del umbral de "evidencia insuficiente" (longitud/heurística) — parte del contrato,
  ajustable con datos reales.
- Métrica de recall (substring vs solape semántico) — la eval empieza con substring; refinar si hace falta.
