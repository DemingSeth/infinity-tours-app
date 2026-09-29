"use client";

import { FileText } from "lucide-react";

// Driver maps started life as image-only, but hosts naturally save a Google
// Maps route as a PDF and upload that. A browser cannot draw a PDF inside an
// <img>, which showed as a broken image (Jess, Westlake Env Sci, Sept 2026).
// Every driver map render goes through this component: images keep their
// thumbnail, PDFs become a tappable chip that opens the file in a new tab.

export function isPdfUrl(url: string): boolean {
  return /\.pdf($|[?#])/i.test(url);
}

// Uploads are stored as `<timestamp>-<safe name>`, with unsafe characters
// turned into underscores. Undo that for a readable label.
export function fileLabelFromUrl(url: string): string {
  let name = url.split(/[?#]/)[0].split("/").pop() || "Map";
  try { name = decodeURIComponent(name); } catch {}
  name = name
    .replace(/^\d{10,}-/, "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+-\s+Google Maps$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return name || "Map";
}

export default function MapFileThumb({ url, width, height, print = false, borderColor = "var(--red-border)", radius = 8 }: {
  url: string;
  width: number;
  height: number;
  // Print: an image prints inline; a PDF prints as its name, which stays a
  // clickable link in a saved PDF.
  print?: boolean;
  borderColor?: string;
  radius?: number;
}) {
  if (isPdfUrl(url)) {
    const label = fileLabelFromUrl(url);
    if (print) {
      return (
        <a href={url} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--red-text)", textDecoration: "underline" }}>
          <FileText size={11} style={{ flexShrink: 0, color: "var(--red-text)" }} />
          {label} (PDF)
        </a>
      );
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" title={`Open ${label} (PDF)`}
        style={{
          width, minHeight: height, boxSizing: "border-box", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 4, padding: "6px 8px",
          borderRadius: radius, border: `1px solid ${borderColor}`, background: "var(--red-bg-soft)",
          color: "var(--red-text)", textDecoration: "none", textAlign: "center",
        }}>
        <FileText size={20} style={{ flexShrink: 0, color: "var(--red-text)" }} />
        <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.25, color: "var(--text)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>
          {label}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.4, color: "var(--red-text)" }}>OPEN PDF</span>
      </a>
    );
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={print ? "agenda-photo" : undefined} src={url} alt="Driver map"
      style={{ width, height, objectFit: "cover", borderRadius: radius, border: `1px solid ${borderColor}`, display: "block" }} />
  );
  if (print) return img;
  return <a href={url} target="_blank" rel="noopener noreferrer" title="Open full size">{img}</a>;
}
