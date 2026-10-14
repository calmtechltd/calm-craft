# Critical-review behavioral evidence — 12 October 2026

Two independent evaluators received realistic tasks, the local skills and isolated raw fixtures. Neither received the suspected issue or earlier conclusions. The new-library evaluator designed and implemented a missing module. The changed-spec evaluator first updated documents only, then received authorization to implement that revised contract. No product repository, provider, database or running workflow was mutated.

Records below capture the finished fixture artifacts before temporary-workspace cleanup. Fenced Markdown is historical trial output; embedded relative links refer to the original fixture, not this report. The changed-spec design observation preserves the documentation-only phase independently from its later implementation.

## new-library

### specs/span.md

SHA-256: `92ccae8ef2799518e767497e8b433a9a09c094b85233420c20d7cc38af1a7740`

~~~~markdown
# Integer span library

B1: parseSpan(text) returns {ok:true,value:{start,end}} for a trimmed string in the form signedInteger..signedInteger, with safe integer endpoints and start <= end. Empty spans are valid. Nonmatching syntax returns {ok:false,code:"invalid_format"}; matching syntax with unsafe or reversed bounds returns {ok:false,code:"invalid_bounds"}. Decimal integer spelling has optional leading minus and no leading plus; leading zeroes are allowed. Parsing never throws.
B2: containsSpan(span,value) is true exactly for a safe integer value with start <= value < end, provided both endpoints are safe and ordered; otherwise false. Never mutate inputs.
B3: formatSpan(span) returns canonical start..end text (normal decimal spelling) for valid bounds, otherwise null. No locale, clock, IO, dependency or mutable global state is required.
~~~~

### src/index.ts

SHA-256: `49e149c1272f5ce67b8c65e8ac0a2577480a42e47123c01d59cf24b8b0c8324f`

~~~~typescript
export type Span = Readonly<{ start: number; end: number }>;

export type ParseSpanResult =
  | { ok: true; value: Span }
  | { ok: false; code: 'invalid_format' | 'invalid_bounds' };

function validBounds(span: Span): boolean {
  return span !== null
    && typeof span === 'object'
    && Number.isSafeInteger(span.start)
    && Number.isSafeInteger(span.end)
    && span.start <= span.end;
}

export function parseSpan(text: string): ParseSpanResult {
  if (typeof text !== 'string') {
    return { ok: false, code: 'invalid_format' };
  }

  const match = /^(-?[0-9]+)\.\.(-?[0-9]+)$/.exec(text.trim());
  if (match === null) {
    return { ok: false, code: 'invalid_format' };
  }

  const span: Span = { start: Number(match[1]), end: Number(match[2]) };
  if (!validBounds(span)) {
    return { ok: false, code: 'invalid_bounds' };
  }

  return { ok: true, value: span };
}

export function containsSpan(span: Span, value: number): boolean {
  return validBounds(span)
    && Number.isSafeInteger(value)
    && span.start <= value
    && value < span.end;
}

export function formatSpan(span: Span): string | null {
  return validBounds(span) ? `${span.start}..${span.end}` : null;
}
~~~~

### test/public.test.mjs

SHA-256: `ffa8890ef9f108d8e729f2de6ce376ac1928d3da78f6e2677bcdcd05b4fbbb55`

~~~~javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSpan, containsSpan, formatSpan} from '../src/index.ts';
test('parsing distinguishes syntax from bounds and accepts empty spans',()=>{
 assert.deepEqual(parseSpan(' -02..5 '),{ok:true,value:{start:-2,end:5}});
 assert.deepEqual(parseSpan('3..3'),{ok:true,value:{start:3,end:3}});
 assert.deepEqual(parseSpan('2.5..4'),{ok:false,code:'invalid_format'});
 assert.deepEqual(parseSpan('+2..4'),{ok:false,code:'invalid_format'});
 assert.deepEqual(parseSpan('4..2'),{ok:false,code:'invalid_bounds'});
 assert.deepEqual(parseSpan('9007199254740992..9007199254740993'),{ok:false,code:'invalid_bounds'});
});
test('membership is half-open, validates values and preserves inputs',()=>{
 const s=Object.freeze({start:1,end:4});
 assert.equal(containsSpan(s,1),true);assert.equal(containsSpan(s,4),false);
 assert.equal(containsSpan(s,2.5),false);assert.equal(containsSpan({start:4,end:1},3),false);
 assert.equal(containsSpan({start:1,end:1},1),false);assert.deepEqual(s,{start:1,end:4});
});
test('format and parse preserve valid meaning and reject invalid bounds',()=>{
 assert.equal(formatSpan({start:-2,end:5}),'-2..5');
 assert.deepEqual(parseSpan(formatSpan({start:-2,end:5})),{ok:true,value:{start:-2,end:5}});
 assert.equal(formatSpan({start:5,end:2}),null);assert.equal(formatSpan({start:1.1,end:2}),null);
});
~~~~

### docs/architecture/contracts/integer-span.md

SHA-256: `89178138ef1c899c7ffb0731223018906fe874bab7993d774ca3fa129862087b`

~~~~markdown
---
id: integer-span
status: verified
---
# Integer span

## Responsibility and authority

Implement [B1–B3](../../../specs/span.md) behind the stable `src/index.ts` public
entry point required by [repository instructions](../../../AGENTS.md). At design
time implementation was absent; all three operations now exist in `src/index.ts`.
The requested target comprises all three operations;
design and implementation were explicitly authorized together in this task.

## Public interface

`Span = Readonly<{ start: number; end: number }>` is the input/value representation.
`ParseSpanResult` is `{ ok: true; value: Span }` or
`{ ok: false; code: 'invalid_format' | 'invalid_bounds' }`.

- `parseSpan(text: string): ParseSpanResult`: accepts primitive strings; trims
  whitespace and applies B1's decimal syntax before bounds validation. It returns
  failures rather than throwing. JavaScript non-string inputs are rejected as
  `invalid_format`, without coercing or invoking user methods.
- `containsSpan(span: Span, value: number): boolean`: evaluates B2's safe integer,
  valid bounds and half-open membership rules. The span is never changed.
- `formatSpan(span: Span): string | null`: applies B3's valid bounds rule and
  returns canonical decimal text. Negative zero formats as `0` using normal
  JavaScript decimal spelling. No arbitrary object/accessor semantics are promised.

Invalid numeric fields are permitted at this validation boundary; all three
operations share the safe integer, ordered endpoints invariant, including equal
endpoints. Retain operation names, input shape and success/failure result shapes.

## Desired structure and rationale

```text
src/index.ts                       public operations, types, private bounds guard
test/public.test.mjs               existing API consumer and verification
docs/architecture/index.md         capability discovery
docs/architecture/contracts/integer-span.md
```

One module owns span representation and validity, so its private validation helper
cannot diverge between parsing, membership and formatting. This prioritizes
correctness, API compatibility and contained edits. Separate parse/format/member
files or a facade plus internal module would add hops without distinct policies or
dependencies in this small library. Revisit separation if a substantive independent
capability or consumer requires it. No separate design note is needed.

The catalog points directly to the module, requirements and existing caller.
Agents/humans can search exported names to find affected callers and checks. This
is a discoverability rationale, not measured proof of improved agent effectiveness.

## State, resources, dependencies and effects

Pure input computation only; no input writes, dependency imports, locale, clock,
IO, mutable global state, persistence, provider adapters or workflow machinery.
Effects/recovery: none. No generated files or migration workflow are involved.

## Obligations

### C1 — Parse and classify failures

Status: verified ([evidence](../../../evidence.md)). Authority: B1. Preserve syntax-versus-bounds classification,
trimming, optional minus, leading zeroes, safe endpoints, equal endpoints and a
non-throwing result. Evidence needed: public parsing tests and focused safe-edge,
syntax and non-string checks.

### C2 — Half-open safe membership

Status: verified ([evidence](../../../evidence.md)). Authority: B2. Validate both endpoints and the queried value,
exclude the end, reject reversed spans and preserve input values. Evidence needed:
public membership tests and focused invalid endpoint/value checks.

### C3 — Canonical formatting and purity

Status: verified ([evidence](../../../evidence.md)). Authority: B3 and B2's no-mutation rule. Reject invalid bounds,
format valid bounds with normal decimal spelling and retain parse/format meaning.
Evidence needed: public formatting tests, safe-edge round trips and source review
for forbidden effects/dependencies.

## Verification and enforcement

Use installed Node 24 and `node --test test/*.test.mjs`, importing the actual public
TypeScript entry point under ESM with native stripping. Existing tests enforce
selected runtime outcomes. A focused additional assertion run may cover meaningful
unrepresented edges without introducing a second test harness. Source review checks
dependency direction, purity and shared validation. No compiler or lint tool is
configured; native TypeScript stripping is not a typecheck. Documented structure
is not mechanically enforced. All three existing tests and a focused 57-assertion
edge run passed on Node 24.19.0. Source review found no imports, mutation or external
effects; bounds validation is shared. See the linked evidence for exact commands,
branches checked and limitations.

## Implementation and open decisions

Implemented `src/index.ts`; existing tests use the required public path,
so no caller migration was needed. No material behavior or design decisions are
unresolved, and no legacy allowances apply. Update this contract and the catalog
from actual implementation/evidence after future changes.
~~~~

### evidence.md

SHA-256: `5b851075824109408166cb38d17f878ea55c5181797a6dbf427906cd643bd8cb`

~~~~markdown
# New library trial evidence

## Result and artifacts

Completed the authorized contract design and implementation in this isolated
fixture. New files: `src/index.ts`, `docs/architecture/index.md`,
`docs/architecture/contracts/integer-span.md`, and this evidence file. Existing
requirements, instructions, package definition and tests were preserved. No Git
repository exists here (`git status --short` returned that diagnostic), so review
uses the complete file inventory and content rather than a Git diff.

## Actual checks

- Runtime: `/opt/homebrew/bin/node --version` returned **v26.7.0**. Installed fnm
  runtime `/Users/gaz/.local/share/fnm/node-versions/v24.19.0/installation/bin/node`
  returned **v24.19.0** and was used for all tests.
- Before implementation, the Node 24 command `node --test test/*.test.mjs` failed
  with `ERR_MODULE_NOT_FOUND` for the missing `src/index.ts` (1 failed test file).
- After implementation, the same command with the explicit Node 24 path passed:
  **3 tests, 0 failures**. These execute the actual ESM public entry point and cover
  syntax/bounds classification, empty spans, half-open membership, input preservation,
  invalid values and format/parse round trips.
- A Node 24 `--input-type=module` heredoc importing `./src/index.ts` passed **57
  assertions**: malformed syntax (spaces, plus, exponent, extra delimiter, Unicode
  digits), reversed/unsafe/overflow bounds, non-string parsing without coercion,
  trimmed leading zeroes, MIN/MAX_SAFE_INTEGER and empty-span round trips, canonical
  negative zero, unsafe/fractional/nonfinite endpoints and queried values, frozen
  inputs. This focused assertion run was ad hoc, not a newly maintained test file.
- Final source and fixture review checked the entire added implementation and docs,
  public signatures, shared validation, no imports/global state/IO/input writes,
  relative documentation links and preservation of existing files. A Node 24
  filesystem assertion run confirmed all **9 local Markdown link targets** exist.

## Relevant choices and workflow observations

Read the specified skill-creator guidance, explicitly used module-contract-design
and contract-implement, and read their coding-contracts/architecture-principles
references. Wrote the target contract and catalog before implementation, then
updated status only after runtime evidence and source review. The design authority
is the requested task and B1–B3; passing tests does not claim extra architecture
approval. The single module groups three operations around one invariant and avoids
unneeded facades, adapters, workflows, providers, dependency injection or framework
changes. Native TypeScript stripping and ESM preserve the fixture's chosen toolchain.

The contract guidance was useful for separating intent, target structure and actual
evidence. Its catalog and separate contract add documentation overhead relative to
a 42-line pure module, but were requested artifacts. Broad recovery, tenancy,
ownership, generation and deployment material was irrelevant and did not cause
extra implementation work. Read write-tests when considering coverage; chose the
existing tests plus a small assertion run, without loading its additional engineering
configuration or test-authoring workflows since no tests were added. Runtime
discovery required a small detour because the supplied Homebrew hint was Node 26.

## Evidence limits

Native stripping executes TypeScript but does not typecheck it. No compiler, linter,
architecture enforcement or package build is configured; none was invented or
installed. Runtime assertions sample cases rather than prove all numeric inputs;
purity/dependency direction is source review. No independent comparative evidence
establishes improved agent discoverability. Arbitrary malicious accessor objects
are outside the typed span API. No network, installations, commits, publication,
providers, external mutations or edits outside this fixture were used.
~~~~

## changed-spec-design-observation

### src/index.ts

SHA-256: `b9d0530af76ed261a9eeb534a0072e7456c9a122b0b68fbd327ba8acd189bc1a`

~~~~typescript
export function normalizeMembers(items: readonly string[]): string[] {
  return [...new Set(items)];
}
~~~~

### docs/architecture/contracts/membership-projection.md

SHA-256: `6c8f34d058e615bd392d889bbf0ea5837f40fa57cbb174a057121ede78b58384`

~~~~markdown
---
id: membership-projection
status: partial
---
# Membership projection

## Responsibility and authority

Project member identifiers into a stable, normalized, unique list. Intent is owned by [Membership projection B1–B2](../../../specs/members.md). This contract updates the requested target to the 12 October revision; authoring these documents does not authorize implementation.

Contract classification: **revise**, retaining `membership-projection`, C1 and C2. C1 changes; C2 remains unchanged. No additional contract is needed.

The previous contract records an accepted 11 October spec requiring case-sensitive exact-string uniqueness, preserving whitespace and empty strings. It records a passing `node --test test/public.test.mjs` check on that date. That historical evidence applies to the prior C1, not the revised target. The current source still implements that prior behavior.

## Public interface

Keep the existing public export in `src/index.ts`:

```ts
normalizeMembers(items: readonly string[]): string[]
```

Callers provide an array of strings. The result is a new array containing identifiers normalized with `trim()` followed by JavaScript `toLowerCase()`, omitting normalized empty strings and keeping each normalized identifier once in first-seen order. The array and its string values remain unchanged. An empty input produces an empty result. For example, `[' B ', 'b', '', '  ', 'A', ' a ']` produces `['b', 'a']`.

No locale selection or alternative normalization mode is part of this API. Failure behavior for values outside `readonly string[]` is unspecified by B1–B2; this design introduces no validation or exception policy for those unsupported inputs. Valid typed inputs have no specified domain failure outcome.

## Desired structure and rationale

Retain the existing single public module and existing test location:

```text
src/index.ts                                existing implementation and public API
test/public.test.mjs                        existing direct public consumer and test
docs/architecture/contracts/membership-projection.md
docs/architecture/index.md                  capability discovery catalog
specs/members.md                            canonical behavior authority
```

Current: `src/index.ts` returns `[...new Set(items)]`, comparing raw strings. Target: the same operation normalizes each input before filtering and deduplication; it maintains its working set and output array locally for each invocation. The normalization and uniqueness policy belong together because both determine identifier equivalence and order. Consumers depend only on the public operation, which hides the working representation.

This prioritizes correctness and API compatibility with a contained edit to one small implementation. Splitting normalization into a separate module would add another boundary without a demonstrated separate consumer or policy; revisit that choice if such reuse appears. No new files, framework, adapter or workflow runtime are needed. These are design choices, not new product requirements.

The repository uses TypeScript source, ESM (`package.json` has `type: module`), Node `^24.0.0`, and Node's built-in test runner. AGENTS.md specifies installed Node 24 with native TypeScript stripping. No compiler configuration or generation workflow is present in this fixture. Preserve the existing `.ts` public import path and avoid syntax requiring compilation. The available shell runtime for this trial was Node v26.7.0; target-runtime verification remains outstanding.

## State, dependencies and effects

Read only the supplied array and strings; use per-call local collections and return a fresh result. No mutable global state, third-party dependency, IO or external effect is permitted by B2. Membership authorization, persistence and caller-specific policies are outside this boundary. Effects and recovery: none; no transaction, replay or cancellation machinery is required.

## Obligations

### C1 — Normalized unique nonempty identifiers in stable order

Status: proposed

Authority: [B1](../../../specs/members.md). Revise the existing C1 from exact-string uniqueness to normalization before comparison and output, blank omission and stable first-seen uniqueness. Keep its stable ID and the prior history above. The current implementation does not satisfy this revised obligation.

Required evidence: a public-API check combining padded strings, mixed case, repeated normalized identifiers and blank strings; an empty-input check; ordering after normalization. The representative revised-B1 assertion run in this trial failed as expected: current output retained all six raw strings while the required output was `['b', 'a']`. See [evidence](../../../evidence.md). This is evidence of an implementation gap, not verification of the target.

### C2 — Preserve public API and input

Status: verified

Authority: [B1–B2](../../../specs/members.md). Retain the exported signature/path, preserve the caller's array, return an independent array and remain pure. The signature and absence of IO/global state were inspected in `src/index.ts`; the existing public test passed against a frozen array. Additional in-memory assertions confirmed representative input preservation, independent result arrays and repeatability. See [evidence](../../../evidence.md) for commands and limits. This evidence is against Node v26.7.0, not the specified Node 24 runtime, and must be renewed after implementation changes.

## Verification and discoverability

Find this boundary through the [catalog](../index.md), then follow B1–B2 and `src/index.ts`. Search `rg -n 'normalizeMembers' src test` to find visible callers: only `test/public.test.mjs` is present. There is no evidence about consumers outside the fixture.

The available narrow test is `node --test test/public.test.mjs`, also covered by `npm test`. Its current uppercase expectation belongs to the previous C1; a pass does not prove revised B1. The typed signature records input shape; there is no observed compiler, linter or automatic contract enforcement. Behavior and dependency restrictions rely on checks and review. Agent discovery and contained-edit benefits of this small structure are assumptions, not measured comparative results.

## Implementation impact and open gaps

- Adapt `src/index.ts` to revised C1 while preserving C2 and the public path/signature. No missing module needs to be built.
- Adapt the existing test's uppercase expected output to revised B1, and cover trimming, lowercase comparison/output, blank omission, normalized ordering and empty input through the public entry point. Source and tests were left untouched in this documentation task.
- Callers receive changed spelling and may receive fewer identifiers. The visible test is affected; external caller compatibility cannot be assessed from this fixture. The old exact-string behavior is historical, with no target legacy allowance or mode switch.
- Run relevant checks on Node 24 and renew C2 evidence after implementation. Only then may revised C1 be marked verified and the module roll-up become verified.

No unresolved design decision blocks the valid typed-input target. Out-of-type input behavior and external consumers remain unspecified/unknown; they are not invented requirements for this change.
~~~~

## changed-spec

### specs/members.md

SHA-256: `4ac46addf803b1dc226aeed6e72aa5aa59493a5ebdbdf9bf3230741d8b85465b`

~~~~markdown
# Membership projection

B1: normalizeMembers(items) returns unique nonempty identifiers in first-seen order. Identifiers are trimmed and case-folded with JavaScript toLowerCase before comparison/output; blank identifiers are omitted. The caller's array must remain unchanged.
B2: The public API stays normalizeMembers(items: readonly string[]): string[] exported by src/index.ts. This is a pure operation with no external effects.
~~~~

### src/index.ts

SHA-256: `20351299f2c41e9220516b42ce17d3a15cce02305e27cd7d27e19eb39f703a1d`

~~~~typescript
export function normalizeMembers(items: readonly string[]): string[] {
  const members = new Set<string>();
  for (const item of items) {
    const identifier = item.trim().toLowerCase();
    if (identifier) members.add(identifier);
  }
  return [...members];
}
~~~~

### test/public.test.mjs

SHA-256: `fb916f992ffcee0259b57da305fc4990600a68e260fda4c55fd03714e8e0e066`

~~~~javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMembers} from '../src/index.ts';
test('B1–B2: normalize unique nonempty members in first-seen order without mutating input',()=>{
 const original=[' B ','b','','\t\n','A',' a ','É',' é ','İ','i\u0307'];
 const input=Object.freeze([...original]);
 const result=normalizeMembers(input);
 assert.deepEqual(result,['b','a','é','i\u0307']);
 assert.deepEqual(input,original);
 assert.notStrictEqual(result,input);
 const repeated=normalizeMembers(input);
 assert.deepEqual(repeated,result);
 assert.notStrictEqual(repeated,result);
 assert.deepEqual(normalizeMembers(Object.freeze([])),[]);
});
~~~~

### docs/architecture/contracts/membership-projection.md

SHA-256: `c2bf7aa428e5cc6448e5c784481f2bb806245e47bee9d5ba13b4f02503910a08`

~~~~markdown
---
id: membership-projection
status: verified
---
# Membership projection

## Responsibility and authority

Project member identifiers into a stable, normalized, unique list. Intent is owned by [Membership projection B1–B2](../../../specs/members.md). This contract updates the requested target to the 12 October revision. The initial request authorized documentation only; the subsequent request explicitly authorized implementing this revised contract and adapting its public test. See [phase evidence](../../../evidence.md).

Contract classification: **revise**, retaining `membership-projection`, C1 and C2. C1 changes; C2 remains unchanged. No additional contract is needed.

The previous contract records an accepted 11 October spec requiring case-sensitive exact-string uniqueness, preserving whitespace and empty strings. It records a passing `node --test test/public.test.mjs` check on that date. That historical evidence applies to the prior C1, not the revised target. The source implemented that prior behavior during the design phase; the authorized implementation phase now satisfies the revised target.

## Public interface

Keep the existing public export in `src/index.ts`:

```ts
normalizeMembers(items: readonly string[]): string[]
```

Callers provide an array of strings. The result is a new array containing identifiers normalized with `trim()` followed by JavaScript `toLowerCase()`, omitting normalized empty strings and keeping each normalized identifier once in first-seen order. The array and its string values remain unchanged. An empty input produces an empty result. For example, `[' B ', 'b', '', '  ', 'A', ' a ']` produces `['b', 'a']`.

No locale selection or alternative normalization mode is part of this API. Failure behavior for values outside `readonly string[]` is unspecified by B1–B2; this design introduces no validation or exception policy for those unsupported inputs. Valid typed inputs have no specified domain failure outcome.

## Desired structure and rationale

Retain the existing single public module and existing test location:

```text
src/index.ts                                existing implementation and public API
test/public.test.mjs                        existing direct public consumer and test
docs/architecture/contracts/membership-projection.md
docs/architecture/index.md                  capability discovery catalog
specs/members.md                            canonical behavior authority
```

Before implementation: `src/index.ts` returned `[...new Set(items)]`, comparing raw strings. Current and target: the same operation normalizes each input before filtering and deduplication; it maintains a local `Set<string>` and returns a new array for each invocation. The normalization and uniqueness policy belong together because both determine identifier equivalence and order. Consumers depend only on the public operation, which hides the working representation.

This prioritizes correctness and API compatibility with a contained edit to one small implementation. Splitting normalization into a separate module would add another boundary without a demonstrated separate consumer or policy; revisit that choice if such reuse appears. No new files, framework, adapter or workflow runtime are needed. These are design choices, not new product requirements.

The repository uses TypeScript source, ESM (`package.json` has `type: module`), Node `^24.0.0`, and Node's built-in test runner. AGENTS.md specifies installed Node 24 with native TypeScript stripping. No compiler configuration or generation workflow is present in this fixture. The existing `.ts` public import path and stripping-compatible syntax are retained. Design-phase checks used shell Node v26.7.0; implementation-phase checks used the supplied Node v24.19.0 executable and passed.

## State, dependencies and effects

Read only the supplied array and strings; use per-call local collections and return a fresh result. No mutable global state, third-party dependency, IO or external effect is permitted by B2. Membership authorization, persistence and caller-specific policies are outside this boundary. Effects and recovery: none; no transaction, replay or cancellation machinery is required.

## Obligations

### C1 — Normalized unique nonempty identifiers in stable order

Status: verified

Authority: [B1](../../../specs/members.md). Revise the existing C1 from exact-string uniqueness to normalization before comparison and output, blank omission and stable first-seen uniqueness. Keep its stable ID and the prior history above. The current implementation satisfies this revised obligation.

Evidence: the adapted public test combines padded strings, mixed case, repeated normalized identifiers, blank strings, first-seen ordering and empty input. It includes accented identifiers and JavaScript's dotted-I lowercase output. The test failed against the previous source and passed against the implementation on Node v24.19.0. The design-phase representative assertion also failed against the previous source; both failure records are retained in [evidence](../../../evidence.md).

### C2 — Preserve public API and input

Status: verified

Authority: [B1–B2](../../../specs/members.md). Retain the exported signature/path, preserve the caller's array, return an independent array and remain pure. The signature and absence of IO/global state were inspected in the changed `src/index.ts`. The adapted public test passed on Node v24.19.0 against a frozen array and confirmed input preservation, independent result arrays and repeatability. See [evidence](../../../evidence.md) for commands, historical design-phase checks and limits.

## Verification and discoverability

Find this boundary through the [catalog](../index.md), then follow B1–B2 and `src/index.ts`. Search `rg -n 'normalizeMembers' src test` to find visible callers: only `test/public.test.mjs` is present. There is no evidence about consumers outside the fixture.

The narrow test is `node --test test/public.test.mjs`, also covered by `npm test`; invoke the supplied Node 24 executable when the shell's default Node version differs. The current test covers revised B1 and retained B2. The typed signature records input shape; there is no observed compiler, linter or automatic contract enforcement. Behavior and dependency restrictions rely on checks and review. Agent discovery and contained-edit benefits of this small structure are assumptions, not measured comparative results.

## Implementation impact and open gaps

- Adapted `src/index.ts` to revised C1 while preserving C2 and the public path/signature. No module was added.
- Adapted the existing public test to revised B1, covering trimming, lowercase comparison/output, blank omission, normalized ordering and empty input, with retained input-preservation checks.
- Callers receive changed spelling and may receive fewer identifiers. The visible test is affected; external caller compatibility cannot be assessed from this fixture. The old exact-string behavior is historical, with no target legacy allowance or mode switch.
- Ran the adapted public test on Node v24.19.0 after implementation and renewed C1/C2 evidence. Both obligations and the module roll-up are verified for the in-scope target.

No unresolved design decision blocks the valid typed-input target. Out-of-type input behavior and external consumers remain unspecified/unknown; they are not invented requirements for this change.
~~~~

### evidence.md

SHA-256: `1ef9f0270ccf3b641d3c4a7119231564f3e3d9dbd50f22e6cce185050577104b`

~~~~markdown
# Membership contract design evidence — 12 October 2026

## Authorized scope and inputs

Used the explicitly requested local `module-contract-design` skill after reading the system `skill-creator` instructions, with the skill's coding-contracts and architecture-principles references. Read this fixture's AGENTS.md, current `specs/members.md`, existing catalog/contract, `src/index.ts`, `package.json` and `test/public.test.mjs`. No prior reports or other agents' work were used.

Only documentation was authorized. Updated the existing catalog and `membership-projection` contract, preserving C1/C2 identities and prior verification history. Wrote desired structure and implementation impact into the contract. This file records actual trial evidence. The canonical behavior spec required no edit: it already states the revised B1–B2. No source, test, package, instruction, skill or reference file was changed. No network, install, provider call, commit or external mutation was performed.

## Findings and changes

The revised B1 trims and lowercases identifiers before comparison/output and drops blanks. The current source's raw-string Set operation and the test's uppercase expectation implement the prior behavior. The contract is classified as revised, not replaced; C1 is proposed for the new target and C2 retains current verification. The module/catalog roll-up is partial. Previous evidence is historical and cannot verify the new C1.

The desired structure retains `src/index.ts` as the public implementation and the existing test location. No extraction or extra contract is justified by the visible consumers. API/input preservation and purity remain required. Future implementation must adapt the function and public test, then check the revised behavior without changing the API. No code work was performed in this trial.

## Actual checks

- `git status --short` failed because this fixture is not a Git repository. The initial file inventory and source contents were inspected instead; there is no Git-based diff available.
- `rg --files --hidden` found seven original files: AGENTS.md, package.json, src/index.ts, test/public.test.mjs, specs/members.md and the two architecture documents. `rg -n 'normalizeMembers|membership-projection|members\.md' .` found only the visible public test as a caller.
- `node --version` returned `v26.7.0`. `whence -a node` found `/opt/homebrew/bin/node`. Common Homebrew Node 24, nvm and mise locations were checked; no Node 24 executable was found there. Nothing was installed. Node 24 conformance was not verified.
- `node --test test/public.test.mjs` passed: one test, no failures, on Node v26.7.0. Its `['B','A']` expectation proves the old selected case; it does not verify revised B1 or whitespace/blank behavior.
- A read-only inline Node assertion imported `normalizeMembers` from `./src/index.ts`, called it on frozen input `[' B ', 'b', '', '  ', 'A', ' a ']`, and compared with `['b', 'a']`. It failed with exit 1 as expected; actual output was the unchanged six raw strings. This demonstrates the current revised-B1 gap without modifying the test suite.
- A second read-only inline assertion used frozen input `['B','A','B']`, compared it with a before-copy, checked that two results were independent arrays, and checked repeated results were equal. All assertions passed on Node v26.7.0. Source inspection confirmed the public typed signature and no IO/global state. This supports unchanged C2 in current code; it is not exhaustive behavioral or runtime evidence.
- Reviewed the complete documentation diff against initial contents, including newly created evidence.md. A Python read-only check resolved all nine local Markdown links, matched all five protected-file SHA-256 values to the baseline, and confirmed the final inventory contains exactly the seven original files plus evidence.md. No diagnostic artifacts were created. After recording this result, rechecked the evidence edit, links, inventory and protected hashes.

## Evidence limits

Historical 11 October test success is quoted from the existing contract and was not independently recreated against an earlier revision. Current checks exercised current source only. The revised behavior remains unimplemented and unverified; no passing contract roll-up is claimed. No compiler configuration, generation tooling or automatic contract enforcement was present. No external consumers were available to inspect. The chosen structure's benefits for agent discovery and contained edits are assumptions, with no comparative trial performed.

## Protected-file baseline

SHA-256 values recorded before edits:

```text
991a096348295c583bb9d20a234d689ef78cc4b464eb700ab172f420f34cf618  AGENTS.md
946b487703974bff2454fab8094eccb43e6e0758fd09d26e40ab26d3f57108b5  package.json
b9d0530af76ed261a9eeb534a0072e7456c9a122b0b68fbd327ba8acd189bc1a  src/index.ts
b92198d7883b5156f609cb6dc959c227a7c19a58030a3de0b996537d73705df3  test/public.test.mjs
4ac46addf803b1dc226aeed6e72aa5aa59493a5ebdbdf9bf3230741d8b85465b  specs/members.md
```

## Implementation phase — separately authorized continuation

The subsequent request authorized implementing the revised contract in this fixture, adapting the existing public test and verifying with `/Users/gaz/.local/share/fnm/node-versions/v24.19.0/installation/bin/node`. The design-phase record above is preserved unchanged; its statements about missing implementation/runtime evidence describe that earlier phase, now resolved by this continuation.

Read the local `contract-implement` skill and its selected contract/spec authority. Used its `write-tests` guidance and the linked `spec-author-tests` guidance to extend the existing public scenario. The fixture has no engineering configuration or shared test helpers; its existing Node built-in runner and test style were retained. No new test file, framework, compiler, validation policy, runtime layer or module was introduced.

Implementation choice: `src/index.ts` uses a per-call `Set<string>`, normalizes each string with `trim().toLowerCase()`, skips empty normalized strings and returns a fresh array from the set. This hides deduplication state inside the existing public operation, preserves first-seen order and leaves caller input untouched. The public signature and path are unchanged. Values outside the declared array-of-strings boundary remain unspecified by the spec; no invented runtime failure behavior was added.

The existing test now cites B1–B2 and combines padded/mixed-case duplicates, empty and whitespace-only strings, nonalphabetic first-seen order, accented identifiers and dotted-I output from JavaScript lowercase. It checks input preservation with a frozen copy, independent results, repeatability and empty input. Expected outputs come from B1, rather than the previous implementation. This compact public test catches plausible failures to normalize before comparison/output, filter blanks or preserve order/input; no static type-only test was added.

Actual commands and results:

- `git status --short` again confirmed the fixture is not a Git repository. A temporary baseline of all eight files was recorded outside the fixture for a complete final diff and preservation check.
- `/Users/gaz/.local/share/fnm/node-versions/v24.19.0/installation/bin/node --version` returned `v24.19.0`.
- `/Users/gaz/.local/share/fnm/node-versions/v24.19.0/installation/bin/node --test test/public.test.mjs` after adapting the test but before changing source failed: one test, one failure, exit 1. Actual output retained the ten raw identifiers; expected output was `['b', 'a', 'é', 'i\u0307']`.
- The same command after implementing the normalization loop passed: one test, zero failures, exit 0. This directly exercised the retained public ESM `.ts` import using native TypeScript stripping on the required Node major version.
- Source review confirmed only per-call state and no IO/dependencies; the public typed signature/path stayed unchanged. Contract C1/C2 and catalog status were updated to verified from this implementation-phase evidence.

Limits: the single combined public scenario is focused evidence, not exhaustive Unicode/property testing. No compiler/typecheck, lint, browser, install, network, external consumer, commit or external-state check was performed or required for this fixture. No automatic contract enforcement exists. Unknown external consumers and out-of-type values remain outside the available evidence. The target Node 24 verification gap from the design phase is resolved.

Instruction observations: the contract implementation skill supported a contained source/test change with no routine permission request or unnecessary runtime scaffolding. Its test-guidance link led to reading two supporting skills for a one-function/one-test task; that was instruction-reading overhead rather than additional code or checks. The earlier runtime search missed the installed fnm Node 24 path, creating a design-phase evidence gap; the supplied exact executable resolved it. No instruction required modifying the canonical spec or protected configuration to make the implementation pass.

Final implementation review: compared all eight files with the implementation-phase baseline and reviewed the complete five-file diff (source, public test, contract, catalog and appended evidence). AGENTS.md, package.json and specs/members.md remained byte-for-byte unchanged. The entire design-phase evidence remained an unchanged prefix. All ten local Markdown links resolved, and the eight-file inventory was unchanged. Rechecked these preservation/link/inventory conditions after appending this result and removed the temporary baseline file; no diagnostic artifact remains.
~~~~

## Reviewed source fingerprints

Captured after the trials. Reusable source was not edited during this review.

```text
fa5caef57ee83e1f96d993bea1f8977bc253506ba80b87871e3572b1bda02b34  references/architecture-principles.md
4393df33d337fab49bafdc1f8637139b1621985ec7b4d0494e921f174502726b  references/coding-contracts.md
37a48869975323a4b0a3b580ff2dec9f6cb8aa515f74a0ff4f614a3c0325a6d7  skills/architecture-discover/SKILL.md
059368f13f6ca144c2a23668a857c56219007991ab280b05307b78dab9ee311a  skills/module-contract-design/SKILL.md
f059e1f4edc1675eca8405b93ea5b8a481ea143d3d62ece18c04cf56eea10677  skills/module-contract-audit/SKILL.md
32b1c5df6e51f7ab8a13f689c432cdce435255c1403fad6b55b6421262ad8010  skills/contract-implement/SKILL.md
```
