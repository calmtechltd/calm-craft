---
name: author-implementation-plan
description: >-
  Generate a chunked implementation plan from a design document (and optional
  related specs). Produces phased, agent-session-sized chunks with dependencies,
  acceptance criteria, and spec links. Use when planning a new feature from a
  design doc, turning standards-feature.md-style designs into execution plans,
  or when the user asks for an implementation plan, chunk breakdown, or phased
  rollout from specs.
---

# Author Implementation Plan from Design

Turn a **design document** (and any related specs or supplements) into a **chunked implementation plan** an agent can execute one session at a time. The canonical example in the Calm repo is `.active/standards-feature/standards-implementation-plan.md` sourced from `.active/standards-feature/standards-feature.md` (when those local files are available).

Plan the simplest complete solution that satisfies the agreed requirements for the selected delivery scope. Reuse existing capabilities where sufficient. Every planned deliverable must serve a requirement or a necessary technical prerequisite.

This skill **plans**; it does not implement chunks unless the user explicitly asks. Pair with `run-implementation-plan` to execute one chunk at a time, `spec-author-greenfield` / `spec-plan-gap` when specs do not exist yet, and `planning.mdc` when the user wants approval between micro-steps inside a chunk.

## When to use

- "Turn this design into an implementation plan."
- "Break this feature into agent-sized chunks."
- "Write an impl plan like the standards one."
- Before a large greenfield feature — after the design doc exists (specs optional).

**Not this skill:** executing a chunk (`run-implementation-plan`), authoring formal `specs/` files (`spec-author-greenfield`), or auditing drift (`spec-audit-drift`).

## Inputs

Gather before drafting:

| Input | Required | Notes |
| --- | --- | --- |
| Design doc path | Yes | Primary source — entities, phases, invariants, UX intent |
| Supplemental designs | No | e.g. semantic-evidence-slots-design.md |
| Existing `specs/` | No | If present, chunks link to them; if absent, plan includes a spec-authoring phase |
| Codebase context | Recommended | Search for spikes, module keys, similar patterns to replace or extend |
| Target scale | Infer | Small (≤8 chunks), medium (9–25), large (25+) — see [Sizing](#sizing) |

If the design doc is missing phase labels or defers work explicitly, honour those — do not fold deferred scope into early chunks.

## Workflow

### 1. Read and summarise the design

Read the design doc end to end. Extract:

- **User-visible goal** — one paragraph.
- **Layers or subsystems** — e.g. library vs site, admin vs site UI.
- **Entities and relationships** — names only; no schema dump in the plan header.
- **Explicit phase / deferral language** — "phase next", "phase 1", "not in v1".
- **Cross-cutting concerns** — permissions, audit, comments/followers, notifications.
- **Open questions** still unresolved in the design.

Restate this summary to the user in 5–10 bullets before chunking. Flag ambiguities that should become **Open decisions** in the plan (or spec Open Questions if specs-first).

### 2. Choose strategy

Apply the UI guidance only to UI behaviour required by the agreed design.

Pick one and state it in the plan header:

| Strategy | When | First phase |
| --- | --- | --- |
| **Specs first** | Large or compliance-sensitive features; consultant alignment matters | Author `specs/` as `future`, then vertical slices |
| **Vertical slices** | Medium features; design is stable; specs can trail slightly | Each chunk ships observable behaviour + tests |
| **Foundation then UI** | Heavy schema/permission groundwork | Backend-only chunks first, then UI chunks from chunk N onward |

Default for Calm greenfield features: **specs first → vertical slices (API + site UI per chunk)** unless the user says otherwise.

### 3. Define phases

Phases are **milestones a human can demo**, not org-chart layers.

Each phase needs:

- **Letter ID** — `A`, `B`, `C`, … (reserve `A` for spec authoring when specs-first).
- **Focus** — one line.
- **Testable outcome** — what is true in the app (or spec corpus) when the phase completes.

Large plans: phase map table. Small plans: a short bullet list is enough.

**Deferral rule:** UI called "phase next" in the design stays in a later phase — do not pull it forward to "get it done early" unless the user overrides.

Record the selected delivery scope in the plan header. Label deferred phases as future context; they become executable when the user includes them in the assignment.

### 4. Inventory specs (specs-first only)

If strategy is specs-first and specs do not all exist:

- List every spec file to author: path, `id`, one-line coverage.
- Add chunk **A0** (or `A1`, …) — spec files only, no code.
- Map future implementation chunks → primary spec(s) in a table when the mapping is non-obvious.

Use [references/spec-format.md](../../references/spec-format.md) for folder shape and voice. Specs are acceptance criteria for chunks — behaviours start 🔵 `future`.

Skip the inventory table when all specs already exist; link chunks directly.

### 5. Decompose into chunks

**Chunk sizing:** one focused agent session — reviewable diff, tests where patterns exist, manually verifiable **Done when** for UI chunks.

Each chunk uses this anatomy (see [template.md](template.md)):

- **Chunk ID** — `{PhaseLetter}{number}` e.g. `B4`, `C2`.
- **Depends on** — prior chunks that must be merged/tested.
- **Spec(s)** — file path(s); behaviour IDs when known (`B4–B6`).
- **Work** — concrete file areas, mutations/queries, routes, lib helpers — implementation language is OK here.
- **Done when** — observable acceptance criteria; manual app steps for UI chunks.
- **Out of scope** — explicit fence against scope creep.

**Vertical slice rule:** From the first user-facing milestone onward, ship **site (or org) UI in the same chunk** as the API behaviour it exposes. Do not defer routes to a "UI pass" unless the chunk is explicitly backend-only (permissions, schema, seed).

**Parallel-friendly:** After shared prerequisites, note chunks that can run in any order (e.g. evidence types B26–B29).

### 6. Order and milestones

Add:

- **Suggested execution order** — ASCII critical path; call out parallel branches.
- **Milestones** — "After B4, user can adopt via UI" style checkpoints.
- **Per-chunk PR checklist** — spec badge updates, tests, manual steps, migration note, audit events.

### 7. Track open decisions

Table of design ambiguities: topic, status (`Open` / `Resolved`), resolution or owner. Resolved items from the design doc are copied here so executors do not re-litigate.

Map design "phase 1 / phase next" labels to plan phases in a short mapping table.

### 8. Write the plan file

**Default path:** `.active/<feature-slug>/<feature-slug>-implementation-plan.md`

Ask the user if they prefer a different location. Link back to the design doc and supplements in the header.

Use [template.md](template.md) for section order. Apply [Sizing](#sizing) to omit heavy sections for small features.

### 9. Quality gate (before finishing)

- [ ] Every chunk has **Depends on**, **Work**, **Done when**, **Out of scope** (Out of scope may be `_None._` only for tiny chunks).
- [ ] No chunk is too large for one session (split if Work has more than ~8 distinct deliverables).
- [ ] Deferred design scope appears only in later phases.
- [ ] UI chunks have manual **Done when** steps, not "tests pass" alone.
- [ ] Specs-first plans include A0 (or equivalent) before implementation chunks.
- [ ] Database note present if schema chunks exist: user runs `drizzle generate` / `migrate` — agent does not.
- [ ] Open decisions from the design are captured, not silently decided.
- [ ] Critical path matches dependencies (no cycles).

Return: plan path, phase count, chunk count, first executable chunk ID, and whether specs must land first.

## Sizing

| Scale | Chunks | Include |
| --- | --- | --- |
| **Small** | ≤8 | Header, how-to-use (short), phases as bullets, chunks, execution order, PR checklist |
| **Medium** | 9–25 | + phase map table, spec inventory if specs-first, milestones |
| **Large** | 25+ | + chunk→spec map tables per phase, open decisions table, design-phase mapping, parallel hints |

Do not pad small features with empty ceremony. Do not under-chunk large features into vague "implement compliance" steps.

## Chunking heuristics

Use these when splitting the design:

1. **Permission module** before schema that assumes entitlements.
2. **Schema** before seed/data that references tables.
3. **Seed / admin path** before UI that lists seeded entities.
4. **Core CRUD + list UI** before detail pages, before secondary tabs.
5. **One evidence type / integration / link type per chunk** when each has distinct health rules.
6. **Rollup / dashboard** after the primitives it aggregates exist.
7. **Library / org-admin** after site workflow proves the model (unless design says otherwise).
8. **Spike replacement** — note "delete/replace spike X" in Work; do not migrate indefinitely.

## Agent session rules (include in every plan)

Copy or adapt into the plan's **How to use** section:

- One chunk per session unless combining two tiny ones.
- Do not start the next chunk until the current one is played with in the app (UI chunks).
- Ship UI with the behaviour in the same chunk (except explicit foundation chunks).
- Update spec behaviour badges in the same PR as the chunk (`spec-maintain-on-ship`).
- User runs DB migrations locally.

## Anti-patterns

- **Horizontal layers only** — "all mutations, then all UI" — forbidden after foundation.
- **Mega-chunks** — "Implement Phase B" — not executable.
- **Spec-less acceptance** — Done when with no spec link in specs-first projects.
- **Inventing scope** — behaviours not in the design doc require user confirmation.
- **Implementation in spec inventory** — spec list describes coverage, not Drizzle tables.
- **Skipping Out of scope** — invites agents to pull forward deferred work.

## Related skills and rules

- `spec-author-greenfield` — author specs listed in phase A.
- `spec-plan-gap` — when a chunk reveals a missing spec before execution.
- `run-implementation-plan` — pick up and implement the next incomplete chunk.
- `spec-maintain-on-ship` — flip badges when a chunk ships.
- `planning.mdc` — wait for approval between micro-steps inside a chunk when invoked.
- [template.md](template.md) — document and chunk templates.
- [examples.md](examples.md) — small vs large outline samples.
