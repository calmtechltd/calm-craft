import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type { OpenQuestion, SpecDocument, SpecEstate } from "../specs/model";
import { featureHref } from "./feature";
import { ArrowIcon, SearchIcon } from "./icons";

export type QuestionsSelection = {
  search?: string;
  module?: string;
  blocking?: boolean;
  settled?: boolean;
};

/** An open question only means something beside the feature it holds up. */
export type EstateQuestion = {
  key: string;
  question: OpenQuestion;
  spec: SpecDocument;
};

export function parseQuestionsSelection(parameters: URLSearchParams): QuestionsSelection {
  const selection: QuestionsSelection = {};
  const search = parameters.get("search")?.trim();
  const module = parameters.get("module")?.trim();
  if (search) selection.search = search;
  if (module) selection.module = module;
  if (parameters.get("blocking") === "1") selection.blocking = true;
  if (parameters.get("settled") === "1") selection.settled = true;
  return selection;
}

export function questionsHref(selection: QuestionsSelection = {}): string {
  const parameters = new URLSearchParams();
  if (selection.search) parameters.set("search", selection.search);
  if (selection.module) parameters.set("module", selection.module);
  if (selection.blocking) parameters.set("blocking", "1");
  if (selection.settled) parameters.set("settled", "1");
  return parameters.size > 0 ? `#/questions?${parameters}` : "#/questions";
}

export function buildEstateQuestions(estate: SpecEstate, settled = false): EstateQuestion[] {
  const questions: EstateQuestion[] = [];
  for (const spec of estate.specs) {
    spec.openQuestions.forEach((question, index) => {
      if (question.resolved !== settled) return;
      questions.push({ key: `${spec.id}:${question.location.line}:${index}`, question, spec });
    });
  }
  return questions;
}

function questionText(item: EstateQuestion): string {
  return [
    item.question.markdown,
    item.spec.title,
    item.spec.module,
    item.spec.path,
    ...item.question.blocks,
  ]
    .join(" ")
    .toLocaleLowerCase();
}

export function QuestionsView({
  estate,
  selection,
}: {
  estate: SpecEstate;
  selection: QuestionsSelection;
}) {
  const [searchDraft, setSearchDraft] = useState(selection.search ?? "");
  const settled = selection.settled ?? false;
  const questions = useMemo(() => buildEstateQuestions(estate, settled), [estate, settled]);
  const deferredSearch = useDeferredValue(searchDraft.trim().toLocaleLowerCase());
  const modules = useMemo(
    () => [...new Set(questions.map((item) => item.spec.module))].toSorted(),
    [questions],
  );
  const visible = useMemo(
    () =>
      questions.filter((item) => {
        if (selection.module && item.spec.module !== selection.module) return false;
        if (selection.blocking && item.question.blocks.length === 0) return false;
        if (!deferredSearch) return true;
        return questionText(item).includes(deferredSearch);
      }),
    [deferredSearch, questions, selection.blocking, selection.module],
  );
  const blocking = useMemo(
    () => questions.filter((item) => item.question.blocks.length > 0).length,
    [questions],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, EstateQuestion[]>();
    for (const item of visible) {
      const list = map.get(item.spec.id) ?? [];
      list.push(item);
      map.set(item.spec.id, list);
    }
    return map;
  }, [visible]);

  useEffect(() => {
    setSearchDraft(selection.search ?? "");
  }, [selection.search]);

  const update = (next: Partial<QuestionsSelection>): void => {
    const updated = { ...selection, search: searchDraft || undefined, ...next };
    const href = questionsHref(updated);
    if (Object.keys(next).length === 1 && Object.hasOwn(next, "search")) {
      setSearchDraft(next.search ?? "");
      window.history.replaceState(window.history.state, "", href);
    } else {
      window.location.hash = href;
    }
  };

  return (
    <main className="questions-view" id="main-content">
      <header className="view-heading">
        <h1>Questions</h1>
        <span className="view-count">
          <strong>{questions.length}</strong> {settled ? "settled" : "open"} ·{" "}
          <strong>{blocking}</strong> blocking a behaviour
        </span>
      </header>

      <section aria-label="Question controls" className="questions-controls">
        <label className="search-field">
          <SearchIcon />
          <span className="sr-only">Search questions</span>
          <input
            aria-label="Search questions"
            onChange={(event) => update({ search: event.currentTarget.value || undefined })}
            placeholder="Search questions, features, or behaviours…"
            type="search"
            value={searchDraft}
          />
        </label>
        <select
          aria-label="Filter questions by module"
          onChange={(event) => update({ module: event.currentTarget.value || undefined })}
          value={selection.module ?? ""}
        >
          <option value="">All modules</option>
          {modules.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </select>
        <button
          aria-pressed={selection.blocking ?? false}
          className="filter-toggle"
          onClick={() => update({ blocking: !selection.blocking || undefined })}
          type="button"
        >
          Blocks a behaviour
        </button>
        <button
          aria-pressed={settled}
          className="filter-toggle"
          onClick={() => update({ settled: !settled || undefined })}
          type="button"
        >
          Settled
        </button>
      </section>

      <div aria-live="polite" className="result-summary">
        Showing {visible.length} of {questions.length} {settled ? "settled" : "open"} questions
        across {grouped.size} {grouped.size === 1 ? "feature" : "features"}
      </div>

      {visible.length === 0 ? (
        <section className="empty-state compact">
          <span aria-hidden="true">{settled ? "✓" : "∅"}</span>
          <h2>{questions.length === 0 ? "Nothing is undecided" : "No questions match"}</h2>
          <p>
            {questions.length === 0
              ? "Every recorded question in this estate has been settled."
              : "Clear a filter or try a broader phrase."}
          </p>
        </section>
      ) : (
        <div className="question-groups">
          {[...grouped].map(([specId, items]) => {
            const spec = items[0]?.spec;
            if (!spec) return null;
            return (
              <section className="module-group" key={specId}>
                <header>
                  <h2>{spec.title}</h2>
                  <code>{spec.path}</code>
                  <span>{items.length}</span>
                </header>
                <div className="question-rows" role="list">
                  {items.map((item) => (
                    <div key={item.key} role="listitem">
                      <a
                        className="question-row"
                        data-question-key={item.key}
                        href={featureHref(spec.id, { question: item.question.location.line })}
                      >
                        <span
                          className={`question-state ${
                            item.question.blocks.length > 0 ? "is-blocking" : ""
                          }`}
                        >
                          {item.question.resolved
                            ? "Settled"
                            : item.question.blocks.length > 0
                              ? "Blocking"
                              : "Open"}
                        </span>
                        <span className="question-body">
                          <span
                            className="prose"
                            dangerouslySetInnerHTML={{ __html: item.question.renderedHtml }}
                          />
                          {item.question.blocks.length > 0 ? (
                            <span className="question-blocks">
                              Blocks
                              {item.question.blocks.map((key) => (
                                <span key={key}>{key}</span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                        <span className="question-line">line {item.question.location.line}</span>
                        <ArrowIcon className="row-arrow" />
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
