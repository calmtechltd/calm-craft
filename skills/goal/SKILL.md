---
name: goal
description: Keep implementing the current scoped plan until it is done — wrapping run-implementation-plan and continuing via /loop or /goal depending on the host. Use when the user types /goal, says "loop the plan", "finish the scoped work", or pastes a one-line objective such as "complete the incomplete behaviours in current scope".
disable-model-invocation: true
---

# Goal

A wrapper around [`run-implementation-plan`](../run-implementation-plan/SKILL.md). That skill is one reviewable chunk per pass. This skill is why it does not stop.

`/goal` is this plugin's continuation command. Cursor also has `/loop`; some hosts already have `/goal`. Use whichever the host actually provides, and use this skill's definition of done either way.

## When to use

- I typed `/goal` or `/loop` with an implementation objective.
- "Finish the scoped work" / "complete the incomplete behaviours in current scope".
- I pasted a one-line goal and expect the agent to keep going across turns.

**Not this skill:** writing a plan (`author-implementation-plan`), running gates alone (`ready-for-pr`), or a single named chunk when I said **only** that chunk (`run-implementation-plan` still does the pass).

## Supplementary text

The words after `/goal` are the objective and the scope fence. Honour them.

A consuming app can also keep a short overlay at `paths.goal` in `.engineering/config.yaml` (default `.engineering/goal.md`). That is the place for repo-specific loop constraints — commit helpers, database generation rules, things this portable skill must not hardcode. Read it when it exists. If the slash text and the overlay disagree, the slash text wins for this run.

Do not invent a product decision to fill a gap in either.

## Host continuation

Detect the host from available slash commands, not from guessing.

| Host | Continue with | Stop when |
| --- | --- | --- |
| Cursor | `/loop` on this skill, or `/goal` again | Definition of done, or a recorded blocker |
| Codex and other hosts with `/goal` | `/goal` with the same scope | Same |
| Neither | Keep working in this session | Same |

The interval is **next chunk**, not a clock. Do not wait for another prompt while dependency-ready work remains.

If a checkpoint already exists under `.active/`, **resume it**. Do not reset the goal or rebuild the queue from scratch.

## Workflow

1. Read the slash text, then the overlay if present, then `.engineering/config.yaml`.
2. Write or refresh the `.active/` checkpoint — objective, scope, queue, completed cards, blockers, next action.
3. Hand each chunk to `run-implementation-plan` and follow that skill in full for the pass.
4. When the pass finishes, continue (table above) until the definition of done holds.
5. On a genuine blocker, record it and continue with anything that does not depend on it. Batch product decisions that the specs, code, tests, and linked decisions cannot settle. Ask those; do not invent answers.
6. When the queue is empty or only blockers remain, run `branch-self-review` and `ready-for-pr`. Do not push, open a pull request, or commit unless I asked, or the overlay names a local checkpoint command.

Treat scoped specs as the source of truth. Do not expand into unrelated specs, unscheduled future behaviours, or another feature area.

## Definition of done

- Every in-scope chunk is implemented or explicitly recorded as blocked by a decision or external dependency.
- Every implemented behaviour, invariant, and cited flow transition has the evidence this repo uses for that kind of change.
- Specs and the implementation plan describe the final behaviour and state.
- `branch-self-review` and `ready-for-pr` have been run on the finished branch.
- The checkpoint records what shipped, what was verified, remaining blockers, and any developer action.

## Quality gate

- [ ] Objective and overlay read before the first chunk.
- [ ] Each pass followed `run-implementation-plan` in full.
- [ ] No stop while dependency-ready work remained.
- [ ] Continuation used `/loop` on Cursor and `/goal` elsewhere, or stayed in-session if neither exists.
- [ ] Scope was not broadened.
- [ ] Blockers recorded rather than invented through.

## Anti-patterns

- **Doing two chunks in one pass** because the wrapper is "the whole plan". The wrapper loops; the pass stays one chunk.
- **Stopping to ask for the next prompt** when the queue is still live.
- **Hardcoding another app's commit or database ritual** into this skill. That belongs in the overlay.
- **Resetting `.active/`** on every continuation turn.
- **Using `/loop` as a timed interval** instead of "next chunk until done".

## Related skills

- `run-implementation-plan` — one chunk per pass; this skill loops it
- `author-implementation-plan` — writes the plan
- `spec-maintain-on-ship` — badges in the same change
- `branch-self-review` — review the finished branch
- `ready-for-pr` — gates before the pull request
