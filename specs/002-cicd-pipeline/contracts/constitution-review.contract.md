# Contract — Gate de revisión de constitución (IA, fail-closed)

Contrato de E/S del gate FR-005h / FR-017, implementado con **Claude Code Action** (API del
agente). Sigue el patrón de ADR-0009 (contrato + eval para componentes con IA). Decisión de
comportamiento en ADR-0015. Este contrato es la referencia; la implementación va en
`/speckit-implement`.

## Propósito

En cada PR a `develop`, un agente revisa si el cambio cumple la **constitución del sistema** y
emite un veredicto que **bloquea el merge** si no es un "pass" explícito.

## Entrada

| Campo | Origen | Notas |
|-------|--------|-------|
| `diff` | diff de la PR (`base=develop`) | cambios a revisar |
| `component` | `frontend` \| `backend` | de la matriz de gates |
| `constitutionDocs` | ficheros de constitución | **Q4 (sin confirmar)**: se asume `.specify/memory/constitution.md` + `.specify/memory/pipeline-constitution.md` |
| `prMetadata` | título, descripción, FRs enlazados | contexto |

## Salida (JSON estructurado)

```json
{
  "verdict": "pass | fail",
  "violations": [
    { "principle": "<id/nombre>", "docLine": "<ruta:línea>", "evidence": "<cita>", "explanation": "..." }
  ],
  "confidence": "low | med | high",
  "abstained": false
}
```

- `verdict: "pass"` **solo** si el agente determina cumplimiento con evidencia suficiente.
- Cada `violations[]` DEBE citar la cláusula concreta (`docLine`) — *grounding*, sin invención.

## Regla de decisión (fail-closed) — FR-017

El job mapea a **fallo** (bloquea merge) en TODOS estos casos:

- `verdict == "fail"`, o
- `abstained == true` / evidencia insuficiente / `confidence == "low"` sin pass claro, o
- error de la Action, timeout, o proveedor no disponible, o
- salida que no valida contra este esquema.

**Nunca** se interpreta ausencia de respuesta como aprobación. `verdict: "pass"` es la única vía a
verde. (Principio III, sin bypass.)

## Verificabilidad (evals) — SC-007

- Golden cases en `evals/constitution-review/` con PRs etiquetadas (cumple / viola principio X).
- **Umbral de aceptación**: 0 falsos negativos sobre el set (no dejar pasar una violación conocida);
  los falsos positivos se revisan pero no relajan el fail-closed.
- El eval se ejecuta como parte de la verificación del feature (no en cada PR de producto).

## No-objetivos

- No sustituye a los gates deterministas (lint/tests/contrato/secrets/imagen); es adicional.
- No corrige el código; solo dictamina y bloquea.

## Trazabilidad

FR-005h, FR-017, SC-007 · Principio III (pipeline-constitution) · ADR-0009, ADR-0015.
