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
| Other exits     | Every outgoing transition except the primary transition              |
| System feedback | Progress, success, validation, permission, or failure feedback       |
| Preserved state | Valid input or context that survives navigation and retry            |
| Contract links  | Behaviour IDs and incoming or outgoing transition IDs                |

Include action states when processing takes long enough to need progress, cancellation, or resumability. Include terminal scenes when the user needs a result, next step, or explanation of what happened to their data.

## Failure and recovery scenes

A visible error state is not a recovery design. For asynchronous, AI-driven, paid, or irreversible
work, follow the user's work across the transaction boundary as well as across screens.

Review the action under success, interruption, invalid output, changed facts or permission,
silent-worker disappearance, duplicate delivery, late completion, retry, revision, cancellation,
reload, and resume wherever the product can produce those conditions. The scene review should
answer:

- What valid work, diagnosis, and user guidance survived?
- Can the user retry unchanged, revise the owning input, answer a typed question, accept a named
  limitation, or cancel?
- Which earlier review, approval, or commitment becomes stale after a revision?
- Does retry create a fresh attempt while duplicate or late output remains harmless?
- Does the user return to the same recovery point after navigation, reload, or a narrow-layout pass?
- Is every offered action executable from the current durable state, or is the interface promising
  an escape that the underlying journey cannot perform?
- What durable signal proves the work is alive, how long may it remain silent, and what authoritative
  timeout moves it out of the working state if the worker disappears?
- Do badge, animation, copy, live-region output, and available actions all agree, including after the
  liveness signal becomes stale?

Do not hide missing evidence behind “try again.” When the next safe move requires a decision, make it
an inline request with an explicit answer shape and consequence. For example, the user might add a
required source document, correct a date, select from known values, accept a limitation, or revise the scope.

The flow rehearsal must reach the recovery state and continue out of it. Record what is retained and
where every retry, revise, answer, Back, and cancel action leads. Merely naming a failure transition
does not prove the user can escape it.

Derive other exits from the flow topology. For each scene, list every outgoing transition except `storyboard.primary_transition`, then review its event, guard, destination, and outcome. Persist secondary exits as transitions in the flow YAML; do not add an `other_exits` storyboard field.

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

Each action produces a visible response. Long-running work shows progress or a durable pending
state backed by a liveness signal. A persisted running flag never justifies indefinite animation.
When liveness becomes stale, working animation stops, the status changes truthfully, and an
authoritative timeout leads to recovery. Permission and validation failures explain the next
available action.

### Forgiveness

Retry preserves valid work. Validation points to the field, row, or decision that needs attention. Failure routes return to an editable state when recovery exists.

### Consistency and platform fit

Use established product and platform patterns for navigation, selection, destructive actions, keyboard behaviour, and focus. A novel control needs a product reason.

### Accessibility

Storyboard keyboard order, focus movement, error association, reduced-motion behaviour, and screen-reader announcements when they affect a transition or recovery path. Visual polish cannot compensate for an unreachable action.

## Turning review findings into spec changes

Tie each proposed UX change to product intent:

- Amend or add a behaviour when the user-visible result changes.
- Add an invariant when preservation, safety, or permission must hold across paths.
- Add a decision-table row when the result depends on a combination of conditions.
- Change the flow YAML when a state, event, guard, route, or terminal outcome changes.

Every target transition must cite the behaviours it clarifies through `covers`. Preserve IDs for states and transitions whose meaning did not change. Record accepted scene evidence in each user-visible state's `storyboard` block, using `primary_transition` to distinguish the main action from the remaining outgoing transitions, then generate Mermaid from YAML.

Layout, copy, responsive behaviour, animation, and visual hierarchy still need screen design and browser review. A complete flow contract makes those reviews easier; it does not replace them.
