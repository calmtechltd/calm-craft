import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { CALMCRAFT_VERSION } from "../meta";

function FoundationScreen() {
  return (
    <main>
      <h1>CalmCraft</h1>
      <p>Visualizer foundation {CALMCRAFT_VERSION}</p>
    </main>
  );
}

const root = document.querySelector<HTMLElement>("#root");

if (!root) {
  throw new Error("CalmCraft could not find the application root.");
}

createRoot(root).render(
  <StrictMode>
    <FoundationScreen />
  </StrictMode>,
);
