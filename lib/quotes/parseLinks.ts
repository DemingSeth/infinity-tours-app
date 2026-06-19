// Parse Markdown-style links — [label](url) — embedded in schedule text and
// overnight strings into ordered render segments. Plain stretches alternate
// with link segments so the document can render plain italic text and italic
// underlined teal anchors mid-sentence, while the editor keeps simple text
// fields.
//
// Written for strict TS with noUncheckedIndexedAccess in mind: regex group
// access is guarded with `?? ""`.

export type LinkSegment =
  | { plain: true; text: string }
  | { plain: false; text: string; url: string };

const LINK_RE = /\[([^\]]+)\]\(([^)]*)\)/g;

export function parseLinks(input: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((match = LINK_RE.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ plain: true, text: input.slice(lastIndex, match.index) });
    }
    segments.push({ plain: false, text: match[1] ?? "", url: match[2] ?? "" });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < input.length) {
    segments.push({ plain: true, text: input.slice(lastIndex) });
  }
  return segments;
}
