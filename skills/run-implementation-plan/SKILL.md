---
name: run-implementation-plan
description: Pick up an implementation plan and implement every remaining chunk — one reviewable pass at a time — without waiting for another prompt. Use when the user says "run the implementation plan", "continue the plan", "do the next chunk", "ship B4", "finish the plan", or names a chunk ID.
---

# Run an Implementation Plan

Implement the plan **until it is done**. The chunk is still the unit of work: one reviewable pass, then the next. The skill does not stop after the first chunk.

A chunk is sized so its diff is reviewable and its acceptance criteria are checkable. That property disappears the moment you do two in one pass. The loop is what changed — not the fence.

Commands and paths: `.engineering/config.yaml`. Spec format: [`references/spec-format.md`](../../references/spec-format.md). Continuation: [`goal`](../goal/SKILL.md).

## When to use

- "Run the implementation plan" / "finish the plan" / "continue the plan".
- "Do the next chunk" / "ship B4" / "run E1."

**Not this skill:** writing a plan (`author-implementation-plan`). A named chunk starts there; it does not mean "stop after it" unless I say **only** that chunk.

## Host continuation

After each chunk, if dependency-ready work remains, **do not wait for another prompt**. Continue like this:

1. **Same session, if context is healthy** — start the next chunk immediately.
2. **New turn required** — use the host's continuation command, same scope, same checkpoint:
   - **Cursor** — `/loop` on this skill, or `/goal` if this plugin's `goal` skill is how the session started. The interval is "next chunk". The stop condition is the definition of done below, not a clock.
   - **Hosts with `/goal`** (Codex and similar, or this plugin's `goal` skill) — `/goal` with the same scope.
   - **Neither available** — keep working in this session anyway.

Do not treat Cursor `/loop` as a timed job. Do not re-litigate scope when continuing. Read the checkpoint and the next chunk; do not restart the plan.

If I attached supplementary text, or the repo has a goal overlay (`paths.goal` in the config, default `.engineering/goal.md`), honour it. That file is how a consuming app adds repo-specific loop constraints without forking this skill.

## Workflow

### 1. Open the plan and build the queue

Find the plan at the plans path, or ask which feature if several match. Read the header and the how-to-use section.

Resolve the starting chunk in order:

1. The ID I named.
2. The plan's "Next up" marker.
3. The first chunk in execution order that isn't complete.

**Verify Depends on either way.** If prerequisites aren't complete, stop and report the blocker — do not skip ahead. If everything is complete, say so; don't start new scope.

Build a dependency-ordered queue of remaining in-scope chunks. Work one at a time.

Keep a concise checkpoint under `.active/` — scope, queue, completed chunk IDs, verification evidence, blockers, and the next action. `.active/` is working state, not a deliverable; do not commit it.

### 2. Load the acceptance criteria before writing code

For the current chunk:

- Read the cited **specs in full**, or at least the cited behaviour IDs.
- Read the **flow contract** and the exact transitions assigned to this chunk. The YAML governs; Mermaid is a human view.
- Read **Work**, **Done when**, **Out of scope**.
- Skim the design doc only for ambiguity — the chunk and spec win.

Restate in three lines — chunk ID, goal, Done when — then implement. Don't wait for approval.

### 3. Implement, inside the fence

- **Out of scope is a hard wall**, not a suggestion.
- Implement only the states, events, guards, and outcomes the flow contract allows. Preserve documented back, cancel, retry, failure, and resumable paths. **If the code seems to need an undeclared transition, stop and change the contract first** — implementing it and reconciling later is how a contract becomes fiction.
- Foundation chunks may be backend-only; UI chunks ship their routes in the same change.
- Follow the repo's conventions. If `conventions-audit` exists and the chunk is substantial, running it beats discovering violations at review.
- If you add a dependency, use `package_manager` from the config — never guess `npm` vs `pnpm`. Honour the install-script allowlist and release cooldown if those decisions exist. Do not commit `.env` or put a real secret in `.env.example`.
- **Do not start the next chunk in this pass.** Finish, verify, and record this one first.

### 4. Verify before marking complete

- **Done when** is satisfied — including the manual app path for UI chunks. Actually do it; don't assume.
- Tests for server logic where the repo tests similar code.
- Each cited flow transition has a test, and each guard has both branches, where there's a test surface for it.
- Spec badges updated for shipped behaviour (`spec-maintain-on-ship`).
- No type or lint regressions on touched files.

Then mark the chunk complete in the plan with a dated status line, advance the "Next up" marker, and update the checkpoint.

### 5. Continue, or stop for a real reason

If the queue still has a dependency-ready chunk, go back to step 2. Use the host continuation rules above when a new turn is required.

Stop only when one of these is true:

- Every remaining in-scope chunk is complete.
- I asked for **only** one named chunk.
- A prerequisite is incomplete and you cannot complete it inside this scope.
- A product decision is genuinely blocking and the specs, code, tests, and linked decisions do not settle it. Batch those and ask. Do not invent a product decision.
- An external dependency you cannot resolve.

Skip a blocked chunk, record it on the checkpoint, and continue with anything that does not depend on it.

### 6. Close the plan

When the queue is empty or only blockers remain:

- Run `branch-self-review` on the branch, then `ready-for-pr`.
- Leave the checkpoint stating what shipped, what was verified, remaining blockers, and anything I still need to do myself.
- Do not push, open a pull request, or commit unless I asked, or the goal overlay names a local checkpoint command.

## Definition of done

- Every in-scope chunk is implemented or explicitly recorded as blocked.
- Every implemented behaviour, invariant, and cited flow transition has the evidence this repo uses for that kind of change.
- Specs and the plan describe the final state.
- `branch-self-review` and `ready-for-pr` have been run on the finished branch.

## Quality gate

- [ ] Depends on verified before starting each chunk.
- [ ] Specs and flow transitions read before any code for that chunk.
- [ ] Nothing implemented outside Work, or inside Out of scope.
- [ ] No undeclared transition, guard, bypass, or exit added.
- [ ] Done when verified, not assumed — manual path walked for UI.
- [ ] Spec badges updated.
- [ ] Plan file and checkpoint updated after each chunk.
- [ ] Next chunk not started in the same pass.
- [ ] The skill did not stop while dependency-ready work remained, unless I asked for only one chunk.

## Anti-patterns

- **Stopping after the first chunk** because the old skill did. The loop is the job.
- **Two chunks in one pass** because the second is small. The most common failure.
- **Pulling deferred work forward** because it's convenient while you're in the file.
- **Marking complete on tests alone** when Done when requires the app.
- **Adding a transition the contract doesn't have** and planning to update the spec after.
- **Re-litigating open decisions** without asking.
- **Using `/loop` on a wall-clock interval** instead of "next chunk until done".

## Related skills

- `goal` — the `/goal` wrapper; supplementary scope and the same loop
- `author-implementation-plan` — writes the plan
- `spec-maintain-on-ship` — badges in the same change
- `ready-for-pr` — gates before opening the pull request
- `branch-self-review` — review the branch before anyone else
