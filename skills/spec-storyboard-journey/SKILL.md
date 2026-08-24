---
name: spec-storyboard-journey
description: Storyboard and improve a spec-governed product journey using an Apple-inspired UX review lens and authoritative flow contracts. Use for "review this flow", "improve this wizard", "storyboard this journey", or enhancing the UX of an existing multi-step feature before implementation.
---

# Storyboard a Product Journey

Turn a stateful feature into a screen-by-screen review, then propose a smaller, clearer, and more recoverable target journey. This is design work. Do not implement the UI or silently rewrite product intent.

Read [`references/ux-journey-design.md`](../../references/ux-journey-design.md) before starting. Read [`references/spec-format.md`](../../references/spec-format.md) before changing a spec or flow contract.

## When to use

- A wizard, import, approval, onboarding path, resumable task, or multi-step edit needs UX work.
- A flow contract is structurally valid but may contain friction, dead ends, poor feedback, or unnecessary screens.
- Existing code needs a baseline journey before the team redesigns it.
- A greenfield spec needs scene-level review beyond states and transitions.

**Not this skill:** recording existing behaviour without redesign (`spec-author-from-impl`), checking code/spec drift (`spec-audit-drift`), visual styling of one screen, or implementing an accepted design (`author-implementation-plan`).

## Workflow

### 1. Find the governing intent

Read the complete relevant spec, flow YAML, and generated Mermaid. Identify the behaviours and transition IDs that govern the journey. If no spec owns it, use `spec-plan-gap`, then `spec-author-from-impl` for existing code or `spec-author-greenfield` for unbuilt work.

Stop if the journey crosses several specs without a clear owner. Propose the ownership boundary before storyboarding.

### 2. Establish the baseline

For existing code, form the expectation from the spec first. Then trace routes, actions, permissions, redirects, background work, loading and error states, and tests. Walk the running journey when available. Record what the product permits, including lost input, silent exits, and paths that look accidental.

For greenfield work, use only accepted behaviours and decisions. Put missing product choices in Open Questions rather than inventing them.

### 3. Decide whether a flow earns its weight

Use a flow for ordered steps, conditional navigation, cancellation, retry, resumability, asynchronous work, or distinct terminal outcomes. A CRUD screen with no meaningful journey needs a focused screen review instead. Say so and stop without manufacturing a flow.

### 4. Storyboard the scenes

Create the scene table from the UX reference. Tie each scene to its state, behaviours, and transitions. Include what the user sees, the main action, other exits, system feedback, and preserved state.

Keep the baseline factual. Mark unknowns and contradictions. Do not improve them while describing them.

### 5. Review through the UX lens

Check clarity, deference, continuity, user control, progressive disclosure, feedback, forgiveness, consistency, platform fit, and accessibility. Each finding names the scene or transition, the observed cost to the user, and the evidence.

Prefer removing a scene or decision over polishing unnecessary complexity. Put permission and feasibility checks before expensive user effort. Preserve valid work across recovery paths.

### 6. Propose the target journey

Show:

- the target storyboard;
- states to add, remove, merge, or rename;
- transition and guard changes;
- behaviour, invariant, and decision-table changes;
- unresolved product choices;
- baseline to target differences, with the user benefit of each.

Do not present visual taste as a requirement. Separate platform conventions, accessibility requirements, product decisions, and optional polish.

### 7. Get agreement before changing authority

Put consequential choices to the user. Use `ask-questions` when several real decisions remain. Do not update the spec or flow while a decision can change the journey's states, guards, recovery, or terminal outcomes.

### 8. Record the accepted target

Once accepted:

1. Update behaviours, invariants, and decision tables first.
2. Badge unbuilt target behaviour `future` or `partial` with an honest note.
3. Update the flow YAML. Each transition cites real behaviours through `covers`.
4. Preserve IDs for unchanged states and transitions. Assign new IDs only to new paths.
5. Generate Mermaid with the repository's owning command and inspect the result.

Do not store the storyboard under `specs/` unless the repository format defines that artifact. Use its configured design-document location when the user wants the storyboard saved.

### 9. Hand back

Report the baseline problems, accepted UX decisions, changed behaviour and transition IDs, unresolved questions, and the target journey. Recommend `author-implementation-plan` for delivery and browser verification for the complete flow.

## Quality gate

- [ ] Baseline and target are distinct.
- [ ] Each scene states user goal, information, primary action, exits, feedback, and preserved state.
- [ ] Findings cite specific scenes or transitions and observed user cost.
- [ ] Relevant back, cancel, retry, permission, failure, partial-success, and resume paths appear.
- [ ] Terminal outcomes explain what happened and what the user can do next.
- [ ] Product decisions were accepted before authoritative files changed.
- [ ] Target transitions cover real behaviours; unbuilt work is not badged implemented.
- [ ] YAML changed before generated Mermaid; unchanged IDs were preserved.
- [ ] No implementation code changed.

## Anti-patterns

- **Treating a valid graph as good UX.** Structural completeness says nothing about clarity or effort.
- **Redesigning while excavating.** It hides the baseline and makes drift impossible to reason about.
- **Drawing screens without exits or feedback.** A storyboard must cover movement and recovery.
- **Confirming every step.** Confirmation belongs at costly or irreversible boundaries.
- **Inventing a storyboard file inside the spec estate.** The portable format does not own one.
- **Changing IDs to make the diagram tidy.** Existing citations depend on them.
- **Implementing before product agreement.** The target journey must become intent first.

## Related skills

- `spec-author-from-impl` - capture an existing feature before redesign
- `spec-author-greenfield` - establish intent for unbuilt work
- `spec-audit-drift` - compare an accepted contract with code
- `ask-questions` - resolve consequential product choices
- `author-implementation-plan` - turn the accepted target into delivery chunks
