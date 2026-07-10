---
description: "After /speckit-constitution, dispatch the constitution-traceability agent to map every principle (law) to its enforcement and verification."
---

# Constitution Guardian — Traceability dispatch

This command is the `after_constitution` hook. Its full behavior lives in the
Claude Code skill `speckit-constitution-guardian-traceability`
(`.claude/skills/speckit-constitution-guardian-traceability/SKILL.md`).

Summary:

1. Skip if the constitution is still a pristine template (nothing to trace yet).
2. Launch the `constitution-traceability` agent (Agent tool,
   `subagent_type: "constitution-traceability"`) to read
   `.specify/memory/constitution.md`, extract each law, and write
   `.specify/memory/traceability.md` (Law ID → rule → enforcement point → verification → status).
3. Relay the agent's summary: laws traced, coverage counts, and any gaps.
