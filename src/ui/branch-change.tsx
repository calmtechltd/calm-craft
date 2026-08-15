import { useEffect, useMemo, useRef, useState } from "react";

import type { BranchReview, Provenance, SemanticChange } from "../diff/model";
import type { SourceLocation, SpecDocument } from "../specs/model";
import { semanticChangeLabel, titleCase } from "./branch-review";
import { featureHref } from "./feature";
import { ArrowIcon } from "./icons";
import { loadSessionSource, type SessionSourceDescriptor } from "./session";
import {
  effectiveProvenance,
  REVIEW_PROVENANCE,
  reviewHref,
  type ReviewSelection,
} from "./review-route";

type ValueRecord = Record<string, unknown>;

function asRecord(value: unknown): ValueRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ValueRecord)
    : undefined;
}

function stringField(value: ValueRecord, key: string): string | undefined {
  return typeof value[key] === "string" ? value[key] : undefined;
}

function StringList({ values }: { values: unknown[] }) {
  if (values.length === 0) return <p className="diff-empty-value">None</p>;
  return (
    <ul className="diff-value-list">
      {values.map((value, index) => (
        <li key={`${String(value)}-${index}`}>{String(value)}</li>
      ))}
    </ul>
  );
}

function FieldList({ value }: { value: ValueRecord }) {
  const fields = Object.entries(value).filter(
    ([, field]) => field === null || ["string", "number", "boolean"].includes(typeof field),
  );
  if (fields.length === 0) return <pre>{JSON.stringify(value, null, 2)}</pre>;
  return (
    <dl className="typed-fields">
      {fields.map(([key, field]) => (
        <div key={key}>
          <dt>{titleCase(key)}</dt>
          <dd>{field === null || field === "" ? "None" : String(field)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SemanticValue({ change, value }: { change: SemanticChange; value: unknown }) {
  if (value === undefined || value === null) return <p className="diff-empty-value">Not present</p>;
  if (["string", "number", "boolean"].includes(typeof value))
    return <p className="diff-scalar">{String(value)}</p>;
  if (Array.isArray(value)) return <StringList values={value} />;

  const record = asRecord(value);
  if (!record) return <p>{String(value)}</p>;
  const category = change.kind.split(".")[0];
  const markdown = stringField(record, "markdown");
  const renderedHtml = stringField(record, "renderedHtml");

  if (category === "behaviour") {
    return (
      <div className="typed-behaviour">
        <div className="typed-identity">
          {stringField(record, "key") ? <code>{stringField(record, "key")}</code> : null}
          {stringField(record, "title") ? <strong>{stringField(record, "title")}</strong> : null}
          {stringField(record, "status") ? (
            <span>{titleCase(stringField(record, "status")!)}</span>
          ) : null}
        </div>
        {renderedHtml ? (
          <div className="prose" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        ) : markdown ? (
          <p>{markdown}</p>
        ) : (
          <FieldList value={record} />
        )}
        {stringField(record, "partialNote") ? (
          <p className="partial-evidence">Partial: {stringField(record, "partialNote")}</p>
        ) : null}
      </div>
    );
  }

  if (category === "invariant") {
    return renderedHtml ? (
      <div className="prose" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
    ) : (
      <p>{markdown}</p>
    );
  }

  if (category === "decision-row" && Array.isArray(record.cells)) {
    return (
      <table className="typed-decision" aria-label="Decision row value">
        <tbody>
          <tr>
            {record.cells.map((cell, index) => (
              <td key={`${String(cell)}-${index}`}>{String(cell)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    );
  }

  if (category === "question") {
    return (
      <div className="typed-question">
        {renderedHtml ? (
          <div className="prose" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        ) : (
          <p>{markdown ?? String(value)}</p>
        )}
        <span>{record.resolved === true ? "Resolved" : "Open"}</span>
        {Array.isArray(record.blocks) && record.blocks.length > 0 ? (
          <p>Blocks {record.blocks.map(String).join(", ")}</p>
        ) : null}
      </div>
    );
  }

  if (category === "relationship") {
    return (
      <div className="typed-relationship">
        <strong>{stringField(record, "label") ?? "Relationship evidence"}</strong>
        <span>
          {stringField(record, "sourceId") ?? "Unknown source"} <ArrowIcon />{" "}
          {stringField(record, "targetId") ?? "Missing target"}
        </span>
      </div>
    );
  }

  if (category === "flow") {
    const event = stringField(record, "event");
    const from = stringField(record, "from");
    const to = stringField(record, "to");
    if (event || from || to) {
      return (
        <div className="typed-transition">
          <strong>{event ?? stringField(record, "id") ?? "Flow transition"}</strong>
          <span>
            {from ?? "Start"} <ArrowIcon /> {to ?? "Destination"}
          </span>
          {stringField(record, "guard") ? <p>Guard: {stringField(record, "guard")}</p> : null}
          {stringField(record, "outcome") ? <p>Outcome: {stringField(record, "outcome")}</p> : null}
          {Array.isArray(record.covers) ? <StringList values={record.covers} /> : null}
        </div>
      );
    }
    return <FieldList value={record} />;
  }

  if (category === "validation") {
    return (
      <div className="typed-finding">
        <span>{titleCase(stringField(record, "severity") ?? "finding")}</span>
        <strong>{stringField(record, "code") ?? "Validation finding"}</strong>
        <p>{stringField(record, "message") ?? "No message supplied."}</p>
      </div>
    );
  }

  return <FieldList value={record} />;
}

function SourcePanel({
  descriptor,
  label,
  location,
  path,
  source,
}: {
  descriptor?: SessionSourceDescriptor;
  label: string;
  location?: SourceLocation;
  path?: string;
  source?: string;
}) {
  const [state, setState] = useState<
    | { status: "absent" }
    | { status: "loading" }
    | { status: "ready"; source: string }
    | { status: "error"; message: string }
  >(() =>
    source
      ? { status: "ready", source }
      : descriptor
        ? { status: "loading" }
        : { status: "absent" },
  );

  useEffect(() => {
    if (source) {
      setState({ status: "ready", source });
      return;
    }
    if (!descriptor) {
      setState({ status: "absent" });
      return;
    }
    let active = true;
    setState({ status: "loading" });
    void loadSessionSource(descriptor.id)
      .then((content) => {
        if (active) setState({ status: "ready", source: content });
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
      });
    return () => {
      active = false;
    };
  }, [descriptor, source]);

  const lines = state.status === "ready" ? state.source.split("\n") : [];
  return (
    <section className="raw-source-panel">
      <header>
        <strong>{label}</strong>
        <code>{path ?? descriptor?.path ?? "No source path"}</code>
        {location ? <span>Line {location.line}</span> : null}
      </header>
      {state.status === "ready" ? (
        <pre aria-label={`${label} raw source`} role="region" tabIndex={0}>
          <code>
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              return (
                <span
                  className={location?.line === lineNumber ? "source-focus-line" : undefined}
                  key={lineNumber}
                >
                  <i>{lineNumber}</i>
                  {line || " "}
                  {"\n"}
                </span>
              );
            })}
          </code>
        </pre>
      ) : state.status === "loading" ? (
        <p className="diff-empty-value" aria-live="polite">
          Loading source evidence…
        </p>
      ) : state.status === "error" ? (
        <p className="diff-empty-value" role="alert">
          {state.message}
        </p>
      ) : (
        <p className="diff-empty-value">Not present in this snapshot.</p>
      )}
    </section>
  );
}

function findSpec(review: BranchReview, id: string): SpecDocument | undefined {
  return (
    review.target.estate.specs.find((spec) => spec.id === id) ??
    review.baseline?.estate.specs.find((spec) => spec.id === id)
  );
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("input, select, textarea, [contenteditable='true']"))
  );
}

export function BranchChangeDetail({
  initialProvenance,
  review,
  selection,
  sources,
}: {
  initialProvenance: Provenance[];
  review: BranchReview;
  selection: ReviewSelection;
  sources: SessionSourceDescriptor[];
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const provenance = effectiveProvenance(selection, initialProvenance);
  const selected = useMemo(() => new Set(provenance), [provenance]);
  const changes = useMemo(
    () => review.semanticChanges.filter((change) => selected.has(change.provenance)),
    [review.semanticChanges, selected],
  );
  const changeIndex = changes.findIndex((change) => change.id === selection.change);
  const change = changes[changeIndex];
  const previous = changeIndex > 0 ? changes[changeIndex - 1] : undefined;
  const next =
    changeIndex >= 0 && changeIndex < changes.length - 1 ? changes[changeIndex + 1] : undefined;
  const spec = change ? findSpec(review, change.specId) : undefined;
  const group = selection.group ?? "module";
  const sourceByContext = useMemo(
    () =>
      new Map(
        sources.filter((source) => source.context).map((source) => [source.context!, source]),
      ),
    [sources],
  );

  const hrefFor = (candidate: SemanticChange, sourceDiff = false): string =>
    reviewHref({
      change: candidate.id,
      feature: candidate.specId,
      provenance,
      group,
      sourceDiff,
    });

  const toggleProvenance = (item: Provenance): void => {
    const nextSelection = new Set(selected);
    if (nextSelection.has(item)) nextSelection.delete(item);
    else nextSelection.add(item);
    const nextProvenance = REVIEW_PROVENANCE.map((option) => option.id).filter((option) =>
      nextSelection.has(option),
    );
    const destination =
      change && nextSelection.has(change.provenance)
        ? change
        : review.semanticChanges.find((candidate) => nextSelection.has(candidate.provenance));
    window.location.hash = reviewHref({
      change: destination?.id,
      feature: destination?.specId ?? change?.specId,
      provenance: nextProvenance,
      group,
    });
  };

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [selection.change]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTextEntryTarget(event.target)) return;
      const provenanceIndex = Number(event.key) - 1;
      if (provenanceIndex >= 0 && provenanceIndex < REVIEW_PROVENANCE.length) {
        event.preventDefault();
        toggleProvenance(REVIEW_PROVENANCE[provenanceIndex]!.id);
      } else if ((event.key === "j" || event.key === "ArrowRight") && next) {
        event.preventDefault();
        window.location.hash = hrefFor(next);
      } else if ((event.key === "k" || event.key === "ArrowLeft") && previous) {
        event.preventDefault();
        window.location.hash = hrefFor(previous);
      } else if (event.key === "d" && change) {
        event.preventDefault();
        window.location.hash = hrefFor(change, !selection.sourceDiff);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (!change || !spec) {
    return (
      <main className="review-unavailable" id="main-content">
        <p className="eyebrow">Change unavailable</p>
        <h1>This change is not in the selected provenance.</h1>
        <p>Restore its provenance layer or return to the branch summary.</p>
        <a href={reviewHref({ feature: selection.feature, provenance, group })}>
          Return to Branch Review
        </a>
      </main>
    );
  }

  return (
    <main className="change-detail" id="main-content">
      <header className="change-detail-hero">
        <a
          aria-label="Back to Branch Review"
          className="back-link"
          href={reviewHref({ feature: spec.id, provenance, group })}
        >
          <ArrowIcon /> Branch Review
        </a>
        <div className="change-detail-kicker">
          <span className={`tag-${change.provenance}`}>{titleCase(change.provenance)}</span>
          <span>
            Change {changeIndex + 1} of {changes.length}
          </span>
          <code>{spec.id}</code>
        </div>
        <h1 ref={titleRef} tabIndex={-1}>
          {semanticChangeLabel(change)}
        </h1>
        <p>
          In <strong>{spec.title}</strong>. Compare the typed product contract first, then inspect
          exact source evidence if needed.
        </p>
        <a className="feature-contract-link" href={featureHref(spec.id)}>
          Open feature contract <ArrowIcon />
        </a>
      </header>

      {change.inferred ? (
        <section className="inferred-callout" aria-label="Inferred rename confidence">
          <strong>Inferred, not proven</strong>
          <p>
            Text similarity suggests this rename. The original removal and addition remain separate
            evidence.
          </p>
        </section>
      ) : null}

      <section aria-label="Review navigation" className="change-toolbar">
        <div className="change-step-controls">
          {previous ? (
            <a href={hrefFor(previous)}>← Previous</a>
          ) : (
            <span aria-disabled="true">← Previous</span>
          )}
          {next ? <a href={hrefFor(next)}>Next →</a> : <span aria-disabled="true">Next →</span>}
        </div>
        <div className="detail-provenance-controls" aria-label="Provenance filters">
          {REVIEW_PROVENANCE.map((item, index) => (
            <button
              aria-pressed={selected.has(item.id)}
              key={item.id}
              onClick={() => toggleProvenance(item.id)}
              title={`${index + 1} · ${item.label}`}
              type="button"
            >
              <kbd>{index + 1}</kbd> {item.shortLabel}
            </button>
          ))}
        </div>
        <button
          aria-expanded={selection.sourceDiff ?? false}
          className="source-diff-toggle"
          onClick={() => {
            window.location.hash = hrefFor(change, !selection.sourceDiff);
          }}
          type="button"
        >
          <kbd>D</kbd> {selection.sourceDiff ? "Hide source diff" : "Show source diff"}
        </button>
      </section>

      <div className="change-detail-layout">
        <aside className="change-rail">
          <p className="eyebrow">Selected change set</p>
          <nav aria-label="Branch changes">
            {changes.map((candidate, index) => {
              const candidateSpec = findSpec(review, candidate.specId);
              return (
                <a
                  aria-current={candidate.id === change.id ? "true" : undefined}
                  href={hrefFor(candidate)}
                  key={candidate.id}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{semanticChangeLabel(candidate)}</strong>
                    <small>{candidateSpec?.title ?? candidate.specId}</small>
                  </span>
                </a>
              );
            })}
          </nav>
          <p className="shortcut-note">
            <kbd>J</kbd>/<kbd>K</kbd> move · <kbd>D</kbd> source · <kbd>1–4</kbd> provenance
          </p>
        </aside>

        <article className="change-comparison">
          <div
            aria-label="Typed before and after comparison"
            className="typed-comparison"
            role="region"
          >
            <section className="diff-value diff-before">
              <header>
                <span aria-hidden="true">−</span>
                <strong>Before</strong>
                <small>{change.evidence.beforePath ?? "Absent"}</small>
              </header>
              <div>
                <SemanticValue change={change} value={change.before} />
              </div>
            </section>
            <section className="diff-value diff-after">
              <header>
                <span aria-hidden="true">+</span>
                <strong>After</strong>
                <small>{change.evidence.afterPath ?? "Absent"}</small>
              </header>
              <div>
                <SemanticValue change={change} value={change.after} />
              </div>
            </section>
          </div>

          {selection.sourceDiff ? (
            <section className="raw-source-diff" aria-label="Raw source diff">
              <header>
                <div>
                  <p className="eyebrow">Exact evidence</p>
                  <h2>Raw source diff</h2>
                </div>
                <span>Markdown or YAML · read only</span>
              </header>
              <div>
                <SourcePanel
                  descriptor={sourceByContext.get(`${change.id}:before`)}
                  label="Before"
                  location={change.evidence.beforeLocation}
                  path={change.evidence.beforePath}
                  source={change.evidence.beforeSource}
                />
                <SourcePanel
                  descriptor={sourceByContext.get(`${change.id}:after`)}
                  label="After"
                  location={change.evidence.afterLocation}
                  path={change.evidence.afterPath}
                  source={change.evidence.afterSource}
                />
              </div>
            </section>
          ) : null}
        </article>
      </div>
    </main>
  );
}
