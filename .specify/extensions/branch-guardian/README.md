# Branch Guardian

Creates a git branch named after the feature when `/speckit-specify` runs.

## What it does

- **`before_specify` → `speckit.branch-guardian.create`**
  Before `/speckit-specify`, computes the feature branch name with Spec Kit's official namer
  (`create-new-feature.ps1 -DryRun`, sequential `NNN-short-name`, matching the spec directory) and
  runs `git switch -c <BRANCH_NAME>`, then outputs `BRANCH_NAME`/`FEATURE_NUM` for the specify
  command to reuse (its Outline step 2 reads these).

Why a dedicated hook: the bundled `create-new-feature.ps1` computes the name and creates the spec
directory but **does not create a git branch**. This guardian adds the actual `git` branch, using a
**dry run** of that script for the name so it stays consistent — and it does **not** create the spec
directory (that remains the specify command's job).

## Behavior / guardrails

- Skips gracefully (never blocks specify) if there is no feature description or the repo is not a git repo.
- Idempotent: switches to the branch if it already exists.
- Uncommitted changes carry over to the new branch (nothing is stashed or discarded).
- Honors an explicit `GIT_BRANCH_NAME` / `SHORT_NAME` if the user provided one.

## Components

| Piece | Path |
|-------|------|
| Skill | `.claude/skills/speckit-branch-guardian-create/SKILL.md` |
| Extension manifest | `.specify/extensions/branch-guardian/extension.yml` |
| Hook registration | `.specify/extensions.yml` (`hooks.before_specify`) |
| Namer reused | `.specify/scripts/powershell/create-new-feature.ps1` (via `-DryRun`) |

## Order

Runs as the **first** `before_specify` hook (branch first), before `spec-guardian.normalize`, so the
input normalization and the spec creation happen on the new branch.
