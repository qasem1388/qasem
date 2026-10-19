import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Bundled locally so Arabic typography works fully offline.
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./styles/index.css";
import { App } from "./app/App";

// Desktop app: suppress the browser context menu outside editable fields.
document.addEventListener("contextmenu", (e) => {
  const target = e.target as HTMLElement | null;
  if (!import.meta.env.DEV && !target?.closest("input, textarea, [contenteditable]")) e.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
