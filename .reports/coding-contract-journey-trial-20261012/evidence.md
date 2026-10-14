# Independent journey/research forward-trial evidence

Date: 12 October 2026. Subject: initial local unreleased `architecture-discover` and `module-contract-design` skill versions. Trial repository: `/Users/gaz/.codex/worktrees/0f13/calm-astrophage`. Output directory: `/private/tmp/calm-contract-journey-forward`.

## Skill baseline and evaluation principles

Read `/Users/gaz/.codex/skills/.system/skill-creator/SKILL.md` first. Applied its independent forward-test principles: realistic task, minimum raw artifacts, no intended answer or prior conclusions, bounded side effects, isolated drafts and meaningful verification rather than wording assertions.

Explicitly applied the local `/Users/gaz/dev/calm-craft/skills/architecture-discover/SKILL.md`, `/Users/gaz/dev/calm-craft/skills/module-contract-design/SKILL.md` and `/Users/gaz/dev/calm-craft/references/coding-contracts.md`. These were loaded before the parent refined the shared instructions. The baseline reference prescribed proposed/implemented/verified obligations, proposed/partial/verified roll-up, actual versus proposed distinction and human target acceptance distinct from code verification. I did not reread the later version during this trial. No immutable version/hash was captured at initial load, so these observations are tied to the initial read sequence rather than claiming a precise revision hash.

## Inspected artifacts

Working-tree status was read before discovery and at finish. Astrophage already had extensive modified and untracked work, including journey, research, preparation and generated API changes. Calm Craft also already had the new skills and unrelated pending changes. Nothing in either product repository was edited by this evaluator.

Governing inputs read: Astrophage `AGENTS.md`, `.engineering/config.yaml`, `package.json`, `vitest.config.ts`; `specs/platform/agentic-journeys/agentic-journeys.md`, `specs/leads/research/lead-research.md`; the recovery transitions F1.T14/T31/T33/T40–T48/T53 in `lead-research.flow.yaml`; Foundation B7 and invariants in `application-foundation.md`; preparation, lineage, funding and authority rules in `website-to-ready.md`. Spec implementation notes were encountered as part of reading product specs, but their linked reports were not opened or treated as verified trial evidence.

Raw implementation read:

- Shared journey registration and lead-research progress definition, `shared/journey-registration.ts`, `shared/lead-research-journey.ts`, and server `convex/lib/journeyDefinitions.ts`.
- Full research recovery helper implementation in `convex/lib/researchExecution.ts`; public exact detail/control in `convex/research.ts`; registered workflow/action in `convex/researchWorkflow.ts`, `convex/researchActions.ts`; selected context/prepare/poll/retention boundaries in `convex/researchSteps.ts`.
- Research ownership/fence and qualification/evidence implementation in `convex/lib/leadResearch.ts` (ownership/fence fully read; broader function and version/provenance searches); schema in `leadResearchSchema.ts`; effects/lineage resolution in `researchContinuation.ts:1–95`; maintenance recovery in `researchMaintenance.ts:275–320`; full `researchDiagnostics.ts`.
- Preparation fence and recovery, shared provider-connection metadata utility; preparation child-command/linking and selected orchestration stages in `websitePreparation.ts`; child parent-fence usage searched in company/ICP/market code. A few guessed filenames did not exist; they were not treated as missing capabilities.
- Journey ownership/dispatch delegation and cancellation reconciliation in `convex/lib/journeys.ts`; `journeyWorkers.ts`; `programmeWorkers.ts` exact research claim/launch; coordinator research-maintenance call sites; `lib/execution.ts`, `lib/researchWorkflow.ts`, `convex/functions.ts`; provider gateway reservation/claim and failure disposition.
- Research fixture helpers in `shared/convex-research-testing.ts`, `convex-launch-testing.ts`, `convex-preparation-testing.ts`, `convex-testing.ts`; selected test bodies and test-name inventory in `convex/researchExecution.test.ts`. Test helpers use isolated `convex-test` plus registered test component implementations and explicit fixed fixture provider branches.

Some broad command output was truncated; claims in the drafts rely on subsequent bounded reads of relevant functions, not assumptions about omitted bodies. Import/call-site searches covered `convex`, `shared` and `src`, excluding generated output. Generated API references were observed in imports and actual registered calls; generated output itself was not modified.

Did not read `docs/architecture/` or `.reports/` contents, previous trial conclusions, live credentials, mailboxes or provider state. Did not load environment files, call providers, use network, install dependencies, alter application state, commit or push. Architecture/report path names were incidentally visible in Git status; this did not provide their contents or authority.

## Decision evidence

Selected seam: exact assignment-research checkpoint recovery. It has three real caller classes and a consequential no-reacquisition/effect/authorization contract, but can remain a small local capability on the existing host.

`research.ts` owns the user-facing transaction, including exact action/state/revision, first receipt, worker/run changes, revision increment and scheduled command-bound wake. `researchExecution.ts` owns the underlying recovered checkpoint and read predicate; it does not independently impose all user command semantics. `researchMaintenance.ts` and `researchDiagnostics.ts` each constrain its use separately. Generic journey commands explicitly defer research controls to the owning feature. These facts support preserving the seam rather than creating universal journey recovery.

The differing explicit checks in checkpoint recovery and research continuation are a bounded evidence question. Unknown-effect handling is governed by Foundation B7 and lead-research policy. Source inspection did not prove an unsafe reachable combination; the draft does not bless or condemn the difference. Additional adoption evidence must settle it.

Preparation has separate funding, child joins, review and lineage rules. Provider overlap does not justify policy reuse. No second product was inspected, so no package/extraction recommendation is made.

## Checks actually run

1. `git status --short` / final filtered status: preserved extensive pre-existing work. No edits were made in Astrophage. `git diff --check` completed with no emitted errors; it checks existing diff whitespace only, not architecture correctness.
2. Runtime checks: ambient Node was 26.7.0; bundled dependency Node was 24.19.0. Located and used the already installed `/Users/gaz/.local/share/fnm/node-versions/v22.23.1/installation/bin/node` to honor repository Node 22. Pnpm version read was 11.22.0. Nothing was installed or switched globally.
3. First narrow Vitest invocation: failed before tests, exit 1, EPERM opening `node_modules/.vite-temp/vitest.config.ts.timestamp-1791798918428-4a35e8ba75e5f.mjs`. This checkout is outside writable roots; no permission escalation was attempted.
4. Read local Vitest `--help`: documented `--configLoader runner` and `--cache`. Retried same six-test selection with that loader and disabled cache. Exit 0. [Raw JSON](research-tests.json) reports success, six passed, zero failed and 24 pending/skipped cases, one file. No broad tests were run.

Successful command, executed in the Astrophage checkout:

```sh
env -u FIRECRAWL_API_KEY -u OPENROUTER_API_KEY -u TREG_API_KEY \
  NODE_OPTIONS='--require=/private/tmp/calm-contract-journey-forward/no-network.cjs' \
  /Users/gaz/.local/share/fnm/node-versions/v22.23.1/installation/bin/node \
  node_modules/vitest/vitest.mjs run --config vitest.config.ts \
  --configLoader runner --cache=false convex/researchExecution.test.ts \
  -t 'retained malformed qualification|completed qualification retained during pause|exact pause survives governing resume|original paid crawl is retained after stop|public exact checkpoint controls|unavailable evaluator and uncertain paid start' \
  --reporter=json \
  --outputFile=/private/tmp/calm-contract-journey-forward/research-tests.json
```

The temporary guard replaces global fetch with a failing function, and provider credential variables are absent from the test subprocess. The selected tests invoke fixed fixture branches and create isolated synthetic data. The guard is supporting reproduction evidence, not an application change. Tests exercise provider-effect accounting in fixtures, not external providers.

## Trial outcome and limits

Deliverables: [current capability map and adoption slices](index.md), [proposed capability contract](contracts/assignment-research-recovery.md), this evidence record and test JSON. No catalog was published into the product. Existing architecture must be consulted before actual adoption, so global duplication/decomposition correctness remains unproven.

The baseline skills led to useful decisions: actual callers and atomic coordinator ownership stayed visible; no arbitrary context-bag API, workflow replacement or package prerequisite was introduced; domain policy was linked to source authority; a suspicious difference remained an evidence question. The reference's status vocabulary did not explicitly give an accepted-unverified document status, so the draft keeps C1–C5 proposed while separately recording passing verification and still-pending target acceptance. That is an evaluation observation, not a requested product change.

Not proven: all C obligations; original failed second-acquisition polling coverage; reachable missing/foreign/receipt-uncertain accounting combinations; rollback/atomicity under injected failures; every future-authority/version case; maintenance full throughput; live/background/deployed behavior; browser/UI safety; acceptance by existing architecture. The six passing tests are bounded evidence, not a full contract verification.
