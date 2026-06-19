// Core data contract for the Quote Builder. Everything renders from QuoteData;
// it is also what the Build Quote form edits and what Export/Import JSON
// read/write — and the structure a future content-generation agent outputs.

export type TripLink = { label: string; url: string };
export type HotelItem = { name: string; addr: string; url: string };
export type HotelCity = { city: string; items: HotelItem[] };
export type ScheduleRow = { time: string; text: string };
export type QuoteDay = { date: string; rows: ScheduleRow[]; overnight?: string };

export type QuoteData = {
  group: string;
  destination: string;
  year: string;
  hostName: string;
  hostPhone: string;
  embassyName: string;
  embassyPhone: string;
  tripLinks: TripLink[];
  roomingLink: TripLink;
  activitiesLink: TripLink;
  hotels: HotelCity[];
  days: QuoteDay[];
  heroPhotoUrl: string;
};

// Persistence shape: the `quotes` table row (see supabase/20260618_create_quotes.sql).
// Defined standalone so it does not require editing lib/types.ts's Database type.
export type QuoteRow = {
  id: string;
  tour_id: string | null;
  data: QuoteData;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
