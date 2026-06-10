"use client";

import {
  Plane, Bus, TrainFront, CarTaxiFront, TramFront, Sailboat, Ship, Footprints,
  RollerCoaster, Music, Hotel, Armchair, Coffee, MapPin,
  Smile, Meh, Frown, type LucideIcon,
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
function Svg({ size = 24, strokeWidth = 2, color = "currentColor", style, className, children }:
  IconProps & { children: React.ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
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
      {/* Outline: left tower → wall → central spire tower → wall → right tower */}
      <path d="M3 21 L3 9 L4 9 L4 10 L6 10 L6 9 L7 9 L7 13 L9 13 L9 8 L12 3 L15 8 L15 13 L17 13 L17 9 L18 9 L18 10 L20 10 L20 9 L21 9 L21 21 Z" />
      {/* Arched gate */}
      <path d="M10.5 21 L10.5 17.5 Q12 16 13.5 17.5 L13.5 21" />
      {/* Pennant on the central spire */}
      <path d="M12 3 L12 1.6 L13.7 2.2 L12 2.8" />
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

// Clinic — treble clef.
function TrebleClef(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 3.5c-2.8 1-4.5 3.3-4.5 6.2 0 4.6 5 6.4 5 10.8a2.8 2.8 0 1 1-2.6-2.8" />
      <path d="M11.2 9.2c3.6-.8 5.8 1.3 5.8 3.8a3.3 3.3 0 0 1-3.3 3.3" />
    </Svg>
  );
}

// Dining — plate flanked by a fork and knife (classic dining silhouette).
function PlateUtensils(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13" r="5" />
      <path d="M4 3v4a1.6 1.6 0 0 0 3.2 0V3" />
      <path d="M5.6 7v14" />
      <path d="M20 3c-1.5 0-2.3 1.9-2.3 4.1 0 1.6.9 2.4 2.3 2.4V21" />
    </Svg>
  );
}

// Meeting Point — location pin with a group of people ("gather here").
function MeetingPin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="9.5" cy="9.2" r="1.4" />
      <circle cx="14.5" cy="9.2" r="1.4" />
      <path d="M8 13.2a4 4 0 0 1 8 0" />
    </Svg>
  );
}

// ── Default icon + accent color per top-level type ─────────────────────────────
export const AGENDA_TYPE_ICONS: Record<string, AgendaIcon> = {
  travel: Plane,           // overridden by the travel sub-type when set
  activity: RollerCoaster, // default Activity icon (theme park)
  food: PlateUtensils,     // plate with fork + knife
  hotel: Hotel,
  free: Armchair,          // leisure / downtime
  break: Coffee,           // short pause / rest stop
  meeting: MeetingPin,     // gather-here location
};

export const AGENDA_TYPE_COLORS: Record<string, string> = {
  travel: "#3b82f6",
  activity: "#8b5cf6",
  food: "#f59e0b",
  hotel: "#0d9488",
  free: "#6b7280",
  break: "#b45309",
  meeting: "#ec4899",
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
  walking: Footprints,
};

export const ACTIVITY_SUBTYPE_ICONS: Record<string, AgendaIcon> = {
  theme_park: RollerCoaster,
  disney: FantasyCastle,
  medieval_times: MedievalJoust,
  beach: BeachUmbrella,
  clinic: TrebleClef,
  concert: Music,
};

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
  if (type === "activity" && subtype && ACTIVITY_SUBTYPE_ICONS[subtype]) {
    return ACTIVITY_SUBTYPE_ICONS[subtype];
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
