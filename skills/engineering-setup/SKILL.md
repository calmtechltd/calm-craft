---
name: engineering-setup
description: Discover and record the repository toolchain, CI gates, paths, and selected agent instructions. Use when setting up or repairing Calm Craft configuration; inspect commands before running only necessary authorized checks.
---

# Engineering Setup

Record the repository's existing toolchain and selected workflows in `.engineering/config.yaml`. Setup does not run a delivery loop, change conventions, or migrate the repository to another package manager.

Format authority: [engineering configuration](../../references/engineering-config.md). Shared spec-root and review settings also feed the CLI. Preserve legacy JSON settings per field and surface conflicts; a default branch is distinct from an explicit review base.

## Discover

Read project manifests, lockfiles, CI workflows, tool configs, existing agent instructions, and contributing docs. Establish:

- Languages/frameworks; package manager and pinned version; types, lint, formatting, tests, dead-code and generation commands.
- Which commands actually gate CI, ordered prerequisite commands, and relevant runtime/OS/job contexts, including separate browser jobs. Use arbitrary named registry commands rather than a fixed types/lint/test checklist. A formatter is gating when CI requires it.
- Spec, plan, report, convention, and test locations. Infer the default branch from repository configuration or `origin/HEAD`, rather than assuming main/master.
- Existing ticket policy from documentation before sampling commit history. Default to `tickets.provider: none` when none is recorded.
- Optional migration and checkpoint helpers, recording their commands without executing them.
- Existing package-manager install controls and secrets hygiene. Surface a tracked secret file without printing its contents or silently deleting it. Do not add controls, scanners, or example keys outside the requested setup scope.

When signals disagree, show the concrete conflict. Ask only consequential questions that inspection and existing instructions cannot answer. Present a draft config for correction when needed; do not require another confirmation of decisions already supplied. The user may select conventions, specs, delivery, or any subset.

## Write the configuration

Use the existing repository paths and detected commands. New configurations use version 2 under the [format reference](../../references/engineering-config.md) and [schema](../../assets/engineering/config.schema.json). Omit unused fields and placeholders. Start with the [minimal example](../../assets/engineering/minimal.example.yaml); the [Quality example](../../assets/engineering/quality.example.yaml) shows multiple CI contexts and test suites, not requirements to copy into every repo.

```yaml
version: 2
package_manager: pnpm
paths:
  specs: specs/
commands:
  test: pnpm test
  test_file: {argv: [pnpm, exec, vitest, run, "{file}"]}
gates: [test]
tests:
  suites:
    unit:
      files: ["src/**/*.test.ts"]
      framework: vitest
      location: colocated
      command: test
      targeted: test_file
```

Substitute the detected manager, runner, paths, and real CI gates. Record arbitrary command names, working directories, ordered prerequisite references, and relevant environment context. Helpers such as `db_generate`, `db_migrate`, and `checkpoint_commit` belong in the same registry when already present; they do not become gates or gain execution authorization merely by being recorded.

Keep `vcs.default_branch` as a plain branch name; record `vcs.review_base` only for an intentional comparison ref. Shared YAML settings and legacy JSON values must agree where both are explicit. Keep engineering `version` independent of content `spec_version`. Do not duplicate service or environment-sync mappings from `.engineering/dev.yaml`.

Preserve version 1 files unless migration is part of the requested setup/edit. For an authorized migration, normalize `non_gating` into `commands`, retain gate membership, and convert legacy test metadata into a suite. Inspect unknown repository extensions: preserve them in an appropriate repository-owned source or leave migration unresolved, never silently drop them. Do not rewrite configuration during validation.

## Verify definitions without running unrelated operations

Run `calmcraft config validate` when the available CLI supports it; otherwise inspect the packaged schema and record validation as unverified. This read-only command validates definitions and compatibility without executing them. Check that scripts/executables exist, prerequisites and contexts are represented, and `gates` matches actual CI. A targeted command is a template: substitute a real in-scope file only when that test run is needed. Select the matching suite explicitly when patterns overlap; inspect existing tests when metadata is incomplete.

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
