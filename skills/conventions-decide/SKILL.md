---
name: conventions-decide
description: Record coding convention decisions and implement their agreed enforcement using existing repository tools. Use for choosing or revising standards; preserve settled decisions and distinguish chosen answers from defaults.
---

# Decide Conventions

Record chosen conventions in `.engineering/conventions.yaml` and implement them through the repository's existing tools. Read `.engineering/config.yaml` when present; infer missing setup facts from the repository rather than requiring an unrelated setup workflow.

## Establish decisions

Read existing instructions, enforcement config, and representative code. Use the relevant language/axes from the [question bank](../../references/conventions-question-bank.md), not the entire bank by default.

Skip questions already settled by the toolchain or user. For remaining material choices, show concrete alternatives and their migration cost. Use the current host's available question tool and schema. No question quota: a complete brief may need none. If defaults are authorized, record them as `defaulted`; record an explicitly chosen answer as `decided`. Resolve consequential contradictions without reopening settled decisions.

Do not switch package managers. For install controls, inspect the pinned manager's current official documentation before writing settings; names, support, and defaults vary by version. Preserve existing security policy. Offer new controls only when relevant, without treating their absence as a setup failure. Secrets files must not be printed or committed; use placeholders in authorized examples.

## Record and enforce

```yaml
version: 1
decisions:
  - id: module-default-exports
    axis: module-boundaries
    answer: banned
    status: decided        # decided | defaulted
    tier: enforced        # enforced | ambient | documented
    enforcement: <actual config path and rule, compiler flag, or CI gate>
    note: <optional rationale>
```

Use the lowest-maintenance appropriate mechanism: existing linter, formatter, compiler, or CI for mechanically enforceable rules; scoped ambient guidance or documentation for the rest. Avoid repeating enforced rules in prose. Do not introduce a new tool or enforcement policy without authorization.

Update existing config rather than overwriting unrelated settings. Where a rule can be checked safely, verify a representative violation in a temporary fixture with the owning tool and remove only that fixture. Reuse existing evidence. Record unsupported/unverified enforcement honestly. For pre-existing violations, select a warning or scoped legacy allowance when consistent with the agreed policy; do not silently migrate the whole repository.

Use an existing owning generator for generated outputs. Where none exists, maintain the configuration and ambient/human guidance directly and do not label it generated. Do not build a generator as a prerequisite. Follow [write-tests](../write-tests/SKILL.md) for proportional verification; this workflow does not trigger full CI.

## Report

List decisions by tier and provenance, actual enforcement locations and verification, existing violations needing migration, and any unresolved choice. Preserve unrelated instructions. Use `conventions-migrate` only when the requested work includes applying the decision across existing code.
