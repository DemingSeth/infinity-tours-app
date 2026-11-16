import type { TripInfo, TripInfoOverrides } from "@/lib/types";

// ─── Phone numbers on the Student view (November 2026, Jenn Ainge) ───────────
// Students should not see tour host or bus driver phone numbers in Trip
// Information. Structured phone fields are cleared and phone numbers typed
// into free text (flight, hotel, bus, departure, return, custom rows) are
// removed. The Infinity Hotline is the company line and stays visible.

// North American numbers: (801) 555-0114, 801-555-0114, 801.555.0114,
// +1 801 555 0114, 8015550114, and the short 555-0114 form. Flight numbers
// ("#1438", "Delta 2228") and times ("8:05 am") do not match.
const PHONE_RE = /(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b|\b\d{10}\b|\b\d{3}[.-]\d{4}\b/g;

const HAS_PHONE_RE = new RegExp(PHONE_RE.source);

// Separators left dangling once a number is cut out ("Ray · ", "Driver: ").
const TRAILING_SEP_RE = /[\s·•|,:;\-–]+$/;

/** Removes phone numbers from free text. Lines that held only a number are
 *  dropped; blank lines the host typed on purpose are kept. */
export function stripPhones(text: string | null | undefined): string | null {
  if (text == null) return text ?? null;
  if (!HAS_PHONE_RE.test(text)) return text;
  const out: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) { out.push(line); continue; }
    if (!HAS_PHONE_RE.test(line)) { out.push(line); continue; }
    const cleaned = line.replace(PHONE_RE, "").replace(/\s{2,}/g, " ").replace(TRAILING_SEP_RE, "")
      .replace(/\s*\b(?:phone|cell|mobile|tel|ph)\.?$/i, "").replace(TRAILING_SEP_RE, "").trim();
    // A line that was only a label plus a number ("Host cell 801...",
    // "Dispatch 801...") leaves a lone word that says nothing now: drop it.
    if (cleaned && /\s/.test(cleaned)) out.push(cleaned);
  }
  return out.join("\n");
}

/** Whether this viewer is a student, the one audience that never sees phones. */
export function hidesPhones(opts: { isHost?: boolean; viewerPersona?: string | null; viewerRole?: string | null }): boolean {
  if (opts.isHost) return false;
  if (opts.viewerPersona) return opts.viewerPersona === "student";
  // No persona known: chaperones share the student itinerary view, so err on
  // the side of hiding.
  return opts.viewerRole === "student";
}

/** A copy of the Trip Information with every phone number removed. */
export function withoutPhones(info: TripInfo): TripInfo {
  const o: TripInfoOverrides = info.overrides ?? {};
  return {
    ...info,
    tourHostPhone: null,
    tourHosts: (info.tourHosts ?? []).map(h => ({ ...h, contact: "" })),
    busContactPhone: null,
    busDriverPhone: null,
    participantsOverride: stripPhones(info.participantsOverride),
    overrides: {
      ...o,
      flight: stripPhones(o.flight),
      hotel: stripPhones(o.hotel),
      bus: stripPhones(o.bus),
      departure: stripPhones(o.departure),
      return: stripPhones(o.return),
    },
    customRows: (info.customRows ?? [])
      // A row that is just a call link has nothing left to show.
      .filter(r => !(r.url && /^tel:/i.test(r.url.trim())))
      .map(r => ({ ...r, value: stripPhones(r.value) })),
  };
}

// ─── Color-coded flight groups (November 2026, Jenn Ainge) ───────────────────
// Hosts type several flights into the Flight box, each starting with a color
// ("🔵 Blue Flight: 55 Seats on Southwest"). When there are two or more, the
// row shows one folding card per flight so travelers open just their own.

const COLOR_HEX: Record<string, string> = {
  red: "#dc2626", blue: "#2563eb", green: "#16a34a", yellow: "#ca8a04",
  orange: "#ea580c", purple: "#9333ea", brown: "#92400e", black: "#334155",
  white: "#94a3b8", pink: "#db2777",
};

const EMOJI_COLOR: Record<string, string> = {
  "🔴": "red", "🟥": "red", "❤️": "red",
  "🔵": "blue", "🟦": "blue", "💙": "blue",
  "🟢": "green", "🟩": "green", "💚": "green",
  "🟡": "yellow", "🟨": "yellow", "💛": "yellow",
  "🟠": "orange", "🟧": "orange", "🧡": "orange",
  "🟣": "purple", "🟪": "purple", "💜": "purple",
  "🟤": "brown", "🟫": "brown", "🤎": "brown",
  "⚫": "black", "⬛": "black", "🖤": "black",
  "⚪": "white", "⬜": "white", "🤍": "white",
};

const WORD_HEADER_RE = /^(red|blue|green|yellow|orange|purple|brown|black|white|pink)\s+(?:flight|group|team)\b/i;

/** The color a flight header line starts with, or null when it is not a header. */
export function flightHeaderColor(line: string): string | null {
  const t = line.trim();
  if (!t) return null;
  for (const [emoji, color] of Object.entries(EMOJI_COLOR)) {
    if (t.startsWith(emoji)) {
      // "🔴🔵🟢 Red, Blue and Green" names several flights at once: not a header.
      const rest = t.slice(emoji.length).trimStart();
      if (Object.keys(EMOJI_COLOR).some(e => rest.startsWith(e))) return null;
      return color;
    }
  }
  const m = t.match(WORD_HEADER_RE);
  return m ? m[1].toLowerCase() : null;
}

export interface FlightGroup {
  header: string;
  body: string;
  color: string; // hex
}

/** Splits Flight text into color groups. Null unless there are two or more. */
export function parseFlightGroups(text: string | null | undefined): { intro: string; groups: FlightGroup[] } | null {
  if (!text || !text.trim()) return null;
  const lines = text.split("\n");
  const intro: string[] = [];
  const groups: { header: string; lines: string[]; color: string }[] = [];
  for (const line of lines) {
    const color = flightHeaderColor(line);
    if (color) groups.push({ header: line.trim(), lines: [], color: COLOR_HEX[color] });
    else if (groups.length) groups[groups.length - 1].lines.push(line);
    else intro.push(line);
  }
  if (groups.length < 2) return null;
  const tidy = (ls: string[]) => ls.join("\n").replace(/^\s*\n/, "").replace(/\s+$/, "");
  return {
    intro: tidy(intro),
    groups: groups.map(g => ({ header: g.header, body: tidy(g.lines), color: g.color })),
  };
}
