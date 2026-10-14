# Conditional contract detail

Read only the sections relevant to the selected boundary. These extend the [short contract guide](coding-contracts.md); they are not additional required headings or workflow stages.

## Architecture views

Use these views to explain the selected architecture; omit views that add no information.

| View                   | When useful                                              | Show                                                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relationships          | A review/design spans several capabilities               | Public APIs, composition and important dependencies. Label arrows as imports, calls, data flow or state changes.                                                                        |
| Current code structure | Existing modules and integration points need explanation | A scoped annotated file/module tree with public entry points, internals, composition and relevant checks; identify generated/framework-required paths.                                  |
| Proposed structure     | A boundary or layout change is proposed                  | A comparable target diagram/tree identifying what stays, moves or is added, affected callers and unresolved interfaces. For greenfield work show only the proposal.                     |
| Execution              | Ordering, branching or state transitions matter          | A representative success/failure interaction, required versus optional work, joins and relevant transaction/effect boundaries. Keep execution order separate from dependency direction. |

Prefer small Mermaid diagrams in Markdown and fenced text for code trees. Place each view beside the finding/decision it explains; replace duplicated prose rather than adding a second full explanation. Verify observed edges against source/callers and link key paths. Mark inferred or uninspected relationships, and label proposals separately from accepted or implemented structure. Logical modules do not imply separate deployment tiers; a folder move does not prove isolation.

When a boundary explains a finding, mark its public crossings and relevant private state/policy; annotate observed bypasses with obligation IDs.

Reuse existing views after checking them against the current scope. When implementation changes their structure, update the affected views from actual code. Small utilities do not need diagrams, and a focused audit does not need a new whole-system map.

## Boundary conformance

Make selected limits explicit: public entry points and operations, allowed dependency direction, private representation, excluded responsibilities and permitted state/effects. Record intentional host coupling and bounded legacy exceptions instead of treating every exposed detail as a defect. Consumers should need the promised interface, not another module's private schema, provider payload, mutable backing object or incidental call sequence.

Inspect the implementation and affected consumers/composition, including indirect imports, aliases/re-exports, callbacks, generated calls and cross-module state access. Look for public-API bypasses, accidental internal exports, undocumented representation dependencies, moved domain policy, weakened authorization/atomicity and new responsibilities outside the selected contract. Legitimate use of a declared API, data schema or host integration is not a leak merely because it crosses a module boundary.

Reuse existing visibility/package rules, compiler/lint/import checks and meaningful integration tests. Add enforcement only when authorized and justified; no new architecture framework is required. Static checks establish selected structural rules, while review/runtime checks cover relevant behavior, authority and effects. Name review-only or unverified limits rather than treating a green suite as complete conformance.

During implementation, correct drift affecting the selected contract within scope, including newly introduced violations. If the intended work needs a different boundary, first identify the affected guarantee/callers and reconcile the design under existing authorization; do not quietly widen APIs, add consumer-specific switches or weaken obligations. Preserve authorized legacy exceptions and report violations outside the selected scope separately. Completion requires supported evidence for selected behavior and boundaries; known violations or material unverified limits remain gaps, not verified success.

## State and authorization

For mutable state or resources, specify permitted reads/writes, data scope, resource lifetime and which operation maintains each invariant. Shared storage does not permit arbitrary cross-module writes. Keep cross-module atomic changes behind a specified coordinator operation; do not split one invariant across independent commits.

At trust boundaries, an operation must preserve authorization even if a caller previously checked it. Describe actual native signatures faithfully, including host contexts, separately from proposed capability ports. New ports should expose concrete consumer/core inputs and results rather than `context: any`, an entire database context or provider implementation types. Plain passed functions may suffice. Incomplete schemas remain design gaps.

## Effects and durable composition

Where a workflow exists, tasks produce bounded results; composition defines ordering, joins, required/optional outputs, selected context and invalidation. The host supplies scheduling and persistence. Bind adapters at composition boundaries; a portable core must not import consumer/host internals. Ordinary function composition needs no workflow runtime.

Trace actual handlers and admission/recovery rules separately from progress labels. Preserve required/optional relationships. Retained artifacts need exact references, relevant scope/schema/version/provenance and retry attempt identity. Define merge rules at joins so parallel work cannot silently overwrite context. Keep credentials/private external payloads out of generic progress; retrieved content is untrusted data.

Declare commit, replay, cancellation, concurrency and uncertainty guarantees. Preserve the identity and reconciliation of an invoked effect whose outcome is unknown; successful-step memoization does not make replay safe. Route obtainable evidence gaps to bounded recovery with resource limits and terminal/deferred outcomes. Human questions remain for unavailable information, decisions or authority. Verify the actual recovery operation and relevant host transaction, not a similarly named test or a pure substitute.

## Public compatibility and extraction

Record supported consumer expectations, invalid/stale input behavior and compatibility/deprecation commitments. Matching types do not prove substitutable behavior. Compare actual consumer contracts before extraction: inputs, results, policy, state and effect/recovery meaning must agree. Shared providers or nouns are insufficient. Keep differing domain policies separate; avoid consumer-specific switches in a nominally generic core.

A new library needs intended public use cases and compatibility/release commitments, not a second-product prerequisite. A local module is a valid first boundary; classes, DI containers, packages and universal repository layers are optional choices with costs. Preserve useful existing seams.

## Framework migration and enforcement

Inspect actual language/runtime versions, module rules, framework roots, compiler configuration and generators. Use applicable authoritative documentation when needed; distinguish platform requirements, local conventions and recommendations. Preserve supported public entry points, generated workflows and retained API/run/effect identities unless the selected change authorizes their transition. Never hand-edit generated files, lockfiles or migration history.

Record only relevant current-to-target differences, callers to migrate, legacy allowances and open gaps. Maintain affected design decisions when implementation changes structure. A folder move or scaffold is not adoption: real callers must use the contracted operations and meaningful narrow checks must support their guarantees.

Reuse existing compiler/linter/AST checks for aliases, re-exports, cycles, forbidden edges and API bypasses. Inspect events, generated calls, resource access, transactions and policy meaning separately; static graphs cannot prove those semantics. Document bounded exceptions and distinguish enforced, review-only and documented-only rules.
