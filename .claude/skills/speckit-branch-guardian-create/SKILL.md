---
name: "speckit-branch-guardian-create"
description: "Pre-specify hook. Runs before /speckit-specify and creates (and switches to) a new git branch named after the feature (NNN-short-name), using Spec Kit's official naming so the branch matches the spec directory. Outputs BRANCH_NAME/FEATURE_NUM for the specify command to reuse. Does not create the spec directory (that is the specify command's job)."
argument-hint: "(none — invoked automatically as a before_specify hook)"
compatibility: "Requires spec-kit project structure with .specify/ directory and a git repository"
metadata:
  author: "branch-guardian"
  source: ".specify/extensions/branch-guardian/commands/speckit.branch-guardian.create.md"
user-invocable: true
disable-model-invocation: false
---

# Branch Guardian — Create feature branch

You run **before** `/speckit-specify`. Create and switch to a git branch named after the feature so
all the spec work lands on its own branch. You create **only the branch** — the spec directory and
`spec.md` are always created by `/speckit-specify`, never here.

## Steps

1. **Feature description** = the text the user typed after `/speckit-specify`. If it is empty, skip
   with `Branch Guardian: sin descripción, no creo rama.` and return.
2. **Git check**: confirm this is a git repository (`git rev-parse --is-inside-work-tree`). If not,
   skip with `Branch Guardian: no es un repositorio git — omito la creación de rama.` (never block specify).
3. **Compute the branch name** with Spec Kit's official namer (so the branch equals the future spec
   directory). Run a **dry run** (does not create any directory):

   ```
   powershell -NoProfile -File .specify/scripts/powershell/create-new-feature.ps1 -Json -DryRun "<feature description>"
   ```

   Parse `BRANCH_NAME` and `FEATURE_NUM` from the JSON (e.g. `002-panel-de-notificaciones`).
   - If the user explicitly provided `GIT_BRANCH_NAME`, use that exact value as the branch name
     instead (bypass the namer). If they provided a `SHORT_NAME`, pass it as `-ShortName "<name>"`.
4. **Create / switch** to the branch (idempotent):
   - New branch from current HEAD: `git switch -c "<BRANCH_NAME>"`.
   - If it already exists (`git switch -c` fails because the branch exists), switch to it:
     `git switch "<BRANCH_NAME>"` and note that it already existed.
   - If the working tree has uncommitted changes, proceed but note it (the changes carry over to the
     new branch); do not stash or discard anything.
5. **Output** a JSON line so `/speckit-specify` can reuse it (its Outline step 2 reads BRANCH_NAME/FEATURE_NUM):

   ```json
   {"BRANCH_NAME": "<BRANCH_NAME>", "FEATURE_NUM": "<FEATURE_NUM>"}
   ```

   State the branch created/switched, then return control so specification proceeds on that branch.

Do **not** run `create-new-feature.ps1` without `-DryRun` here (that would create the spec directory,
which is the specify command's responsibility). Do not modify files other than via `git switch`.
