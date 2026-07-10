---
description: "Before /speckit-implement: hard gate that blocks implementation while unresolved CRITICAL findings or constitution-MUST violations remain."
---

# Implement Guardian — Pre-implement gate

This command is the `before_implement` hook. Full behavior in the Claude Code skill
`speckit-implement-guardian-gate` (`.claude/skills/speckit-implement-guardian-gate/SKILL.md`).

Summary — read `<feature_directory>/analysis-report.md` for CRITICAL / constitution-MUST findings
and re-verify live with the `traceability` MCP (`task_coverage`: FR without task,
`optionalTestsWordingPresent`; `coverage_report`). Then:

- **⛔ BLOCK** `/speckit-implement` if any unresolved CRITICAL, constitution-MUST conflict, FR with
  no task, or leaked "tests OPTIONAL" wording exists — listing the items and the fix commands.
- **⚠️ WARN but allow** if no `analysis-report.md` exists (recommend running `/speckit-analyze`).
- **✅ PASS** otherwise.

Read-only; the output is the gate decision.
