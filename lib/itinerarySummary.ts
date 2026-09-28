// Summary of Itinerary (September 2026, Amy).
//
// A read-only, at-a-glance grid built from what is already entered on the
// itinerary days: one column per day, rows for Breakfast, Morning, Lunch,
// Afternoon, Dinner and Evening. Nothing here is stored or editable, so the
// summary can never disagree with the days below it. Pure functions only (no
// React), so the same rules drive the editor, shared links and print.

import { mealMoneyLabel, orderAgendaDays, orderAgendaItems, timeToMinutes, agendaWeekday } from "./helpers";

export const SUMMARY_SLOTS = [
  { key: "breakfast", label: "Breakfast", meal: true },
  { key: "morning", label: "Morning", meal: false },
  { key: "lunch", label: "Lunch", meal: true },
  { key: "afternoon", label: "Afternoon", meal: false },
  { key: "dinner", label: "Dinner", meal: true },
  { key: "evening", label: "Evening", meal: false },
] as const;

export type SummarySlot = (typeof SUMMARY_SLOTS)[number]["key"];

export interface SummaryItemInput {
  id?: string;
  time?: string | null;
  type?: string | null;
  title?: string | null;
  sort_order?: number | null;
  travel_methods?: string[] | null;
  meal_money?: { type: string }[] | null;
}

export interface SummaryDayInput {
  id: string;
  date: string;
  sort_order?: number | null;
  day_number?: number | null;
  agenda_items: SummaryItemInput[];
}

export interface SummaryDay {
  id: string;
  dayNumber: number;
  weekday: string;
  date: string;
  cells: Record<SummarySlot, string[]>;
}

// Boundaries, in minutes after midnight.
const NOON = 12 * 60;
const FIVE_PM = 17 * 60;
const BREAKFAST_END = 10 * 60 + 30;
const LUNCH_END = 15 * 60 + 30;

const MEAL_WORD = /\b(breakfast|brunch|lunch|dinner|supper)\b/i;

// Types that are logistics rather than something to summarize.
const SKIP_TYPES = new Set(["meeting", "hotel", "instructions", "break"]);

// Titles that describe getting somewhere, not doing something.
const LOGISTICS = /^(depart|departs|leave|load|head|travel|return|drive|transfer|charter|bus\b|pick[- ]?up|drop|arrive|arrival|board|meet|check|room check|bed check|wake|pack|lights out|bathroom|quick stop|stop\b|stage|collect)/i;
const PICKUP_ANYWHERE = /\bpick[- ]?up\b/i;
// "First group depart for Alcatraz", "Train ride ends".
const LOGISTICS_ANYWHERE = /\bdepart(s|ing)?\s+(for|to|from)\b|\bends$/i;
// A flight's landing line repeats its departure line.
const FLIGHT_LANDING = /\b(lands?|landing|arrives?|arrival)\b/i;

function isMeal(item: SummaryItemInput): boolean {
  if (item.type === "food") return true;
  return MEAL_WORD.test(item.title ?? "");
}

function mealFromWord(title: string): SummarySlot | null {
  const m = title.match(MEAL_WORD);
  if (!m) return null;
  const w = m[1].toLowerCase();
  if (w === "breakfast" || w === "brunch") return "breakfast";
  if (w === "lunch") return "lunch";
  return "dinner";
}

function mealFromMinutes(min: number): SummarySlot {
  if (min < BREAKFAST_END) return "breakfast";
  if (min < LUNCH_END) return "lunch";
  return "dinner";
}

function activityFromMinutes(min: number): SummarySlot {
  if (min < NOON) return "morning";
  if (min < FIVE_PM) return "afternoon";
  return "evening";
}

function activityFromWord(title: string): SummarySlot | null {
  if (/\bmorning\b/i.test(title)) return "morning";
  if (/\bafternoon\b/i.test(title)) return "afternoon";
  if (/\b(evening|tonight|night)\b/i.test(title)) return "evening";
  return null;
}

// Worth a line in the summary? Flights always are; other travel and
// logistics lines ("Depart for...", "Load bus", "Room checks") are not.
function isSummaryActivity(item: SummaryItemInput): boolean {
  const title = (item.title ?? "").trim();
  if (!title) return false;
  if (SKIP_TYPES.has(item.type ?? "")) return false;
  const isFlight = /\bflight\b/i.test(title) || (item.travel_methods ?? []).includes("flight");
  if (isFlight) return !FLIGHT_LANDING.test(title);
  if (LOGISTICS.test(title) || PICKUP_ANYWHERE.test(title) || LOGISTICS_ANYWHERE.test(title)) return false;
  return true;
}

// "Lunch at Warm Puppy Cafe" -> "Warm Puppy Cafe"; "Dinner at Pier 39" with a
// stipend -> "Pier 39 (Meal Stipend)"; a bare "Breakfast" with a delivered
// meal -> "Delivered Meal".
export function mealCellText(item: SummaryItemInput): string {
  const raw = (item.title ?? "").trim().replace(/\s+/g, " ");
  const rest = raw
    .replace(/^(group\s+)?(breakfast|brunch|lunch|dinner|supper)(\s+(stipend|stop))?\b\s*(at|@|in|-|:|–)?\s*/i, "")
    .replace(/^the\s+/i, "")
    .trim();
  const money = (item.meal_money ?? [])
    .map(m => (m.type === "stipend" ? "Stipend" : mealMoneyLabel(m.type)))
    .filter(Boolean);
  const moneyText = Array.from(new Set(money)).join(", ");
  if (rest && moneyText) return `${rest} (${moneyText})`;
  if (rest) return rest;
  if (moneyText) return moneyText;
  return raw || "Meal";
}

export function buildItinerarySummary(days: SummaryDayInput[]): SummaryDay[] {
  return orderAgendaDays(days).map((day, idx) => {
    const cells = Object.fromEntries(SUMMARY_SLOTS.map(s => [s.key, [] as string[]])) as Record<SummarySlot, string[]>;
    const items = orderAgendaItems(day.agenda_items as (SummaryItemInput & { sort_order?: number | null })[]);
    const minutes = items.map(i => timeToMinutes(i.time ?? null));

    // An untimed item takes its time from the nearest timed item before it in
    // the day's order, else the nearest after it.
    const nearMinutes = (i: number): number | null => {
      for (let j = i - 1; j >= 0; j--) if (minutes[j] !== null) return minutes[j];
      for (let j = i + 1; j < items.length; j++) if (minutes[j] !== null) return minutes[j];
      return null;
    };

    items.forEach((item, i) => {
      const title = (item.title ?? "").trim();
      const own = minutes[i];
      if (isMeal(item)) {
        const slot = mealFromWord(title) ?? mealFromMinutes(own ?? nearMinutes(i) ?? NOON);
        const text = mealCellText(item);
        if (!cells[slot].includes(text)) cells[slot].push(text);
        return;
      }
      if (!isSummaryActivity(item)) return;
      const slot = own !== null
        ? activityFromMinutes(own)
        : activityFromWord(title) ?? activityFromMinutes(nearMinutes(i) ?? 9 * 60);
      const text = title.replace(/\s+/g, " ");
      if (!cells[slot].includes(text)) cells[slot].push(text);
    });

    return {
      id: day.id,
      dayNumber: idx + 1,
      weekday: agendaWeekday(day.date, "long"),
      date: (day.date ?? "").replace(/,\s*\d{4}$/, ""),
      cells,
    };
  });
}

// Which viewers see the summary on shared links and print. The editor always
// shows it to staff. Default (null / empty column value) is Tour Host only.
export function summaryVisibleTo(personas: string[] | null | undefined, personaKey: string | null | undefined): boolean {
  const list = Array.isArray(personas) ? personas : ["tour_host"];
  return !!personaKey && list.includes(personaKey);
}
