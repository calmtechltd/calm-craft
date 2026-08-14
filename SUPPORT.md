# Support Policy

## Node.js

CalmCraft supports the Node.js 22 and Node.js 24 LTS release lines. Both run the unit and package gates in CI. Support for a new even-numbered Node.js LTS line begins only after it is part of that matrix and a CalmCraft release declares it.

Unsupported Node.js majors fail before CalmCraft reads a repository. Browser support follows the current versions bundled with supported desktop operating systems; the release smoke matrix covers current macOS, Ubuntu, and Windows runners.

## Versioning

CalmCraft follows Semantic Versioning. Before 1.0, a minor release may change a CLI or spec-contract boundary; patch releases remain backward-compatible fixes. After 1.0, incompatible public CLI or supported spec-contract changes require a major release.

The npm package, Agent Plugin manifest, Claude Code manifest, and CLI version must match. A published npm version is immutable. Release candidates use the `next` distribution tag; a tested version is promoted to `latest` without rebuilding its tarball.

CalmCraft does not support the removed `specs/_site/index.html` format or promise backward compatibility with the legacy renderer.

## Getting help

Use [GitHub Issues](https://github.com/calmtechltd/calm-craft/issues) for reproducible product problems that contain no private repository material. Use the private reporting path in [SECURITY.md](SECURITY.md) for vulnerabilities, credential exposure, or any report that requires sensitive repository details.
