---
name: run-implementation-plan-all
description: Finish the current implementation plan — one chunk per pass, then the next, across turns until the plan is done. Use when the user says "run them all", "finish the plan", "run-implementation-plan-all", or starts /goal or /loop without naming a single chunk.
---

# Run an Implementation Plan — All

Finish the plan. This is the same loop as [`run-implementation-plan`](../run-implementation-plan/SKILL.md). Follow that skill in full — the queue, the twelve card steps, the definition of done, and the host continuation.

Host entry is [`goal`](../goal/SKILL.md) — `/goal` on Codex, `/loop` on Cursor. The interval is next card, not a clock.

**Not this skill:** writing a plan (`author-implementation-plan`). A named chunk with **only** stops after that card, still via `run-implementation-plan`.

## Related skills

- `run-implementation-plan` — the loop
- `goal` — the `/goal` / `/loop` wrapper
- `write-tests` — whether a chunk test should exist
- `author-implementation-plan` — writes the plan
