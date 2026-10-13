import { getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { canUseQuoteBuilder } from "@/lib/roles";
import { parseQuotePdf, type PdfTextItem } from "@/lib/quotes/parseQuotePdf";
import { blankQuote, blankPricing } from "@/lib/quotes/sampleData";
import { tourPhotoMatcher } from "@/lib/bannerTags";
import type { QuoteData } from "@/lib/quotes/types";
import type { BannerImageLibraryRow } from "@/lib/types";

// Create a pricing quote from an uploaded quote PDF, such as a Piktochart
// export (October 2026). The PDF is read here and never stored. The new quote
// opens in the editor for the host to check before it is used.
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  // Same access as the rest of the Quote Builder (active admins). A Route
  // Handler does not run the dashboard layout, so it checks is_active itself.
  const { data: viewer } = await supabase.from("tour_hosts").select("role, is_active").eq("id", user.id).single();
  if (!canUseQuoteBuilder(viewer)) {
    return Response.json({ error: "The Quote Page is not available on your account." }, { status: 403 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch { /* handled below */ }
  if (!file) return Response.json({ error: "No file was received." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "That PDF is over 15MB. Export a smaller copy and try again." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
    return Response.json({ error: "That file is not a PDF." }, { status: 400 });
  }

  const items: PdfTextItem[] = [];
  try {
    const pdf = await getDocumentProxy(bytes);
    // Quotes are one page; read at most three so an odd upload stays quick.
    for (let n = 1; n <= Math.min(pdf.numPages, 3); n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      // Later pages sit below earlier ones so the layout reads top to bottom.
      const offset = (n - 1) * -10000;
      for (const it of content.items as { str?: string; transform?: number[]; width?: number; height?: number }[]) {
        if (!it.str || !it.transform) continue;
        items.push({ str: it.str, x: it.transform[4]!, y: it.transform[5]! + offset, w: it.width ?? 0, h: it.height ?? 0 });
      }
    }
  } catch (e) {
    console.error("[quote import] could not read PDF", e);
    return Response.json({ error: "That PDF could not be read. Try exporting it again from Piktochart." }, { status: 422 });
  }

  if (items.filter(i => i.str.trim()).length < 5) {
    return Response.json({ error: "No readable text was found in that PDF. A scanned or image-only PDF cannot be imported; enter that quote by hand." }, { status: 422 });
  }

  const { data: parsed, unplaced } = parseQuotePdf(items);
  const base = blankQuote();
  const data: QuoteData = {
    ...base,
    layout: "pricing",
    group: parsed.group || base.group,
    destination: parsed.destination || base.destination,
    year: parsed.year || base.year,
    days: parsed.days.length ? parsed.days : base.days,
    pricing: { ...blankPricing(), ...parsed.pricing },
  };

  // Header photo: the first Banner Library photo tagged for this destination.
  const { data: library } = await supabase.from("banner_image_library").select("url, tags, destination").order("created_at", { ascending: false });
  const match = tourPhotoMatcher(data.destination, data.group);
  const photo = ((library ?? []) as Pick<BannerImageLibraryRow, "url" | "tags" | "destination">[]).find(img => match(img));
  if (photo) data.heroPhotoUrl = photo.url;

  const { data: row, error } = await supabase
    .from("quotes")
    .insert({ data, created_by: user.id })
    .select("id")
    .single();
  if (error || !row) {
    return Response.json({ error: `The quote could not be saved: ${error?.message ?? "no row created"}` }, { status: 500 });
  }

  return Response.json({ id: row.id, unplaced });
}
