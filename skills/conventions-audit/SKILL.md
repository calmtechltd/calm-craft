---
name: conventions-audit
description: Review a diff or file scope against recorded conventions, reporting verified violations and enforcement gaps. Reports only; avoids duplicating existing compiler, formatter, lint, or CI checks.
---

# Audit Conventions

Report violations of recorded conventions within a requested diff or file scope. Do not edit product code or start a migration.

Read applicable repository instructions, `.engineering/conventions.yaml`, and configuration when present. With incomplete records, audit the authoritative rules available and state the limits. Do not invent conventions or start an interview to fill the gaps.

Default to the requested branch diff against the configured base. For current-task reviews, include task-owned staged, unstaged, and untracked work; preserve the caller's boundary around unrelated changes.

## Review

Separate automated enforcement from ambient/documented rules. Inspect the actual recorded mechanism, which may be a linter, formatter, compiler flag, or CI gate. Report missing or disabled enforcement as its own finding; absence of a lint rule alone is not a gap. Avoid duplicating current automated results. Do not start full gates to conduct an audit; follow [write-tests](../write-tests/SKILL.md) for any necessary focused check.

Read surrounding code and relevant consumers. Verify each candidate against the exact decision, permitted exceptions, and current behavior. Distinguish a new violation from pre-existing migration debt. If authoritative instructions conflict, report the conflict instead of enforcing both.

## Report

Each finding names the source rule/decision ID, location, concrete violation, impact, and corrective direction. Distinguish confidence, severity, decision provenance, and pre-existing debt. A defaulted permission rule can still protect an important boundary; provenance alone does not determine impact.

Report opportunities for existing tools to enforce a currently manual rule when relevant. Keep the report proportional to the findings; no mandatory per-file artifact. Return findings to the caller without invoking fixes.
