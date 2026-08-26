# Changelog

CalmCraft follows [Semantic Versioning](https://semver.org/). Release notes describe user-visible CLI, spec-contract, security, and compatibility changes.

## 0.2.1 — pending

- Make the CodeRabbit review skills explicit-only so they never overlap with ordinary implementation work.
- Require an explicit request before starting the app or using browser verification, and require a separate explicit request before opening an external GUI browser.
- Keep ordinary implementation checks proportional: run only warranted targeted tests, leave repository-wide TypeScript, lint, Knip, UI, and test-suite gates to an explicitly requested `ready-for-pr` run or CI.

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
