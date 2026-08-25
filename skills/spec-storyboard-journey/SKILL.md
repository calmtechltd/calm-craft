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

Create the scene table from the UX reference. Tie each scene to its state, behaviours, and transitions. Include what the user sees, the main action, system feedback, preserved state, and accessibility intent. Derive other exits from every outgoing transition except the scene's primary transition; review each exit's event, guard, destination, and outcome.

Keep the baseline factual. Mark unknowns and contradictions. Do not improve them while describing them.

### 5. Rehearse disruption and recovery

For every asynchronous, AI-driven, paid, or otherwise expensive action, storyboard more than its
loading and generic failure appearance. Trace at least these outcomes when the product can produce
them:

- the work succeeds;
- the work fails before producing a usable result;
- the worker becomes silent or disappears without recording success or failure;
- the work produces an invalid or incomplete result;
- the user's permission, capacity, or relevant facts change while work is running;
- the same attempt or response is delivered again;
- the user returns, edits earlier facts, adds guidance, or cancels.

For each supported disruption, prove the visible recovery loop from the user's perspective:

1. The failure says what happened in useful product language and distinguishes development detail
   from a user-actionable explanation.
2. Valid prior work, the failed attempt's diagnosis, and any guidance survive navigation and retry.
3. The user has truthful next actions: retry as-is, add guidance, revisit the owning decision, accept
   a named limitation, or cancel. Do not show an action the current state cannot execute safely.
4. A retry creates a fresh attempt without duplicating a paid or irreversible action.
5. Editing facts or guidance returns through any required review or approval; earlier approval or
   commitment cannot silently authorise changed work.
6. Late output from superseded work cannot replace the user's newer state.
7. Back, reload, narrow layout, and resume return to the same durable recovery point.
8. Every working presentation has a liveness contract: the longest truthful silent interval, the
   signal that refreshes it, the point at which animation and “working” language stop, and the
   authoritative transition used when a worker times out or disappears. A persisted active flag by
   itself is not evidence that work is still running.

Reconcile all signals in the scene. The badge, animation, progress copy, available actions, live
region, and durable state must tell the same story. A spinner or animated border must not continue
after the interface says progress is stale or the recovery state is actionable.

If missing evidence is itself a decision, storyboard the inline request rather than collapsing it
into a generic error. Examples include adding a required Source, accepting a limitation, correcting
a value, or narrowing the requested scope. The agent may phrase the question, but the allowed answer
shape, consequence, and owning state must be explicit.

Record an adversarial rehearsal for every materially distinct recovery branch. A transition list
that merely reaches a failure state is insufficient: its expected outcome must say what was retained,
which actions remain available, and where each action leads.

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

Once accepted:

1. Update behaviours, invariants, and decision tables first.
2. Badge unbuilt target behaviour `future` or `partial` with an honest note.
3. Update the flow YAML. Each transition cites real behaviours through `covers`.
4. Put the accepted scene evidence in each user-visible state's `storyboard` block. A screen's `primary_transition` references one of its outgoing transition IDs. Keep every secondary exit as another outgoing transition; do not duplicate exits in a storyboard field.
5. Preserve IDs for unchanged states and transitions. Assign new IDs only to new paths.
6. Generate Mermaid with the repository's owning command and inspect the result.

Do not create a separate storyboard file beside the spec. The flow YAML owns states, transitions, and their accepted scene evidence together.

### 10. Hand back

Report the baseline problems, accepted UX decisions, changed behaviour and transition IDs, unresolved questions, and the target journey. Recommend `author-implementation-plan` for delivery and browser verification for the complete flow.

## Quality gate

- [ ] Baseline and target are distinct.
- [ ] Each scene states user goal, entering context, information, primary action, feedback, preserved state, and accessibility intent.
- [ ] Every outgoing transition other than `primary_transition` appears in the scene review as a secondary exit, with no duplicate `other_exits` field.
- [ ] Findings cite specific scenes or transitions and observed user cost.
- [ ] Relevant back, cancel, retry, permission, failure, partial-success, and resume paths appear.
- [ ] Every asynchronous, AI-driven, paid, or expensive action has adversarial success, invalid-result,
      interruption, silent-worker/timeout, duplicate-delivery, revision, and cancellation review
      where those outcomes are possible.
- [ ] Every long-running scene defines its liveness signal, maximum truthful silence, stale
      presentation, authoritative timeout transition, and consistent badge/animation/copy.
- [ ] Each recoverable failure proves retained work and diagnosis, executable retry/revise/cancel
      actions, a fresh attempt, and a durable return point after reload or resume.
- [ ] Changing facts or guidance invalidates superseded review or approval, and late work cannot
      overwrite the newer state.
- [ ] Missing evidence that needs a user decision becomes an inline typed request with an explicit
      consequence, not a generic error or free-form dead end.
- [ ] Terminal outcomes explain what happened and what the user can do next.
- [ ] Product decisions were accepted before authoritative files changed.
- [ ] Target transitions cover real behaviours; unbuilt work is not badged implemented.
- [ ] YAML changed before generated Mermaid; unchanged IDs were preserved.
- [ ] No implementation code changed.

## Anti-patterns

- **Treating a valid graph as good UX.** Structural completeness says nothing about clarity or effort.
- **Redesigning while excavating.** It hides the baseline and makes drift impossible to reason about.
- **Drawing screens without exits or feedback.** A storyboard must cover movement and recovery.
- **Treating “Failed” as a complete scene.** A red panel is not recovery. Prove what survived, what
  the user can do, and that each offered action reaches a safe next state.
- **Animating a database flag.** “Active” or “running” can outlive the worker. Require a durable
  liveness signal and stop working animation when that signal becomes stale.
- **Retrying the picture, not the transaction.** Storyboard the fresh-attempt, duplicate-delivery,
  stale-result, revised-facts, and approval consequences behind the button.
- **Confirming every step.** Confirmation belongs at costly or irreversible boundaries.
- **Creating a second storyboard authority.** Scene evidence belongs on the states in flow YAML.
- **Changing IDs to make the diagram tidy.** Existing citations depend on them.
- **Implementing before product agreement.** The target journey must become intent first.

## Related skills

- `spec-author-from-impl` - capture an existing feature before redesign
- `spec-author-greenfield` - establish intent for unbuilt work
- `spec-audit-drift` - compare an accepted contract with code
- `ask-questions` - resolve consequential product choices
- `author-implementation-plan` - turn the accepted target into delivery chunks
