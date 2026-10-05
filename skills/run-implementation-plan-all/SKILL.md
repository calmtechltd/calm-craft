---
name: run-implementation-plan-all
description: Run the selected implementation plan in a host goal until its agreed executable queue is implemented and appropriately verified. Use for "run them all", "finish the plan in a goal", "run-implementation-plan-all", or /goal with an implementation plan.
---

# Run an Implementation Plan — All

Run [`run-implementation-plan`](../run-implementation-plan/SKILL.md) in a goal that completes the selected plan's agreed executable queue. The goal provides persistence; the selected plan and governing spec retain their scope and authority.

1. Establish the selected queue through `run-implementation-plan`'s scope boundary. Keep deferred context separate from executable work.
2. Start a host goal for that assignment, or continue the existing goal for the same assignment. Its objective names the selected plan and scope; its completion condition is the run skill's definition of done. Use the same checkpoint across continuation turns. If host goals are unavailable, continue the same scoped loop in the current session and report the limitation.
3. Follow `run-implementation-plan` in full for execution, verification and close-out. Complete dependency-ready work within the agreed queue. Report blocked or unverified work as incomplete and honour user changes to the assignment.

Execution and review rules live in `run-implementation-plan`. This wrapper adds goal continuation without adding deliverables, audit scope or a separate verification cycle.

For an assignment currently scoped to one named card, use `run-implementation-plan`. Planning uses `author-implementation-plan`.
