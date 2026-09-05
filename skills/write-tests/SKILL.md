---
name: write-tests
description: Decide whether a test is worth writing, and at which layer, before adding one. Use when writing, generating, or filling tests; when the user says "don't test this", "skip tests", "that's too many tests", or "over the top"; and whenever an agent is about to add *.test.*, *.spec.*, or component tests. Prefer fewer tests that lock behaviour over coverage padding.
---

# Write Tests

Choose tests that protect meaningful runtime behavior. Use `spec-author-tests` or `bug-regression-red-green` to write the tests justified here.

Framework, location, and helpers: `.engineering/config.yaml` and the tests already in the tree. Read those before inventing a style.

**Not this skill:** assessing which spec IDs have tests (`spec-assess-coverage`), the red-green bug workflow (`bug-regression-red-green`).

## Honour an explicit skip

If I said not to test something:

- Do not write a test for it.
- Do not write a test that we are *not* testing it.
- Do not add a `skip` / `todo` / pending case that restates the instruction. That is still a test I asked you not to write.
- Mention the skip once in the hand-back. Then stop.

An instruction not to test is a scope fence, the same as Out of scope on a chunk.

## Use the static layer

Types and lint enforce static contracts. Do not add a runtime test that only restates them, and do not claim those checks passed without running them.

Do not test:

- That a required field is required on a type.
- That a function accepts the arguments it is declared to accept.
- Exhaustiveness, assignability, or narrowing the compiler already enforces.
- `expectTypeOf` / type-only suites unless this repo already has that convention *and* the type is a public contract that can break without a compile error.

A Zod refine, a parse boundary, or a runtime guard can earn a test when it protects a meaningful failure the compiler cannot prevent. "The parameter is a `string`" does not.

## What earns a test

- A meaningful runtime regression, demonstrated against the broken code when claiming regression protection (`bug-regression-red-green`). Existing coverage may already reproduce it.
- Non-trivial logic — numbers, dates, permissions, tenancy, rollups, decision tables, invariants.
- A documented behaviour whose outcome needs runtime protection, named after the spec ID when one exists.
- A meaningful invalid input the type system cannot reject at the real boundary.

For each proposed test, name the plausible failure it would catch and the independent reason its expected outcome is correct: a requirement, business rule, external contract, or reported regression. Permissions and tenancy are important contracts; simplicity of the implementation is not a reason to drop their protection.

Review the implementation and test together. A test of a fallback does not justify the fallback if the real producer cannot supply that input. Establish the supported boundary before inventing incomplete typed values with casts. Mock count alone does not decide value; ask whether the assertion exercises real behaviour or only repeats the mock setup.

Match the density and layer of neighbouring tests in this repo. If similar code has no test, that is a signal, not a gap to flood.

## What does not

- Implementation details — private helpers, internal state, collaborator call order the user never sees.
- Copying a hardcoded source literal into an assertion without an independent contract. An event name, prescribed limit, or required text can be a legitimate literal expectation.
- "Doesn't crash", "renders", or any test whose only assertion is that `render` did not throw.
- Layout, spacing, class names, Tailwind, click hit-testing, dropdown chrome.
- Re-testing server or lib behaviour through a mounted page.
- One test per line of a mapper or a list of passthrough props.
- Coverage padding, or a test whose only job is to move a percentage.
- The thing I said not to test.

A runtime test that only duplicates a static guarantee adds no protection.

## Pick the layer

| Layer | When |
| --- | --- |
| Static | Types and lint. Run the relevant checks; do not duplicate their guarantees. |
| Unit | Pure logic. Cheap, deterministic. The default for helpers. |
| Integration | Crosses the database, auth, or several steps, *and* this repo already tests that way. |
| UI | Only if this repo has a presentational harness. See below. |
| End-to-end | Add only when requested; preserve and run existing required coverage under repository policy. |

If the interesting rule lives in a helper, test the helper. If it lives on a page or in a wizard, follow the repository's UI verification policy. Browser verification is separate from automated test coverage; use it when the task or standing repository instructions authorise it.

## UI — use the repo's harness or write none

A page mounted behind mocks to assert a class name is a warning sign: the test may be protecting incidental markup while bypassing the behaviour that matters.

If the tree already has a presentational harness — commonly `describeUi` and colocated `*.ui.test.ts` — that is the UI path:

- Presentational leaves that render from props.
- A purpose, named mount cases, optional checks.
- A check asserts that **caller-supplied** props appeared, and that the branch from those props is right.
- No new mock of the router, app context, or page header. If mount needs one, this is the wrong layer.
- Do not add a sibling `*.test.tsx` for the same leaf.
- Do not invent checks for layout, clicks, or incidental DOM. A mount-only entry in an existing visual harness is a fixture for visual inspection, not an automated behavioural test or coverage evidence.

If the repo has no such harness, do not invent one in the same change, and do not start a Testing Library page suite. Follow its existing verification policy; report any useful check that remains unrun and why.

## Discover before writing

Read the nearest tests and any shared test helpers. Reuse or extend an existing scenario before adding another test or file. Follow the established layer, naming, and fixtures, but do not copy low-value assertions. Follow recorded testing decisions in `.engineering/conventions.yaml` where present, together with the repository's authoritative test rules; do not assume every question-bank axis has a recorded answer.

Use table-driven cases or a combined scenario when they make each relevant outcome clear. Do not require one test per guard, decision-table row, or spec ID. When authorised to simplify existing tests, consolidate duplicated coverage while preserving permission, tenancy, and regression protection.

`spec-author-tests` still names tests after spec IDs. It does not get a free pass to fill every uncovered ID that fails the rules above. An uncovered 🔵 behaviour is not a test; it is unscheduled work. An uncovered implementation detail is not a gap.

## Verify without duplicate runs

One coordinating agent owns verification for the task. Workers run only assigned checks and return the command, result, and changes it covers; they do not independently start full suites, app servers, readiness passes, or sibling reviews. Delegate substantial independent work when permitted, without a minimum fanout or one agent per file.

Batch the smallest checks that cover a coherent change. Reuse passing evidence until relevant code, tests, dependencies, configuration, or environment changes invalidate it. Preserve a separate failing run when demonstrating a regression. Broaden checks for an unresolved integration risk, not merely because a chunk ended.

Prose-only changes need diff review and applicable frontmatter/link checks, not application tests. Configuration uses its owning syntax/schema validator. Types and lint establish static guarantees; do not claim them passed unless they ran. Full local CI requires an explicit checks/readiness request or an applicable repository requirement. Release checks belong at the release boundary.

Use focused browser verification when needed to establish changed user-facing behaviour and allowed by the task and repository policy. Honour an explicit skip and batch affected journeys in one coordinator-owned session. Browser evidence is separate from automated coverage; it does not authorise live mutations or new end-to-end infrastructure. Preserve required existing UI checks.

Report tests, static checks, browser evidence, justified omissions, and required unrun checks separately. An omitted test is not a passing test; missing required evidence leaves the work unverified.

## Related skills

- `spec-author-tests` — write the tests this skill allowed, from the spec
- `spec-assess-coverage` — which IDs have tests; does not decide they all should
- `bug-regression-red-green` — reproduce worthwhile runtime regressions
- `run-implementation-plan` — apply this before adding tests to a chunk
