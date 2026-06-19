import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuoteRow } from "@/lib/quotes/types";
import QuoteEditorClient from "./QuoteEditorClient";

export const dynamic = "force-dynamic";

export default async function QuoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, tour_id, data, created_by, created_at, updated_at")
    .eq("id", id)
    .single();

  if (!quote) redirect("/quote-builder");

  const row = quote as QuoteRow;
  return <QuoteEditorClient quoteId={row.id} initialData={row.data} />;
}
