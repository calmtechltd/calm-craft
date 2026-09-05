# Skills consistency and verification plan

Status: in progress, 5 September 2026. Next up: **authorized release and installed rollout**. A1–A3, B1–B4, C1, and C2 local preparation are complete. C2 rollout remains pending.

Fix the complete 31-skill review: reduce unnecessary tests and repeated checks, reconcile contradictory instructions, repair the affected runtime helpers, simplify prose, and deliver a version that the host actually loads. Preserve the existing uncommitted improvements and the new `clean-code-slop` skill.

The [full review](/Users/gaz/.codex/visualizations/2026/09/04/01a06e89-163c-7fd3-b769-0375cc14fbed/calm-craft-skills-review.md) provides the evidence for findings 1–20. This plan repeats the required outcomes so execution does not depend on that local report remaining available.

The checkout is on `main` at `74460d3`, matching `origin/main` when reviewed. The repository declares 0.2.1; the current session loaded the installed 0.2.0 plugin. Planning authorizes this document only. A later implementation request authorizes the local work; publication and installation use any authorization already supplied at that point. Do not confuse local completion with rollout completion.

## Defaults

| Decision | Working default |
| --- | --- |
| Test value | Add or extend protection for a plausible runtime failure. Reuse existing scenarios; do not require a new test per bug label, spec ID, guard, or flow transition. Preserve meaningful permission, tenancy, and regression coverage. |
| Verification owner | One coordinator chooses checks and reuses results. Workers run only assigned checks and return their command, result, and covered changes. Delegate substantial independent work; no agent per file or arbitrary minimum fanout. |
| Full suites | Ordinary implementation uses targeted checks. Full local CI requires an explicit checks/readiness request or an applicable repository requirement. Release checks remain at the release boundary. |
| Browser verification | Focused checks when needed to establish changed user-facing behavior and allowed by the task and repository policy. Honor an explicit skip. Batch checks in one coordinator-owned session. This does not authorize live mutations or new end-to-end test infrastructure. |
| CodeRabbit | Keep all three skills in this plugin, explicitly invoked. Retain separate triage, local implementation, and publication/resolution operations. |
| PR readiness | Assess locally without notifying reviewers. Promote a draft only when authorized and the published PR contains the validated state. |
| Flow fallback | Preserve the documented contract: at most one unguarded fallback per group sharing a source state and event. Do not claim to prove natural-language guard exclusivity automatically. |
| Convention outputs | Use an existing owning generator when present. Otherwise treat configuration and ambient guidance as maintained files; do not invent a generator in this cleanup or label them machine-generated. |
| Scope | Keep all 31 skills and their useful boundaries. No new global meta-skill, broad application refactor, dependency upgrade, or repository-wide test deletion. |
| Release | Prepare version 0.3.0, as requested by the user after local candidate review. Preserve the established staged release, security, provenance, and installed-package checks. Refresh the plugin through its supported installation mechanism. |

These defaults guide implementation unless the user changes them. They do not override explicit session instructions, host permissions, or repository rules.

## Sequence

| Phase | Chunk | Result | Depends on |
| --- | --- | --- | --- |
| A — Reduce routine work | A1 | Shared verification policy and current edits reconciled | — |
| | A2 | Setup and convention work avoid unnecessary execution | A1 |
| | A3 | Planning, questions, and triage preserve scope and use available evidence | A1 |
| B — Correct decisions and side effects | B1 | Spec instructions and flow validation agree | A1 |
| | B2 | Complete, bounded CodeRabbit processing | A1 |
| | B3 | Accurate PR metadata and authorized readiness | A1, A3 |
| | B4 | Reliable branch/worktree cleanup advice | A1 |
| C — Consolidate and deliver | C1 | Concise skills, useful tests, and a consistent complete diff | A2, A3, B1, B2, B3, B4 |
| | C2 | Verified package and confirmed installed-version rollout | C1; publication authorization for external stages |

Dependencies mean completed and appropriately verified in the working state. They do not require a merge between chunks. Start with A1, then default to the displayed order. After A1, independent areas may run concurrently under explicit file ownership. The coordinator owns cross-cutting edits to `README.md`, the shared references, and the plan. Avoid concurrent changes to the same files.

## A1 — Reconcile the verification policy

**Findings:** 4; shared foundation for 1–3 and 9. **Contract:** this plan; the existing test-policy changes are the starting point.

**Work:** Inspect the starting staged, unstaged, and untracked changes and record the baseline. When implementation starts, use a `codex-gaz/` branch from the updated main while preserving those changes. Make `write-tests` the concise authority on test value and result reuse. Reconcile its callers in `bug-regression-red-green`, `spec-author-tests`, `spec-assess-coverage`, `run-implementation-plan`, `run-implementation-plan-all`, `branch-self-review`, and `clean-code-slop`. Retain the improvements already present; change only conflicting or duplicated guidance. Define mount-only harness entries as visual fixtures, not evidence of tested behavior. Keep required but unrun checks visibly incomplete.

**Done when:** A prose-only change does not produce application tests; a static guarantee does not get a duplicate runtime test; existing regression protection can satisfy a fix; workers do not independently invoke full suites or readiness. Named-card scope remains bounded. A dependency's changed code invalidates relevant evidence, not every passing check indiscriminately.

**Verification:** Read the affected decision paths and inspect the diff. Check changed skill frontmatter and literal relative links. No application tests or new wording tests.

**Out of scope:** Rewriting application tests, adding a verification framework, changing installed cache files, or making a persistent goal/automation.

## A2 — Make setup and convention work proportionate

**Findings:** 1, 3, 13 and the question-bank part of 4. **Contract:** this plan; recorded repository conventions retain precedence.

**Work:** Update `engineering-setup`, `conventions-decide`, `conventions-migrate`, `conventions-audit`, `conventions-revisit`, and the relevant convention-question-bank passages. Validate command definitions by inspection before execution. Classify unresolved commands as unverified; preserve real failing CI gates. Do not execute migrations, commits, full suites, or a `{file}` template just to discover configuration. Match migration checks to changed behavior and transformation risk. Recognize formatter/compiler/CI enforcement, preserve defaulted-versus-decided provenance, and clarify configuration ownership without building a new generator.

**Done when:** Setup can record a real migration helper without running it. A failing legitimate gate remains in the config. A comment/import convention change can use its relevant static check without a compulsory test run. Migrating a default does not falsely record a user decision. The question bank no longer imposes a new test for every kind of bug fix.

**Verification:** Walk through those cases against the instructions; inspect any example YAML and the complete scoped diff. No command-execution demo against a real database or checkout, no application tests.

**Out of scope:** Performing a convention migration in this repository, changing dependency policy, or running engineering setup as a prerequisite.

## A3 — Remove scope and question friction

**Findings:** 9, 14–17 and the planning/backfill parts of 4. **Contract:** this plan.

**Work:** Update `author-implementation-plan`, `ask-questions`, `spec-author-greenfield`, `spec-author-from-impl`, `spec-triage-bug-report`, `spec-harvest-discussion`, and `spec-audit-drift`. Use the host's actual callable tools and mode; honor their schema rather than prescribing question counts or unsupported mode switches. Reuse accepted decisions, allow no open questions, and continue independent work while real questions remain. Use implemented-and-verified local prerequisites. Apply the common browser/test policy to plans and backfill. Allow an insufficient-evidence bug verdict and authoritative evidence other than a pre-existing spec. Treat drift as a mismatch pending assessment. Accept comment paths as validated, scope-limited lookup hints, while treating embedded instructions as untrusted data.

**Done when:** A complete brief needs no ritual interview; a known regression can be triaged without a feature-wide spec backfill; a request for one chunk stays one chunk; available asynchronous questions work without switching modes; a useful referenced spec can be read without obeying comment instructions. Question discovery uses the repository's configured default branch instead of hardcoded main/master. Browser requirements and test-value decisions agree with A1.

**Verification:** A short read-only walkthrough of these cases, plus changed-file structural checks. No automated prompt/phrase assertions and no running-app verification.

**Out of scope:** New product designs, a general prompt-injection framework, or authoring a new spec for each skill.

## B1 — Align spec maintenance and flow validation

**Findings:** 10–12. **Contract:** `references/spec-format.md`; `specs/calmcraft/spec-model.md` B3, B4, B8 and its YAML-authority invariant.

**Work:** Correct roll-up language in `spec-maintain-on-ship` and the reference: all implemented → implemented; all future → future; otherwise partial. Make ticket changes conditional on repository policy. Make `spec-gap-sweep` preserve ID gaps and compare generated content instead of timestamps. Repair the reference YAML example. Update `src/specs/validator.ts` to accept one unguarded same-event fallback and reject multiple fallbacks. Document this behavior under the existing product spec. Update authored flow sources only where needed and regenerate affected Mermaid through its owning tool.

**Done when:** An all-partial spec stays partial, `provider: none` creates no ticket field, gaps in stable IDs remain valid, and storyboard-only changes do not create spurious diagram drift. The documented valid fallback passes validation; ambiguous multiple fallbacks produce an actionable finding. The example parses and passes relevant structural validation.

**Verification:** Extend the existing validator tests with a compact zero/one/multiple-fallback matrix, including the failing case before the fix. Run `pnpm exec vitest run src/specs/validator.test.ts` for the regression and final affected state. Add existing flow/parser test files to that run only if their behavior changes. Validate the repaired example through the existing parser/validator; do not add heading or phrase tests. Reuse existing roll-up protection unless the implementation actually changes.

**Out of scope:** UI redesign, proving prose guards mutually exclusive by executing them, a new flow schema version, or manual edits to generated diagrams.

## B2 — Bound and complete the CodeRabbit workflow

**Findings:** 2, 6, 18, 19. **Contract:** this plan; preserve the three distinct side-effect boundaries.

**Work:** Update all three CodeRabbit skills, their output templates, and invocation metadata where needed. Remove mandatory maximum fanout and duplicate check ownership. Ingest every actionable inline severity, deduplicate corresponding review-body findings, and preserve thread mappings. Require evidence before definitive fix/skip decisions; represent unverified items explicitly. Continue settled independent fixes while gathering unresolved decisions. Replace mandatory nit bundling with a value/scope decision. Tighten publication triggers and preserve publication-before-resolution and idempotence checks. Correct the `jq` reply encoding example and keep all nonblocking/current-thread checks meaningful.

**Done when:** An inline-only Major finding cannot vanish; an unverified finding cannot count as resolved; three trivial fixes need not spawn three workers; a blocked design choice does not block an independent settled fix; “implement all” without publication context stays local; a skip rationale with quotes/newlines produces the intended plain-text reply exactly once.

**Verification:** Inspect decision paths using a small local sample of inline/body/duplicate/unverified findings. Evaluate the changed JSON-construction snippet offline with `jq`; do not call GitHub mutations. No application tests, full typecheck, or new permanent wording suite for instruction edits.

**Out of scope:** Processing a live review, posting replies, splitting a new plugin, or adding a generic review ingestion service.

## B3 — Keep PR metadata and readiness accurate

**Findings:** 5, 8. **Contract:** this plan.

**Work:** Update `ready-for-pr` and `update-pr`. Separate assessment from authorized draft promotion; require the tested relevant state to be committed and present in the PR's published head before promotion. Preserve a draft when fixes remain local. Reuse checks under A1. Use `base..HEAD` for branch commit messages and retain the appropriate merge-base diff. Preserve ticket relationships: an incidental reference is not automatically `Resolves`. Keep title-only edits bounded and verification claims honest. Make related readiness/CodeRabbit workflows conditional on the request.

**Done when:** “Will CI pass?” cannot notify reviewers; an unpushed passing fix cannot mark its still-broken remote PR ready; a main-only ticket does not enter the branch description; a related issue remains a reference; an existing suitable commit subject may serve as the PR title.

**Verification:** Read-only examples of dirty, local-ahead, and matching published states; inspect Git range semantics and sample metadata transformations. No live PR edit, push, notification, or full local suite merely to validate the instructions.

**Out of scope:** Changing CI requirements, opening/merging a PR, or implementing a new PR-management tool.

## B4 — Repair branch and worktree safety decisions

**Findings:** 7 and all ancillary scanner issues. **Contract:** `branch-cleanup`'s promise to advise deletion only with sufficient merge and ownership evidence; acceptance criteria below.

**Work:** Update `skills/branch-cleanup/scripts/scan.py` and its skill together. Verify that the actual merge result reached the selected trunk, including a stacked PR whose eventual merge result is now an ancestor; preserve uncertainty when the complete branch cannot be proved merged. Retain unknown Graphite metadata as unknown rather than untracked. Separate merge evidence from checked-out/active/dirty/locked blockers so worktree eligibility does not depend circularly on a branch's deletion verdict. Remove the mutating weak squash-hint path by default; do not replace it with another Git-object-writing trick. Clarify `git cherry` evidence and the scanner's actual mutations. With fetch disabled, avoid incidental index/object writes, including optional Git refresh and Python bytecode. Recheck current branch/worktree state before any later authorized deletion.

**Done when:** A PR merged only into an unfinished feature branch is not safe; a verified merge in trunk can be safe subject to ownership guards; unavailable Graphite metadata cannot yield confident plain-Git deletion advice; an eligible clean old worktree can be classified without the current circular dependency; active, dirty, locked, unreadable, and main worktrees remain protected. A no-fetch scan does not create Git objects or change checkout contents. Missing patch equivalence alone is not described as proof of unmerged work.

**Verification:** Add a compact behavior test file discovered by the existing Vitest configuration, using the existing temporary-Git fixture helpers and invoking the Python scanner with controlled PR/Graphite inputs. Avoid a second test framework. Cover the merge-target distinction, unknown metadata, worktree guards/eligibility, and no-fetch side effects through shared fixtures/table cases. First reproduce the faulty verdicts, then run only that affected file after integration. Stub network/provider data; never delete a real branch or worktree as a test. If executing Python needs an explicit CI prerequisite, add only that prerequisite.

**Out of scope:** Automatic remote deletion, deleting the user's old branches, Graphite rebasing/restacking, force-pushing, or a new branch-management framework.

## C1 — Remove repetition and low-value wording checks

**Finding:** 20, every prose observation, and final consistency across all 31 skills. **Contract:** this plan and the corrected skill boundaries.

**Work:** Review the complete authored skill/reference corpus, taking the behavior changes above as settled. Remove repeated trigger lists, slogans, mandatory ceremony, and duplicated anti-pattern/checklist rules. Consolidate storyboard recovery/liveness detail into its existing reference and generalize product-specific examples. Remove the operational question bank's historical essay, fix stale names, and scale PR prose to the actual change. Retain important safeguards where the agent makes the decision. Review `scripts/release-contract.test.ts` wording assertions; remove only those whose protection is unnecessary or already provided by an appropriate invariant. Preserve package/version/security/generated-asset checks.

**Done when:** All 31 skills are accounted for, shared policy has one authority, and no caller reintroduces the fixed test/run/publication rules. Every removed assertion has an explained protection decision. Descriptions remain specific; references resolve; no arbitrary word-reduction quota drives deletion. Report before/after word totals as context, not proof of quality.

**Verification:** One complete consistency/diff review, with an independent read-only reviewer if useful. Validate changed frontmatter/links and run `git diff --check`. Run `pnpm exec vitest run scripts/release-contract.test.ts` after changing that test file, combining with any still-needed affected checks. No repo-wide formatting, application-suite sweep, or automated phrase-matching replacement tests.

**Out of scope:** Renaming/removing public skills wholesale, broad runtime refactoring, or deleting application tests outside the reviewed wording checks.

## C2 — Prepare the package and confirm the loaded version

**Finding:** installed/source version mismatch and delivery of all corrected skills. **Contract:** `RELEASING.md`, `specs/calmcraft/cli-distribution.md`, package manifests, and existing release workflows.

**Work:** Confirm the next available version at execution time. Update the source version declarations, release notes, README pins, and `spec-visualize` pin consistently. Regenerate lockfile metadata with the pinned pnpm only if needed. Build/package at this boundary and inspect the artifact for all intended skills, references, and CodeRabbit explicit-invocation metadata. Follow the existing staged release and registry smoke procedure when publication is authorized. Refresh the supported plugin installation, then check a fresh session's catalog/path and representative contents. Do not hand-edit the cache or assume a manifest bump reloads an existing session.

**Done when, local milestone:** The versioned candidate is reviewable, contains the changes, passes applicable package checks, and has an honest evidence report. If publication has not been requested, stop at this concrete candidate and label rollout pending.

**Done when, rollout milestone:** The authorized release completed its required checks, the intended installed version is present, and a fresh session loads the new verification rules and explicit CodeRabbit metadata. Verify both discovery and contents; an npm release alone does not prove the plugin was refreshed.

**Verification:** At this boundary use the repository's existing build/package checks, including `pnpm build` followed by `pnpm release:check`, and the mandatory release validations when preparing an authorized release. Reuse evidence for unchanged code/configuration/environment; do not repeat a passing local check just because a release step mentions it again. Distinct CI runtime/OS and registry-installed checks remain distinct requirements. Record unavailable checks instead of waiving them. No manual cache edits or live mutation walkthroughs to test the new skills.

**Out of scope:** Bypassing trusted publishing, stage approvals, immutable versions, or six-environment smoke checks; unrelated release infrastructure changes; forcing this active session to reload unsupported state.

## Verification and progress rules for this plan

- No tests, builds, or browser runs are needed to write this plan. During implementation, prose-only chunks use inspection and applicable structural checks.
- Runtime regressions belong in the validator/scanner's narrow tests. Keep the separate failing run that demonstrates a bug. Prefer shared cases over one new test per audit paragraph.
- Workers report results; the coordinator runs only checks not already covered by current evidence. A later relevant change invalidates that evidence and justifies a rerun.
- Do not make a new harness to assert instructions contain particular words. Validate executable snippets offline and use a short decision walkthrough for prose.
- Inspect the final complete task diff, including preserved uncommitted work and new files. Record changed files, decisions, commands/results, and remaining limitations in a concise checkpoint. Update this plan's chunk status and Next up marker as work completes.
- The public release stage remains pending until its actual prerequisites and authorization are satisfied. Do not mark the whole rollout complete because the local files are finished.

## Coverage and completion tracking

| Audit finding | Owning chunk |
| --- | --- |
| 1 | A2 |
| 2 | B2 |
| 3 | A2 |
| 4 | A1, A2, A3, with A1 owning the policy |
| 5 | B3 |
| 6 | B2 |
| 7 | B4 |
| 8 | B3 |
| 9 | A3 |
| 10–12 | B1 |
| 13 | A2 |
| 14–17 | A3 |
| 18–19 | B2 |
| 20 | C1 |
| Prose/repeated guidance | C1, with behavioral corrections in their owning chunks |
| Scanner ancillary issues | B4 |
| Installed/source version gap | C2 |

A1–A3, B1–B4, C1, and C2 local preparation are complete as of 5 September 2026. Publication and installed rollout remain pending. Optional decisions for the user: retain CodeRabbit in this plugin versus move it into an optional plugin; allow focused browser verification under task/repository policy versus require an explicit browser request each time. The default choices above keep the plan executable without another design round.


## Local completion evidence — 5 September 2026

- All 31 skills retained; entrypoint text reduced from the audit's approximately 34,951 words to 20,785 whitespace-delimited words. This measures prose volume, not runtime token savings.
- Final affected-test evidence: validator 7/7, scanner 4/4, release contract 4/4. Scanner cases cover real temporary Git merge ancestry, unknown Graphite ownership, real worktree eligibility plus guard cases, and no-fetch object/index/checkout preservation. The faulty merge-target and metadata verdicts and incidental Git writes were reproduced before fixing them.
- TypeScript check, scoped lint, 31 skill frontmatters/relative links/explicit metadata, and diff whitespace check passed. The repaired flow example parsed/rendered; reply encoding was checked offline.
- Pinned pnpm 11.10.0 worked outside the sandbox. Build and final release-package check passed: 58 packaged files, 31 skills, 4 browser assets, executable CLI. No lockfile change was needed.
- Candidate: `calmcraft-cli-0.2.2.tgz` in the review artifact directory. Forty packaged skill/reference/sidecar/scanner source files matched the working sources byte-for-byte. SHA-256: `32ca83c2c0c9ad8a6a4bdd75f3682e553d8c4724170ae7ebda3bd2932238940d`.
- Removed release-test assertions for documentation headings, generic SemVer/runtime phrasing, and output-location prose. These did not test executable behavior. Retained manifest/runtime invariants, current command/version pins, security routing, generated-template equality, release permissions and smoke-matrix checks.
- Defaults retained: CodeRabbit remains bundled and explicit-only; focused browser checks follow task/repository policy. No new agents or app/browser sessions were started for this implementation.
- Changes remain uncommitted on `codex-gaz/skills-consistency`, based on main at `74460d3`; existing work was preserved. No branches/worktrees were deleted. Temporary pnpm diagnostic data was moved outside the repository.
- Release remains unapproved and unperformed. Full unit/CI matrix, license gate, packaged browser suite, staged publishing, registry smoke/provenance, promotion, supported plugin refresh, and fresh-session discovery remain release/rollout prerequisites under RELEASING.md. This active session still loads installed plugin 0.2.0; neither the manifest bump nor this tarball reloads it.

## PR handoff

The user requested 0.3.0 and authorized committing, pushing, and opening a new PR. The earlier 0.2.2 tarball and checksum above are historical evidence, superseded by the 0.3.0 source candidate. Registry publication and installed rollout remain separate.

Version 0.3.0 validation: release-contract 4/4, rebuilt CLI/UI, and package inspection passed (58 files, 31 skills, 4 browser assets). Existing scanner/validator and static-check evidence is reused for unchanged behavior.
