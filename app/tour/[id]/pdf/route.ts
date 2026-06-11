import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFilename } from "@/lib/helpers";

// Server-side itinerary PDF export. Renders the dedicated print route with
// headless Chromium and streams the result back as a one-click download.
//
// Chromium runs without the caller's session, so we forward the request's auth
// cookies onto the page — the print route then renders as the authenticated host
// (RLS-scoped). No service-role key or signed token needed.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Vercel serverless → @sparticuz/chromium; local dev → a system Chrome.
async function launchBrowser() {
  const puppeteer = (await import("puppeteer-core")).default;
  const onServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (onServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1100, height: 1400, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1100, height: 1400, deviceScaleFactor: 2 },
    executablePath,
    headless: true,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Authn/authz: only an authenticated tour host who can read this tour (RLS)
  // may export it. Hosts/admins reach this route from the host editing view.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: tour } = await supabase.from("tours").select("name").eq("id", id).single();
  if (!tour) return new Response("Not found", { status: 404 });

  // Same-deployment absolute URL for the print page.
  const h = await headers();
  const hostHeader = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (hostHeader.startsWith("localhost") ? "http" : "https");
  const printUrl = `${proto}://${hostHeader}/tour/${id}/print`;

  // Forward the caller's cookies so the print page authenticates as this host.
  const cookieStore = await cookies();
  const cookieParams = cookieStore.getAll().map(c => ({ name: c.name, value: c.value, url: printUrl }));

  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    if (cookieParams.length) await page.setCookie(...cookieParams);

    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 50_000 });
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
    });

    const filename = `${sanitizeFilename(tour.name)}-Itinerary.pdf`;
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Itinerary PDF generation failed:", err instanceof Error ? err.message : err);
    return new Response("PDF generation failed", { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
