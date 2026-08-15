---
name: engineering-setup
description: Detect this repo's toolchain and write .engineering/config.yaml, the configuration every other skill in this plugin reads. Use when first installing the engineering-system plugin, when the user says "set up the engineering system", "bootstrap specs", "configure the plugin", "my test command changed", or when any other skill reports that .engineering/config.yaml is missing or stale.
---

# Engineering Setup

Write `.engineering/config.yaml` — the contract between this plugin's portable skills and one specific repository. Every other skill reads it. Nothing else in the plugin should ever hardcode a command, a path, or a branch name.

Run once per repo, and again whenever the toolchain changes.

## When to use

- "Set up the engineering system" / "configure the plugin" — first install.
- "We moved to a different test runner" / "the lint command changed".
- Any skill reporting a missing or stale config.

**Not this skill:** deciding code conventions (`conventions-decide`), authoring specs (`spec-author-greenfield` / `spec-author-from-impl`).

## Workflow

### 1. Detect before asking

Read the repo and work out what you can. Do not ask about anything you can determine:

- **Languages and frameworks**, and roughly how much code is in each.
- **Toolchain** — formatter, linter, type checker, test runner, dead-code checker, package manager. Read the actual config files and the scripts in the project manifest, not the dependency list.
- **Package manager** — detect it; never prescribe one. Lockfile first (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lock` / `bun.lockb`, `uv.lock`, `poetry.lock`, `composer.lock`, `Cargo.lock`), then the `packageManager` field in the manifest, then CI install steps. If two signals disagree, say so and ask. Record what is already here. Converting npm → pnpm (or the reverse) is a migration, not setup.
- **Install-time security already configured** — release cooldown, install-script allowlist, blocked exotic sources, trust/provenance policy. Read the manager's config (`pnpm-workspace.yaml`, `.npmrc`, `.yarnrc.yml`, `bunfig.toml`, `package.json` fields such as `allowScripts` / `trustedDependencies` / `dependenciesMeta`) and the update-bot config (Dependabot `cooldown`, Renovate `minimumReleaseAge`). Report what you found, and mention the useful pair if it is missing — one line, as a heads-up, because most people do not know the switch exists. Do not silently enable a control that would change the next install. Do not treat a missing cooldown as a setup failure.
- **Secrets hygiene** — whether `.env`, `.env.local`, `.env.*.local` are gitignored; whether a `.env` (or similar) is **tracked**; whether a committed example file exists (`.env.example`, `.env.sample`, `.env.template`). A tracked secrets file is a finding to surface, not a silent `git rm`.
- **CI** — read the workflow files. The commands CI runs are the commands `ready-for-pr` must run; take them from there rather than guessing.
- **Default branch** — `git remote show origin`, falling back to `origin/HEAD`.
- **Ticket references** — check existing rule files, skill files, and contributing docs **first**; teams write the pattern down long before it appears reliably in commit subjects. Only then sample recent commits and pull request titles. Coming up empty on git history is not evidence the repo has no ticket convention.
- **Test layout** — colocated, `__tests__/`, or a mirrored tree; and how unit and integration tests are distinguished.
- **Existing agent instructions** — `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, `CONTRIBUTING.md`.

### 2. Confirm, don't interrogate

Present what you found as a filled-in draft config and ask me to correct it. One round of confirmation beats fifteen questions.

Ask only about what you genuinely could not detect:

- Where should working documents live — implementation plans, review reports? Suggest a gitignored directory if the repo has no convention.
- Do they want a short `/goal` overlay for repo-specific loop constraints (commit helpers, database generation rules)? Suggest `.engineering/goal.md` and omit it if they have none.
- Where do specs live, if not `specs/`?
- **Do specs link to a tracker at all?** Default to `none` and say so — it's the right answer for most repos, and a ticket field nobody completes is worse than no field. If they want one, `github` is the only provider where skills can actually resolve issue state without extra credentials. Anything else needs a pattern and URL template.
- Which of this plugin's three areas do I want — conventions, specs, delivery, or all three?
- **Package manager**, only if this is a dependency-managed repo and the signals are missing or contradictory. Offer the detected candidates; do not recommend a favourite.
- **Secrets**, only if something is wrong or absent: a tracked `.env`, no ignore rule, or no example file. Offer to add the ignore and an example file. Do not invent keys. Do not rotate anything yourself — say if history may already contain values.

### 3. Write `.engineering/config.yaml`

```yaml
version: 1
languages: [typescript]

# Detected, never prescribed. Skills that install or add a package use
# this instead of guessing. Omit on repos with no package manager.
package_manager: pnpm     # npm | pnpm | yarn | bun | uv | poetry | composer | cargo | ...

paths:
  specs: specs/
  plans: .plans/
  reports: .reports/
  conventions: .engineering/conventions.yaml
  # Optional. A short note /goal and run-implementation-plan read for
  # repo-specific loop constraints. Omit if you have none.
  goal: .engineering/goal.md

commands:
  # Exactly what CI runs, in CI's order. Omit any that don't exist.
  # `setup` is any generation or codegen step CI runs BEFORE the gates.
  # Skip it and later gates fail on missing generated files — a phantom
  # failure on a perfectly clean branch.
  setup: <pre-gate generation command, if any>
  types: <type check command>
  lint: <lint command>
  deadcode: <dead code command>
  test: <full test command>
  test_file: "<command with {file} placeholder>"

# Which commands gate a merge, in order. `ready-for-pr` runs exactly these
# and reports Blocked only on these.
gates: [setup, types, lint, deadcode, test]

# Commands that exist but do NOT gate. Never report Blocked on these.
# A formatter failing on hundreds of pre-existing files, and absent from CI,
# belongs here — treating it as a gate blocks every branch on unrelated drift.
non_gating:
  format_check: <command>
  format_fix: <command>

vcs:
  default_branch: <branch>
  pr_cli: gh              # or none

tickets:
  # none is the default and a perfectly good answer. With `none`, specs carry
  # no ticket field at all — a field nobody fills in is worse than no field.
  provider: none          # none | github | linear | jira | custom
  # github needs nothing else — inferred from the repo, and `gh` is already
  # authenticated, so skills can resolve issue state.
  # linear | jira | custom also need:
  # pattern: "<regex, e.g. ABC-\\d+>"
  # url: "<url template with {id}>"

tests:
  location: colocated     # colocated | tests-dir | mirrored-tree
  unit: "<pattern, e.g. *.test.ts>"
  integration: "<pattern, e.g. *.integration.test.ts>"

review:
  # Conventions a reviewer must check every time in this codebase.
  always_check:
    - <e.g. permission checks on new endpoints>
    - <e.g. multi-tenancy scoping on queries>
    - <e.g. new dependencies against the install-script allowlist>
```

Omit keys that don't apply rather than filling them with placeholders. A missing key is honest; a wrong command is a skill failing confusingly three weeks later.

### 4. Verify every command actually runs

Run each command in `commands`. A config full of commands that don't work is worse than no config, because skills will report their failures as _your code's_ failures.

If a command fails, fix it or drop it — and say which you did.

### 5. Write `AGENTS.md`

If it doesn't exist, create it. If it does, propose a merge rather than overwriting.

`AGENTS.md` is the canonical instruction file — stewarded by the Agentic AI Foundation under the Linux Foundation, and [officially supported](https://agents.md) by Codex, Cursor, VS Code, GitHub Copilot, Gemini CLI, Windsurf, Devin, Zed and many others.

Make tool-specific files thin pointers, never copies. **Use each tool's own mechanism — a prose "see AGENTS.md" line is a suggestion, not a load.**

**Claude Code** does not read `AGENTS.md` and does **not** fall back to it. Its [documentation](https://code.claude.com/docs/en/memory) is explicit: "Claude Code reads `CLAUDE.md`, not `AGENTS.md`." A repo shipping only `AGENTS.md` gives it nothing. Write a real import, which Claude Code expands at load time:

```markdown
<!-- CLAUDE.md -->
@AGENTS.md
```

Claude-specific instructions can follow below the import. A symlink (`ln -s AGENTS.md CLAUDE.md`) also works when nothing extra is needed, but requires Administrator or Developer Mode on Windows — prefer the import.

Verify it loaded rather than assuming: in a Claude Code session, `/context` lists what's under **Memory files**.

Three files with the same rules disagree within a month and nobody can tell which one the agent read.

Keep `AGENTS.md` short. It should say what the project is, how to build and test it, where specs and conventions live, and nothing a linter already enforces.

Use the recorded `package_manager` in every command example. Do not write `npm install` in a pnpm repo, or the reverse.

If the repo has a secrets convention — even just "`.env` is gitignored; copy `.env.example`" — put that in `AGENTS.md` in two lines. Also: never print `.env` contents, never commit the file, never paste secrets into a ticket or a spec. That is agent-facing, and a linter will not say it.

### 6. Hand back

- The config path, and each command with a pass/fail from step 4.
- What you detected vs what I told you — including package manager, any install-time security already configured, and secrets hygiene (ignored / tracked / example file).
- Which areas are set up, and the next skill to run for each: `conventions-decide`, `spec-author-from-impl`, or `author-implementation-plan`.
- Anything you had to guess at.

## Quality gate

- [ ] Every command in `commands` was executed and passed, or was dropped.
- [ ] CI's commands and the config's commands agree — if they differ, that's reported, not silently reconciled.
- [ ] `package_manager` matches the lockfile / `packageManager` field, or was omitted because there isn't one.
- [ ] No package manager was recommended or switched.
- [ ] No install-time security control was enabled without being asked.
- [ ] No placeholder values left in the written file.
- [ ] `AGENTS.md` exists and tool-specific files point at it rather than duplicating it.
- [ ] Existing agent instruction files were merged, not clobbered.

## Anti-patterns

- **Asking what you could detect.** Reading the CI workflow takes one tool call and is more accurate than my memory of it.
- **Writing commands you didn't run.** The most common cause of a skill mysteriously failing later.
- **Prescribing a package manager.** Detect, pin, move on. A preference for pnpm is an opinion; the repo's lockfile is a fact.
- **Silently turning on a cooldown or script allowlist.** Those change the next install. Mention the gap; `conventions-decide` is where they get enabled, if they want them.
- **Treating missing security knobs as a failed setup.** This plugin is a helper. A repo with no cooldown is normal, not broken.
- **Copying rules into three tool-specific files.** One canonical file; pointers elsewhere.
- **A long `AGENTS.md`.** Everything a linter enforces should be absent from it. Long always-on files get skimmed.

## Related skills

- `conventions-decide` — decide and enforce code conventions
- `spec-author-from-impl` — start the spec estate from existing code
- `author-implementation-plan` — turn a design into executable chunks
