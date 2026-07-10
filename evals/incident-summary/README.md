# Eval — Resumen de incidencia (definición / criterios de aceptación)

Esta carpeta contiene la **definición** de la eval del componente de IA de resumen de incidencia:
los *golden cases* y los umbrales de aceptación. Es un artefacto de **diseño** (el "qué"), como la
matriz RBAC o los Acceptance Scenarios — **no** contiene código.

> El **runner** de la eval (cargar casos, puntuar salidas, aplicar umbrales) es **implementación**
> y se produce dentro del ciclo SDD: se especifica en `/speckit-tasks` y se implementa test-first en
> `/speckit-implement`, trazado a **FR-023…FR-025** y a **SC-010…SC-012**. No debe pre-existir al
> ciclo (Constitución, Principios III y IV). Contrato del componente:
> `contracts/ai/incident-summary.contract.md`; decisión: [ADR-0009](../../docs/adr/0009-ai-component-contract-and-eval.md).

## Contenido (artefactos de aceptación)

- `golden/*.json` — casos dorados: `input.notes` + `expect` (status, `keyFacts`, `mustNotContain`).
- `thresholds.json` — umbrales de aceptación.

## Umbrales → Success Criteria de la spec 001

| Métrica | Umbral (`thresholds.json`) | Success criterion |
|---------|----------------------------|-------------------|
| Alucinaciones (puntos sin grounding + hechos prohibidos) | `= 0` | SC-010 |
| Tasa de abstención correcta (casos con evidencia insuficiente) | `>= 0.95` | SC-011 |
| Recall de puntos clave | `>= 0.8` | SC-012 |

## Formato de un golden case

```jsonc
{
  "id": "gc-NNN",
  "description": "…",
  "input": { "executionId": "…", "notes": "…" },   // notes = única fuente permitida
  "expect": {
    "status": "ok" | "insufficient_evidence",
    "keyFacts": ["…"],        // (solo casos ok) hechos que el resumen debe capturar → recall
    "mustNotContain": ["…"]   // hechos que NO deben aparecer → anti-alucinación
  }
}
```

## Qué debe hacer el runner cuando se implemente (contrato de la tarea)

- Cargar `golden/*.json` y `thresholds.json`.
- Puntuar cada salida del proveedor: `status` esperado, grounding de cada punto clave, hechos
  prohibidos, recall de `keyFacts`, y abstención correcta en casos insuficientes.
- Devolver **exit ≠ 0** si algún umbral falla (para usarse como gate en CI).
- Una salida ausente para un caso se trata como `provider_unavailable`.
