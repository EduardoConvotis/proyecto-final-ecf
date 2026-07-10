---
name: "speckit-spec-guardian-normalize"
description: "Pre-specify hook. Runs before /speckit-specify and dispatches the spec-author-normalizer agent, which detects whether the feature text came from a Product Owner or a Developer, rewrites Product Owner text into technical language without inventing anything, and defers any doubts as questions to ask after the command."
argument-hint: "(none — invoked automatically as a before_specify hook)"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "spec-guardian"
  source: ".specify/extensions/spec-guardian/commands/speckit.spec-guardian.normalize.md"
user-invocable: true
disable-model-invocation: false
---

# Spec Guardian — Input normalization dispatch

You run **before** `/speckit-specify`. Hand the raw feature text to the
**`spec-author-normalizer`** agent and pass its normalized output back so the specify
Outline uses it as the effective feature description.

## Steps

1. Take the text the user typed after `/speckit-specify` (the feature description).
   If it is empty, skip with: `Spec Guardian: no hay texto que normalizar.`
2. Launch the `spec-author-normalizer` agent via the Agent tool with
   `subagent_type: "spec-author-normalizer"`, passing the raw text. Instruct it to:
   - detect whether the author is a **Product Owner** or a **Developer**;
   - if Product Owner, extract the key concepts and rewrite them into precise technical
     language for the spec, **without inventing** anything;
   - record every doubt/unknown as a deferred question in
     `.specify/memory/spec-open-questions.md` instead of guessing.
3. When the agent returns, relay to the specify flow:
   - the detected **author** and
   - the **`## Normalized feature description`** block — this is the description
     `/speckit-specify` should build the spec from.
4. State clearly that the deferred questions are **not** to be answered now — they will be
   asked after the command completes (by the spec-guardian review hook). Do not invent
   answers to them. Then return control so specification proceeds.

Do not create the spec file or ask the deferred questions here.
