// Core data contract for the Quote Builder. Everything renders from QuoteData;
// it is also what the Build Quote form edits and what Export/Import JSON
// read/write — and the structure a future content-generation agent outputs.

export type TripLink = { label: string; url: string };
export type HotelItem = { name: string; addr: string; url: string };
export type HotelCity = { city: string; items: HotelItem[] };
export type ScheduleRow = { time: string; text: string };
export type QuoteDay = { date: string; rows: ScheduleRow[]; overnight?: string };

// Pricing quote sections (October 2026). Mirrors Infinity's Piktochart quote:
// inclusions, the estimated cost per traveler, add-ons, cost breakdown, hotel
// details, the student payment plan and the terms footer. Amounts are kept as
// the text the host types ("$1700", "+Varies") so nothing is reformatted.
export type AddOn = { label: string; price: string };
export type CostLine = { label: string; amount: string };
export type PaymentInstallment = { label: string; amount: string; due: string };
export type PricingSection = {
  inclusions: string[];
  estimatedCost: string;
  paymentNote: string;
  addOns: AddOn[];
  costBreakdown: CostLine[];
  hotelDetails: string;
  roomsNote: string;
  paymentPlan: PaymentInstallment[];
  paymentPlanNote: string;
  terms: string;
};

/** "pricing" = the Piktochart-style quote; absent or "trip" = the original trip info sheet. */
export type QuoteLayout = "pricing" | "trip";

export type QuoteData = {
  layout?: QuoteLayout;
  /** Slanted Infinity logo watermark behind a pricing quote. Unset = on. */
  watermark?: boolean;
  pricing?: PricingSection;
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
