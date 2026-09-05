# Question Bank

Select the axes and language questions relevant to the repository. Recommended defaults are marked ★; they are options, not existing rules. Record authorized defaults as `defaulted` and explicit choices as `decided`.

Reuse formatter decisions for whitespace, quotes, semicolons, and similar syntax. If no formatter is selected, start with Axis 1. Follow `conventions-decide` for question scope, provenance, and configuration ownership.

---

## Axis 1 — Formatting authority

| # | Question | Options |
| --- | --- | --- |
| 1.1 | Which tool owns formatting? | ★ One formatter, non-negotiable, runs in CI · Formatter with per-team overrides · None |
| 1.2 | Does formatting run automatically? | ★ Pre-commit hook or format-on-save, plus a CI check · CI check only · Manual |

If 1.1 is "one formatter, non-negotiable", every formatting question below is settled and won't be asked. That's the point of putting this first.

---

## Axis 2 — Module boundaries and exports

**TypeScript**

| # | Question | Options |
| --- | --- | --- |
| 2.1 | Default exports | ★ Banned everywhere · Allowed for route/page files only · Free |
| 2.2 | Barrel files (`index.ts` re-exports) | Banned · ★ Package/feature boundaries only · Free |
| 2.3 | What may cross a feature boundary? | ★ Only what a feature's public entry exports · Anything not `_`-prefixed · No boundary |
| 2.4 | Circular dependencies | ★ Fail the build · Warn · Unchecked |

Enforcement: `no-restricted-syntax` for default exports, an import-boundary rule or `dependency-cruiser` for 2.3–2.4.

For default exports, account for framework-required route/page exports before selecting a restriction.

---

## Axis 3 — Import discipline

**TypeScript**

| # | Question | Options |
| --- | --- | --- |
| 3.1 | Path aliases vs relative | Alias (`@/`) always · ★ Relative within a feature, alias across features · Relative only |
| 3.2 | Dynamic `await import()` | Banned · ★ Code-splitting only, with a lint allowlist · Free |
| 3.3 | Server-only modules | ★ Naming convention (`*.server.ts`) enforced by an import-boundary rule · Convention only, unenforced · N/A |
| 3.4 | Import ordering | ★ Enforced by tooling, nobody thinks about it · Conventional but unenforced |
| 3.5 | Banned imports | List them — deprecated internal modules, `lodash` in favour of natives, direct DB access from UI layers |

3.2 and 3.3 are the two that bite hardest. A stray dynamic import turns a static dependency graph into a runtime surprise and hides a module from dead-code analysis; a server module reaching a client bundle is a correctness *and* a security problem. Both are mechanically detectable, so neither belongs in prose.

---

## Axis 4 — File and unit size

| # | Question | Options |
| --- | --- | --- |
| 4.1 | File length cap | 400 · ★ 800 · 1000 · None |
| 4.2 | Is the cap an error or a warning? | ★ Error, with an explicit ignore list for genuinely large generated or config files · Warning |
| 4.3 | Function length cap | 50 · 100 · ★ None — file cap plus review is enough |
| 4.4 | Generated files | ★ Excluded from all limits and lint, and marked as generated |

A cap is a crude proxy for cohesion, and everyone knows it. It's still worth having, because it converts "this file has got out of hand" from an opinion someone has to voice into a signal that arrives on its own. Set it high enough that hitting it is genuinely informative.

---

## Axis 5 — Naming and file layout

| # | Question | Options |
| --- | --- | --- |
| 5.1 | Source file naming | ★ kebab-case · camelCase · PascalCase for type-bearing files |
| 5.2 | Directory organisation | ★ By feature, then by layer inside · By layer, then feature inside · Flat |
| 5.3 | Where do shared utilities live? | ★ Feature-local until used by a second feature, then promoted to shared · Always shared `lib/` · Anywhere |
| 5.4 | Is there a promotion rule? | ★ Yes — two consumers, and it moves · No, judgement call |
| 5.5 | Acronyms in identifiers | ★ Treated as words (`ApiUrl`, `parseHtml`) · Kept uppercase (`APIURL`) |

5.3 and 5.4 are the ones that decay silently. "Shared" directories become dumping grounds precisely because nobody wrote down what earns a place in one. A two-consumer rule is arbitrary but checkable, which is the only property that matters.

---

## Axis 6 — Type discipline

**TypeScript**

| # | Question | Options |
| --- | --- | --- |
| 6.1 | `any` | ★ Banned; `unknown` plus narrowing instead · Allowed with a justification comment · Warn only |
| 6.2 | Type assertions (`as`) | Banned outside tests and parse boundaries · ★ Allowed, flagged in review · Free |
| 6.3 | Suppression comments (`@ts-expect-error`) | ★ Requires a description and an issue reference · Allowed bare · Banned |
| 6.4 | `type` vs `interface` | ★ `type` unless you need declaration merging · `interface` for object shapes · No preference |
| 6.5 | Enums | ★ Banned; use union types or `as const` · Allowed · `const enum` only |
| 6.6 | `null` vs `undefined` | ★ `undefined` only in application code; `null` only where the database or an API forces it · Both, `null` means "explicitly empty" · No preference |
| 6.7 | Explicit return types on exported functions | ★ Required · Inferred is fine |
| 6.8 | Compiler strictness | ★ `strict: true`, no exceptions · Strict with named opt-outs |

6.1 and 6.3 are the load-bearing ones: escape hatches are fine, silent escape hatches are not. Requiring a reason turns each one into a decision someone can review rather than a hole nobody sees.

---

## Axis 7 — Error handling

| # | Question | Options |
| --- | --- | --- |
| 7.1 | Errors as exceptions or values? | ★ Throw at boundaries, typed results internally where a failure is expected · Throw everywhere · Result types everywhere |
| 7.2 | Catching | ★ Catch only where you can act; otherwise let it propagate to a boundary handler · Catch and log at each layer |
| 7.3 | Swallowed errors (empty catch) | ★ Banned, lint-enforced · Requires a comment · Allowed |
| 7.4 | Custom error types | ★ A small typed hierarchy for domain failures · Plain errors with codes · Ad hoc |
| 7.5 | What must never reach the user? | ★ Stack traces, internal IDs, raw database errors — write it down |

7.3 is the highest-value enforced rule in this axis and costs nothing to turn on.

---

## Axis 8 — Async and concurrency

**TypeScript**

| # | Question | Options |
| --- | --- | --- |
| 8.1 | Floating promises | ★ Banned — await it, return it, or mark it explicitly fire-and-forget · Warn · Unchecked |
| 8.2 | Sequential awaits in a loop | ★ Flagged; batch or parallelise deliberately · Unchecked |
| 8.3 | Is there a cancellation convention? | ★ Yes — long operations take an abort signal · No |

---

## Axis 9 — Tests

| # | Question | Options |
| --- | --- | --- |
| 9.1 | Test location | ★ Colocated with the module · `__tests__/` directory · Mirrored `test/` tree |
| 9.2 | Unit vs integration split | ★ Distinguished by filename suffix so they can be run separately · Same directory, undistinguished · Separate trees |
| 9.3 | What *must* have a test? | ★ Meaningful runtime regressions and non-trivial logic, using existing coverage when sufficient · Everything with a coverage threshold · Judgement |
| 9.4 | Coverage threshold in CI? | ★ No — it optimises for the wrong thing; use the rule in 9.3 · Yes, at a named percentage |
| 9.5 | Naming | ★ Describe the behaviour, not the function name |
| 9.6 | UI tests | ★ Presentational-leaf harness if the repo has one (`describeUi` or equivalent) · No component tests; walk the app · Testing Library on pages as the default |

For 9.3, apply `write-tests`: protect a plausible runtime failure with appropriate existing or new coverage. Prose, static guarantees, and implementation spelling do not acquire runtime tests because the change was called a bug fix.

For 9.6, apply `write-tests`: mount-only harness entries are visual fixtures, not automated behavioral coverage. Preserve required existing UI checks. Use focused browser verification when needed and permitted by the task and repository policy; honor explicit skips.

---

## Axis 10 — Dependencies

These are **policies**, not a product pick. 10.1 records the manager the repo already uses — detect it, pin it, do not convert the repo to a favourite. npm, pnpm, Yarn, and Bun (and uv, Poetry, Composer, Cargo…) instantiate the same answers with different config keys; `conventions-decide` writes the one the recorded manager understands, from that manager's current docs.

Offer install controls relevant to the pinned manager and task. Explain their practical tradeoffs briefly; preserve existing security policy and accepted decisions.

| # | Question | Options |
| --- | --- | --- |
| 10.1 | Package manager | ★ One, pinned in the manifest, enforced so a wrong-manager install fails · Whatever works |
| 10.2 | Lockfile | ★ Committed, and CI installs frozen · Committed, CI installs loose |
| 10.3 | Version ranges | ★ Exact for direct dependencies, managed by an update bot · Caret ranges |
| 10.4 | Bar for adding a dependency | ★ Named in the rules — what it must do to beat writing it yourself · No stated bar |
| 10.5 | Freshness policy | ★ Framework and runtime on current major within a stated window; everything else on the bot's schedule · Update when something breaks |
| 10.6 | Runtime version | ★ Pinned in the manifest and in CI · Unpinned |
| 10.7 | Release cooldown | ★ One day (or keep the manager's built-in default), with a named exclude list for urgent patches · Longer window (3–7 days) · Off |
| 10.8 | Install-time scripts | ★ Allowlist — only named packages may run install/build scripts · Manager default · Scripts run freely |
| 10.9 | Non-registry sources | ★ Transitive git/tarball dependencies blocked; a direct one is a recorded decision · Free |
| 10.10 | Trust downgrade | ★ Block it where the manager can · Unchecked |

A freshness policy and a release cooldown serve different purposes. Record any urgent-patch exception and align the update bot with the resolver's accepted window.

For install scripts, inspect which dependencies need them and use the manager's supported controls. Do not copy a generic allowlist. If an existing policy already settles the question, record it without reopening it.

Mark unsupported controls N/A. Verify manager-specific names and behavior in current official documentation before changing configuration. A failed install check needs diagnosis; do not weaken an accepted policy merely to make it pass.

---

## Axis 11 — Dead code

| # | Question | Options |
| --- | --- | --- |
| 11.1 | Unused exports | ★ Fail CI · Report only · Unchecked |
| 11.2 | Commented-out code | ★ Banned — that's what version control is for · Allowed with a reason |
| 11.3 | Feature-flagged dead paths | ★ Flags carry an expiry, and stale ones get reported · No policy |

---

## Axis 12 — Comments and documentation

| # | Question | Options |
| --- | --- | --- |
| 12.1 | When is a comment required? | ★ When the code can't say *why* — non-obvious constraints, workarounds, links to the reason · On every public function · Never required |
| 12.2 | Doc comments on exported API | ★ Required on anything crossing a package boundary · Required everywhere public · Optional |
| 12.3 | TODO comments | ★ Require an owner and an issue reference, or they're banned · Allowed bare |
| 12.4 | Comments restating the code | ★ Banned in review |

12.1 is the one that matters and the one that's hardest to enforce. Comments explaining *what* rot immediately and get ignored; comments explaining *why* are the only durable ones, and no linter can tell them apart. Pure Documented tier — write it down and enforce it in review.

---

# Other languages

Same twelve axes. These list the questions that carry real weight in each language — not literal translations of the TypeScript list. Where a language has already decided something, don't re-decide it: record it as settled and move on.

## Go

The closest thing to a solved problem, and a useful benchmark for the others: `gofmt` ends every formatting argument, `go vet` and the standard layout settle much of the rest. What genuinely remains:

- **Linting:** `golangci-lint` with a committed config, CI-enforced. Which linter set is on.
- **Error wrapping:** ★ wrap with `%w` and check with `errors.Is`/`errors.As` · sentinel errors · typed error structs. State which, because mixing them makes errors unmatchable.
- **`any` / `interface{}`:** ★ requires justification · free.
- **Context:** ★ first parameter, never stored in a struct, always propagated.
- **Panics:** ★ library code never panics; recover only at process boundaries.
- **Package layout:** naming (short, no stutter), and how deep `internal/` goes.
- **Struct embedding vs explicit composition.**
- **Tests:** ★ table-driven as house style · free-form.

## Rust

`rustfmt` is the authority and is not worth arguing about. What's left is mostly about escape hatches:

- **Clippy:** which lint groups are on (`pedantic`, `nursery`), and whether CI denies or warns.
- **`unwrap()` / `expect()`:** ★ banned in production paths, allowed in tests · `expect` with a message allowed · free. The single highest-value decision here.
- **`unsafe`:** ★ `#![deny(unsafe_code)]` at the crate root, lifted per module with a `// SAFETY:` comment · allowed with justification · free. This one is compiler-enforceable, so it belongs in the enforced tier.
- **Error handling:** ★ `thiserror` for libraries, `anyhow` for binaries · concrete enums throughout · mixed. Say which crates and where.
- **Module layout:** ★ `foo.rs` + `foo/` · `mod.rs`.
- **Crate-root re-exports (`pub use`):** the barrel-file question in Rust clothing.
- **Generics vs `dyn Trait`:** where the monomorphisation cost is worth it.
- **Workspace shape:** one crate or many, and what earns a new one.
- **MSRV:** pinned and tested in CI, or track stable.

## Java

- **Formatting:** ★ one formatter (google-java-format via Spotless) enforced in CI.
- **Null:** ★ `Optional` at API boundaries only, never as a field or parameter · nullability annotations checked by a static analyser · neither.
- **Lombok:** ★ banned — records and modern Java cover most of it · allowed for a named subset · free. Genuinely contested; decide it explicitly or it spreads.
- **Records vs classes** for data carriers.
- **Checked exceptions:** ★ avoid in new code; wrap at boundaries · use as designed.
- **`var`:** ★ when the type is apparent on the right-hand side · always · never.
- **Dependency injection:** ★ constructor injection; field injection banned.
- **Static imports:** ★ tests and constants only.
- **Package structure:** by feature or by layer.
- **Build:** Maven or Gradle, version catalogue, and whether the wrapper is committed.

## Kotlin

- **Formatting:** ★ ktlint or ktfmt as sole authority, CI-enforced.
- **`!!` (not-null assertion):** ★ banned outside tests · allowed with justification · free. The Kotlin equivalent of force-unwrap, and the same reasoning applies.
- **Nullability at the Java boundary:** where platform types must be narrowed, and who owns doing it.
- **Immutability:** ★ `val` by default; `var` needs a reason.
- **Coroutines:** ★ structured concurrency only — `GlobalScope` banned, every launch has an owning scope. Where `runBlocking` is acceptable, if anywhere.
- **Extension functions:** ★ defined next to the type they extend or in a named module — not scattered top-level · free.
- **Data classes vs value classes** for wrappers.
- **Explicit API mode** for anything published as a library.
- **Scope functions** (`let`, `run`, `apply`, `also`, `with`): whether the team standardises which to use when, or accepts all five.

## Swift

- **Formatting:** SwiftFormat or swift-format as sole authority; SwiftLint for rules. Both CI-enforced.
- **Force unwrap `!`:** ★ banned outside tests and `@IBOutlet` · allowed with justification · free. Same for force-try and force-cast.
- **Access control:** ★ explicit and minimal — `private` by default, widened deliberately · rely on the `internal` default.
- **Value vs reference types:** ★ structs unless identity or inheritance is genuinely needed.
- **Optionals:** `guard let` early return as house style, and where implicitly-unwrapped optionals are tolerated, if anywhere.
- **Concurrency:** strict concurrency checking on or off; `@MainActor` discipline for UI; whether detached `Task { }` work needs a stated cancellation story.
- **Singletons and `.shared`:** ★ named exceptions only, listed.
- **File layout:** one primary type per file; where extensions live; `// MARK:` conventions.
- **Dependencies:** SPM pinning policy and the bar for adding one. Same Axis 10 policies; instantiate with whatever the toolchain actually enforces.

## Python

- **Formatting and linting:** ★ one tool as authority (Ruff covers both), CI-enforced.
- **Type hints:** ★ required on public functions and checked by a type checker in CI · gradual · none. If checked, at which strictness, and error or warning.
- **Imports:** ★ absolute only · relative within a package. Whether `__init__.py` may re-export — the barrel-file question again.
- **Mutable default arguments:** lint-enforced ban. Cheap, and catches a real bug class.
- **Data structures:** ★ dataclasses for plain data, a validation library only at input boundaries · validation models throughout.
- **Exceptions:** custom hierarchy vs built-ins; bare `except:` banned.
- **Packaging:** which tool owns the environment (uv, Poetry, pip-tools), lockfile committed, Python version pinned. Release cooldown instantiates as uv's `exclude-newer` (or equivalent) — same policy as Axis 10.7, different flag.

## Ruby

- **RuboCop as sole authority**, config committed and CI-enforced — plus a policy for burning down `.rubocop_todo.yml` rather than growing it.
- **`frozen_string_literal`:** ★ required.
- **Guard clauses** over nested conditionals; method length and ABC-size thresholds.
- **Autoloading vs explicit `require`**, and where each applies.
- **Service objects / interactors:** whether they're the house pattern, and what their call signature is.
- **Metaprogramming:** where `define_method` and `method_missing` are acceptable, if anywhere.

## PHP

- **Standard and formatter:** ★ PSR-12 enforced by PHP-CS-Fixer or PHP_CodeSniffer in CI.
- **`declare(strict_types=1)`:** ★ required in every file. Lint-enforceable, and it changes real behaviour.
- **Static analysis level:** PHPStan or Psalm, and **which level** — the highest-value decision in PHP, because the level is the whole conversation. State it and the ratchet policy for raising it.
- **Final by default:** ★ classes final unless designed for extension · open.
- **Constructor property promotion** and readonly properties: house style or optional.
- **Framework conventions:** where the framework's opinion ends and yours begins — especially around fat models, service layers, and where business logic may not live.
- **Dependencies:** Composer lockfile committed, PHP version pinned in `composer.json` and CI. Axis 10.7–10.10 apply where Composer or the update bot can enforce them; skip what they cannot.

## C#

- **EditorConfig as the authority**, analysers on, warnings-as-errors in CI.
- **Nullable reference types:** ★ enabled solution-wide; policy on the `!` null-forgiving operator.
- **`var`:** ★ when the type is apparent on the right-hand side · always · never.
- **File-scoped namespaces**, one type per file.
- **Async:** `Async` suffix required; `ConfigureAwait` policy; ★ `async void` banned outside event handlers.
- **LINQ:** method vs query syntax; whether deferred execution may cross a boundary.
- **Dependency injection:** ★ constructor injection; where a service locator is tolerated, if anywhere.

## C++

The most contested list here, because the language supports several incompatible styles and teams genuinely differ:

- **Standard version:** pinned, and enforced by the build.
- **`clang-format` as sole authority**, config committed; `clang-tidy` check set chosen and CI-enforced.
- **Exceptions:** ★ on · off (`-fno-exceptions`). Games, embedded, and some finance shops turn them off, and it changes every error-handling decision downstream. Decide first; everything else follows.
- **RTTI:** on or off, for the same reason.
- **Ownership:** ★ smart pointers express ownership, raw pointers and references are non-owning views · free. Write the rule down; this is where the memory bugs come from.
- **Headers:** ★ `#pragma once` · include guards. Include-what-you-use enforced or not.
- **`auto`:** where it aids readability vs where it hides a type that matters.
- **Build:** CMake conventions, dependency management (vcpkg, Conan, submodules), and whether sanitiser builds run in CI. Pin the source of each dependency; a git submodule at `main` is Axis 10.7 turned off.

## WebAssembly

Not a language — a compilation target — so the questions are about the **boundary**, which is where every WASM problem actually lives.

- **Source language and toolchain pinned**, in the manifest and in CI. A `.wasm` built by a different toolchain version is a different artifact.
- **Interface style:** ★ a generated binding layer (`wasm-bindgen`, WIT / the Component Model) · hand-rolled imports and exports. Hand-rolled boundaries rot silently because nothing type-checks across them.
- **Binary size budget:** ★ stated, and enforced in CI. This ships over the wire; without a number it only ever grows. Say whether size optimisation and stripping are on in release builds.
- **Memory ownership across the boundary:** ★ write down who allocates and who frees, per direction. This is the single biggest source of WASM bugs and it is invisible to both sides' type systems.
- **Call granularity:** ★ batch at the boundary — crossing is expensive, and a chatty interface will dominate your profile regardless of how fast the module is.
- **What may cross:** ★ plain data only; no host handles or DOM access from the module.
- **The built artifact:** committed to the repo or built in CI. Pick one — a committed `.wasm` that CI also builds is a divergence waiting to happen.
- **Debug symbols:** whether they ship in release, and what that costs in size.

## Infrastructure and glue

Nobody thinks of these as needing conventions, everybody has them, and they're where the expensive mistakes live. Worth a short section even when they're a small fraction of the codebase.

**Shell scripts**
- ★ `set -euo pipefail` at the top of every script. Lint-enforceable with ShellCheck.
- ShellCheck in CI, at a stated severity.
- ★ Quote every expansion. Where a script grows past a stated length, rewrite it in a real language — name the length.

**Terraform / infrastructure as code**
- ★ `terraform fmt` and `validate` in CI; a linter (`tflint`) with a committed config.
- Module boundaries: what earns a module, and where shared modules live.
- State: remote backend, locking, and who may apply.
- ★ Never commit secrets or state files; enforce with a scanner in CI.
- Naming and tagging conventions for resources — the thing that decides whether your cloud bill is ever explicable.

**SQL and migrations**
- Migrations forward-only or reversible; who runs them and when.
- Naming: tables, columns, indexes, constraints.
- ★ Every migration reviewed for a lock that would take production down. Name the operations that need special handling.

**Secrets and environment**

The expensive mistake is committing a real value, or teaching an agent that `.env` is "just config". These are cheap to decide and cheap to enforce; skipping them is how keys land in git history. Same helper rule as Axis 10: point at the obvious bits, do not invent a secrets framework.

| # | Question | Options |
| --- | --- | --- |
| S.1 | Secret files in git | ★ `.env`, `.env.local`, `.env.*.local`, and environment-specific secret files gitignored; never committed · Convention only |
| S.2 | Env contract | ★ A committed example file (`.env.example` / `.env.sample`) with keys and placeholders, no real values · README list · None |
| S.3 | Secret scanning | ★ Platform push protection (GitHub secret scanning or equivalent), plus a pre-commit or CI scanner · Platform only · None |
| S.4 | Required env at startup | ★ Validated at boot; missing or malformed keys fail with the key names · Fail later · Unchecked |
| S.5 | Client-exposed env | ★ Prefixes that reach the browser (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, …) are a named allowlist of non-secrets · Convention only · Unchecked |

S.1 is non-negotiable and mechanically checkable: the ignore file, `git ls-files` for tracked `.env*`, and the `ready-for-pr` sanity check. `.env.example` is the exception that *is* committed — it is the contract, not the secrets. If a `.env` is already tracked, that is a finding to surface, not a silent `git rm`; the values may already be in history and need rotation.

S.2 and S.4 are the pair that stop "clone the repo, nothing works, copy someone else's `.env`". The example file lists what must exist; startup validation refuses to boot without it. A typed schema is a good enforcement mechanism, not a required one — any fail-fast check that names the missing keys is enough.

S.3: do not add a scanner the repo has no appetite to run. Platform push protection is the one that still works when someone force-adds an ignored file. A local hook is extra, not a substitute.

S.5 is the web-app-shaped hole: a secret behind a public prefix is a secret in the browser bundle. If the repo has no client bundle, skip it.

Also write down, once, what must never be logged — tokens, raw env values, authorization headers. Axis 7.5 already owns the user-facing half of this; the agent-facing half belongs in `AGENTS.md`: never print `.env` contents, never commit the file, never paste secrets into a ticket or a spec.

If your language or tool decided something for you, don't re-decide it. Record it as settled and move on.
