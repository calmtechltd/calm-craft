import { useEffect, useMemo } from "react";

import type { BranchReview, Provenance, SemanticChange } from "../diff/model";
import type { SpecDocument } from "../specs/model";
import { ArrowIcon } from "./icons";
import {
  effectiveProvenance,
  REVIEW_PROVENANCE,
  reviewHref,
  type ReviewGroupMode,
  type ReviewSelection,
} from "./review-route";

type ReviewFeature = {
  spec: SpecDocument;
  changes: SemanticChange[];
  presentInTarget: boolean;
};

type ReviewGroup = {
  key: string;
  label: string;
  features: ReviewFeature[];
  changeCount: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  spec: "Specification",
  behaviour: "Behaviours",
  invariant: "Invariants",
  "decision-row": "Decision rows",
  question: "Questions",
  relationship: "Relationships",
  flow: "User flows",
  validation: "Validation",
};

export function titleCase(value: string): string {
  return value
    .split(/[-._]+/u)
    .map((part) => `${part.slice(0, 1).toLocaleUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function semanticChangeLabel(change: SemanticChange): string {
  const [category = "change", detail = "changed", qualifier] = change.kind.split(".");
  const categoryLabel = CATEGORY_LABELS[category] ?? titleCase(category);
  const detailLabel = titleCase([detail, qualifier].filter(Boolean).join("-"));
  const evidence = change.after ?? change.before;
  const findingCode =
    category === "validation" && evidence && typeof evidence === "object" && "code" in evidence
      ? evidence.code
      : undefined;
  const elementId =
    category === "validation" || /:[0-9a-f]{8,}$/u.test(change.elementId ?? "")
      ? undefined
      : change.elementId;
  return `${elementId ? `${elementId} · ` : ""}${categoryLabel} ${detailLabel}${typeof findingCode === "string" ? ` · ${titleCase(findingCode)}` : ""}`;
}

function groupLabel(mode: ReviewGroupMode, key: string): string {
  if (mode === "provenance")
    return REVIEW_PROVENANCE.find((item) => item.id === key)?.label ?? titleCase(key);
  if (mode === "type") return CATEGORY_LABELS[key] ?? titleCase(key);
  return key;
}

export function groupReviewChanges(
  review: BranchReview,
  selected: ReadonlySet<Provenance>,
  mode: ReviewGroupMode,
): ReviewGroup[] {
  const targetSpecs = new Map(review.estate.specs.map((spec) => [spec.id, spec]));
  const baselineSpecs = new Map(review.baseline?.estate.specs.map((spec) => [spec.id, spec]) ?? []);
  const grouped = new Map<string, Map<string, ReviewFeature>>();

  for (const change of review.semanticChanges) {
    if (!selected.has(change.provenance)) continue;
    const spec = targetSpecs.get(change.specId) ?? baselineSpecs.get(change.specId);
    if (!spec) continue;
    const groupKey =
      mode === "module"
        ? spec.module
        : mode === "provenance"
          ? change.provenance
          : (change.kind.split(".")[0] ?? "change");
    const features = grouped.get(groupKey) ?? new Map<string, ReviewFeature>();
    const feature = features.get(spec.id) ?? {
      spec,
      changes: [],
      presentInTarget: targetSpecs.has(spec.id),
    };
    feature.changes.push(change);
    features.set(spec.id, feature);
    grouped.set(groupKey, features);
  }

  return [...grouped]
    .map(([key, features]) => ({
      key,
      label: groupLabel(mode, key),
      features: [...features.values()].toSorted((left, right) =>
        left.spec.title.localeCompare(right.spec.title),
      ),
      changeCount: [...features.values()].reduce(
        (total, feature) => total + feature.changes.length,
        0,
      ),
    }))
    .toSorted((left, right) => left.label.localeCompare(right.label));
}

function BaseUnavailable({ review }: { review: BranchReview }) {
  return (
    <main className="review-unavailable" id="main-content">
      <a aria-label="Back to Atlas" className="back-link" href="#/atlas">
        <ArrowIcon /> Atlas
      </a>
      <p className="eyebrow">Branch Review unavailable</p>
      <h1>Choose a comparison base to review this branch.</h1>
      <p>{review.base.reason ?? "No valid local base reference could be resolved."}</p>
      <code>calmcraft view --diff --base &lt;ref&gt;</code>
      {review.base.attempted.length > 0 ? (
        <div className="attempted-bases">
          <span>Tried locally</span>
          {review.base.attempted.map((candidate) => (
            <code key={candidate}>{candidate}</code>
          ))}
        </div>
      ) : null}
      <p className="review-guidance">Atlas and every healthy Feature remain available.</p>
    </main>
  );
}

export function BranchReviewView({
  initialProvenance,
  review,
  selection,
}: {
  initialProvenance: Provenance[];
  review: BranchReview;
  selection: ReviewSelection;
}) {
  const selected = useMemo(
    () => new Set(effectiveProvenance(selection, initialProvenance)),
    [initialProvenance, selection],
  );
  const groupMode = selection.group ?? "module";
  const groups = useMemo(
    () => groupReviewChanges(review, selected, groupMode),
    [groupMode, review, selected],
  );
  const counts = useMemo(() => {
    const result = new Map<Provenance, number>(REVIEW_PROVENANCE.map((item) => [item.id, 0]));
    for (const change of review.semanticChanges)
      result.set(change.provenance, (result.get(change.provenance) ?? 0) + 1);
    return result;
  }, [review.semanticChanges]);
  const visibleChanges = groups.reduce((total, group) => total + group.changeCount, 0);

  useEffect(() => {
    if (!selection.feature) return;
    const target = document.getElementById(`review-feature-${selection.feature}`);
    target?.scrollIntoView?.({ block: "center" });
    target?.focus({ preventScroll: true });
  }, [selection.feature]);

  if (!review.available) return <BaseUnavailable review={review} />;

  const toggleProvenance = (provenance: Provenance): void => {
    const next = new Set(selected);
    if (next.has(provenance)) next.delete(provenance);
    else next.add(provenance);
    window.location.hash = reviewHref({
      ...selection,
      change: undefined,
      provenance: REVIEW_PROVENANCE.map((item) => item.id).filter((item) => next.has(item)),
      group: groupMode,
      sourceDiff: false,
    });
  };

  return (
    <main className="branch-review" id="main-content">
      <header className="view-heading">
        <h1>Branch Review</h1>
        <span className="view-count">
          {review.semanticChanges.length === 0
            ? "No semantic changes"
            : `${review.semanticChanges.length} semantic changes across ${new Set(review.semanticChanges.map((change) => change.specId)).size} features`}
        </span>
      </header>

      <section aria-label="Comparison identity" className="comparison-strip">
        <div>
          <span>Current target</span>
          <strong>{review.repository.branch ?? "Detached HEAD"}</strong>
          <code>{review.repository.head.slice(0, 10)}</code>
        </div>
        <ArrowIcon />
        <div>
          <span>Selected base</span>
          <strong>{review.base.selectedBase}</strong>
          <code>{review.base.selectedCommit?.slice(0, 10)}</code>
        </div>
        <div>
          <span>Merge-base</span>
          <strong>{review.base.mergeBase?.slice(0, 10)}</strong>
          <small>
            {review.base.source ? `${titleCase(review.base.source)} selection` : "Resolved locally"}
          </small>
        </div>
        <div>
          <span>Comparison target</span>
          <strong>Current filesystem</strong>
          <small>Commits and selected local work</small>
        </div>
      </section>

      <section aria-label="Review controls" className="review-controls">
        <div className="provenance-controls">
          {REVIEW_PROVENANCE.map((item) => (
            <button
              aria-pressed={selected.has(item.id)}
              className={`provenance-toggle provenance-${item.id}`}
              key={item.id}
              onClick={() => toggleProvenance(item.id)}
              type="button"
            >
              <span aria-hidden="true">{item.symbol}</span>
              <span>
                <strong>{item.shortLabel}</strong>
                <small>{counts.get(item.id)} changes</small>
              </span>
            </button>
          ))}
        </div>
        <div className="group-controls">
          <span>Group by</span>
          {(["module", "type", "provenance"] as const).map((mode) => (
            <button
              aria-pressed={groupMode === mode}
              key={mode}
              onClick={() => {
                window.location.hash = reviewHref({
                  ...selection,
                  change: undefined,
                  provenance: [...selected],
                  group: mode,
                  sourceDiff: false,
                });
              }}
              type="button"
            >
              {titleCase(mode)}
            </button>
          ))}
        </div>
      </section>

      <div aria-live="polite" className="review-result-count">
        {visibleChanges} of {review.semanticChanges.length} semantic changes shown
      </div>

      {groups.length === 0 ? (
        <section className="empty-state review-empty">
          <span aria-hidden="true">◎</span>
          <h2>
            {review.semanticChanges.length === 0
              ? "No product intent changed"
              : "No selected provenance"}
          </h2>
          <p>
            {review.semanticChanges.length === 0
              ? "The selected base and current filesystem produce the same semantic estate."
              : "Enable a provenance layer to bring its semantic changes back into this summary."}
          </p>
          <a href="#/atlas">Open the full Atlas</a>
        </section>
      ) : (
        <div className="review-groups">
          {groups.map((group) => (
            <section className="review-group" key={group.key}>
              <header>
                <h2>{group.label}</h2>
                <span>{group.changeCount} changes</span>
              </header>
              <div className="review-feature-list">
                {group.features.map((feature) => {
                  const provenances = [
                    ...new Set(feature.changes.map((change) => change.provenance)),
                  ];
                  const kinds = [...new Set(feature.changes.map((change) => change.kind))];
                  return (
                    <a
                      className="review-feature"
                      href={reviewHref({
                        ...selection,
                        change: feature.changes[0]?.id,
                        feature: feature.spec.id,
                        provenance: [...selected],
                        group: groupMode,
                        sourceDiff: false,
                      })}
                      id={`review-feature-${feature.spec.id}`}
                      key={feature.spec.id}
                    >
                      <span className="review-feature-identity">
                        <small>{feature.spec.id}</small>
                        <strong>{feature.spec.title}</strong>
                        <code>{feature.spec.path}</code>
                      </span>
                      <span className="change-summary">
                        {feature.changes.slice(0, 3).map((change) => (
                          <span key={change.id}>{semanticChangeLabel(change)}</span>
                        ))}
                        {feature.changes.length > 3 ? (
                          <small>+{feature.changes.length - 3} more</small>
                        ) : null}
                      </span>
                      <span className="review-tags">
                        {provenances.map((provenance) => (
                          <span className={`tag-${provenance}`} key={provenance}>
                            {titleCase(provenance)}
                          </span>
                        ))}
                        <small>
                          {kinds.length} change {kinds.length === 1 ? "type" : "types"}
                        </small>
                        {!feature.presentInTarget ? <strong>Base only</strong> : null}
                      </span>
                      <ArrowIcon />
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

export function BranchReviewNotStarted() {
  return (
    <main className="review-unavailable" id="main-content">
      <p className="eyebrow">Estate-only session</p>
      <h1>Start this session with a branch comparison.</h1>
      <code>calmcraft view --diff</code>
      <a href="#/atlas">Return to Atlas</a>
    </main>
  );
}
