---
name: spec-assess-coverage
description: Audit a feature spec against the test suite to find which behaviours, invariants, decision-table rows, and flow transitions have tests and which do not. Use when the user says "what's untested here", "which parts of this spec have tests", "where should I focus testing", or before trusting a spec's implemented badges. Pairs with spec-audit-drift, which asks whether the spec matches the code.
---

# Assess Test Coverage Against a Spec

Which parts of this spec are proven by tests? Not a coverage percentage — a named list of what is and isn't covered, by ID.

This works because the spec gives concrete named things to look for. Coverage tools tell you which lines executed; this tells you which _requirements_ are demonstrated.

Format authority: [`references/spec-format.md`](../../references/spec-format.md). Test locations and patterns: `.engineering/config.yaml`.

## When to use

- "What's untested in this feature?"
- Deciding where testing effort pays back most.
- Sanity-checking 🟢 badges before relying on them.

**Not this skill:** writing the tests (`spec-author-tests`), checking spec vs code (`spec-audit-drift`).

## Workflow

### 1. Enumerate what needs coverage

From the spec: every behaviour ID, every invariant, every decision-table row, and every flow transition plus **both outcomes of every guard**. That last one is routinely missed — a guard tested only on its happy branch is half-tested.

### 2. Find matching tests by reasoning, not by grep

Specs carry no test references by design, so search on meaning: test names, describe blocks, fixtures, assertions. A test named after a function may still exercise a behaviour; a test naming a behaviour may assert something else entirely.

**Read the assertions.** A test that exercises a path without asserting the outcome does not cover it, however well-named.

### 3. Classify

| Verdict          | Meaning                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| **Covered**      | A test exercises it and asserts the documented outcome                                                        |
| **Partial**      | Exercised, but the assertion is weaker than the spec — happy path only, one guard branch, outcome not checked |
| **Uncovered**    | No test                                                                                                       |
| **Contradicted** | A test asserts something the spec doesn't say, or the opposite                                                |

**Contradicted** is the one to lead with. It means the spec and the suite disagree about intent, and one of them is wrong — a much more urgent problem than a gap.

### 4. Weight the gaps

An uncovered gap on a 🟢 behaviour is a badge that isn't earned. An uncovered gap on a 🔵 behaviour is expected and needs no comment.

Prioritise by consequence, not count: invariants and guard branches protect against the failures nobody anticipates, so an uncovered invariant usually outranks three uncovered behaviours.

### 5. Report

Table by ID with verdict and the test file where one exists. Then:

- **Behaviours badged 🟢 with no covering test** — the badges to fix or the tests to write.
- **Contradictions**, with both sides quoted.
- **Recommended order of work**, by consequence.

Don't write tests here. Hand to `spec-author-tests`.

## Quality gate

- [ ] Every behaviour, invariant, decision-table row, and flow transition has a verdict.
- [ ] Both branches of every guard assessed separately.
- [ ] Assertions read, not just test names.
- [ ] 🟢 behaviours without coverage called out explicitly.
- [ ] Contradictions reported with both sides.
- [ ] No tests written.

## Anti-patterns

- **Matching on names alone.** A confidently-named test asserting nothing is worse than no test.
- **Counting a guard as covered** when only one branch is exercised.
- **Reporting a percentage.** The list of names is the deliverable.
- **Treating uncovered 🔵 behaviour as a gap.** It isn't built.

## Related skills

- `spec-author-tests` — write the missing tests
- `spec-audit-drift` — the code-side question
- `spec-maintain-on-ship` — correct badges this proves wrong
