---
name: spec-assess-coverage
description: Audit a feature spec against the test suite to find which behaviours, invariants, decision-table rows, and flow transitions have tests and which do not. Use when the user says "what's untested here", "which parts of this spec have tests", "where should I focus testing", or before trusting a spec's implemented badges. Pairs with spec-audit-drift, which asks whether the spec matches the code.
---

# Assess Test Coverage Against a Spec

Which requirements have automated test coverage, and which need another form of verification or further work? Report evidence by ID without treating every missing test as a defect.

This works because the spec gives concrete named things to look for. Coverage tools tell you which lines executed; this tells you which _requirements_ are demonstrated.

Format authority: [`references/spec-format.md`](../../references/spec-format.md). Test locations and patterns: `.engineering/config.yaml`.

**Not this skill:** writing the tests (`spec-author-tests`), checking spec vs code (`spec-audit-drift`).

## Workflow

### 1. Enumerate what needs coverage

From the scoped spec: every behaviour ID, invariant, decision-table row, and flow transition, including the distinct outcomes of behavioural guards. Read `write-tests` and the repo's verification conventions to determine which require automated coverage. Exclude unscheduled 🔵 work from actionable gaps; assess the built portion of 🟡 behaviours separately.

Assess each meaningful outcome, but do not require a separate test for every guard, row, or ID. One scenario or table-driven test may cover several requirements if its assertions demonstrate each one.

### 2. Find matching tests by reasoning, not by grep

Specs carry no test references by design, so search on meaning: test names, describe blocks, fixtures, assertions. A test named after a function may still exercise a behaviour; a test naming a behaviour may assert something else entirely.

**Read the assertions.** A test that exercises a path without asserting the outcome does not cover it, however well-named.

### 3. Classify automated coverage and verification separately

| Verdict          | Meaning                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| **Covered**      | A test exercises it and asserts the documented outcome                                                        |
| **Partial**      | Exercised, but the assertion is weaker than the spec — happy path only, one guard branch, outcome not checked |
| **Uncovered**    | No test                                                                                                       |
| **Contradicted** | A test asserts an outcome incompatible with the spec                                                        |

For each ID, also record the verification disposition and evidence:

- **Automated coverage required** — the repository policy or risk calls for a runtime test; an uncovered or partial outcome is an actionable gap.
- **Other verification appropriate** — identify the relevant static check or browser check and whether it actually ran. A recommendation or an unrun check is not evidence.
- **No additional test warranted** — record the reason under `write-tests`, including explicit user exclusions. This is a deliberate decision, not automated coverage.
- **Future / out of scope** — no current testing work; leave it in the spec or plan.

Do not count a manual browser check or static evidence as an automated behavioural test. **Contradicted** means the spec and suite disagree about intent; lead with that finding. A test asserting extra detail the spec leaves open is not automatically contradictory, though that detail may need clarification.

### 4. Weight the gaps

A 🟢 behaviour needs the evidence required by the repo's badge and verification policy. A missing automated test alone does not invalidate the badge when another verification method is appropriate or an explicit no-test decision applies. Call out missing required evidence and keep unrun checks visible.

Prioritise by consequence, not count: invariants and guard branches protect against the failures nobody anticipates, so an uncovered invariant usually outranks three uncovered behaviours.

### 5. Report

Table by in-scope ID with automated coverage verdict, verification disposition, evidence location, and any remaining action. Mention excluded future work once rather than reporting a gap for each ID. Then:

- **Missing required verification** — distinguish automated test gaps from unperformed static or browser checks.
- **Appropriate alternative verification or no-test decisions** — record the basis without claiming automated coverage.
- **Contradictions**, with both sides quoted.
- **Recommended order of work**, by consequence.

Reuse available evidence under [write-tests](../write-tests/SKILL.md); coverage assessment does not itself require running the suite. Don't write tests or change badges here. Hand actionable automated gaps to `spec-author-tests`; use `spec-maintain-on-ship` for any badge correction supported by the evidence.

## Related skills

- `write-tests` — whether an uncovered ID should get a test
- `spec-author-tests` — write the missing tests
- `spec-audit-drift` — the code-side question
- `spec-maintain-on-ship` — correct badges this proves wrong
