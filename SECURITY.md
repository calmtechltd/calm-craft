# Security Policy

## Report a vulnerability

Report a private security issue through the [GitHub security advisory form](https://github.com/calmtechltd/calm-craft/security/advisories/new). Do not open a public issue with repository content, credentials, exploit details, or private paths.

## Local privacy contract

CalmCraft reads specs from the repository selected by the developer. The visualizer binds its server to loopback, sends no telemetry, and does not upload repository content. Remote repository sessions use the developer's installed Git authentication and temporary storage.

The browser receives only session-scoped, sanitized spec data and bounded source content. It cannot request an arbitrary local path or change the repository.

## Supported versions

Security fixes target the latest published minor release on supported Node.js versions. The project will publish an advisory when a fix requires users to upgrade. See [SUPPORT.md](SUPPORT.md) for the complete runtime and versioning policy.
