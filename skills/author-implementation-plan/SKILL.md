---
name: author-implementation-plan
description: Turn a design document and its specs into a chunked implementation plan an agent can execute one reviewable pass at a time, with dependencies, acceptance criteria, and explicit out-of-scope fences. Use when the user says "turn this design into a plan", "break this into chunks", "write an implementation plan", or before starting a large feature. Plans only — never implements.
---

# Author an Implementation Plan

Turn a design into **chunks sized for one reviewable pass**. This skill plans; `run-implementation-plan` executes the plan, one chunk at a time, until it is done.

Keeping those separate matters: a skill that plans _and_ builds will always plan just far enough ahead to justify what it already wants to build.

Plan location and commands: `.engineering/config.yaml`. Spec format: [`references/spec-format.md`](../../references/spec-format.md).

## When to use

- "Turn this design into an implementation plan."
- "Break this feature into agent-sized chunks."
- Before a large feature, once the design exists.

**Not this skill:** executing the plan (`run-implementation-plan` / `run-implementation-plan-all`), writing specs (`spec-author-greenfield`).

## Workflow

### 1. Read the design and restate it

Extract the user-visible goal, the subsystems involved, the entities, any explicit phase or deferral language, cross-cutting concerns, and unresolved questions.

Restate in 5–10 bullets before chunking, and flag ambiguities. **Honour deferral language** — "not in v1" stays in a later phase. Don't pull it forward because it's convenient.

### 2. Choose a strategy and say which

| Strategy               | When                                                                | First phase                                      |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| **Specs first**        | Large or compliance-sensitive; alignment with non-engineers matters | Author specs as 🔵, then vertical slices         |
| **Vertical slices**    | Medium; design stable; specs can trail slightly                     | Each chunk ships observable behaviour plus tests |
| **Foundation then UI** | Heavy schema or permission groundwork                               | Backend chunks first, UI from chunk N            |

### 3. Define phases as demo-able milestones

Not org-chart layers. Each phase: a letter ID, a one-line focus, and an observable outcome — what capability exists when it completes.

### 4. Decompose into chunks

Every chunk carries all six. This is the part that matters most:

- **Chunk ID** — `{PhaseLetter}{number}`, e.g. `B4`
- **Depends on** — chunks that must be merged and tested first
- **Spec(s)** — paths and behaviour IDs; state and transition IDs when it touches a storyboarded journey
- **Work** — concrete file areas, routes, helpers. Implementation language belongs here
- **Done when** — observable acceptance criteria. For UI chunks, describe the expected state or interaction without turning it into automatic browser authorization. Optional manual/browser checks must be labelled **recommended and unrun unless the user explicitly requests them**.
- **Out of scope** — an explicit fence. Omitting it invites scope creep

**Vertical slice rule:** from the first user-facing milestone onward, UI ships in the same chunk as the behaviour it exposes. Exceptions are explicit foundation chunks.

**Sizing** — small (≤8 chunks): header, phases as bullets, chunks, order, checklist. Medium (9–25): add a phase map, spec inventory, milestones. Large (25+): add chunk→spec maps, open decisions, parallel hints. Don't pad small features with ceremony; don't under-chunk large ones into "implement the thing".

**Heuristics:** permissions before schema that assumes them; schema before data referencing it; seed and admin paths before UI listing them; core CRUD and list before detail before secondary tabs; rollups after the primitives they aggregate; one integration or variant per chunk where each has distinct rules.

### 5. Order, and record what's undecided

Execution order with the critical path and any parallel branches. Milestones phrased as capability — "after B4, a user can do X". A per-chunk checklist covering spec badge updates, tests, manual steps, and migrations.

**Open decisions get a table** — topic, status, resolution or owner. Executors must not re-litigate what the design settled, or quietly settle what it didn't.

### 6. Write and hand back

Write to the plans path from `config.yaml`. Report: path, phase count, chunk count, the first executable chunk, and whether specs must land first.

## Quality gate

- [ ] Every chunk has all six fields.
- [ ] No chunk too large for one reviewable pass — split if Work has more than ~8 deliverables.
- [ ] Deferred design scope appears only in later phases.
- [ ] UI chunks have observable Done-when criteria; any browser check is labelled recommended and explicit-only.
- [ ] Journey chunks cite affected flow state IDs and transition IDs, and invent no state, guard, bypass, or exit the contract lacks.
- [ ] Storyboarded journey chunks preserve the declared goal, information, primary action, feedback, state preservation, and accessibility intent.
- [ ] Critical path matches dependencies; no cycles.
- [ ] Open decisions captured, not silently resolved.

## Anti-patterns

- **Horizontal layers.** "All the mutations, then all the UI" — forbidden after foundation.
- **Mega-chunks.** "Implement Phase B" isn't executable.
- **Missing out-of-scope.** The fence is what stops drift.
- **Flow-less journey chunks.** "Build the wizard" leaves navigation and recovery to invention.
- **Inventing scope.** Behaviour not in the design needs confirmation.

## Related skills

- `run-implementation-plan` — execute the plan, one chunk per pass, until it is done
- `run-implementation-plan-all` — the same loop, named as finish the plan
- `ask-questions` — put unresolved questions found while chunking
- `spec-author-greenfield` — author specs a specs-first plan needs
- `spec-maintain-on-ship` — badges when a chunk ships
