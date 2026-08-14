import { useEffect, useMemo, useRef, useState } from "react";

import type {
  Flow,
  FlowState,
  FlowTransition,
  SpecDocument,
  SpecEstate,
  SpecRelationship,
} from "../specs/model";
import { ArrowIcon, CloseIcon } from "./icons";
import { loadSessionSource, type SessionSourceDescriptor } from "./session";
import { StatusBadge } from "./status";

export type FeatureSelection = {
  behaviour?: string;
  flow?: string;
  state?: string;
  transition?: string;
  finding?: string;
  question?: number;
};

type FeatureViewProps = {
  estate: SpecEstate;
  selection: FeatureSelection;
  sources: SessionSourceDescriptor[];
  spec: SpecDocument;
};

export function featureHref(id: string, selection: FeatureSelection = {}): string {
  const base = `#/feature/${encodeURIComponent(id)}${
    selection.behaviour ? `/behaviour/${encodeURIComponent(selection.behaviour)}` : ""
  }`;
  const query = new URLSearchParams();
  if (selection.flow) query.set("flow", selection.flow);
  if (selection.state) query.set("state", selection.state);
  if (selection.transition) query.set("transition", selection.transition);
  if (selection.finding) query.set("finding", selection.finding);
  if (selection.question) query.set("question", String(selection.question));
  return query.size > 0 ? `${base}?${query}` : base;
}

function RichText({
  html,
  className = "prose",
  relationships = [],
}: {
  html: string;
  className?: string;
  relationships?: SpecRelationship[];
}) {
  const followNormalizedRelationship = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest("a");
    const label = anchor?.textContent?.trim();
    const relationship = label
      ? relationships.find((candidate) => candidate.label === label)
      : undefined;
    if (!relationship) return;
    event.preventDefault();
    window.location.hash = `/feature/${encodeURIComponent(relationship.targetId)}`;
  };
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={followNormalizedRelationship}
    />
  );
}

function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView?.({ block: "start" });
}

function SourceDrawer({
  descriptor,
  onClose,
}: {
  descriptor: SessionSourceDescriptor;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; source: string }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    void loadSessionSource(descriptor.id)
      .then((source) => {
        if (active) setState({ status: "ready", source });
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
  }, [descriptor.id]);

  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <aside aria-label="Source evidence" aria-modal="true" className="source-drawer" role="dialog">
      <header>
        <span>
          <small>Bounded source evidence</small>
          <strong>{descriptor.path}</strong>
        </span>
        <button aria-label="Close source evidence" onClick={onClose} ref={closeRef} type="button">
          <CloseIcon />
        </button>
      </header>
      {state.status === "loading" ? <p aria-live="polite">Loading source…</p> : null}
      {state.status === "error" ? <p role="alert">{state.message}</p> : null}
      {state.status === "ready" ? (
        <pre tabIndex={0}>
          <code>{state.source}</code>
        </pre>
      ) : null}
    </aside>
  );
}

function SourceButton({
  descriptor,
  label,
  onOpen,
}: {
  descriptor?: SessionSourceDescriptor;
  label: string;
  onOpen: (descriptor: SessionSourceDescriptor, trigger: HTMLButtonElement) => void;
}) {
  if (!descriptor) return null;
  return (
    <button
      className="source-button"
      onClick={(event) => onOpen(descriptor, event.currentTarget)}
      type="button"
    >
      {label}
      <ArrowIcon />
    </button>
  );
}

function FlowExplorer({
  flow,
  selection,
  spec,
}: {
  flow: Flow;
  selection: FeatureSelection;
  spec: SpecDocument;
}) {
  const states = useMemo(
    () => new Map(flow.states.map((state) => [state.id, state])),
    [flow.states],
  );
  const selectedState = flow.states.find((state) => state.id === selection.state);
  const selectedTransition = flow.transitions.find(
    (transition) => transition.id === selection.transition,
  );

  const stateHref = (state: FlowState): string =>
    featureHref(spec.id, { flow: flow.id, state: state.id });
  const transitionHref = (transition: FlowTransition): string =>
    featureHref(spec.id, { flow: flow.id, transition: transition.id });

  return (
    <div className="flow-explorer">
      <div className="flow-lane" aria-label={`${flow.name} states`}>
        {flow.states.map((state, index) => (
          <div className="flow-state-wrap" key={state.id}>
            {index > 0 ? <span aria-hidden="true" className="flow-connector" /> : null}
            <a
              aria-current={selectedState?.id === state.id ? "true" : undefined}
              className={`flow-state flow-state-${state.kind}`}
              href={stateHref(state)}
            >
              <small>{state.kind}</small>
              <strong>{state.label}</strong>
              <code>{state.id}</code>
            </a>
          </div>
        ))}
      </div>
      {selectedState?.outcome ? (
        <p className="flow-selection-note">{selectedState.outcome}</p>
      ) : null}
      <div className="transition-list">
        {flow.transitions.map((transition) => (
          <a
            aria-current={selectedTransition?.id === transition.id ? "true" : undefined}
            className="transition-row"
            href={transitionHref(transition)}
            key={transition.id}
          >
            <span className="transition-id">{transition.id}</span>
            <span className="transition-route">
              <strong>{states.get(transition.from)?.label ?? transition.from}</strong>
              <ArrowIcon />
              <strong>{states.get(transition.to)?.label ?? transition.to}</strong>
            </span>
            <span className="transition-event">{transition.event}</span>
            <span className="coverage-list">
              {transition.covers.map((key) => (
                <span key={key}>{key}</span>
              ))}
            </span>
          </a>
        ))}
      </div>
      {selectedTransition ? (
        <section className="transition-detail" aria-label={`${selectedTransition.id} details`}>
          <p className="eyebrow">Selected transition</p>
          <h4>{selectedTransition.event}</h4>
          <dl>
            <div>
              <dt>From</dt>
              <dd>{states.get(selectedTransition.from)?.label ?? selectedTransition.from}</dd>
            </div>
            <div>
              <dt>To</dt>
              <dd>{states.get(selectedTransition.to)?.label ?? selectedTransition.to}</dd>
            </div>
            <div>
              <dt>Guard</dt>
              <dd>{selectedTransition.guard ?? "No guard"}</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>{selectedTransition.outcome ?? "The destination state owns the outcome."}</dd>
            </div>
          </dl>
          <div className="covered-behaviours">
            <span>Covered behaviours</span>
            {selectedTransition.covers.map((key) => (
              <a href={featureHref(spec.id, { behaviour: key })} key={key}>
                {key}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function FeatureView({ estate, selection, sources, spec }: FeatureViewProps) {
  const [source, setSource] = useState<
    { descriptor: SessionSourceDescriptor; returnFocus: HTMLButtonElement } | undefined
  >();
  const blockers = useMemo(
    () =>
      new Map(
        spec.behaviours.map((behaviour) => [
          behaviour.key,
          spec.openQuestions.filter(
            (question) => !question.resolved && question.blocks.includes(behaviour.key),
          ),
        ]),
      ),
    [spec.behaviours, spec.openQuestions],
  );
  const selectedFlow =
    spec.flows
      .flatMap((contract) => contract.contract.flows)
      .find((flow) => flow.id === selection.flow) ?? spec.flows[0]?.contract.flows[0];
  const sourceByPath = useMemo(
    () => new Map(sources.filter((item) => !item.context).map((item) => [item.path, item])),
    [sources],
  );
  const selectedFinding = selection.finding
    ? spec.findings.find((finding) => finding.id === selection.finding)
    : undefined;
  const specsById = useMemo(
    () => new Map(estate.specs.map((item) => [item.id, item])),
    [estate.specs],
  );

  useEffect(() => {
    const target = selection.finding
      ? document.getElementById(`finding-${spec.id}-${selection.finding}`)
      : selection.question
        ? document.getElementById(`question-${spec.id}-${selection.question}`)
        : selection.behaviour
          ? document.getElementById(`behaviour-${spec.id}-${selection.behaviour}`)
          : undefined;
    target?.scrollIntoView?.({ block: "start" });
    target?.focus({ preventScroll: true });
  }, [selection.behaviour, selection.finding, selection.question, spec.id]);

  const relationshipGroups = [
    { label: "Connects to", relationships: spec.forwardLinks, direction: "forward" },
    { label: "Referenced by", relationships: spec.backlinks, direction: "back" },
  ] as const;
  const openSource = (descriptor: SessionSourceDescriptor, returnFocus: HTMLButtonElement): void =>
    setSource({ descriptor, returnFocus });
  const closeSource = (): void => {
    const returnFocus = source?.returnFocus;
    setSource(undefined);
    queueMicrotask(() => returnFocus?.focus());
  };

  return (
    <main className="feature-view" id="main-content">
      <header className="feature-hero">
        <a aria-label="Back to Atlas" className="back-link" href="#/atlas">
          <ArrowIcon /> Atlas
        </a>
        <div className="feature-kicker">
          <span>{spec.module}</span>
          <span>{spec.featureArea}</span>
          <StatusBadge status={spec.status} />
        </div>
        <h1>{spec.title}</h1>
        <RichText
          className="feature-description prose"
          html={spec.descriptionHtml}
          relationships={spec.forwardLinks}
        />
        <div className="feature-meta">
          <code>{spec.id}</code>
          <code>{spec.path}</code>
          <SourceButton
            descriptor={sourceByPath.get(spec.path)}
            label="Open spec source"
            onOpen={openSource}
          />
        </div>
      </header>

      {spec.findings.length > 0 ? (
        <section className="feature-findings" aria-label="Feature findings">
          <strong>{spec.findings.length} contract findings</strong>
          <span>Safe sections remain available; Health owns repair guidance.</span>
        </section>
      ) : null}

      {selectedFinding ? (
        <section
          className={`feature-finding-detail severity-${selectedFinding.severity}`}
          id={`finding-${spec.id}-${selectedFinding.id}`}
          tabIndex={-1}
        >
          <div>
            <p className="eyebrow">Health finding · {selectedFinding.severity}</p>
            <h2>{selectedFinding.message}</h2>
            <code>{selectedFinding.code}</code>
          </div>
          <div>
            <span>
              {selectedFinding.path}
              {selectedFinding.location ? ` · line ${selectedFinding.location.line}` : ""}
            </span>
            <p>
              {selectedFinding.hint ??
                "Inspect the source contract and resolve the reported inconsistency."}
            </p>
            <SourceButton
              descriptor={sourceByPath.get(selectedFinding.path)}
              label="Open finding source"
              onOpen={openSource}
            />
          </div>
        </section>
      ) : null}

      <div className="feature-layout">
        <aside className="contract-index">
          <p className="eyebrow">On this contract</p>
          <nav aria-label="Feature sections">
            <button onClick={() => scrollToSection(`behaviours-${spec.id}`)} type="button">
              Behaviours <span>{spec.behaviours.length}</span>
            </button>
            {spec.invariants.length > 0 ? (
              <button onClick={() => scrollToSection(`invariants-${spec.id}`)} type="button">
                Invariants <span>{spec.invariants.length}</span>
              </button>
            ) : null}
            {spec.decisionTables.length > 0 ? (
              <button onClick={() => scrollToSection(`decisions-${spec.id}`)} type="button">
                Decisions <span>{spec.decisionTables.length}</span>
              </button>
            ) : null}
            {spec.flows.length > 0 ? (
              <button onClick={() => scrollToSection(`flows-${spec.id}`)} type="button">
                Flows <span>{spec.flows.length}</span>
              </button>
            ) : null}
            <button onClick={() => scrollToSection(`questions-${spec.id}`)} type="button">
              Questions <span>{spec.openQuestions.length}</span>
            </button>
          </nav>
          <div className="behaviour-index">
            {spec.behaviours.map((behaviour) => (
              <a
                aria-current={selection.behaviour === behaviour.key ? "true" : undefined}
                href={featureHref(spec.id, { behaviour: behaviour.key })}
                key={behaviour.key}
              >
                <span>{behaviour.key}</span>
                {behaviour.title}
              </a>
            ))}
          </div>
        </aside>

        <article className="contract-body">
          <section className="contract-section" id={`behaviours-${spec.id}`}>
            <header className="section-heading">
              <div>
                <p className="eyebrow">Observable product contract</p>
                <h2>Behaviours</h2>
              </div>
              <span>{spec.behaviours.length}</span>
            </header>
            <div className="behaviour-stack">
              {spec.behaviours.map((behaviour) => {
                const blockedBy = blockers.get(behaviour.key) ?? [];
                return (
                  <section
                    className="behaviour-card"
                    id={`behaviour-${spec.id}-${behaviour.key}`}
                    key={behaviour.key}
                    tabIndex={-1}
                  >
                    <header>
                      <a
                        className="behaviour-key"
                        href={featureHref(spec.id, { behaviour: behaviour.key })}
                      >
                        {behaviour.key}
                      </a>
                      <h3>{behaviour.title}</h3>
                      <StatusBadge status={behaviour.status} />
                    </header>
                    {behaviour.partialNote ? (
                      <blockquote>{behaviour.partialNote}</blockquote>
                    ) : null}
                    {blockedBy.length > 0 ? (
                      <div className="blocker-callout">
                        <strong>Blocked</strong>
                        <span>{blockedBy.map((question) => question.markdown).join(" · ")}</span>
                      </div>
                    ) : null}
                    <RichText html={behaviour.renderedHtml} relationships={spec.forwardLinks} />
                  </section>
                );
              })}
            </div>
          </section>

          {spec.invariants.length > 0 ? (
            <section className="contract-section" id={`invariants-${spec.id}`}>
              <header className="section-heading">
                <div>
                  <p className="eyebrow">Always true</p>
                  <h2>Invariants</h2>
                </div>
                <span>{spec.invariants.length}</span>
              </header>
              <ol className="invariant-list">
                {spec.invariants.map((invariant) => (
                  <li key={invariant.fingerprint}>
                    <RichText html={invariant.renderedHtml} relationships={spec.forwardLinks} />
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {spec.decisionTables.length > 0 ? (
            <section className="contract-section" id={`decisions-${spec.id}`}>
              <header className="section-heading">
                <div>
                  <p className="eyebrow">Explicit outcomes</p>
                  <h2>Decision tables</h2>
                </div>
                <span>{spec.decisionTables.length}</span>
              </header>
              {spec.decisionTables.map((table, index) => (
                <div className="decision-table-wrap" key={table.title ?? index}>
                  {table.title ? <h3>{table.title}</h3> : null}
                  <div className="table-scroll" tabIndex={0}>
                    <table aria-label={table.title ?? `Decision table ${index + 1}`}>
                      <thead>
                        <tr>
                          {table.headers.map((header) => (
                            <th key={header} scope="col">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row) => (
                          <tr key={row.fingerprint}>
                            {row.cells.map((cell, cellIndex) => (
                              <td key={`${row.fingerprint}-${cellIndex}`}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {spec.flows.length > 0 && selectedFlow ? (
            <section className="contract-section" id={`flows-${spec.id}`}>
              <header className="section-heading">
                <div>
                  <p className="eyebrow">YAML-owned journey</p>
                  <h2>User flows</h2>
                </div>
                <span>{spec.flows.length}</span>
              </header>
              <div className="flow-tabs" role="list">
                {spec.flows
                  .flatMap((contract) => contract.contract.flows)
                  .map((flow) => (
                    <a
                      aria-current={selectedFlow.id === flow.id ? "true" : undefined}
                      href={featureHref(spec.id, { flow: flow.id })}
                      key={flow.id}
                    >
                      {flow.id} · {flow.name}
                    </a>
                  ))}
              </div>
              <FlowExplorer flow={selectedFlow} selection={selection} spec={spec} />
              <div className="source-actions">
                {spec.flows.map((contract) => (
                  <span key={contract.path}>
                    <SourceButton
                      descriptor={sourceByPath.get(contract.path)}
                      label="Open flow contract"
                      onOpen={openSource}
                    />
                    <SourceButton
                      descriptor={sourceByPath.get(contract.diagramPath)}
                      label="Open generated diagram"
                      onOpen={openSource}
                    />
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="contract-section" id={`questions-${spec.id}`}>
            <header className="section-heading">
              <div>
                <p className="eyebrow">Decisions still visible</p>
                <h2>Questions</h2>
              </div>
              <span>{spec.openQuestions.length}</span>
            </header>
            {spec.openQuestions.length > 0 ? (
              <div className="question-list">
                {spec.openQuestions.map((question, index) => (
                  <article
                    className={question.resolved ? "resolved" : "open"}
                    id={`question-${spec.id}-${question.location.line}`}
                    key={`${question.location.line}-${index}`}
                    tabIndex={-1}
                  >
                    <span>{question.resolved ? "Settled" : "Open"}</span>
                    <RichText html={question.renderedHtml} relationships={spec.forwardLinks} />
                    {question.blocks.length > 0 ? (
                      <div className="question-blocks">
                        Blocks{" "}
                        {question.blocks.map((key) => (
                          <a href={featureHref(spec.id, { behaviour: key })} key={key}>
                            {key}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-empty">No questions are recorded.</p>
            )}
          </section>

          {spec.futureConsiderationsHtml ? (
            <section className="contract-section compact">
              <p className="eyebrow">Later, deliberately</p>
              <h2>Future considerations</h2>
              <RichText html={spec.futureConsiderationsHtml} relationships={spec.forwardLinks} />
            </section>
          ) : null}
          {spec.outOfScopeHtml ? (
            <section className="contract-section compact">
              <p className="eyebrow">Boundary</p>
              <h2>Out of scope</h2>
              <RichText html={spec.outOfScopeHtml} relationships={spec.forwardLinks} />
            </section>
          ) : null}

          {relationshipGroups.some((group) => group.relationships.length > 0) ? (
            <section className="contract-section relationships-section">
              <header className="section-heading">
                <div>
                  <p className="eyebrow">Product context</p>
                  <h2>Relationships</h2>
                </div>
              </header>
              {relationshipGroups.map((group) =>
                group.relationships.length > 0 ? (
                  <div className="relationship-group" key={group.direction}>
                    <h3>{group.label}</h3>
                    {group.relationships.map((relationship) => {
                      const targetId =
                        group.direction === "forward"
                          ? relationship.targetId
                          : relationship.sourceId;
                      const target = specsById.get(targetId);
                      return target ? (
                        <a href={featureHref(target.id)} key={relationship.id}>
                          <span>
                            <strong>{target.title}</strong>
                            <small>{relationship.label}</small>
                          </span>
                          <ArrowIcon />
                        </a>
                      ) : (
                        <span className="broken-relationship" key={relationship.id}>
                          {relationship.label} · missing target
                        </span>
                      );
                    })}
                  </div>
                ) : null,
              )}
            </section>
          ) : null}
        </article>
      </div>
      {source ? <SourceDrawer descriptor={source.descriptor} onClose={closeSource} /> : null}
    </main>
  );
}
