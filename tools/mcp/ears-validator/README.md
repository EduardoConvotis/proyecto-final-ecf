# EARS Validator MCP

Deterministic validation of functional requirements against **EARS** (Easy Approach to
Requirements Syntax). Backs the FieldOps rule that *every* functional requirement (FR/RF)
must be valid EARS and none in any other format.

## Tools

| Tool | Input | Returns |
|------|-------|---------|
| `validate_ears` | `text` (one requirement, optional `FR-###` id) | `{ ok, pattern, modal, violations[], suggestion }` |
| `validate_requirements_block` | `text` (markdown / multi-line) | per-requirement results + `{ total, valid, invalid, failingIds }` |
| `ears_reference` | — | the canonical EARS pattern templates |

Recognized patterns: **ubiquitous**, **event-driven** (`When …`), **state-driven**
(`While …`), **unwanted-behavior** (`If … then …`), **optional-feature** (`Where …`),
**complex** (combinations). Modal verbs `shall` and `MUST` are both accepted.

## Setup (once)

```bash
cd tools/mcp/ears-validator
npm install
npm run build      # emits dist/index.js
npm test           # runs the unit tests (Constitution Principle IV)
```

The project root `.mcp.json` launches it via `node tools/mcp/ears-validator/dist/index.js`.
For a no-build dev loop use `npm run dev` (tsx).

## Why deterministic

The `spec-reviewer` agent previously judged EARS conformance with model reasoning. This MCP
makes the check repeatable and reviewable, so the same requirement always gets the same verdict.
