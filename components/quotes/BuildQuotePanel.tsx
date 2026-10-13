"use client";

import type { CSSProperties } from "react";
import type { QuoteData, PricingSection } from "@/lib/quotes/types";
import { blankPricing } from "@/lib/quotes/sampleData";

// The right-docked authoring drawer. Field groups mirror QuoteData exactly and
// every edit produces a new QuoteData via `onChange`, so the document updates
// live. Marked `inf-screen-only` so it is hidden in print/PDF.

const OSWALD = "'Fjalla One', Georgia, sans-serif";
const MULISH = "inherit";

const groupTitle: CSSProperties = {
  fontFamily: OSWALD,
  fontSize: 12,
  letterSpacing: ".8px",
  textTransform: "uppercase",
  color: "#5784E6",
  borderBottom: "1px solid var(--border-soft)",
  paddingBottom: 5,
  margin: "20px 0 8px",
};

const label: CSSProperties = {
  display: "block",
  fontSize: 10,
  letterSpacing: ".4px",
  textTransform: "uppercase",
  color: "var(--muted-2)",
  margin: "8px 0 2px",
};

const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: MULISH,
  fontSize: 13,
  padding: "7px 9px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  background: "var(--surface)",
};

const urlInput: CSSProperties = {
  ...input,
  fontSize: 11,
  padding: "5px 8px",
  border: "1px solid var(--border-soft)",
  color: "var(--muted)",
  marginTop: 4,
};

const addBtn: CSSProperties = {
  fontFamily: OSWALD,
  fontSize: 11,
  letterSpacing: ".4px",
  textTransform: "uppercase",
  background: "var(--sky-bg-soft)",
  color: "#5784E6",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 11px",
  cursor: "pointer",
};

const subAddBtn: CSSProperties = {
  ...addBtn,
  fontSize: 10,
  background: "var(--surface-3)",
  border: "1px solid var(--border-soft)",
  borderRadius: 5,
  padding: "5px 9px",
  marginTop: 6,
};

const delX: CSSProperties = {
  flex: "none",
  background: "none",
  border: "none",
  color: "var(--red-text)",
  fontSize: 18,
  cursor: "pointer",
  lineHeight: 1,
  padding: "4px 6px",
};

const delWord: CSSProperties = {
  flex: "none",
  fontFamily: OSWALD,
  fontSize: 10,
  letterSpacing: ".4px",
  textTransform: "uppercase",
  background: "none",
  border: "none",
  color: "var(--red-text)",
  cursor: "pointer",
};

const footerBtn: CSSProperties = {
  fontFamily: OSWALD,
  fontSize: 11,
  letterSpacing: ".5px",
  textTransform: "uppercase",
  color: "var(--muted)",
  background: "var(--surface-3)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "9px 11px",
  cursor: "pointer",
};

const textarea: CSSProperties = { ...input, fontSize: 12, padding: "6px 8px", resize: "vertical", lineHeight: 1.45 };

// "$1,700", "+ $770", "$ 350" -> 1700 / 770 / 350; null when there is no number.
function money(s: string): number | null {
  const m = s.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}
const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

// Pricing mistakes are expensive, so the panel checks that the cost breakdown
// and the payment plan each add up to the estimated cost.
function TotalCheck({ label, parts, target }: { label: string; parts: string[]; target: string }) {
  const nums = parts.map(money).filter((n): n is number => n !== null);
  const goal = money(target);
  if (nums.length === 0 || goal === null) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  const diff = Math.round((sum - goal) * 100) / 100;
  const ok = diff === 0;
  return (
    <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.4, padding: "6px 9px", borderRadius: 6, background: ok ? "var(--green-bg-soft)" : "var(--amber-bg-soft)", color: ok ? "var(--green-text)" : "var(--amber-text)", border: `1px solid ${ok ? "var(--green-border)" : "var(--amber-border)"}` }}>
      {label} adds up to <strong>{fmt(sum)}</strong>
      {ok ? ", matching the estimated cost." : <>, which is {fmt(Math.abs(diff))} {diff > 0 ? "more" : "less"} than the estimated cost of {fmt(goal)}.</>}
    </div>
  );
}

type Props = {
  data: QuoteData;
  onChange: (next: QuoteData) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onSample: () => void;
  onNew: () => void;
};

export default function BuildQuotePanel({ data, onChange, onExport, onImport, onSample, onNew }: Props) {
  // Immutable update: deep-clone, mutate, emit.
  function update(mutate: (draft: QuoteData) => void) {
    const draft: QuoteData = JSON.parse(JSON.stringify(data));
    mutate(draft);
    onChange(draft);
  }
  const isPricing = data.layout === "pricing";
  const pr: PricingSection = { ...blankPricing(), ...(data.pricing ?? {}) };
  // Edit the pricing block, creating it with defaults if an older quote lacks it.
  function updateP(mutate: (p: PricingSection) => void) {
    update((d) => {
      d.pricing = { ...blankPricing(), ...(d.pricing ?? {}) };
      mutate(d.pricing);
    });
  }

  return (
    <div
      className="inf-screen-only"
      style={{
        flex: "none",
        width: 384,
        height: "100%",
        background: "var(--surface-2)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header bar */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", padding: "14px 18px", background: "#0B1957", color: "#fff" }}>
        <div style={{ fontFamily: OSWALD, letterSpacing: "1px", textTransform: "uppercase", fontSize: 15 }}>Quote Page</div>
      </div>

      {/* Scrollable body */}
      <div id="qp-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 18px 28px", fontFamily: MULISH }}>
        {/* Header */}
        <div id="qp-header" style={{ ...groupTitle, marginTop: 2 }}>Header</div>
        <label style={label}>Group name</label>
        <input style={input} value={data.group} onChange={(e) => update((d) => { d.group = e.target.value; })} />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Destination</label>
            <input style={input} value={data.destination} onChange={(e) => update((d) => { d.destination = e.target.value; })} />
          </div>
          <div style={{ width: 96, flex: "none" }}>
            <label style={label}>Year</label>
            <input style={input} value={data.year} onChange={(e) => update((d) => { d.year = e.target.value; })} />
          </div>
        </div>
        {!isPricing && (<>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Tour host</label>
            <input style={input} value={data.hostName} onChange={(e) => update((d) => { d.hostName = e.target.value; })} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Host phone</label>
            <input style={input} value={data.hostPhone} onChange={(e) => update((d) => { d.hostPhone = e.target.value; })} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Embassy</label>
            <input style={input} value={data.embassyName} onChange={(e) => update((d) => { d.embassyName = e.target.value; })} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Embassy phone</label>
            <input style={input} value={data.embassyPhone} onChange={(e) => update((d) => { d.embassyPhone = e.target.value; })} />
          </div>
        </div>

        {/* Trip Detail Links */}
        <div style={groupTitle}>Trip Detail Links</div>
        {data.tripLinks.map((l, li) => (
          <div key={li} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 7 }}>
            <div style={{ flex: 1 }}>
              <input style={{ ...input, fontSize: 13, padding: "6px 8px" }} placeholder="Label" value={l.label} onChange={(e) => update((d) => { d.tripLinks[li]!.label = e.target.value; })} />
              <input style={urlInput} placeholder="https://" value={l.url} onChange={(e) => update((d) => { d.tripLinks[li]!.url = e.target.value; })} />
            </div>
            <button type="button" style={delX} onClick={() => update((d) => { d.tripLinks.splice(li, 1); })}>&times;</button>
          </div>
        ))}
        <button type="button" style={addBtn} onClick={() => update((d) => { d.tripLinks.push({ label: "New link", url: "" }); })}>+ Add link</button>

        {/* Hotels — mirrors the document sidebar: rooming link first, then cities */}
        <div style={groupTitle}>Hotels</div>
        <label style={label}>Rooming list — label / URL</label>
        <input style={{ ...input, fontSize: 13, padding: "6px 8px" }} value={data.roomingLink.label} onChange={(e) => update((d) => { d.roomingLink.label = e.target.value; })} />
        <input style={{ ...urlInput, marginBottom: 10 }} placeholder="https://" value={data.roomingLink.url} onChange={(e) => update((d) => { d.roomingLink.url = e.target.value; })} />
        {data.hotels.map((h, hi) => (
          <div key={hi} style={{ border: "1px solid var(--border-soft)", borderRadius: 8, padding: 10, marginBottom: 10, background: "var(--surface)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                style={{ flex: 1, boxSizing: "border-box", fontFamily: OSWALD, letterSpacing: ".5px", textTransform: "uppercase", fontSize: 13, padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", background: "var(--surface)" }}
                placeholder="City"
                value={h.city}
                onChange={(e) => update((d) => { d.hotels[hi]!.city = e.target.value; })}
              />
              <button type="button" style={delWord} onClick={() => update((d) => { d.hotels.splice(hi, 1); })}>Delete</button>
            </div>
            {h.items.map((it, ii) => (
              <div key={ii} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--border-soft)" }}>
                <input style={{ ...input, fontSize: 12, padding: "5px 8px" }} placeholder="Hotel name" value={it.name} onChange={(e) => update((d) => { d.hotels[hi]!.items[ii]!.name = e.target.value; })} />
                <input style={urlInput} placeholder="Address" value={it.addr} onChange={(e) => update((d) => { d.hotels[hi]!.items[ii]!.addr = e.target.value; })} />
                <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                  <input style={{ ...urlInput, flex: 1, marginTop: 0 }} placeholder="https://" value={it.url} onChange={(e) => update((d) => { d.hotels[hi]!.items[ii]!.url = e.target.value; })} />
                  <button type="button" style={{ ...delX, fontSize: 18, padding: "2px 4px" }} onClick={() => update((d) => { d.hotels[hi]!.items.splice(ii, 1); })}>&times;</button>
                </div>
              </div>
            ))}
            <button type="button" style={subAddBtn} onClick={() => update((d) => { d.hotels[hi]!.items.push({ name: "", addr: "", url: "" }); })}>+ Hotel option</button>
          </div>
        ))}
        <button type="button" style={addBtn} onClick={() => update((d) => { d.hotels.push({ city: "CITY", items: [{ name: "", addr: "", url: "" }] }); })}>+ Add city</button>

        {/* Activities */}
        <div style={groupTitle}>Activities</div>
        <label style={label}>Activities — label / URL</label>
        <input style={{ ...input, fontSize: 13, padding: "6px 8px" }} value={data.activitiesLink.label} onChange={(e) => update((d) => { d.activitiesLink.label = e.target.value; })} />
        <input style={urlInput} placeholder="https://" value={data.activitiesLink.url} onChange={(e) => update((d) => { d.activitiesLink.url = e.target.value; })} />
        </>)}

        {isPricing && (<>
          {/* Trip Inclusions */}
          {/* Background option */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12.5, color: "var(--text)", cursor: "pointer" }}>
            <input type="checkbox" checked={data.watermark !== false} onChange={(e) => update((d) => { d.watermark = e.target.checked; })} />
            Infinity logo watermark in the background
          </label>

          <div id="qp-inclusions" style={groupTitle}>Trip Inclusions</div>
          {pr.inclusions.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <input style={{ ...input, fontSize: 12, padding: "5px 8px" }} placeholder="e.g. 2 Day Disney Park Hopper" value={t} onChange={(e) => updateP((p) => { p.inclusions[i] = e.target.value; })} />
              <button type="button" style={{ ...delX, fontSize: 16, padding: "3px 4px" }} onClick={() => updateP((p) => { p.inclusions.splice(i, 1); })}>&times;</button>
            </div>
          ))}
          <button type="button" style={addBtn} onClick={() => updateP((p) => { p.inclusions.push(""); })}>+ Add inclusion</button>

          {/* Payment Summary */}
          <div id="qp-summary" style={groupTitle}>Payment Summary</div>
          <label style={label}>Estimated tour cost (per traveler)</label>
          <input style={input} placeholder="$1700" value={pr.estimatedCost} onChange={(e) => updateP((p) => { p.estimatedCost = e.target.value; })} />
          <label style={label}>Payment note</label>
          <textarea style={textarea} rows={2} value={pr.paymentNote} onChange={(e) => updateP((p) => { p.paymentNote = e.target.value; })} />
          <label id="qp-addons" style={{ ...label, marginTop: 12 }}>Possible add-ons</label>
          {pr.addOns.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <input style={{ ...input, flex: 1, fontSize: 12, padding: "5px 8px" }} placeholder="Add-on" value={a.label} onChange={(e) => updateP((p) => { p.addOns[i]!.label = e.target.value; })} />
              <input style={{ ...input, width: 86, flex: "none", fontSize: 12, padding: "5px 8px" }} placeholder="+ $770" value={a.price} onChange={(e) => updateP((p) => { p.addOns[i]!.price = e.target.value; })} />
              <button type="button" style={{ ...delX, fontSize: 16, padding: "3px 4px" }} onClick={() => updateP((p) => { p.addOns.splice(i, 1); })}>&times;</button>
            </div>
          ))}
          <button type="button" style={addBtn} onClick={() => updateP((p) => { p.addOns.push({ label: "", price: "" }); })}>+ Add add-on</button>

          {/* Cost Breakdown */}
          <div id="qp-breakdown" style={groupTitle}>Cost Breakdown</div>
          {pr.costBreakdown.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <input style={{ ...input, flex: 1, fontSize: 12, padding: "5px 8px" }} placeholder="Category" value={c.label} onChange={(e) => updateP((p) => { p.costBreakdown[i]!.label = e.target.value; })} />
              <input style={{ ...input, width: 86, flex: "none", fontSize: 12, padding: "5px 8px" }} placeholder="$400" value={c.amount} onChange={(e) => updateP((p) => { p.costBreakdown[i]!.amount = e.target.value; })} />
              <button type="button" style={{ ...delX, fontSize: 16, padding: "3px 4px" }} onClick={() => updateP((p) => { p.costBreakdown.splice(i, 1); })}>&times;</button>
            </div>
          ))}
          <button type="button" style={addBtn} onClick={() => updateP((p) => { p.costBreakdown.push({ label: "", amount: "" }); })}>+ Add line</button>
          <TotalCheck label="The cost breakdown" parts={pr.costBreakdown.map(c => c.amount)} target={pr.estimatedCost} />

          {/* Hotel Details */}
          <div id="qp-hotel" style={groupTitle}>Hotel Details</div>
          <textarea style={textarea} rows={3} placeholder={"4 nights at Anaheim Resort Suites\n101 E. Katella Avenue Anaheim, CA\nBreakfast included daily"} value={pr.hotelDetails} onChange={(e) => updateP((p) => { p.hotelDetails = e.target.value; })} />
          <label style={label}>Rooms note</label>
          <input style={input} placeholder="Quote Priced for 31 rooms" value={pr.roomsNote} onChange={(e) => updateP((p) => { p.roomsNote = e.target.value; })} />
        </>)}

        {/* Daily Itinerary */}
        <div style={{ ...groupTitle, margin: "20px 0 6px" }}>Daily Itinerary</div>
        <div style={{ fontSize: 11, color: "var(--muted-2)", marginBottom: 10, lineHeight: 1.4 }}>
          Add a link inside any line with <span style={{ fontFamily: "monospace", background: "var(--surface-3)", padding: "1px 4px", borderRadius: 3 }}>[label](https://…)</span>
        </div>
        {data.days.map((day, di) => (
          <div key={di} id={`qp-day-${di}`} style={{ border: "1px solid var(--border-soft)", borderRadius: 8, padding: 10, marginBottom: 10, background: "var(--surface)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                style={{ flex: 1, boxSizing: "border-box", fontFamily: OSWALD, letterSpacing: ".4px", fontSize: 13, padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", background: "var(--surface)" }}
                placeholder="Day label (e.g. Wed. June 29)"
                value={day.date}
                onChange={(e) => update((d) => { d.days[di]!.date = e.target.value; })}
              />
              <button type="button" style={delWord} onClick={() => update((d) => { d.days.splice(di, 1); })}>Delete</button>
            </div>
            {day.rows.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 6 }}>
                <input style={{ width: 64, flex: "none", boxSizing: "border-box", fontFamily: MULISH, fontSize: 11, padding: "5px 6px", border: "1px solid var(--border-soft)", borderRadius: 6, color: "var(--muted)", background: "var(--surface)" }} placeholder="Time" value={row.time} onChange={(e) => update((d) => { d.days[di]!.rows[ri]!.time = e.target.value; })} />
                <input style={{ ...input, flex: 1, fontSize: 12, padding: "5px 8px" }} placeholder="Activity (supports [label](url))" value={row.text} onChange={(e) => update((d) => { d.days[di]!.rows[ri]!.text = e.target.value; })} />
                <button type="button" style={{ ...delX, fontSize: 16, padding: "3px 4px" }} onClick={() => update((d) => { d.days[di]!.rows.splice(ri, 1); })}>&times;</button>
              </div>
            ))}
            <button type="button" style={subAddBtn} onClick={() => update((d) => { d.days[di]!.rows.push({ time: "", text: "" }); })}>+ Row</button>
            {!isPricing && (<>
            <label style={{ ...label, margin: "10px 0 2px" }}>Overnight</label>
            <input style={{ ...input, fontSize: 12, padding: "5px 8px" }} placeholder="Overnight stay (optional, supports links)" value={day.overnight ?? ""} onChange={(e) => update((d) => { d.days[di]!.overnight = e.target.value; })} />
            </>)}
          </div>
        ))}
        <button type="button" style={{ ...addBtn, padding: "7px 13px" }} onClick={() => update((d) => { d.days.push({ date: "New Day", rows: [{ time: "", text: "" }], overnight: "" }); })}>+ Add day</button>

        {isPricing && (<>
          {/* Student Payment Plan */}
          <div id="qp-plan" style={groupTitle}>Student Payment Plan</div>
          {pr.paymentPlan.map((x, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <input style={{ ...input, width: 86, flex: "none", fontSize: 12, padding: "5px 8px" }} placeholder={`Payment ${i + 1}`} value={x.label} onChange={(e) => updateP((p) => { p.paymentPlan[i]!.label = e.target.value; })} />
              <input style={{ ...input, width: 70, flex: "none", fontSize: 12, padding: "5px 8px" }} placeholder="$500" value={x.amount} onChange={(e) => updateP((p) => { p.paymentPlan[i]!.amount = e.target.value; })} />
              <input style={{ ...input, flex: 1, fontSize: 12, padding: "5px 8px" }} placeholder="Due date" value={x.due} onChange={(e) => updateP((p) => { p.paymentPlan[i]!.due = e.target.value; })} />
              <button type="button" style={{ ...delX, fontSize: 16, padding: "3px 4px" }} onClick={() => updateP((p) => { p.paymentPlan.splice(i, 1); })}>&times;</button>
            </div>
          ))}
          <button type="button" style={addBtn} onClick={() => updateP((p) => { p.paymentPlan.push({ label: `Payment ${p.paymentPlan.length + 1}`, amount: "", due: "" }); })}>+ Add payment</button>
          <TotalCheck label="The payment plan" parts={pr.paymentPlan.map(x => x.amount)} target={pr.estimatedCost} />
          <label style={label}>Payment plan note</label>
          <textarea style={textarea} rows={2} value={pr.paymentPlanNote} onChange={(e) => updateP((p) => { p.paymentPlanNote = e.target.value; })} />

          {/* Terms */}
          <div id="qp-terms" style={groupTitle}>Terms (footer)</div>
          <textarea style={textarea} rows={4} value={pr.terms} onChange={(e) => updateP((p) => { p.terms = e.target.value; })} />
        </>)}
      </div>

      {/* Sticky footer: Export / Import / Sample / New */}
      <div style={{ flex: "none", display: "flex", gap: 7, padding: "12px 16px", borderTop: "1px solid var(--border-soft)", background: "var(--surface)" }}>
        <button type="button" onClick={onExport} style={{ flex: 1, fontFamily: OSWALD, fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase", color: "#fff", background: "#0B1957", border: "none", borderRadius: 8, padding: 9, cursor: "pointer" }}>Export JSON</button>
        <label style={{ ...footerBtn, color: "#5784E6", background: "var(--sky-bg-soft)", border: "1px solid var(--border)", padding: "9px 12px" }}>
          Import
          <input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
        </label>
        <button type="button" onClick={onSample} style={footerBtn}>Sample</button>
        <button type="button" onClick={onNew} style={footerBtn}>New</button>
      </div>
    </div>
  );
}
