---
name: "speckit-implement-guardian-gate"
description: "Pre-implement hard gate. Runs before /speckit-implement and blocks it if there are unresolved CRITICAL findings or constitution-MUST violations — read from the persisted analysis-report.md and re-verified live with the traceability MCP (requirements without a task, leaked 'tests OPTIONAL' wording)."
argument-hint: "(none — invoked automatically as a before_implement hook)"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "implement-guardian"
  source: ".specify/extensions/implement-guardian/commands/speckit.implement-guardian.gate.md"
user-invocable: true
disable-model-invocation: false
---

# Implement Guardian — Pre-implement gate

You run **before** `/speckit-implement`. You are a **hard gate**: if the feature is not clean, you
stop implementation and say exactly what to fix. Read-only.

## Steps

1. Resolve the feature directory from `.specify/feature.json` → `feature_directory`.
2. **Read the persisted analysis** at `<feature_directory>/analysis-report.md` (produced by the
   analyze-guardian). Extract any findings with severity **CRITICAL** and any **constitution MUST**
   conflicts.
3. **Re-verify live** (do not trust a possibly-stale report) using the `traceability` MCP when
   connected:
   - `task_coverage` → any `requirementsWithoutTask` (an FR with zero tasks) is a blocking gap;
     `optionalTestsWordingPresent === true` is a blocking LAW-04 (TDD) violation.
   - `coverage_report` → note requirements with no test reference.
   If the MCP is unavailable, read `spec.md`/`tasks.md` and check the same facts manually.
4. **Decide**:
   - **BLOCK** (do not proceed to implementation) if there is at least one unresolved CRITICAL, a
     constitution-MUST conflict, an FR with no task, or leaked "tests OPTIONAL" wording. Output a
     clear ⛔ block with the specific items and the command(s) to fix them
     (`/speckit-analyze`, `/speckit-tasks`, edit spec/tasks), and instruct that `/speckit-implement`
     must not continue until they are resolved.
   - **WARN but allow** if `analysis-report.md` does not exist: recommend running `/speckit-analyze`
     first, but do not hard-block on a missing report alone.
   - **PASS** (✅) if none of the blocking conditions hold; state that implementation may proceed.

Never modify files. Your output is the gate decision the user (and `/speckit-implement`) must honor.
