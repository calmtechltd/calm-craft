---
name: spec-maintain-on-ship
description: Update a feature spec when work changes its state — a partial behaviour ships, a future behaviour is prioritised, an open question is answered, or a journey changes. Use when the user says "this shipped, update the spec", "we decided X, record it", "mark B4 done", or as part of a pull request that changes documented behaviour. Pairs with spec-audit-drift to verify the update is honest.
---

# Maintain a Spec When Work Ships

Keep the spec true. A spec that drifts from reality is worse than no spec, because people rely on it.

Run this **in the same pull request as the code**, not later. Later doesn't happen.

Format authority: [`references/spec-format.md`](../../references/spec-format.md).

## When to use

- A behaviour shipped, fully or partly.
- A future behaviour got prioritised.
- An Open Question got answered.
- A journey changed shape.

**Not this skill:** finding drift (`spec-audit-drift`), authoring a new spec (`spec-author-greenfield` / `spec-author-from-impl`).

## The transitions

### A partial behaviour shipped

🟡 → 🟢. Remove the ticket reference and the note on what was missing.

**Verify before flipping.** 🟢 means built *and* tested. If the tests aren't there, either write them or the badge stays 🟡 with an updated note. Flipping a badge because a pull request merged is how an estate stops being trustworthy.

### A future behaviour was prioritised

🔵 → 🟡, with a ticket and a one-line note on what's missing. If the whole behaviour landed in one go, 🔵 → 🟢 directly is fine — but the same evidence standard applies.

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

### Always: reconcile the roll-up

After any change, recompute front-matter `status`: `implemented` only if every behaviour is; `future` if none are; `partial` otherwise. And update the `ticket` field — remove it when nothing is in flight.

## Workflow

1. Identify which behaviours the change touches, by ID.
2. For each, establish the **evidence** — the code that implements it and the tests that demonstrate it. State it.
3. Apply the transitions above.
4. Update flow contracts and regenerate diagrams if navigation changed.
5. Recompute the roll-up and ticket field.
6. Report: IDs changed with old → new badge, evidence for each, questions settled, flow changes, and the new roll-up.

## Quality gate

- [ ] Every 🟢 has both implementing code and a demonstrating test, named.
- [ ] Every remaining 🟡 has a current note on what's missing.
- [ ] Answered questions became durable spec content, not just deletions.
- [ ] Blocked behaviours re-checked when their blocking question was settled.
- [ ] Flow YAML updated before the diagram; unchanged IDs preserved.
- [ ] Roll-up status and ticket field recomputed.

## Anti-patterns

- **Flipping to 🟢 because the pull request merged.** The badge claims tested.
- **Deleting an answered question** and losing why.
- **Renumbering transition IDs.** Breaks every citation, silently.
- **Editing the Mermaid file** instead of the contract.
- **Doing this a week later.** The evidence is gone and so is the intent.

## Related skills

- `spec-audit-drift` — verify the update was honest
- `spec-assess-coverage` — prove a 🟢 badge is earned
- `spec-gap-sweep` — catch what never got maintained
