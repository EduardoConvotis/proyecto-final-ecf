# Traceability MCP

Serves the FieldOps **SDD traceability graph** (Constitution Principle III) as queryable,
deterministic tools, so the `constitution-traceability` and `spec-reviewer` agents stop
re-parsing markdown by hand. Read-only over `.specify/` and `specs/`.

## Tools

| Tool | Input | Returns |
|------|-------|---------|
| `list_laws` | — | every constitution principle as `LAW-##` (+ Governance) |
| `list_specs` | — | all `specs/*/spec.md` and the active one (`.specify/feature.json`) |
| `list_requirements` | `spec?` | FR/RF ids, text and linked principles |
| `get_requirement` | `id`, `spec?` | one FR with principles, test-reference flag, related edge cases |
| `coverage_report` | `spec?` | gaps: FRs without a test ref, FRs without a principle, edge cases without an FR, laws not referenced |

`spec` accepts a feature dir (`001-order-execution-workflow`) or a path; omit it to use the
active spec, or all specs if none is active.

## What it is (and isn't)

Deterministic and honest about limits: `coverage_report` reports what is *explicitly*
traceable (FR ids referenced in scenarios/edge cases, principle cells in the trace table). It
**complements** the `spec-reviewer` agent — the agent still applies judgment (e.g. does a
scenario truly test the FR); the MCP guarantees the mechanical facts are consistent every run.

## Setup (once)

```bash
cd tools/mcp/traceability
npm install
npm run build      # emits dist/index.js
npm test           # unit tests over the pure parsers (Constitution Principle IV)
```

The project root `.mcp.json` launches it via `node tools/mcp/traceability/dist/index.js`
with the project directory as cwd. Override the root with `FIELDOPS_ROOT` if needed.
