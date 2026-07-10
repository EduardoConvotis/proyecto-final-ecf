---
description: "Before /speckit-plan: detect a greenfield repo and dispatch the architect agent to propose the architecture (grounded in the constitution), create ADRs per decision, and maintain an ADR history."
---

# Architecture Guardian — Architecture proposal

This command is the `before_plan` hook. Its full behavior lives in the Claude Code skill
`speckit-architecture-guardian-propose`
(`.claude/skills/speckit-architecture-guardian-propose/SKILL.md`).

Summary — launch the `architect` agent (`subagent_type: "architect"`) to:

1. Detect whether the repo is **greenfield** (no folder structure, no application code).
2. Propose the architecture in `docs/architecture.md`, grounded in `.specify/memory/constitution.md`
   (component view + target monorepo folder structure + principle mapping).
3. Create one **ADR** per significant decision under `docs/adr/NNNN-*.md` (from
   `.specify/templates/adr-template.md`), each tracing to the constitution principle(s) and the
   active spec; status starts **Proposed**; existing ADRs are never renumbered.
4. Maintain the ADR **index + changelog** at `docs/adr/README.md` for future changes / new ADRs.
5. If greenfield, scaffold only the baseline directory skeleton (README/.gitkeep), not code.

Relay the target structure and decisions so `/speckit-plan` adopts them in its Structure Decision
and Constitution Check.
