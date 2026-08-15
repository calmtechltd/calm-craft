import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import type { BranchReview, Provenance, SemanticChange } from "../diff/model";
import type {
  FindingSeverity,
  OpenQuestion,
  SpecDocument,
  SpecEstate,
  SpecFinding,
} from "../specs/model";
import { featureHref } from "./feature";
import { ArrowIcon, SearchIcon } from "./icons";
import { REVIEW_PROVENANCE, reviewHref } from "./review-route";

export type HealthState = "current" | "introduced" | "resolved";

export type HealthSelection = {
  finding?: string;
  search?: string;
  severity?: FindingSeverity;
  state?: HealthState;
};

export type HealthItem = {
  key: string;
  finding: SpecFinding;
  state: HealthState;
  specId?: string;
  changeId?: string;
  provenance?: Provenance;
  question?: OpenQuestion;
};

const SEVERITY_ORDER: Record<FindingSeverity, number> = { error: 0, warning: 1, info: 2 };

function isFinding(value: unknown): value is SpecFinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.code === "string" &&
    (record.severity === "error" || record.severity === "warning" || record.severity === "info") &&
    typeof record.path === "string" &&
    typeof record.message === "string"
  );
}

function specByPath(estate: SpecEstate): Map<string, SpecDocument> {
  return new Map(estate.specs.map((spec) => [spec.path, spec]));
}

function transitionFinding(change: SemanticChange): SpecFinding | undefined {
  if (change.kind === "validation.resolved") {
    return isFinding(change.before) ? change.before : undefined;
  }
  if (change.kind === "validation.introduced" || change.kind === "relationship.broken") {
    return isFinding(change.after) ? change.after : undefined;
  }
  return undefined;
}

export function buildHealthItems(estate: SpecEstate, review?: BranchReview): HealthItem[] {
  const paths = specByPath(estate);
  const items: HealthItem[] = [];
  const transitionedCurrent = new Set<string>();

  if (review) {
    for (const change of review.semanticChanges) {
      const finding = transitionFinding(change);
      if (!finding) continue;
      const state = change.kind === "validation.resolved" ? "resolved" : "introduced";
      if (state === "introduced") transitionedCurrent.add(finding.id);
      items.push({
        key: `change:${change.id}`,
        finding,
        state,
        specId: change.specId === "estate" ? paths.get(finding.path)?.id : change.specId,
        changeId: change.id,
        provenance: change.provenance,
      });
    }
  }

  for (const finding of estate.findings) {
    if (transitionedCurrent.has(finding.id)) continue;
    items.push({
      key: `current:${finding.id}`,
      finding,
      state: "current",
      specId: paths.get(finding.path)?.id,
    });
  }

  for (const spec of estate.specs) {
    spec.openQuestions.forEach((question, index) => {
      if (question.resolved) return;
      const finding: SpecFinding = {
        id: `question.unresolved:${spec.id}:${question.location.line}:${index}`,
        code: "question.unresolved",
        severity: "info",
        path: spec.path,
        location: question.location,
        message:
          question.blocks.length > 0
            ? `An open question blocks ${question.blocks.join(", ")}.`
            : "An open question remains unresolved.",
        hint:
          question.blocks.length > 0
            ? `Open the feature context and resolve the question before delivering ${question.blocks.join(", ")}.`
            : "Open the feature context, record a decision, or mark the question as settled.",
      };
      items.push({
        key: `question:${finding.id}`,
        finding,
        state: "current",
        specId: spec.id,
        question,
      });
    });
  }

  return items.toSorted(
    (left, right) =>
      SEVERITY_ORDER[left.finding.severity] - SEVERITY_ORDER[right.finding.severity] ||
      left.finding.path.localeCompare(right.finding.path) ||
      (left.finding.location?.line ?? 0) - (right.finding.location?.line ?? 0) ||
      left.key.localeCompare(right.key),
  );
}

export function parseHealthSelection(
  segments: string[],
  parameters: URLSearchParams,
): HealthSelection {
  const selection: HealthSelection = {};
  if (segments[1] === "finding" && segments[2]) {
    try {
      selection.finding = decodeURIComponent(segments[2]);
    } catch {
      // Ignore malformed local route state.
    }
  }
  const search = parameters.get("search")?.trim();
  const severity = parameters.get("severity");
  const state = parameters.get("state");
  if (search) selection.search = search;
  if (severity === "error" || severity === "warning" || severity === "info") {
    selection.severity = severity;
  }
  if (state === "current" || state === "introduced" || state === "resolved") {
    selection.state = state;
  }
  return selection;
}

export function healthHref(selection: HealthSelection = {}): string {
  const path = selection.finding
    ? `#/health/finding/${encodeURIComponent(selection.finding)}`
    : "#/health";
  const parameters = new URLSearchParams();
  if (selection.search) parameters.set("search", selection.search);
  if (selection.severity) parameters.set("severity", selection.severity);
  if (selection.state) parameters.set("state", selection.state);
  return parameters.size > 0 ? `${path}?${parameters}` : path;
}

function findingLabel(item: HealthItem): string {
  if (item.state === "introduced") return "Introduced here";
  if (item.state === "resolved") return "Resolved here";
  return "Current finding";
}

function FeatureContextLink({ item }: { item: HealthItem }) {
  if (!item.specId) return null;
  const selection = item.question
    ? { question: item.question.location.line }
    : { finding: item.finding.id };
  return (
    <a className="health-action" href={featureHref(item.specId, selection)}>
      Open feature context <ArrowIcon />
    </a>
  );
}

function ReviewContextLink({ item }: { item: HealthItem }) {
  if (!item.changeId) return null;
  return (
    <a
      className="health-action"
      href={reviewHref({
        change: item.changeId,
        feature: item.specId,
        provenance: REVIEW_PROVENANCE.map((option) => option.id),
        group: "type",
        sourceDiff: true,
      })}
    >
      Open branch evidence <ArrowIcon />
    </a>
  );
}

export function HealthView({
  estate,
  review,
  selection,
}: {
  estate: SpecEstate;
  review?: BranchReview;
  selection: HealthSelection;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [searchDraft, setSearchDraft] = useState(selection.search ?? "");
  const items = useMemo(() => buildHealthItems(estate, review), [estate, review]);
  const deferredSearch = useDeferredValue(searchDraft.toLocaleLowerCase());
  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (selection.severity && item.finding.severity !== selection.severity) return false;
        if (selection.state && item.state !== selection.state) return false;
        if (!deferredSearch) return true;
        return [
          item.finding.code,
          item.finding.message,
          item.finding.path,
          item.finding.hint,
          item.specId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(deferredSearch);
      }),
    [deferredSearch, items, selection.severity, selection.state],
  );
  const selected = selection.finding
    ? items.find((item) => item.key === selection.finding)
    : undefined;
  const counts = useMemo(
    () => ({
      errors: items.filter((item) => item.finding.severity === "error").length,
      warnings: items.filter((item) => item.finding.severity === "warning").length,
      questions: items.filter((item) => item.finding.code === "question.unresolved").length,
    }),
    [items],
  );

  useEffect(() => {
    if (selected) titleRef.current?.focus({ preventScroll: true });
  }, [selected]);

  useEffect(() => {
    setSearchDraft(selection.search ?? "");
  }, [selection.search]);

  const update = (next: Partial<HealthSelection>): void => {
    const updated = {
      ...selection,
      search: searchDraft || undefined,
      ...next,
      finding: undefined,
    };
    const href = healthHref(updated);
    if (Object.keys(next).length === 1 && Object.hasOwn(next, "search")) {
      setSearchDraft(next.search ?? "");
      window.history.replaceState(window.history.state, "", href);
    } else {
      window.location.hash = href;
    }
  };

  return (
    <main className="health-view" id="main-content">
      <header className="view-heading health-heading">
        <h1>Health</h1>
        <div className="health-totals" aria-label={`${items.length} health items`}>
          <span>
            <strong>{counts.errors}</strong> errors
          </span>
          <span>
            <strong>{counts.warnings}</strong> warnings
          </span>
          <span>
            <strong>{counts.questions}</strong> open questions
          </span>
        </div>
      </header>

      <section aria-label="Health controls" className="health-controls">
        <label className="search-field">
          <SearchIcon />
          <span className="sr-only">Search findings</span>
          <input
            aria-label="Search findings"
            onChange={(event) => update({ search: event.currentTarget.value || undefined })}
            placeholder="Search code, message, feature, or source…"
            type="search"
            value={searchDraft}
          />
        </label>
        <label>
          <span>Severity</span>
          <select
            aria-label="Filter findings by severity"
            onChange={(event) =>
              update({
                severity: (event.currentTarget.value || undefined) as FindingSeverity | undefined,
              })
            }
            value={selection.severity ?? ""}
          >
            <option value="">Every severity</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Information</option>
          </select>
        </label>
        <label>
          <span>Review state</span>
          <select
            aria-label="Filter findings by review state"
            onChange={(event) =>
              update({ state: (event.currentTarget.value || undefined) as HealthState | undefined })
            }
            value={selection.state ?? ""}
          >
            <option value="">Every state</option>
            <option value="current">Current</option>
            <option value="introduced">Introduced here</option>
            <option value="resolved">Resolved here</option>
          </select>
        </label>
      </section>

      <div aria-live="polite" className="result-summary">
        Showing {visible.length} of {items.length} health items
      </div>

      <div className="health-layout">
        <section aria-label="Health findings" className="health-list">
          {visible.length === 0 ? (
            <div className="empty-state compact">
              <span aria-hidden="true">✓</span>
              <h2>No findings match</h2>
              <p>The active filters do not match any contract finding.</p>
            </div>
          ) : (
            visible.map((item) => (
              <a
                aria-current={selected?.key === item.key ? "true" : undefined}
                className="health-row"
                href={healthHref({
                  ...selection,
                  search: searchDraft || undefined,
                  finding: item.key,
                })}
                id={`health-${item.key}`}
                key={item.key}
              >
                <span className={`health-severity severity-${item.finding.severity}`}>
                  {item.finding.severity}
                </span>
                <span>
                  <strong>{item.finding.message}</strong>
                  <small>{item.finding.code}</small>
                </span>
                <span>
                  <code>{item.finding.path}</code>
                  <small>
                    {item.finding.location ? `Line ${item.finding.location.line} · ` : ""}
                    {findingLabel(item)}
                  </small>
                </span>
                <ArrowIcon />
              </a>
            ))
          )}
        </section>

        <aside className="health-detail" aria-label="Finding detail">
          {selected ? (
            <>
              <div className="health-detail-kicker">
                <span className={`health-severity severity-${selected.finding.severity}`}>
                  {selected.finding.severity}
                </span>
                <span>{findingLabel(selected)}</span>
                {selected.provenance ? <span>{selected.provenance}</span> : null}
              </div>
              <h2 ref={titleRef} tabIndex={-1}>
                {selected.finding.message}
              </h2>
              <code>{selected.finding.code}</code>
              <dl>
                <div>
                  <dt>Source</dt>
                  <dd>{selected.finding.path}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {selected.finding.location
                      ? `Line ${selected.finding.location.line}, column ${selected.finding.location.column}`
                      : "File level"}
                  </dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{findingLabel(selected)}</dd>
                </div>
              </dl>
              <section>
                <p className="eyebrow">Repair guidance</p>
                <p>
                  {selected.finding.hint ??
                    "Inspect the source contract and resolve the reported inconsistency."}
                </p>
              </section>
              <div className="health-actions">
                <FeatureContextLink item={selected} />
                <ReviewContextLink item={selected} />
              </div>
            </>
          ) : (
            <div className="health-detail-empty">
              <span aria-hidden="true">⌁</span>
              <h2>Select a finding</h2>
              <p>Open a row to inspect its repair guidance and exact product context.</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
