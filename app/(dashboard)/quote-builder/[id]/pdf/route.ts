import { createClient } from "@/lib/supabase/server";
import { renderQuoteHtml } from "@/lib/quotes/renderQuoteHtml";
import { renderHtmlToPdf } from "@/lib/pdf/renderHtmlToPdf";
import type { QuoteData } from "@/lib/quotes/types";

// Server-side PDF so the export is identical regardless of the user's browser.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // RLS scopes what this user may read.
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("data")
    .eq("id", id)
    .single();
  if (error || !quote) return new Response("Not found", { status: 404 });

  const data = (quote as { data: QuoteData }).data;
  const html = await renderQuoteHtml(data);
  const pdf = await renderHtmlToPdf(html);

  const slug = (data.group || "infinity-quote").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "infinity-quote";

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
