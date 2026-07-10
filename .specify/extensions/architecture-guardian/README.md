# Architecture Guardian

Guards the architecture step of the SDD cycle in FieldOps.

## What it does

- **`before_plan` → `speckit.architecture-guardian.propose`**
  Runs before `/speckit-plan`. Dispatches the **`architect`** agent, which:
  1. detects whether the repo is **greenfield** (no folder structure, no application code);
  2. proposes the architecture in `docs/architecture.md`, **grounded in the constitution**
     (component/layer view + target monorepo folder structure + principle mapping);
  3. creates one **ADR** per significant decision under `docs/adr/NNNN-*.md` (from
     `.specify/templates/adr-template.md`), each tracing to the constitution principle(s) and the
     active spec, starting in status **Proposed**, never renumbering existing ADRs;
  4. maintains the ADR **index + changelog** at `docs/adr/README.md` (append-only history for
     future changes and new ADRs);
  5. if greenfield, scaffolds only the baseline directory skeleton (README/.gitkeep) — not code.

The plan then adopts the target structure in its *Structure Decision* and verifies it in the
*Constitution Check*.

## Components

| Piece | Path |
|-------|------|
| Dispatch skill | `.claude/skills/speckit-architecture-guardian-propose/SKILL.md` |
| Architect agent | `.claude/agents/architect.md` |
| ADR template | `.specify/templates/adr-template.md` |
| Extension manifest | `.specify/extensions/architecture-guardian/extension.yml` |
| Hook registration | `.specify/extensions.yml` (`hooks.before_plan`) |
| Output — architecture | `docs/architecture.md` |
| Output — ADRs + history | `docs/adr/NNNN-*.md`, `docs/adr/README.md` |

## How the hook fires

`/speckit-plan` natively reads `.specify/extensions.yml`, converts the command name's dots to
hyphens (`speckit.architecture-guardian.propose` → `/speckit-architecture-guardian-propose`) and
executes the matching skill. The hook is mandatory (`optional: false`) so it fires automatically;
the greenfield-vs-existing scoping lives inside the `architect` agent.

## Principles

- **Propose, don't build**: the agent documents architecture and ADRs; it does not write
  application code (that's `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`).
- **Everything traces**: each structural choice maps to a constitution principle or a spec
  requirement (Principle III), and each decision is captured as an ADR.
- **YAGNI**: no ADRs for trivialities, no speculative layers (Principle II).
