# Analysis Report — 002-cicd-pipeline

**Date**: 2026-07-13 | **Command**: /speckit-analyze (non-destructive)
**Artifacts**: spec.md/pipeline-specify.md, plan.md, tasks.md, research.md, data-model.md,
contracts/, quickstart.md, checklists/requirements.md, constitution.md (v1.2.0),
pipeline-constitution.md (v1.1.0), ADR-0011…0015.
**Facts source**: analyze-facts ground-truth pass (manual; traceability/EARS MCP not available).

## Summary

- FRs: **18** (FR-015 correctamente reclasificado a restricción de proceso — no es hallazgo).
- Tasks: **38** · Success Criteria: **7** · ADRs de este feature: **5** (0011–0015).
- **0 CRITICAL** · **1 HIGH** · **4 MEDIUM** · **4 LOW**.
- Veredicto: **APTO para `/speckit-implement` con correcciones recomendadas**. Ningún bloqueante
  de corrección ni violación MUST con wording filtrado. El punto HIGH (orden TDD) es una
  interpretación documentada, no una violación; conviene reforzarla.

## Findings

### A001 — [HIGH] Orden TDD (Principio IV, NO NEGOCIABLE) solo en US1
- **Dónde**: tasks.md L11–14 y fases 4–7. Solo US1 tiene sub-fase "verificación primero"
  (T010/T011 → T012). US2–US5 validan **después** de implementar (quickstart T021/T026/T029/T033).
- **Análisis**: la constitución de proyecto exige Red→Green para todo el trabajo. tasks.md declara
  una interpretación explícita: los workflows YAML se validan ejecutándolos, no con unit tests. Es
  razonable para IaC declarativa y **no** hay wording "tests OPTIONAL" filtrado (LAW-04 OK), pero
  solo 2/38 tareas siguen orden test-first.
- **Recomendación**: reformular las validaciones de US2–US5 como **criterios de aceptación
  ejecutables definidos antes** de crear cada workflow (mover T021/T026/T029/T033 a "definir
  verificación antes de implementar"), o justificar la excepción IaC en la Constitution Check del
  plan (Complexity Tracking) para dejarla trazada.

### A002 — [MEDIUM] SC-005 sin tarea que lo produzca ni verifique
- **Dónde**: spec.md SC-005 (versión desplegada identificable por entorno). Solo aparece en la
  lista resumen de quickstart.md (L63); ninguna tarea lo cita.
- **Recomendación**: añadir tarea que materialice/verifique la visibilidad de versión por entorno
  (p. ej. registro de despliegue / etiqueta visible por environment), o mapear explícitamente a
  T007/T027/T032 y añadir su verificación al quickstart.

### A003 — [MEDIUM] FR-002 y FR-004 sin cita de tarea por ID
- **Dónde**: tasks.md. FR-002 (independencia de componentes) y FR-004 (pipelines en paralelo) están
  cubiertos **implícitamente** (T005/T006/T013/T014 son workflows separados y paralelos) pero
  ninguna tarea los etiqueta.
- **Recomendación**: añadir `(FR-002, FR-004)` a T013/T014 (validadores separados por componente,
  ejecución paralela) para cerrar la trazabilidad.

### A004 — [MEDIUM] Gate por IA sin `thresholds.json` ni tarea de "ejecutar eval y gate por umbral"
- **Dónde**: FR-017/SC-007. T011 crea golden cases + arnés y menciona umbral (0 falsos negativos),
  pero no hay fichero de umbrales ni tarea que ejecute el eval y falle si no se cumple.
- **Recomendación**: añadir `evals/constitution-review/thresholds.json` y una tarea que ejecute el
  eval contra el umbral como parte de la verificación del feature (no en cada PR).

### A005 — [MEDIUM] Plan/tasks dependen de 5 ADRs en estado `Proposed`
- **Dónde**: ADR-0011…0015 (todos `Proposed`). plan.md y tasks.md construyen sobre ellos como
  decisiones firmes; T036 los acepta **después** de implementar.
- **Recomendación**: ratificar (marcar `Accepted`) ADR-0011…0015 **antes** de `/speckit-implement`,
  o dejar constancia explícita de que se implementa sobre decisiones propuestas asumiendo su
  aceptación. Evita construir sobre decisiones no ratificadas.

### A006 — [LOW] FRs compuestos (atomicidad EARS)
- **Dónde**: FR-004, FR-005 (8 sub-gates a–h), FR-008, FR-010, FR-010b, FR-012, FR-017 agrupan ≥2
  obligaciones en un FR. Palabras clave EARS válidas; es *smell* de atomicidad, no error.
- **Recomendación** (opcional): dividir FR-005 en sub-requisitos por gate si se quiere trazabilidad
  1:1 test↔gate; el resto puede quedarse.

### A007 — [LOW] Deriva de entidades: data-model añade Gate/Approval/RollbackRecord/Workflow
- **Dónde**: data-model.md define entidades no listadas en Key Entities del spec (que nombra
  Componente/Entorno/Aprobación). Es elaboración, no contradicción.
- **Recomendación**: alinear vocabulario — añadir esas entidades a Key Entities del spec, o notar
  que data-model las refina.

### A008 — [LOW] INV-1…INV-5 normativos solo en data-model
- **Dónde**: invariantes referenciados por T020/T028 como normativos, pero no aparecen en el spec.
- **Recomendación**: trazar cada INV a su FR de origen en data-model (INV-3→FR-013, etc.) para que
  su carácter normativo quede anclado al spec.

### A009 — [LOW/INFO] Duplicación `spec.md` ↔ `pipeline-specify.md`
- **Dónde**: copia canónica para tooling (documentada en tasks.md L209). Riesgo de deriva si se
  edita uno y no el otro.
- **Recomendación**: consolidar en `spec.md` (nombre que el tooling SDD espera) o automatizar el
  sync. Decisión del usuario pendiente.

## Coverage matrix (FR → task)

Cubiertos con cita directa: FR-001,003,003b,005,006,007,008,009,010,010b,011,012,013,014,016,017.
Cubiertos solo implícitamente (sin cita): **FR-002, FR-004** (ver A003).

## Constitution check

- constitution.md v1.2.0: 8 principios PASS en plan; sin Complexity Tracking. Tensión Principio IV
  → A001. Principio VII marcado N/A (feature no crea endpoints; solo valida el contrato) — correcto.
- pipeline-constitution.md v1.1.0: los 8 principios trazan a FRs/ADRs; sin conflicto detectado.

## Resolution (2026-07-13)

- **A001** ✅ Justificación del Principio IV para IaC añadida a `plan.md` → Complexity Tracking; nota
  test-first en `tasks.md`.
- **A002** ✅ Añadida tarea T025b (visibilidad de versión por entorno, SC-005).
- **A003** ✅ FR-002/FR-004 etiquetados en T013/T014.
- **A004** ✅ Añadida tarea T011b (`thresholds.json` + runner de eval que falla por umbral).
- **A005** ✅ ADR-0011…0015 marcados `Accepted` (ficheros e índice).
- A006–A009: LOW/INFO, no aplicadas (opcionales/calidad).

## Next steps

1. ✅ A001–A005 aplicadas.
2. A006–A009 opcionales/de calidad (pendientes).
3. Confirmar Q4/Q2 con el usuario (pendiente).
