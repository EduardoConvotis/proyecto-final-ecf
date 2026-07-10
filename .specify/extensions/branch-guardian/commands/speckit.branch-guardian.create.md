---
description: "Before /speckit-specify: create and switch to a git branch named after the feature (NNN-short-name), matching the spec directory; output BRANCH_NAME/FEATURE_NUM. Does not create the spec directory."
---

# Branch Guardian — Create feature branch

This command is a `before_specify` hook. Full behavior in the Claude Code skill
`speckit-branch-guardian-create` (`.claude/skills/speckit-branch-guardian-create/SKILL.md`).

Summary:

1. Take the feature description passed to `/speckit-specify` (skip if empty; skip if not a git repo).
2. Compute the branch name with Spec Kit's official namer via a **dry run** (no directory created):
   `powershell -NoProfile -File .specify/scripts/powershell/create-new-feature.ps1 -Json -DryRun "<desc>"`
   → `BRANCH_NAME` / `FEATURE_NUM` (e.g. `002-panel-de-notificaciones`). Honor an explicit
   `GIT_BRANCH_NAME` / `SHORT_NAME` if the user provided one.
3. `git switch -c "<BRANCH_NAME>"` (switch to it if it already exists). Uncommitted changes carry over.
4. Emit `{"BRANCH_NAME": "...", "FEATURE_NUM": "..."}` so `/speckit-specify` reuses it.

Creates only the branch — the spec directory and `spec.md` are created by `/speckit-specify`.
