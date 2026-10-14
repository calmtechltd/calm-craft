---
name: code-contract-audit
description: Review selected code against contract specs and governing requirements. Run only when explicitly invoked or requested by name. Report findings without editing code/contracts or running whole-repository gates.
---

# Code Contract Audit

Read repository instructions, working-tree state, selected contracts, governing requirements and the [short contract guide](../../references/coding-contracts.md). Establish the obligation scope, baseline and current-versus-target authority. Missing contracts are coverage gaps; unaccepted proposals do not establish current violations. If specs changed but contracts did not, report the stale contract rather than inventing a binding target.

Trace public callers, internals, aliases/re-exports and relevant integrations. Check concrete API guarantees, desired structure, dependency rules and compatibility. Missing code is an implementation gap. Load only relevant [contract details](../../references/code-contract-details.md) for state/authorization, effects/durable composition, published API compatibility, cross-consumer extraction or framework migration. Use relevant [architecture principles](../../references/architecture-principles.md) only when challenging design choices; a style preference is not an accepted obligation.

Apply the relevant [boundary conformance](../../references/code-contract-details.md#boundary-conformance) guidance to the selected implementation and affected consumers/composition. Check internal-import shortcuts, indirect re-exports, leaked backing/schema/provider details, foreign-state writes and responsibilities moved across the contract. Judge against recorded obligations and permitted exceptions, not an arbitrary style rule. Passing behavior tests do not erase a boundary violation; report boundary evidence and gaps independently.

Inspect evidence against the current meaning of each obligation. Old verification cannot verify a changed guarantee; require fresh evidence for affected behavior and callers. Reuse still-applicable checks, running only narrow authorized checks to resolve uncertainty. Static passes do not prove runtime semantics.

When a cross-module finding benefits from a visual, reuse a source-checked view or add a focused boundary/flow diagram linked to that finding. Follow the relevant [architecture views](../../references/code-contract-details.md#architecture-views) guidance; separate observed structure from suggested remedies.

For each verified finding, give the obligation/behavior ID, location/caller, observed consequence and scoped remedy. Separate current violations, target implementation gaps, stale contracts and missing evidence; cite product authority for independent intent mismatches. Group findings by cause, distinguish enforcement from documentation and state inspection limits. Recommend corrections without applying them. A selected audit does not certify the product or authorize release.
