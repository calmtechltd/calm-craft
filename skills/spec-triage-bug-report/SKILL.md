---
name: spec-triage-bug-report
description: Classify an inbound bug report against the relevant spec — confirmed bug, expected behaviour, spec gap, spec drift, out of scope, or no spec exists — before anyone changes code. Use when a user, support ticket, or stakeholder reports unexpected behaviour and you need to decide what kind of problem it is. Pairs with bug-regression-red-green for confirmed bugs.
---

# Triage a Bug Report Against the Spec

Decide **what kind of problem this is** before anyone fixes anything. Most wasted debugging happens because a report was assumed to be a bug when it was a spec gap, a misunderstanding, or intended behaviour nobody documented.

Format authority: [`references/spec-format.md`](../../references/spec-format.md).

## When to use

- A support ticket or stakeholder report of unexpected behaviour.
- "Is this a bug or is it meant to work like that?"
- Before starting on any reported defect.

**Not this skill:** fixing a confirmed bug (`bug-regression-red-green`), auditing a whole spec (`spec-audit-drift`).

## Workflow

### 1. Establish what actually happened

Separate the **observation** from the **interpretation**. Reports arrive as "the system deleted my data" when what happened was an archive that hid a row from a filtered list. Get to: what did they do, what did they see, what did they expect.

If reproduction steps are missing and you can't infer them, say so — an unreproducible report can be triaged as far as the spec and no further.

### 2. Find the governing spec

Use the search discipline from `spec-plan-gap`: several vocabularies, behaviour text as well as titles, adjacent modules. Identify the specific behaviour IDs, decision-table rows, or flow transitions that govern the reported scenario.

### 3. Classify

| Verdict | Meaning | Next |
| --- | --- | --- |
| **Confirmed bug** | Spec says X, code does Y, spec is right | `bug-regression-red-green` |
| **Expected behaviour** | Code matches the spec; the user expected something else | Reply explaining, citing the behaviour ID. Consider whether the design is worth revisiting |
| **Spec gap** | Spec is silent on this case | Decide the intended behaviour first, then `spec-plan-gap` or `spec-maintain-on-ship` |
| **Spec drift** | Code changed deliberately, spec never updated | `spec-maintain-on-ship` |
| **Out of scope** | Named in Out of Scope or Future Considerations | Reply with the reasoning. Not a defect |
| **No spec** | Nothing governs this feature | `spec-author-from-impl` before deciding anything |

The distinction between **confirmed bug** and **spec gap** is the one that matters most. A gap means nobody ever decided what should happen — so "fixing" it is really making a product decision, and it should be made deliberately rather than by whoever picks up the ticket.

### 4. Say which side is wrong, and why

For drift and for confirmed bugs, state whether the spec or the code should change, with a reason. "The spec is right and the code regressed" and "the code is right and the spec is stale" lead to completely different work.

Where a decision-table row or a guard is involved, quote it. Precision here prevents the fix from being made against a misremembering of the rule.

### 5. Report

- The verdict, and the behaviour, row, or transition IDs it rests on.
- What the spec says, quoted, versus what happens.
- The next skill to run.
- For expected-behaviour and out-of-scope verdicts, a plain-language explanation suitable for replying to whoever reported it.
- Anything you couldn't determine, and what would settle it.

Don't fix anything.

## Quality gate

- [ ] Observation separated from interpretation.
- [ ] The governing behaviour, row, or transition identified by ID — or its absence established.
- [ ] Verdict is one of the six, not a hedge.
- [ ] Spec content quoted, not paraphrased.
- [ ] Drift and bug verdicts say which side should change.
- [ ] No code or spec modified.

## Anti-patterns

- **Assuming it's a bug.** The premise this skill exists to test.
- **Treating a spec gap as a bug.** Turns an undecided product question into an arbitrary decision by whoever fixes it.
- **Triaging without finding the spec.** Then it's an opinion.
- **Fixing while triaging.**

## Related skills

- `bug-regression-red-green` — confirmed bugs
- `spec-maintain-on-ship` — drift, and gaps once decided
- `spec-plan-gap` — a gap needing a new spec
- `spec-author-from-impl` — no spec exists
