# Coding contracts

Contract specs connect requirements to public guarantees and desired code structure. Use this short guide by default; load the linked detail only for the concerns present in the task.

## Location and authority

Use the repository's architecture location, or `docs/architecture/contracts/<module-id>.md` with a lookup at `docs/architecture/index.md`. A catalog entry needs only the capability, public/implementation path and contract link. Cover useful boundaries, not every file; no person/team owner fields are required.

Specs, supported API promises and requested decisions govern behavior. Code informs reuse and feasibility; it cannot override changed requirements. Link canonical intent rather than copying it. Distinguish current code from a proposed target and record the requested/accepted scope once. Verification does not accept a target or authorize implementation; existing authorization for both design and implementation is sufficient.

Keep contracts outside `specs/` until the feature parser supports them. Do not invent engineering-config keys. The CLI/visualizer does not yet parse or enforce this format.

## Contract shape

Use the repository's existing format when present. Otherwise keep the contract to responsibility/authority, operations and guarantees, structure and checks. Omit irrelevant sections, including “no effects” boilerplate. Put short rationale beside the choice it explains; link existing design/evidence instead of repeating it. A small contract needs no separate design document.

Illustrative pure-library contract:

```markdown
---
id: membership-projection
status: proposed
---
# Membership projection

Normalizes member identifiers; authority: specs/members.md B1–B2,
requested target. Persistence and permission policy remain with callers.

## API and guarantees
Proposed public operation: normalizeMembers(items: readonly string[]): string[].
Inputs are strings; out-of-type inputs are outside this contract.
- C1 (proposed): trim and lowercase, omit blanks, deduplicate in first-seen order.
- C2 (proposed): return a fresh array without mutating input or using IO/global state.

## Structure
Proposed src/index.ts owns the operation and private deduplication state;
no external dependencies. One module keeps the equivalence policy together.
Public consumers import src/index.ts; test/public.test.mjs exercises that API.

## Checks
Required: normalized duplicates, blanks, ordering, empty input and frozen input.
Run node --test test/public.test.mjs. Implementation/evidence is pending.
```

State concrete inputs/results, caller preconditions, success/failure guarantees and invariants. Name unspecified requirements as gaps. Add compatibility, state, recovery or adoption detail only when consequential. Write a cross-contract design note only when the reasoning cannot live clearly in the selected contracts.

A boundary states the public operations, permitted dependencies and relevant state/effect access, plus responsibilities and representation kept private. Make consequential limits checkable obligations; a file tree alone does not establish them. Implementation must satisfy both behavior and these limits. Before declaring completion, check the full scoped diff and affected callers for bypasses, abstraction leaks and scope drift. Passing behavior tests cannot waive a boundary violation. Resolve necessary boundary changes through design within the authorized scope; never silently weaken a contract to fit code.

Reviews spanning several capabilities include a relationship diagram and annotated current code structure. Show comparable proposed views when recommending structural changes, and a representative flow when execution matters. Use the relevant [architecture views](code-contract-details.md#architecture-views) guidance only for these outputs. A small utility needs no diagram.

## Status and fresh verification

Preserve stable obligation IDs such as `C1`, `C2`; supersede obsolete obligations with a reason. Obligations are `proposed`, `implemented` or `verified`. The module is `proposed` before implementation, `partial` while implementation or verification remains incomplete, and `verified` when all in-scope obligations, including boundary rules, have appropriate evidence and no implementation gaps remain.

**Changing an obligation's meaning invalidates its previous verified status.** Retain old evidence as history, reset the revised obligation to `proposed` (or `implemented` if its implementation is established), and require fresh checks of the changed guarantee and affected callers. Recheck unchanged guarantees when the implementation change could affect them; otherwise retain still-applicable evidence. Recalculate the module/catalog status from those results.

Link verification to the actual implementation/branch, operation checked, environment and limits. A test title, typecheck or import graph alone does not prove runtime semantics. Keep detailed evidence in one place and expose remaining gaps.

## Workflow and optional detail

Use `code-contract-design` for new/revised contracts, `code-contract-implement` to build/adapt, and `code-contract-audit` for conformance review. `code-contract-discover` is optional when decomposition needs investigation. Invoke planning, spec or convention workflows only when their job is needed. These skills remain explicit-only.

Read relevant sections of [contract details](code-contract-details.md) for state/authorization, effects/durable composition, published API compatibility, cross-consumer extraction or framework migration. Use relevant [architecture principles](architecture-principles.md) when making or challenging consequential boundary/style decisions, or assessing agent usability. A routine contract update does not need either detailed reference.
