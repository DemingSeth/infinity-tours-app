"use client";

import {
  Plane, Drama, UtensilsCrossed, Hotel, TrainFront, Clock, ClipboardList,
  MapPin, Smile, Meh, Frown, type LucideIcon,
} from "lucide-react";

// Lucide icon for each agenda item type (replaces the old emoji glyphs).
export const AGENDA_TYPE_ICONS: Record<string, LucideIcon> = {
  travel: Plane,
  activity: Drama,
  food: UtensilsCrossed,
  hotel: Hotel,
  transit: TrainFront,
  free: Clock,
  meeting: ClipboardList,
};

// Accent color per type, shared by the type badge and the form's type picker.
export const AGENDA_TYPE_COLORS: Record<string, string> = {
  travel: "#3b82f6",
  activity: "#8b5cf6",
  food: "#f59e0b",
  hotel: "#0d9488",
  transit: "#06b6d4",
  free: "#6b7280",
  meeting: "#ec4899",
};

export function getAgendaTypeIcon(type: string): LucideIcon {
  return AGENDA_TYPE_ICONS[type] || MapPin;
}

export function getAgendaTypeColor(type: string): string {
  return AGENDA_TYPE_COLORS[type] || "#6b7280";
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
