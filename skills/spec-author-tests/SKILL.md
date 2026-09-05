---
name: spec-author-tests
description: Write worthwhile tests from a feature spec and its flow contract, reusing existing coverage and reporting disagreements between code and intent. Use when the user says "write tests from this spec", "fill the coverage gaps", "prove this wizard works", or after spec-assess-coverage identifies required automated gaps.
---

# Author Tests From a Spec

Turn behaviours, invariants, decision-table rows, and flow transitions into tests. The spec is the source of truth; the tests demonstrate it.

Format authority: [`references/spec-format.md`](../../references/spec-format.md). Framework, patterns, and file conventions: `.engineering/config.yaml`.

**Not this skill:** assessing what's missing (`spec-assess-coverage`), a regression test for a reported bug (`bug-regression-red-green`), deciding a test is worth writing (`write-tests` — apply that first).

## Workflow

### 1. Select the surface

Confirm which behaviours, invariants, rows, and transitions are in scope. Default to the required automated gaps from `spec-assess-coverage`, then apply `write-tests` — exclude static guarantees, explicit skips, unscheduled work, implementation details, and behaviour appropriately verified at another layer. Assess both meaningful outcomes of behavioural guards; they do not need separate test functions.

### 2. Pick the layer

Unit for pure logic; integration where it crosses the database, auth, or multiple steps. Follow the repo's layer, location, and naming conventions. Use its existing UI harness or browser verification policy for UI behaviour; do not introduce mounted page tests simply because a flow has IDs.

Read existing tests and fixtures before adding coverage. Extend or parameterise an existing scenario when it can demonstrate the requirement clearly. A spec ID does not require its own file or test function.

### 3. Write tests named after the requirement

Name tests after the **documented intent**, and cite the relevant IDs in names, case labels, or concise comments:

```
B5 — a partially paid invoice can be refunded up to the amount received
F1.T3 — validation failure returns to upload with the reason shown
Decision table row 4 — an expired grace period marks the payment overdue
```

A future reader must be able to go from a failing test to the thing it was protecting without reading the implementation. This is why the naming matters more than usual.

Assert the **documented outcome**, with an independent basis for expected values. Inspecting current behaviour helps understand the fixture and test boundary, but does not establish what the result should be. Required event names, limits, and other literal contracts can be valid expectations.

### 4. Keep future work in the spec or plan

Do not create passing empty tests, todo markers, or skipped cases for unscheduled 🔵 behaviour, out-of-scope portions of 🟡 behaviour, or an explicit instruction not to test. Report the scope decision once. When unbuilt behaviour is part of an authorised implementation task, a meaningful failing test can drive that work; follow that task's workflow instead of leaving speculative pending cases.

### 5. Report disagreements about intent

If the implementation appears to contradict the spec, first check the fixture and assertion against the intended boundary. Do not change a correct expectation merely to pass, or silently rewrite the spec to match the code.

Report the ID, what the spec says, what the code does, and the evidence for whether the spec is stale (→ `spec-maintain-on-ship`) or the code is wrong (→ `bug-regression-red-green`). Resolve within existing task authorisation when intent is clear. If intent or permission is missing, pause only the dependent change and continue independent work while seeking the needed decision.

Keep the distinction between correcting a test setup and changing product intent explicit.

### 6. Run and hand back

Run the added or changed tests and directly affected neighbours under the coordinator's verification assignments. Reuse current passing evidence; do not trigger the full suite or readiness gates. New tests against implemented behaviour should pass. Investigate failures: repair incorrect setup or assertions from the documented contract, and handle actual intent disagreements under step 5. For regression claims, use `bug-regression-red-green` to establish failure against broken code.

Report tests added or extended, their results, disagreements, and any skipped or unverified behaviour with its reason. Distinguish browser or static verification from automated behavioural test coverage.

## Related skills

- `write-tests` — whether this test should exist
- `spec-assess-coverage` — what needs writing
- `spec-maintain-on-ship` — when the spec turned out to be stale
- `bug-regression-red-green` — when the code turned out to be wrong
