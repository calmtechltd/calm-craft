# Engineering configuration contract plan

Status: complete locally, 1 October 2026. A1–C1 and close-out complete. Next up: **none within this plan**. Publication and installed-plugin rollout remain separate.

Make `.engineering/config.yaml` a dependable repository contract for Calm Craft's agent workflows and shared CLI settings. Preserve existing configurations, keep CI requirements explicit, and let repositories describe more than one test runner.

This document records the second review and the proposed local implementation sequence. The subsequent run-implementation-plan-all request authorized all local implementation chunks and their close-out checks. Publication, installed-plugin updates, and execution of project commands are separate operations. Source reviewed at `264bca2`, including the existing working changes.

## Second review

| Finding | Revised assessment | Evidence | Planned fix |
| --- | --- | --- | --- |
| F1 — Shared settings disagree | Confirmed integration gap. YAML `paths.specs` is invisible to the CLI. `default_branch` and `defaultBase` overlap but have different meanings; they must not be treated as interchangeable. | `skills/engineering-setup/SKILL.md`; `src/config/index.ts`; `src/cli/command.ts`; `src/static/build.ts`; `skills/spec-visualize/SKILL.md` | A1, B1 |
| F2 — Gate semantics are incomplete | Confirmed design gap, rather than a prohibition on extra checks. Arbitrary command names can fit the current maps, but lookup, prerequisites, and environment-specific evidence are undefined. | `skills/engineering-setup/SKILL.md`; `skills/ready-for-pr/SKILL.md`; `.github/workflows/quality.yml` | A1, B2 |
| F3 — No independently validated contract | Confirmed design gap. The example YAML is the only shape authority; no engineering-config parser, schema, or supported validation command exists. The JSON loader's version checks do not validate this YAML. | `skills/engineering-setup/SKILL.md`; `src/config/index.ts`; repository searches across `src`, `scripts`, `references`, and `assets` | A1, A2 |
| F4 — Test metadata assumes one runner | Confirmed design gap. One layout and one `test_file` template do not describe mixed Vitest and Playwright suites. Current agents can inspect the repository, but configuration cannot express that choice consistently. | `skills/engineering-setup/SKILL.md`; `skills/write-tests/SKILL.md`; `package.json`; `vitest.config.ts`; `test/e2e` | A1, B3 |

The F1 reproduction used a temporary directory containing only `version: 1`, `paths.specs: product/specs/`, and `vcs.default_branch: develop` in `.engineering/config.yaml`. Calling the current `loadConfig` returned `{ specVersion: 1, specsRoot: "specs" }`. It did not read the YAML. The temporary directory was removed. This proves the spec-root gap; it does not prove that a default branch should always override an intentional review base.

No CI requirements were changed or executed during review. A direct Node 24 invocation established the loader result. An initial `pnpm exec tsx` invocation stalled and was stopped; it is not passing verification evidence.

Additional integration evidence: `scripts/verify-release-package.mjs` explicitly lists permitted reference and asset files. New contract files need precise allowlist entries; broadening the rule to accept every package file would weaken the existing distribution check.

The earlier `.plans/skills-consistency-and-verification.md` already covers proportional setup checks and command execution boundaries. Preserve that work. This plan adds a configuration contract, rather than repeating the earlier skill cleanup.

## Recommended design

These are concrete planning defaults, not claims that the behavior already exists. A1 records them in the governing contract before runtime changes. A material deviation must be recorded in this plan and the contract.

| Topic | Recommended default |
| --- | --- |
| Configuration ownership | `.engineering/config.yaml` owns shared spec-root and repository workflow settings. The CLI reads declarative settings only. It never executes a configured command while opening, generating, or validating an estate. |
| Existing JSON | Keep `calmcraft.json` as a supported compatibility source. It can supply a field omitted from YAML. Matching normalized values are accepted; conflicting explicit values fail with file/key repair guidance. Do not silently overwrite or delete either file. |
| Branch and base | Keep `vcs.default_branch` as a branch name. Add `vcs.review_base` for an explicit Git comparison ref. `--base` has highest precedence. With no explicit configured review base, `origin/<default_branch>` becomes the first configured candidate, followed by the existing Git fallbacks. Preserve the existing behavior when a configured candidate does not resolve. |
| Versions | New setup output uses `version: 2`. Keep the documented version 1 shape readable and normalize it without writing changes. The engineering-config version and content `spec_version` are independent; the latter corresponds to legacy JSON `specVersion` and defaults to 1. |
| Runtime validation boundary | `config validate` checks the whole engineering contract. Estate commands check YAML syntax/version and the declarative fields they consume; a malformed unrelated gate definition must not prevent viewing healthy specs. They still reject unsafe paths and invalid consumed values. |
| Commands | One named `commands` registry in v2. A string remains a shell-command shorthand. A structured definition can specify `argv` or `shell`, exclusively, plus a root-relative `cwd`. Prefer `argv` for new targeted-test templates. Configuration is not permission to execute commands. |
| Gates | Retain an ordered gate list. Each entry refers to a registered command; an optional object records a stable gate ID, environment context, and ordered prerequisite command references. A plain string covers a simple check. Commands outside the gates are optional unless repository policy separately requires them. |
| CI environments | Context distinguishes relevant runtime/OS versions and environment profiles. Evidence from Node 24 does not establish a Node 22 pass. Record unresolved requirements as unverified. Context is metadata for agent execution and reporting, not a new CI orchestrator. |
| Test suites | `tests.suites` names suites with file patterns, optional layout/framework metadata, a full-run command reference, and a targeted command reference. Mixed layouts and runners are supported. Match suites relative to the repository root; multiple matches need explicit selection rather than first-match guessing. |
| Service and secrets ownership | `.engineering/dev.yaml` keeps service declarations and `envSync`. This work neither duplicates those mappings nor runs a secret-sync operation. |
| Package manager | Preserve the detected manager. Record any pin from the existing manifest rather than introducing another independently maintained pin. No manager conversion or unrelated dependency upgrades. |

Resolve shared values per field, not by selecting one whole file. A partial engineering config must not erase an intentional JSON review base. Compare only explicit representations of the same setting: `paths.specs` versus `specsRoot`, `spec_version` versus `specVersion`, and `vcs.review_base` versus `defaultBase`. Normalize equivalent root paths such as `specs/` and `specs`. A different `default_branch` does not itself constitute a conflict with an explicit review base. Once the source settings are valid and consistent, an explicit `--base` selects that invocation's base. A CLI override does not suppress invalid configuration or a conflict between files.

All configured paths and `cwd` values are repository-root-relative. Document which paths may be absent, prohibit traversal/absolute paths where containment is required, and retain existing containment checks at filesystem access. Reject duplicate YAML keys and unsupported engineering versions with location-aware diagnostics. Do not print configuration values that could contain secrets.

Version 1 normalization preserves existing string commands, `gates`, optional `non_gating`, and the single-runner `tests`/`test_file` shorthand. Detect conflicting duplicate names between legacy command maps. Permit legacy repository extensions without silently claiming they are validated; report them as warnings. Version 2 rejects unknown contract fields while allowing arbitrary command and suite names. Migration is an explicit setup/edit task, never a side effect of loading or validation.

## Coverage and sequence

| Phase | Chunk | Observable outcome | Depends on |
| --- | --- | --- | --- |
| A — Define and validate | A1 | A complete contract and compatibility matrix exist | — |
| | A2 | A developer can validate config without running project commands | A1 |
| B — Align the consumers | B1 | Agent skills, live view, and generated output use the same shared settings | A2 |
| | B2 | Readiness can identify every recorded gate and its evidence requirements | A2 |
| | B3 | An agent can select the correct targeted command for each test suite | A2, B2 |
| C — Complete integration | C1 | Setup emits valid configs and the package includes all contract resources | B1, B2, B3 |

Default execution order: **A1 → A2 → B1 → B2 → B3 → C1**. Dependencies mean implemented and appropriately verified in the working state; no merge or commit is required between chunks. One coordinator owns verification and shared-file edits, and reuses valid evidence.

## A1 — Define the versioned contract

Completed 1 October 2026: reference, draft-07 schema, minimal/CI examples, and future behavior spec added. Both examples passed Ajv validation; the 3 existing spec-contract checks passed.

**Depends on:** none.

**Contract:** F1–F4 and the recommended design above; `references/spec-format.md`; existing `specs/calmcraft/cli-distribution.md` B5, `specs/calmcraft/spec-model.md` B11, and `specs/calmcraft/repository-sources.md` B5 retain their current implemented behavior until corresponding changes land.

**Work:**

- Create `references/engineering-config.md` as the field/default/compatibility authority and a packaged, hand-maintained machine-readable schema under `assets/engineering/`. Define structural constraints there; cross-reference and compatibility rules belong to the shared validator introduced in A2.
- Define the exact string/object forms, required fields, absent-versus-empty semantics, root-relative paths, unknown-field behavior, and v1-to-v2 normalization. Give valid minimal, single-runner, and mixed-runner examples without placeholder command values.
- Add `specs/calmcraft/engineering-config.md` (`id: calmcraft-engineering-config`, area `CalmCraft`) for the distinct engineering contract. Candidate behaviors: B1 read-only validation; B2 consistent shared settings; B3 command definitions; B4 gate evidence; B5 suite selection; B6 setup/compatibility; B7 packaged resources. New unimplemented requirements begin as future. Existing adjacent specs link to this contract rather than duplicating the field definitions.
- Record the engineering and content version distinction, JSON compatibility decision table, diagnostic boundaries, and config-read-only invariant. Update `specs/README.md` and the existing estate contract inventory when the new spec is added.

**Done when:** A reader can determine every supported field and default without inferring it from the setup example. The compatibility matrix covers neither file, YAML only, JSON only, partial YAML plus JSON, matching values, conflicting values, invalid consumed fields, unrelated invalid delivery metadata, and unsupported versions. The gate and suite shapes can describe the current Quality workflow without pretending a local check covers its whole matrix.

**Verification:** Parse/schema-check examples with the selected existing or minimal schema tooling; inspect references, spec roll-up state, and the complete scoped diff. Run `scripts/spec-contract.test.ts` only if its inventory changes. No new phrase/heading assertions and no project command execution to validate example names.

**Out of scope:** Implementing the loader, running setup in another repository, writing a migration tool, replacing `.engineering/dev.yaml`, or changing CI policy.

## A2 — Add shared parsing and read-only validation

Completed 1 October 2026: schema-backed parsing, normalization, diagnostics, safe file reads, and `config validate` added. Config/validation tests passed 22/22, including no execution/no checkout changes and symlink boundaries.

**Depends on:** A1.

**Contract:** new engineering-config B1, B3–B6; A1's format and schema.

**Work:**

- Add a shared engineering-config module under `src/config/` that parses YAML with the existing `yaml` dependency, validates/normalizes v1 and v2, and exposes a declarative projection for estate consumers.
- Make the packaged schema and runtime structural validation share one source of constraints. Select a small schema validator if the existing dependencies cannot enforce the schema; use pinned pnpm and inspect license/package implications. Avoid a second independently maintained structural rule set. Semantic checks cover unknown references, duplicate IDs, incompatible definitions, and suite/template consistency.
- Add `calmcraft config validate [path]`, defaulting to the current repository's `.engineering/config.yaml`. A missing explicitly validated file is an error; an absent optional config for ordinary estate commands remains valid. Return a clear pass/warning/error result and a nonzero exit for invalid config.
- Read config and referenced definitions only; do not spawn command executables, install packages, resolve secret providers, open a browser, or modify repository files. Bound file reads, reject escaping config symlinks including links through `.engineering`, and redact secret-bearing error values.

**Done when:** Invalid gate references and duplicate YAML keys receive actionable file/key diagnostics; legacy shorthand normalizes without rewriting files; unsupported versions fail; unrelated delivery errors remain visible to full validation while the estate projection stays usable. A valid config containing migration, commit, and secret-sync command text validates without running any of it.

**Verification:** Add focused behavior protection for malformed YAML, compatibility normalization, reference errors, path/file boundaries, and no execution/no repository writes. Reuse existing temporary-directory fixtures. Run `pnpm exec vitest run src/config/config.test.ts` plus the new config test file and the affected CLI argument/validation cases in one targeted batch after the coherent change. Establish a red case only when claiming regression protection.

**Out of scope:** A command runner, automatic config migration, a workflow graph engine, automatic dependency installation during validation, or a new secrets scanner.

## B1 — Align shared CLI and skill settings

Completed 1 October 2026: field-level YAML/JSON settings, branch/base semantics, live/generated integration, and consumer documentation aligned. The targeted config/CLI/base batch passed 20/20, including a custom-root fixture and the existing remote comparison cases.

**Depends on:** A2.

**Contract:** engineering-config B2; existing CLI distribution B5, spec model B11, and repository sources B5; the A1 precedence matrix.

**Work:**

- Extend `loadConfig` to combine the declarative YAML projection and legacy JSON per field. Keep `spec_version` separate from engineering `version`; retain current JSON validation and path containment behavior.
- Keep both `view` (`src/cli/command.ts`) and `generate` (`src/static/build.ts`) on this common loader. Confirm source development uses the same effective config through its existing path.
- Feed `vcs.review_base` or the documented default-branch candidate into existing base resolution. Preserve explicit `--base`, configured-reference fallback behavior, and the remote comparison path. Do not add fetching to local config reads.
- Update `engineering-setup`, `spec-visualize`, `branch-self-review`, and affected README/configuration passages to agree on ownership and the branch/base distinction. Existing JSON users need no immediate migration.
- Update adjacent implemented specs and decision tables when this behavior is actually verified. Keep conflicts visible and provide repair guidance without deleting a file or picking a silent winner.

**Done when:** A YAML-only custom spec root appears in both live and generated estates. JSON-only behavior still works. Partial YAML preserves missing JSON settings. Matching values succeed; conflicting explicit values explain both keys. An explicit base and the existing fallback order behave as specified in local and remote comparisons. Reading either config leaves the repository unchanged and executes no declared workflow commands.

**Verification:** Extend `src/config/config.test.ts` with the precedence matrix and existing CLI integration scenarios with a custom-root fixture reused for `view` and `generate`. Exercise base selection with the existing `src/diff/base.test.ts` helpers; extend remote tests only if remote behavior changes. Run those affected files together, reusing A2 evidence that remains valid. No browser session is required to establish payload/base correctness.

**Out of scope:** Removing JSON support, changing Git authentication, fetching local refs automatically, changing spec content versions, or redesigning the visualizer.

## B2 — Define gates and environment evidence

Completed 1 October 2026: setup/readiness now use named command references, prerequisites, gate IDs, and environment-specific evidence. The CI example passes the shared validator; existing normalization/reference tests cover invalid references and duplicate/self-prerequisite gates. Prose decision paths reviewed without wording tests.

**Depends on:** A2.

**Contract:** engineering-config B3–B4; the command/gate contract from A1; `skills/ready-for-pr/SKILL.md` and `skills/write-tests/SKILL.md` retain execution authorization and evidence-reuse rules.

**Work:**

- Integrate A2's validated commands registry and string/object gate entries into the setup/readiness workflows. Prerequisites reference commands, not recursively nested workflow definitions; context metadata determines which verification evidence applies. Keep parser ownership in A2 rather than adding a separate gate parser.
- Define optional-command behavior through gate membership, retaining legacy `non_gating` normalization. A formatter may be a required gate when CI requires it; its name must not force it into the optional category.
- Update `engineering-setup` and `ready-for-pr` to record/read these definitions, reconcile them with actual CI, and distinguish inspected definitions, passed checks, failures, and unavailable environments. Update delivery consumers only where they refer to changed keys or semantics.
- Add a valid example derived from this repository's Quality workflow: Node 22/24 checks, build, license, Node-24-only package validation, and a browser check with build/Chromium prerequisites. Describe separate job contexts without inventing a total CI execution order or promising automatic runtime switching.

**Done when:** Every gate points to a known command. A valid check exposing a code failure stays configured. Node 24 evidence cannot count as Node 22 evidence. Missing browser prerequisites or an unavailable Linux environment remain unverified requirements. Successful equivalent prerequisites can be reused; optional formatter debt is not promoted to a blocker. No gate is run merely because its definition exists.

**Verification:** Reuse/extend A2 parser tests for actual normalization and reference failures. Validate the CI-derived example and walk the readiness instructions against success, code failure, drift, and missing-environment cases. Do not add tests that assert skill wording and do not run this repository's whole CI matrix to prove the model can describe it.

**Out of scope:** Generating GitHub Actions workflows, changing merge protection, replacing CI, building containers automatically, or implementing a local CI executor.

## B3 — Describe multiple targeted test suites

Completed 1 October 2026: test workflows use suite patterns, runner/layout metadata, and safe whole-file argv placeholders. Mixed Vitest/Playwright and nested-cwd examples reviewed; schema validation protects targeted template shape. Suite matching and execution remain agent workflow responsibilities; no new runner or glob engine introduced.

**Depends on:** A2, B2.

**Contract:** engineering-config B5; the A1 suite contract; existing repository test-value and UI verification policies.

**Work:**

- Integrate A2's validated `tests.suites` definitions and legacy-suite normalization into the test workflows. Preserve mixed layouts and multiple patterns without guessing additional runners from incomplete metadata.
- Define root-relative pattern matching, full-run/targeted command references, and the behavior for zero or multiple matching suites. Full-suite gates remain governed by `gates`; suite metadata alone does not make a check mandatory.
- Require the new structured targeted command to carry a whole `{file}` argument in `argv`. Substitute the selected file as one argument relative to its command's `cwd`; filenames containing spaces, shell characters, or leading dashes must not become shell code or options. For retained legacy shell templates, apply appropriate quoting/option handling; report unsupported templates rather than guessing replacements.
- Update `write-tests`, `bug-regression-red-green`, `spec-author-tests`, `spec-assess-coverage`, and relevant implementation instructions to read suite selection from the format reference and inspect existing fixtures when metadata is incomplete.
- Provide Vitest and Playwright examples, plus a nested-working-directory case. Selecting a browser suite does not authorize adding browser tests or running unrelated end-to-end coverage.

**Done when:** Colocated `.test.ts`/`.test.tsx` files select the Vitest definition and `test/e2e/*.spec.ts` selects Playwright in the documented example. A mixed-layout repo is representable. Overlapping patterns produce an explicit selection requirement; unmatched files do not silently fall back to an arbitrary runner. Targeted command arguments preserve the selected filename. Legacy configs remain usable with clear limits.

**Verification:** Validate the examples through the shared schema/semantic validator. Add tests for selection/argument construction only if shipped runtime helpers own that behavior; otherwise inspect concrete argument examples and the affected instructions. Test meaningful unsafe-filename behavior at any real substitution boundary. No new glob engine, runtime tests for prose instructions, or invented application tests are required.

**Out of scope:** Test generation, a new coverage service, a browser test harness, automatically running all matching suites, or converting existing test filenames.

## C1 — Integrate setup and verify distribution

Completed 1 October 2026: setup and all affected consumers use the shared reference; schema/examples are explicitly included and required by package verification. Final offline temporary installation validates v1/v2 and rejects invalid config. Close-out passes types, clean lint, 154 unit/integration tests, 11 browser tests, build, package verification, license checks, and scoped links/whitespace checks. Final drift/coverage review finds no remaining in-scope gap. No dead-code command exists; none was invented. Evidence is local macOS/Node 24; no Linux/Node 22 CI-matrix or publication claim is made.

**Depends on:** B1, B2, B3.

**Contract:** engineering-config B6–B7; package distribution and configuration-read-only invariants; all F1–F4 outcomes above.

**Work:**

- Replace the setup skill's large informal shape definition with a concise example and links to the packaged format/schema. New setups emit v2; existing v1 configs are preserved unless migration is part of the requested setup change. Migration preserves unrelated repository fields or records unresolved legacy extensions rather than dropping them.
- Reconcile all remaining engineering-config consumers, literal resource links, default paths, and documentation. Keep service/envSync guidance and unrelated starting work intact. No installed-cache edits.
- Add exact contract reference/schema/example paths to the package verifier's allowlist. Confirm `package.json` distribution includes the files and the bundled CLI needs no source checkout or network schema download.
- Build through owning tools, inspect the package, and validate a temporary fixture with the packaged CLI. Reuse earlier passing evidence. Run the existing release-package check once at this distribution boundary when build/package prerequisites are available; report unrelated baseline failures separately.
- Review the complete task diff, update the governing spec states and this plan's completion markers from actual evidence, and record local completion separately from publication or installed-version rollout.

**Done when:** A fresh installed package contains the reference and schema, all literal links resolve, and its `config validate` command works offline against valid/invalid v1/v2 fixtures. Setup and consumers describe the same keys. Current old JSON configurations still function. All four findings have current evidence, and any required unrun verification remains explicitly incomplete.

**Verification:** Changed-file frontmatter/link/schema checks and `git diff --check`; targeted runtime checks not already covered; `pnpm build` followed by `pnpm release:check` and an offline packaged-CLI fixture. Required type/lint checks run at the integration boundary according to repository policy. Recheck affected files after any late change; do not repeat every earlier successful check. Publishing and full readiness are separate from these package checks.

**Out of scope:** Release version changes, registry publication, push/PR actions, installing/updating plugins, fixing unrelated environment-sync or service-stack work, repository-wide formatting, or hand-editing generated output/lockfiles.

## Decisions and execution notes

| Topic | Status | Resolution or next action |
| --- | --- | --- |
| One shared settings authority | Implemented | Use YAML with field-level legacy JSON compatibility; A1 documents the exact matrix before B1. |
| Separate branch and review base | Implemented | Add `vcs.review_base`; preserve default branch meaning and existing Git fallbacks. |
| Engineering v2 plus v1 support | Implemented | New setup emits v2; no automatic migration on reads. |
| Validation implementation | Implemented | Ajv 8.17.1 (MIT) validates the packaged draft-07 schema; pnpm 11.10.0 regenerated the lockfile without unrelated dependency changes. |
| Command execution owner | Implemented | Agent workflows execute authorized checks. `config validate`, `view`, and `generate` execute none of the recorded commands. |
| CI policy and unavailable environments | Existing policy | Inspect real CI; preserve real requirements; report missing evidence. This work does not change branch protection. |
| Installed rollout | Deferred | Local implementation and packaging can complete separately; publishing/installing requires its own authorized stage. |

At implementation start, record the fresh baseline. The planning baseline already contains changes to README, the setup skill, the spec inventory and CLI distribution spec, CLI command/argument code, and untracked environment-sync/service-stack files. Do not attribute, stage, revert, or delete them as this plan's work. When a planned file overlaps, preserve and integrate the existing edits deliberately. That baseline describes the preceding review/planning stage; subsequent implementation changes are recorded above and in `.active/engineering-config/checkpoint.md`.

Completion requires implemented behavior and proportionate verification for A1–C1, accurate compatibility documentation, a valid packaged contract, and no unaddressed in-scope findings. A recorded blocker does not satisfy an acceptance criterion. No automatic goals, reminders, commits, or publication steps follow from completing this plan.

## PR submission verification — 2 October 2026

The engineering-config changes were isolated from the saved starting baseline and applied to current `main` (`434a083`) on `codex-gaz/engineering-config-contract`. The merged service launcher is retained; local environment-sync work is excluded. Its package allowlist entry is also excluded. The isolated branch passes types, lint, 141 unit/integration tests, 11 browser tests, build, licence checks, and package verification (62 files). A fresh offline installation validates v1/v2 and rejects invalid configuration. These results use macOS and Node 24.19.0; the Linux/Node 22 matrix remains for CI. The earlier 154-test result above includes the local environment-sync tests and describes the original implementation checkout.
