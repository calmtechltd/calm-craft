---
name: spec-maintain-on-ship
description: Update a feature spec when work changes its state — a partial behaviour ships, a future behaviour is prioritised, an open question is answered, or a journey changes. Use when the user says "this shipped, update the spec", "we decided X, record it", "mark B4 done", or as part of a pull request that changes documented behaviour. Pairs with spec-audit-drift to verify the update is honest.
---

# Maintain a Spec When Work Ships

Update documented behavior in the same change as its implementation.

Format authority: [`references/spec-format.md`](../../references/spec-format.md).

**Not this skill:** finding drift (`spec-audit-drift`), authoring a new spec (`spec-author-greenfield` / `spec-author-from-impl`).

## The transitions

### A partial behaviour shipped

🟡 → 🟢. Remove the note on what was missing, and the ticket reference if the repo uses one.

**A closed ticket is not evidence.** It means someone marked a card done. Inspect the implementing code and current verification evidence before promoting anything — the tracker owns scheduling, the spec owns intent. Reuse valid evidence from the implementing agent; do not rerun checks merely to update a badge.

**Verify before flipping.** Apply the repository's test policy and `write-tests`: meaningful server/lib rules need appropriate automated protection, while permitted browser or static verification may establish other behaviour. Distinguish a justified omission of automation from missing required evidence. If required evidence is absent, leave the badge partial and explain the gap; a merged pull request alone is not verification.

### A future behaviour was prioritised

🔵 → 🟡, with a ticket only if the repository uses one, and a one-line note on what's missing. If the whole behaviour landed in one go, 🔵 → 🟢 directly is fine — but the same evidence standard applies.

### An Open Question was answered

Don't just delete it. The answer usually belongs in the spec as something durable:

- A new or amended **behaviour**, if it changes what users experience.
- An **invariant**, if it's a rule that must hold.
- A **decision-table row**, if it resolves a case.

Then mark the question `**Settled:**` with the reasoning, or remove it if the reasoning is fully captured elsewhere. Keep it settled rather than deleted when a future reader would otherwise re-ask it.

If the question was marked `**Blocks B6:**`, check whether B6 can now move.

### A journey changed

Update the **YAML contract first**, then regenerate the Mermaid sibling. Preserve existing flow and transition IDs for unchanged paths — they're cited from tests, plans, and pull requests, and renumbering breaks those silently.

New paths get new IDs. Removed paths are removed from both files; don't leave orphans in the diagram.

When a flow uses storyboard evidence, add or update the `storyboard` block for every affected screen and terminal state, and update every affected visible action/processing state that is already storyboarded. Do this in the same YAML edit when its goal, information, primary action, feedback, preserved state, or accessibility behaviour changes. A layout-only change does not alter the storyboard.

### Always: reconcile the roll-up

After any change, recompute front-matter `status`: `implemented` only if every behaviour is; `future` only if every behaviour is future; `partial` otherwise. Update `ticket` only when the repository uses it; remove it when nothing is in flight.

## Workflow

1. Identify which behaviours the change touches, by ID.
2. For each, establish the implementing code and appropriate verification evidence. State its scope, result, and any limitations without rerunning current checks.
3. Apply the transitions above.
4. Update flow contracts and regenerate diagrams if navigation changed.
5. Recompute the roll-up and ticket field.
6. Report: IDs changed with old → new badge, evidence for each, questions settled, flow changes, and the new roll-up.

## Related skills

- `spec-audit-drift` — verify the update was honest
- `spec-assess-coverage` — assess automated coverage and other evidence
- `spec-gap-sweep` — catch what never got maintained
