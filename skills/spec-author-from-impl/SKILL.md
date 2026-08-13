---
name: spec-author-from-impl
description: Author a feature spec by working backwards from existing code and tests, capturing what the product actually does today including a user-flow contract for journeys that already exist. Use when the user says "spec this existing feature", "document how this works", "we need a spec for X that's already built", or when backfilling a spec estate on an existing codebase. Pairs with spec-author-greenfield for design-first authoring.
---

# Author a Spec From an Existing Implementation

Capture the observable behaviour of something already built. **You are excavating, not designing** — the spec must describe what the product does today, which is frequently not what anyone believed.

Format authority: [`references/spec-format.md`](../../references/spec-format.md).

## When to use

- Backfilling specs on an existing codebase.
- "Document how this actually works."
- Before a significant change to an under-understood feature.

**Not this skill:** specs for unbuilt features (`spec-author-greenfield`), checking an existing spec against code (`spec-audit-drift`).

## Workflow

### 1. Map the surface

Find every entry point: routes, handlers, mutations, queries, jobs, event consumers, UI screens. Read the tests — they encode intent nobody wrote down elsewhere. Note what's covered and what isn't; the gaps matter later.

### 2. Derive behaviours from what a user can observe

Work outward from entry points to user-visible outcomes. A behaviour is something someone using the product experiences — not a function that exists.

Translate as you go. "The handler returns 409 when the row has a non-null archived_at" becomes "Archiving something already archived tells the user it's already archived and changes nothing."

### 3. Badge honestly — this is the hard part

The temptation is to mark everything 🟢 implemented because the code exists. Resist it.

- 🟢 only where the behaviour is complete **and** tested.
- 🟡 where the code half-does it — the note on what's missing is the most valuable line in the spec.
- 🔵 for behaviour the code clearly anticipates but doesn't implement.

**An estate of honest badges tells you where the product actually is.** An estate of optimistic ones tells you nothing and costs the same to write.

### 4. Capture what you find along the way

Backfilling surfaces things. Record them rather than smoothing them over:

- Contradictions between two screens or paths → an Open Question, or two behaviours with a note.
- Rules nobody can justify → a behaviour plus an Open Question asking whether it's intended.
- Dead paths → Out of Scope, or flag them for deletion.

If the code does something you suspect is a bug, **write the behaviour as the code behaves** and raise an Open Question. Don't quietly spec the intended behaviour — that turns a spec into a wish and hides the bug.

### 5. Flow contract for journeys that exist

If the feature is a wizard, import, or approval, trace the real navigation from the code: every state, every transition, every guard, and — critically — the back, cancel, retry, and failure paths the implementation actually supports.

Write the YAML first, generate Mermaid from it. Where the code allows a transition that looks wrong, record it and raise an Open Question rather than omitting it. The contract must describe reality before it can constrain it.

### 6. Hand back

Path; counts of behaviours by badge; invariants; flow transitions; Open Questions. Call out explicitly: anything you found that looks like a bug, and any behaviour you couldn't determine from the code.

## Quality gate

- [ ] Behaviours describe observable outcomes, not functions.
- [ ] Badges reflect tested reality, not the existence of code.
- [ ] Every 🟡 carries a note on what's missing.
- [ ] Contradictions and suspicious behaviour recorded, not smoothed.
- [ ] A flow contract matches what the code actually permits.
- [ ] No implementation language in behaviour text.

## Anti-patterns

- **Badging everything implemented.** The single most common failure, and it makes the estate worthless.
- **Speccing the intent instead of the behaviour.** Hides bugs behind a document that looks authoritative.
- **Transcribing the code.** "Calls `validateSchedule` then persists" is not a behaviour.
- **Omitting the ugly paths** from a flow because they look like mistakes. Record them and ask.

## Related skills

- `spec-audit-drift` — later, to check the spec still matches
- `spec-assess-coverage` — find which of these behaviours have tests
- `spec-triage-bug-report` — for the suspicious behaviour you found
- `spec-gap-sweep` — track the backfill across the estate
