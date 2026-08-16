---
name: write-tests
description: Decide whether a test is worth writing, and at which layer, before adding one. Use when writing, generating, or filling tests; when the user says "don't test this", "skip tests", "that's too many tests", or "over the top"; and whenever an agent is about to add *.test.*, *.spec.*, or component tests. Prefer fewer tests that lock behaviour over coverage padding.
---

# Write Tests

The question is whether a test earns its keep, not whether you can write one. Agents default to too many. This skill is the restraint; `spec-author-tests` and `bug-regression-red-green` are how you write the ones that survive it.

Framework, location, and helpers: `.engineering/config.yaml` and the tests already in the tree. Read those before inventing a style.

## When to use

- About to add or generate tests, including as part of a chunk or a spec.
- "Don't test this" / "skip tests for X" / "that's too many tests".
- Reviewing a suite that looks padded.

**Not this skill:** assessing which spec IDs have tests (`spec-assess-coverage`), the red-green bug workflow (`bug-regression-red-green`).

## Honour an explicit skip

If I said not to test something:

- Do not write a test for it.
- Do not write a test that we are *not* testing it.
- Do not add a `skip` / `todo` / pending case that restates the instruction. That is still a test I asked you not to write.
- Mention the skip once in the hand-back. Then stop.

An instruction not to test is a scope fence, the same as Out of scope on a chunk.

## The type checker already ran

Types and lint are the static layer. They are tests. Do not add a runtime test that only restates them.

Do not test:

- That a required field is required on a type.
- That a function accepts the arguments it is declared to accept.
- Exhaustiveness, assignability, or narrowing the compiler already enforces.
- `expectTypeOf` / type-only suites unless this repo already has that convention *and* the type is a public contract that can break without a compile error.

A Zod refine, a parse boundary, or a runtime guard the compiler cannot see *does* earn a test. "The parameter is a `string`" does not.

## What earns a test

- A bug fix — a regression that failed on the broken code (`bug-regression-red-green`).
- Non-trivial logic — numbers, dates, permissions, tenancy, rollups, decision tables, invariants.
- A documented behaviour, once it is built, named after the spec ID and asserting the documented outcome.
- An input the type system cannot reject.

Match the density and layer of neighbouring tests in this repo. If similar code has no test, that is a signal, not a gap to flood.

## What does not

- Implementation details — private helpers, internal state, collaborator call order the user never sees.
- Restating a hardcoded source literal. `title = "Title"` then `expect(title).toBe("Title")` proves the line you just wrote.
- "Doesn't crash", "renders", or any test whose only assertion is that `render` did not throw.
- Layout, spacing, class names, Tailwind, click hit-testing, dropdown chrome.
- Re-testing server or lib behaviour through a mounted page.
- One test per line of a mapper or a list of passthrough props.
- Coverage padding, or a test whose only job is to move a percentage.
- The thing I said not to test.

A test that would only fail if the type checker or the linter were deleted is not a test.

## Pick the layer

| Layer | When |
| --- | --- |
| Static | Types and lint. Already ran. Do not duplicate. |
| Unit | Pure logic. Cheap, deterministic. The default for helpers. |
| Integration | Crosses the database, auth, or several steps, *and* this repo already tests that way. |
| UI | Only if this repo has a presentational harness. See below. |
| End-to-end | Only when I ask. |

If the interesting rule lives in a helper, test the helper. If it lives on a page or in a wizard, walk it in the running app. Do not build a mock forest so a page can mount.

## UI — use the repo's harness or write none

Ridiculous component tests are the usual failure: a page, twelve `vi.mock`s, and an assertion on a class name.

If the tree already has a presentational harness — commonly `describeUi` and colocated `*.ui.test.ts` — that is the UI path:

- Presentational leaves that render from props.
- A purpose, named mount cases, optional checks.
- A check asserts that **caller-supplied** props appeared, and that the branch from those props is right.
- No new mock of the router, app context, or page header. If mount needs one, this is the wrong layer.
- Do not add a sibling `*.test.tsx` for the same leaf.
- Do not invent checks for layout, clicks, or incidental DOM. A new leaf may be mount-only.

If the repo has no such harness, do not invent one in the same change, and do not start a Testing Library page suite. Walk the UI in the app.

## Discover before writing

Read the nearest tests and any shared test helpers. Copy their layer, naming, and fixtures. Axis 9 in `.engineering/conventions.yaml` (location, unit/integration split, what must have a test) wins over habit.

`spec-author-tests` still names tests after spec IDs. It does not get a free pass to fill every uncovered ID that fails the rules above. An uncovered 🔵 behaviour is not a test; it is unscheduled work. An uncovered implementation detail is not a gap.

## Quality gate

- [ ] Explicit "don't test X" honoured — no test, skip, or todo for X.
- [ ] Nothing here is already enforced by types or lint.
- [ ] Each test locks a behaviour, invariant, or regression a future reader would mourn.
- [ ] Layer matches the repo; no new mock forest; no e2e unless asked.
- [ ] UI, if any, uses the existing harness and asserts caller-supplied props, not chrome.

## Anti-patterns

- **A test that we didn't test X.** The instruction was the fence.
- **Testing the type system.** The compiler already did.
- **A page test with a mock of every import.** Extract the rule, or walk the app.
- **Asserting a literal the source hardcoded.** Not an input, not a behaviour.
- **Filling coverage so the chunk looks done.** Coverage is not the rule; 9.3 is.
- **Pending tests for skipped work.** Pending is for unbuilt specified behaviour, not for "don't test this".

## Related skills

- `spec-author-tests` — write the tests this skill allowed, from the spec
- `spec-assess-coverage` — which IDs have tests; does not decide they all should
- `bug-regression-red-green` — the ones that must exist
- `run-implementation-plan` — apply this before adding tests to a chunk
