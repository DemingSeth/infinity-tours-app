# Handoff: Infinity Tours — Quote / Itinerary Template

## Overview
A single-page, print-ready tour quote/itinerary for Infinity Tours + Events. It renders a
US-Letter (8.5"×11") branded document from one structured data object: a hero photo band,
a left info sidebar (trip links, embassy, hotels, activities, host), and a two-column
day-by-day schedule with inline hyperlinks, plus a full-width brand footer. It also includes
a **"Build Quote" editing panel** (a form) that edits the document live and exports/imports
the data as JSON.

The goal is to produce **hundreds of these per year** with identical quality and brand
consistency — the layout/brand is fixed in code, and only the content data changes.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype of
the intended look and behavior, **not production code to copy directly**. The task is to
**recreate this design natively inside the existing Infinity Tours web app**, using its
established framework, component patterns, styling approach, data layer, and auth. Treat the
HTML as the source of truth for *visual design, layout, tokens, and the data model*, and
re-implement it idiomatically (e.g. as a React route/component if the app is React/Next).

> Note on the prototype runtime: the `.dc.html` file rides on a small prototyping runtime and
> uses inline-style markup with `{{ }}` data holes and `<sc-for>`/`<sc-if>` loops. Ignore those
> runtime specifics — they are just how the prototype binds data. In the real app, render the
> same markup with the app's own templating (JSX, etc.). All styling is **inline styles with
> literal values**, so the design tokens transfer 1:1.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and layout. Recreate pixel-accurately
using the codebase's existing libraries/patterns. Exact values are documented below.

---

## The Data Model (the core contract)
Everything renders from this one object. This is also what the form edits and what
Export/Import read/write — and it is the structure a future content-generation agent should
output. **Get this right and the rest is presentation.**

```ts
type QuoteData = {
  group: string;          // e.g. "Cantorum Chamber Choir"
  destination: string;    // e.g. "United Kingdom"
  year: string;           // e.g. "2022"
  hostName: string;
  hostPhone: string;
  embassyName: string;
  embassyPhone: string;
  tripLinks: { label: string; url: string }[];     // "Additional Trip Details" links
  roomingLink: { label: string; url: string };
  activitiesLink: { label: string; url: string };
  hotels: {
    city: string;                                   // shown UPPERCASE, e.g. "STRATFORD"
    items: { name: string; addr: string; url: string }[];
  }[];
  days: {
    date: string;                                   // e.g. "Wed. June 29"
    rows: { time: string; text: string }[];         // time may be "" ; text supports links (below)
    overnight?: string;                             // "" / omitted = no Overnight row
  }[];
  // Recommended addition when porting (see Backend wiring): heroPhotoUrl: string
};
```

### Inline links inside schedule text
`row.text` and `day.overnight` are plain strings that may embed Markdown-style links:

```
"Optional Activity: [Shakespeare Richard III](https://www.shakespeare.org.uk/...)"
"Stratford-upon-Avon - [DoubleTree](https://...) and [Swans Nest Hotel](https://...)"
```

Parse them into render segments with this regex and alternate plain text / `<a>`:

```js
const re = /\[([^\]]+)\]\(([^)]*)\)/g;   // [label](url)  →  <a href="url">label</a>
```

Plain stretches render as italic body text; matched links render as italic underlined teal
anchors (`target="_blank"`). This keeps the editing UI to simple text fields while supporting
mid-sentence links.

---

## Screens / Views

### 1. Quote Document (the deliverable)
- **Purpose:** the branded itinerary a traveler views/prints. Print-ready as PDF.
- **Page:** fixed **816px** wide (US Letter @96dpi), centered on a warm-gray backdrop
  `#dcdad3` with `padding:36px 16px`. White page, `box-shadow:0 8px 36px rgba(0,0,0,.16)`,
  `overflow:hidden`. Height grows with content (paginates in print).

- **Hero band** — `position:relative; height:222px; overflow:hidden; background:#c4ced0`
  - **Photo:** absolutely positioned `inset:0`, fills the band, `object-fit:cover`.
  - **Scrim:** overlay `linear-gradient(105deg, rgba(0,0,0,.20), rgba(0,0,0,0) 40%)`,
    `pointer-events:none` (darkens left for text legibility).
  - **Wordmark (top-right, `top:22px; right:30px`, right-aligned, `pointer-events:none`):**
    - "INFINITY" — Oswald 500, **44px**, letter-spacing **6px**, `#ffffff`,
      `text-shadow:0 1px 10px rgba(0,0,0,.35)`, line-height .9
    - "TOURS + EVENTS" — Oswald 300, **12px**, letter-spacing **7px**, `#ffffff`, margin-top 5px
  - **Group banner (bottom-left, `left:0; bottom:24px`):** two stacked teal bands
    - Group name — Oswald 600, **24px**, letter-spacing 1.5px, UPPERCASE, `#ffffff`,
      background `#3c8d9a`, `padding:8px 32px 8px 26px`
    - Destination + year — **Pinyon Script 36px**, `#ffffff`, background `#3c8d9a`,
      `padding:0 32px 8px 26px` (string = `destination + " " + year`)

- **Body** — `display:flex; align-items:stretch`
  - **Sidebar** — `width:236px; flex:none; background:#efece5; padding:24px 22px 28px;
    border-right:1px solid #b3b3b3` (the divider). Sections in order:
    1. **"Additional Trip Details"** (title) → each `tripLinks` item as a block link
    2. Embassy name + phone (Mulish italic 12px, `#6f6f6f`)
    3. **"Hotels"** (title) → `roomingLink` block link, then per city: city name
       (Oswald 600, 12px, UPPERCASE, `#8b7d67`), then each item: name (Oswald 500, 12.5px,
       `#4d4d4d`) + address (link)
    4. **"Activities"** (title) → `activitiesLink`
    5. **"Tour Host Details"** (title) → host name + phone (Mulish italic 12.5px, `#4d4d4d`)
    - Section titles: Oswald 600, **13px**, letter-spacing .7px, UPPERCASE, color `#8b7d67`,
      `border-bottom` none (just spacing), margin-top ~18px.
    - Sidebar links: Mulish **italic**, 12px (addresses 11.5px), underlined, color `#3a93a0`,
      `display:block`.
  - **Main** — `flex:1; padding:22px 24px 30px`. Days laid out with
    `column-count:2; column-gap:26px`. Each day block: `break-inside:avoid; margin-bottom:16px`.
    - **Date header bar:** background `#a9d2d8`, color `#ffffff`, Oswald 500, **14px**,
      letter-spacing .6px, `text-align:center; padding:6px; margin-bottom:8px`.
    - **Schedule row:** `display:flex; gap:8px; font-size:11px; line-height:1.32`
      - time cell: `width:50px; flex:none; text-align:right`, Mulish italic, color `#a8a298`
      - activity cell: `flex:1`, Mulish italic, color `#4d4d4d`; links italic underlined `#3a93a0`
    - **Overnight row:** same row layout; the time cell reads "Overnight" (Mulish italic, 9.5px),
      activity cell renders `day.overnight`. Only shown when `overnight` is non-empty.

- **Footer** — full-width band, background `#acd1d7`, `padding:15px 28px 17px`
  - "INFINITY" — Oswald 500, **27px**, letter-spacing 4px, `#ffffff`
  - "TOURS + EVENTS" — Oswald 300, 9px, letter-spacing 5px, `rgba(255,255,255,.9)`

### 2. Build Quote panel (authoring form — screen only)
- **Purpose:** non-technical staff fill out a tour; document updates live; auto-saves.
- A right-docked drawer, **384px** wide, full height, `background:#f7f6f2`,
  `box-shadow:-10px 0 34px rgba(0,0,0,.22)`, `z-index` above the page.
- Teal header bar (`#3c8d9a`, white) with "Build Quote" + Done. Scrollable body. Sticky footer
  with **Export JSON / Import / Sample / New**.
- Field groups mirror the data model exactly: Header (group, destination, year, host, phone,
  embassy, embassy phone), Trip Detail Links (label+URL rows, add/delete), Rooming & Activities,
  Hotels (city → items: name/address/URL, add/delete), Daily Itinerary (day label → rows of
  time+activity, add/delete, + Overnight field). A hint tells users to add links with
  `[label](https://…)`.
- **All editing controls and the top toolbar carry a `screen-only` marker and are hidden in
  print/PDF** (`@media print { .inf-screen-only { display:none } }`).

---

## Interactions & Behavior
- **Live editing:** every field writes into the `QuoteData` object → document re-renders.
- **Add/remove:** trip links, hotels, hotel items, days, and rows can be added/removed.
- **Autosave:** prototype persists `QuoteData` to `localStorage` on every change. *In the app,
  persist to your DB keyed by tour id (see below).*
- **Export JSON:** downloads `QuoteData` as `<group-slug>.json`.
- **Import JSON:** reads a `QuoteData` JSON file and replaces current state.
- **Sample / New:** load the demo content / start a blank quote.
- **Photo replace/remove:** swaps the hero image.
- **Print:** `@page { size: letter portrait; margin: 0 }`; page shadow removed; chrome hidden.

## State Management
- One source of truth: the `QuoteData` object.
- One transient UI flag: panel open/closed.
- Derived at render time: parse each `row.text`/`overnight` into link segments;
  `destLine = destination + " " + year`.

## Design Tokens
**Colors**
| Token | Hex | Use |
|---|---|---|
| Teal (brand) | `#3c8d9a` | group banner, panel header, footer-export button |
| Teal link | `#3a93a0` | all hyperlinks (italic, underlined) |
| Teal light | `#a9d2d8` | day header bars |
| Teal footer | `#acd1d7` | bottom brand band |
| Taupe | `#8b7d67` | sidebar section titles, city names |
| Sidebar bg | `#efece5` | left column |
| Page backdrop | `#dcdad3` | area around the page |
| Body text | `#4d4d4d` | activity text, hotel names |
| Muted text | `#6f6f6f` | embassy lines |
| Time text | `#a8a298` | schedule time column |
| Divider | `#b3b3b3` | 1px sidebar/main rule |
| Hero fallback | `#c4ced0` | behind photo while empty |
| White | `#ffffff` | page, hero text, banner/footer text |

**Typography** (Google Fonts)
- **Oswald** (300/400/500/600/700) — wordmark, banners, date bars, section titles, footer
- **Mulish** (400–700, + italic) — all body text; activities/links are *italic*
- **Pinyon Script** — destination+year script line only
- Sizes are listed inline per component above (hero 44/24/36px; date bar 14px; rows 11px;
  sidebar titles 13px; footer 27px).

**Spacing / shape**
- Page width 816px; sidebar 236px; main columns 2 × `column-gap:26px`
- Sidebar padding `24px 22px 28px`; main padding `22px 24px 30px`
- Day block `margin-bottom:16px`; row `gap:8px`, `margin-bottom:4px`
- Form inputs: `border:1px solid #d8d6cc; border-radius:6px; padding:6–7px`
- No large radii or heavy shadows in the document; the page has one soft drop shadow.

## Backend wiring (what to change when porting — everything else is unchanged)
1. **Photo:** the prototype uses a local drag-drop slot. In the app, add `heroPhotoUrl` to
   `QuoteData`, render `<img src={heroPhotoUrl} style="object-fit:cover">` in the hero, and wire
   an upload to your existing image storage (S3/CDN/etc.).
2. **Persistence:** replace `localStorage` autosave with save/load against your DB by tour id.
   Keep Export/Import JSON as a convenience (and as the agent contract).
3. **PDF:** render the same component with the print styles and use your existing
   print-to-PDF / server render. The `screen-only` chrome must be hidden in print.
4. **Auth/routing:** mount as a new authenticated route/page in the app.

## Assets
- Fonts: Google Fonts (Oswald, Mulish, Pinyon Script) — already loaded via `<link>`; use your
  app's font-loading convention.
- Hero photo: user-supplied per tour (no asset shipped). No logos/SVGs are required — the
  "INFINITY / TOURS + EVENTS" mark is set in Oswald type.

## Files in this bundle
- `Infinity Quote Template.dc.html` — the full working design reference (open in a browser to
  see it live; click **Build quote** to see the form). Read its markup for exact structure and
  the inline link-parsing logic.
- `image-slot.js` — the drag-drop image placeholder used by the prototype's hero (reference
  only; replace with your app's upload in production).
