export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ─── Database types ────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      tour_hosts: {
        Row: TourHostRow;
        Insert: Omit<TourHostRow, "created_at">;
        Update: Partial<Omit<TourHostRow, "id">>;
        Relationships: [];
      };
      tours: {
        Row: TourRow;
        Insert: Omit<TourRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<TourRow, "id" | "created_at">>;
        Relationships: [];
      };
      agenda_days: {
        Row: AgendaDayRow;
        Insert: Omit<AgendaDayRow, "id">;
        Update: Partial<Omit<AgendaDayRow, "id">>;
        Relationships: [];
      };
      agenda_items: {
        Row: AgendaItemRow;
        Insert: Omit<AgendaItemRow, "id" | "created_at">;
        Update: Partial<Omit<AgendaItemRow, "id" | "created_at">>;
        Relationships: [];
      };
      agenda_feedback: {
        Row: AgendaFeedbackRow;
        Insert: Omit<AgendaFeedbackRow, "id" | "submitted_at">;
        Update: Partial<Omit<AgendaFeedbackRow, "id">>;
        Relationships: [];
      };
      tour_members: {
        Row: TourMemberRow;
        Insert: Omit<TourMemberRow, "id">;
        Update: Partial<Omit<TourMemberRow, "id">>;
        Relationships: [];
      };
      participant_groups: {
        Row: ParticipantGroupRow;
        Insert: Omit<ParticipantGroupRow, "id" | "created_at">;
        Update: Partial<Omit<ParticipantGroupRow, "id" | "created_at">>;
        Relationships: [];
      };
      participant_group_members: {
        Row: ParticipantGroupMemberRow;
        Insert: ParticipantGroupMemberRow;
        Update: Partial<ParticipantGroupMemberRow>;
        Relationships: [];
      };
      vendors: {
        Row: VendorRow;
        Insert: Omit<VendorRow, "id" | "created_at">;
        Update: Partial<Omit<VendorRow, "id" | "created_at">>;
        Relationships: [];
      };
      post_trip: {
        Row: PostTripRow;
        Insert: Omit<PostTripRow, "id">;
        Update: Partial<Omit<PostTripRow, "id">>;
        Relationships: [];
      };
      post_trip_reviews: {
        Row: PostTripReviewRow;
        Insert: Omit<PostTripReviewRow, "id" | "submitted_at">;
        Update: Partial<Omit<PostTripReviewRow, "id">>;
        Relationships: [];
      };
    };
  };
}

// ─── Row types ────────────────────────────────────────────────────────────────

export type HostRole = "host" | "admin";

export interface TourHostRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  initials: string | null;
  company: string | null;
  role: HostRole;
  created_at: string;
}

export type TourStatus = "bid" | "committed" | "in-progress" | "closed";
export type TransportType = "bus" | "flight" | "both";

export interface RoomConfig {
  boysPerRoom: number;
  girlsPerRoom: number;
}

export interface AccessCodes {
  coordinator: string;
  teacher: string;
  driver: string;
  student: string;
  chaperone?: string;
}

export interface TourRow {
  id: string;
  tour_host_id: string;
  name: string;
  school: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  planning_tour_host: string | null;
  traveling_tour_host: string | null;
  destination: string | null;
  alt_destination: string | null;
  dates: string | null;
  start_date: string | null;
  end_date: string | null;
  date_flexible: boolean;
  status: TourStatus;
  transport_type: TransportType;
  bus_capacity: number;
  company_pct: number;
  room_config: RoomConfig;
  student_count: number;
  boys_count: number;
  girls_count: number;
  activities: string[];
  notes: string | null;
  access_codes: AccessCodes;
  // Optional banner photo shown behind the itinerary header tile. Null → solid navy.
  banner_image_url: string | null;
  // Focal point (percent across/down) applied as object-position when the banner
  // is cropped into the header tile. Default 50/50 = centered.
  banner_focus_x: number;
  banner_focus_y: number;
  // Participant personas enabled for this tour (drives preview buttons, access
  // codes, and label usage). persona_labels holds per-persona label overrides.
  active_personas: string[];
  persona_labels: Record<string, string>;
  // When true, students/guests are invited to leave whole-tour feedback (a card
  // at the bottom of the itinerary, plus an end-of-tour banner). Host-toggleable.
  general_feedback_enabled: boolean;
  // Bus company name shown in Trip Information (replaces parsing the bus item title).
  bus_company: string | null;
  // Host-only bus driver contact. Never exposed to participants / the public RPC.
  bus_driver_contact: { name: string | null; phone: string | null } | null;
  // Manual per-persona participant count overrides, e.g. { student: 26 }. When a
  // key is present, Trip Information uses it instead of the roster-derived count.
  participant_counts: Record<string, number>;
  // Free-text override for the Participants row in Trip Information. When non-empty
  // it replaces the structured per-persona breakdown + total (host-controlled).
  participants_display_override: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgendaDayRow {
  id: string;
  tour_id: string;
  day_number: number;
  date: string;
  collapsed: boolean;
  sort_order: number;
}

export type AgendaItemType = "travel" | "activity" | "food" | "hotel" | "free" | "break" | "meeting" | "instructions" | "general";
export type MealPayType = "group" | "stipend" | "disney_dining" | "";
export type TravelMethod = "bus" | "flight" | "subway" | "train" | "walking" | "rideshare" | "ferry" | "cruise" | "";

export interface ItemVisibility {
  coordinator: Record<string, boolean>;
  teacher: Record<string, boolean>;
  driver: Record<string, boolean>;
  student: Record<string, boolean>;
}

export interface AgendaItemRow {
  id: string;
  day_id: string;
  tour_id: string;
  sort_order: number;
  time: string | null;
  type: AgendaItemType;
  // For travel items the sub-type is stored in travel_method; for activity
  // items it is stored here (theme_park, disney, medieval_times, beach, etc.).
  activity_subtype: string | null;
  title: string;
  detail: string | null;
  public_note: string | null;
  address: string | null;
  map_link: string | null;
  website: string | null;
  travel_method: TravelMethod | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  cost: number;
  cost_paid: boolean;
  driver_note: string | null;
  internal_note: string | null;
  meal_pay_type: MealPayType | null;
  stipend_amount: number | null;
  item_visibility: ItemVisibility | null;
  // Per-persona show/hide for this item (tour_host/teacher/student/chaperone/bus_driver → bool).
  persona_visibility: Record<string, boolean>;
  image_urls: string[];
  // Confirmation documents (PDF or image) linked to this itinerary item.
  // Stored in the shared agenda-images bucket; display-layer "Confirmations".
  confirmation_urls: string[];
  // When true, the host has intentionally marked this item as not needing a
  // confirmation, so it is not flagged as "Unconfirmed" or counted in the badge.
  // FUTURE PHASE: auto-default this by item type/sub-type — confirmation-bearing
  // travel/lodging (Flight, Hotel, Bus, Cruise, Ferry) → false (flag for action),
  // while Meeting Point, Break, Walking, and Free Time → true (no confirmation
  // expected). Not implemented yet; the data model already supports it.
  confirmation_not_required: boolean;
  // When true, students/guests see the per-item feedback control on the shared
  // itinerary. Defaults on for Activity items (see isActivityType); host-overridable.
  feedback_enabled: boolean;
  created_at: string;
}

export type FeedbackSentiment = "😊" | "😐" | "😞";

export interface AgendaFeedbackRow {
  id: string;
  // Null = whole-tour ("general") feedback; otherwise the rated itinerary item.
  item_id: string | null;
  tour_id: string;
  role: string;
  sentiment: FeedbackSentiment;
  text: string | null;
  // Optional "What was the highlight?" — only used by general tour feedback.
  highlight?: string | null;
  submitted_at: string;
}

export type MemberType = "student" | "chaperone" | "tour-host" | "teacher" | "driver";

export interface TourMemberRow {
  id: string;
  tour_id: string;
  name: string;
  type: MemberType;
  gender: string | null;
  waiver: boolean;
  notes: string | null;
  // Structured roster fields (previously crammed into `notes`).
  dietary_restrictions: string | null;
  allergies: string | null;
  // Free-form extra attributes (label → value), e.g. { "T-Shirt": "L" }.
  custom_attributes: Record<string, string>;
  sort_order: number;
}

// ─── Participant grouping (foundation; no grouping UI in roster v1) ────────────
// A participant can belong to one or more groups. A group has a type — chaperone
// today, bus / rooming later — and may be led by a chaperone (a tour_member).
export type ParticipantGroupType = "chaperone" | "bus" | "rooming" | "other";

export interface ParticipantGroupRow {
  id: string;
  tour_id: string;
  type: ParticipantGroupType;
  name: string;
  chaperone_member_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface ParticipantGroupMemberRow {
  group_id: string;
  member_id: string;
}

export interface VendorRow {
  id: string;
  name: string;
  category: string | null;
  rating: number;
  flag: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PostTripRow {
  id: string;
  tour_id: string;
  notes: string | null;
  school_feedback: string | null;
  what_worked: string | null;
  what_to_improve: string | null;
  do_next_time: string | null;
  do_not_repeat: string | null;
  completed: boolean;
  updated_at: string;
}

// Tour-host-submitted post-trip survey (separate from the free-form `post_trip`
// debrief notes). One row per tour; resubmitting updates the existing row.
export interface PostTripReviewRow {
  id: string;
  tour_id: string;
  host_id: string | null;
  overall_rating: number | null;
  went_well: string | null;
  to_improve: string | null;
  vendor_notes: string | null;
  submitted_at: string;
}

// Curated banner image available to tour hosts (managed by admins).
export interface BannerImageLibraryRow {
  id: string;
  url: string;
  label: string;
  destination: string | null;
  uploaded_by: string | null;
  created_at: string;
}

// Resolved "Trip Information" summary shown at the top of the itinerary view.
export interface TripInfo {
  teacherName: string | null;
  teacherEmail: string | null;
  tourHostName: string | null;
  tourHostPhone: string | null;
  // Per-persona participant counts using the tour's custom labels. `key` is the
  // persona key (e.g. "student") so the host can edit each count inline.
  participants: { key: string; label: string; count: number }[];
  totalParticipants: number;
  // Host free-text override for the Participants row. Non-empty → render verbatim
  // in place of the breakdown + total. Null/empty → use the breakdown.
  participantsOverride: string | null;
  departure: string | null; // raw start date
  returnDate: string | null; // raw end date
  flightName: string | null;
  flightAddress: string | null;
  hasFlight: boolean; // whether a flight travel item exists on the itinerary
  hotelName: string | null;
  hotelAddress: string | null;
  hotelRooms: string | null;
  busCompany: string | null;
  // Existing dispatch contact, derived from the bus itinerary item (preserved).
  busContactName: string | null;
  busContactPhone: string | null;
  // Host-only bus driver contact (from the tour record). Null in participant
  // payloads; TripInformation also hard-gates it on isHost.
  busDriverName: string | null;
  busDriverPhone: string | null;
  busCapacity: number | null;
  hasBus: boolean; // whether a bus travel item exists on the itinerary
  // Read-only confirmation links by type, used for the participant view link.
  // Authenticated host views fetch live (mutable) rows separately.
  confirmations: { type: string; label: string | null; file_url: string }[];
}

// A confirmation document (flight/hotel/bus/other) uploaded for a tour.
export interface TourConfirmationRow {
  id: string;
  tour_id: string;
  type: string;
  label: string | null;
  file_url: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

// ─── App-level types (with relations) ─────────────────────────────────────────

export interface TourWithRelations extends TourRow {
  tour_hosts?: TourHostRow;
}

// Lightweight tour shape used by the dashboard pipeline + overview command center:
// the tour plus just the host fields and member fields those views render.
export interface TourWithHostAndMembers extends TourRow {
  tour_hosts: Pick<TourHostRow, "id" | "name" | "initials"> | null;
  tour_members: Pick<TourMemberRow, "id" | "type" | "waiver">[];
}

export interface AgendaDayWithItems extends AgendaDayRow {
  agenda_items: AgendaItemWithFeedback[];
}

export interface AgendaItemWithFeedback extends AgendaItemRow {
  agenda_feedback: AgendaFeedbackRow[];
}

// ─── Role types ────────────────────────────────────────────────────────────────

export type Role = "coordinator" | "teacher" | "driver" | "student";

export interface RoleInfo {
  label: string;
  color: string;
  bg: string;
  rank: number;
}
