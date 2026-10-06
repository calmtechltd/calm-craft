# Implementation Plan Examples

## Small feature (~5 chunks)

**Design:** Add "duplicate checklist" to operations — copy an existing checklist with items to a new draft name.

**Strategy:** Vertical slices (specs trail or single `operations/checklists/duplicate.md` authored in chunk 1).

```markdown
# Duplicate Checklist — Implementation Plan

**Source design:** [duplicate-checklist-design.md](./duplicate-checklist-design.md)
**Strategy:** Single spec → vertical slices with UI each chunk
**Chunk size:** One agent session each

## Phases

- **A** — Spec + permission check (1 chunk)
- **B** — Ship duplicate flow end to end (4 chunks)

### Chunk A1 — Spec duplicate behaviour

**Depends on:** _None_

**Spec(s):** `operations/checklists/duplicate.md` (new)

**Work:** Author spec from design; behaviours B1–B4.

**Done when:** Spec file exists, reviewable, all `future`.

---

### Chunk B1 — Server duplicate mutation

**Depends on:** A1

**Spec(s):** `operations/checklists/duplicate.md` B1–B2

**Work:** `duplicate-checklist` mutation; copy items; audit event.

**Done when:** Integration test: duplicate creates new draft with copied items.

**Out of scope:** UI.

---

### Chunk B2 — Duplicate action on checklist list

**Depends on:** B1

**Work:** List row action; navigate to new draft on success.

**Done when:** In app, duplicate from list → new draft opens with same items.

**Out of scope:** Detail-page duplicate entry point.

---

… (B3, B4 as needed)
```

---

## Large feature (pattern)

See the full reference:

- Design: `.active/standards-feature/standards-feature.md` in the target Calm repository, when available
- Plan: `.active/standards-feature/standards-implementation-plan.md` in the target Calm repository, when available

Structural choices that scale:

| Element        | Standards example                                        |
| -------------- | -------------------------------------------------------- |
| Phase A        | A0 authors 16 specs before B1                            |
| Foundation     | B1–B3 permissions, schema, seed — backend only           |
| First UI       | B4 adopt flow — list + mutation together                 |
| Type fan-out   | B10–B11, B26–B29 one evidence type per chunk             |
| Deferred phase | Library browse C1+ only after B31                        |
| Parallel       | B18–B21 after B16; B26–B29 any order after B15           |
| Gate chunk     | C0 spec reconciliation before C2 builder                 |
| Tracking       | Status lines, open decisions table, design-phase mapping |

When generating a large plan and the local standards plan is available, read its **Phase map**, **Spec inventory**, and **Suggested execution order** sections as structural reference — do not copy chunk IDs or domain content.

---

## Chunk split decision tree

```text
Is it user-visible in the app?
├─ No → Can it ship without UI? (permissions, schema, seed)
│        └─ Yes → backend-only chunk; Done when = tests/query/seed trigger
└─ Yes → Same chunk as API + routes + manual Done when

Does it share prerequisites with siblings?
├─ Yes, identical deps → candidate for parallel-friendly group
└─ No → serialize in critical path

Is Work > ~8 bullets?
└─ Yes → split by route, entity, or integration boundary
```
