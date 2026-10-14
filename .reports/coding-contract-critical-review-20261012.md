# Coding-contract skills — critical review

12 October 2026. Review of the current unreleased work in `/Users/gaz/dev/calm-craft`, HEAD `81688d3bc603643c9ff795870e1614a0104acaf7`. This review reports recommendations; it does not apply them. The four skills were subsequently renamed with the `code-contract-` prefix; source links below resolve to the renamed files. Captured trial names and fingerprints remain historical. The findings below describe the reviewed source before the subsequently authorized simplification.

## Verdict

Keep the core workflow: specs/API requirements → contract specs and desired structure → build/adapt code → audit. Optional discovery is a useful separate capability. The division into four skills is defensible; splitting implementation into further modes or skills would add little.

The strongest demonstrated weakness is documentation overhead. The skills produced coherent, small implementations, but their default contract output was much larger than the changes it governed. Simplify the shared guidance and default document before expanding the layer.

**Confirmed findings: zero Critical, zero Major, two Minor maintainability findings.** No fundamental workflow failure was observed in the two isolated trials. Broader applicability remains an evidence limit rather than a verified defect.

## Findings

### 1. Minor — the default document is disproportionate for small boundaries

Location: [contract shape](../references/coding-contracts.md#contract-shape), especially lines 40–80; [design instructions](../skills/code-contract-design/SKILL.md), lines 10 and 24–38. Confidence: high.

The design skill directs the agent to use the shared format. That format has ten sections, plus a catalog, obligation statuses and evidence links. The source also says to scale documentation and permits a small contract without a separate design note. Those mitigations avoided extra architecture files, but did not produce compact contracts in the trials.

The new library's 42-line module received a 650-word contract and 129-word catalog. The documentation-only update for a single normalization function received a 970-word contract and 134-word catalog, before implementation. These counts exclude evaluation evidence files. The outputs repeat runtime limitations, scope, status and current-versus-target explanations in several places.

The avoidable cost is maintaining repeated facts during ordinary changes. A contract can become another substantial document to reconcile, although the user primarily needs to locate the API, understand guarantees and know the desired structure.

Suggested direction: give the reference one complete compact example with responsibility/requirement links, operations and guarantees, desired paths/dependencies, and checks. Expand state, recovery, compatibility or migration detail only when consequential. Keep the catalog as a lookup and link to canonical evidence. Preserve stable obligation IDs where they support actual traceability; do not add more mandatory forms or metadata.

### 2. Minor — small tasks load substantial irrelevant guidance

Location: [design entrypoint](../skills/code-contract-design/SKILL.md), lines 10–12; [implementation entrypoint](../skills/code-contract-implement/SKILL.md), lines 8 and 20; [composition and effects](../references/code-contract-details.md#effects-and-durable-composition). Confidence: high for loading overhead; no observed implementation harm.

The design entrypoint requests both complete shared references. Together they contain 2,994 words; its own entrypoint adds 744. The references cover conceptual architecture as well as artifact provenance, durable execution, uncertain effects and product-workflow routing. A pure one-function update therefore loads substantial material it cannot use.

The new-library evaluator explicitly reported irrelevant recovery, tenancy, generation and deployment material. The adaptation evaluator read two supporting test skills for a one-function/one-test change. Neither evaluator added unnecessary code, but both observations show instruction overhead. Much of this information is valuable in the appropriate task; mandatory loading is the issue.

Suggested direction: keep essential authority, API/structure and evidence rules in a short shared core; route to the existing detailed sections only when state, external effects, durable execution, extraction or significant architecture choices are present. Avoid turning this into a larger router or collection of new skills.

## Hardening recommendation, not an observed failure

The revision instructions preserve IDs/history and require evidence, but do not explicitly say that changing an obligation invalidates evidence for its previous meaning. Add one sentence to the revision workflow: retain old evidence as history, remove verified status for the changed guarantee, and reverify the affected behavior and callers.

The changed-spec trial already handled this correctly without that sentence. It preserved C1/C2, downgraded changed C1, kept the roll-up partial, and showed that the old passing test did not prove new B1. Implementation later renewed both obligations on the target Node runtime. This is a modest clarification, not justification for a new revision system or a finding of stale verification.

## Behavioral evidence

See [captured trial artifacts and evaluator records](coding-contract-critical-trial-evidence-20261012.md).

| Trial                                    | Actual outcome                                                                                                                                                                                                                                                                       | Limits                                                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No implementation exists                 | Derived a cohesive span API and implemented three operations in one module. Three existing tests passed on Node 24.19.0; evaluator also reported 57 focused assertions passing. Parent independently reran the three-test public suite successfully.                                 | Native TypeScript execution, not typechecking; ad hoc edge assertions are not maintained tests.                                                                          |
| Spec changes beneath a verified contract | Design-only phase exposed obsolete behavior without editing source/tests. Then implementation adapted the existing function/test and renewed evidence. Revised test failed against old code and passed after adaptation on Node 24.19.0. Parent independently reran it successfully. | Small pure function; sole visible consumer was its public test. Initial design checks used Node 26 and were explicitly limited; implementation resolved the Node 24 gap. |

Both trials preserved the public entry points, avoided adapters/classes/workflow infrastructure, kept requirements separate from implementation evidence, and completed authorized work without routine reconfirmation. The fixtures were supplied with governing specs and existing public tests. This tests decision-making within that setup, not usefulness compared with an agent using no skills.

Earlier product discovery/design/audit trials provided useful boundary and authority observations. They did not implement the proposed product boundary. The new tests establish missing-code and adaptation behavior for small TypeScript modules; they do not establish generated-framework migration, retained-run/effect safety, transactional adoption, another implementation language, or improved AI maintenance performance. Those claims need representative trials if pursued. Automatic enforcement and CLI/visualizer support remain deliberately absent; that is stated correctly in the source.

## What should remain

Specs/API requirements govern behavior; existing code informs feasibility and reuse. Contracts record public semantics and desired structure. A single implementation skill covers absent and existing code. Discovery is optional. Audit separates accepted obligations from proposed target gaps and product-intent mismatches. Reusable source contains neither trial-product names nor human/team owner fields, and it does not force a class, DI container, shared package or deployment style.

I checked the cited primary architecture material, including [Fowler](https://martinfowler.com/architecture/), [Parnas](https://www.cs.lafayette.edu/~gexia/cs301/resources/parnas.html), [Martin](https://objectmentor.com/resources/articles/Principles_and_Patterns.pdf), [Cockburn](https://alistair.cockburn.us/hexagonal-architecture), [Meyer](https://archive.eiffel.com/doc/manuals/technology/bmarticles/sd/contracts.html) and [Microsoft's layers/tier distinction](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier). The reference labels its working interpretations as adaptations. The agent-usability claims are appropriately limited: [Agentless](https://arxiv.org/abs/2407.01489) and [SWE-agent](https://swe-agent.com/latest/background/aci/) do not prove a universally superior repository layout. No broken citation or material attribution problem was established.

## Scope and preservation

Read the four current skill entrypoints and metadata, both references, README/changelog/package-verifier diff, adjacent delivery/review guidance, prior trial records and the product-trial adoption plan. Reviewed the referenced “Thoughts” context without sending another message or changing its work. The adoption plan is clearly product-specific trial material outside the distributed reusable skill resources.

All tracked and untracked contract-layer changes predated this review and were preserved. This review added only this report and its captured evidence record. It did not edit reusable skills, change product code, install dependencies, run broad repository gates, commit, push, publish, deploy, query mailboxes or mutate external state. Earlier packaging/metadata checks remain prior evidence; this review does not claim a fresh release-package verification after the final skill rename. Temporary fixtures were removed after evidence capture.

## Applied simplifications — 12 October 2026

The user subsequently authorized the review's simplifications. The four `code-contract-*` skills now default to the short guide and route conditionally to one optional detail reference. Default contracts cover responsibility/authority, API guarantees, desired structure and checks; irrelevant sections and repeated scope/status material are omitted. Changed obligations lose old verified status and require fresh evidence; prior results remain history, and unchanged evidence is reused only where applicable.

The short guide decreased from 1,814 to 598 words, and the design entrypoint from 744 to 302; routine design no longer requires the 1,180-word principles reference. Stateful/effectful and migration guarantees remain in the optional detail. The principles resource, explicit-only metadata and historical trial evidence were preserved.

[Independent forward trial](coding-contract-simplification-trial-20261012.md): a pure utility update produced a 365-word contract, reset revised C1 and exposed the implementation/evidence gap. A stateful proposal preserved authorization, single-transaction balance/receipt writes and replay/conflict guarantees without inventing missing result/receipt schemas. Detailed resources were read selectively for that boundary. All nine input files remained unchanged. These are documentation/static audit outcomes; no new implementation or runtime verification is claimed.

Fresh checks passed: four Skill Creator validators, metadata/icons and local reference/section links, scoped formatter, package-verifier lint, full scoped diff review and whitespace checks. Package verification with cached pinned pnpm 11.10.0 and Node 24.19.0 passed: 145 files, 36 skills, including the optional reference. No installed-plugin update, version bump, commit, push, dependency change, publication or product/external-state mutation occurred. Temporary trial and launcher files were removed after evidence capture.
