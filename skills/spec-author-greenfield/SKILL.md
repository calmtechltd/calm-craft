---
name: spec-author-greenfield
description: Author a feature spec design-first, for something not yet built, including a user-flow contract when a journey warrants one. Use when the user says "let's spec this before we build it", "capture the design for this feature", "think through the edge cases first", or is planning a new feature and wants intent, paths, and open questions recorded before code. Pairs with spec-author-from-impl for features that already exist.
---

# Author a Spec Greenfield

Describe a feature **before** it is built. The spec becomes the design record and the source of truth that implementation and tests are later checked against.

Format authority: [`references/spec-format.md`](../../references/spec-format.md), copied into this repo by `engineering-setup`. This skill covers **workflow**, not format.

## When to use

- "We're going to build X — let's spec it first."
- "I want to think through the edge cases before we touch code."
- "Capture this design so it doesn't only live in chat."

**Not this skill:** speccing something already built (`spec-author-from-impl`), checking for an existing spec first (`spec-plan-gap`), or scene-level UX review of a journey (`spec-storyboard-journey`).

## Workflow

### 1. Pin the scope

Module, feature area, working name in user-facing terms, and whether this is one spec or several. **Push back if it's sprawling** — a spec covering four features helps nobody.

### 2. Interrogate

A greenfield spec is extracted from the user's head, not invented. Ask **1–2 questions at a time** and build the picture iteratively:

- **Goal** — what can a user do that they can't today, and why does it matter?
- **Triggers** — user action, time, event, system state?
- **Happy path** — walk it end to end.
- **Navigation** — which states can be entered, left, revisited, cancelled, resumed?
- **Edge cases** — input missing, invalid, conflicting, or already in the requested state.
- **Failure modes** — what does the user see, and is there recovery?
- **Adjacent features** — what does this interact with, and where might it conflict?
- **Out of scope** — what does it deliberately not do?

Do not start drafting until the shape is clear.

### 3. Sketch the outline before writing the file

Show me: the one-line description, numbered candidate behaviours, candidate invariants, decision tables for any combinatorial logic, a candidate flow if one is warranted (states, events, guards, terminal outcomes, coverage — before any Mermaid), Open Questions, Future Considerations, Out of Scope.

Adjust on my feedback, then write.

### 4. Write

- Spec-level `status: future`; every behaviour badged `future`.
- Omit the ticket field entirely until the work is prioritised.
- Open Questions and Future Considerations will be heavier than in a backwards-engineered spec. **That is the point.**
- If a flow is warranted, write the YAML contract first, then generate the Mermaid sibling from it with its generated-file warning. Every transition cites behaviours through `covers` — a flow never creates requirements outside them.

### 5. Hand back

Path, and counts: behaviours, invariants, flow transitions, Open Questions, Future Considerations. Note that when the work is prioritised, behaviours flip to `partial` via `spec-maintain-on-ship`.

## Quality gate

- [ ] Behaviours describe what users observe — no implementation language.
- [ ] Every behaviour numbered and badged `future`; spec `status: future`; ticket field absent.
- [ ] `id` fully qualified, mirroring the folder path.
- [ ] Every section header present; `_None._` where genuinely empty.
- [ ] A warranted flow has one start, reachable states, outgoing transitions from every non-terminal state, explicit terminal outcomes, exhaustive guarded branches, and matching YAML/Mermaid.
- [ ] Back, cancel, retry, permission-denied, and failure paths present where the journey supports them.

## Anti-patterns

- **Drafting before interrogating.** Don't invent behaviours unilaterally.
- **Padding from imagination.** Four described behaviours means four in the spec.
- **Leaking implementation.** "We'll put this on a queue" is a design decision, not a spec.
- **Suppressing ambiguity.** If I shrug at a question, write it down. A greenfield spec with no Open Questions is under-interrogated.
- **Premature ticket links** on unscheduled work.
- **Happy path only.** A flow missing back, cancel, retry, and failure gives the implementation permission to invent them.
- **Treating Mermaid as authority.** YAML first, always.

## Related skills

- `spec-plan-gap` — check for overlap before authoring
- `spec-author-from-impl` — for features that already exist
- `spec-maintain-on-ship` — flip badges when work is prioritised or ships
- `spec-storyboard-journey` — test a warranted journey scene by scene before implementation
- `ask-questions` — put Open Questions to me as structured choices
- `author-implementation-plan` — turn the spec into executable chunks
