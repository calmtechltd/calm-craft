---
id: calmcraft-local-session-security
area: CalmCraft
status: future
---

# Local Session Security

CalmCraft opens private repository content in a browser without turning the developer's machine into a general file server. Each session limits network reach, filesystem reach, browser capabilities, and retained data.

## Behaviours

### B1 — Bind to loopback 🔵 future

The local server listens on `127.0.0.1` and an available port, or a developer-supplied available loopback port. It does not listen on a LAN or public interface.

### B2 — Require a session token 🔵 future

Each process creates an unpredictable session token. The initial application URL and every data request must present that token; a missing or incorrect token receives no repository data.

### B3 — Reject untrusted hosts 🔵 future

The server accepts loopback host headers for its active port and rejects other host values, including DNS rebinding attempts.

### B4 — Restrict browser capabilities 🔵 future

Responses set a Content Security Policy and related security headers that allow the bundled application to run without remote scripts, styles, fonts, frames, media, or network destinations.

### B5 — Keep assets self-contained 🔵 future

The package supplies its application code, styles, icons, and fonts. Opening a private repository does not request a third-party asset or analytics endpoint.

### B6 — Bound source access to known files 🔵 future

The browser can request source content only through identifiers created for parsed specs and flow contracts. The server resolves the identifier beneath the selected repository root and rejects traversal, absolute paths, links that escape the root, and unknown files.

### B7 — Sanitize rendered content 🔵 future

Repository Markdown cannot add scripts, event handlers, active embeds, unsafe links, remote images, or browser navigation that bypasses the session policy.

### B8 — Expose no repository write path 🔵 future

The server and browser application provide no endpoint or control that stages, edits, deletes, checks out, fetches, commits, or otherwise changes the selected repository.

### B9 — Send no telemetry 🔵 future

The v1 package contains no telemetry transport. It does not send repository identity, paths, spec content, usage, performance, or failures to CalmCraft or another service.

### B10 — Redact sensitive errors 🔵 future

Terminal and browser errors remove credentials, tokens, and sensitive URL query values while retaining the repository operation and repair guidance a developer needs.

### B11 — End the session cleanly 🔵 future

Shutdown closes the listener, invalidates the token, releases the port, and removes owned temporary remote data. A request after shutdown receives no session data.

## Rules (Invariants)

- A session token has process lifetime and is not written into the selected repository.
- No endpoint accepts an arbitrary filesystem path from the browser.
- Repository content cannot weaken response security headers.
- The application needs no external network request after package installation, except the explicit Git remote operation a developer starts.
- CalmCraft logs no secret-bearing remote URL.
- The browser cannot cause a repository write.

## Decision Tables

### Data request authorization

| Host                 | Token                | Resource identifier          | Result                             |
| -------------------- | -------------------- | ---------------------------- | ---------------------------------- |
| Active loopback host | Correct              | Known safe resource          | Return bounded session data        |
| Active loopback host | Missing or incorrect | Any                          | Reject without repository data     |
| Untrusted host       | Any                  | Any                          | Reject without repository data     |
| Active loopback host | Correct              | Unknown or escaping resource | Reject without file content        |
| Session stopped      | Formerly correct     | Any                          | No active listener or session data |

### Rendered link policy

| Link or asset                                           | Result                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| Safe in-session feature or source identifier            | Render as an application action                            |
| `https` or `mailto` text link allowed by product policy | Render with safe browser attributes                        |
| Script, data, file, or other active scheme              | Remove or render as inert text                             |
| Remote image, font, frame, media, script, or style      | Remove and record a content-safety finding when applicable |

## User Flows

_None._

## Open Questions

- **Settled:** v1 ships without a telemetry transport rather than providing an opt-out setting.
- **Settled:** Source access uses server-issued identifiers, not browser-supplied relative paths.

## Future Considerations

- A security-audited LAN sharing mode with explicit consent and separate authentication.
- Signed static exports that contain no source paths or session credentials.

## Out of Scope

- LAN or public hosting.
- Accounts, passwords, OAuth, and cloud storage.
- Repository editing, command execution, and arbitrary file browsing.
