---
id: calmcraft-dev-all
area: CalmCraft
status: implemented
---

# Local service stacks

A project declares its local services in `.engineering/dev.yaml`. `calmcraft dev-all` starts that stack with ports that stay attached to its Git checkout. The runner belongs to Calm Craft; project commands, ranges and wiring belong to the project.

## Behaviours

### B1 — Validate a small declarative stack 🟢 implemented

Version 1 supports named ports, named services, argument-array commands, environment overrides, HTTP readiness, dependencies, shared services and optional environment reload. `${ports.name}` expands to a port and `${urls.name}` to its localhost origin. Invalid fields, overlapping port ranges, unknown references and dependency cycles fail before any project command starts. Commands execute directly without a shell. Configuration is trusted project code: starting a stack is explicit permission to run its listed commands. Readiness never follows redirects or prints response bodies.

### B2 — Remember and reserve checkout slots 🟢 implemented

The primary checkout uses slot zero. Each linked worktree receives an unused slot on its first successful start and remembers it across shutdowns and reordered restarts. All managed ports are derived from that slot. The shared Git directory retains assignments and temporary process leases, without credentials. A short registry lock serialises concurrent launches. Leases use PID plus process start time, so crashed processes and reused PIDs cannot hold a slot indefinitely. An interrupted registry write fails with specific local repair guidance rather than guessing at a concurrent owner's state.

Repeating `dev-all` for a live registered stack in this checkout reports its URLs and exits successfully without spawning another stack. A live lease with different port wiring is refused. Port checks cover IPv4 and IPv6 loopback explicitly as well as wildcard interfaces. A remembered port conflict with an unregistered or unrelated listener fails before any service starts, clearly without switching slots or terminating another instance. New worktree allocation can skip an occupied, unassigned slot. `--status` reports this checkout's assignment and owner status. `--reset-slot` forgets only this checkout's inactive assignment. Archived worktrees' assignments can be reset before deletion; they are not silently recycled.

### B3 — Start dependencies and manage only owned processes 🟢 implemented

Services start in dependency order, with each HTTP readiness check succeeding before later services start. Readiness has a bounded deadline. Failed startup or an unexpected managed-service exit stops this stack and returns a non-zero status, preserving the original child failure instead of reporting a secondary readiness timeout. Normal cancellation stops only this runner's owned process groups, waits for child completion and releases its temporary lease. The remembered assignment remains. Repeated cancellation signals do not interrupt cleanup. Stubborn processes receive SIGKILL after five seconds. The runner never opens a browser. This process-group implementation supports macOS and Linux.

### B4 — Reload local environment on the same ports 🟢 implemented

Environment files are read in configured order (defaults: `.env`, `.env.local`, `.env.development`, `.env.development.local`). Service overrides are applied last. File creation, replacement, edits and removal trigger a debounced reload of managed services marked `reloadEnv`, in dependency order. Removed file values do not survive from an earlier launch. Other services keep running. Restart or environment-watcher failure stops the stack; port identities remain stable.

### B5 — Depend on a shared service without taking ownership 🟢 implemented

A service marked `shared: true` has a readiness check and no command. Its readiness port is also marked shared and has a fixed base rather than a worktree offset. The runner checks it before its dependants, but never reserves its port, starts it, restarts it or stops it. Unavailable shared services block startup with repair guidance. Shared does not mean the runner silently starts a singleton; its lifecycle belongs outside this stack.

### B6 — Declare secret sources and remote destinations in the stack YAML 🟢 implemented

The same versioned stack YAML optionally declares named 1Password sources and named service targets. An item source includes all fields with valid environment variable labels when its `variables` list is omitted. The optional list accepts exact names and case-sensitive `*` patterns matching whole labels; overlapping selectors select each field once. An optional `exclude` list accepts the same names and patterns for item and template sources; exclusions take precedence over inclusion and single-variable selection before value validation or writes. Dry runs show the exclusions. Item metadata and notes are ignored. Sources can also use existing templates of secret references and public values. Each target maps its destination environments to named sources. Development, preview and production may use different sources, share one explicitly, or be omitted. GitHub environment names retain their configured case. Unsupported providers, unknown source mappings and ambiguous source declarations are refused.

### B7 — Sync a selected target and environment deliberately 🟢 implemented

`calmcraft env-sync` requires a named target and an environment, or an explicit selection of all environments mapped on that target. It reads the dev-all YAML, supports Vercel project variables and GitHub Actions environment secrets, and can restrict the selection to one variable. The default dry run shows names or wildcard selectors and destinations without reading secrets or contacting providers. Applying discovers wildcard item fields, resolves selected values and sets the selected remote variables. A single-variable selection narrows discovery before validating values, so an empty unrelated field does not block it. Starting `dev-all` never triggers sync. Values and raw provider responses are never printed; secret values stay out of subprocess arguments and saved state.

### B8 — Report sync failures without hiding partial changes 🟢 implemented

Missing source fields, unreadable templates, absent selected variables, unmatched patterns, duplicate selected item labels and empty secret values fail before remote writes. Every selected secret is resolved before any write begins, retaining original whitespace and newlines. Vercel records spanning multiple environments are refused before writing, rather than risking another environment's value; branch-specific overrides are preserved. Writes update selected keys without deleting unrelated keys or automatically redeploying. A provider failure, including a failure inside a successful HTTP response, stops the run and reports the failed variable and number of confirmed writes. Earlier writes remain applied and an unconfirmed request may have applied; retrying sets the selected values again.

## Rules (Invariants)

- No deployment, Docker lifecycle or database provisioning adapters in version 1.
- Project port ranges must be distinct from other simultaneously running projects. OS port probes and strict project bindings catch conflicts; registry claims coordinate worktrees of the same project.
- Managed commands must bind their supplied ports strictly; the runner cannot prevent an arbitrary command from ignoring configuration.
- Local slots and ports isolate services, not data. Separate Neon branches or other database namespaces are a project setup concern; credentials stay in ignored environment files.
- The runner does not copy credentials from another checkout, migrate databases or run setup commands implicitly.
- No telemetry, automatic browser opening or global installation is required.
- Configuration and source changes do not hot-reload the runner itself; stop and restart deliberately.

## Decision Tables

| Service configuration             | Startup                                           | Shutdown                     |
| --------------------------------- | ------------------------------------------------- | ---------------------------- |
| Managed command, isolated ports   | Reserve, start, await readiness                   | Stop owned process group     |
| Shared service, shared fixed port | Check readiness only                              | Leave running                |
| Live matching checkout lease      | Report URLs, exit successfully; no new processes  | Leave existing stack running |
| Remembered port occupied          | Fail without reassigning                          | Leave other instance alone   |
| Environment edit                  | Restart marked managed services on the same ports | Other services keep running  |

## User Flows

_None. This is a local developer command._

## Open Questions

_None blocking version 1._

## Future Considerations

Container lifecycle and remote preview integration require separate demonstrated use cases and ownership contracts. They are not inferred from a command name.

## Out of Scope

Docker-specific container cleanup, shared-service provisioning, tunnels, remote deployment, Windows process management, and database branch creation on each startup.
