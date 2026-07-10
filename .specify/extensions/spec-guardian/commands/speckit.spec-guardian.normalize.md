---
description: "Before /speckit-specify: detect Product-Owner vs Developer input, rewrite PO text into technical language without inventing, and defer any doubts as questions to ask after the command."
---

# Spec Guardian — Input normalization

This command is the `before_specify` hook. Its full behavior lives in the Claude Code skill
`speckit-spec-guardian-normalize` (`.claude/skills/speckit-spec-guardian-normalize/SKILL.md`).

Summary:

1. Take the raw feature text passed to `/speckit-specify`.
2. Launch the `spec-author-normalizer` agent (`subagent_type: "spec-author-normalizer"`) to:
   - classify the author as **Product Owner** or **Developer**;
   - if Product Owner, extract key concepts and rewrite them into precise technical language,
     **never inventing** missing details;
   - record every doubt in `.specify/memory/spec-open-questions.md` (deferred, not guessed).
3. Return the normalized technical description as the effective input for `/speckit-specify`,
   noting that deferred questions are asked after the command (by the review hook).
