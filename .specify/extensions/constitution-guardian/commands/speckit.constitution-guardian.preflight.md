---
description: "Gate + foundational interview before /speckit-constitution. Only asks when there is no real constitution yet AND the project is empty or has only the basics (spec-kit + node_modules)."
---

# Constitution Guardian — Pre-flight interview

This command is the `before_constitution` hook. Its full behavior lives in the
Claude Code skill `speckit-constitution-guardian-preflight`
(`.claude/skills/speckit-constitution-guardian-preflight/SKILL.md`).

Summary:

1. **Gate.** Proceed only if BOTH hold:
   - No real constitution yet — `.specify/memory/constitution.md` is missing or still
     contains `[ALL_CAPS]` template placeholders.
   - The project is empty or only has the basics (spec-kit installed, `node_modules`,
     lockfiles, README, dotfiles). If substantive source/work exists, skip.
2. **Interview.** When the gate is open, ask the user (in their language) the foundational
   questions: identity/purpose, project type, core non-negotiable principles (and how many),
   quality discipline (TDD/coverage/review), technical constraints, observability & versioning,
   governance & ratification date.
3. **Hand-off.** Emit a structured `## Constitution inputs (from guardian)` block for
   `/speckit-constitution` to consume, then return control. Do not write the constitution file.
