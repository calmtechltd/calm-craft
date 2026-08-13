# Question Bank

Twelve axes. They're the same in every language — what changes is how each one instantiates and which tool enforces it. TypeScript is worked out in full; the others list the questions that actually matter in that language rather than translating every TypeScript question literally.

**Recommended defaults are marked ★.** They lean strict, because a strict rule with documented exceptions is easier to live with than a loose one that means nothing. Disagreeing is the entire point — pick the other option and the generator records it as *decided*, which is worth more than agreeing with me.

**Not asked, ever:** tabs vs spaces, quote style, semicolons, trailing commas, line width, brace placement. Your formatter owns these. If you don't have a formatter, that's the first question in Axis 1 and everything here follows from it.

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

Why ★ on 2.1: default exports let the same module be imported under different names, which defeats rename refactors and grep, and they make auto-import suggestions worse. The usual counter is that some frameworks require them for route files — hence the middle option, which is a perfectly good answer.

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
| 9.3 | What *must* have a test? | ★ Bug fixes (a regression test) and any non-trivial pure logic · Everything with a coverage threshold · Judgement |
| 9.4 | Coverage threshold in CI? | ★ No — it optimises for the wrong thing; use the rule in 9.3 · Yes, at a named percentage |
| 9.5 | Naming | ★ Describe the behaviour, not the function name |

9.3 is the one worth arguing about. A coverage number is easy to game and easy to hit while testing nothing; "every bug fix gets a regression test" is checkable in review and compounds.

---

## Axis 10 — Dependencies

| # | Question | Options |
| --- | --- | --- |
| 10.1 | Package manager | ★ One, pinned in the manifest, enforced so a wrong-manager install fails · Whatever works |
| 10.2 | Lockfile | ★ Committed, and CI installs frozen · Committed, CI installs loose |
| 10.3 | Version ranges | ★ Exact for direct dependencies, managed by an update bot · Caret ranges |
| 10.4 | Bar for adding a dependency | ★ Named in the rules — what it must do to beat writing it yourself · No stated bar |
| 10.5 | Freshness policy | ★ Framework and runtime on current major within a stated window; everything else on the bot's schedule · Update when something breaks |
| 10.6 | Runtime version | ★ Pinned in the manifest and in CI · Unpinned |

10.5 is what stops the "we're four majors behind and every upgrade is now a project" outcome. Note it's a *policy* question with a *skill* answer — checking freshness is a thing you'd actually ask for, so it's one of the few items here that belongs in a skill rather than a rule.

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

Same twelve axes. These are the questions that carry real weight in each — not literal translations of the TypeScript list.

## Swift

- **Formatting:** SwiftFormat or swift-format as sole authority; SwiftLint for rules. Do they run in CI?
- **Force unwrap `!`:** ★ banned outside tests and `@IBOutlet` · allowed with justification · free. Force-try and force-cast too.
- **Access control:** ★ explicit and minimal (`private` by default, widen deliberately) · rely on `internal` default.
- **Value vs reference types:** ★ structs unless identity or inheritance is needed.
- **Optionals:** `guard let` early return as the house style, and where implicitly-unwrapped optionals are tolerated (if anywhere).
- **Concurrency:** strict concurrency checking on or off; `@MainActor` discipline for UI; whether `Task { }` detached work needs a stated cancellation story.
- **Singletons and `.shared`:** ★ named exceptions only, listed.
- **File layout:** one primary type per file; where extensions live; `// MARK:` conventions.
- **Dependencies:** SPM pinning policy, and the bar for adding one.

## Python

- **Formatting and linting:** ★ one tool as authority (Ruff covers both), CI-enforced.
- **Type hints:** ★ required on public functions, checked by a type checker in CI · gradual · none. If checked, which strictness level, and is it error or warning?
- **Imports:** ★ absolute only · relative within a package. Whether `__init__.py` may re-export (the barrel-file question in Python clothing).
- **Mutable default arguments:** lint-enforced ban — cheap, and catches a real bug class.
- **Data structures:** ★ dataclasses for plain data, a validation library only at input boundaries · validation models throughout.
- **Environment and packaging:** which tool owns it (uv, Poetry, pip-tools), lockfile committed, Python version pinned.
- **Exceptions:** custom hierarchy vs built-ins; bare `except:` banned.

## Ruby

- **RuboCop as sole authority**, with the config committed and CI-enforced — and a policy on how `.rubocop_todo.yml` gets burned down rather than grown.
- **`frozen_string_literal` magic comment:** ★ required.
- **Guard clauses over nested conditionals**; method length and ABC-size thresholds.
- **Autoloading vs explicit `require`**, and where each applies.
- **Service objects / interactors:** whether they're the house pattern, and what their call signature looks like.
- **Metaprogramming:** where `define_method` and `method_missing` are acceptable, if anywhere.

## C#

- **EditorConfig as the authority**, with analyzers on and warnings-as-errors in CI.
- **Nullable reference types:** ★ enabled solution-wide; policy on `!` null-forgiving.
- **`var`:** ★ when the type is apparent on the right-hand side · always · never.
- **File-scoped namespaces**, one type per file.
- **Async:** `Async` suffix required; `ConfigureAwait` policy; `async void` banned outside event handlers.
- **LINQ:** method syntax vs query syntax; whether deferred execution crossing a boundary is allowed.
- **Dependency injection:** constructor injection as the rule; where a service locator is tolerated, if anywhere.

## Go

Worth including as the counter-example: `gofmt`, `go vet`, and the standard layout settle most of this at the language level, which is exactly the end-state the other lists are approximating. What's left to decide is genuinely small — error wrapping conventions, whether `interface{}`/`any` needs justification, package naming and the depth of `internal/`, and context propagation rules.

If your language decided something for you, don't re-decide it. Record it as settled and move on.
