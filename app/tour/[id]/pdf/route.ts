import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFilename } from "@/lib/helpers";

// Server-side itinerary PDF export.
//
// We do NOT point headless Chromium at the print route (page.goto): that page is
// auth-protected and the browser has no Supabase session, so it would redirect to
// /login and fail. Instead this Node handler fetches the print page's
// fully-server-rendered HTML over HTTP *with the caller's own cookies* (so it
// authenticates), then hands that static HTML to Chromium via setContent(). This
// reuses the real itinerary components (AgendaRoleView + its visibility filter)
// exactly as Next renders them, with no auth or absolute-URL problems for the
// browser. agenda/banner images are already absolute Supabase URLs; the relative
// logo and the _next CSS resolve via an injected <base href>.
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
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 816, height: 1056, deviceScaleFactor: 2 },
    executablePath,
    headless: true,
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const debug = new URL(req.url).searchParams.get("debug") === "1";

  // Authn: only an authenticated tour host who can read this tour (RLS).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
  try {
    const { data: tour } = await supabase.from("tours").select("name").eq("id", id).single();
    if (!tour) return new Response("Not found", { status: 404 });

    // Same-deployment origin for the internal print-page fetch and asset base.
    const h = await headers();
    const hostHeader = h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? (hostHeader.startsWith("localhost") ? "http" : "https");
    const origin = `${proto}://${hostHeader}`;

    // Fetch the server-rendered print page WITH the caller's cookies so it
    // authenticates (server-to-server; the browser is never asked to log in).
    const printRes = await fetch(`${origin}/tour/${id}/print`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
      // Don't silently follow an auth redirect to /login and print that page —
      // surface it as an error instead.
      redirect: "manual",
    });
    if (!printRes.ok) {
      const location = printRes.headers.get("location");
      throw new Error(
        `Print page fetch failed (${printRes.status} ${printRes.statusText})` +
        (location ? ` → redirected to ${location} (auth not forwarded?)` : "") +
        ` at ${origin}/tour/${id}/print`,
      );
    }

    let html = await printRes.text();
    // <base> so the relative logo (/infinity-logo.png) and the _next CSS bundle
    // resolve against the deployment; strip <script> so nothing tries to hydrate.
    html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}<base href="${origin}/">`);
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 50_000 });
    // setContent resolves on DOM load; wait for fonts + every image (Google Fonts,
    // Supabase photos, logo, _next CSS) to settle before printing.
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30_000 }).catch(() => {});
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
    // Always log to the server (Vercel function logs).
    console.error("Itinerary PDF generation failed:", err);
    const detail = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
    // Surface the real error in the body in dev, or with ?debug=1 (host-only route).
    const expose = process.env.NODE_ENV !== "production" || debug;
    return new Response(expose ? `PDF generation failed:\n${detail}` : "PDF generation failed", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  } finally {
    if (browser) await browser.close();
  }
}
