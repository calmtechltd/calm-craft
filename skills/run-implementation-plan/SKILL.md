---
name: run-implementation-plan
description: >-
  Execute one chunk or, when explicitly requested, finish the selected
  implementation plan. Read linked specs, implement within scope, and verify
  each chunk before marking it complete. Use when asked to run, continue, or
  finish a plan, implement a named or next chunk, or execute a plan in a host goal.
---

# Run Implementation Plan

Pick up an existing `*-implementation-plan.md` and implement **one chunk per pass**. Pair with `author-implementation-plan` (wrote the plan) and `spec-maintain-on-ship` (badge updates in the same PR).

## When to use

- "Do the next chunk."
- "Continue the standards plan."
- "Ship B4" / "Run E1."
- "Run the implementation plan."
- "Finish the selected plan."
- "Run this plan in a host goal."

**Not this skill:** writing a new plan (`author-implementation-plan`) or generic tasks with no plan file.

## Select execution scope

- **One chunk (default):** a named chunk, "next chunk", or an ordinary "run" / "continue the plan" request selects one chunk unless the user has already authorized finishing the wider scope. Verify and record that chunk, then report the next one.
- **Finish the plan:** an explicit "finish the plan" or "run all remaining chunks" request selects the plan's agreed delivery scope. Repeat the workflow below one chunk at a time; verify and record each chunk before starting the next. Continue without another prompt until the selected scope is complete or blocked. Do not start deferred phases or backlog work outside that scope.
- **Host goal:** when the user explicitly requests a host goal, set it up after opening the plan and before implementing a chunk, using the procedure below. Follow the same chunk workflow on each pass and preserve progress across passes. Finishing a plan in the current session does not by itself authorize creating a persistent goal.

Use [`run-implementation-plan-all`](../run-implementation-plan-all/SKILL.md) as the explicit shortcut to create or continue a host goal for the remaining delivery scope. Ordinary finish-plan requests can still run in the current session without a goal.

## Workflow

### 1. Open the plan

Path from the user, or search `.active/**/*-implementation-plan.md`. If several match, ask which feature.

Read the header (**Strategy**, agent session rules, migration note) and **How to use this plan**.

#### Set up a requested host goal

Use the host's goal tools; a written objective or plan status is not a host goal.

1. Inspect the current goal with `get_goal` (or the host's equivalent). Reuse an active goal that already covers the selected plan and scope, provided its completion criteria cover every selected chunk's existing **Done when**. An unfinished goal for unrelated work must be resolved with the user; do not overwrite it or mark it complete to make room.
2. When no unfinished goal exists, call `create_goal` with an objective naming the plan path, selected delivery scope, and completion criteria: implement and verify every selected chunk against its existing **Done when**, and record evidence in the plan. Set a token budget only if the user explicitly requested one.
3. Confirm setup succeeded before coding. If goal tools are unavailable or setup fails, report that limitation explicitly; do not claim a goal was created. Continue session work only when the user's request allows it.

On continuation, read the current goal and plan checkpoint before selecting the next chunk. Honor the user's current assignment and the host's goal lifecycle rules. Required but unverified work remains incomplete. Call `update_goal` with `complete` only when every selected chunk satisfies **Done when** and no required work remains. Use `paused` only at the user's explicit request, and `blocked` only when the host's blocker threshold is met. Do not mark a goal complete because a pass ended or its budget is nearly exhausted.

### 2. Pick the chunk

Select only from the user's current assignment or, when none is specified, the plan's selected delivery scope.

Resolve in order:

1. User named a chunk ID → use it (still verify **Depends on**).
2. Plan has **Next up:** in milestones → start there if deps are satisfied.
3. Otherwise first `### Chunk {Id}` in execution order whose **Status** is not `🟢 complete` (or has no status line).

If **Depends on** chunks are not complete, stop and report the blocker — do not skip ahead.

If every chunk is complete, say so and point at any **Phase E** / backlog table without auto-starting new scope.

### 3. Load acceptance criteria

Before coding:

- Read the chunk's **Spec(s)** in full (or the behaviour IDs cited).
- Read **Work**, **Done when**, **Out of scope**.
- Skim linked design doc only for ambiguity — the chunk + spec win.

Restate in three lines: **chunk ID**, **goal**, **Done when**. Then implement — no waiting for approval unless the user invoked `planning.mdc` for step-by-step execution.

### 4. Implement the selected chunk

- Stay inside **Work**; treat **Out of scope** as hard walls.
- Foundation chunks may be API-only; UI chunks ship routes/pages in the same PR.
- Follow project rules (permissions, audit, ServerDataGrid patterns, etc.).
- Do **not** run `drizzle generate` or `drizzle migrate` — warn the user if schema changed.
- Do **not** start the following chunk until this chunk is verified and recorded, and only when the user authorized the wider scope.

Use a subagent only if the chunk's **Work** list is large enough that context would explode — still one chunk.

### 5. Finish

Before marking done:

- [ ] **Done when** is satisfied (manual app path for UI chunks).
- [ ] Tests for server logic where the repo already tests similar code.
- [ ] Spec badges updated for shipped behaviours (`spec-maintain-on-ship`).
- [ ] No type/lint regressions on touched files.
- [ ] Per-chunk PR checklist in the plan (specs, manual steps, migration note, audit).

Update completion status and verification evidence against the existing Work and Done when. Changes to agreed behaviour, scope or acceptance criteria require an agreed user decision.

Update the plan file:

```markdown
**Status:** 🟢 complete — YYYY-MM-DD
```

Add under the chunk heading. If the plan has a **Next up:** line, update it to the following chunk.

### 6. Hand back

Return:

- Chunk ID and title
- What shipped (files/areas, one short paragraph)
- **Done when** — confirm how you verified
- User actions needed (migrate, seed, manual smoke)
- Next chunk ID, or completion of the selected delivery scope

In one-chunk mode, stop here. In finish-plan mode, repeat from chunk selection while work remains in the selected scope. In goal mode, keep the same scope and progress across passes; blocked or unverified chunks remain incomplete.

## Anti-patterns

- Expanding a one-chunk assignment because the next chunk is "small"
- Starting the next chunk before verifying and recording the current one
- Pulling deferred-phase work forward because it is convenient
- Marking complete on tests alone when **Done when** requires the app
- Re-litigating **Open decisions** without user input

## Related

- `run-implementation-plan-all` — create or continue a host goal to finish the selected plan
- `author-implementation-plan` — creates the plan
- `spec-maintain-on-ship` — behaviour badges in the same PR
- `planning.mdc` — when the user wants approval between micro-steps inside a chunk
- `ready-for-pr` — before opening a PR for the chunk
