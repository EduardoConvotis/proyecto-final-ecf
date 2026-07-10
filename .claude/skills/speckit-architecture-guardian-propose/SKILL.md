---
name: "speckit-architecture-guardian-propose"
description: "Pre-plan hook. Runs before /speckit-plan and dispatches the architect agent, which detects whether the repo is greenfield (no folder structure, no code), proposes the architecture grounded in the constitution alongside the plan, creates one ADR per significant decision under docs/adr/, and maintains an ADR history/index for future changes."
argument-hint: "(none — invoked automatically as a before_plan hook)"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "architecture-guardian"
  source: ".specify/extensions/architecture-guardian/commands/speckit.architecture-guardian.propose.md"
user-invocable: true
disable-model-invocation: false
---

# Architecture Guardian — Architecture proposal dispatch

You run **before** `/speckit-plan`. Hand the architecture work to the **`architect`** agent and
relay its proposal so the plan adopts the structure and references the ADRs.

## Steps

1. Launch the `architect` agent via the Agent tool with `subagent_type: "architect"`. Instruct it to:
   - detect whether the repo is **greenfield** (no folder structure, no application code);
   - grounded in `.specify/memory/constitution.md`, propose the architecture in
     `docs/architecture.md` (component view + target monorepo folder structure + principle mapping);
   - create one **ADR** per significant decision under `docs/adr/NNNN-*.md` from
     `.specify/templates/adr-template.md`, each tracing to the constitution principle(s) and the
     active spec, starting in status **Proposed** and never renumbering existing ADRs;
   - maintain the ADR **index + changelog** at `docs/adr/README.md` (append-only history for future
     changes / new ADRs);
   - if greenfield, scaffold only the baseline directory skeleton (with README/.gitkeep), **not**
     application code.
2. When the agent returns, relay to the plan flow:
   - the detected mode (greenfield/existing),
   - the **target folder structure** and the decisions the plan's *Structure Decision* and
     *Constitution Check* should adopt/verify,
   - the list of ADRs created/updated and the path to `docs/architecture.md`.
3. Surface any open questions the architect raised (do not invent answers). Return control so
   `/speckit-plan` proceeds using the proposed architecture.

Do not design the architecture or write ADRs yourself — always delegate to the `architect` agent.
