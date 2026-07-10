# AI Capability Contract — Resumen de incidencia

Contrato del componente de IA que resume la incidencia de una ejecución a partir de las notas del
técnico. Complementa al contrato REST (`contracts/openapi.yaml`, operación de revisión): el
**shape** de la salida vive en OpenAPI; aquí se fija la **semántica** que OpenAPI no captura
(abstención, grounding, prompt, failure modes).

- **Constitución**: v1.2.0 (Principios II, III, IV, V, VII)
- **Spec**: `specs/001-order-execution-workflow/spec.md` — FR-017, FR-023, FR-024, FR-025; US5
- **Decisión de diseño**: [ADR-0009](../../docs/adr/0009-ai-component-contract-and-eval.md)
  (amplía [ADR-0007](../../docs/adr/0007-incident-summary-provider-boundary.md))
- **Eval (puerta de calidad)**: `evals/incident-summary/`
- **Versión del contrato**: `promptVersion` semántica (`v1`, `v2`, …); un cambio incompatible del
  prompt/salida obliga a bump y a re-correr la eval (Principio VI).

## Propósito y frontera

- **Advisory only**: ayuda al supervisor a revisar; **NUNCA** decide aprobar/rechazar (eso es del
  supervisor + RBAC, ADR-0001). No cambia el estado de ninguna orden.
- El backend es la única autoridad que invoca al proveedor (ADR-0007); el frontend nunca llama al
  proveedor directamente.

## Entradas

```jsonc
IncidentSummaryRequest {
  executionId: string,          // ejecución en estado "Enviada"
  notes: string,                // notas del técnico (texto libre) — ÚNICA fuente permitida
  orderContext?: {              // opcional, solo lectura; NO es fuente de afirmaciones nuevas
    service?: string,
    address?: string
  }
}
```

Regla dura: la **única** fuente de contenido del resumen son `notes`. `orderContext` es contexto,
no material para afirmar hechos no presentes en `notes`.

## Salidas

```jsonc
IncidentSummary {
  status: "ok" | "insufficient_evidence" | "provider_failed",
  summary: string | null,       // null salvo status="ok"
  keyPoints: KeyPoint[],        // [] salvo status="ok"
  missing: string[],            // qué faltó (cuando insufficient_evidence); [] en otro caso
  model: string,                // p. ej. "claude-haiku-4-5"
  promptVersion: string         // p. ej. "v1"
}
KeyPoint {
  text: string,
  sourceNoteFragment: string    // fragmento literal de `notes` que respalda el punto (grounding)
}
```

> **Fuente de verdad del shape**: `contracts/openapi.yaml` (schema `IncidentSummary`). El enum de
> `status` y el campo `sourceNoteFragment` DEBEN coincidir con OpenAPI (Principio VII). Los campos
> `summary`, `missing`, `model`, `promptVersion` son metadatos semánticos que este contrato añade.

```jsonc
// (referencia — no repetir shape divergente)
```

## Regla de abstención (no invención) — FR-023

El componente **se abstiene** (`status="insufficient_evidence"`, `summary=null`, `keyPoints=[]`)
cuando NO puede resumir con respaldo suficiente. Se considera evidencia insuficiente si:
- `notes` está vacío o su longitud útil < **20 caracteres**, o
- `notes` no contiene una incidencia identificable (p. ej. solo un saludo o texto irrelevante).

En abstención rellena `missing` con lo que faltó y **nunca** fabrica un resumen. El caso de uso
que consume el contrato muestra las notas crudas al supervisor. Umbral de longitud configurable en
el adaptador; documentado aquí como parte del contrato.

## Grounding (trazabilidad de afirmaciones) — FR-024

Cuando `status="ok"`, **cada** `KeyPoint.text` DEBE estar respaldado por `sourceNoteFragment`, un
fragmento literal de `notes`. Un punto clave sin respaldo es una **alucinación** y es un fallo de
contrato (la eval lo detecta: SC-010, 0 alucinaciones).

## Failure modes — FR-025

- **Proveedor no disponible / timeout** → `status="provider_failed"`, `summary=null`; el caso
  de uso presenta las notas crudas y **registra el fallo** (logging estructurado, Principio V). La
  revisión (FR-007) nunca se bloquea por esto.
- **Salida malformada del proveedor** (no cumple el schema o incluye `KeyPoint` sin `sourceNoteFragment`)
  → se trata como `provider_failed` (no se muestra salida no validada) y se registra.

## Determinismo y configuración

- `temperature` baja (p. ej. 0) para maximizar reproducibilidad en la eval.
- `model` y `promptVersion` se registran en cada salida y en los logs → trazabilidad y reproducción.
- El prompt del sistema instruye explícitamente: resumir SOLO a partir de `notes`, abstenerse si no
  hay evidencia, y no añadir hechos externos.

## No-goals

- No decide sobre la orden. No accede a datos de cliente más allá de `notes`/`orderContext`. No
  persiste nada por sí mismo (el caso de uso decide qué guardar). No es multi-proveedor en runtime
  (un adaptador único, ADR-0007).
