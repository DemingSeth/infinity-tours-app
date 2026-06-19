import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import type { PDFOptions } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

// Generic, quote-agnostic engine: take an HTML document string and return a
// PDF Buffer rendered by headless Chromium. Identical output regardless of the
// caller's browser, since the render happens server-side with printBackground.
//
// Dual executablePath: locally we drive an installed Chrome/Chromium; on
// Vercel/Lambda we download the Chromium binary from a remote pack at runtime
// (chromium-min ships no binary, so nothing needs to be traced into the function).

const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Remote Chromium pack matching @sparticuz/chromium-min@149.0.0 (Chromium 149).
const REMOTE_CHROMIUM_PACK =
  "https://abqiaxmnasjyqxmgzbqn.supabase.co/storage/v1/object/public/Chromium%20Bucket/chromium-v149.0.0-pack.x64.tar";

// Common locations for a locally installed Chrome/Chromium, plus env overrides.
const LOCAL_CANDIDATES: string[] = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.LOCAL_CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter((p): p is string => !!p);

function localExecutablePath(): string | undefined {
  return LOCAL_CANDIDATES.find((p) => existsSync(p));
}

export async function renderHtmlToPdf(html: string, opts: Partial<PDFOptions> = {}): Promise<Buffer> {
  const browser = isServerless
    ? await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(REMOTE_CHROMIUM_PACK),
        // chromium-min@149 ships a headless-shell build; this is the headless
        // mode it documents (it does not expose a `headless` field).
        headless: "shell",
      })
    : await (async () => {
        const executablePath = localExecutablePath();
        if (!executablePath) {
          throw new Error(
            "No local Chrome/Chromium found. Install Google Chrome or set PUPPETEER_EXECUTABLE_PATH to its binary."
          );
        }
        return puppeteer.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
      })();

  try {
    const page = await browser.newPage();
    // puppeteer-core@25's setContent type excludes networkidle*; "load" waits
    // for the stylesheet/font <link>s, and document.fonts.ready below
    // guarantees glyphs are ready before we paginate.
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    // Page size is caller-controlled: explicit width/height wins, otherwise a
    // paper `format` (defaulting to Letter). Keeping this generic so any caller
    // can request a different size.
    const { format, width, height, ...restOpts } = opts;
    const sizing =
      width !== undefined || height !== undefined ? { width, height } : { format: format ?? "Letter" };
    const pdf = await page.pdf({
      ...sizing,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      ...restOpts,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
