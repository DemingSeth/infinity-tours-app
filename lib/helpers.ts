import type { TourMemberRow, RoomConfig } from "@/lib/types";

// ─── Brand ────────────────────────────────────────────────────────────────────

export const BRAND = {
  navy: "#0d2137",
  teal: "#2ec4b6",
  gold: "#c9a84c",
  cream: "#faf8f4",
  phone: "801-477-8963",
  email: "info@infinitytours.us",
} as const;

// ─── Constants ────────────────────────────────────────────────────────────────

export const STATUSES = [
  { id: "bid",         label: "Bid",         color: "#92400e", bg: "#fef3c7", dot: "#d97706" },
  { id: "committed",   label: "Committed",   color: "#065f46", bg: "#ecfdf5", dot: "#10b981" },
  { id: "in-progress", label: "In Progress", color: "#1e40af", bg: "#eff6ff", dot: "#3b82f6" },
  { id: "closed",      label: "Closed",      color: "#374151", bg: "#f3f4f6", dot: "#9ca3af" },
] as const;

export const AGENDA_TYPES = [
  { value: "travel",   label: "Travel",    emoji: "✈" },
  { value: "activity", label: "Activity",  emoji: "🎭" },
  { value: "food",     label: "Dining",    emoji: "🍽" },
  { value: "hotel",    label: "Hotel",     emoji: "🏨" },
  { value: "transit",  label: "Transit",   emoji: "🚇" },
  { value: "free",     label: "Free Time", emoji: "🕐" },
  { value: "meeting",  label: "Meeting",   emoji: "📋" },
] as const;

export const TRAVEL_METHODS = [
  { value: "",          label: "Not specified" },
  { value: "bus",       label: "Charter Bus" },
  { value: "flight",    label: "Flight" },
  { value: "subway",    label: "Subway / Metro" },
  { value: "train",     label: "Train" },
  { value: "walking",   label: "Walking" },
  { value: "rideshare", label: "Taxi / Rideshare" },
  { value: "ferry",     label: "Ferry" },
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
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
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
