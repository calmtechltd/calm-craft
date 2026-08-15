import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { CalmCraftApp, SessionError } from "./app";
import { loadSession, type CalmCraftSession } from "./session";
import "./styles.css";

function SessionRoot() {
  const [state, setState] = useState<
    | { status: "loading" }
    | {
        status: "ready";
        session: CalmCraftSession;
        sources: Awaited<ReturnType<typeof loadSession>>["sources"];
      }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    void loadSession()
      .then((response) => {
        if (active)
          setState({ status: "ready", session: response.data, sources: response.sources });
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
  }, []);

  if (state.status === "error") return <SessionError message={state.message} />;
  if (state.status === "ready")
    return <CalmCraftApp session={state.session} sources={state.sources} />;
  return (
    <main aria-busy="true" className="session-loading">
      <span aria-hidden="true" className="brand-mark large">
        <i />
        <i />
        <i />
      </span>
      <p>Reading product intent…</p>
    </main>
  );
}

const root = document.querySelector<HTMLElement>("#root");

if (!root) {
  throw new Error("CalmCraft could not find the application root.");
}

createRoot(root).render(
  <StrictMode>
    <SessionRoot />
  </StrictMode>,
);
