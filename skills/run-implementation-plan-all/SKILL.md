---
name: run-implementation-plan-all
description: Finish the current implementation plan — one chunk per pass, then the next, across turns until the plan is done. Use when the user says "run them all", "finish the plan", "run-implementation-plan-all", or starts /goal without naming a single chunk.
---

# Run an Implementation Plan — All

Finish the plan. This is the same loop as [`run-implementation-plan`](../run-implementation-plan/SKILL.md). Follow that skill in full — the queue, the twelve card steps, the definition of done, and the host continuation.

Continue in the current session. Use host goal tools only when that mode is already authorised, with the same scope and checkpoint.

Verification follows `run-implementation-plan`: the coordinating agent owns the check scope and reuses current worker evidence. Run applicable targeted checks and inspect the complete task diff. Apply [write-tests](../write-tests/SKILL.md) for full-check thresholds: explicit requests, applicable repository requirements, and release boundaries.

**Not this skill:** writing a plan (`author-implementation-plan`), or a request for one named card without a wider plan request (`run-implementation-plan`).

## Related skills

- `run-implementation-plan` — the loop
- `write-tests` — whether a chunk test should exist
- `author-implementation-plan` — writes the plan
