# Contributing

CalmCraft keeps product intent in specs and ships one reviewable slice at a time.

## Local setup

Use Node 24 and pnpm 11:

```bash
pnpm install --frozen-lockfile
pnpm check-types
pnpm lint
pnpm test
pnpm build
```

The package supports Node 22 and newer at runtime. CI tests supported versions before release.

## Pull requests

- Link changed behaviour IDs and flow transitions.
- Add focused tests for changed behaviour and security boundaries.
- Exercise user-facing changes through the packed CLI.
- Keep private repository content out of fixtures, logs, screenshots, and reports.
- Do not commit `dist/`, browser reports, coverage output, or temporary Git repositories.

## Package boundaries

- `src/cli`: process entry point and lifecycle.
- `src/config`: declarative configuration.
- `src/git`: read-only repository access and snapshots.
- `src/specs`: parser, validation, rendering, and normalized data.
- `src/diff`: semantic comparison.
- `src/static`: single-file estate and review generation.
- `src/server`: loopback session server.
- `src/ui`: browser application.

The browser never receives an arbitrary filesystem reader or repository writer. Git commands use argument arrays and read-only operations unless a future spec adds a write path.
