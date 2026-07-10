---
description: "After /speckit-analyze: persist the analysis report to specs/<feature>/analysis-report.md with stable IDs and a diff vs the previous run."
---

# Analyze Guardian — Persist analysis report

This command is the `after_analyze` hook. Full behavior in the Claude Code skill
`speckit-analyze-guardian-report` (`.claude/skills/speckit-analyze-guardian-report/SKILL.md`).

Summary — write the report just produced by `/speckit-analyze` to
`<feature_directory>/analysis-report.md` (stable finding IDs, coverage summary, metrics), with a
header (date, constitution version, VERDICT = highest severity) and a **Diff vs previous run** note
if a prior report exists. Warn that `/speckit-implement` must not proceed while any CRITICAL remains.
Read-only over spec/plan/tasks; only writes the report file.
