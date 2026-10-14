# Agnostic architecture skill refinement — 12 October 2026

The owner clarified that reusable skills should start with the principles of sound architecture at system level, then connect them to code organization and contracts. Historical architecture styles should inform judgment without prescribing a language, framework, deployment topology or trial product.

Added [architecture principles](../references/architecture-principles.md), based on original work by Parnas, Robert C. Martin, Alistair Cockburn and Bertrand Meyer, plus Fowler's architecture guide, Bottcher's discussion of architectural context and Microsoft's current N-tier explanation. Source links are attached to the corresponding ideas. The working interpretation and decision limits are our synthesis, not a verbatim reproduction of those styles.

The guidance now reasons at three scales: system qualities and trade-offs; cohesive modules, information hiding and dependencies; and public operation obligations, guarantees, invariants and compatibility. SOLID supplies diagnostic questions. Logical layering and physical deployment tiers are assessed separately. Classes, inheritance, DI containers, services and pass-through layers are not required.

Updated the four skill entrypoints and the discovery prompt. Updated the coding-contract reference, README/changelog and existing package verifier to distribute the new reference. Kept explicit invocation disabled for automatic selection. No setup/delivery workflow was automatically changed.

Library work can derive authority from supplied requirements, public API promises and compatibility commitments without formal product specs or a second product. Pure operations need input/output/failure semantics; resource/state/effect/replay obligations apply where present. Cross-consumer extraction still needs demonstrated agreement between actual contracts. No trial-derived provider or workflow policy becomes a universal rule.

Checked all four skills, their metadata and both shared references for trial product names, local user paths, trial frameworks and providers: none present. Prior product trials and their adoption plan remain evidence of a particular evaluation, outside the reusable package instructions. They do not define defaults for other software.

Fresh checks passed:

- Skill Creator validation for all four entrypoints; scoped formatting and verifier lint.
- Four explicit-only policies, default prompts, icons and ten local skill/reference links.
- Existing release-contract/metadata suite: two files, six tests passed.
- Existing local package verifier: `@calmcraft/cli@0.4.4`, 144 files, 36 skills; new principles resource included. Used the already cached pinned pnpm 11.10.0 with its supported CLI option disabling automatic package-manager bootstrap. No installation, lockfile edit or publication.
- Complete scoped file/diff review and `git diff --check`.

These checks establish source/resource/package consistency. The expanded generic guidance has not received a new independent behavioral forward trial; earlier consumer trials used the prior guidance. No application source, database, provider, deployment or running journey was changed. Changes remain local and unreleased.

## Written-structure clarification

The owner subsequently asked that the skills write down structure and reasoning derived from specs, implementation-language best practices and agent usability. Design authoring now saves a scoped structure/rationale note linked to requirements, the catalog and contracts; discovery/audit assess those links, and migration maintains affected decisions. Use established design locations, with `docs/architecture/design.md` as a fallback; small changes can use an existing note.

The principles now require inspecting actual language/runtime/framework versions and constraints, using applicable authoritative guidance, and distinguishing requirements, conventions and recommendations. Agent discoverability/edit/verification criteria are proposals to evaluate, not a claim of a universal AI-optimal layout. Agentless localization/repair/validation and SWE-agent interface evidence are cited with that limit.

Revalidated all four skills, explicit policies/prompts/icons, ten local reference links, scoped formatting and `git diff --check`. Source remains agnostic. No runtime/package layout changed, so earlier tests/package evidence was retained rather than rerun for these prose/metadata changes. The clarification was sent to the already authorized first-pass review in “Thoughts”; its review-only scope was preserved.

## Contract lifecycle clarification

The requested workflow is now specs → proposed/updated contract specs and desired structure → implementation → conformance review. Removed owner-field requirements and the `Ownership` contract section from the current reusable format. Relevant permitted state/resource access and invariant behavior remain technical guarantees; no person/team register is required. Historical trial artifacts retain their original format/provenance.

`module-contract-design` handles new and changed specs with or without existing code: identify affected contracts/obligations, propose additions/revisions/supersessions, preserve stable IDs, and record desired structure plus implementation impact. Existing code informs feasibility/reuse rather than defining the intended new behavior. Multi-contract design reasoning may use a linked note; a small contract needs no separate architecture document.

Renamed the unreleased local `module-boundary-migrate` skill to `module-contract-implement`. One execution skill now builds missing code, adapts existing code/callers, or combines both. It implements intentional spec/contract changes while preserving unaffected guarantees, and cannot silently weaken the target to make current code fit. Discovery remains an optional baseline review; audit remains report-only and identifies stale spec/contract links or missing implementation. Existing authorization for both design and execution is sufficient to complete both stages within scope.

Fresh validation: all four skill validators, explicit policy/prompt/icon/link and metadata checks, scoped formatting/lint, six existing release-contract/metadata tests, and local package verification (144 files/36 skills). The package check used cached pinned pnpm 11.10.0 and existing tooling without installation/publication. No broad runtime tests or actual missing-code/adaptation trial were conducted; this evidence validates the workflow source and distribution, not behavioral effectiveness of those execution modes. No product code, dependencies, credentials, backend or running journeys were changed.

The execution skill was subsequently shortened and renamed to `contract-implement` at the user's request. Current references, metadata, icons, skill validation and scoped formatting passed; earlier names above remain historical.
