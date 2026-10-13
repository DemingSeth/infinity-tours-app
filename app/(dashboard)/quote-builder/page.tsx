import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canUseQuoteBuilder } from "@/lib/roles";
import type { QuoteRow } from "@/lib/quotes/types";
import QuoteIndexClient from "./QuoteIndexClient";

// Always render the latest list of saved quotes.
export const dynamic = "force-dynamic";

export default async function QuoteBuilderPage() {
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

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, tour_id, data, created_by, created_at, updated_at")
    .order("updated_at", { ascending: false });

  return <QuoteIndexClient quotes={(quotes ?? []) as QuoteRow[]} currentUserId={user.id} />;
}
