---
id: calmcraft-engineering-config
area: CalmCraft
status: implemented
---

# Engineering Configuration

A repository can record its engineering workflows once and use consistent settings in Calm Craft skills and the CLI. Invalid settings produce repair guidance without running project commands or changing repository files.

## Behaviours

### B1 — Validate without side effects 🟢 implemented

A developer can validate a complete engineering configuration offline. Malformed fields, duplicate keys, unsupported versions, unsafe paths, and invalid references receive location-aware diagnostics without exposing input values. Validation does not execute recorded commands or write repository files.

### B2 — Share settings across consumers 🟢 implemented

Skills, live view, and generated estates use the same configured spec root and review settings. Existing JSON settings remain supported per field; matching values succeed, conflicting explicit settings fail, and partial YAML preserves omitted JSON settings. A branch name remains distinct from an explicit comparison ref.

### B3 — Record repository commands 🟢 implemented

A repository can record named shell or argument-array commands with a working directory. Reading a definition grants no permission to execute it. Version 1 shell definitions remain supported.

### B4 — Preserve required verification evidence 🟢 implemented

A repository can describe ordered gates, prerequisites, and relevant environment requirements. Unknown references or duplicate gate IDs fail validation. Agents preserve real CI requirements and report unavailable environments as unverified; a pass in one runtime is not evidence for another.

### B5 — Select targeted test suites 🟢 implemented

A repository can describe multiple test runners and layouts. Agents select an explicit matching suite and preserve filenames as literal arguments. Missing or ambiguous matches require inspection or selection instead of guessing a runner.

### B6 — Set up compatible configuration 🟢 implemented

Setup writes the current format from detected repository facts and preserves existing settings. Version 1 remains readable without automatic migration. Unknown legacy extensions are surfaced, and a requested migration cannot silently discard them.

### B7 — Distribute the offline contract 🟢 implemented

The installed package contains the configuration reference, schema, and examples. Validation works without a Calm Craft source checkout or remote schema download.

## Rules (Invariants)

- Loading, validating, viewing, and generating do not execute recorded engineering commands.
- Configuration reads and validation do not rewrite or migrate configuration files.
- Engineering format version and spec content version are independent.
- A missing required verification result is not a passing result.
- Service and environment-sync declarations stay in their existing owning configuration.

## Decision Tables

| Shared YAML field | Legacy JSON field | Outcome                         |
| ----------------- | ----------------- | ------------------------------- |
| Absent            | Absent            | Documented default              |
| Valid             | Absent            | YAML setting                    |
| Absent            | Valid             | JSON setting                    |
| Matching          | Matching          | Shared setting                  |
| Conflicting       | Conflicting       | Explain both file/key locations |
| Invalid           | Any               | Repair guidance; do not guess   |

| Validation request  | Configuration condition                        | Outcome                                       |
| ------------------- | ---------------------------------------------- | --------------------------------------------- |
| Complete validation | Unrelated malformed gate                       | Validation error                              |
| Estate read         | Unrelated malformed gate                       | Read healthy estate using valid shared fields |
| Any read            | Unsupported version or malformed shared fields | Configuration error                           |
| Complete validation | Unknown top-level v1 extension                 | Warning; extension remains unvalidated        |
| Complete validation | Unknown v2 field                               | Validation error                              |

## User Flows

_None._

## Open Questions

_None._

## Future Considerations

- An explicitly requested migration assistant if format changes make manual migration burdensome.

## Out of Scope

- Executing CI, generating workflows, or changing branch protection.
- Automatically migrating configuration during reads.
- Replacing service-stack or secret-sync configuration.
- Test generation and coverage services.

Field definitions and compatibility rules: [engineering configuration reference](../../references/engineering-config.md). Adjacent contracts: [CLI distribution](./cli-distribution.md), [repository sources](./repository-sources.md), and [spec model](./spec-model.md).
