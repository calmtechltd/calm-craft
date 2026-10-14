---
name: code-contract-design
description: Propose or update contract specs and desired structure from requirements and existing code/framework choices. Run only when explicitly invoked or requested by name. Author documents without changing implementation.
---

# Code Contract Design

Read repository instructions, working-tree state, selected specs/API requirements and existing contracts/decisions. Preserve unrelated changes. Use the [short contract guide](../../references/coding-contracts.md) and the repository's established document format.

## Derive the target

Read requirements before interpreting code. Identify changed behavior, affected obligations and consumers; add, revise, supersede or retain contracts without renumbering established IDs. Existing code informs reuse and implementation impact, not new intent. With no code, derive concrete operations from requirements and the chosen language/framework. Search adjacent governing intent before declaring an open decision.

When an obligation changes, retire its old verified status, retain prior evidence as history and require fresh verification for the revised guarantee and affected callers. Keep unchanged evidence only where still applicable; update the roll-up accordingly.

## Write a small contract

Record responsibility/authority, concrete API guarantees, desired paths/dependencies and relevant checks. Put brief rationale beside the structural choice. Distinguish current and proposed paths, code/callers to adapt and missing code to build. Link canonical intent and evidence; omit irrelevant sections and repeated status/scope explanations. Keep the catalog a lookup. No separate design note is needed for a small boundary.

Define the boundary as well as its API: allowed dependencies, relevant permitted state/effects, private representation and excluded responsibilities. Record consequential limits as obligations with suitable structural/review/runtime evidence. Declare intentional coupling and legacy exceptions; use the relevant [boundary conformance](../../references/code-contract-details.md#boundary-conformance) guidance for consequential interfaces.

For designs spanning several modules, show proposed relationships and a code tree with public entry points. When changing existing structure, pair these with comparable current views. Use the relevant [architecture views](../../references/code-contract-details.md#architecture-views) guidance; keep simple contracts small.

Inspect the actual runtime, module conventions and framework constraints that affect the change. Load only relevant sections of [contract details](../../references/code-contract-details.md) for state/authorization, effects/durable composition, published API compatibility, cross-consumer extraction or framework migration. Use [architecture principles](../../references/architecture-principles.md) only for consequential boundary/style choices or agent-usability claims; read the relevant sections, not every reference by default.

Deliver the documents, implementation impact and material open gaps. Use `code-contract-implement` for authorized build/adapt work and `code-contract-audit` for review. If both design and implementation are already authorized, continue within scope without routine reconfirmation.
