"use client";

import { useLayoutEffect } from "react";

// Safety net for pages that render entirely on the client (the auth pages
// bail out of server rendering), where the beforeInteractive boot script in
// app/layout.tsx never gets a chance to run: apply the remembered / device
// theme as soon as the tree mounts. On server-rendered pages the attribute is
// already set and this is a no-op.
export default function ThemeBoot() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    if (html.getAttribute("data-theme")) return;
    let t: string | null = null;
    try { t = localStorage.getItem("it-theme"); } catch { /* private mode */ }
    if (t !== "dark" && t !== "light") {
      t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    html.setAttribute("data-theme", t);
  }, []);
  return null;
}
