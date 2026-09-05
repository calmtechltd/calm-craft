---
name: conventions-migrate
description: Apply an agreed convention change to existing code in reviewable batches and tighten its enforcement. Use for convention migrations; select checks for the transformation instead of running tests after every batch.
---

# Migrate a Convention

Apply an agreed convention change to existing code in reviewable batches. Read the decision in `.engineering/conventions.yaml` and update it first if the user has already authorized a new answer. If intent is unresolved, ask only about that decision and continue independent authorized work.

## Find and batch

Inventory violations within the requested scope. Separate mechanical changes, cases requiring judgment, and generated/vendored exclusions. Report the affected areas and substantial migration cost before editing. Preserve unrelated changes and use the owning generator for machine-maintained files.

Batch by a coherent transformation and its consumers. Batch boundaries support review; they do not each require a commit or test run. Do not commit unless authorized.

## Apply and verify

Apply each change with its affected consumers. Follow [write-tests](../write-tests/SKILL.md): one coordinator selects relevant verification and reuses current evidence. Comments, formatting, and statically enforced imports usually need the owning static check, not application tests. Runtime or integration changes warrant affected tests. Combine compatible batches before a costly shared check when this preserves useful failure isolation.

Investigate a failure before dependent work continues. Establish whether it was introduced by the migration or was already present. Do not delete unrelated work or mechanically revert a dirty file. Leave unresolved judgment cases with their evidence rather than inventing a convention.

When the applicable code complies, tighten the agreed enforcement and remove obsolete scoped allowances. Verify changed enforcement with a safe representative fixture using its owning tool. The mechanism may be lint, formatting, compilation, or CI. Preserve `decided`/`defaulted` provenance unless the user explicitly chose a new answer; record migration completion separately.

## Report

Describe completed batches, verification actually performed, remaining violations and decisions, and final enforcement. Required unrun checks remain unverified. Full local gates are not an automatic migration follow-up.
