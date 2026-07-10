---
name: "speckit-analyze-guardian-report"
description: "Post-analyze hook. Runs after /speckit-analyze and persists the analysis report to specs/<feature>/analysis-report.md with stable finding IDs, so findings are auditable and diffable across runs (what was fixed / what is new)."
argument-hint: "(none — invoked automatically as an after_analyze hook)"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "analyze-guardian"
  source: ".specify/extensions/analyze-guardian/commands/speckit.analyze-guardian.report.md"
user-invocable: true
disable-model-invocation: false
---

# Analyze Guardian — Persist analysis report

You run **after** `/speckit-analyze` has produced its report in this context. Persist it as a
durable, auditable artifact. `/speckit-analyze` is read-only and writes nothing; this hook is the
only place the report is saved.

## Steps

1. Resolve the feature directory from `.specify/feature.json` → `feature_directory`.
2. Write the analysis report just produced by `/speckit-analyze` to
   `<feature_directory>/analysis-report.md`, preserving its stable finding IDs (A1, C2, …), the
   findings table, coverage summary, constitution-alignment issues and metrics. Prepend a header:
   - date (use the current date already known in this session),
   - the constitution version analyzed (from `.specify/memory/constitution.md`),
   - a one-line **VERDICT** = the highest severity present (CRITICAL / HIGH / MEDIUM / LOW / none).
3. If a previous `analysis-report.md` exists, prepend a short **Diff vs previous run** note: which
   finding IDs are resolved (present before, absent now) and which are new. Then overwrite the file
   with the current run (keep it single-file, latest-wins; the diff note captures the delta).
4. Report to the user the path written and the verdict, and — if any **CRITICAL** finding remains —
   state clearly that `/speckit-implement` should not proceed until it is resolved (the
   implement-guardian will enforce this).

Do not modify spec.md / plan.md / tasks.md — only write the report file.
