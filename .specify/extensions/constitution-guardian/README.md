# Constitution Guardian

Guards the constitution lifecycle in a Spec Kit project.

## What it does

- **`before_constitution` → `speckit.constitution-guardian.preflight`**
  Runs before `/speckit-constitution`. Self-gated: it only interviews the user with
  foundational constitution questions when **both** are true:
  1. there is **no real constitution yet** (`.specify/memory/constitution.md` missing or
     still full of `[ALL_CAPS]` placeholders), and
  2. the project is **empty or only has the basics** (spec-kit installed, `node_modules`,
     lockfiles, README, dotfiles).
  Otherwise it steps aside silently and lets the constitution flow continue.

- **`after_constitution` → `speckit.constitution-guardian.traceability`**
  Runs after `/speckit-constitution`. Dispatches the **`constitution-traceability`** agent,
  which reads the finished constitution, treats each principle as a **law**, and writes
  `.specify/memory/traceability.md` mapping every law to its enforcement point(s) and
  verification method, flagging any gaps.

## Components

| Piece | Path |
|-------|------|
| Pre-flight skill | `.claude/skills/speckit-constitution-guardian-preflight/SKILL.md` |
| Traceability skill (dispatch) | `.claude/skills/speckit-constitution-guardian-traceability/SKILL.md` |
| Traceability agent | `.claude/agents/constitution-traceability.md` |
| Extension manifest | `.specify/extensions/constitution-guardian/extension.yml` |
| Hook registration | `.specify/extensions.yml` (`hooks.before_constitution`, `hooks.after_constitution`) |

## How the hooks fire

`/speckit-constitution` natively reads `.specify/extensions.yml`, finds the
`before_constitution` / `after_constitution` entries, converts the command name's dots to
hyphens (`speckit.constitution-guardian.preflight` → `/speckit-constitution-guardian-preflight`)
and executes the matching skill. Both hooks are registered as mandatory (`optional: false`)
so they fire automatically; the gating logic lives inside the pre-flight skill itself.
