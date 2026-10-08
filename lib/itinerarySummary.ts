// Summary of Itinerary (September 2026, Amy).
//
// A read-only, at-a-glance grid built from what is already entered on the
// itinerary days: one column per day, rows for Breakfast, Morning, Lunch,
// Afternoon, Dinner and Evening. The grid itself is never stored, so it can
// never disagree with the days below it; the only stored input is each item's
// optional show/hide checkbox (summary_include). Pure functions only (no
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
  // Consultant's choice from the checkbox on the itinerary row (October 2026,
  // Amy). null / undefined = automatic (the rules below decide); true = always
  // show; false = never show.
  summary_include?: boolean | null;
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
// "First group depart for Alcatraz", "Train ride ends", "Students Load Bus",
// "Choir meets at the school's parking lot".
const LOGISTICS_ANYWHERE = /\bdepart(s|ing)?\s+(for|to|from)\b|\bends$|\b(load|loads|loading)\s+(the\s+)?(bus|buses|coach|coaches|vans?)\b|\bmeets?\s+(at|in)\b/i;
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
// Hotel check-in always earns a line, whatever type it was entered as
// (Amy, Sept 2026). Needs a check-in word plus a hotel type or a lodging word,
// so "Check in for Flight" and "Check In with Universal Host" stay out.
// "Arrive at Hotel" counts too (October 2026, American Heritage HS Choir): an
// arrival at lodging is the day's hotel line when nobody wrote "check in".
// The arrival form is stricter: not a return to the hotel later in the day,
// not a luggage drop or an airport transfer, and "house" does not count as
// lodging ("Arrive at Citizens Opera House").
const CHECK_IN = /\bcheck(ing)?[- ]?in(to)?\b/i;
const ARRIVAL = /\barriv(e|es|al|ing)\b/i;
const NOT_FIRST_ARRIVAL = /\b(back|return|returning|luggage|bags|transfer|airport)\b/i;
const LODGING = /\b(hotel|inn|suites?|resort|lodge|motel|house|airbnb|air bnb)\b/i;
const LODGING_STRICT = /\b(hotel|inn|suites?|resort|lodge|motel|airbnb|air bnb)\b/i;
const NOT_HOTEL_CHECK_IN = /\b(flight|driver|storage)\b/i;

export function isHotelCheckIn(item: SummaryItemInput): boolean {
  const title = (item.title ?? "").trim();
  if (NOT_HOTEL_CHECK_IN.test(title)) return false;
  if (CHECK_IN.test(title)) return item.type === "hotel" || LODGING.test(title);
  if (ARRIVAL.test(title) && !NOT_FIRST_ARRIVAL.test(title)) return item.type === "hotel" || LODGING_STRICT.test(title);
  return false;
}

// What the summary would do with this item on its own, before any checkbox
// choice. The itinerary row's checkbox shows this until someone clicks it.
export function autoInSummary(item: SummaryItemInput): boolean {
  return isMeal(item) || isSummaryActivity(item);
}

export function inSummary(item: SummaryItemInput): boolean {
  if (item.summary_include === true) return true;
  if (item.summary_include === false) return false;
  return autoInSummary(item);
}

function isSummaryActivity(item: SummaryItemInput): boolean {
  const title = (item.title ?? "").trim();
  if (!title) return false;
  if (isHotelCheckIn(item)) return true;
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
    .trim()
    // "Dinner near Downtown Disney" -> "Near Downtown Disney".
    .replace(/^(near|by|on)\b/i, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
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

    // Meals first, so untimed activities can be placed around them.
    const mealSlots: (SummarySlot | null)[] = items.map(() => null);
    const nearMinutes = (i: number): number | null => {
      for (let j = i - 1; j >= 0; j--) if (minutes[j] !== null) return minutes[j];
      for (let j = i + 1; j < items.length; j++) if (minutes[j] !== null) return minutes[j];
      return null;
    };
    items.forEach((item, i) => {
      if (!isMeal(item)) return;
      mealSlots[i] = mealFromWord((item.title ?? "").trim()) ?? mealFromMinutes(minutes[i] ?? nearMinutes(i) ?? NOON);
    });

    // An untimed activity is placed by where it sits in the day's order
    // (Amy, Sept 2026: early in planning most times are blank, but the order
    // is right). The nearest item before it that carries a signal decides:
    // after Breakfast = Morning, after Lunch = Afternoon, after Dinner =
    // Evening, after a timed item = that item's part of the day. With nothing
    // before it, the nearest signal after it decides: before Lunch = Morning,
    // before Dinner = Afternoon.
    const AFTER_MEAL: Record<string, SummarySlot> = { breakfast: "morning", lunch: "afternoon", dinner: "evening" };
    const BEFORE_MEAL: Record<string, SummarySlot> = { breakfast: "morning", lunch: "morning", dinner: "afternoon" };
    const placeUntimed = (i: number): SummarySlot => {
      for (let j = i - 1; j >= 0; j--) {
        if (mealSlots[j]) return AFTER_MEAL[mealSlots[j]!];
        if (minutes[j] !== null) return activityFromMinutes(minutes[j]!);
      }
      for (let j = i + 1; j < items.length; j++) {
        if (mealSlots[j]) return BEFORE_MEAL[mealSlots[j]!];
        if (minutes[j] !== null) return activityFromMinutes(minutes[j]!);
      }
      return "morning";
    };

    items.forEach((item, i) => {
      const title = (item.title ?? "").trim();
      const own = minutes[i];
      const mealSlot = mealSlots[i];
      // A hidden meal still helps place the untimed items around it (its slot
      // was recorded above); it just does not get a line of its own.
      if (item.summary_include === false) return;
      if (mealSlot) {
        const text = mealCellText(item);
        if (!cells[mealSlot].includes(text)) cells[mealSlot].push(text);
        return;
      }
      if (!title) return;
      if (item.summary_include !== true && !isSummaryActivity(item)) return;
      const slot = own !== null
        ? activityFromMinutes(own)
        : activityFromWord(title) ?? placeUntimed(i);
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
