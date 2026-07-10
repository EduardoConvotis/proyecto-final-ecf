---
description: "After /speckit-specify: review the spec for constitution traceability, test traceability, EARS conformance of every functional requirement, and edge-case test coverage; warn about anything to fix."
---

# Spec Guardian — Specification review

This command is the `after_specify` hook. Its full behavior lives in the Claude Code skill
`speckit-spec-guardian-review` (`.claude/skills/speckit-spec-guardian-review/SKILL.md`).

Summary — launch the `spec-reviewer` agent (`subagent_type: "spec-reviewer"`) to audit the
generated spec and warn about failures (it does not auto-fix):

1. **Constitution traceability** — each requirement references the constitution principle(s)
   it upholds; flag laws/requirements with no link.
2. **Test traceability** — every functional requirement (FR/RF) has a test, and every test
   maps back to an FR; flag both gaps.
3. **EARS conformance** — every functional requirement is valid EARS; no FR in another
   format; flag and suggest corrections.
4. **Edge-case coverage** — every edge case has a test; flag those without.
5. Surface any deferred questions from `.specify/memory/spec-open-questions.md` to ask now.
