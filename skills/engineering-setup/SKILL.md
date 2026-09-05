---
name: engineering-setup
description: Discover and record the repository toolchain, CI gates, paths, and selected agent instructions. Use when setting up or repairing Calm Craft configuration; inspect commands before running only necessary authorized checks.
---

# Engineering Setup

Record the repository's existing toolchain and selected workflows in `.engineering/config.yaml`. Setup does not run a delivery loop, change conventions, or migrate the repository to another package manager.

## Discover

Read project manifests, lockfiles, CI workflows, tool configs, existing agent instructions, and contributing docs. Establish:

- Languages/frameworks; package manager and pinned version; types, lint, formatting, tests, dead-code and generation commands.
- Which commands actually gate CI and their prerequisites, including separate browser jobs.
- Spec, plan, report, convention, and test locations. Infer the default branch from repository configuration or `origin/HEAD`, rather than assuming main/master.
- Existing ticket policy from documentation before sampling commit history. Default to `tickets.provider: none` when none is recorded.
- Optional migration and checkpoint helpers, recording their commands without executing them.
- Existing package-manager install controls and secrets hygiene. Surface a tracked secret file without printing its contents or silently deleting it. Do not add controls, scanners, or example keys outside the requested setup scope.

When signals disagree, show the concrete conflict. Ask only consequential questions that inspection and existing instructions cannot answer. Present a draft config for correction when needed; do not require another confirmation of decisions already supplied. The user may select conventions, specs, delivery, or any subset.

## Write the configuration

Use the existing repository paths. Omit unused keys and placeholder commands. This example describes the supported shape, not commands to execute:

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
  # Record existing commands; gates below select the CI requirements.
  # `setup` is any generation or codegen step CI runs BEFORE the gates.
  # Skip it and later gates fail on missing generated files — a phantom
  # failure on a perfectly clean branch.
  setup: <pre-gate generation command, if any>
  types: <type check command>
  lint: <lint command>
  deadcode: <dead code command>
  test: <full test command>
  test_file: "<command with {file} placeholder>"
  # Optional delivery-loop commands. Omit if the repo has none.
  # Tests that build their database from source schema must not run
  # these merely to see a change. checkpoint_commit is a local
  # Graphite-style helper (e.g. calm-commit), not a push.
  db_generate: <schema / migration generate>
  db_migrate: <apply migrations to a real database>
  checkpoint_commit: <local checkpoint commit>

# Commands that gate a merge, in order. Remove nonexistent example entries.
gates: [setup, types, lint, deadcode, test]

# Other commands. Run only when relevant and required for the task.
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

## Verify definitions without running unrelated operations

Check that scripts/executables exist, syntax is appropriate, prerequisites are represented, and `gates` matches CI. A `test_file` entry is a template: substitute a real in-scope file only when that test run is needed.

Apply [write-tests](../write-tests/SKILL.md) for verification ownership and scope. Execute a safe check only when necessary to establish the setup result and permitted by the task. Do not run full suites, migration/generation helpers, or checkpoint commits merely to validate their names. A configured command is not authorization to execute it.

Distinguish a malformed command from a valid command exposing a code/environment failure. Correct the former from the source configuration; retain the latter and report its status. Do not drop genuine CI gates to obtain a passing setup. Report commands as inspected, run/passed, failed, or unverified, with reasons where needed.

## Bootstrap selected files

When specs are selected, create missing files beneath `paths.specs` from the packaged sources:

- [Spec format](../../references/spec-format.md) → `README.md`.
- [Spec template](../../assets/specs/_template.md) → `_template.md`.
- [Flow template](../../assets/specs/_flow-template.yaml) → `_flow-template.yaml`.

Existing format guides and templates belong to the repository. Inspect them and report drift rather than overwriting them. Do not bootstrap unselected areas.

Create or update `AGENTS.md` within the authorized setup scope, preserving existing instructions. Keep it focused on project context, actual commands, paths, and rules tools cannot enforce. Use the recorded package manager in examples. Use supported imports/pointers for other hosts rather than duplicating instructions; inspect the host's current loading mechanism when needed. For Claude Code, an existing `CLAUDE.md` can import `@AGENTS.md`; preserve any additional local instructions. Verify loading through the host when available instead of assuming a pointer is followed.

## Report

Give the config and instruction paths, detected versus user-supplied decisions, command verification status, selected files created or preserved, and unresolved configuration gaps. Suggest the next relevant workflow without automatically launching it.
