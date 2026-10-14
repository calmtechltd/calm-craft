---
name: code-contract-implement
description: Build or adapt code to satisfy selected contract specs and desired structure. Run only when explicitly invoked or requested by name. Writing contracts alone does not authorize implementation.
---

# Code Contract Implementation

Read the selected contracts, governing specs, repository instructions and [short contract guide](../../references/coding-contracts.md). Inspect the working tree and existing framework choices; preserve unrelated changes and establish the implementation scope.

Compare the target with current code. Reuse what satisfies it, change incompatible behavior and build missing functionality. Update affected callers and integration points; deliver working behavior. Resolve material contract gaps before dependent work without weakening intent. Use `code-contract-design` when changed specs require contract revision.

Stay within the selected boundary while editing: use declared public operations and allowed dependencies/state access; keep private representation and excluded responsibilities inside their intended modules. Avoid internal-import shortcuts, accidental exports, domain-policy moves and speculative APIs that merely make the implementation convenient. For consequential interfaces, use the relevant [boundary conformance](../../references/code-contract-details.md#boundary-conformance) guidance. If a boundary must change, reconcile its design and affected callers within the authorized scope before dependent implementation; never silently widen or weaken it.

Follow existing conventions and generators. Load only relevant [contract details](../../references/code-contract-details.md) for state/authorization, effects/durable composition, published API compatibility, cross-consumer extraction or framework migration. Preserve unaffected guarantees and supported identities; never hand-edit generated files, lockfiles or migration history.

Run narrow checks of required behavior, failures and relevant integration; use [write-tests](../write-tests/SKILL.md) before adding tests. Changed obligations need fresh evidence for the revised guarantee and affected callers. Review the complete scoped diff, renew affected evidence and update contract/catalog status. Keep prior results as history; report gaps and unrun checks.

Before declaring the contract complete, check both behavior and boundary conformance across the full scoped diff, affected callers and composition. Trace indirect bypasses and inspect relevant state/effect access, not just imports. Correct violations within the selected scope, including those introduced by this work; preserve authorized exceptions and report out-of-scope issues separately. Cite boundary evidence alongside behavior evidence for the selected obligations, identifying enforced, reviewed and unverified rules. Passing tests cannot excuse a known violation or establish an uninspected boundary. Leave unresolved violations or material evidence gaps incomplete; do not mark them verified.

When implementation changes documented structure, update affected diagrams/code trees from actual code; keep unbuilt proposals labelled.

When design and implementation are already authorized, complete both within scope without routine reconfirmation. Commit, push, deployment and publication require their own authorization.
