// Turn a quote into an itinerary (October 2026).
//
// planTourFromQuote is pure: it reads the quote's days and works out real
// dates, item types and times, so it can be tested. createTourFromQuote writes
// the tour, its days and items with the signed-in user's session (the same
// RLS as creating a tour by hand), then links the quote to the new tour.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuoteData } from "./types";
import { DEFAULT_ACTIVE_PERSONAS, defaultPersonaVisibility } from "@/lib/helpers";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type DayLabel = { month: number; day: number; weekday: number | null };

/** "Wednesday, Feb 10th", "Wed. June 29", "Feb 10" -> month/day/weekday. */
export function readDayLabel(label: string): DayLabel | null {
  const t = label.toLowerCase();
  const m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (!m) return null;
  const wd = t.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/);
  return { month: MONTHS.indexOf(m[1]!), day: Number(m[2]), weekday: wd ? WEEKDAYS.indexOf(wd[1]!) : null };
}

/**
 * Pick the calendar year for each day. Years named in the quote ("2026-2027
 * School Year") are tried first; a weekday in the label settles it ("Wednesday,
 * Feb 10th" is 2027). Days without a weekday follow the previous day, rolling
 * into the next year when the month goes backwards (Dec -> Jan).
 */
export function resolveDates(labels: string[], yearText: string, now = new Date()): (Date | null)[] {
  const named = [...yearText.matchAll(/\b(20\d\d)\b/g)].map(m => Number(m[1]));
  const base = now.getFullYear();
  const candidates = [...new Set([...named, base, base + 1, base + 2])];
  const out: (Date | null)[] = [];
  let prev: Date | null = null;
  for (const label of labels) {
    const d = readDayLabel(label);
    if (!d) { out.push(null); continue; }
    let pick: Date | null = null;
    if (d.weekday !== null) {
      for (const y of candidates) {
        const dt = new Date(y, d.month, d.day);
        if (dt.getDay() === d.weekday && (!prev || dt >= prev)) { pick = dt; break; }
      }
    }
    if (!pick) {
      const y: number = prev ? prev.getFullYear() + (d.month < prev.getMonth() ? 1 : 0) : (named[0] ?? base);
      pick = new Date(y, d.month, d.day);
    }
    out.push(pick);
    prev = pick;
  }
  return out;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayText = (d: Date) => `${MONTH_LABEL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

function rangeText(a: Date, b: Date): string {
  if (a.getFullYear() !== b.getFullYear()) return `${dayText(a)} - ${dayText(b)}`;
  if (a.getMonth() === b.getMonth()) return `${MONTH_LABEL[a.getMonth()]} ${a.getDate()}-${b.getDate()}, ${a.getFullYear()}`;
  return `${MONTH_LABEL[a.getMonth()]} ${a.getDate()} - ${MONTH_LABEL[b.getMonth()]} ${b.getDate()}, ${a.getFullYear()}`;
}

/** A first guess at the item type from its wording; hosts can change it. */
export function guessItemType(text: string): string {
  const t = text.toLowerCase();
  if (/\b(breakfast|lunch|dinner|meal|dining|snack|cafe|restaurant)\b/.test(t) && !/\bshow\b|\bconcert\b/.test(t)) return "food";
  if (/\b(check[ -]?in|check[ -]?out|arrive at hotel|return to hotel|hotel)\b/.test(t)) return "hotel";
  if (/\b(depart|departure|bus|flight|airport|travel|en route|return to school|drive|load)\b/.test(t)) return "travel";
  if (/\bmeet(s)? at\b|\bmeeting point\b/.test(t)) return "meeting";
  return "activity";
}

/** "8:00 am" -> "8:00 AM"; anything else is kept as typed. */
function normalizeTime(time: string): string {
  const m = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m?\.?$/i);
  if (!m) return time.trim();
  return `${Number(m[1])}:${m[2] ?? "00"} ${m[3]!.toUpperCase()}M`;
}

/** Markdown links in quote text become their label on the itinerary. */
const plainText = (s: string) => s.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1").trim();

export type TourPlan = {
  tour: { name: string; school: string; destination: string; dates: string; start_date: string | null; end_date: string | null; transport_type: string; hotel: string };
  days: { label: string; date: string; items: { title: string; time: string | null; type: string }[] }[];
};

export function planTourFromQuote(data: QuoteData, now = new Date()): TourPlan {
  const days = data.days.filter(d => d.date.trim() || d.rows.some(r => r.text.trim()));
  const dates = resolveDates(days.map(d => d.date), data.year ?? "", now);
  const known = dates.filter((d): d is Date => !!d);
  const start = known[0] ?? null;
  const end = known[known.length - 1] ?? null;

  const words = [...(data.pricing?.inclusions ?? []), ...days.flatMap(d => d.rows.map(r => r.text))].join(" ").toLowerCase();
  const hasFlight = /\b(flight|airfare|airport|fly)\b/.test(words);
  const hasBus = /\b(bus|buses|charter|coach)\b/.test(words);
  const transport = hasFlight && hasBus ? "both" : hasFlight ? "flight" : "bus";

  return {
    tour: {
      name: data.group.trim() || "New tour",
      school: data.group.trim() || "School",
      destination: data.destination.trim(),
      dates: start && end ? rangeText(start, end) : "",
      start_date: start ? iso(start) : null,
      end_date: end ? iso(end) : null,
      transport_type: transport,
      hotel: [data.pricing?.hotelDetails ?? "", data.pricing?.roomsNote ?? ""].filter(s => s.trim()).join("\n"),
    },
    days: days.map((d, i) => ({
      label: d.date,
      date: dates[i] ? dayText(dates[i]!) : d.date.trim(),
      items: d.rows
        .filter(r => r.text.trim())
        .map(r => ({ title: plainText(r.text), time: r.time.trim() ? normalizeTime(r.time) : null, type: guessItemType(r.text) })),
    })),
  };
}

export async function createTourFromQuote(
  supabase: SupabaseClient,
  quote: { id: string; data: QuoteData },
  userId: string,
): Promise<{ tourId: string; problems: string[] }> {
  const plan = planTourFromQuote(quote.data);
  const problems: string[] = [];

  const { data: tour, error } = await supabase
    .from("tours")
    .insert({
      tour_host_id: userId,
      name: plan.tour.name,
      school: plan.tour.school,
      destination: plan.tour.destination,
      dates: plan.tour.dates,
      start_date: plan.tour.start_date,
      end_date: plan.tour.end_date,
      status: "committed",
      transport_type: plan.tour.transport_type,
      access_codes: { coordinator: "", teacher: "", driver: "", student: "", chaperone: "" },
      active_personas: DEFAULT_ACTIVE_PERSONAS,
      // trip_info_overrides is NOT NULL; the quote's hotel details fill the
      // Hotel row in Trip Information.
      trip_info_overrides: plan.tour.hotel ? { hotel: plan.tour.hotel } : {},
      ...(quote.data.heroPhotoUrl ? {
        banner_image_url: quote.data.heroPhotoUrl,
        banner_focus_x: quote.data.heroFocusX ?? 50,
        banner_focus_y: quote.data.heroFocusY ?? 50,
      } : {}),
    })
    .select("id")
    .single();
  if (error || !tour) throw new Error(error?.message ?? "The tour was not created.");

  for (const [i, day] of plan.days.entries()) {
    const { data: newDay, error: dayErr } = await supabase
      .from("agenda_days")
      .insert({ tour_id: tour.id, day_number: i + 1, sort_order: i + 1, date: day.date })
      .select("id")
      .single();
    if (dayErr || !newDay) { problems.push(`${day.label}: ${dayErr?.message ?? "not created"}`); continue; }
    if (!day.items.length) continue;
    const { data: rows, error: itemErr } = await supabase
      .from("agenda_items")
      .insert(day.items.map((it, j) => ({
        day_id: newDay.id,
        tour_id: tour.id,
        sort_order: j + 1,
        time: it.time,
        type: it.type,
        title: it.title,
        persona_visibility: defaultPersonaVisibility(it.type, []),
      })))
      .select("id");
    if (itemErr || !rows || rows.length !== day.items.length) {
      problems.push(`${day.label} items: ${itemErr?.message ?? "some were not created"}`);
    }
  }

  // Link the quote to its itinerary. A refused write returns no rows, not an error.
  const { data: linked, error: linkErr } = await supabase
    .from("quotes").update({ tour_id: tour.id }).eq("id", quote.id).select("id");
  if (linkErr || !linked?.length) problems.push(`Linking the quote: ${linkErr?.message ?? "not saved"}`);

  return { tourId: tour.id, problems };
}
