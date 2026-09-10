"use client";

import { useRef, useState, useEffect } from "react";
import { Link2, Check, X as XIcon } from "lucide-react";
import { buildNoteLink } from "@/components/shared/NoteText";
import { BRAND } from "@/lib/helpers";

// ── Note field with a Link button ─────────────────────────────────────────────
// A plain input/textarea plus one control: highlight the words, click Link,
// paste the address. The link is written into the text as [words](address), so
// the note stays plain text everywhere it is stored, edited and printed, and
// <NoteText> renders it as a real link on the itinerary.

const FIELD: React.CSSProperties = {
  border: "1.5px solid var(--border)", borderRadius: 8, padding: "7px 11px",
  fontSize: 13, fontFamily: "inherit", color: "var(--text)", background: "var(--surface)",
  outline: "none", width: "100%", boxSizing: "border-box",
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  // Extra styles for the input/textarea itself.
  style?: React.CSSProperties;
  // Compact = the click-to-edit note block on the itinerary row (smaller type,
  // toolbar sits under the field with the save hint).
  compact?: boolean;
  // Passed straight through for the inline editor's save-on-blur / key handling.
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  // Rendered next to the Link button (e.g. the "Ctrl+Enter to save" hint).
  hint?: React.ReactNode;
}

export default function LinkableNoteField({
  value, onChange, multiline = true, placeholder, autoFocus, style, compact = false, onBlur, onKeyDown, hint,
}: Props) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  // The selection at the moment Link was clicked — reading it later is too late,
  // because focus has moved into the little link form by then.
  const sel = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const urlRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (open) urlRef.current?.focus(); }, [open]);

  function openLinkForm() {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    sel.current = { start, end };
    const picked = value.slice(start, end).trim();
    // Highlighting the address itself is a common move — treat it as the URL
    // and let the host type the words to show instead.
    if (/^(https?:\/\/|www\.)\S+$/i.test(picked)) { setUrl(picked); setLabel(""); }
    else { setLabel(picked); setUrl(""); }
    setOpen(true);
  }

  function insert() {
    const address = url.trim();
    if (!address) return;
    const { start, end } = sel.current;
    const text = (label.trim() || value.slice(start, end).trim() || address);
    const markup = buildNoteLink(text, address);
    const next = value.slice(0, start) + markup + value.slice(end);
    onChange(next);
    setOpen(false);
    setLabel(""); setUrl("");
    // Put the caret just past the new link so typing continues naturally.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const pos = start + markup.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function cancel() {
    setOpen(false);
    setLabel(""); setUrl("");
    ref.current?.focus();
  }

  const fieldStyle: React.CSSProperties = compact
    ? { ...FIELD, minHeight: 64, resize: "vertical", fontSize: 12, lineHeight: 1.5, ...style }
    : { ...FIELD, ...(multiline ? { minHeight: 60, resize: "vertical" as const } : {}), ...style };

  // Blur that lands inside our own link form must not count as leaving the
  // field (the inline note editor saves on blur).
  const wrapRef = useRef<HTMLDivElement | null>(null);
  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && wrapRef.current?.contains(next)) return;
    onBlur?.(e);
  }

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      {multiline ? (
        <textarea
          ref={el => { ref.current = el; }}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          style={fieldStyle}
        />
      ) : (
        <input
          ref={el => { ref.current = el; }}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          style={fieldStyle}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={openLinkForm}
          title="Select the words in the note, then click Link to attach an address to them"
          style={{
            display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit",
            fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "3px 9px", borderRadius: 6,
            border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--muted)",
          }}
        >
          <Link2 size={12} />Link
        </button>
        <span style={{ fontSize: 10.5, color: "var(--muted-2)" }}>
          {hint ?? "Highlight the words you want clickable, then click Link."}
        </span>
      </div>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: 6, padding: "10px 12px", borderRadius: 9,
            border: "1.5px solid var(--border)", background: "var(--surface-2)",
            display: "flex", flexDirection: "column", gap: 7,
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .7 }}>Add a link</div>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Words to show (e.g. what was ordered)"
            style={{ ...FIELD, fontSize: 12, padding: "6px 9px" }}
          />
          <input
            ref={urlRef}
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); insert(); }
              if (e.key === "Escape") { e.preventDefault(); cancel(); }
            }}
            placeholder="https://..."
            style={{ ...FIELD, fontSize: 12, padding: "6px 9px" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={insert} disabled={!url.trim()}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 6, padding: "5px 11px", cursor: url.trim() ? "pointer" : "default", opacity: url.trim() ? 1 : .55, background: BRAND.navy, color: "#fff" }}>
              <Check size={12} strokeWidth={3} />Add link
            </button>
            <button type="button" onClick={cancel}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit", fontSize: 11, fontWeight: 600, border: "none", borderRadius: 6, padding: "5px 11px", cursor: "pointer", background: "var(--surface-3)", color: "var(--muted)" }}>
              <XIcon size={12} strokeWidth={3} />Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
