import { createElement } from "react";
import QuoteDocument from "@/components/quotes/QuoteDocument";
import type { QuoteData } from "./types";

// Render the live QuoteDocument to a standalone HTML document for server-side
// PDF generation. The component's inline styles carry over verbatim, so the
// output matches the on-screen document; we only add the font <link>s (the
// app normally provides these via next/font) and the print page rule.
//
// QuoteDocument's font stacks reference the next/font CSS variables first and
// fall back to the literal family names ('Oswald' / 'Mulish' / 'Pinyon
// Script'), which the Google Fonts <link> below resolves.
export async function renderQuoteHtml(data: QuoteData): Promise<string> {
  // Dynamic import: Next/Turbopack forbids a static `react-dom/server` import
  // anywhere in the App Router module graph. This only runs in the nodejs PDF
  // route, never on the client.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const body = renderToStaticMarkup(createElement(QuoteDocument, { data }));
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=816" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Mulish:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Pinyon+Script&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { margin: 0; }
</style>
</head>
<body>${body}
<!-- Neutralize QuoteDocument's on-screen print page-simulation. Its inline
     style carries a @media print { @page { size: letter portrait } } rule that,
     during server PDF render, paginates the document at Letter height and clips
     content past ~6 days. This trailing rule wins the @page cascade (later in
     source order) so the page flows at its true full height; page.pdf's
     width/height define the actual page box. -->
<style>@media print { @page { size: auto; margin: 0; } }</style>
</body>
</html>`;
}
