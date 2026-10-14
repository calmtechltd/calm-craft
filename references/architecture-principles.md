# Architecture principles

Use these decision criteria for libraries, applications, tools and services. They are a synthesis of the sources below, adapted beyond their original languages and deployment models. Start from the software's purpose, consumers and constraints. A named architecture style is an option whose benefits and costs must be established in context.

## Reason at three scales

| Scale               | Questions                                                                                                                                                                                   | Useful output                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| System design       | Which qualities matter: correctness, change cost, latency, resource use, reliability, security, compatibility or independent delivery? What constraints and failure modes shape the design? | Prioritized drivers, capability/responsibility map and decisions with trade-offs |
| Code organization   | Which decisions should be hidden together? Which module maintains each invariant? Which dependencies and public entry points are permitted?                                                 | Cohesive modules, dependency direction and discoverable responsibility           |
| Operation contracts | What must a caller provide? What is guaranteed? What remains invariant on success or failure? How is compatibility established?                                                             | Inputs/results, behavioral obligations and proportionate verification            |

These scales inform one another. A small utility may explain all three in one short contract. A larger system may need linked design decisions and several contracts. Fowler describes architecture as the important internal design decisions that support continued evolution; keep the reasoning connected to actual code and change costs. [Software Architecture Guide](https://martinfowler.com/architecture/).

## Ideas to retain and adapt

| Source idea                     | Working interpretation                                                                                                                                                     | Decision limit                                                                                                                                                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Information hiding              | Put responsibility for a changeable design decision behind a stable boundary. Keep representation and related operations together.                                         | Processing steps or folders alone do not establish a module boundary. [Parnas, On the Criteria To Be Used in Decomposing Systems into Modules](https://www.cs.lafayette.edu/~gexia/cs301/resources/parnas.html).                                                                                   |
| Cohesion and reasons for change | Group responsibilities with related policy and change pressure; expose independently meaningful operations.                                                                | A responsibility can contain several functions. Splitting every function can increase coupling. [Robert C. Martin, Single Responsibility Principle](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html).                                                           |
| Ports and adapters              | Separate meaningful policy/computation from external interactions when that enables testing, substitution or controlled change. A port describes a purposeful interaction. | A function parameter or small module API may be sufficient; a universal adapter layer is not required. [Cockburn, Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture).                                                                                                    |
| Layering and tiers              | Logical layers organize responsibility/dependencies; physical tiers organize deployment and isolation. Choose each separately.                                             | An extra hop can add latency and operational cost. A pass-through layer needs a concrete benefit. [Microsoft, N-tier Architecture](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier).                                                                         |
| Design by Contract              | State caller obligations, result guarantees and maintained invariants. Types/signatures alone do not express behavioral meaning.                                           | Use the language's types, validation, assertions and meaningful tests where appropriate. Keep validation at untrusted boundaries even when callers have documented obligations. [Meyer, Contracts for Components](https://archive.eiffel.com/doc/manuals/technology/bmarticles/sd/contracts.html). |
| Context and evolution           | Match sharing, compatibility and coordination to consumer independence and the cost of synchronized changes.                                                               | Shared code can reduce duplication while increasing coordination. Versioned public libraries need different compatibility care from private modules changed together. [Bottcher, The Strong and Weak Forces of Architecture](https://martinfowler.com/articles/strong-weak-arch.html).             |

## Use SOLID as diagnostic questions

Translate the useful concerns into the code's programming model:

- **Single responsibility:** do unrelated change requests force changes to the same boundary?
- **Open/closed:** can a demonstrated variation be introduced without disturbing unrelated consumers? Add extension seams for real needs; ordinary source changes remain valid.
- **Substitution:** can an implementation satisfy the same supported contract, including failure and effect behavior? Matching types alone is insufficient.
- **Interface segregation:** can callers depend on the operations and data they actually need?
- **Dependency inversion:** does stable policy depend on a volatile implementation detail that warrants a narrower contract? Stable direct dependencies need no ceremonial wrapper.

These are adaptations of Martin's dependency and class-design principles. They do not mandate inheritance, classes, an interface per implementation or a DI container. [Design Principles and Design Patterns](https://objectmentor.com/resources/articles/Principles_and_Patterns.pdf).

## Abstraction boundaries and drift

These terms help diagnose a boundary; they are not requirements to hide all runtime facts or force a particular architecture.

- **Information hiding:** hide a changeable representation or policy decision behind useful operations; consumers should not need its internals. [Parnas](https://www.cs.lafayette.edu/~gexia/cs301/resources/parnas.html).
- **Encapsulation:** keep representation and its changes behind the module's access controls and operations. Private fields alone do not help if public results expose mutable backing state.
- **Leaky abstraction:** a consumer must account for details the abstraction purports to hide. Some limits, such as latency or partial failure, cannot disappear; express them truthfully in the contract rather than promising impossible isolation. [Spolsky](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/).
- **Least knowledge:** depend on the useful interface, not chains of another component's collaborators. Adapt the Law of Demeter to the language; ordinary access to a declared data record is not automatically a violation. [Lieberherr and the Demeter team](https://www.ccs.neu.edu/home/lieber/LoD.html).
- **Dependency direction:** separate runtime calls from source dependencies; a portable policy boundary should not accidentally acquire provider/database representation dependencies. Apply the chosen contract, not mandatory concentric layers. [Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html).
- **Architectural drift and conformance:** compare implementation with the recorded boundaries as code evolves. Fitness functions are feedback checks for selected architectural qualities; use existing enforcement where sufficient, without arbitrary scores or a new tooling platform. [Thoughtworks](https://www.thoughtworks.com/en-us/insights/articles/fitness-function-driven-development).

For an agent, knowing these terms is insufficient. Establish the selected operations and exclusions before editing, detect drift during the work, and check boundary conformance before completion. Details and evidence belong with the relevant contract; do not copy this terminology into every utility document.

## Make decisions concrete

For a consequential boundary or style choice, explain:

- The requirement or observed problem and the qualities being prioritized.
- The responsibility, hidden decision, consumers and maintained invariants.
- The simplest viable arrangement, its costs, and a materially different alternative when the choice warrants comparison.
- A representative successful interaction and failure path; identify dependency direction separately from runtime call order.
- The check or observation that would support the decision, its limits, and the conditions that would justify revisiting it.

Choose functions, modules, capability groupings, layers, ports, events or services according to those decisions. Balance isolation with latency, consistency, resource use and delivery/operational complexity. Record bounded exceptions rather than forcing architectural purity. A diagram or principle name does not prove fitness.

Apply concerns where they exist. A pure library operation needs semantic input/output and failure guarantees; a stateful component adds invariants and resource lifetimes; an externally effectful operation adds authority, commit, concurrency and recovery semantics. Distributed execution adds delivery and partial-failure concerns. Do not invent workflows, persistence, tenancy or deployment tiers for software that has none.

## Fit the implementation environment

Inspect the actual languages, versions, runtime, framework roots, module/package system, compiler configuration, generation workflow and test tools before proposing a file structure. Use recorded repository conventions and current authoritative language/framework documentation applicable to those versions. Distinguish platform requirements, repository choices and optional recommendations; resolve conflicts with evidence rather than calling every preference a best practice.

Express boundaries using the language's idioms. Imports/exports, visibility, packages, memory/resource lifetimes and build boundaries may enforce different parts of a contract. Preserve supported public entry points and framework-required paths. For example, TypeScript module behavior depends on its host and compiler settings; a preferred directory layout does not establish runtime compatibility. [TypeScript Modules Theory](https://www.typescriptlang.org/docs/handbook/modules/theory.html). Do not impose one language's classes, visibility model or package layout on another.

## Make structure usable by coding agents

Design for reliable discovery and scoped edits: meaningful names, a concise catalog linking requirements to modules/public operations, visible dependency rules, local verification commands and clear failure diagnostics. An agent should be able to locate the relevant module, identify affected callers and tests, and understand what can change without reading the entire repository. Keep instructions and examples near the relevant boundary and link canonical authority instead of duplicating it.

Treat these as design criteria to evaluate, not a proven universal AI-optimized folder scheme. Agentless separates localization, repair and validation; SWE-agent's experiments show that tool/interface design affects its results. These support attention to discovery and feedback, but do not establish a preferred repository architecture for all agents. [Agentless](https://arxiv.org/abs/2407.01489), [SWE-agent ACI](https://swe-agent.com/latest/background/aci/).

Evaluate consequential agent-usability claims with representative maintenance tasks: can the agent find the right module, preserve the contract, account for callers and run the relevant checks with a contained diff? Record model/tools, available context, outcomes and limits when comparing designs. Avoid arbitrary file-size limits, fragmented one-function modules, redundant documentation or runtime complexity justified only as easier for AI.

Keep reusable instructions independent of trial products, repository paths, frameworks and providers. Product-specific findings and adoption plans belong in their own evidence records. A trial tests the principles; its implementation details do not become universal requirements.
