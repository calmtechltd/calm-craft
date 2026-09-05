---
name: spec-storyboard-journey
description: Storyboard and improve a spec-governed product journey using an Apple-inspired UX review lens and authoritative flow contracts. Use for "review this flow", "improve this wizard", "storyboard this journey", or enhancing the UX of an existing multi-step feature before implementation.
---

# Storyboard a Product Journey

Turn a stateful feature into a screen-by-screen review, then propose a smaller, clearer, and more recoverable target journey. This is design work. Do not implement the UI or silently rewrite product intent.

Read [`references/ux-journey-design.md`](../../references/ux-journey-design.md) before starting. Read [`references/spec-format.md`](../../references/spec-format.md) before changing a spec or flow contract.

**Not this skill:** recording existing behaviour without redesign (`spec-author-from-impl`), checking code/spec drift (`spec-audit-drift`), visual styling of one screen, or implementing an accepted design (`author-implementation-plan`).

## Workflow

### 1. Find the governing intent

Read the complete relevant spec, flow YAML, and generated Mermaid. Identify the behaviours and transition IDs that govern the journey. If no spec owns it, use `spec-plan-gap`, then `spec-author-from-impl` for existing code or `spec-author-greenfield` for unbuilt work.

If ownership is unclear, propose a boundary and continue factual baseline work that does not depend on that decision.

### 2. Establish the baseline

For existing code, form the expectation from the spec first. Then trace routes, actions, permissions, redirects, background work, loading and error states, and tests. Use focused browser evidence when needed and permitted under [write-tests](../write-tests/SKILL.md); reuse current results. Record what the product permits, including lost input, silent exits, and paths that look accidental.

For greenfield work, use only accepted behaviours and decisions. Put missing product choices in Open Questions rather than inventing them.

### 3. Decide whether a flow earns its weight

Use a flow for ordered steps, conditional navigation, cancellation, retry, resumability, asynchronous work, or distinct terminal outcomes. A CRUD screen with no meaningful journey needs a focused screen review instead. Say so and stop without manufacturing a flow.

### 4. Storyboard the scenes

Create the scene table from the UX reference. Tie each scene to its state, behaviours, and transitions. Include what the user sees, the main action, system feedback, preserved state, and accessibility intent. Derive other exits from every outgoing transition except the scene's primary transition; review each exit's event, guard, destination, and outcome.

Keep the baseline factual. Mark unknowns and contradictions. Do not improve them while describing them.

### 5. Rehearse disruption and recovery

Apply the reference's failure and recovery review to materially distinct supported outcomes. Trace each recovery path through the user's next action, retained work, authorization changes, duplicate/late results, and return after reload. For long-running scenes, define a liveness signal, maximum truthful silence, and a timeout transition; all status copy, animation, actions, and accessibility feedback must agree.

Record the scene evidence and unresolved decisions. This is a design rehearsal, not an instruction to create one automated test per path.

### 6. Review through the UX lens

Check clarity, deference, continuity, user control, progressive disclosure, feedback, forgiveness, consistency, platform fit, and accessibility. Each finding names the scene or transition, the observed cost to the user, and the evidence.

Prefer removing a scene or decision over polishing unnecessary complexity. Put permission and feasibility checks before expensive user effort. Preserve valid work across recovery paths.

### 7. Propose the target journey

Show:

- the target storyboard;
- states to add, remove, merge, or rename;
- transition and guard changes;
- behaviour, invariant, and decision-table changes;
- unresolved product choices;
- baseline to target differences, with the user benefit of each.

Do not present visual taste as a requirement. Separate platform conventions, accessibility requirements, product decisions, and optional polish.

### 8. Get agreement before changing authority

Put consequential choices to the user. Use `ask-questions` when several real decisions remain. Do not update the spec or flow while a decision can change the journey's states, guards, recovery, or terminal outcomes.

### 9. Record the accepted target

Once accepted, including acceptance already supplied in the task:

1. Update behaviours, invariants, and decision tables first.
2. Badge unbuilt target behaviour `future` or `partial` with an honest note.
3. Update the flow YAML. Each transition cites real behaviours through `covers`.
4. Put the accepted scene evidence in each user-visible state's `storyboard` block. A screen's `primary_transition` references one of its outgoing transition IDs. Keep every secondary exit as another outgoing transition; do not duplicate exits in a storyboard field.
5. Preserve IDs for unchanged states and transitions. Assign new IDs only to new paths.
6. Generate Mermaid with the repository's owning command and inspect the result.

Do not create a separate storyboard file beside the spec. The flow YAML owns states, transitions, and their accepted scene evidence together.

### 10. Hand back

Report the baseline problems, accepted UX decisions, changed behaviour and transition IDs, unresolved questions, and the target journey. Point to `author-implementation-plan` when delivery planning is wanted. State any remaining verification needs under the shared policy.

## Related skills

- `spec-author-from-impl` - capture an existing feature before redesign
- `spec-author-greenfield` - establish intent for unbuilt work
- `spec-audit-drift` - compare an accepted contract with code
- `ask-questions` - resolve consequential product choices
- `author-implementation-plan` - turn the accepted target into delivery chunks
