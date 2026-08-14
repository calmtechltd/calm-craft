import { useEffect, useMemo, useState } from "react";

import type { SpecDocument } from "../specs/model";
import { CALMCRAFT_VERSION } from "../meta";
import { Atlas } from "./atlas";
import { AtlasIcon, BranchIcon, CloseIcon, HealthIcon, MoonIcon, SunIcon } from "./icons";
import type { CalmCraftSession } from "./session";
import { StatusBadge } from "./status";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  let saved: string | null = null;
  try {
    saved = window.localStorage?.getItem("calmcraft.theme") ?? null;
  } catch {
    // A restricted browser may deny local storage; the system theme remains a safe default.
  }
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function repositoryName(root: string): string {
  return (
    root
      .replace(/[\\/]$/u, "")
      .split(/[\\/]/u)
      .at(-1) ?? "repository"
  );
}

function selectedFromHash(specs: SpecDocument[]): SpecDocument | undefined {
  const match = window.location.hash.match(/^#\/feature\/(.+)$/u);
  if (!match?.[1]) return undefined;
  const id = decodeURIComponent(match[1]);
  return specs.find((spec) => spec.id === id);
}

export function CalmCraftApp({ session }: { session: CalmCraftSession }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const snapshot = session.mode === "estate" ? session.snapshot : undefined;
  const [selected, setSelected] = useState<SpecDocument | undefined>(() =>
    snapshot ? selectedFromHash(snapshot.estate.specs) : undefined,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage?.setItem("calmcraft.theme", theme);
    } catch {
      // Theme persistence is optional when browser storage is restricted.
    }
  }, [theme]);

  useEffect(() => {
    if (!snapshot) return;
    const restore = (): void => setSelected(selectedFromHash(snapshot.estate.specs));
    window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, [snapshot]);

  const health = useMemo(() => {
    const findings = snapshot?.estate.findings ?? [];
    const errors = findings.filter((finding) => finding.severity === "error").length;
    return { findings: findings.length, errors };
  }, [snapshot]);

  if (!snapshot) {
    return (
      <div className="unsupported-view" id="main-content">
        <p className="eyebrow">Branch Review</p>
        <h1>The review interface arrives in the next product milestone.</h1>
        <p>The semantic comparison is ready and remains safely available to this session.</p>
      </div>
    );
  }

  const repository = snapshot.repository;
  const openSpec = (spec: SpecDocument): void => {
    setSelected(spec);
    window.location.hash = `/feature/${encodeURIComponent(spec.id)}`;
  };
  const closePreview = (): void => {
    setSelected(undefined);
    window.history.pushState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  };

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span aria-hidden="true" className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>CalmCraft</strong>
            <small>Spec intelligence</small>
          </span>
        </div>

        <nav aria-label="Primary views">
          <a aria-current="page" className="nav-item active" href="#">
            <AtlasIcon />
            <span>Atlas</span>
            <kbd>A</kbd>
          </a>
          <button className="nav-item" disabled type="button">
            <BranchIcon />
            <span>Branch Review</span>
            <small>Soon</small>
          </button>
          <button className="nav-item" disabled type="button">
            <HealthIcon />
            <span>Health</span>
            <small>{health.findings}</small>
          </button>
        </nav>

        <div className="sidebar-foot">
          <div className={`health-summary ${health.errors > 0 ? "has-errors" : ""}`}>
            <span aria-hidden="true" className="health-dot" />
            <span>
              <strong>
                {health.errors > 0 ? `${health.errors} contract errors` : "Session healthy"}
              </strong>
              <small>{health.findings} total findings</small>
            </span>
          </div>
          <span className="version">Local · v{CALMCRAFT_VERSION}</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="repository-identity">
            <span className="repository-monogram" aria-hidden="true">
              {repositoryName(repository.root).slice(0, 2).toLocaleUpperCase()}
            </span>
            <span>
              <strong>{repositoryName(repository.root)}</strong>
              <small title={repository.root}>{snapshot.specsRoot}</small>
            </span>
          </div>
          <span className="branch-identity">
            <BranchIcon />
            {repository.branch ?? `detached · ${repository.head.slice(0, 7)}`}
          </span>
          <div className="topbar-actions">
            <span className="privacy-label">
              <i aria-hidden="true" /> Private to this machine
            </span>
            <button
              aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}
              className="theme-toggle"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
              type="button"
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </header>

        <Atlas
          estate={snapshot.estate}
          onOpenSpec={openSpec}
          selectedId={selected?.id}
          worktreeEntries={repository.worktreeEntries}
        />
      </div>

      {selected ? (
        <aside aria-label="Selected specification" className="selection-panel">
          <button aria-label="Close selected specification" onClick={closePreview} type="button">
            <CloseIcon />
          </button>
          <p className="eyebrow">Selected contract</p>
          <StatusBadge status={selected.status} />
          <h2>{selected.title}</h2>
          <p>
            {selected.descriptionMarkdown || "No description is present in this specification."}
          </p>
          <dl>
            <div>
              <dt>Feature ID</dt>
              <dd>{selected.id}</dd>
            </div>
            <div>
              <dt>Behaviours</dt>
              <dd>{selected.behaviours.length}</dd>
            </div>
            <div>
              <dt>Findings</dt>
              <dd>{selected.findings.length}</dd>
            </div>
          </dl>
          <code>{selected.path}</code>
          <p className="preview-note">
            Full contract reading and flow exploration land in Feature view.
          </p>
        </aside>
      ) : null}
    </div>
  );
}

export function SessionError({ message }: { message: string }) {
  return (
    <main className="session-error" id="main-content">
      <span aria-hidden="true" className="brand-mark large">
        <i />
        <i />
        <i />
      </span>
      <p className="eyebrow">Local session unavailable</p>
      <h1>CalmCraft could not open this estate.</h1>
      <p>{message}</p>
      <p className="error-guidance">
        Return to the terminal, stop this process, and run the command again.
      </p>
    </main>
  );
}
