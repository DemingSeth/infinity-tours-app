import type { TourMemberRow, RoomConfig, TripInfo, Role } from "@/lib/types";

// ─── Brand ────────────────────────────────────────────────────────────────────

export const BRAND = {
  navy: "#0d2137",
  teal: "#2ec4b6",
  gold: "#c9a84c",
  cream: "#faf8f4",
  phone: "801-477-8963",
  email: "info@infinitytours.us",
} as const;

// Banner header tile overlay. Single source of truth for the gradient + text
// shadow used over the banner photo so text stays legible without hiding the
// image. Referenced by every place that renders the banner header tile — tweak
// here to change it everywhere (editing view, previews, public view, Settings
// preview).
export const BANNER_OVERLAY_GRADIENT = "linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.45))";
export const BANNER_TEXT_SHADOW = "0 1px 6px rgba(0,0,0,0.75)";

// ─── Constants ────────────────────────────────────────────────────────────────

export const STATUSES = [
  { id: "bid",         label: "Quote",       color: "#92400e", bg: "#fef3c7", dot: "#d97706" },
  { id: "committed",   label: "Committed",   color: "#065f46", bg: "#ecfdf5", dot: "#10b981" },
  { id: "in-progress", label: "In Progress", color: "#1e40af", bg: "#eff6ff", dot: "#3b82f6" },
  { id: "closed",      label: "Closed",      color: "#374151", bg: "#f3f4f6", dot: "#9ca3af" },
] as const;

// Top-level itinerary item types. "Travel" and "Activity" have sub-types
// (see TRAVEL_SUBTYPES / ACTIVITY_SUBTYPES) whose selection drives the icon.
export const AGENDA_TYPES = [
  { value: "travel",       label: "Travel",        emoji: "✈" },
  { value: "activity",     label: "Activity",      emoji: "🎢" },
  { value: "food",         label: "Dining",        emoji: "🍽" },
  { value: "hotel",        label: "Hotel",         emoji: "🏨" },
  { value: "free",         label: "Free Time",     emoji: "🌴" },
  { value: "break",        label: "Break",         emoji: "☕" },
  { value: "meeting",      label: "Meeting Point", emoji: "📍" },
  { value: "instructions", label: "Instructions",  emoji: "📋" },
  { value: "general",      label: "General",       emoji: "✨" },
] as const;

// Travel sub-types — stored in the item's `travel_method` field.
export const TRAVEL_SUBTYPES = [
  { value: "bus",       label: "Bus" },
  { value: "flight",    label: "Flight" },
  { value: "train",     label: "Train" },
  { value: "rideshare", label: "Uber / Rideshare" },
  { value: "subway",    label: "Subway" },
  { value: "ferry",     label: "Ferry" },
  { value: "cruise",    label: "Cruise" },
  { value: "walking",   label: "Walking" },
  { value: "gas_station", label: "Gas Station" },
] as const;

// Activity sub-types — stored in the item's `activity_subtype` field.
export const ACTIVITY_SUBTYPES = [
  { value: "theme_park",     label: "Theme Park" },
  { value: "disney",         label: "Disney" },
  { value: "medieval_times", label: "Medieval Times" },
  { value: "beach",          label: "Beach" },
  { value: "clinic",         label: "Clinic" },
  { value: "concert",        label: "Concert" },
] as const;

// Instructions sub-types (wake-up / lights-out). Also stored in `activity_subtype`.
export const INSTRUCTION_SUBTYPES = [
  { value: "wake_up",    label: "Wake Up" },
  { value: "lights_out", label: "Lights Out" },
] as const;

// Generic sub-types for miscellaneous items that don't fit the other types.
// Stored in `activity_subtype`.
export const GENERAL_SUBTYPES = [
  { value: "general",   label: "General" },
  { value: "highlight", label: "Highlight" },
  { value: "weather",   label: "Weather" },
] as const;

// Sub-type option lists keyed by top-level type. Travel keeps its own field
// (travel_method); activity, instructions, and general all use activity_subtype.
export const SUBTYPES_BY_TYPE: Record<string, readonly { value: string; label: string }[]> = {
  activity: ACTIVITY_SUBTYPES,
  instructions: INSTRUCTION_SUBTYPES,
  general: GENERAL_SUBTYPES,
};

// An item counts as an "Activity" if its type is the Activity type or it carries
// an Activity sub-type. Drives the default for the per-item student-feedback toggle.
// Accepts either a single sub-type (legacy) or the multi-select array.
export function isActivityType(type: string | null | undefined, activitySubtypes?: string | string[] | null): boolean {
  if (type === "activity") return true;
  const arr = Array.isArray(activitySubtypes) ? activitySubtypes : activitySubtypes ? [activitySubtypes] : [];
  return arr.some(s => ACTIVITY_SUBTYPES.some(a => a.value === s));
}

// Meal-money option list (multi-select). "group" carries no amount; the others
// each take a dollar amount. Order here drives the editor button order.
export const MEAL_MONEY_TYPES = [
  { value: "group",           label: "Group Meal",                hasAmount: false },
  { value: "hotel_breakfast", label: "Hotel Breakfast",           hasAmount: false },
  { value: "stipend",         label: "Meal Stipend (Till Card)",  hasAmount: true  },
  { value: "disney_dining",   label: "Disney Dining Dollars",     hasAmount: true  },
  { value: "cash",            label: "Cash",                      hasAmount: true  },
] as const;

export function mealMoneyHasAmount(type: string): boolean {
  return MEAL_MONEY_TYPES.find(t => t.value === type)?.hasAmount ?? false;
}

export function mealMoneyLabel(type: string): string {
  return MEAL_MONEY_TYPES.find(t => t.value === type)?.label ?? type;
}

// Display labels for the travel-method badge shown on items. Mirrors the
// TRAVEL_SUBTYPES values (the empty option means "not specified").
export const TRAVEL_METHODS = [
  { value: "",          label: "Not specified" },
  { value: "bus",       label: "Charter Bus" },
  { value: "flight",    label: "Flight" },
  { value: "subway",    label: "Subway / Metro" },
  { value: "train",     label: "Train" },
  { value: "walking",   label: "Walking" },
  { value: "rideshare", label: "Taxi / Rideshare" },
  { value: "ferry",     label: "Ferry" },
  { value: "cruise",    label: "Cruise" },
  { value: "gas_station", label: "Gas Station" },
] as const;

export const MEMBER_TYPES = [
  { value: "student",   label: "Student" },
  { value: "chaperone", label: "Chaperone" },
  { value: "tour-host", label: "Tour Host" },
  { value: "teacher",   label: "Teacher / Admin" },
  { value: "driver",    label: "Bus Driver" },
] as const;

export const VENDOR_CATS = ["Airfare", "Bus", "Hotel", "Tickets", "Restaurant", "Activity", "Other"] as const;

export const ROLES = {
  coordinator: { label: "Tour Host",          color: BRAND.navy, bg: "#e8f4f8", rank: 4 },
  teacher:     { label: "Teacher / Admin",     color: "#5b21b6",  bg: "#f5f3ff", rank: 3 },
  driver:      { label: "Bus Driver",          color: "#92400e",  bg: "#fef3c7", rank: 2 },
  student:     { label: "Student / Chaperone", color: "#065f46",  bg: "#ecfdf5", rank: 1 },
} as const;

export const DEFAULT_VISIBILITY = {
  coordinator: { address: true, mapLink: true, contactName: true, contactPhone: true, contactEmail: true, cost: true, costPaid: true, driverNote: true, detail: true, internalNote: true },
  teacher:     { address: true, mapLink: true, contactName: true, contactPhone: true, contactEmail: true, cost: true, costPaid: false, driverNote: false, detail: true, internalNote: false },
  driver:      { address: true, mapLink: true, contactName: false, contactPhone: false, contactEmail: false, cost: false, costPaid: false, driverNote: true, detail: false, internalNote: false },
  student:     { address: true, mapLink: true, contactName: false, contactPhone: false, contactEmail: false, cost: false, costPaid: false, driverNote: false, detail: true, internalNote: false },
} as const;

// ─── Participant personas ─────────────────────────────────────────────────────

export interface PersonaDef {
  key: string;          // persona key stored in active_personas
  default: string;      // default label
  locked: boolean;      // tour_host is always on
  defaultOn: boolean;   // included in a new tour's defaults
  viewRole: Role;       // which itinerary view (visibility) this persona sees
  codeKey: string;      // access_codes key
  memberType: string;   // tour_members.type used for participant counts
  color: string;        // accent color (distinct per persona)
  bg: string;           // accent background tint
}

// Order here is the canonical checklist order (Tour Host, Teacher, Student,
// Chaperone, Bus Driver). Each persona has its OWN color so Student and
// Chaperone are distinguishable everywhere (Chaperone = blue).
export const PERSONAS: PersonaDef[] = [
  { key: "tour_host",  default: "Tour Host",  locked: true,  defaultOn: true,  viewRole: "coordinator", codeKey: "coordinator", memberType: "tour-host", color: BRAND.navy, bg: "#e8f4f8" },
  { key: "teacher",    default: "Teacher",    locked: false, defaultOn: true,  viewRole: "teacher",     codeKey: "teacher",     memberType: "teacher",   color: "#5b21b6", bg: "#f5f3ff" },
  { key: "student",    default: "Student",    locked: false, defaultOn: true,  viewRole: "student",     codeKey: "student",     memberType: "student",   color: "#065f46", bg: "#ecfdf5" },
  { key: "chaperone",  default: "Chaperone",  locked: false, defaultOn: true,  viewRole: "student",     codeKey: "chaperone",   memberType: "chaperone", color: "#1d4ed8", bg: "#eff6ff" },
  { key: "bus_driver", default: "Bus Driver", locked: false, defaultOn: false, viewRole: "driver",      codeKey: "driver",      memberType: "driver",    color: "#92400e", bg: "#fef3c7" },
];

// Accent color/background for a persona (distinct per persona, not per view role).
export function personaColors(key: string): { color: string; bg: string } {
  const p = getPersona(key);
  return { color: p?.color ?? "#64748b", bg: p?.bg ?? "#f1f5f9" };
}

export const DEFAULT_ACTIVE_PERSONAS = PERSONAS.filter(p => p.defaultOn).map(p => p.key);

export function getPersona(key: string): PersonaDef | undefined {
  return PERSONAS.find(p => p.key === key);
}

// Resolve a persona's display label (custom override → default).
export function personaLabel(key: string, labels?: Record<string, string> | null): string {
  const override = labels?.[key]?.trim();
  return override || getPersona(key)?.default || key;
}

// Active persona keys for a tour, falling back to the defaults.
export function activePersonaKeys(active?: string[] | null): string[] {
  const list = active && active.length ? active : DEFAULT_ACTIVE_PERSONAS;
  // Return in canonical PERSONAS order.
  return PERSONAS.filter(p => list.includes(p.key)).map(p => p.key);
}

export function isPersonaActive(key: string, active?: string[] | null): boolean {
  return activePersonaKeys(active).includes(key);
}

// Smart per-persona visibility defaults for a NEW item, by type + travel method.
// Bus Driver only sees bus-relevant items (bus travel, breaks, meeting points)
// by default. In a future phase, these defaults can be made configurable
// per-tour in Settings.
// Accepts either a single travel method (legacy) or the multi-select array.
export function defaultPersonaVisibility(type: string, travelMethods?: string | string[] | null): Record<string, boolean> {
  const base: Record<string, boolean> = { tour_host: true, teacher: true, student: true, chaperone: true, bus_driver: false };
  const arr = Array.isArray(travelMethods) ? travelMethods : travelMethods ? [travelMethods] : [];
  if (arr.includes("bus") || type === "break" || type === "meeting") {
    return { ...base, bus_driver: true };
  }
  // flight, hotel, and everything else keep bus_driver hidden.
  return base;
}

// Whether an item is visible to a persona — strictly visibility[persona] === true.
export function isItemVisibleTo(
  item: { persona_visibility?: Record<string, boolean> | null },
  personaKey: string,
): boolean {
  return item.persona_visibility?.[personaKey] === true;
}

// ─── Roster ───────────────────────────────────────────────────────────────────

// Which roster role-sections a viewer may see. Reuses the existing persona/role
// model (PersonaDef.viewRole) rather than a parallel visibility system. The
// host/coordinator sees every active section; other roles will get filtered
// roster views later — they map to the personas that share their itinerary view
// role. Roster v1 only renders the host view, so only the coordinator branch is
// exercised today; the rest is the foundation for role-filtered views.
export function visibleRosterPersonas(personaKeys: string[], viewerRole: Role): string[] {
  if (viewerRole === "coordinator") return personaKeys;
  return personaKeys.filter(k => getPersona(k)?.viewRole === viewerRole);
}

// Expected headcount for a persona's roster section, pulled from the tour's
// planning numbers. Only students carry a planned count today; other roles
// return null (the header shows the actual count without an "of N").
export function expectedCountForPersona(
  key: string,
  tour: { student_count?: number | null },
): number | null {
  if (key === "student") return tour.student_count ?? null;
  return null;
}

// ─── Location formatting ──────────────────────────────────────────────────────

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

// Expand a trailing 2-letter US state abbreviation to its full name, e.g.
// "Anaheim, CA" → "Anaheim, California". Only the final comma-delimited
// segment is touched, so city names are never altered. Non-US / already-full
// destinations pass through unchanged.
export function expandStateName(dest: string | null | undefined): string {
  if (!dest) return dest ?? "";
  const parts = dest.split(",");
  const last = parts[parts.length - 1].trim();
  if (last.length === 2 && US_STATES[last.toUpperCase()]) {
    parts[parts.length - 1] = ` ${US_STATES[last.toUpperCase()]}`;
    return parts.join(",");
  }
  return dest;
}

// ─── Trip Information ─────────────────────────────────────────────────────────

// Spell a DATE column out in full, e.g. "Saturday, June 14, 2026".
export function formatFullDate(value: string | null | undefined): string {
  const d = parseISODate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// Resolve the Trip Information summary from the tour record, roster, itinerary
// items (hotel/bus), and host contact. Tolerant of missing data — callers render
// fallback dashes rather than hiding the section.
export function buildTripInfo({ tour, members, days, hostName, hostPhone, confirmations }: {
  tour: any;
  members: { type?: string | null }[];
  days: { agenda_items?: { type?: string | null; travel_methods?: string[] | null; title?: string | null; address?: string | null; contact_name?: string | null; contact_phone?: string | null }[] }[];
  hostName?: string | null;
  hostPhone?: string | null;
  confirmations?: { type: string; label: string | null; file_url: string }[] | null;
}): TripInfo {
  const items = (days ?? []).flatMap(d => d.agenda_items ?? []);
  const m = members ?? [];

  // Hotel: prefer a "Check In - <Name>" style item (carries the real hotel
  // name), else the first hotel item. Strip the leading action verb so we show
  // the hotel name rather than "Arrive at Hotel".
  const hotelItems = items.filter(i => i.type === "hotel");
  const hotel = hotelItems.find(i => /[-–]/.test(i.title ?? "")) ?? hotelItems[0];
  const stripAction = (s: string) =>
    s.replace(/^\s*(check[\s-]*in|check[\s-]*out|arrive(?:\s+at)?|arrival(?:\s+at)?|depart(?:\s+for)?|return(?:\s+to)?|load\s+bus.*?depart(?:\s+for)?|meet.*?depart(?:\s+for)?)\b[\s:–-]*/i, "").trim();
  const hotelName = hotel?.title ? (stripAction(hotel.title) || hotel.title) : null;

  // Bus: the company name now comes from the tour record (tours.bus_company),
  // set on the Overview inputs — no longer parsed from the bus item title. We
  // still pick the bus item to preserve the existing DISPATCH contact (its
  // contact_name / contact_phone fields), which is unchanged.
  const busItems = items.filter(i => (i.travel_methods ?? []).includes("bus"));
  const bus = busItems.find(i => i.contact_name || i.contact_phone) ?? busItems[0] ?? null;
  const busCompany = (tour?.bus_company ?? "").trim() || null;
  // Host-only bus driver contact (from the tour record).
  const driver = (tour?.bus_driver_contact as { name?: string | null; phone?: string | null } | null) || null;

  // Flight: the first flight travel item carries the airline/flight title and
  // (optionally) the airport in its address field.
  const flightItems = items.filter(i => (i.travel_methods ?? []).includes("flight"));
  const flight = flightItems[0] ?? null;
  const flightName = flight ? (stripAction(flight.title ?? "") || flight.contact_name || null) : null;

  const rc = (tour?.room_config as RoomConfig | null) || null;
  const roomBits: string[] = [];
  if (rc?.boysPerRoom) roomBits.push(`${rc.boysPerRoom} boys/room`);
  if (rc?.girlsPerRoom) roomBits.push(`${rc.girlsPerRoom} girls/room`);

  // Participant breakdown by active persona, using the tour's custom labels.
  // Display order puts travelers first and Tour Host last (e.g. "26 Choir
  // Members, 11 Chaperones, 1 Tour Host").
  const labels = tour?.persona_labels as Record<string, string> | undefined;
  const active = activePersonaKeys(tour?.active_personas);
  const order = ["student", "chaperone", "teacher", "bus_driver", "tour_host"];
  // Manual count overrides (tours.participant_counts) win over the roster-derived
  // count, per persona; a missing key falls back to the derived value.
  const overrides = (tour?.participant_counts as Record<string, number> | null) || {};
  const participants = order
    .filter(k => active.includes(k))
    .map(k => {
      const derived = m.filter(x => x.type === getPersona(k)?.memberType).length;
      const override = overrides[k];
      const count = typeof override === "number" && Number.isFinite(override) ? override : derived;
      return { key: k, label: personaLabel(k, labels), count };
    });

  return {
    teacherName: tour?.contact_name || null,
    teacherEmail: tour?.contact_email || null,
    tourHostName: tour?.traveling_tour_host || hostName || null,
    tourHostPhone: hostPhone || null,
    participants,
    totalParticipants: participants.reduce((s, p) => s + p.count, 0),
    participantsOverride: tour?.participants_display_override ?? null,
    departure: tour?.start_date || null,
    returnDate: tour?.end_date || null,
    flightName: flightName || null,
    flightAddress: flight?.address || null,
    hasFlight: flightItems.length > 0,
    hotelName: hotelName || null,
    hotelAddress: hotel?.address || null,
    hotelRooms: roomBits.length ? roomBits.join(" · ") : null,
    busCompany,
    busContactName: bus?.contact_name || null,
    busContactPhone: bus?.contact_phone || null,
    busDriverName: (driver?.name ?? "").trim() || null,
    busDriverPhone: (driver?.phone ?? "").trim() || null,
    busCapacity: tour?.bus_capacity ?? null,
    hasBus: busItems.length > 0,
    confirmations: confirmations ?? [],
  };
}

// ─── Agenda item time ordering ────────────────────────────────────────────────

// Parse a display time string ("5:20 AM", "9:00 PM", "12:00 AM", "14:30") into
// minutes since midnight (0–1439). Returns null for empty/unparseable values so
// callers can sort those to a stable position rather than crashing.
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i)
    ?? time.trim().match(/^(\d{1,2}):(\d{2})$/); // 24-hour fallback
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (Number.isNaN(h) || Number.isNaN(min) || min > 59) return null;
  const mer = m[3]?.toLowerCase();
  if (mer === "a") { if (h === 12) h = 0; }       // 12 AM = midnight
  else if (mer === "p") { if (h !== 12) h += 12; } // PM (except 12 PM = noon)
  else if (h > 23) return null;                    // 24-hour out of range
  if (h > 23) return null;
  return h * 60 + min;
}

// Order a day's agenda items chronologically by their time. Timed items come
// first (ascending); untimed items keep their existing order and sort to the end.
// Ties (same time, or both untimed) fall back to sort_order, then original index,
// for a stable result. Pure — returns a new array.
export function sortAgendaItemsByTime<T extends { time?: string | null; sort_order?: number | null }>(items: T[]): T[] {
  return items
    .map((item, idx) => ({ item, idx, mins: timeToMinutes(item.time) }))
    .sort((a, b) => {
      if (a.mins !== b.mins) {
        if (a.mins === null) return 1;   // untimed after timed
        if (b.mins === null) return -1;
        return a.mins - b.mins;
      }
      const ao = a.item.sort_order ?? 0;
      const bo = b.item.sort_order ?? 0;
      if (ao !== bo) return ao - bo;
      return a.idx - b.idx;
    })
    .map(x => x.item);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function parseAgendaDate(str: string): Date | null {
  if (!str) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) return new Date(str.trim() + "T12:00:00");
    const m = str.match(/([A-Za-z]+)\s+(\d+)(?:,?\s*(\d{4}))?/);
    if (m) {
      const month = MONTHS.findIndex(mo => mo.toLowerCase() === m[1].toLowerCase().slice(0, 3));
      const day = parseInt(m[2]);
      const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
      if (month >= 0) return new Date(year, month, day, 12, 0, 0);
    }
  } catch {}
  return null;
}

export function formatAgendaDate(d: Date): string {
  if (!d) return "";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function toDateInput(d: Date): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function suggestNextDate(agendaDays: Array<{ date: string }>): Date | null {
  if (!agendaDays || agendaDays.length === 0) return null;
  const lastDay = agendaDays[agendaDays.length - 1];
  const parsed = parseAgendaDate(lastDay.date);
  if (!parsed) return null;
  const next = new Date(parsed);
  next.setDate(next.getDate() + 1);
  return next;
}

export function expandDateRange(rangeStr: string): Date[] {
  if (!rangeStr) return [];
  const m = rangeStr.match(/([A-Za-z]+)\s+(\d+)[–\-](\d+),?\s*(\d{4})?/);
  if (m) {
    const month = MONTHS.findIndex(mo => mo.toLowerCase() === m[1].toLowerCase().slice(0, 3));
    const start = parseInt(m[2]);
    const end   = parseInt(m[3]);
    const year  = m[4] ? parseInt(m[4]) : new Date().getFullYear();
    if (month >= 0 && start <= end) {
      return Array.from({ length: end - start + 1 }, (_, i) => new Date(year, month, start + i, 12, 0, 0));
    }
  }
  const single = parseAgendaDate(rangeStr);
  return single ? [single] : [];
}

export function isDayInPast(dateStr: string): boolean {
  const parsed = parseAgendaDate(dateStr);
  if (!parsed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today;
}

// ─── Map URL ──────────────────────────────────────────────────────────────────

const FAKE_MAP_SUFFIXES = [
  "/ewr","/slc","/rigbyhs","/slcairport","/lehmancollege","/highline","/chelseamarket",
  "/holidayinnchelsea","/lincolncenter","/timessquare","/redstairs","/ellens","/gershwin",
  "/summitvanderbilt","/vanderbiltmarket","/apollotheater","/jazzmuseum","/rayspizza",
  "/amnh","/centralparkwalk","/stbarts","/batterypark","/ellisisland","/911museum",
  "/hudsoneats","/anitas","/brooklynbridge","/puglias","/centerville","/maverick",
  "/jfk","/centralparkwalk","/jazzmuseum",
];

export function getMapUrl(mapLink: string | null, address: string | null): string | null {
  if (mapLink && mapLink.startsWith("http")) {
    const isFake = FAKE_MAP_SUFFIXES.some(s => mapLink.endsWith(s));
    if (!isFake) return mapLink;
  }
  if (address && address.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }
  return null;
}

// ─── Roster calculations ──────────────────────────────────────────────────────

export function calcRoster(members: TourMemberRow[], busCapacity: number) {
  const students   = members.filter(m => m.type === "student");
  const chaperones = members.filter(m => m.type === "chaperone");
  const hosts      = members.filter(m => m.type === "tour-host" || m.type === "teacher");
  const drivers    = members.filter(m => m.type === "driver");
  const busRiders  = members.filter(m => m.type !== "driver").length;
  const busesNeeded = busCapacity > 0 ? Math.ceil(busRiders / busCapacity) : 1;
  const payingCount = students.length + chaperones.length;
  return { students, chaperones, hosts, drivers, busRiders, busesNeeded, payingCount };
}

export function calcRooms(members: TourMemberRow[], roomConfig: RoomConfig) {
  const boys = members.filter(m => m.type === "student" && m.gender === "male").length;
  const girls = members.filter(m => m.type === "student" && m.gender === "female").length;
  const boysPerRoom = roomConfig?.boysPerRoom || 4;
  const girlsPerRoom = roomConfig?.girlsPerRoom || 4;
  const boyRooms = Math.ceil(boys / boysPerRoom);
  const girlRooms = Math.ceil(girls / girlsPerRoom);
  return { boys, girls, boyRooms, girlRooms, totalRooms: boyRooms + girlRooms };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function fmt$(n: number | null | undefined): string {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getStatus(id: string) {
  return STATUSES.find(s => s.id === id) || STATUSES[0];
}

export function getAgendaType(value: string) {
  return AGENDA_TYPES.find(t => t.value === value) || AGENDA_TYPES[0];
}

// ─── Overview command center helpers ───────────────────────────────────────────

// Distinct, readable colors for the calendar's "By Host" mode. Cycles if there
// are more hosts than colors.
export const HOST_PALETTE = [
  "#2563eb", "#db2777", "#16a34a", "#d97706", "#7c3aed",
  "#0891b2", "#dc2626", "#4f46e5", "#ca8a04", "#0d9488",
] as const;

// Build a stable hostId → color map. Sorting by id keeps colors consistent
// across renders regardless of tour ordering.
export function buildHostColorMap(hostIds: (string | null | undefined)[]): Record<string, string> {
  const unique = Array.from(new Set(hostIds.filter((id): id is string => !!id))).sort();
  const map: Record<string, string> = {};
  unique.forEach((id, i) => { map[id] = HOST_PALETTE[i % HOST_PALETTE.length]; });
  return map;
}

// Resolve a tour's display host name. Prefers the joined `tour_hosts` row (the
// assigned account owner — e.g. Mike Crockett), then falls back to the free-text
// traveling/planning host columns, and only shows "Unassigned" when none exist.
// Used by the calendar so a tour with a real host never renders as "Unassigned".
export function hostNameOf(tour: {
  tour_hosts?: { name?: string | null } | null;
  traveling_tour_host?: string | null;
  planning_tour_host?: string | null;
}): string {
  return (
    tour.tour_hosts?.name?.trim() ||
    tour.traveling_tour_host?.trim() ||
    tour.planning_tour_host?.trim() ||
    "Unassigned"
  );
}

export function initialsFrom(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  return name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || fallback;
}

// Parse a DATE column ('YYYY-MM-DD') to a local Date at noon (avoids TZ drift).
export function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Human date label for a tour: prefer the free-text `dates`, else derive from
// the start/end DATE columns. Falls back to "Dates TBD".
export function tourDateLabel(
  dates: string | null | undefined,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  if (dates && dates.trim()) return dates;
  const s = parseISODate(startDate);
  if (!s) return "Dates TBD";
  const e = parseISODate(endDate) ?? s;
  const fmt = (d: Date) => `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  if (!sameDay(s, e)) return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`;
  return `${fmt(s)}, ${s.getFullYear()}`;
}
