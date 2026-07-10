---
name: "speckit-constitution-guardian-traceability"
description: "Post-constitution hook. Runs after /speckit-constitution finishes and dispatches the constitution-traceability agent, which builds/refreshes a traceability record mapping every constitution principle (law) to where it is enforced and verified."
argument-hint: "(none — invoked automatically as an after_constitution hook)"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "constitution-guardian"
  source: ".specify/extensions/constitution-guardian/commands/speckit.constitution-guardian.traceability.md"
user-invocable: true
disable-model-invocation: false
---

# Constitution Guardian — Traceability dispatch

You run **after** `/speckit-constitution` completes. Your only job is to hand the
traceability work to the dedicated **`constitution-traceability`** agent and report
back what it produced.

## Steps

1. Confirm `.specify/memory/constitution.md` exists and is no longer a pristine
   template (no unresolved `[ALL_CAPS]` tokens). If it is still a template, skip with:
   `Constitution Guardian: la constitución aún es plantilla — no hay leyes que trazar todavía.`
2. Launch the `constitution-traceability` agent via the Agent tool with
   `subagent_type: "constitution-traceability"`. Pass it this instruction:

   > Genera o actualiza la matriz de trazabilidad de la constitución del proyecto.
   > Lee `.specify/memory/constitution.md`, extrae cada principio (ley) y produce
   > `.specify/memory/traceability.md` mapeando cada ley a sus puntos de aplicación y
   > verificación. Devuelve un resumen de leyes trazadas y de las que quedan sin cobertura.

3. When the agent returns, relay a concise summary to the user: how many principles
   (laws) were traced, where the record was written, and any laws left without an
   enforcement/verification point (gaps).

Do not attempt to build the traceability matrix yourself — always delegate to the agent
so the analysis stays isolated and consistent.
