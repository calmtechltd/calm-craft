# Engineering configuration

`.engineering/config.yaml` records repository settings for Calm Craft skills and the CLI. This reference defines the format; [the schema](../assets/engineering/config.schema.json) defines structural constraints. The CLI bundles the schema and validates offline. Repository commands are data until an authorized agent workflow executes them.

## Versions and validation

New setup output uses `version: 2`. Version 1 remains supported without rewriting files. `version` is required and versions other than 1 or 2 fail. It is independent of `spec_version`, the spec content format, which defaults to 1 and currently supports only 1.

`calmcraft config validate [file]` checks the complete YAML contract, command references, and compatibility with any `calmcraft.json` in the same repository. Without a file argument, it discovers the current Git repository and checks `.engineering/config.yaml`. Missing validation input is an error. Validation never runs commands, starts services, reads secrets, installs dependencies, or writes repository files.

`view` and `generate` accept absent configuration. They check syntax, version, and shared declarative settings but do not reject an estate because unrelated gate metadata is malformed. Duplicate YAML keys, malformed shared values, unsafe paths, and conflicting shared settings fail with file/key guidance. Diagnostics omit input values. Config reads are bounded to 64 KiB and files/parent paths must resolve within the selected repository; config-file symlinks are rejected.

## Fields and defaults

Only `version` is required. Omit inapplicable sections. Missing maps/lists normalize to empty; explicit `null` is invalid. `gates` missing or empty records no gates; it is not proof the repository has no CI requirements. Agents must inspect actual CI before claiming readiness.

| Field                          | Meaning and default                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `languages`                    | Optional language names. Empty list is allowed.                                                                                                |
| `package_manager`              | Detected manager name. The repository's existing manifest owns any version pin.                                                                |
| `paths.specs`                  | Spec root, default `specs`.                                                                                                                    |
| `paths.plans`, `paths.reports` | Optional repository locations. Consumers use existing repo conventions, then `.plans/` or `.reports/`, when absent.                            |
| `paths.conventions`            | Optional convention file; conventional fallback `.engineering/conventions.yaml`.                                                               |
| `paths.goal`                   | Optional instruction overlay. A configured path is not permission to create a persistent goal.                                                 |
| `spec_version`                 | Spec content version, default 1.                                                                                                               |
| `commands`                     | Arbitrary named commands, default empty map. Names start with a letter and contain letters, digits, `_`, or `-`.                               |
| `gates`                        | Ordered required check entries, default empty list. Commands outside this list are optional unless repository policy separately requires them. |
| `vcs.default_branch`           | Optional plain branch name, such as `develop`.                                                                                                 |
| `vcs.review_base`              | Optional explicit comparison Git ref, such as `upstream/develop`.                                                                              |
| `vcs.pr_cli`                   | `gh` or `none`, optional.                                                                                                                      |
| `tickets.provider`             | `none` (default), `github`, `linear`, `jira`, or `custom`. The last three require `pattern` and `url` containing `{id}`.                       |
| `tests.suites`                 | Named suites, default empty map. Suite membership alone does not require a test run.                                                           |
| `review.always_check`          | Repository review requirements, default empty list.                                                                                            |

Paths and command `cwd` are relative to the repository root. `cwd` defaults to `.`. Normalize slash direction and an optional leading `./`/trailing slash; reject absolute paths, drive paths, NULs, empty segments, and `..`. Filesystem readers retain containment checks for existing symlinks. Workflow output paths must not escape the repository through a symlink.

Version 2 rejects unknown fields, except arbitrary names in commands, suites, and gate context. Version 1 allows unknown top-level repository extensions with warnings; their contents are not validated. Known nested sections still follow the documented contract. Do not discard extensions during a requested migration; preserve or resolve them explicitly.

## Shared settings and JSON compatibility

The CLI and agent workflows use the same spec root. Existing `calmcraft.json` remains readable. Resolve each setting separately:

| YAML                        | Legacy JSON                 | Result                               |
| --------------------------- | --------------------------- | ------------------------------------ |
| Absent                      | Absent                      | Default                              |
| Valid explicit field        | Absent field                | YAML value                           |
| Absent field                | Valid explicit field        | JSON value                           |
| Matching normalized fields  | Matching normalized fields  | Shared value                         |
| Conflicting explicit fields | Conflicting explicit fields | Error naming both file/key locations |
| Invalid consumed field      | Any                         | Error; do not guess a fallback       |

Correspondences are `paths.specs` → `specsRoot`, `spec_version` → `specVersion`, and `vcs.review_base` → `defaultBase`. Compare trimmed Git refs as text, not by whether they happen to point to the same commit. `specs/` and `specs` are equivalent. Partial YAML does not erase JSON fields. Neither loading nor validation migrates/deletes a file.

`default_branch` is a branch name, while `review_base` is a comparison ref. An explicit JSON review base may intentionally differ from the default branch. Once configuration is valid and consistent, `--base` wins; otherwise use the explicit shared review base, then `origin/<default_branch>` when recorded, then the existing `origin/HEAD` and conventional-ref fallbacks. A configured candidate that cannot resolve retains the existing fallback behavior. Local configuration reads never fetch.

## Commands and gates

```yaml
version: 2
package_manager: pnpm
commands:
  types: pnpm check-types
  unit: pnpm test:unit
  build: pnpm build
  browser_install: pnpm exec playwright install --with-deps chromium
  browser: pnpm test:e2e
  format: pnpm format
gates:
  - types
  - id: unit-node24
    command: unit
    context: {node: "24", os: linux}
  - id: browser-node24
    command: browser
    prerequisites: [build, browser_install]
    context: {node: "24", os: linux, job: browser}
```

A string command is trusted shell text. A structured command has exactly one of `argv` (a nonempty argument array with a nonempty executable) or `shell` (nonempty shell text), and optional `cwd`. No command object accepts environment values or secrets. This registry also holds helpers such as migration/checkpoint commands; recording them is not authorization to execute them.

A string gate uses its command name as its ID. An object requires `id` and `command`; `prerequisites` and `context` default to empty. Gate IDs are unique and all references name registered commands. Prerequisites are ordered command references, with no recursive workflow graph. A prerequisite cannot be the gate's own command. Gate and prerequisite commands must not contain an unresolved `{file}` template.

Context values are strings describing relevant runtime/OS/profile requirements. A local Node 24 pass cannot establish a Node 22 or Linux pass. Context records evidence requirements, not automatic environment switching. Check prerequisites in the same relevant context and reuse current equivalent evidence. Keep unavailable checks unverified and preserve valid commands that expose code failures. Reconcile the recorded gates with actual CI rather than treating missing entries as permission to omit required checks. A formatter can gate CI; its name does not make it optional.

The packaged [Quality example](../assets/engineering/quality.example.yaml) describes the repository's separate Node 22, Node 24, and browser jobs. Its list is a local verification sequence, not a total ordering of those CI jobs. Manual publication/smoke jobs are not PR merge gates merely because they exist.

## Test suites and targeted commands

```yaml
version: 2
commands:
  unit: pnpm test:unit
  unit_file: {argv: [pnpm, exec, vitest, run, "{file}"]}
  browser: pnpm test:e2e
  browser_file: {argv: [pnpm, exec, playwright, test, "{file}"]}
tests:
  suites:
    unit:
      files: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"]
      framework: vitest
      location: colocated
      command: unit
      targeted: unit_file
    browser:
      files: ["test/e2e/**/*.spec.ts"]
      framework: playwright
      location: tests-dir
      command: browser
      targeted: browser_file
```

Each suite requires a nonempty `files` list. Optional `framework` is descriptive. `location` is `colocated`, `tests-dir`, or `mirrored-tree`. Optional `command` and `targeted` reference the registry; a full-run command cannot contain `{file}`. A v2 targeted reference requires an `argv` command with exactly one whole `{file}` argument and no embedded placeholder elsewhere, including `cwd`.

Patterns are case-sensitive, repository-root-relative slash paths. Use `*` for one segment, `**` for zero or more segments, and `?` for one character. Supply separate patterns instead of brace expansion, extglobs, or negations. When zero suites match, inspect existing repository conventions; when several match, select explicitly. Never choose the first suite silently or execute every match.

Substitute the selected repository file as a single argument relative to command `cwd`, prefixed with `./` when needed so a leading dash cannot become an option. For `cwd: packages/api`, `packages/api/src/orders.test.ts` becomes `./src/orders.test.ts`. Preserve spaces and shell characters as literal argument content; do not join the array into shell text. Suite selection and argument preparation do not execute the test. This format introduces no test runner or glob engine.

## Version 1 compatibility

V1 keeps string-only `commands`, string `gates`, optional string-map `non_gating`, `tests.location`, `tests.unit`, `tests.integration`, and `commands.test_file`. Merge `non_gating` into the normalized registry; duplicate names must have identical definitions or fail. A gate referencing that merged registry is still a gate regardless of its source map.

Represent v1 test patterns as one legacy suite. Include `commands.test` and `commands.test_file` when present, without inventing another runner or extra patterns. Legacy targeted shell templates must have one `{file}` placeholder. Execution workflows must quote the filename for the actual shell and handle leading-dash/options safely; unsupported substitution is reported instead of guessed. V2 setup uses argument arrays. Migration occurs only in an authorized setup/edit task and retains working settings and repository extensions.

`.engineering/dev.yaml` owns service stacks and environment-sync mappings. These are not fields in this configuration. The repository's existing package manifest owns package-manager pins. The schema and this reference are hand-maintained sources; generated build output and lockfiles remain owned by their tooling.
