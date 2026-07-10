# Implement Guardian

Hard quality gate before `/speckit-implement`.

## What it does

- **`before_implement` → `speckit.implement-guardian.gate`**
  Blocks implementation while the feature is not clean. It reads the persisted
  `specs/<feature>/analysis-report.md` (from the analyze-guardian) for **CRITICAL** findings and
  **constitution-MUST** conflicts, and **re-verifies live** with the `traceability` MCP:
  - `task_coverage` → an FR with zero tasks, or leaked "tests OPTIONAL" wording (LAW-04), blocks;
  - `coverage_report` → requirements with no test reference are noted.

## Decision

| Condition | Result |
|-----------|--------|
| Unresolved CRITICAL / constitution-MUST / FR-without-task / "tests OPTIONAL" leaked | ⛔ **BLOCK** — lists items + fix commands |
| No `analysis-report.md` yet | ⚠️ **WARN** — recommends `/speckit-analyze`, does not hard-block |
| None of the above | ✅ **PASS** — implementation may proceed |

## Components

| Piece | Path |
|-------|------|
| Gate skill | `.claude/skills/speckit-implement-guardian-gate/SKILL.md` |
| Extension manifest | `.specify/extensions/implement-guardian/extension.yml` |
| Hook registration | `.specify/extensions.yml` (`hooks.before_implement`) |

## Notes

- Read-only; never modifies spec/plan/tasks/code. The output is the gate decision `/speckit-implement`
  must honor.
- Pairs with the **analyze-guardian**, which produces the `analysis-report.md` this gate consumes.
- Deliberately depends on live `traceability` MCP facts so a stale report cannot wave through a real gap.
