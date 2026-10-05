---
name: linear-pr-link
description: "Check Linear for matching outstanding issues before creating or submitting a PR in repositories configured with tickets.provider: linear in .engineering/config.yaml. Link a suitable issue or offer to create one; skip repositories without Linear configured."
---

# Linear PR Link

Before publishing a PR in a repository that uses Linear, check whether its work belongs to an existing outstanding issue. Apply this alongside the current repository's PR workflow.

## Check repository configuration

Read the `tickets` section of `.engineering/config.yaml` for this specific lookup. Run the Linear workflow only when `tickets.provider` is `linear`. Missing configuration, an absent provider, `none`, or a different provider means skip this workflow and continue the requested PR preparation without searching Linear or offering a Linear ticket. Access to a Linear connector alone does not opt a repository in.

Use `tickets.pattern` and `tickets.url` to identify the repository's issue identifiers and workspace. Resolve the relevant Linear team from verified issue/team data; do not assume that a ticket prefix is a Linear project. Follow any explicit repository project mapping or user-selected issue, and keep searches and candidates within that scope. Broaden search terms within the scope rather than associating a similarly named ticket from an unrelated team or workspace.

For `linear`, the configuration contract requires a ticket pattern and URL template containing `{id}`. If the file is unreadable or these settings are invalid or missing, report the configuration gap and ask for the missing scope while continuing independent preparation. Do not silently treat broken configuration as an opt-out or search the entire connected workspace.

## Find a suitable issue

- Use the actual diff and task context to identify the problem, changed behavior, and scope. Search with product terms and relevant synonyms; the proposed PR title alone may miss an existing ticket.
- Use the connected Linear tools. `search` finds semantic candidates; `list_issues` supports team, project, and status filters; `get_issue` provides the details needed to judge a match. Discover the equivalent tools in the current environment rather than assuming a fixed tool namespace.
- If the user supplied an issue or the branch/PR already references one, read it first and verify the relationship. Preserve an intentional user-selected association; clarify a material mismatch instead of silently replacing it.
- Look in the repository's relevant team or project. Try alternative terms if needed before concluding there is no suitable match. Do not restrict results to tickets assigned to the user. Treat triage, backlog, planned, in-progress, and review issues as outstanding according to the team's actual states. Completed, canceled, or archived issues may provide context but are not outstanding matches.
- Read the descriptions and status of promising candidates. A shared keyword is insufficient: the ticket's requested outcome should correspond to the PR's work. An outstanding parent or broader issue can be suitable when this PR delivers a clearly identified part of it.

For a single clear match, proceed with the association and briefly explain why it fits. For competing plausible matches, present their identifiers, titles, links, and the scope difference, then ask the user to choose an existing ticket or create a new Linear ticket for this PR. Do not force a weak match to avoid offering a new ticket.

## When no suitable match exists

If a successful search returns no results, only unsuitable or closed tickets, or the user rejects the suggested matches, explicitly offer **Create a new Linear ticket** alongside **Continue without a ticket**. Do not stop at reporting that no match was found. Briefly state what was searched and prepare a concrete ticket draft: title, concise problem and resulting behavior, relevant acceptance criteria, and proposed team/project when known. Keep the draft proportional to the PR and reflect work already implemented accurately.

Ask whether to create that ticket or continue without one. Create it only after explicit authorization, including authorization already given in this conversation. Resolve a required team choice before creation. Do not invent priority, assignee, cycle, or deadlines. While waiting, finish independent PR preparation; wait for the user's decision before publishing unless they already authorized proceeding without a ticket.

If the user declines, continue the requested PR workflow without an issue. If creation is approved, create the agreed ticket and use the returned identifier and URL. If a create call has an unknown outcome, check whether it succeeded before retrying so it does not produce duplicates.

If Linear is unavailable or a search fails, report that the check could not be completed. Do not claim there are no matches or offer a duplicate ticket based on a failed search. Ask whether to retry or continue without the check, while completing independent preparation.

## Associate the issue with the PR

Add the verified issue identifier and link to the PR description, preserving the repository's template. Use its established issue-link convention when available. Otherwise, use a clear line such as `Linear: [TEAM-123](verified issue URL)` and describe which part of the ticket the PR delivers.

Use closing language only when the PR fulfills the issue's scope and the repository's integration convention calls for it; use a related-issue reference for partial work. Do not rename an existing branch just to add a ticket identifier, or change Linear status, assignment, or issue content as part of this check. Follow separately authorized instructions for those actions. Do not post Linear comments as part of association.

Finish the existing PR workflow and report the linked ticket, or that the user chose to proceed without one. Distinguish adding a reference in the PR from an integration association actually confirmed by the tools.
