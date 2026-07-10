---
name: "speckit-analyze-guardian-preflight"
description: "Pre-analyze hook. Runs before /speckit-analyze and dispatches the analyze-facts agent to gather deterministic ground-truth facts (FR↔task/test coverage, EARS validation, RBAC deny coverage, AI verifiability, contract-first propagation, TDD ordering, ADR consistency) so the analysis reasons from verified facts instead of keyword inference."
argument-hint: "(none — invoked automatically as a before_analyze hook)"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "analyze-guardian"
  source: ".specify/extensions/analyze-guardian/commands/speckit.analyze-guardian.preflight.md"
user-invocable: true
disable-model-invocation: false
---

# Analyze Guardian — Ground-truth preflight

You run **before** `/speckit-analyze`. Gather the deterministic facts and hand them to the analysis
so its coverage/consistency findings rest on verified data, not inference.

## Steps

1. Launch the `analyze-facts` agent via the Agent tool with `subagent_type: "analyze-facts"`.
   Instruct it to produce a `## Ground-truth facts for analysis` brief using the deterministic MCPs
   when available (`traceability`: `task_coverage`, `coverage_report`, `list_laws`;
   `ears-validator`: `validate_requirements_block`) plus cross-checks of
   `docs/security/rbac-matrix.md`, `contracts/` and `docs/adr/`.
2. If the agent reports that `tasks.md` is missing, surface that and note that `/speckit-analyze`
   cannot run until `/speckit-tasks` has produced it — then return control.
3. Relay the agent's ground-truth brief so `/speckit-analyze` uses it as input to its detection
   passes (coverage gaps, EARS ambiguity, constitution alignment, RBAC/AI/contract-first checks).

Do not perform the analysis or rank findings here — that is `/speckit-analyze`'s job. This hook only
supplies verified facts.
