# Changelog

CalmCraft follows [Semantic Versioning](https://semver.org/). Release notes describe user-visible CLI, spec-contract, security, and compatibility changes.

## 0.2.0 — pending

- Add `calmcraft generate`, which writes the estate as one self-contained HTML file that opens from the filesystem with no server, port, or token.
- Add `generate --diff --base <ref>` and `--provenance`, which bake Branch Review into that file at generation time. `--provenance` chooses which layers are visible when the file first opens.
- Add Flows and Questions as first-class views, and stop counting unresolved questions as findings.
- Read flow references that wrap across several lines; they previously parsed as no flow at all.
- Rebuild the interface on bundled Geist with a single type scale and reserved semantic colour.
- Render every matching specification instead of the first 120.

## 0.1.0 — pending

- Add the local Atlas, Feature, Branch Review, and Health views.
- Add semantic comparison for committed, staged, unstaged, and untracked spec changes.
- Add read-only local checkout, linked worktree, and temporary private remote sessions.
- Add the CalmCraft Agent Plugin skills and format references to the npm package.
