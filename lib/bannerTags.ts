// Banner library place matching (October 2026, Amy).
//
// Destinations and tags are typed freely, so the same place shows up as
// "New York, NY", "New York City", "Brooklyn", "Washington D.C.", or the typo
// "Anahiem". Everything is compared on a forgiving key: lowercase, punctuation
// dropped, a trailing "city" dropped, and a few metro areas folded together.
// A photo is suggested for a tour when one of its tags lands on the same key as
// the tour's destination, or when a tag (or a metro alias of it) appears in the
// tour's name or destination text, so "Rigby Choir Disneyland" finds Anaheim
// photos even when the destination field says something else.

import type { BannerImageLibraryRow } from "@/lib/types";

const METRO_ALIASES: Record<string, string> = {
  "new york": "nyc", "nyc": "nyc", "brooklyn": "nyc", "manhattan": "nyc", "queens": "nyc", "broadway": "nyc",
  "washington": "dc", "washington dc": "dc", "dc": "dc",
  "anaheim": "anaheim", "anahiem": "anaheim", "anaheim california": "anaheim",
  "disneyland": "anaheim", "disney california adventure": "anaheim",
  "los angeles": "anaheim", "southern california": "anaheim",
  "orlando": "orlando", "disney world": "orlando", "walt disney world": "orlando",
  "salt lake": "slc", "slc": "slc",
};

/** Lowercase words only: "Washington D.C." -> "washington dc". */
export function normalizePlace(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/\./g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** The matching key for one place string (city part only, aliases folded). */
export function placeKey(s: string | null | undefined): string {
  const city = normalizePlace((s ?? "").split(",")[0]).replace(/ city$/, "").trim();
  return METRO_ALIASES[city] ?? city;
}

/** The photo's tags, falling back to its legacy single destination. */
export function imageTags(img: Pick<BannerImageLibraryRow, "tags" | "destination">): string[] {
  const tags = (img.tags ?? []).map(t => t.trim()).filter(Boolean);
  if (tags.length) return tags;
  return img.destination?.trim() ? [img.destination.trim()] : [];
}

/** Whole-word containment on normalized text. */
function containsPhrase(text: string, phrase: string): boolean {
  if (!text || !phrase) return false;
  return ` ${text} `.includes(` ${phrase} `);
}

/** Build a matcher for one tour; call it per photo. */
export function tourPhotoMatcher(tourDestination: string | null | undefined, tourName: string | null | undefined) {
  const destKey = placeKey(tourDestination);
  const text = `${normalizePlace(tourName)} ${normalizePlace(tourDestination)}`.trim();

  // Every place key the tour mentions: its destination, plus any metro alias
  // phrase that appears anywhere in its name or destination.
  const keys = new Set<string>();
  if (destKey) keys.add(destKey);
  for (const [phrase, key] of Object.entries(METRO_ALIASES)) {
    if (phrase.length >= 3 && containsPhrase(text, phrase)) keys.add(key);
  }

  return (img: Pick<BannerImageLibraryRow, "tags" | "destination">): boolean => {
    if (!text) return false;
    return imageTags(img).some(tag => {
      const key = placeKey(tag);
      if (key && keys.has(key)) return true;
      // The tag's city named anywhere in the tour text, so a destination typed
      // without a comma ("Dallas Texas") still finds a "Dallas, TX" tag.
      const city = normalizePlace(tag.split(",")[0]).replace(/ city$/, "").trim();
      if (city.length >= 4 && containsPhrase(text, city)) return true;
      // A tag spelled out in the tour's name or destination ("Disneyland",
      // "Theme Park", "Oregon Coast"). Tags under four letters ("LA", "NY")
      // are too loose for this and only match through their key above.
      const phrase = normalizePlace(tag);
      return phrase.length >= 4 && containsPhrase(text, phrase);
    });
  };
}

/** Free-text search across label, tags and destination. Every word must hit. */
export function photoMatchesSearch(img: BannerImageLibraryRow, query: string): boolean {
  const words = normalizePlace(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const hay = normalizePlace([img.label, img.destination, ...(img.tags ?? [])].join(" "));
  return words.every(w => hay.includes(w));
}
