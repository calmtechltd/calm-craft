---
name: spec-triage-bug-report
description: Assess a bug report against authoritative intent and observed behavior, including an insufficient-evidence outcome. Reports only; a missing spec does not block triage from other reliable requirements.
---

# Triage a Bug Report

Classify a reported discrepancy without editing code or specs. Separate what the reporter observed from their interpretation: actions, actual outcome, expected outcome, and reproducing conditions.

Find the governing spec and relevant behavior/row/transition IDs when present. If no spec exists, use other authoritative evidence such as a user requirement, external contract, or established prior behavior. Do not require a feature-wide spec backfill before assessing a clear regression.

| Verdict | Evidence and next action |
| --- | --- |
| Confirmed bug | Authoritative intent and actual behavior disagree; explain why the implementation should change. |
| Expected behavior | The observed behavior matches established intent; explain the difference from the reporter's expectation. |
| Spec gap | The case has no settled intended outcome; identify the product decision needed. |
| Spec drift | Evidence establishes an intended change that the spec has not absorbed. |
| Out of scope | An authoritative exclusion or deferral covers the reported case. |
| No governing contract | No adequate intent source was found; identify the requirement to establish. |
| Insufficient evidence | Missing reproduction or intent evidence prevents a confident verdict; name the smallest fact/check that would settle it. |

Uncertainty is a result, not a reason to force a verdict. Distinguish a missing spec from missing intent. A stated future feature does not excuse a regression in an existing supported path.

Check shared handlers/helpers before declaring a defect. Reuse current evidence; follow [write-tests](../write-tests/SKILL.md) for any focused verification. Do not launch tests, browsers, or broad audits merely to complete triage.

Report the verdict, governing evidence, actual versus expected outcome, confidence/limits, and next action. For a confirmed runtime regression, `bug-regression-red-green` can guide an authorized fix after applying test-value policy. For uncertain intent, ask only the necessary question and leave independent authorized work free to continue.
