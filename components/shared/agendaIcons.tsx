"use client";

import {
  Plane, Bus, TrainFront, CarTaxiFront, TramFront, Sailboat, Ship, Fuel,
  RollerCoaster, Music, Hotel, MapPin, Smile,
  Sun, Moon, Star, Umbrella, Sparkles, ClipboardList,
  Meh, Frown, type LucideIcon,
} from "lucide-react";

// Icons accept the same prop subset Lucide does, so custom SVGs and Lucide
// icons are interchangeable in the maps below.
export type IconProps = {
  size?: number | string;
  strokeWidth?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
};
export type AgendaIcon = React.ComponentType<IconProps>;

// ── Custom inline SVG icons (Lucide-style: 24×24, currentColor stroke) ─────────
function Svg({ size = 24, strokeWidth = 2, color = "currentColor", style, className, viewBox = "0 0 24 24", children }:
  IconProps & { viewBox?: string; children: React.ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={viewBox}
      fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className}>
      {children}
    </svg>
  );
}

// Disney — generic fairy-tale castle silhouette (crenellated side towers, a
// central spire with a pennant, and a gate). Intentionally not a reproduction
// of any real branded castle.
function FantasyCastle(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Filled silhouette. Base wall with an arched gate carved out (evenodd),
          two short pointed side turrets, and a central tower topped by a tall
          thin spire flanked by two mini turrets — reads as a fairy-tale castle. */}
      <path fill="currentColor" stroke="none" fillRule="evenodd"
        d="M4 21 L4 12 L20 12 L20 21 Z M10.2 21 L10.2 16.5 Q12 14.3 13.8 16.5 L13.8 21 Z" />
      <path fill="currentColor" stroke="none" d="M4.5 12 L4.5 9.5 L4 9.5 L6 6.3 L8 9.5 L7.5 9.5 L7.5 12 Z" />
      <path fill="currentColor" stroke="none" d="M16.5 12 L16.5 9.5 L16 9.5 L18 6.3 L20 9.5 L19.5 9.5 L19.5 12 Z" />
      <path fill="currentColor" stroke="none" d="M9 12 L9 8.6 L15 8.6 L15 12 Z" />
      <path fill="currentColor" stroke="none" d="M9 8.6 L9 7 L9.7 6 L10.4 7 L10.4 8.6 Z" />
      <path fill="currentColor" stroke="none" d="M13.6 8.6 L13.6 7 L14.3 6 L15 7 L15 8.6 Z" />
      <path fill="currentColor" stroke="none" d="M10.6 8.6 L12 1.5 L13.4 8.6 Z" />
    </Svg>
  );
}

// Medieval Times — jousting lance and shield.
function MedievalJoust(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 14s3.3-1.7 3.3-4.6V5L7 3.8 3.7 5v4.4C3.7 12.3 7 14 7 14z" />
      <path d="M10 20.5 20.5 5.5" />
      <path d="M20.5 5.5l-3 .3 1 2.8" />
    </Svg>
  );
}

// Beach — beach umbrella over sand.
function BeachUmbrella(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11a8 4.5 0 0 1 16 0Z" />
      <path d="M12 7v13" />
      <path d="M4 20h16" />
    </Svg>
  );
}

// Clinic (music clinic) — treble clef / G clef, filled silhouette. The glyph is
// taller than the standard 24-unit box (its bottom curl reaches ~y25), so it
// gets a slightly taller viewBox to stop the bottom from being clipped.
function TrebleClef(props: IconProps) {
  return (
    <Svg {...props} viewBox="0 -1 24 27">
      <path fill="currentColor" stroke="none" d="M14 2.6c-1.9.8-3.1 2.7-3.1 4.9 0 1.2.3 2.4.7 3.6-2 1.3-3.4 3.1-3.4 5.4 0 2.7 2.1 4.8 4.8 4.8.4 0 .8 0 1.2-.1.2 1.1.3 1.9.3 2.5 0 1.5-.8 2.3-1.9 2.3-.5 0-1-.2-1.3-.5.8-.1 1.4-.7 1.4-1.5 0-.9-.7-1.6-1.7-1.6s-1.9.8-1.9 2c0 1.5 1.4 2.8 3.5 2.8 2.2 0 3.6-1.6 3.6-3.9 0-.7-.1-1.6-.3-2.7 1.5-.7 2.5-2.1 2.5-3.8 0-1.9-1.4-3.5-3.3-3.7l-.4-2.7c1.5-1.3 2.4-2.8 2.4-4.5 0-1.6-.8-3-1.9-3.6zm.2 1.9c.4.3.6.8.6 1.5 0 1-.5 1.9-1.4 2.7l-.3-1.9c0-1.2.5-2.1 1.1-2.3zm-1.7 8.4c.3 0 .6 0 .9.1l.6 3.9c-.3.1-.6.1-.9.1-1.4 0-2.5-1.1-2.5-2.5 0-.8.4-1.4.9-1.7.3.1.6.1 1 0z" />
    </Svg>
  );
}

// Break — media-player pause: two solid vertical bars.
function PauseBars(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="5" width="3.6" height="14" rx="0.8" fill="currentColor" stroke="none" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="0.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// Walking (travel) — crosswalk-signal pedestrian: filled head over a striding,
// forward-leaning body with arms and legs in a walking pose.
function PedestrianWalk(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2.4}>
      <circle cx="13" cy="4" r="2" fill="currentColor" stroke="none" />
      <path d="M13 6.5 11 13" />
      <path d="M11 13 13 17.5 14.8 21" />
      <path d="M11 13 8.8 16.8 7 20.5" />
      <path d="M12 8.4 15.5 11" />
      <path d="M12.4 8 9 10.4" />
    </Svg>
  );
}

// Dining — a fork (left) and knife (right), both vertical, side by side.
function ForkKnife(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Fork: three tines over a single handle */}
      <path d="M6 3v4M8 3v4M10 3v4" />
      <path d="M6 7h4" />
      <path d="M8 7v14" />
      {/* Knife: blade tapering into a handle */}
      <path d="M16 3c-1.6 0-2.4 2-2.4 4.5S14.4 12 16 12" />
      <path d="M16 3v18" />
    </Svg>
  );
}


// ── Default icon + accent color per top-level type ─────────────────────────────
export const AGENDA_TYPE_ICONS: Record<string, AgendaIcon> = {
  travel: Plane,             // overridden by the travel sub-type when set
  activity: RollerCoaster,   // default Activity icon (theme park)
  food: ForkKnife,           // fork + knife
  hotel: Hotel,
  free: Smile,               // leisure / downtime
  break: PauseBars,          // short pause / rest stop
  meeting: MapPin,           // gather-here location (plain pin)
  instructions: ClipboardList, // default; overridden by the instruction sub-type
  general: Sparkles,         // default; overridden by the general sub-type
};

export const AGENDA_TYPE_COLORS: Record<string, string> = {
  travel: "#3b82f6",
  activity: "#8b5cf6",
  food: "#f59e0b",
  hotel: "#0d9488",
  free: "#6b7280",
  break: "#b45309",
  meeting: "#ec4899",
  instructions: "#0891b2",
  general: "#64748b",
};

// ── Sub-type icon maps ─────────────────────────────────────────────────────────
export const TRAVEL_SUBTYPE_ICONS: Record<string, AgendaIcon> = {
  bus: Bus,
  flight: Plane,
  train: TrainFront,
  rideshare: CarTaxiFront,
  subway: TramFront,
  ferry: Sailboat,
  cruise: Ship,
  walking: PedestrianWalk,
  gas_station: Fuel,
};

export const ACTIVITY_SUBTYPE_ICONS: Record<string, AgendaIcon> = {
  theme_park: RollerCoaster,
  disney: FantasyCastle,
  medieval_times: MedievalJoust,
  beach: BeachUmbrella,
  clinic: TrebleClef,
  concert: Music,
};

// Instructions sub-types (stored in the item's activity_subtype field).
export const INSTRUCTION_SUBTYPE_ICONS: Record<string, AgendaIcon> = {
  wake_up: Sun,
  lights_out: Moon,
};

// General/miscellaneous sub-types (stored in the item's activity_subtype field).
export const GENERAL_SUBTYPE_ICONS: Record<string, AgendaIcon> = {
  general: Smile,
  highlight: Star,
  weather: Umbrella,
};

// Sub-type icon map for a top-level type. Travel keeps its own map; activity,
// instructions, and general all store their sub-type in activity_subtype.
const SUBTYPE_ICON_MAPS: Record<string, Record<string, AgendaIcon>> = {
  travel: TRAVEL_SUBTYPE_ICONS,
  activity: ACTIVITY_SUBTYPE_ICONS,
  instructions: INSTRUCTION_SUBTYPE_ICONS,
  general: GENERAL_SUBTYPE_ICONS,
};

// Icon for a given (type, sub-type) — used by the sub-type picker buttons.
export function getSubtypeIcon(type: string, value: string): AgendaIcon | undefined {
  return SUBTYPE_ICON_MAPS[type]?.[value];
}

export function getAgendaTypeIcon(type: string): AgendaIcon {
  return AGENDA_TYPE_ICONS[type] || MapPin;
}

export function getAgendaTypeColor(type: string): string {
  return AGENDA_TYPE_COLORS[type] || "#6b7280";
}

// Resolve the icon shown on an item: the selected sub-type wins, otherwise the
// top-level type's default icon.
export function getItemIcon(
  type: string,
  travelMethod?: string | null,
  subtype?: string | null,
): AgendaIcon {
  if (type === "travel" && travelMethod && TRAVEL_SUBTYPE_ICONS[travelMethod]) {
    return TRAVEL_SUBTYPE_ICONS[travelMethod];
  }
  // activity, instructions, and general all carry their sub-type in activity_subtype.
  if (subtype) {
    const icon = SUBTYPE_ICON_MAPS[type]?.[subtype];
    if (icon) return icon;
  }
  return getAgendaTypeIcon(type);
}

// Feedback sentiment is still stored as the original emoji string in the DB;
// this maps each stored value to a Lucide face icon + color for display.
export const SENTIMENT_ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  "😊": { Icon: Smile, color: "#16a34a" },
  "😐": { Icon: Meh,   color: "#d97706" },
  "😞": { Icon: Frown, color: "#dc2626" },
};

export function getSentimentIcon(sentiment: string | null | undefined) {
  return SENTIMENT_ICONS[sentiment || "😐"] || SENTIMENT_ICONS["😐"];
}
