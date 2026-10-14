---
name: code-contract-discover
description: Inspect a library, application, tool or service for cohesive responsibilities and architecture trade-offs. Run only when explicitly invoked or requested by name. Report and propose without refactoring or changing runtime state.
---

# Code Contract Discovery

Read repository instructions, working-tree state, governing requirements and existing contracts/decisions. Preserve unrelated work. Use the [short contract guide](../../references/coding-contracts.md) for authority and catalog rules. Identify purpose, supported consumers, expected changes and important system qualities before choosing boundaries.

Use relevant sections of [architecture principles](../../references/architecture-principles.md) to assess cohesion, information hiding, dependency direction and consequential trade-offs. Inspect actual language/framework/runtime constraints. Load relevant [contract details](../../references/code-contract-details.md) only for state/authorization, effects/durable composition, published API compatibility, cross-consumer extraction or framework migration.

For existing code, trace representative public operations, callers, imports/re-exports and relevant integration/failure paths. Distinguish facades from duplicates and composition from boundary bypasses. Show the crossed responsibility or invariant before calling file length, shared storage or fan-out a defect.

For unbuilt software, derive capabilities with concrete inputs/results, guarantees and failure semantics from requirements. Show a representative interaction before proposing folders or infrastructure. Existing code does not override intended behavior; inferred defaults and material open decisions remain visible.

Group related policy and hidden decisions behind meaningful APIs. Preserve useful seams and prefer local modules where sufficient. Do not mandate classes, DI containers, packages or workflow machinery. Explain how the structure serves the requirements, how callers/checks are found and what complexity it adds; untested AI-usability claims remain assumptions.

Check whether boundaries actually hide changeable decisions: do consumers use the public operation or depend on private representation, provider details or another module's state? Separate intentional host coupling from undocumented leaks and drift; use relevant [boundary conformance](../../references/code-contract-details.md#boundary-conformance) guidance.

For multi-capability reviews, include a current relationship diagram and annotated code/module tree. Show comparable proposed views for structural recommendations and a representative flow when ordering/state matters. Follow the relevant [architecture views](../../references/code-contract-details.md#architecture-views) guidance; connect each view to its evidence and finding.

Save a scoped capability/dependency map, evidence-backed gaps and candidate boundaries with small adoption slices in the report location. Link existing contracts before proposing new ones and state inspection limits. Use `code-contract-design` for authorized authoring; discovery does not accept a target or authorize refactoring.
