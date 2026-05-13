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
    };
  };
}

// ─── Row types ────────────────────────────────────────────────────────────────

export interface TourHostRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  initials: string | null;
  company: string | null;
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

export type AgendaItemType = "travel" | "activity" | "food" | "hotel" | "transit" | "free" | "meeting";
export type MealPayType = "group" | "stipend" | "";
export type TravelMethod = "bus" | "flight" | "subway" | "train" | "walking" | "rideshare" | "ferry" | "";

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
  created_at: string;
}

export type FeedbackSentiment = "😊" | "😐" | "😞";

export interface AgendaFeedbackRow {
  id: string;
  item_id: string;
  tour_id: string;
  role: string;
  sentiment: FeedbackSentiment;
  text: string | null;
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
  sort_order: number;
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

// ─── App-level types (with relations) ─────────────────────────────────────────

export interface TourWithRelations extends TourRow {
  tour_hosts?: TourHostRow;
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
