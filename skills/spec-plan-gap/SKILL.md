---
name: spec-plan-gap
description: Search the existing spec estate for overlap, conflict, or existing coverage before authoring a new spec, then propose where the new one should live and what it should cover. Use when the user says "this isn't specced", "we need a spec for X", "is there a spec covering Y", or before starting any new spec. Pairs with spec-author-greenfield and spec-author-from-impl for the writing.
---

# Plan a Spec for a Gap

Before writing a new spec, find out whether one already covers it. Duplicate and contradictory specs are the fastest way to make an estate untrustworthy — two specs disagreeing about the same feature is worse than neither existing.

This skill **plans**; it doesn't write the spec file.

Format authority: [`references/spec-format.md`](../../references/spec-format.md).

## When to use

- "This behaviour isn't specced anywhere."
- "Do we have a spec covering X?"
- Before any new spec, greenfield or backfill.

**Not this skill:** writing the file (`spec-author-greenfield`, `spec-author-from-impl`), estate-wide health (`spec-gap-sweep`).

## Workflow

### 1. Understand the gap in the user's terms

What can't be found, or what needs recording? Get it in user-facing language before searching — searching for the implementation's vocabulary misses specs written in the product's.

### 2. Search the estate properly

Search on **meaning**, several ways, because one angle won't find everything:

- The feature's own vocabulary, and the synonyms a different author would have used.
- The module and adjacent modules — cross-cutting behaviour often lands in a neighbour.
- Behaviour text, not just titles and filenames. The relevant behaviour is often B7 of a spec named something else.
- Out of Scope and Future Considerations sections — the behaviour may be deliberately excluded, which is an answer.

### 3. Classify what you found

| Finding | Meaning | Action |
| --- | --- | --- |
| **Already covered** | An existing behaviour describes it | No new spec. Point at the ID |
| **Partially covered** | Adjacent spec covers some of it | Extend that spec, usually |
| **Deliberately excluded** | Named in an Out of Scope or Future Considerations | Not a gap. Surface the reasoning, ask whether it's changed |
| **Conflicts** | An existing spec says something incompatible | **Stop.** Resolve before authoring |
| **Genuine gap** | Nothing covers it | Plan the new spec |

**Conflicts halt the work.** Authoring on top of a contradiction produces two specs that disagree, and the estate loses the property that makes it useful.

### 4. Decide extend vs create

Prefer **extending** an existing spec when the behaviour belongs to the same feature as a user would describe it. Prefer **creating** when it's a distinct feature, has its own journey, or the host spec is already large.

A spec covering four loosely-related features helps nobody; nor do six specs describing one feature. Say which you're recommending and why.

### 5. Propose

For a new spec: path, `id`, `area`, one-line description, candidate behaviours in user terms, whether a flow is warranted, and which existing specs it borders and how.

For an extension: which spec, which behaviours to add, and whether the roll-up status changes.

Either way, name the authoring skill to run next — `spec-author-greenfield` if unbuilt, `spec-author-from-impl` if it exists.

## Quality gate

- [ ] Searched by meaning across several vocabularies, not one keyword.
- [ ] Behaviour text searched, not only titles.
- [ ] Out of Scope and Future Considerations checked.
- [ ] Conflicts surfaced and the work halted.
- [ ] A clear extend-or-create recommendation with a reason.
- [ ] No spec file written.

## Anti-patterns

- **One keyword search.** Specs are written in product language, which varies by author.
- **Creating a spec that overlaps an existing one.** The failure this skill exists to prevent.
- **Ignoring a deliberate exclusion.** Someone decided that; find out why before overriding it.
- **Authoring over a conflict.**

## Related skills

- `spec-author-greenfield` — write the planned spec, design-first
- `spec-author-from-impl` — write it from existing code
- `spec-gap-sweep` — estate-wide view
