import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canUseQuoteBuilder } from "@/lib/roles";
import type { QuoteRow } from "@/lib/quotes/types";
import QuoteEditorClient from "./QuoteEditorClient";

export const dynamic = "force-dynamic";

export default async function QuoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Quote Builder: active admins only (canUseQuoteBuilder); everyone else is
  // sent back to the dashboard.
  const { data: viewerHost } = await supabase
    .from("tour_hosts")
    .select("role, is_active")
    .eq("id", user.id)
    .single();
  if (!canUseQuoteBuilder(viewerHost)) redirect("/dashboard");

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, tour_id, data, created_by, created_at, updated_at")
    .eq("id", id)
    .single();

  if (!quote) redirect("/quote-builder");

  const row = quote as QuoteRow;
  // A linked itinerary may have been deleted since (tour_id is then null).
  return <QuoteEditorClient quoteId={row.id} initialData={row.data} tourId={row.tour_id} currentUserId={user.id} />;
}
