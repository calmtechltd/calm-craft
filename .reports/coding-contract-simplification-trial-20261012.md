# Contract simplification — forward-trial evidence

12 October 2026. An independent evaluator used the simplified `code-contract-design` and `code-contract-audit` skills on two isolated documentation fixtures, without prior review conclusions. The pure fixture changed a previously verified numerical utility requirement; the stateful fixture supplied a local transaction port and unbuilt transfer requirements. Only architecture documents and evidence records were authorized.

Observed: pure contract 365 words, module partial and changed C1 proposed; stateful contract 689 words, all obligations proposed with authorization/atomicity/replay guarantees and explicit schema/host-evidence gaps. The evaluator loaded the short guide, then selected details/principles sections for the stateful case. All nine protected input files were byte-identical. No implementation or runtime test was performed. This is a bounded forward trial, not proof of general agent effectiveness.

Raw output below is retained as historical data. Relative links inside the fences refer to the original temporary fixtures. The temporary workspace was removed after capture.

## pure/docs/architecture/contracts/duration-summary.md

```text
---
id: duration-summary
status: partial
---
# Duration summary

Responsibility: summarize eligible duration samples through the existing public API. Authority: [duration spec](../../../specs/durations.md), revised B1 and unchanged B2. This document updates the requested target; implementation is outside this task.

## API and guarantees

Retain `summarizeDurations(samples: readonly number[]): {count: number; total: number}` at `src/index.ts`.

- C1 (proposed; revised B1): include only finite, nonnegative samples. Count included samples and sum their values. Empty input, and input with no eligible samples, returns `{count:0,total:0}`. Negative values, `NaN`, and both infinities are excluded; zero is included. The old “count all samples” guarantee is superseded under the same ID.
- C2 (implemented; unchanged B2): preserve input, return a fresh result per call, and keep the public operation pure. Source inspection supports this unchanged implementation; the supplied historical test covers only frozen `[1,2]`, so the earlier blanket verified label is not retained for aspects it never checked.

Input is the declared number array; out-of-type inputs are unspecified. B1 places no bound on accumulated total, so finite inputs do not imply a finite sum. No new overflow or rounding policy is introduced.

## Structure

Retain the current public `src/index.ts` module, signature and dependency-free implementation. Eligibility and accumulation belong together in this small operation. Adapt its counting and reduction to filter eligibility; adapt the existing public test in `test/public.test.mjs` for the revised behavior. The supplied fixture has no other callers or re-exports.

## Checks and evidence

Fresh verification required for C1: mixed eligible/ineligible inputs, zero, all excluded, and empty input through the public API. For C2, check frozen input with excluded values and fresh independent results across repeated calls after the implementation changes. Use the existing public test runner, `node --test test/public.test.mjs`, under the declared Node 24 environment when implementation/testing is authorized. No tests or runtime changes were made in this documentation task.

Historical evidence, retained: the original contract records a prior Node 24 public test pass for frozen `[1,2]`, yielding `{count:2,total:3}`. That case remains compatible with revised B1, but cannot verify the new eligibility rule, nonfinite behavior, or result freshness. No typecheck was established. See [evidence](../../../evidence.md) for the static audit and limits. Roll-up is partial because C1 is unimplemented and fresh evidence remains pending.
```

## pure/docs/architecture/index.md

```text
duration-summary | src/index.ts | [contract](contracts/duration-summary.md) | partial
```

## pure/evidence.md

```text
# Duration-summary evidence

Date: 2026-10-12. Task: update architecture contract/catalog from revised supplied requirements, then perform code-contract-audit. Documentation only; no implementation authorization was assumed.

## Supplied inputs and baseline

Read the full fixture `AGENTS.md`, `specs/durations.md`, existing contract and catalog, `src/index.ts`, `package.json`, and `test/public.test.mjs`. Enumerated the fixture files; only one source module and one public test are supplied. `git status --short` reported “not a git repository”; used file inventory and SHA-256 baseline instead. No Git history or branch evidence exists in this fixture.

Before editing, captured SHA-256 digests for every supplied file in both fixtures in tool-session memory. Protected inputs are the fixture instructions, spec, source, package and test. Only the existing architecture documents and this evidence document are permitted outputs.

## Design decisions

Kept `duration-summary`, C1 and C2 stable. Revised C1 under B1 and reset it to proposed; retained the old guarantee and test evidence as history. Preserved the public signature and single-module dependency direction. The implementation needs only eligibility-aware counting/accumulation; the existing public test is its supplied consumer and needs additional cases when implementation is authorized.

C2 remains implemented by static source inspection. The original blanket verified status exceeds its recorded frozen `[1,2]` check, which did not assert freshness or comprehensively establish purity. Preserved that still-applicable historical evidence without presenting it as verification of the revised C1. Catalog/module now partial. No new finite-total or overflow requirement was added.

## Audit against raw supplied inputs

- **Independent intent mismatch / target implementation gap, C1 / B1:** `specs/durations.md:2` requires excluding negative and nonfinite values. `src/index.ts:2` counts the whole input and sums every value, so negative samples change count/total and nonfinite samples contaminate the sum. The supplied public caller `test/public.test.mjs:4` exercises only frozen `[1,2]`. Remedy: adapt the operation and add narrow public cases after implementation authorization. The revised proposed contract is not treated as an independently binding current contract.
- **Missing evidence, C1 / C2:** the old test history is compatible with the ordinary subset of B1 but cannot prove eligibility, all-excluded behavior, or result identity. Fresh verification remains required for changed C1 and for C2 after affected implementation changes. No runtime result is claimed from this pass.
- **Stale documentation addressed by design:** the old contract/catalog claimed verified all-sample counting and old B1 authority. The revised documents link current B1–B2, preserve IDs/history, and disclose pending implementation/evidence. Static comparison found no remaining stale guarantee in their active target.
- **No observed C2 implementation violation:** the supplied source allocates a new object and reads the array without visible IO, global state or mutation. This is static evidence with ordinary declared inputs, not exhaustive runtime proof.

Audit inspected the final proposal and raw spec/source independently; no code or contract corrections were applied during the audit. No other supplied callers, aliases, re-exports or integrations were found in the file inventory.

## Checks and limits

No tests, installations, network calls, external actions, commits or runtime state changes were performed. The proposed Node public test command derives from the supplied `node:test` file and declared Node 24 package; the current execution runtime and full TypeScript environment were not inspected or certified. Architecture links and protected-file hashes are checked in the final document pass below.

## Instruction gaps

No blocking instruction gap for this documentation task. The fixture is not Git-backed, so branch/diff evidence is unavailable. The skills supply status guidance but do not prescribe how to retain an inadequately supported historical verified label; this pass retains the historical check and narrows C2 to implemented instead of claiming unearned verification.

## Resources actually read

- `/Users/gaz/.codex/skills/.system/skill-creator/SKILL.md`: full file, read first; applied scope preservation, progressive disclosure and distinction between narrow checks and behavioral proof. No skill sources were edited.
- `/Users/gaz/dev/calm-craft/skills/code-contract-design/SKILL.md`: full file; target derivation, stable IDs, status/evidence and small-contract instructions.
- `/Users/gaz/dev/calm-craft/skills/code-contract-audit/SKILL.md`: full file; authority separation, tracing supplied callers, evidence limits and findings classification.
- `/Users/gaz/dev/calm-craft/references/coding-contracts.md`: full file; authority/location, shape, statuses and relevant-reference routing.
- `/Users/gaz/dev/calm-craft/references/code-contract-details.md`: heading inventory and only “State and authorization” and “Effects and durable composition” (lines 5–18), applied to the stateful transfer boundary. Other sections were not loaded.
- `/Users/gaz/dev/calm-craft/references/architecture-principles.md`: heading inventory and only “Make decisions concrete” and “Fit the implementation environment” (lines 38–57), applied to transfer coordination and runtime/structure choices. Other sections were not loaded.

No parent reports, previous trials, product repositories or outside directories were read. The two supplied fixtures and permitted skill/reference files were the entire inspection scope.

## Final document pass

Compared SHA-256 against the captured baseline: all nine protected input files across both fixtures are unchanged and none was deleted. Changes are exactly the two existing pure architecture documents and four authorized new documents (stateful contract/catalog and both evidence files). Read the complete changed-document contents; all Markdown local links resolve. No diagnostic files or generated code were introduced. These are document/integrity checks, not runtime verification.
```

## stateful/docs/architecture/contracts/transfer.md

```text
---
id: transfer
status: proposed
---
# Local transfer

Responsibility: coordinate a local ledger transfer and its replay receipt. Authority: [transfer spec](../../../specs/transfer.md), B1–B4. This is a design proposal; implementation and product acceptance of unresolved API choices are pending.

## API and guarantees

Proposed API: bind the existing `Store` once with `createTransfer(store)`, returning `transfer(actorId: string, commandId: string, fromAccountId: string, toAccountId: string, amountCents: number): Promise<TransferResult>`. The factory is an optional wiring choice; the five transfer inputs come from B1. `TransferResult` must distinguish successful receipt delivery from tagged domain failures; the tags and exact result/receipt fields are open decisions, not agreed exported types.

- C1 (proposed; B1): accept positive safe-integer amounts and distinct accounts only; require the actor to own the source and both accounts to share a workspace; reject insufficient source funds. Invalid requests and domain failures produce a tagged result with no ledger/receipt writes. The operation must inspect account authority itself, even if callers previously checked it. Missing-account failure representation is unresolved.
- C2 (proposed; B2): read relevant state, debit source, credit destination, and save the command receipt inside one existing `Store.withTransaction` callback. Success commits all three writes; transaction failure commits none. Source balance must not become negative under concurrent transfers. Depend on the supplied host's serializable execution and rollback guarantee; do not split receipt and balance writes across commits. Read/validate before writing so tagged domain returns cannot accidentally commit partial writes.
- C3 (proposed; B3): look up a command receipt within that same transaction. An exact replay of all five transfer inputs returns its original receipt without new balance or receipt writes. A command ID reused with any differing transfer input returns a tagged rejection without state changes. Keep the original input identity with the saved receipt so comparison is possible; exact stored fields/encoding await the receipt schema decision. How replay interacts with later ownership/account changes is not specified and must be resolved before implementation.
- C4 (proposed; B4): retain the local ledger, existing store, TypeScript and ESM setup. Add no payment provider, network calls or external effect workflow.

## Structure and state

Current `src/store.ts` defines readonly `Account` values, synchronous transaction methods (`readAccount`, `readReceipt`, `writeBalance`, `writeReceipt`) and asynchronous generic `Store.withTransaction<T>`. Receipts are currently `unknown`; the host promises serializability and rollback in a source comment, with no concrete host implementation supplied.

Propose `src/transfer.ts` for the public factory/operation, domain result/receipt types when agreed, private validation and command comparison. It depends on the existing store types; `src/store.ts` does not depend on transfer policy. Bind a store in the consuming host, whose caller path is absent from this fixture. Keep account and receipt writes reachable only through the transaction supplied to this operation. It may read the two selected accounts and the command's receipt and write their balances plus that receipt; it has no authority for other resources. The callback/transaction lifetime remains owned by the store.

One coordinator module keeps the balances and command invariant under one transaction. Separate adapters or workflow layers add no value with the supplied local store. No framework roots, compiler configuration, concrete store implementation or test infrastructure are supplied beyond TypeScript/ESM and Node `^24.0.0`; exact host import resolution and wiring require later verification.

## Open decisions and checks

Agree result tags, receipt/result schema, and how `readReceipt` reports absence before publishing the API. Confirm command-ID scope (the current port looks up only by command ID); replay authorization after ownership changes; handling of corrupt stored receipts; infrastructure failure propagation; and destination overflow/account balance validity policy. B1 does not establish those policies. Existing account IDs and actor inputs are assumed strings for the proposed signature; additional identifier validation is unspecified.

Once implementation is authorized, check invalid/unsafe amounts, same-account requests, ownership/workspace failures, insufficient funds, and successful balance/receipt changes. Exercise exact replay and conflicting reuse, rollback at each write failure, and simultaneous competing transfers through the actual host transaction. Inspect unchanged state on every domain failure. A fake pure transaction cannot establish host serializability/rollback. No test script or concrete store is present, so no executable verification command is invented.

See [evidence](../../../evidence.md) for supplied-source observations and audit limits. All obligations remain proposed; missing code and evidence are implementation gaps rather than current contract violations.
```

## stateful/docs/architecture/index.md

```text
transfer | proposed public src/transfer.ts; existing port src/store.ts | [contract](contracts/transfer.md) | proposed
```

## stateful/evidence.md

```text
# Transfer evidence

Date: 2026-10-12. Task: propose architecture contract/catalog from supplied transfer requirements and store choices, then perform code-contract-audit. Documentation only; implementation is explicitly deferred by B4.

## Supplied inputs and baseline

Read full fixture `AGENTS.md`, `specs/transfer.md`, `src/store.ts` and `package.json`. File inventory contains no existing architecture format, transfer operation, concrete store host, callers, tests, compiler configuration or framework root. `git status --short` reported “not a git repository”; file inventory and SHA-256 baseline replace Git diff inspection. Protected inputs are instructions, spec, store and package; permitted outputs are architecture documents and this evidence document.

## Design decisions

Proposed `transfer` with C1–C4 mapped to B1–B4. Kept the existing store and TypeScript/ESM choices. Suggested optional `createTransfer(store)` wiring and one new `src/transfer.ts` coordinator; distinguished both from existing `src/store.ts`. The coordinator owns authorization, ledger and receipt invariants inside one existing transaction. No new store, provider, workflow framework or dependency was introduced.

Native store signatures are described faithfully: synchronous account/receipt reads and writes; async generic transaction wrapper; receipts `unknown`. The port's serializability/rollback comment is host evidence, not verified implementation. Proposed concrete transfer arguments come from the spec, with string identifiers informed by account/store types. Factory/result/receipt schemas remain proposals, not already accepted APIs.

Kept result tags and receipt schema unresolved. Named absence sentinel, command-ID scope, replay-versus-later-authorization, stored receipt validity, infrastructure failure and numeric account/overflow policy as unspecified decisions. No arbitrary tags, hidden actor-workspace-membership rule, provider reconciliation or new binding numerical limit was invented.

## Audit against raw supplied inputs

- **Target implementation gaps, C1–C4 / B1–B4:** no transfer operation or consumer exists. `src/store.ts:1–11` supplies account/transaction/host interfaces only. Build the coordinator and callers when authorized; absence does not establish a violation of an unaccepted proposed contract.
- **API/design gap, C1 / C3 / B1 / B3:** `specs/transfer.md:2` explicitly leaves result tags unagreed, while `src/store.ts:4,6` uses `unknown` receipts with no absence/schema guarantee. The proposal discloses these gaps and requires the original transfer identity to be representable for replay/conflict checking. Agree the result and receipt boundaries before publishing implementation; the audit cannot certify a type that does not exist.
- **Missing host evidence, C2 / B2:** `src/store.ts:8` promises serializable execution and rollback, but no host implementation or tests are supplied. The design preserves that transaction boundary and calls for host-backed rollback/concurrency checks; a unit fake would not establish the actual host guarantee.
- **Unspecified policy, C3 / B3:** exact replay and account ownership checks can interact after ownership changes; raw intent does not establish ordering for that scenario. The proposal labels the gap without inventing a binding rule. The command-only lookup also leaves command-ID scope undocumented.
- **No stale contract or current contract violation found:** the fixture had no prior contract. C1–C4 and catalog are explicitly proposed; raw B1–B4 are the product authority. Static comparison found no requirement to replace the store, split commits, use an external provider or add framework machinery.

Audit reread raw spec/store beside the completed proposal. No code or contract edits were made during audit. No supplied public callers, aliases, re-exports, integrations or concrete host could be traced beyond the port.

## Checks and limits

No tests, installations, network calls, external actions, commits or runtime state changes were performed. No test runner or host exists in the fixture, so no executable command was invented. Neither TypeScript compatibility nor transaction semantics is verified by Markdown/static inspection. Proposed result/receipt schemas and host behavior require future decisions and evidence. Final document pass checks architecture links and hashes below.

## Instruction gaps

No blocking instruction gap for completing this proposal. Product/API decisions above are unresolved raw-input gaps, not skill failures. Git inspection is unavailable in this isolated fixture; byte-preservation checks provide the permitted alternative. Existing skills do not provide absent host/type/tooling evidence and do not authorize fabricating it.

## Resources actually read

- `/Users/gaz/.codex/skills/.system/skill-creator/SKILL.md`: full file, read first; applied scope preservation, progressive disclosure and distinction between narrow checks and behavioral proof. No skill sources were edited.
- `/Users/gaz/dev/calm-craft/skills/code-contract-design/SKILL.md`: full file; target derivation, stable IDs, status/evidence and small-contract instructions.
- `/Users/gaz/dev/calm-craft/skills/code-contract-audit/SKILL.md`: full file; authority separation, tracing supplied callers, evidence limits and findings classification.
- `/Users/gaz/dev/calm-craft/references/coding-contracts.md`: full file; authority/location, shape, statuses and relevant-reference routing.
- `/Users/gaz/dev/calm-craft/references/code-contract-details.md`: heading inventory and only “State and authorization” and “Effects and durable composition” (lines 5–18), applied to the stateful transfer boundary. Other sections were not loaded.
- `/Users/gaz/dev/calm-craft/references/architecture-principles.md`: heading inventory and only “Make decisions concrete” and “Fit the implementation environment” (lines 38–57), applied to transfer coordination and runtime/structure choices. Other sections were not loaded.

No parent reports, previous trials, product repositories or outside directories were read. The two supplied fixtures and permitted skill/reference files were the entire inspection scope.

## Final document pass

Compared SHA-256 against the captured baseline: all nine protected input files across both fixtures are unchanged and none was deleted. Changes are exactly the two existing pure architecture documents and four authorized new documents (stateful contract/catalog and both evidence files). Read the complete changed-document contents; all Markdown local links resolve. No diagnostic files or generated code were introduced. These are document/integrity checks, not runtime verification.
```

## Source and input fingerprints

```text
8b022461ea2c380de42b5064fa3d224653bebfec125dbaeacd1a9c6355b886f4  skills/code-contract-audit/SKILL.md
756ed77a0766dd96900e17331471e6a0b6e937e831a09d4dcf4593f595a9fc82  skills/code-contract-design/SKILL.md
f152a860578ab4c4be70124cae19fa944ab3f738fcc2ccaf59a7cdb0eec8194d  skills/code-contract-discover/SKILL.md
7c42d7a2e0fd9baf2597d0bbb6afc9d9f1d04c7503db5bdedb4f63b8d1e28054  skills/code-contract-implement/SKILL.md
7d6a148ed11e81f914a1d848e2889226ca3be96dfd604182f012bc130402a149  references/coding-contracts.md
41b0c091c2ad0c2c3711e7232fd1a2f1dc3d9a918d527f54644fa50c8418ad17  references/code-contract-details.md
fa5caef57ee83e1f96d993bea1f8977bc253506ba80b87871e3572b1bda02b34  references/architecture-principles.md
5deb1acf988667a752d1bccbedcfbe9bad1bedd25233f73247d24c0ae2582a6f  fixture/pure/AGENTS.md
a54573ef31e6b87f4ba560b9c20e7818cf28b612ed273d1920c2517220a6b6e6  fixture/pure/package.json
baf6adfd28c4a4371399214009013a16f4a4d00b1d4f566e79e6c2d1345451a6  fixture/pure/specs/durations.md
0da30985388dbb79b492267999638fe1feb0b053bd2ed8776a71db5e03a7439c  fixture/pure/src/index.ts
9469a399db3aade287e7313ccd86cf2c51c23816ea6d3f4d8e1458f68ab385d1  fixture/pure/test/public.test.mjs
5deb1acf988667a752d1bccbedcfbe9bad1bedd25233f73247d24c0ae2582a6f  fixture/stateful/AGENTS.md
a54573ef31e6b87f4ba560b9c20e7818cf28b612ed273d1920c2517220a6b6e6  fixture/stateful/package.json
f173e189bb22c1e33a51bc7bfd71ccaaf695cab9f38f0fe5dae1a9e57132cad2  fixture/stateful/specs/transfer.md
d2790a06465ae3c000e7d17d2c453cee5c91a42b35532f1e26b3bd81db8498a0  fixture/stateful/src/store.ts
```

## Distribution check

```text
Verified @calmcraft/cli@0.4.4: 145 files, 36 skills, 4 browser assets, executable mode 755.
```

Used cached pinned pnpm 11.10.0 with Node 24.19.0 and existing bundles; no installation, dependency changes or publication. The first launcher used an unsupported pnpm option for pack; retrying with the supported `--config.manage-package-manager-versions=false` form passed.
