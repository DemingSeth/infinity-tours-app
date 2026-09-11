"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Link2, Check, Trash2, X as XIcon } from "lucide-react";
import { BRAND } from "@/lib/helpers";
import { safeHref } from "@/components/shared/NoteText";

// ── Note field with inline links ──────────────────────────────────────────────
// The host sees words, never an address. A link renders as a small pill with the
// words and a link icon; clicking it edits or removes the address.
//
// The note is still STORED as plain text with markdown-style [words](address),
// exactly as before, so the itinerary, the shared link, the PDF and every note
// written before this all keep working. This component only changes what the
// host looks at while writing: the contenteditable is serialized back to that
// same markdown on every keystroke.

const FIELD: React.CSSProperties = {
  border: "1.5px solid var(--border)", borderRadius: 8, padding: "7px 11px",
  fontSize: 13, fontFamily: "inherit", color: "var(--text)", background: "var(--surface)",
  outline: "none", width: "100%", boxSizing: "border-box",
};

const MD_LINK = /\[([^\]\n]+)\]\(\s*([^)\s]+)\s*\)/g;

// ── DOM <-> markdown ──────────────────────────────────────────────────────────

// Walk the editable and rebuild the stored text. Anchors become [words](address);
// <br> and browser-inserted blocks become newlines.
function serialize(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node, isFirstBlock: boolean) => {
    node.childNodes.forEach((child, i) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += (child as Text).data;
        return;
      }
      if (!(child instanceof HTMLElement)) return;
      const tag = child.tagName;
      if (tag === "BR") { out += "\n"; return; }
      if (tag === "A") {
        const href = child.getAttribute("data-href") || child.getAttribute("href") || "";
        const label = (child.textContent || "").replace(/[[\]]/g, "");
        out += href ? `[${label}](${href})` : label;
        return;
      }
      // A block the browser created while typing (div / p) starts a new line.
      if (tag === "DIV" || tag === "P") {
        if (!(isFirstBlock && i === 0)) out += "\n";
        walk(child, false);
        return;
      }
      walk(child, false);
    });
  };
  walk(root, true);
  // A trailing <br> is the browser keeping an empty last line clickable.
  return out.replace(/\n$/, "");
}

function makeLink(doc: Document, label: string, href: string): HTMLAnchorElement {
  const a = doc.createElement("a");
  a.className = "note-link";
  a.setAttribute("data-href", href);
  a.setAttribute("contenteditable", "false");
  a.textContent = label;
  a.title = href;
  return a;
}

// Rebuild the editable's contents from the stored text.
function render(root: HTMLElement, value: string) {
  const doc = root.ownerDocument;
  root.textContent = "";
  const frag = doc.createDocumentFragment();
  const re = new RegExp(MD_LINK.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  const pushText = (chunk: string) => {
    if (chunk) frag.appendChild(doc.createTextNode(chunk));
  };
  while ((m = re.exec(value)) !== null) {
    pushText(value.slice(last, m.index));
    const href = safeHref(m[2]);
    if (href) frag.appendChild(makeLink(doc, m[1], m[2].trim()));
    else pushText(m[1]);
    last = m.index + m[0].length;
  }
  pushText(value.slice(last));
  root.appendChild(frag);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  style?: React.CSSProperties;
  // Compact = the click-to-edit note block on the itinerary row.
  compact?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  hint?: React.ReactNode;
}

export default function LinkableNoteField({
  value, onChange, multiline = true, placeholder, autoFocus, style, compact = false, onBlur, onKeyDown, hint,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const urlRef = useRef<HTMLInputElement | null>(null);
  // What we last handed to onChange. Re-rendering the editable on our own edits
  // would reset the caret, so only an outside change is written back in.
  const mine = useRef<string>("");
  // The selection at the moment Link was clicked, and the pill being edited.
  const savedRange = useRef<Range | null>(null);
  const editingLink = useRef<HTMLAnchorElement | null>(null);

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === mine.current) return;
    render(el, value);
    mine.current = value;
  }, [value]);

  useEffect(() => {
    if (!autoFocus || !ref.current) return;
    const el = ref.current;
    el.focus();
    const range = el.ownerDocument.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = el.ownerDocument.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [autoFocus]);

  useEffect(() => { if (open) urlRef.current?.focus(); }, [open]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = serialize(el);
    mine.current = next;
    onChange(next);
  }, [onChange]);

  function captureSelection() {
    const el = ref.current;
    const sel = el?.ownerDocument.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return "";
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return "";
    savedRange.current = range.cloneRange();
    return range.toString().trim();
  }

  function openForNewLink() {
    const picked = captureSelection();
    editingLink.current = null;
    if (/^(https?:\/\/|www\.)\S+$/i.test(picked)) { setUrl(picked); setLabel(""); }
    else { setLabel(picked); setUrl(""); }
    setOpen(true);
  }

  function openForExistingLink(a: HTMLAnchorElement) {
    editingLink.current = a;
    savedRange.current = null;
    setLabel(a.textContent || "");
    setUrl(a.getAttribute("data-href") || "");
    setOpen(true);
  }

  function commitLink() {
    const el = ref.current;
    const address = url.trim();
    if (!el || !address) return;

    const existing = editingLink.current;
    if (existing) {
      existing.textContent = label.trim() || address;
      existing.setAttribute("data-href", address);
      existing.title = address;
    } else {
      const range = savedRange.current;
      const a = makeLink(el.ownerDocument, label.trim() || address, address);
      if (range) {
        range.deleteContents();
        range.insertNode(a);
        // A trailing space keeps the caret outside the pill so typing continues
        // as plain text rather than extending the link.
        const after = el.ownerDocument.createTextNode(" ");
        a.parentNode?.insertBefore(after, a.nextSibling);
        const sel = el.ownerDocument.getSelection();
        const caret = el.ownerDocument.createRange();
        caret.setStart(after, 1);
        caret.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(caret);
      } else {
        el.appendChild(a);
        el.appendChild(el.ownerDocument.createTextNode(" "));
      }
    }
    closeForm();
    emit();
  }

  function removeLink() {
    const a = editingLink.current;
    if (a) {
      const text = a.ownerDocument.createTextNode(a.textContent || "");
      a.replaceWith(text);
    }
    closeForm();
    emit();
  }

  function closeForm() {
    setOpen(false);
    setLabel(""); setUrl("");
    editingLink.current = null;
    savedRange.current = null;
    ref.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter") {
      if (!multiline || e.metaKey || e.ctrlKey) { e.preventDefault(); return; }
      // Insert a real newline rather than letting the browser make a <div>.
      e.preventDefault();
      const doc = ref.current?.ownerDocument;
      const sel = doc?.getSelection();
      if (!doc || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const nl = doc.createTextNode("\n");
      range.insertNode(nl);
      const caret = doc.createRange();
      caret.setStartAfter(nl);
      caret.collapse(true);
      sel.removeAllRanges();
      sel.addRange(caret);
      emit();
    }
  }

  // Paste as plain text: a copied web page would otherwise drop markup (and its
  // own links) straight into the note.
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    const doc = ref.current?.ownerDocument;
    const sel = doc?.getSelection();
    if (!doc || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = doc.createTextNode(multiline ? text : text.replace(/\s*\n+\s*/g, " "));
    range.insertNode(node);
    const caret = doc.createRange();
    caret.setStartAfter(node);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
    emit();
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const a = (e.target as HTMLElement).closest?.("a.note-link") as HTMLAnchorElement | null;
    if (a && ref.current?.contains(a)) { e.preventDefault(); openForExistingLink(a); }
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && wrapRef.current?.contains(next)) return;
    onBlur?.(e);
  }

  const editableStyle: React.CSSProperties = compact
    ? { ...FIELD, minHeight: 64, fontSize: 12, lineHeight: 1.6, ...style }
    // A contenteditable div has no intrinsic height, so a single-line field
    // needs one or it collapses when empty.
    : { ...FIELD, minHeight: multiline ? 60 : 34, lineHeight: 1.6, ...style };

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <div style={{ position: "relative" }}>
      {!value && placeholder && (
        <span aria-hidden style={{ position: "absolute", left: 12, top: 8, fontSize: editableStyle.fontSize, color: "var(--muted-3)", pointerEvents: "none", lineHeight: 1.6 }}>
          {placeholder}
        </span>
      )}
      <div
        ref={ref}
        className="note-editable"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline={multiline}
        onInput={emit}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={handleClick}
        style={editableStyle}
      />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); captureSelection(); }}
          onClick={openForNewLink}
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
          {hint ?? "Highlight the words you want clickable, then click Link. Click a link to change it."}
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
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .7 }}>
            {editingLink.current ? "Edit link" : "Add a link"}
          </div>
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
              if (e.key === "Enter") { e.preventDefault(); commitLink(); }
              if (e.key === "Escape") { e.preventDefault(); closeForm(); }
            }}
            placeholder="https://..."
            style={{ ...FIELD, fontSize: 12, padding: "6px 9px" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={commitLink} disabled={!url.trim()}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 6, padding: "5px 11px", cursor: url.trim() ? "pointer" : "default", opacity: url.trim() ? 1 : .55, background: BRAND.navy, color: "#fff" }}>
              <Check size={12} strokeWidth={3} />{editingLink.current ? "Save link" : "Add link"}
            </button>
            {editingLink.current && (
              <button type="button" onClick={removeLink}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit", fontSize: 11, fontWeight: 600, border: "1px solid var(--red-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", background: "var(--red-bg-soft)", color: "var(--red-text)" }}>
                <Trash2 size={12} />Remove link
              </button>
            )}
            <button type="button" onClick={closeForm}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit", fontSize: 11, fontWeight: 600, border: "none", borderRadius: 6, padding: "5px 11px", cursor: "pointer", background: "var(--surface-3)", color: "var(--muted)" }}>
              <XIcon size={12} strokeWidth={3} />Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
