---
name: clean-code-slop
description: Find and simplify low-value tests, redundant wrappers, duplicated business rules, speculative abstractions, and inconsistent code. Use only when the user explicitly requests a code-slop audit or cleanup, or invokes clean-code-slop. Honour review-only requests; otherwise make verified, behaviour-preserving simplifications within the requested scope.
---

# Clean Code Slop

Remove code whose maintenance cost is not justified by behaviour, clarity, or
protection against real failures. Judge the code and its tests together. A test
that exercises unnecessary machinery does not establish that the machinery is
needed. Neither authorship nor line count determines quality.

This is an explicitly requested workflow. Do not invoke it automatically during
ordinary feature work, review, or PR preparation.

## Establish the scope

- Honour the requested mode: **review / find / audit** reports findings;
  **clean / fix / simplify** implements verified cleanup. A bare skill invocation
  defaults to cleanup of the current changes, not the whole repository.
- Use the named paths or feature. With no named scope, use the current task or
  branch changes, including task-owned staged, unstaged, and untracked files.
  An empty diff is not permission to expand into a repository sweep.
- For an explicit repository-wide sweep, inventory authored code, prioritise
  repeated responsibilities and likely maintenance cost, and work through the
  scope in coherent batches. Track inspected, changed, and deferred areas in a
  concise checkpoint when needed. Do not call a sample a complete audit.
- Read applicable repository rules, recorded conventions, and verification
  policy. Use `.engineering/config.yaml` and its overlays where present; do not
  invent a toolchain or start a conventions interview as a prerequisite.
- Record the starting worktree state and preserve unrelated work. Exclude
  generated, vendored, migration, lockfile, and build output; any necessary
  change there goes through its source and owning workflow.

## Investigate candidates

Search narrowly, then read the surrounding implementation, actual callers,
producers, and relevant tests. Search matches are candidates, not verdicts.

| Candidate | Evidence to seek |
| --- | --- |
| Low-value tests | A plausible failure and an independent basis for the expected outcome. Challenge copied implementation literals, tests of mock setup, duplicated scenarios, and assertions about source spelling. Apply [write-tests](../write-tests/SKILL.md). |
| Forwarding wrappers | What responsibility does the extra function own? Follow callers to see whether it adapts an interface, names a useful domain operation, enforces policy, or merely adds another name for the same call. |
| Repeated rules | Do these copies express the same business decision and need to change together? Search for the existing canonical helper before creating another shared abstraction. |
| Inconsistent patterns | Cite an authoritative rule or a well-supported existing pattern for the same responsibility. Distinguish accidental drift from deliberate domain differences. A widespread bug is still a bug. |
| Speculative machinery | Identify current consumers of options, generic layers, compatibility shims, and extension points. Check public exports, framework conventions, registrations, and external consumers before calling something unused. |
| Redundant defence | Trace the real producer and validation boundary. Challenge repeated defaulting and guards for unsupported internal states; preserve validation of genuinely untrusted input and meaningful failure handling. |
| Noise and unnecessary state | Look for comments that only narrate code, redundant intermediate transformations, duplicated type/schema definitions, and stored state derivable from an existing source. Establish lifecycle and contract requirements before simplifying. |

Useful structure can be small. A one-line permission wrapper, lazy framework
callback, or domain predicate may earn its place. A single caller is not proof
that a helper should be inlined. Likewise, an external event name can warrant a
literal assertion, and a real regression can warrant a substantial fixture.

Share code when it represents the same rule with the same ownership and reason
to change. Do not merge similar-looking policies into a generic function with
flags and exceptions solely to remove repeated syntax.

For each surviving candidate, establish:

1. The concrete code and responsibility involved.
2. The avoidable maintenance cost or conflict with an established convention.
3. A simpler replacement and what existing behaviour it preserves.
4. The evidence needed to justify and verify the change.

If the justification is missing, leave the code and state the specific unresolved
question. Do not label personal taste as a confirmed defect or seek permission
for clear, already-authorised cleanup.

## Simplify in coherent batches

Prefer deleting redundant layers, reusing the established implementation, or
consolidating equivalent coverage. Update affected callers together. Avoid
introducing a new framework, wrapper, or test harness to perform the cleanup.

Preserve observable results, permission and tenancy boundaries, errors, ordering,
transaction semantics, and required side effects. A fallback that hides a broken
contract may require a behaviour change: report that distinction rather than
silently deciding the intended product behaviour. When a real bug fix is already
within scope, use [bug-regression-red-green](../bug-regression-red-green/SKILL.md).

Before deleting a test, identify whether its protection is unnecessary or where
equivalent protection remains. Keep the actual reproducing conditions of useful
regressions. Honour repository-protected UI checks. Do not delete a failing test
to make a cleanup pass, update snapshots to bless a change, or add tests solely
to prove a wrapper was removed.

Apply recorded conventions without inventing a new standard. If authoritative
guidance conflicts, report it and continue independent cleanup. Do not turn this
pass into unrelated dependency upgrades, repository-wide formatting, API
redesign, or a rewrite. Commit, push, and publish only when already authorised.

## Verify at the right scope; reuse current evidence

The coordinator assigns each worker an owned area and narrow verification scope.
Workers return concise findings, changes, commands, and results; they do not each
start full suites, app servers, or readiness workflows. Delegate only independent
work that helps, not one agent per file or candidate.

Use existing targeted tests and required changed-file checks for the affected
behaviour and callers. Reuse results until relevant code, dependencies,
configuration, or data assumptions change. Batch needed browser journeys in one
session under repository policy. Apply [write-tests](../write-tests/SKILL.md) for full-check thresholds, including
explicit requests, repository requirements, and release checks. Do not add runtime tests for prose or static guarantees.

Inspect the complete task diff, including untracked files, and run the applicable
diff/whitespace check. When callers cannot be verified adequately at the chosen
scope, report that limitation; a passing leaf test is not evidence for all its
consumers. Required unrun checks remain incomplete, not silently waived.

## Hand back

Report the scope inspected, meaningful simplifications and why they help,
verification actually performed, and any deferred decisions or uncovered areas.
For review-only work, give verified findings with locations and proposed changes.
For cleanup, distinguish completed changes from candidates left alone. Keep this
proportional to the work; no mandatory score, deletion quota, or report per file.
