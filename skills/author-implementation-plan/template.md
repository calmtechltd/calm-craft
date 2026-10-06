# Implementation Plan Templates

Copy section headers into the plan file. Omit sections marked **(large only)** for small features.

---

## Document header

```markdown
# {Feature Name} — Implementation Plan

**Source design:** [{design-file}.md](./{design-file}.md)
**{Optional supplement label}:** [{supplement}.md](./{supplement}.md)
**Spec guide:** [specs/README.md](../../specs/README.md) _(specs-first only)_
**Strategy:** {e.g. Specs first → vertical slices (API + site UI per chunk) → deferred area later}
**Delivery scope:** {Selected phases or chunks; deferred phases are future context}
**Chunk size:** One agent session each — small enough to review, test, and commit before moving on

---
```

---

## How to use this plan

```markdown
## How to use this plan

Each **chunk** is a self-contained unit of work. Before starting a chunk:

1. Read the linked spec(s) — they are the acceptance criteria. _(omit if no specs yet)_
2. Check **Depends on** — prior chunks must be merged/tested.
3. Complete **Done when** — manually verify in the app for UI chunks; tests alone are not enough unless backend-only.
4. Update spec behaviour badges (`🔵 future` → `🟡 partial` → `🟢 implemented`) in the same PR as the chunk.

**Agent session rules:**

- Apply the UI guidance only to UI behaviour required by the agreed design.
- Deferred phases become executable when the user includes them in the assignment.
- One chunk per session unless explicitly combining two tiny ones.
- Do not start the next chunk until you have played with the current one in the app _(UI chunks)_.
- **Ship site UI in the same chunk** as the behaviour it exposes — routes and pages are not deferred to a later "UI pass." Foundation chunks may be backend-only; from **{first UI chunk}** onward, each chunk should leave something clickable.
- **{Deferred area}** stays in **Phase {X}** — do not pull those forward.
- {Spike/replace notes if any}

**Database migrations:** Each schema chunk produces a migration. You run `drizzle generate` and `drizzle migrate` locally — the agent should not run those commands.
```

---

## Phase map (medium / large)

```markdown
## Phase map

| Phase | Focus | Testable outcome |
| ----- | ----- | ---------------- |
| **A — Specs** | Write all feature specs as `future` | Specs reviewable; no code required |
| **B — {name}** | {focus} | {demo outcome} |
| **C — {name}** | {focus} | {demo outcome} |
```

---

## Spec inventory (specs-first, medium / large)

```markdown
## Spec inventory

Write these **before or alongside** Phase B chunk 1. All behaviours start as 🔵 `future`; spec-level `status: future`.

Folder: `specs/{module}/`

| Spec file | `id` | Covers |
| --------- | ---- | ------ |
| `{area}/{name}.md` | `{module}-{area}-{name}` | {one line} |

### Chunk A0 — Author all specs

**Goal:** Specs exist and are reviewable as the contract for the whole feature.

**Work:**

- Copy `specs/_template.md` into each file above.
- Pull behaviours, invariants, and decision tables from [{design-file}.md](./{design-file}.md).
- Use requirements voice — no Postgres, Drizzle, Inngest, etc.
- Mark deferred-phase behaviours 🔵 `future` with notes in **Out of Scope** or **Future Considerations**.

**Done when:** {N} spec files exist under `specs/{module}/`, each with numbered behaviours and section headers present.

**Agent scope:** Spec files only — no implementation code.
```

---

## Chunk template (repeat per chunk)

```markdown
### Chunk {Id} — {Short title}

**Status:** _(omit on new plans; add when tracking progress)_

**Depends on:** {prior chunks}

**Spec(s):** `{spec/path}.md` _(behaviour IDs when known)_

**Work:**

- {Concrete deliverable}
- {Routes, mutations, lib helpers, tests}

**Done when:** {Observable acceptance — include manual app steps for UI}

**Out of scope:** {Explicit exclusions}
```

---

## Phase intro (optional, per phase)

```markdown
## Phase B — {Name}

{One paragraph: what this phase assumes, what is deferred, UI policy for this phase.}

**Deferred to Phase C only:** {list}
```

---

## Chunk → spec map (large, non-obvious phases)

```markdown
**Chunk → spec map:**

| Chunk | Primary spec(s) | Behaviours |
| ----- | --------------- | ---------- |
| B4 | `adoption/site-adoption.md` | B1–B5 |
```

---

## Execution order and milestones

```markdown
## Suggested execution order (critical path)

\`\`\`text
A0 → B1 → B2 → B3 → B4 → …
  → [B8–B10 parallel-friendly after B7]
\`\`\`

**First playable milestone:** After **{chunk}** — {what user can do}.
**{Named milestone}:** After **{chunk}** — {outcome}.
```

---

## PR checklist

```markdown
## Per-chunk PR checklist

- [ ] Spec behaviours updated for anything shipped
- [ ] Tests for server logic where patterns exist
- [ ] Manual test steps in PR description matching **Done when**
- [ ] Site UI for this chunk's behaviours shipped (not API-only unless foundation)
- [ ] No scope creep into **{deferred phase}** before its phase
- [ ] Migration included (you run generate/migrate) _(if schema touched)_
- [ ] Audit events for elevated permissions touched in chunk
```

---

## Open decisions (medium / large)

```markdown
## Open decisions to resolve before or during early chunks

Track these in spec **Open Questions**; resolve before marking related behaviours implemented.

| # | Topic | Status |
| - | ----- | ------ |
| 1 | {question} | Open — {note} |
| 2 | {question} | **Resolved** — {decision} |
```

---

## Design phase mapping (when design uses different labels)

```markdown
## Relationship to design doc phase labels

| Design doc | This plan |
| ---------- | --------- |
| Phase 1 in-scope | Phase A + B |
| Phase next | Phase E |
```
