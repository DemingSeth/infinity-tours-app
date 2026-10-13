import type { CSSProperties } from "react";
import type { QuoteData, QuoteDay } from "@/lib/quotes/types";
import { blankPricing } from "@/lib/quotes/sampleData";
import { parseLinks } from "@/lib/quotes/parseLinks";

// The pricing quote (October 2026), matched to Infinity's Piktochart quotes
// (Corner Canyon HS Band and Orchestra was the reference). Sizes are measured
// from that export and scaled to the 816px (US Letter at 96dpi) page the
// server PDF export renders, so the on-screen quote and the PDF match.
//
// Every section carries data-edit so the editor can jump to its fields when
// clicked. Pure presentation: all content comes from `data`.

// Each var() carries its own fallback: an undefined variable without one
// voids the whole font-family, which is what happens in the server PDF export
// (no next/font class there; the Google Fonts link supplies the families).
const DISPLAY = "var(--font-fjalla, 'Fjalla One'), 'Fjalla One', 'Oswald', sans-serif";
const BODY_FONT = "var(--font-lato, 'Lato'), 'Lato', sans-serif";
const SCRIPT = "var(--font-script, 'Yellowtail'), 'Yellowtail', cursive";

const BLUE = "#4f80e3";
const BLUE_TEXT = "#3d78e0";
const NAVY = "#18295a";
const PALE_BLUE = "#d4e3fa";
const INK = "#222222";
const GRAY = "#6c6c6c";

const LEFT_COL = 256;   // left column width including its right padding
const MID_COL = 249;    // middle column: days
const DAY_BAR = 176;    // day heading bar width (narrower than the column)

const heading: CSSProperties = {
  fontFamily: DISPLAY,
  fontWeight: 400,
  fontSize: 16.5,
  letterSpacing: ".2px",
  textTransform: "uppercase",
  color: INK,
  margin: "0 0 10px",
  lineHeight: 1.1,
};

const body: CSSProperties = {
  fontFamily: BODY_FONT,
  fontStyle: "italic",
  fontSize: 10.2,
  lineHeight: "16px",
  color: GRAY,
};

const blueValue: CSSProperties = { color: BLUE_TEXT };

const bullets: CSSProperties = {
  margin: 0,
  paddingLeft: 17,
  listStyleType: "disc",
  listStylePosition: "outside",
};

function Linked({ text }: { text: string }) {
  return (
    <>
      {parseLinks(text).map((seg, i) =>
        seg.plain ? <span key={i}>{seg.text}</span> : (
          <a key={i} href={seg.url} target="_blank" rel="noopener noreferrer" style={{ color: BLUE_TEXT, textDecoration: "underline" }}>{seg.text}</a>
        )
      )}
    </>
  );
}

const filled = (s: string | undefined | null) => !!s && s.trim().length > 0;

type IndexedDay = QuoteDay & { index: number };

/**
 * Split the days the way the Piktochart quotes do: fill the middle column to
 * about the height of the left column, then continue in the right column with
 * the hotel details last. Heights are estimated in text lines (a day heading
 * counts as about three), so no measuring is needed and the server PDF lays
 * out the same way.
 */
function splitDays(days: IndexedDay[], leftLines: number): [IndexedDay[], IndexedDay[]] {
  const cost = (d: IndexedDay) => 3 + d.rows.filter(r => filled(r.text)).length;
  const total = days.reduce((n, d) => n + cost(d), 0);
  const target = Math.max(leftLines, total / 2);
  const first: IndexedDay[] = [];
  let used = 0;
  for (const d of days) {
    if (first.length > 0 && used + cost(d) > target) break;
    first.push(d);
    used += cost(d);
  }
  // Always leave the right column at least one day when there are several.
  if (first.length === days.length && days.length > 1) first.pop();
  return [first, days.slice(first.length)];
}

export default function PricingQuoteDocument({ data }: { data: QuoteData }) {
  const p = { ...blankPricing(), ...(data.pricing ?? {}) };
  const inclusions = p.inclusions.filter(filled);
  const addOns = p.addOns.filter(a => filled(a.label) || filled(a.price));
  const breakdown = p.costBreakdown.filter(c => filled(c.label) || filled(c.amount));
  const plan = p.paymentPlan.filter(x => filled(x.amount) || filled(x.due));
  const days: IndexedDay[] = data.days
    .map((d, index) => ({ ...d, index }))
    .filter(d => filled(d.date) || d.rows.some(r => filled(r.text)));
  const hotelLines = p.hotelDetails.split("\n").map(l => l.trim()).filter(Boolean);
  const hasHotel = hotelLines.length > 0 || filled(p.roomsNote);
  const hasSummary = filled(p.estimatedCost) || filled(p.paymentNote) || addOns.length > 0;
  const watermark = data.watermark !== false;

  // Left column height in lines, for the day split.
  const leftLines =
    (inclusions.length ? 3 + inclusions.length : 0) +
    (hasSummary ? 6 + (filled(p.paymentNote) ? 2 : 0) + (addOns.length ? 3 + addOns.length : 0) : 0) +
    (breakdown.length ? 3 + breakdown.length : 0);
  const [middleDays, rightDays] = splitDays(days, leftLines);

  const dayBlock = (d: IndexedDay) => (
    <div key={d.index} data-edit={`day-${d.index}`} style={{ marginBottom: 22 }}>
      <div style={{ width: DAY_BAR, maxWidth: "100%", background: BLUE, color: "#fff", fontFamily: DISPLAY, fontWeight: 400, fontSize: 15, letterSpacing: ".2px", textAlign: "center", lineHeight: "25px", height: 25, marginBottom: 14 }}>
        {d.date}
      </div>
      {d.rows.filter(r => filled(r.text)).map((r, ri) => (
        <div key={ri} style={body}>
          {filled(r.time) && <span style={{ color: "#9a9a9a", marginRight: 6 }}>{r.time}</span>}
          <Linked text={r.text} />
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="inf-page"
      style={{
        position: "relative",
        width: 816,
        background: "#ffffff",
        boxShadow: "0 8px 36px rgba(0,0,0,.16)",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <style>{`
        @media print {
          .inf-screen-only { display: none !important; }
          .inf-page { box-shadow: none !important; }
          @page { size: letter portrait; margin: 0; }
        }
        .inf-page ul li::marker { color: #8a8a8a; font-size: 9px; }
      `}</style>

      {/* WATERMARK: the Infinity mark, large and slanted across the lower right,
          as on the Piktochart quotes. Clipped to the page; content sits above.
          A plain img (not next/image) because this also renders to static HTML
          for the PDF export, which sets a base address for the path. */}
      {watermark && (
        <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/infinity-mark-light.png"
            alt=""
            style={{ position: "absolute", width: 620, left: 352, top: 480, transform: "rotate(-42deg)", filter: "saturate(1.35)" }}
          />
        </div>
      )}

      {/* HERO: photo as a CSS background so it paints in print and PDF. */}
      <div
        data-edit="header"
        style={{
          position: "relative",
          zIndex: 1,
          height: 202,
          overflow: "hidden",
          background: "#7d93bd",
          backgroundImage: data.heroPhotoUrl ? `url('${data.heroPhotoUrl}')` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.42), rgba(0,0,0,0) 50%), linear-gradient(to bottom, rgba(0,0,0,.18), rgba(0,0,0,0) 35%)" }} />
        <div style={{ position: "absolute", top: 12, right: 30, textAlign: "right" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 60, letterSpacing: "1px", color: "#fff", lineHeight: 0.95, textShadow: "0 1px 3px rgba(0,0,0,.3)" }}>INFINITY</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 19, letterSpacing: "1px", color: "#fff", lineHeight: 1, marginTop: 6, textShadow: "0 1px 3px rgba(0,0,0,.3)" }}>TOURS + EVENTS</div>
        </div>
        <div style={{ position: "absolute", left: 42, bottom: 10, maxWidth: 560 }}>
          <div style={{ display: "inline-block", textAlign: "center" }}>
            <div style={{ color: "#fff", fontFamily: DISPLAY, fontSize: 25.5, letterSpacing: ".3px", textTransform: "uppercase", lineHeight: 1.1, textShadow: "0 1px 6px rgba(0,0,0,.45)", textAlign: "left" }}>
              {data.group}
            </div>
            <div style={{ width: 200, height: 2, background: "#fff", margin: "9px auto 3px", opacity: 0.95 }} />
          </div>
          {filled(data.destination) && (
            <div style={{ color: "#fff", fontFamily: SCRIPT, fontSize: 33, lineHeight: 1.15, marginLeft: 76, textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>
              in {data.destination}
            </div>
          )}
        </div>
        {filled(data.year) && (
          <div style={{ position: "absolute", right: 22, bottom: 14, color: "#fff", fontFamily: BODY_FONT, fontSize: 12, textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>
            {data.year}
          </div>
        )}
      </div>

      {/* BODY: left column | divider | days | days + hotel */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "stretch", padding: "30px 26px 22px 36px" }}>
        <div style={{ width: LEFT_COL, flex: "none", paddingRight: 22, boxSizing: "border-box", borderRight: "1.5px solid #3e3e3e" }}>
          {inclusions.length > 0 && (
            <div data-edit="inclusions" style={{ marginBottom: 36 }}>
              <div style={heading}>Trip Inclusions</div>
              <ul style={bullets}>
                {inclusions.map((t, i) => <li key={i} style={body}><Linked text={t} /></li>)}
              </ul>
            </div>
          )}

          {hasSummary && (
            <div data-edit="summary" style={{ marginBottom: 36 }}>
              <div style={heading}>Payment Summary</div>
              {filled(p.estimatedCost) && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 18, margin: "0 0 10px" }}>
                  <span style={{ fontFamily: DISPLAY, fontSize: 12, color: "#555" }}>Estimated tour cost:</span>
                  <span style={{ fontFamily: DISPLAY, fontSize: 18.5, color: BLUE_TEXT }}>{p.estimatedCost}</span>
                </div>
              )}
              {filled(p.paymentNote) && <div style={{ ...body, maxWidth: 200 }}>{p.paymentNote}</div>}
              {addOns.length > 0 && (
                <div data-edit="addons" style={{ marginTop: 34 }}>
                  <div style={{ fontFamily: DISPLAY, fontSize: 12, color: "#555", marginBottom: 8 }}>possible add-ons:</div>
                  {addOns.map((a, i) => (
                    <div key={i} style={body}>
                      {a.label}{filled(a.price) && <>: <span style={blueValue}>{a.price}</span></>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {breakdown.length > 0 && (
            <div data-edit="breakdown">
              <div style={heading}>Cost Breakdown</div>
              <ul style={bullets}>
                {breakdown.map((c, i) => (
                  <li key={i} style={body}>
                    {c.label} {filled(c.amount) && <span style={blueValue}>{c.amount}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={{ width: MID_COL, flex: "none", paddingLeft: 33, boxSizing: "content-box" }}>
          {middleDays.map(dayBlock)}
        </div>

        <div style={{ flex: 1, paddingLeft: 8 }}>
          {rightDays.map(dayBlock)}
          {hasHotel && (
            <div data-edit="hotel" style={{ marginTop: rightDays.length ? 4 : 0 }}>
              <div style={heading}>Hotel Details</div>
              {hotelLines.map((l, i) => <div key={i} style={body}><Linked text={l} /></div>)}
              {filled(p.roomsNote) && <div style={{ ...body, ...blueValue }}>{p.roomsNote}</div>}
            </div>
          )}
        </div>
      </div>

      {/* STUDENT PAYMENT PLAN */}
      {(plan.length > 0 || filled(p.paymentPlanNote)) && (
        <div data-edit="plan" style={{ position: "relative", zIndex: 1, margin: "0 68px 0 48px", padding: "14px 0 16px", borderTop: "1.5px solid #333" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: "none", width: 126, marginLeft: -12, background: PALE_BLUE, color: INK, fontFamily: DISPLAY, fontSize: 12.5, textAlign: "center", lineHeight: "24px", height: 24, marginTop: 22 }}>
              Student Payment Plan
            </div>
            <div style={{ marginLeft: 45, flex: 1, display: "grid", gridTemplateColumns: `repeat(${Math.max(1, Math.min(plan.length, 4))}, 137px)`, rowGap: 10 }}>
              {plan.map((x, i) => (
                <div key={i}>
                  <div style={{ fontFamily: DISPLAY, fontSize: 14, color: INK, whiteSpace: "nowrap" }}>
                    {x.label || `Payment ${i + 1}`}:<span style={{ fontFamily: BODY_FONT, fontSize: 12.5, color: BLUE_TEXT, marginLeft: 10 }}>{x.amount}</span>
                  </div>
                  {filled(x.due) && <div style={{ fontFamily: BODY_FONT, fontWeight: 700, fontSize: 11, color: INK, marginTop: 11, whiteSpace: "nowrap" }}>Due: {x.due}</div>}
                </div>
              ))}
            </div>
          </div>
          {filled(p.paymentPlanNote) && (
            <div style={{ fontFamily: BODY_FONT, fontStyle: "italic", fontWeight: 700, fontSize: 8.5, color: INK, marginTop: 6, marginLeft: 152 }}>
              {p.paymentPlanNote}
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ position: "relative", zIndex: 1, height: 7, background: NAVY, marginTop: 4 }} />
      <div data-edit="terms" style={{ position: "relative", zIndex: 1, background: BLUE, padding: "16px 40px 16px 22px", display: "flex", alignItems: "center", gap: 64, minHeight: 84, boxSizing: "border-box" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/infinity-lockup-light.png" alt="Infinity Tours + Events" style={{ width: 165, flex: "none", display: "block" }} />
        {filled(p.terms) && (
          <div style={{ flex: 1, fontFamily: BODY_FONT, fontSize: 10.5, lineHeight: 1.55, color: "#fff" }}>{p.terms}</div>
        )}
      </div>
    </div>
  );
}
