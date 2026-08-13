---
name: run-implementation-plan
description: Pick up an implementation plan and implement exactly one chunk — reading its specs and flow transitions first, staying inside its scope fence, and marking it complete. Use when the user says "do the next chunk", "continue the plan", "ship B4", "run the implementation plan", or names a chunk ID.
---

# Run an Implementation Plan

Implement **exactly one chunk**. The constraint is the whole point: a chunk is sized so its diff is reviewable and its acceptance criteria are checkable, and that property disappears the moment you do two.

Commands and paths: `.engineering/config.yaml`. Spec format: [`references/spec-format.md`](../../references/spec-format.md).

## When to use

- "Do the next chunk" / "continue the plan".
- "Ship B4" / "run E1."

**Not this skill:** writing a plan (`author-implementation-plan`), multi-chunk sprints without an explicit ask.

## Workflow

### 1. Open the plan and pick the chunk

Find the plan at the plans path, or ask which feature if several match. Read the header and the how-to-use section.

Resolve the chunk in order:

1. The ID I named.
2. The plan's "Next up" marker.
3. The first chunk in execution order that isn't complete.

**Verify Depends on either way.** If prerequisites aren't complete, stop and report the blocker — do not skip ahead. If everything is complete, say so; don't start new scope.

### 2. Load the acceptance criteria before writing code

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
- **Do not start the next chunk.** Not even if it's small. Especially if it's small.

### 4. Verify before marking complete

- **Done when** is satisfied — including the manual app path for UI chunks. Actually do it; don't assume.
- Tests for server logic where the repo tests similar code.
- Each cited flow transition has a test, and each guard has both branches, where there's a test surface for it.
- Spec badges updated for shipped behaviour (`spec-maintain-on-ship`).
- No type or lint regressions on touched files.

Then mark the chunk complete in the plan with a dated status line, and advance the "Next up" marker.

### 5. Hand back

Chunk ID and title; what shipped in one short paragraph; how you verified Done when; anything I still need to do myself; and the next chunk ID — unimplemented.

## Quality gate

- [ ] Depends on verified before starting.
- [ ] Specs and flow transitions read before any code.
- [ ] Nothing implemented outside Work, or inside Out of scope.
- [ ] No undeclared transition, guard, bypass, or exit added.
- [ ] Done when verified, not assumed — manual path walked for UI.
- [ ] Spec badges updated.
- [ ] Plan file updated; next chunk not started.

## Anti-patterns

- **Two chunks because the second is small.** The most common failure.
- **Pulling deferred work forward** because it's convenient while you're in the file.
- **Marking complete on tests alone** when Done when requires the app.
- **Adding a transition the contract doesn't have** and planning to update the spec after.
- **Re-litigating open decisions** without asking.

## Related skills

- `author-implementation-plan` — writes the plan
- `spec-maintain-on-ship` — badges in the same change
- `ready-for-pr` — gates before opening the pull request
- `branch-self-review` — review the chunk's diff before anyone else
