# Analyze Guardian

Strengthens `/speckit-analyze` at both ends of its run.

## What it does

- **`before_analyze` → `speckit.analyze-guardian.preflight`**
  Dispatches the **`analyze-facts`** agent, which gathers **deterministic ground-truth facts** using
  the `traceability` and `ears-validator` MCPs (FR↔task and FR↔test coverage, EARS validation, RBAC
  deny coverage, AI verifiability, contract-first propagation, TDD ordering / leaked "tests OPTIONAL"
  wording, ADR consistency) and feeds them to the analysis — so coverage/consistency findings rest on
  verified data instead of keyword inference. Cheaper and more deterministic (analyze's own goal).

- **`after_analyze` → `speckit.analyze-guardian.report`**
  Persists the analysis report to `specs/<feature>/analysis-report.md` with stable finding IDs and a
  **diff vs the previous run** (what was fixed / what is new). `/speckit-analyze` is read-only and
  saves nothing on its own; this makes findings auditable and diffable over time.

## Components

| Piece | Path |
|-------|------|
| Preflight skill (before_analyze) | `.claude/skills/speckit-analyze-guardian-preflight/SKILL.md` |
| Report skill (after_analyze) | `.claude/skills/speckit-analyze-guardian-report/SKILL.md` |
| Facts agent | `.claude/agents/analyze-facts.md` |
| Extension manifest | `.specify/extensions/analyze-guardian/extension.yml` |
| Hook registration | `.specify/extensions.yml` (`hooks.before_analyze`, `hooks.after_analyze`) |
| Output — persisted report | `specs/<feature>/analysis-report.md` |

## Notes

- Requires `tasks.md` (analyze runs only after `/speckit-tasks`). The preflight reports clearly if it
  is missing.
- Relies on the `traceability` MCP's `task_coverage` / `coverage_report` and the `ears-validator` MCP;
  falls back to manual parsing if they are not connected.
- The persisted CRITICAL findings are what the **implement-guardian** gate reads before
  `/speckit-implement`.
