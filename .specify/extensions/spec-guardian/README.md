# Spec Guardian

Guards the specification lifecycle in a Spec Kit project.

## What it does

- **`before_specify` → `speckit.spec-guardian.normalize`**
  Runs before `/speckit-specify`. Dispatches the **`spec-author-normalizer`** agent, which:
  1. detects whether the feature text was written by a **Product Owner** or a **Developer**;
  2. if it's from a Product Owner, extracts the key concepts and rewrites them into precise
     **technical language** for the spec — **without inventing** anything;
  3. records every doubt/unknown in `.specify/memory/spec-open-questions.md` as a **deferred
     question** (asked after the command, never guessed).

- **`after_specify` → `speckit.spec-guardian.review`**
  Runs after `/speckit-specify`. Dispatches the **`spec-reviewer`** agent, which audits the
  generated spec and **warns** (never auto-fixes) about:
  1. **Constitution traceability** — each requirement references the constitution principle(s) it upholds.
  2. **Test traceability** — every functional requirement (FR/RF) has a test, and every test maps back to an FR.
  3. **EARS conformance** — every functional requirement is valid EARS; **no FR in another format**.
  4. **Edge-case coverage** — every edge case has a corresponding test.
  It also surfaces the normalizer's deferred questions so the user resolves them now.

## Components

| Piece | Path |
|-------|------|
| Normalize skill (dispatch) | `.claude/skills/speckit-spec-guardian-normalize/SKILL.md` |
| Review skill (dispatch) | `.claude/skills/speckit-spec-guardian-review/SKILL.md` |
| Author-normalizer agent | `.claude/agents/spec-author-normalizer.md` |
| Spec-reviewer agent | `.claude/agents/spec-reviewer.md` |
| Extension manifest | `.specify/extensions/spec-guardian/extension.yml` |
| Hook registration | `.specify/extensions.yml` (`hooks.before_specify`, `hooks.after_specify`) |

## How the hooks fire

`/speckit-specify` natively reads `.specify/extensions.yml`, converts the command name's dots
to hyphens (`speckit.spec-guardian.normalize` → `/speckit-spec-guardian-normalize`) and
executes the matching skill. Both hooks are mandatory (`optional: false`) so they fire
automatically. The `after_specify` key also carries the pre-existing `agent-context` hook;
both run.

## EARS reference (used by the reviewer)

Every functional requirement must be one of:
- **Ubiquitous** — "The <system> shall/MUST <response>."
- **Event-driven** — "When <trigger>, the <system> shall/MUST <response>."
- **State-driven** — "While <state>, the <system> shall/MUST <response>."
- **Unwanted behavior** — "If <condition>, then the <system> shall/MUST <response>."
- **Optional feature** — "Where <feature included>, the <system> shall/MUST <response>."
- **Complex** — valid combinations of the above.
