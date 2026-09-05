# Changelog

CalmCraft follows [Semantic Versioning](https://semver.org/). Release notes describe user-visible CLI, spec-contract, security, and compatibility changes.

## 0.3.0 — pending

Includes the previously unreleased 0.2.1 skill changes.

- Centralize test value and verification ownership: reuse current evidence, assign narrow worker checks, and reserve full suites for explicit checks requests, repository requirements, and release preparation.
- Keep all 31 skills while removing repeated checklists, trigger lists, and question ceremony. Add explicit code-slop cleanup and align focused browser verification with task and repository policy.
- Keep CodeRabbit explicitly invoked, account for every inline severity, retain unverified findings, and require published fixes and current thread evidence before resolution.
- Separate local readiness from authorized draft promotion; preserve PR ticket relationships and inspect the actual branch commit range.
- Accept one unguarded flow fallback, correct spec status rollups, and preserve stable IDs and generated-diagram authority.
- Require branch-cleanup PR merge evidence to reach trunk, preserve unknown Graphite ownership, and evaluate worktree blockers separately. No-fetch scans no longer write Git objects or refresh indexes.

## 0.2.0 — 2026-08-25

- Add `spec-storyboard-journey`, authoritative storyboard evidence on flow states, scene inspection in Feature view, a shared UX journey reference, and packaged spec/flow templates for reconstructing a repository's portable spec layer.
- Add `calmcraft generate`, which writes the estate as one self-contained HTML file that opens from the filesystem with no server, port, or token.
- Add `generate --diff --base <ref>` and `--provenance`, which bake Branch Review into that file at generation time. `--provenance` chooses which layers are visible when the file first opens.
- Add Flows and Questions as first-class views, and stop counting unresolved questions as findings.
- Read flow references that wrap across several lines; they previously parsed as no flow at all.
- Rebuild the interface on bundled Geist with a single type scale and reserved semantic colour.
- Render every matching specification instead of the first 120.
- `run-implementation-plan` is the scoped delivery loop: read the specs, build a queue, work one card at a time, and keep going across turns until the definition of done. Host `/goal` (Cursor, Codex, and others) starts and continues it. An optional `.engineering/goal.md` overlay holds repo-specific commands. The plugin no longer ships a `goal` skill — Cursor now has its own. Each card uses cheap, diff-scoped checks (targeted tests, lint/format on touched files, path-scoped types). Whole-programme typecheck, knip, lint, and the full test suite run once at close-out and loop until green.
- Add `ask-questions`: surface real open decisions in the current conversation, plan, or session-owned branch and put them to you as structured choices. Never invents the questions.
- Add `branch-cleanup`, `update-pr`, and the CodeRabbit review trio (`coderabbit-review-triage`, `coderabbit-review-implement`, `coderabbit-review-implement-all`). Repos without CodeRabbit simply never trigger those three.
- `ready-for-pr` marks a draft PR ready after the gates pass. Submit stays draft; this skill is what publishes the review.
- Ship skill sidecars in the npm package (`scripts/`, extra skill markdown). Select chevrons work under CSP. Muted chrome text meets contrast.

## 0.1.0 — pending

- Add the local Atlas, Feature, Branch Review, and Health views.
- Add semantic comparison for committed, staged, unstaged, and untracked spec changes.
- Add read-only local checkout, linked worktree, and temporary private remote sessions.
- Add the CalmCraft Agent Plugin skills and format references to the npm package.
