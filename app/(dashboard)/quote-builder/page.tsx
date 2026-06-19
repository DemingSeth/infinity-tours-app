import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuoteRow } from "@/lib/quotes/types";
import QuoteIndexClient from "./QuoteIndexClient";

// Always render the latest list of saved quotes.
export const dynamic = "force-dynamic";

export default async function QuoteBuilderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, tour_id, data, created_by, created_at, updated_at")
    .order("updated_at", { ascending: false });

  return <QuoteIndexClient quotes={(quotes ?? []) as QuoteRow[]} currentUserId={user.id} />;
}
