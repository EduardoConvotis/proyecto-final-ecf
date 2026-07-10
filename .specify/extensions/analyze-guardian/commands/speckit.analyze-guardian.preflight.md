---
description: "Before /speckit-analyze: dispatch the analyze-facts agent to gather deterministic ground-truth facts (coverage, EARS, RBAC/AI/contract-first) so the analysis reasons from verified data."
---

# Analyze Guardian — Ground-truth preflight

This command is the `before_analyze` hook. Full behavior in the Claude Code skill
`speckit-analyze-guardian-preflight`
(`.claude/skills/speckit-analyze-guardian-preflight/SKILL.md`).

Summary — launch the `analyze-facts` agent (`subagent_type: "analyze-facts"`) to produce a
`## Ground-truth facts for analysis` brief using the `traceability` and `ears-validator` MCPs
(FR↔task/test coverage, EARS validation, RBAC deny coverage, AI verifiability, contract-first
propagation, TDD ordering, ADR consistency), then relay it so `/speckit-analyze` uses it as input.
If `tasks.md` is missing, report it (analyze cannot run yet).
