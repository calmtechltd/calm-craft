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
- **CI** — read the workflow files. The commands CI runs are the commands `ready-for-pr` must run; take them from there rather than guessing.
- **Default branch** — `git remote show origin`, falling back to `origin/HEAD`.
- **Ticket references** — sample recent commit messages and PR titles for an issue-key pattern.
- **Test layout** — colocated, `__tests__/`, or a mirrored tree; and how unit and integration tests are distinguished.
- **Existing agent instructions** — `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, `CONTRIBUTING.md`.

### 2. Confirm, don't interrogate

Present what you found as a filled-in draft config and ask me to correct it. One round of confirmation beats fifteen questions.

Ask only about what you genuinely could not detect:

- Where should working documents live — implementation plans, review reports? Suggest a gitignored directory if the repo has no convention.
- Where do specs live, if not `specs/`?
- Is the ticket URL template different from what the pattern suggests?
- Which of this plugin's three areas do I want — conventions, specs, delivery, or all three?

### 3. Write `.engineering/config.yaml`

```yaml
version: 1
languages: [typescript]

paths:
  specs: specs/
  plans: .plans/
  reports: .reports/
  conventions: .engineering/conventions.yaml

commands:
  # Exactly what CI runs, in CI's order. Omit any that don't exist.
  types: <type check command>
  lint: <lint command>
  format_check: <format check command>
  deadcode: <dead code command>
  test: <full test command>
  test_file: "<command with {file} placeholder>"

vcs:
  default_branch: <branch>
  pr_cli: gh              # or none

tickets:
  pattern: "<regex, e.g. ABC-\\d+>"
  url: "<url template with {id}>"

tests:
  location: colocated     # colocated | tests-dir | mirrored-tree
  unit: "<pattern, e.g. *.test.ts>"
  integration: "<pattern, e.g. *.integration.test.ts>"

review:
  # Conventions a reviewer must check every time in this codebase.
  always_check:
    - <e.g. permission checks on new endpoints>
    - <e.g. multi-tenancy scoping on queries>
```

Omit keys that don't apply rather than filling them with placeholders. A missing key is honest; a wrong command is a skill failing confusingly three weeks later.

### 4. Verify every command actually runs

Run each command in `commands`. A config full of commands that don't work is worse than no config, because skills will report their failures as *your code's* failures.

If a command fails, fix it or drop it — and say which you did.

### 5. Write `AGENTS.md`

If it doesn't exist, create it. If it does, propose a merge rather than overwriting.

`AGENTS.md` is the canonical instruction file — a real standard, read natively by most agents. Make tool-specific files thin pointers, never copies:

```markdown
<!-- CLAUDE.md -->
Conventions and workflow for this repo live in [AGENTS.md](AGENTS.md). Read it before writing code.
```

Three files with the same rules disagree within a month and nobody can tell which one the agent read.

Keep `AGENTS.md` short. It should say what the project is, how to build and test it, where specs and conventions live, and nothing a linter already enforces.

### 6. Hand back

- The config path, and each command with a pass/fail from step 4.
- What you detected vs what I told you.
- Which areas are set up, and the next skill to run for each: `conventions-decide`, `spec-author-from-impl`, or `author-implementation-plan`.
- Anything you had to guess at.

## Quality gate

- [ ] Every command in `commands` was executed and passed, or was dropped.
- [ ] CI's commands and the config's commands agree — if they differ, that's reported, not silently reconciled.
- [ ] No placeholder values left in the written file.
- [ ] `AGENTS.md` exists and tool-specific files point at it rather than duplicating it.
- [ ] Existing agent instruction files were merged, not clobbered.

## Anti-patterns

- **Asking what you could detect.** Reading the CI workflow takes one tool call and is more accurate than my memory of it.
- **Writing commands you didn't run.** The most common cause of a skill mysteriously failing later.
- **Copying rules into three tool-specific files.** One canonical file; pointers elsewhere.
- **A long `AGENTS.md`.** Everything a linter enforces should be absent from it. Long always-on files get skimmed.

## Related skills

- `conventions-decide` — decide and enforce code conventions
- `spec-author-from-impl` — start the spec estate from existing code
- `author-implementation-plan` — turn a design into executable chunks
