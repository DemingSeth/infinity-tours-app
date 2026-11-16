"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { parseFlightGroups } from "@/lib/tripInfoDisplay";

// Tiny external store over localStorage (plus an in-memory copy for browsers
// that block storage), shared by every FlightGroups on the page.
const listeners = new Set<() => void>();
const memoryOpen = new Map<string, string>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
}
function readStored(key: string | null): string | null {
  if (!key) return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

// Flight row text in Trip Information. Two or more color-coded flights
// ("🔵 Blue Flight ...", "Red Flight ...") show as one folding card each, so a
// traveler opens just their own flight (November 2026). Anything else renders
// exactly as typed. Print always shows every flight open.
export default function FlightGroups({ text, tourId, print = false }: { text: string; tourId?: string; print?: boolean }) {
  const parsed = parseFlightGroups(text);
  const storageKey = tourId ? `trip-info-open-flights:${tourId}` : null;

  // Which flights this device opened, kept in localStorage so a student picks
  // theirs once. Read through useSyncExternalStore so the server render (all
  // closed) and the browser agree, and storage failures just mean "all closed".
  const raw = useSyncExternalStore(
    subscribe,
    () => readStored(storageKey) ?? memoryOpen.get(storageKey ?? "") ?? "[]",
    () => "[]",
  );
  const openSet = useMemo(() => {
    try {
      const v = JSON.parse(raw);
      return new Set<string>(Array.isArray(v) ? v.map(String) : []);
    } catch { return new Set<string>(); }
  }, [raw]);

  if (!parsed) return <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>;

  function toggle(header: string) {
    const next = new Set(openSet);
    if (next.has(header)) next.delete(header); else next.add(header);
    const value = JSON.stringify([...next]);
    memoryOpen.set(storageKey ?? "", value);
    if (storageKey) {
      try { window.localStorage.setItem(storageKey, value); } catch { /* memory copy still works */ }
    }
    listeners.forEach(l => l());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {parsed.intro && <div style={{ whiteSpace: "pre-wrap" }}>{parsed.intro}</div>}
      {!print && (
        <div style={{ fontSize: 11, color: "var(--muted-2)" }}>Tap your flight to see its times.</div>
      )}
      {parsed.groups.map((g, i) => {
        const isOpen = print || openSet.has(g.header);
        const hasBody = !!g.body;
        return (
          <div key={`${i}:${g.header}`} data-flight-group={i}
            style={{
              background: `${g.color}14`, borderRadius: 8, overflow: "hidden",
              borderTop: `1px solid ${g.color}40`, borderRight: `1px solid ${g.color}40`,
              borderBottom: `1px solid ${g.color}40`, borderLeft: `4px solid ${g.color}`,
              breakInside: "avoid",
            }}>
            {print || !hasBody ? (
              <div style={{ padding: "6px 10px", fontWeight: 700, color: "var(--text)" }}>{g.header}</div>
            ) : (
              <button type="button" onClick={() => toggle(g.header)} aria-expanded={isOpen}
                style={{
                  display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left",
                  padding: "6px 10px", background: "none", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: "inherit", fontWeight: 700, color: "var(--text)",
                }}>
                {isOpen ? <ChevronDown size={14} style={{ flexShrink: 0, color: g.color }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: g.color }} />}
                <span>{g.header}</span>
              </button>
            )}
            {hasBody && isOpen && (
              <div style={{ whiteSpace: "pre-wrap", padding: print ? "0 10px 8px" : "0 10px 8px 30px", color: "var(--text-2)" }}>{g.body}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
