"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

// Light / dark switch. The current theme lives on <html data-theme> (set before
// first paint by the inline script in app/layout.tsx from the remembered choice
// or the device setting). Toggling writes the attribute and remembers it per
// browser; the tokens in globals.css do the rest.
export const THEME_KEY = "it-theme";

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* private mode */ }
}

function readTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

export default function ThemeToggle({ onNavy = true, size = 15 }: {
  /** Rendered on the navy header (white icon) or on a light/dark surface. */
  onNavy?: boolean;
  size?: number;
}) {
  // The attribute on <html> is the source of truth; subscribe to it so every
  // toggle on the page agrees, and render "light" on the server.
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      title={next === "dark" ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={next === "dark" ? "Switch to dark mode" : "Switch to light mode"}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, borderRadius: 8, cursor: "pointer", flexShrink: 0,
        background: onNavy ? "rgba(255,255,255,0.1)" : "var(--surface)",
        border: onNavy ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)",
        color: onNavy ? "rgba(255,255,255,0.8)" : "var(--muted)",
      }}
    >
      {theme === "dark" ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  );
}
