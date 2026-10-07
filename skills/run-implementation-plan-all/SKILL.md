---
name: run-implementation-plan-all
description: >-
  Create or continue a host goal to finish the selected implementation plan,
  verifying and recording one chunk at a time across turns. Use when the user
  explicitly invokes run-implementation-plan-all or requests a goal to finish
  all remaining chunks. Ordinary one-chunk or session-only runs use
  run-implementation-plan.
---

# Run Implementation Plan — All

Explicitly invoking `$run-implementation-plan-all` requests a host goal to finish the selected plan's agreed delivery scope. Its default prompt spells out that request. If this skill was selected implicitly, create a goal only when the user explicitly requested one; otherwise follow the user's assigned scope in [`run-implementation-plan`](../run-implementation-plan/SKILL.md).

For an explicitly requested goal, follow [`run-implementation-plan`](../run-implementation-plan/SKILL.md) in full, selecting **Finish the plan** with **Host goal**. Open the plan, then run **Set up a requested host goal** before implementing the first chunk. Call the goal tools and confirm setup succeeded; stating an objective in prose does not create a goal.

Reuse a matching active goal and preserve the plan checkpoint across turns. Verify and record each chunk before starting the next. Deferred phases and backlog work remain outside the selected scope. Required but unverified work prevents both chunk and goal completion. Follow the host's lifecycle and blocker rules when updating the goal.

If goal tools are unavailable or setup fails, report the limitation explicitly. Do not silently substitute a session-only run or claim a goal exists.

Keep a concise checkpoint in the plan or the repository's existing checkpoint location: selected scope, completed chunks, verification evidence, blockers, and next action. Read it on continuation; do not reset progress. Do not commit temporary `.active/` checkpoints.

Before completing the goal, inspect the complete task diff, including committed, staged, unstaged, and untracked task changes, and address verified in-scope findings. Follow [`write-tests`](../write-tests/SKILL.md) for proportionate checks and reuse current evidence; do not run full suites after every chunk. Required but unrun acceptance checks remain unverified.

This invocation authorises implementing the selected scope. Commits, pushes, PR creation, and database migration application still require the user's authorisation and the repository's rules.
