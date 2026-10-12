import type { CSSProperties } from "react";
import type { QuoteData } from "@/lib/quotes/types";
import { blankPricing } from "@/lib/quotes/sampleData";
import { parseLinks } from "@/lib/quotes/parseLinks";

// The pricing quote (October 2026), laid out like Infinity's Piktochart quotes:
// photo band with the group and destination, a left column with inclusions,
// the estimated cost, add-ons and cost breakdown, the day-by-day plan and hotel
// details on the right, the student payment plan, and the terms footer.
// Fixed 816px wide (US Letter at 96dpi), the same as the trip sheet, so the
// server PDF export works unchanged. Pure presentation.

const OSWALD = "var(--font-oswald), 'Oswald', sans-serif";
const MULISH = "var(--font-mulish), 'Mulish', sans-serif";
const PINYON = "var(--font-pinyon), 'Pinyon Script', cursive";

const BLUE = "#4a7be0";
const BLUE_TEXT = "#3c6fd9";
const BLUE_DARK = "#2f58b8";
const PALE_BLUE = "#dbe7fb";
const INK = "#2b2b2b";
const BODY = "#6a6a6a";

const heading: CSSProperties = {
  fontFamily: OSWALD,
  fontWeight: 600,
  fontSize: 15,
  letterSpacing: ".6px",
  textTransform: "uppercase",
  color: INK,
  margin: "0 0 7px",
};

const bodyText: CSSProperties = {
  fontFamily: MULISH,
  fontStyle: "italic",
  fontSize: 11,
  lineHeight: 1.45,
  color: BODY,
};

const value: CSSProperties = { ...bodyText, color: BLUE_TEXT, fontStyle: "italic" };

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

export default function PricingQuoteDocument({ data }: { data: QuoteData }) {
  const p = { ...blankPricing(), ...(data.pricing ?? {}) };
  const inclusions = p.inclusions.filter(filled);
  const addOns = p.addOns.filter(a => filled(a.label) || filled(a.price));
  const breakdown = p.costBreakdown.filter(c => filled(c.label) || filled(c.amount));
  const plan = p.paymentPlan.filter(x => filled(x.amount) || filled(x.due));
  const days = data.days.filter(d => filled(d.date) || d.rows.some(r => filled(r.text)));
  const hotelLines = p.hotelDetails.split("\n").map(l => l.trim()).filter(Boolean);
  const hasSummary = filled(p.estimatedCost) || filled(p.paymentNote) || addOns.length > 0;

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
      `}</style>

      {/* HERO: photo as a CSS background so it paints in print and PDF. */}
      <div
        style={{
          position: "relative",
          height: 212,
          overflow: "hidden",
          background: "#7d93bd",
          backgroundImage: data.heroPhotoUrl ? `url('${data.heroPhotoUrl}')` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,0) 55%), linear-gradient(105deg, rgba(0,0,0,.18), rgba(0,0,0,0) 45%)" }} />
        <div style={{ position: "absolute", top: 18, right: 28, textAlign: "center" }}>
          <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 52, letterSpacing: "5px", color: "#fff", lineHeight: 0.9, textShadow: "0 1px 3px rgba(0,0,0,.35)" }}>INFINITY</div>
          <div style={{ fontFamily: OSWALD, fontWeight: 400, fontSize: 17, letterSpacing: "3px", color: "#fff", marginTop: 6, textShadow: "0 1px 3px rgba(0,0,0,.35)" }}>TOURS + EVENTS</div>
        </div>
        <div style={{ position: "absolute", left: 30, right: 200, bottom: 20 }}>
          <div style={{ color: "#fff", fontFamily: OSWALD, fontWeight: 600, fontSize: 25, letterSpacing: "1px", textTransform: "uppercase", lineHeight: 1.1, textShadow: "0 1px 8px rgba(0,0,0,.5)" }}>
            {data.group}
          </div>
          {filled(data.destination) && (
            <div style={{ color: "#fff", fontFamily: PINYON, fontSize: 30, lineHeight: 1.15, marginTop: 4, marginLeft: 60, textShadow: "0 1px 8px rgba(0,0,0,.5)" }}>
              in {data.destination}
            </div>
          )}
        </div>
        {filled(data.year) && (
          <div style={{ position: "absolute", right: 24, bottom: 14, color: "#fff", fontFamily: OSWALD, fontSize: 12, letterSpacing: ".5px", textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>
            {data.year}
          </div>
        )}
      </div>

      {/* BODY */}
      <div style={{ display: "flex", alignItems: "stretch", padding: "26px 30px 18px" }}>
        {/* Left column */}
        <div style={{ width: 230, flex: "none", paddingRight: 22, borderRight: "2px solid #4d4d4d" }}>
          {inclusions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={heading}>Trip Inclusions</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {inclusions.map((t, i) => <li key={i} style={{ ...bodyText, marginBottom: 1 }}><Linked text={t} /></li>)}
              </ul>
            </div>
          )}

          {hasSummary && (
            <div style={{ marginBottom: 24 }}>
              <div style={heading}>Payment Summary</div>
              {filled(p.estimatedCost) && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "2px 0 8px" }}>
                  <span style={{ fontFamily: OSWALD, fontSize: 13, color: BODY, letterSpacing: ".3px" }}>Estimated tour cost:</span>
                  <span style={{ fontFamily: OSWALD, fontWeight: 600, fontSize: 21, color: BLUE_TEXT }}>{p.estimatedCost}</span>
                </div>
              )}
              {filled(p.paymentNote) && <div style={bodyText}>{p.paymentNote}</div>}
              {addOns.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontFamily: OSWALD, fontSize: 13, color: BODY, letterSpacing: ".3px", marginBottom: 4 }}>Possible add-ons:</div>
                  {addOns.map((a, i) => (
                    <div key={i} style={bodyText}>
                      {a.label}{filled(a.price) && <>: <span style={value}>{a.price}</span></>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {breakdown.length > 0 && (
            <div>
              <div style={heading}>Cost Breakdown</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {breakdown.map((c, i) => (
                  <li key={i} style={{ ...bodyText, marginBottom: 1 }}>
                    {c.label} {filled(c.amount) && <span style={value}>{c.amount}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: days, then hotel details, flowing in two columns */}
        <div style={{ flex: 1, paddingLeft: 24 }}>
          <div style={{ columnCount: 2, columnGap: 24 }}>
            {days.map((d, i) => (
              <div key={i} style={{ breakInside: "avoid", marginBottom: 18 }}>
                <div style={{ background: BLUE, color: "#fff", fontFamily: OSWALD, fontWeight: 500, fontSize: 14, letterSpacing: ".4px", textAlign: "center", padding: "5px 6px", marginBottom: 8 }}>
                  {d.date}
                </div>
                {d.rows.filter(r => filled(r.text)).map((r, ri) => (
                  <div key={ri} style={{ ...bodyText, marginBottom: 1 }}>
                    {filled(r.time) && <span style={{ color: "#9a9a9a", marginRight: 6 }}>{r.time}</span>}
                    <Linked text={r.text} />
                  </div>
                ))}
              </div>
            ))}
            {(hotelLines.length > 0 || filled(p.roomsNote)) && (
              <div style={{ breakInside: "avoid", marginBottom: 18 }}>
                <div style={heading}>Hotel Details</div>
                {hotelLines.map((l, i) => <div key={i} style={bodyText}><Linked text={l} /></div>)}
                {filled(p.roomsNote) && <div style={value}>{p.roomsNote}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STUDENT PAYMENT PLAN */}
      {(plan.length > 0 || filled(p.paymentPlanNote)) && (
        <div style={{ margin: "0 30px", padding: "14px 0 16px", borderTop: "1px solid #3a3a3a" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 22 }}>
            <div style={{ flex: "none", background: PALE_BLUE, color: INK, fontFamily: OSWALD, fontWeight: 500, fontSize: 12.5, letterSpacing: ".3px", padding: "7px 12px", marginTop: 10 }}>
              Student Payment Plan
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${Math.max(1, Math.min(plan.length, 4))}, 1fr)`, rowGap: 10, columnGap: 14 }}>
              {plan.map((x, i) => (
                <div key={i}>
                  <div style={{ fontFamily: OSWALD, fontSize: 13, color: INK }}>
                    {x.label || `Payment ${i + 1}`}: <span style={{ color: BLUE_TEXT, fontWeight: 600, marginLeft: 4 }}>{x.amount}</span>
                  </div>
                  {filled(x.due) && <div style={{ fontFamily: MULISH, fontSize: 10.5, color: INK, marginTop: 3 }}>Due: {x.due}</div>}
                </div>
              ))}
            </div>
          </div>
          {filled(p.paymentPlanNote) && (
            <div style={{ fontFamily: MULISH, fontStyle: "italic", fontWeight: 600, fontSize: 9.5, color: INK, marginTop: 8, paddingLeft: 4 }}>
              {p.paymentPlanNote}
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ height: 6, background: BLUE_DARK }} />
      <div style={{ background: BLUE, padding: "18px 30px", display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ flex: "none" }}>
          <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 28, letterSpacing: "4px", color: "#fff", lineHeight: 0.9 }}>INFINITY</div>
          <div style={{ fontFamily: OSWALD, fontWeight: 300, fontSize: 9, letterSpacing: "4px", color: "rgba(255,255,255,.92)", marginTop: 4 }}>TOURS + EVENTS</div>
        </div>
        {filled(p.terms) && (
          <div style={{ flex: 1, fontFamily: MULISH, fontSize: 10.5, lineHeight: 1.5, color: "#fff" }}>{p.terms}</div>
        )}
      </div>
    </div>
  );
}
