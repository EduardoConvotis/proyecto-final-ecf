---
name: "speckit-spec-guardian-review"
description: "Post-specify hook. Runs after /speckit-specify finishes and dispatches the spec-reviewer agent, which audits the spec for constitution traceability, test traceability (every FR and edge case has a test, every test maps to an FR), EARS conformance of every functional requirement, and edge-case test coverage — then surfaces any deferred questions and warns about anything to fix."
argument-hint: "(none — invoked automatically as an after_specify hook)"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "spec-guardian"
  source: ".specify/extensions/spec-guardian/commands/speckit.spec-guardian.review.md"
user-invocable: true
disable-model-invocation: false
---

# Spec Guardian — Specification review dispatch

You run **after** `/speckit-specify` completes. Hand the review to the **`spec-reviewer`**
agent and relay its findings so the user can correct anything flagged.

## Steps

1. Launch the `spec-reviewer` agent via the Agent tool with
   `subagent_type: "spec-reviewer"`. Instruct it to locate the spec (via
   `.specify/feature.json` → `feature_directory`/spec.md) and check:
   - **Constitution traceability** — every requirement/user story references the
     constitution principle(s) it upholds; flag laws or requirements with no link.
   - **Test traceability** — every functional requirement (FR/RF) has at least one test
     (acceptance scenario), and every test traces back to an FR; flag both kinds of gap.
   - **EARS conformance** — every functional requirement is valid EARS; **no FR in any other
     format**; flag and suggest a corrected rewrite for each violation.
   - **Edge case coverage** — every edge case has a corresponding test; flag those without.
   - **RBAC / authorization coverage** — for every state-changing action, verify a per-action
     denial requirement in EARS (unwanted-behavior), a negative (deny) acceptance scenario, and
     its test; check ownership/resource rules; cross-check `docs/security/rbac-matrix.md` if present.
   - **AI-backed requirement verifiability** — for every AI/LLM-backed requirement, verify an I/O
     contract (`contracts/ai/*.contract.md`), an abstention/no-invention + grounding + fallback
     requirement in EARS, and an eval with acceptance thresholds (`evals/*/`) mapped to SC-###.
   - Also read `.specify/memory/spec-open-questions.md` and surface any deferred questions.
2. When the agent returns, relay its `# Spec Review Report` to the user, leading with the
   VERDICT (`✅ OK` / `⚠️ NEEDS FIXES`). If it needs fixes, present the concrete list of
   items to correct. Do not auto-fix — the point is to **warn for correction**.
3. If there are deferred questions from normalization, present them now and ask the user to
   answer them (this is the "ask after the command" step). Do not guess.

Do not edit the spec yourself — always delegate the audit to the agent.
