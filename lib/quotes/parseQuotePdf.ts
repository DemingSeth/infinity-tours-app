// Turns the positioned text of an Infinity quote PDF (exported from Piktochart)
// into QuoteData for the pricing layout (October 2026).
//
// Pure: it takes text items with their position and size, so it runs the same
// on the server (unpdf) and in a test. The PDF is read by its structure, not by
// fixed coordinates:
//   - the title is the largest text (skipping the INFINITY wordmark)
//   - section headings are the larger text that names a section
//     (Trip Inclusions, Payment Summary, Cost Breakdown, Hotel Details, add-ons)
//   - day headings are mid-size text naming a weekday or "Day N"
//   - every other line belongs to the nearest heading above it in its column
//   - the "Payment N" / "Due:" band is the student payment plan, and whatever
//     sits below it is the terms footer
// Nothing is guessed: anything that does not fit lands in no field, and the
// host reviews the result in the editor before using it.

import type { QuoteData, PricingSection, QuoteDay } from "./types";

export type PdfTextItem = { str: string; x: number; y: number; w: number; h: number };

type Line = { text: string; x0: number; x1: number; y: number; size: number };

const SAME_ROW = 2.5;   // points of vertical slack for text on one line
const JOIN_GAP = 22;    // largest horizontal gap still read as one phrase
const COLUMN_SLACK = 60; // how far a line may sit from its heading's left edge

const WEEKDAY = /\b(mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?|sun)(day)?\b\.?/i;
const DAY_N = /^day\s*\d+\b/i;
const PAYMENT = /^pay(e)?ment\s*(\d+)\s*:?\s*(.*)$/i;
const DUE = /^due\s*:?\s*(.*)$/i;
const WORDMARK = /^(infinity|tours\s*\+\s*events)$/i;

type SectionKey = "inclusions" | "summary" | "addons" | "breakdown" | "hotel";

function sectionOf(text: string): SectionKey | null {
  const t = text.toLowerCase();
  if (/inclusion|what'?s included/.test(t)) return "inclusions";
  if (/add-?\s?ons?/.test(t)) return "addons";
  if (/cost\s*breakdown|breakdown/.test(t)) return "breakdown";
  if (/payment\s*summary|pricing|tour cost summary/.test(t)) return "summary";
  if (/hotel|lodging|accommodation details/.test(t)) return "hotel";
  return null;
}

/** Merge items that sit on one row and touch into phrases. */
function toLines(items: PdfTextItem[]): Line[] {
  const seen = new Set<string>();
  const clean = items
    .filter(it => it.str.trim())
    .filter(it => {
      const k = `${Math.round(it.x)}|${Math.round(it.y)}|${it.str}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (Math.abs(a.y - b.y) > SAME_ROW ? b.y - a.y : a.x - b.x));

  const lines: Line[] = [];
  for (const it of clean) {
    const last = lines[lines.length - 1];
    const gap = last ? it.x - last.x1 : Infinity;
    if (last && Math.abs(last.y - it.y) <= SAME_ROW && gap >= -2 && gap <= JOIN_GAP) {
      last.text = `${last.text}${gap > 1 && !last.text.endsWith(" ") && !it.str.startsWith(" ") ? " " : ""}${it.str}`;
      last.x1 = it.x + it.w;
      last.size = Math.max(last.size, it.h);
    } else {
      lines.push({ text: it.str, x0: it.x, x1: it.x + it.w, y: it.y, size: it.h });
    }
  }
  return lines.map(l => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() })).filter(l => l.text);
}

/** "Transportation $400" -> label + amount; "Single Chaperone: + $770" -> label + price. */
function splitAmount(text: string): { label: string; value: string } {
  const colon = text.lastIndexOf(":");
  if (colon > 0 && colon < text.length - 1) {
    return { label: text.slice(0, colon).trim(), value: text.slice(colon + 1).trim() };
  }
  const m = text.match(/^(.*?)\s*([+-]?\s*\$\s?[\d,]+(?:\.\d+)?|[+-]?\s*varies)\s*$/i);
  if (m && m[1]) return { label: m[1].trim(), value: m[2]!.replace(/\s+/g, " ").trim() };
  return { label: text.trim(), value: "" };
}

function emptyPricing(): PricingSection {
  return {
    inclusions: [], estimatedCost: "", paymentNote: "", addOns: [], costBreakdown: [],
    hotelDetails: "", roomsNote: "", paymentPlan: [], paymentPlanNote: "", terms: "",
  };
}

export type ParsedQuote = {
  data: Partial<QuoteData> & { pricing: PricingSection; days: QuoteDay[] };
  /** Lines the parser could not place, so the host can see what to copy by hand. */
  unplaced: string[];
};

export function parseQuotePdf(items: PdfTextItem[]): ParsedQuote {
  const lines = toLines(items);
  const pricing = emptyPricing();
  const unplaced: string[] = [];
  if (lines.length === 0) return { data: { pricing, days: [] }, unplaced };

  const bodySize = median(lines.map(l => l.size));

  // ── Title block: group, destination, year ─────────────────────────────────
  let group = "";
  let destination = "";
  let year = "";
  const used = new Set<Line>();
  const big = lines
    .filter(l => !WORDMARK.test(l.text) && l.size >= bodySize * 2)
    .sort((a, b) => b.size - a.size || b.y - a.y);
  for (const l of big) {
    if (/^in\s+/i.test(l.text) && !destination) { destination = l.text.replace(/^in\s+/i, ""); used.add(l); }
    else if (!group && !sectionOf(l.text)) { group = l.text; used.add(l); }
  }
  const yearLine = lines.find(l => /school year|\b20\d\d\s*[-–]\s*20\d\d\b/i.test(l.text) && l.size < bodySize * 2);
  if (yearLine) { year = yearLine.text; used.add(yearLine); }
  lines.filter(l => WORDMARK.test(l.text)).forEach(l => used.add(l));

  // ── Payment plan band and the terms below it ──────────────────────────────
  const planLines = lines.filter(l => !used.has(l) && (PAYMENT.test(l.text) || DUE.test(l.text) || /payment plan/i.test(l.text)));
  if (planLines.length) {
    const top = Math.max(...planLines.map(l => l.y)) + bodySize;
    const bottom = Math.min(...planLines.map(l => l.y));
    const band = lines.filter(l => !used.has(l) && l.y <= top && l.y >= bottom - bodySize * 2.2);
    const payments = band.filter(l => PAYMENT.test(l.text)).sort((a, b) => a.x0 - b.x0);
    const dues = band.filter(l => DUE.test(l.text));
    for (const p of payments) {
      const m = p.text.match(PAYMENT)!;
      const due = dues
        .filter(d => d.y < p.y && Math.abs(d.x0 - p.x0) < 30)
        .sort((a, b) => b.y - a.y)[0];
      pricing.paymentPlan.push({
        label: `Payment ${m[2]}`,
        amount: m[3]!.replace(/\$\s+/, "$").trim(),
        due: due ? due.text.match(DUE)![1]!.trim() : "",
      });
      used.add(p); if (due) used.add(due);
    }
    for (const l of band) {
      if (used.has(l)) continue;
      used.add(l);
      if (/payment plan/i.test(l.text)) continue;
      pricing.paymentPlanNote = [pricing.paymentPlanNote, l.text].filter(Boolean).join(" ");
    }
    // Terms: everything below the payment band.
    const below = lines.filter(l => !used.has(l) && l.y < bottom - bodySize * 2.2)
      .sort((a, b) => b.y - a.y || a.x0 - b.x0);
    pricing.terms = below.map(l => l.text).join(" ").replace(/\s+/g, " ").trim();
    below.forEach(l => used.add(l));
  }

  // ── Headings: sections and days ───────────────────────────────────────────
  type Heading = { line: Line; kind: SectionKey | "day" };
  const headings: Heading[] = [];
  for (const l of lines) {
    if (used.has(l)) continue;
    const isDay = (WEEKDAY.test(l.text) || DAY_N.test(l.text)) && l.size > bodySize * 1.15 && l.text.length <= 40;
    if (isDay) { headings.push({ line: l, kind: "day" }); used.add(l); continue; }
    const sec = sectionOf(l.text);
    if (sec && l.size > bodySize * 1.1 && !/\$/.test(l.text) && l.text.length <= 40) {
      headings.push({ line: l, kind: sec }); used.add(l);
    }
  }

  // ── Body: each remaining line goes to the nearest heading above, same column
  const owned = new Map<Heading, Line[]>();
  for (const l of lines) {
    if (used.has(l)) continue;
    const owner = headings
      .filter(h => h.line.y > l.y && Math.abs(h.line.x0 - l.x0) <= COLUMN_SLACK)
      .sort((a, b) => (a.line.y - l.y) - (b.line.y - l.y))[0];
    if (!owner) { unplaced.push(l.text); continue; }
    const list = owned.get(owner) ?? [];
    list.push(l);
    owned.set(owner, list);
  }
  const bodyOf = (h: Heading) => (owned.get(h) ?? []).sort((a, b) => b.y - a.y || a.x0 - b.x0);

  for (const h of headings) {
    const body = bodyOf(h);
    switch (h.kind) {
      case "inclusions":
        pricing.inclusions.push(...body.map(l => l.text.replace(/^[•\-•]\s*/, "")));
        break;
      case "summary": {
        const notes: string[] = [];
        for (const l of body) {
          const m = l.text.match(/(estimated|total|tour)\s[^:$]*cost[^:$]*:?\s*(\$?\s?[\d,]+(?:\.\d+)?)/i);
          if (m && !pricing.estimatedCost) pricing.estimatedCost = m[2]!.replace(/\s+/g, "");
          else notes.push(l.text);
        }
        pricing.paymentNote = notes.join(" ");
        break;
      }
      case "addons":
        for (const l of body) {
          const { label, value } = splitAmount(l.text);
          pricing.addOns.push({ label, price: value });
        }
        break;
      case "breakdown":
        for (const l of body) {
          const { label, value } = splitAmount(l.text);
          pricing.costBreakdown.push({ label, amount: value });
        }
        break;
      case "hotel": {
        const details: string[] = [];
        for (const l of body) {
          if (/priced for|rooms?\b/i.test(l.text) && /\d/.test(l.text) && !pricing.roomsNote) pricing.roomsNote = l.text;
          else details.push(l.text);
        }
        pricing.hotelDetails = details.join("\n");
        break;
      }
    }
  }

  // Days in reading order: down the first column, then the next.
  const dayHeadings = headings.filter(h => h.kind === "day");
  const columns = clusterByX(dayHeadings.map(h => h.line.x0));
  const days: QuoteDay[] = dayHeadings
    .sort((a, b) => columns(a.line.x0) - columns(b.line.x0) || b.line.y - a.line.y)
    .map(h => ({
      date: h.line.text,
      rows: bodyOf(h).map(l => {
        const t = l.text.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))\s+(.*)$/i);
        return t ? { time: t[1]!, text: t[2]! } : { time: "", text: l.text };
      }),
      overnight: "",
    }));

  return {
    data: { layout: "pricing", group, destination, year, pricing, days },
    unplaced,
  };
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 10;
}

/** Map an x position to a column index, grouping positions within COLUMN_SLACK. */
function clusterByX(xs: number[]): (x: number) => number {
  const sorted = [...new Set(xs.map(x => Math.round(x)))].sort((a, b) => a - b);
  const starts: number[] = [];
  for (const x of sorted) if (!starts.length || x - starts[starts.length - 1]! > COLUMN_SLACK) starts.push(x);
  return (x: number) => {
    let idx = 0;
    starts.forEach((s, i) => { if (x >= s - COLUMN_SLACK / 2) idx = i; });
    return idx;
  };
}
