# UX Journey Design

Use this reference when a spec-governed journey needs screen-level storyboarding or a UX review. It complements [`spec-format.md`](./spec-format.md): the spec owns observable product intent, the flow YAML owns allowed states and transitions, and the storyboard tests whether each user-visible state communicates and recovers well.

This is a platform-neutral translation of long-lived Apple interface principles. It does not claim Human Interface Guidelines compliance. Check the target platform's current guidance when platform-specific behaviour matters.

## Keep baseline and target separate

For an existing feature, capture two views:

- **Baseline:** what the running product and code permit now, including awkward paths, silent redirects, lost input, and dead ends.
- **Target:** the journey the team has agreed to build.

Do not clean up the baseline while documenting it. Do not write the target into the authoritative spec until the user accepts the product changes. Once accepted, update behaviours before the flow contract. An unbuilt target stays `future` or `partial`; code presence never earns `implemented`.

## Storyboard scenes

Draft the baseline and target as review views first. Once the user accepts the target, record each scene in the owning state's `storyboard` block inside the authoritative flow YAML. Keeping scene evidence with the state prevents a separate storyboard file from drifting away from the allowed transitions.

Create one row per user-visible scene:

| Field           | Record                                                               |
| --------------- | -------------------------------------------------------------------- |
| Scene           | Stable flow state ID and user-facing label                           |
| User goal       | The result the user is trying to reach in this scene                 |
| Enters with     | Prior decision, context, data, and system state                      |
| Sees and knows  | Information needed to understand the current state and likely result |
| Primary action  | The clearest next action                                             |
| Other exits     | Back, cancel, pause, skip, or a safe alternative                     |
| System feedback | Progress, success, validation, permission, or failure feedback       |
| Preserved state | Valid input or context that survives navigation and retry            |
| Contract links  | Behaviour IDs and incoming or outgoing transition IDs                |

Include action states when processing takes long enough to need progress, cancellation, or resumability. Include terminal scenes when the user needs a result, next step, or explanation of what happened to their data.

## Apple-inspired review lens

### Clarity

The user can identify the current step, the main action, and its likely result. Use specific labels and outcomes. Remove choices that do not affect the result.

### Deference

The interface gives the task and user content more attention than its controls. Remove scenes that exist to explain the interface or confirm a reversible choice.

### Continuity and depth

Each transition preserves enough context for the user to understand where they came from and what changed. Back and resume return to a meaningful state rather than restarting the task.

### User control

The journey exposes cancel, pause, undo, or safe exit where the cost of proceeding warrants it. Ask for confirmation at destructive or irreversible boundaries, not as routine friction.

### Progressive disclosure

Ask for a decision when it becomes relevant. Put advanced and exceptional choices behind explicit branches instead of loading the first scene with every possibility.

### Feedback

Each action produces a visible response. Long-running work shows progress or a durable pending state. Permission and validation failures explain the next available action.

### Forgiveness

Retry preserves valid work. Validation points to the field, row, or decision that needs attention. Failure routes return to an editable state when recovery exists.

### Consistency and platform fit

Use established product and platform patterns for navigation, selection, destructive actions, keyboard behaviour, and focus. A novel control needs a product reason.

### Accessibility

Storyboard keyboard order, focus movement, error association, reduced-motion behaviour, and screen-reader announcements when they affect a transition or recovery path. Visual polish cannot compensate for an unreachable action.

## Review order

1. Remove scenes that add no decision, information, safety, or feedback.
2. Put permission and feasibility checks before the user invests work.
3. Give each scene one clear primary action and a truthful exit.
4. Delay advanced choices until their branch becomes relevant.
5. Make processing, success, failure, and partial success visible.
6. Preserve valid input across back, retry, and resume.
7. State what happened to user data at each terminal outcome.

## Turning review findings into spec changes

Tie each proposed UX change to product intent:

- Amend or add a behaviour when the user-visible result changes.
- Add an invariant when preservation, safety, or permission must hold across paths.
- Add a decision-table row when the result depends on a combination of conditions.
- Change the flow YAML when a state, event, guard, route, or terminal outcome changes.

Every target transition must cite the behaviours it clarifies through `covers`. Preserve IDs for states and transitions whose meaning did not change. Record accepted scene evidence in each user-visible state's `storyboard` block, then generate Mermaid from YAML.

Layout, copy, responsive behaviour, animation, and visual hierarchy still need screen design and browser review. A complete flow contract makes those reviews easier; it does not replace them.
