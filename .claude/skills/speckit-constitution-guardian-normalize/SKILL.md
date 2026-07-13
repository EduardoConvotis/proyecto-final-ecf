---
name: "speckit-constitution-guardian-normalize"
description: "Pre-constitution hook. Runs before /speckit-constitution and dispatches the constitution-author-normalizer agent, which classifies the raw text by domain (backend / frontend / CI-CD), rewrites non-technical wording into precise engineering language without inventing anything, writes the result to .specify/memory/constitution-input-normalized.txt, and returns the normalized text as the effective input."
argument-hint: "(none — invoked automatically as a before_constitution hook)"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "constitution-guardian"
  source: ".specify/extensions/constitution-guardian/commands/speckit.constitution-guardian.normalize.md"
user-invocable: true
disable-model-invocation: false
---

# Constitution Guardian — Input normalization dispatch

You run **before** `/speckit-constitution`. Hand the raw text to the
**`constitution-author-normalizer`** agent and pass its normalized output back so the
constitution Outline uses it as the effective input.

## Steps

1. Take the text the user typed after `/speckit-constitution`. If it is empty, skip with:
   `Constitution Guardian: no hay texto que normalizar.` and hand control back.
2. Launch the `constitution-author-normalizer` agent via the Agent tool with
   `subagent_type: "constitution-author-normalizer"`, passing the raw text. Instruct it to:
   - classify the domain(s) — **backend**, **frontend**, or **ci-cd** (one or more, marking
     a primary);
   - judge whether the wording is technical, and if **non-technical**, rewrite it into
     precise engineering language for a constitution, **without inventing** anything;
   - write the result to `.specify/memory/constitution-input-normalized.txt`;
   - record every doubt as a deferred question instead of guessing.
3. When the agent returns, relay to the constitution flow:
   - the detected **domain(s)**, and
   - the **`## Normalized text`** block — this is the text `/speckit-constitution` should
     build the constitution from — and the path of the generated `.txt` file.
4. State clearly that the deferred questions are **not** to be answered now — surface them
   but do not invent answers. Then return control so the constitution update proceeds.

Do not write the constitution file yourself — that is the constitution command's job. This
normalizer is complementary to the preflight interview hook (which only runs for
from-scratch, empty projects); this one runs whenever there is text to normalize.
