---
name: run-implementation-plan-all
description: Run the selected implementation plan in a host goal, calling run-implementation-plan for one chunk per pass until the selected delivery scope is complete. Use for "run them all", "finish the plan in a goal", or "run-implementation-plan-all".
---

# Run Implementation Plan — All

Run [run-implementation-plan](../run-implementation-plan/SKILL.md) in a host goal.

1. Start or continue a goal whose objective names the selected plan and delivery scope.
2. On each pass, follow the runner in full for exactly one selected chunk. Keep the plan's progress across passes and honour changes to the user's assignment.
3. Complete the goal when every selected chunk satisfies its existing **Done when**. Follow the runner's dependency checks and blocker handling.

The runner supplies chunk selection, implementation, verification and completion rules.
