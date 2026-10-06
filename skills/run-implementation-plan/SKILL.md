---
name: run-implementation-plan
description: >-
  Execute the next incomplete chunk from an implementation plan. Finds the
  chunk, reads linked specs, implements within scope, and marks it complete.
  Use when the user says do the next chunk, next thing, continue the plan,
  ship B4, or run the implementation plan.
---

# Run Implementation Plan

Pick up an existing `*-implementation-plan.md` and **implement exactly one chunk**. Pair with `author-implementation-plan` (wrote the plan) and `spec-maintain-on-ship` (badge updates in the same PR).

## When to use

- "Do the next chunk."
- "Continue the standards plan."
- "Ship B4" / "Run E1."
- "Run the implementation plan."

**Not this skill:** writing a new plan (`author-implementation-plan`), multi-chunk sprints without explicit ask, or generic tasks with no plan file.

## Workflow

### 1. Open the plan

Path from the user, or search `.active/**/*-implementation-plan.md`. If several match, ask which feature.

Read the header (**Strategy**, agent session rules, migration note) and **How to use this plan**.

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

### 4. Implement (one chunk only)

- Stay inside **Work**; treat **Out of scope** as hard walls.
- Foundation chunks may be API-only; UI chunks ship routes/pages in the same PR.
- Follow project rules (permissions, audit, ServerDataGrid patterns, etc.).
- Do **not** run `drizzle generate` or `drizzle migrate` — warn the user if schema changed.
- Do **not** start the following chunk.

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
- Next chunk ID (do not implement it)

## Anti-patterns

- Implementing two chunks because the second is "small"
- Pulling deferred-phase work forward because it is convenient
- Marking complete on tests alone when **Done when** requires the app
- Re-litigating **Open decisions** without user input

## Related

- `author-implementation-plan` — creates the plan
- `spec-maintain-on-ship` — behaviour badges in the same PR
- `planning.mdc` — when the user wants approval between micro-steps inside a chunk
- `ready-for-pr` — before opening a PR for the chunk
