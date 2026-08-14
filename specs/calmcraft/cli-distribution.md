---
id: calmcraft-cli-distribution
area: CalmCraft
status: partial
---

# CLI Distribution

A developer can install or invoke one npm package and run the `calmcraft` command on supported Node.js versions. The package has a small, inspectable release surface and verifiable provenance.

## Behaviours

### B1 — Run from the current repository 🟢 implemented

`calmcraft view` and `npx @calmcraft/cli view` open the current checkout or worktree when no source argument is present.

### B2 — Accept a local path or remote URL 🟢 implemented

The `view` command accepts one local repository path or supported Git remote URL. Remote branch selection uses `--branch`.

### B3 — Configure branch review 🟢 implemented

`--diff` opens Branch Review, `--base <ref>` selects the comparison base, and local-work controls include or exclude staged, unstaged, and untracked content without changing it.

### B4 — Control browser and port behaviour 🟢 implemented

`--no-open` leaves the browser closed and prints the URL. `--port <number>` requests an available loopback port and reports a conflict without selecting an unrelated port silently.

### B5 — Load declarative configuration 🟢 implemented

CalmCraft reads an optional `calmcraft.json` containing `specVersion`, `specsRoot`, and `defaultBase`. It rejects unsupported fields or invalid values and never executes repository configuration code.

### B6 — Provide useful command help and errors 🟢 implemented

`--help` documents commands, options, defaults, privacy, and examples. `--version` prints the package version. Invalid input and startup failure return a non-zero exit code with redacted repair guidance.

### B7 — Support maintained Node releases 🟢 implemented

The package supports the Node 22 and Node 24 LTS lines, and CI tests both. Any other major version fails before repository access with the supported range.

### B8 — Install without lifecycle scripts 🟢 implemented

Installing the package runs no preinstall, install, postinstall, prepare, or repository script. The package uses no native compilation owned by CalmCraft.

### B9 — Ship an explicit package surface 🟡 partial

The published package contains the executable bundle, self-contained browser assets, plugin manifests, skills, references, license, package manifest, and README. It excludes source fixtures, private content, reports, caches, and development configuration.

Partial delivery: the pack contract, executable mode, release documentation, and clean-install smoke runner are implemented; registry inspection still waits for the first release candidate.

### B10 — Publish with provenance 🟡 partial

CalmCraft publishes through trusted CI with npm provenance, an MIT license, a version tag, and release notes. A clean environment can verify the package identity and run local and remote smoke tests.

Partial delivery: stage-only trusted-publishing and cross-platform smoke workflows are implemented; npm scope ownership, the first-package bootstrap, release-candidate approval, and public promotion remain external release gates.

## Rules (Invariants)

- The executable name is `calmcraft`.
- The proposed package name is `@calmcraft/cli`; publication waits for confirmed scope ownership.
- The CLI and Agent Plugin manifests share one release version.
- The package has no install-time lifecycle script.
- Help and errors never print repository credentials or session tokens.
- The installed package can run without a source checkout of CalmCraft.

## Decision Tables

### Command outcome

| Invocation                                    | Result                                      |
| --------------------------------------------- | ------------------------------------------- |
| `calmcraft view` in a valid repository        | Open current estate                         |
| `calmcraft view <local-path>`                 | Open supplied local estate                  |
| `calmcraft view <remote-url> --branch <name>` | Open temporary remote estate                |
| `calmcraft view --diff --base <ref>`          | Open comparison against explicit base       |
| `calmcraft view --no-open`                    | Start session and print URL                 |
| Invalid command or option                     | Print help-oriented error and exit non-zero |

### Configuration source

| CLI option        | `calmcraft.json` value | Effective value                                         |
| ----------------- | ---------------------- | ------------------------------------------------------- |
| Present and valid | Any                    | CLI option                                              |
| Absent            | Present and valid      | Configuration value                                     |
| Absent            | Absent                 | Documented default                                      |
| Any               | Invalid configuration  | Explain invalid field and exit before repository access |

## User Flows

_None._

## Open Questions

- **Blocks B10:** An npm scope owner must confirm control of `@calmcraft`, bootstrap the as-yet-unpublished package, and configure the stage-only trust relationship before CI can stage the first product release.
- **Settled:** The repository and package use the existing MIT license.
- **Settled:** Development uses Node 24 and the runtime supports the Node 22 and Node 24 LTS lines.

## Future Considerations

- Package-manager-specific installers after npm usage proves demand.
- Signed standalone binaries for developers without Node.js.
- An explicit update check that sends no repository information.

## Out of Scope

- Automatic updates.
- Global configuration outside the selected repository in v1.
- Package publication from a developer laptop.
