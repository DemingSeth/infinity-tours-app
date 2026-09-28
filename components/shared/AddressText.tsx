"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// An itinerary address (September 2026, Amy): red italic, the same red as the
// bus driver material and how Infinity's older itineraries showed addresses,
// so it stands out. On screen, clicking copies it to paste into a maps or
// rideshare app; the Google Maps link beside it still opens directions. Print
// shows plain red italic text.
export default function AddressText({ address, print = false, fontSize = 12, withIcon = false, style }: {
  address: string;
  print?: boolean;
  fontSize?: number;
  withIcon?: boolean;
  style?: React.CSSProperties;
}) {
  const [copied, setCopied] = useState(false);
  const base: React.CSSProperties = { color: "var(--red-text)", fontStyle: "italic", fontSize, lineHeight: 1.45, ...style };
  if (print) return <div style={base}>{address}</div>;

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (older browser or insecure context): leave it be.
    }
  }

  return (
    <button type="button" onClick={copy} title="Click to copy address"
      style={{ ...base, display: "inline-flex", alignItems: "flex-start", gap: 5, background: "none", border: "none", padding: 0, cursor: "copy", fontFamily: "inherit", textAlign: "left" }}>
      <span>{address}</span>
      {copied
        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontStyle: "normal", fontWeight: 700, fontSize: fontSize - 1, color: "var(--green-text)", whiteSpace: "nowrap" }}><Check size={fontSize} />Copied</span>
        : withIcon ? <Copy size={fontSize - 1} style={{ flexShrink: 0, marginTop: 2, opacity: 0.55 }} /> : null}
    </button>
  );
}
