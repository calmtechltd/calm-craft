---
name: run-implementation-plan-all
description: Finish the current implementation plan — one chunk per pass, then the next, across turns until the plan is done. Use when the user says "run them all", "finish the plan", "run-implementation-plan-all", or starts /goal without naming a single chunk.
---

# Run an Implementation Plan — All

Finish the plan. This is the same loop as [`run-implementation-plan`](../run-implementation-plan/SKILL.md). Follow that skill in full — the queue, the twelve card steps, the definition of done, and the host continuation.

Host `/goal` starts this loop. The interval is next card, not a clock.

Per-card verification stays cheap: targeted tests, lint/format on touched files, path-scoped types when the tool accepts files. After the last card, run the close-out in `run-implementation-plan` — whole-programme types, knip, lint, and the test suite — and loop until green. Do not run that expensive pass after every card.

**Not this skill:** writing a plan (`author-implementation-plan`). A named chunk with **only** stops after that card, still via `run-implementation-plan`.

## Related skills

- `run-implementation-plan` — the loop
- `write-tests` — whether a chunk test should exist
- `author-implementation-plan` — writes the plan
