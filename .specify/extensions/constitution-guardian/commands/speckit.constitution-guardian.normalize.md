---
description: "Before /speckit-constitution: classify the raw text by domain (backend / frontend / CI-CD) and, when the wording is non-technical, rewrite it into precise engineering language without inventing, writing the result to a .txt file."
---

# Constitution Guardian — Input normalization

This command is a `before_constitution` hook. Its full behavior lives in the Claude Code
skill `speckit-constitution-guardian-normalize`
(`.claude/skills/speckit-constitution-guardian-normalize/SKILL.md`).

Summary:

1. Take the raw text passed to `/speckit-constitution`. If empty, skip.
2. Launch the `constitution-author-normalizer` agent
   (`subagent_type: "constitution-author-normalizer"`) to:
   - classify the domain(s): **backend**, **frontend**, or **ci-cd** (one or more, with a primary);
   - judge the register and, if **non-technical**, rewrite it into precise engineering
     language for a constitution, **never inventing** missing details;
   - write the result to `.specify/memory/constitution-input-normalized.txt`.
3. Return the normalized technical text as the effective input for `/speckit-constitution`,
   noting that deferred questions are asked after the command completes.
