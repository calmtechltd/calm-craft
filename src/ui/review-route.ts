import type { Provenance } from "../diff/model";

export type ReviewGroupMode = "module" | "type" | "provenance";

export type ReviewSelection = {
  change?: string;
  feature?: string;
  provenance?: Provenance[];
  group?: ReviewGroupMode;
  sourceDiff?: boolean;
};

export const REVIEW_PROVENANCE: Array<{
  id: Provenance;
  label: string;
  shortLabel: string;
  symbol: string;
}> = [
  { id: "committed", label: "Branch commits", shortLabel: "Committed", symbol: "◆" },
  { id: "staged", label: "Staged changes", shortLabel: "Staged", symbol: "▣" },
  { id: "unstaged", label: "Unstaged changes", shortLabel: "Unstaged", symbol: "◒" },
  { id: "untracked", label: "Untracked specs", shortLabel: "Untracked", symbol: "+" },
];

function decode(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function parseReviewSelection(
  segments: string[],
  parameters: URLSearchParams,
): ReviewSelection {
  const requested = parameters.has("provenance")
    ? (parameters.get("provenance") ?? "").split(",")
    : undefined;
  const provenance = requested
    ? REVIEW_PROVENANCE.map((item) => item.id).filter((item) => requested.includes(item))
    : undefined;
  const group = parameters.get("group");
  const selection: ReviewSelection = {};
  const change = segments[1] === "change" ? decode(segments[2]) : undefined;
  const feature = parameters.get("feature") ?? undefined;
  if (change) selection.change = change;
  if (feature) selection.feature = feature;
  if (provenance) selection.provenance = provenance;
  if (group === "module" || group === "type" || group === "provenance") selection.group = group;
  if (parameters.get("source") === "1") selection.sourceDiff = true;
  return selection;
}

export function reviewHref(selection: ReviewSelection = {}): string {
  const path = selection.change
    ? `#/review/change/${encodeURIComponent(selection.change)}`
    : "#/review";
  const parameters = new URLSearchParams();
  if (selection.feature) parameters.set("feature", selection.feature);
  if (selection.provenance) parameters.set("provenance", selection.provenance.join(","));
  if (selection.group) parameters.set("group", selection.group);
  if (selection.sourceDiff) parameters.set("source", "1");
  return parameters.size > 0 ? `${path}?${parameters}` : path;
}

export function effectiveProvenance(
  selection: ReviewSelection,
  initial: Provenance[],
): Provenance[] {
  return selection.provenance ?? initial;
}
