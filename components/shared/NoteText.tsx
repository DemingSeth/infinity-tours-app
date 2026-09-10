"use client";

import React from "react";

// ── Linkable note text ────────────────────────────────────────────────────────
// Notes (Details, Public Note, Internal Note) are stored as PLAIN TEXT and may
// carry markdown-style links: [what was ordered](https://...). Storing text (not
// HTML) keeps the click-to-edit note blocks, the print/PDF view and every
// existing note working unchanged, and there is no HTML to sanitize.
//
// Render a note with <NoteText text={...} /> instead of dropping the raw string
// into JSX, and the links become real links. Bare URLs typed into a note are
// linked too, so a host who just pastes a URL still gets something clickable.

// [label](url) — label stops at "]" or a newline, url stops at ")" or whitespace.
const MD_LINK_SOURCE = String.raw`\[([^\]\n]+)\]\(\s*([^)\s]+)\s*\)`;
// A bare http(s):// or www. URL. Trailing sentence punctuation is left out of
// the link so "see www.site.com." does not swallow the period.
const BARE_URL_SOURCE = String.raw`(?:https?:\/\/|www\.)[^\s<>()\[\]]+[^\s<>()\[\].,;:!?'"]`;

const mdLinkRe = () => new RegExp(MD_LINK_SOURCE, "g");
const bareUrlRe = () => new RegExp(BARE_URL_SOURCE, "gi");

// Any scheme that is not http/https (javascript:, data:, file:, ...) is refused
// — such a link is never rendered as a link, only as plain text.
const SAFE_SCHEME = /^https?:\/\//i;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// Ensure an http(s) prefix so hrefs never resolve relative to the app, and
// return null for anything that is not a plain web address.
export function safeHref(raw: string): string | null {
  const url = (raw || "").trim();
  if (!url) return null;
  if (SAFE_SCHEME.test(url)) return url;
  if (/^mailto:/i.test(url)) return url;
  if (HAS_SCHEME.test(url)) return null; // javascript:, data:, file:, ... refused
  return `https://${url}`;
}

// True when the text carries at least one markdown-style link.
export function hasNoteLink(text: string | null | undefined): boolean {
  return !!text && mdLinkRe().test(text);
}

// Note text with the link markup stripped back to its label — for anywhere a
// note has to be plain characters (previews, exports, search).
export function noteToPlainText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(mdLinkRe(), "$1");
}

// Build the markdown for a link, escaping the two characters that would break
// the pattern if a host typed them into the label.
export function buildNoteLink(label: string, url: string): string {
  const safeLabel = (label || url).replace(/[[\]]/g, "");
  const href = (url || "").trim().replace(/[()\s]/g, encodeURIComponent);
  return `[${safeLabel}](${href})`;
}

interface Props {
  text: string | null | undefined;
  // Link color. Defaults to inheriting, with an underline so a link inside a
  // colored note block (public = blue, internal = purple) still reads as a link.
  linkColor?: string;
  // Print view: links stay <a> (a printed PDF keeps them clickable) but never
  // open a new tab context that does not exist on paper.
  print?: boolean;
}

// Renders a note string, turning [label](url) and bare URLs into links. The
// surrounding block keeps whiteSpace: pre-wrap, so newlines survive.
export default function NoteText({ text, linkColor, print = false }: Props) {
  if (!text) return null;
  const linkStyle: React.CSSProperties = {
    color: linkColor || "inherit",
    textDecoration: "underline",
    textUnderlineOffset: 2,
    fontWeight: 600,
  };

  const nodes: React.ReactNode[] = [];
  let key = 0;

  // Plain (non-markdown) stretches still get bare URLs linked.
  const pushPlain = (chunk: string) => {
    if (!chunk) return;
    const re = bareUrlRe();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(chunk)) !== null) {
      if (m.index > last) nodes.push(chunk.slice(last, m.index));
      const href = safeHref(m[0]);
      nodes.push(
        href
          ? <a key={`u${key++}`} href={href} target={print ? undefined : "_blank"} rel="noopener noreferrer" style={linkStyle} onClick={e => e.stopPropagation()}>{m[0]}</a>
          : m[0],
      );
      last = m.index + m[0].length;
    }
    if (last < chunk.length) nodes.push(chunk.slice(last));
  };

  const re = mdLinkRe();
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    pushPlain(text.slice(last, m.index));
    const href = safeHref(m[2]);
    nodes.push(
      href
        ? <a key={`l${key++}`} href={href} target={print ? undefined : "_blank"} rel="noopener noreferrer" style={linkStyle} onClick={e => e.stopPropagation()}>{m[1]}</a>
        : m[1],
    );
    last = m.index + m[0].length;
  }
  pushPlain(text.slice(last));

  return <>{nodes.map((n, i) => <React.Fragment key={i}>{n}</React.Fragment>)}</>;
}
