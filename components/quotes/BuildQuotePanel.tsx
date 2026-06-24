"use client";

import type { CSSProperties } from "react";
import type { QuoteData } from "@/lib/quotes/types";

// The right-docked authoring drawer. Field groups mirror QuoteData exactly and
// every edit produces a new QuoteData via `onChange`, so the document updates
// live. Marked `inf-screen-only` so it is hidden in print/PDF.

const OSWALD = "var(--font-oswald), 'Oswald', sans-serif";
const MULISH = "var(--font-mulish), 'Mulish', sans-serif";

const groupTitle: CSSProperties = {
  fontFamily: OSWALD,
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: ".8px",
  textTransform: "uppercase",
  color: "#3c8d9a",
  borderBottom: "1px solid #e1ddd3",
  paddingBottom: 5,
  margin: "20px 0 8px",
};

const label: CSSProperties = {
  display: "block",
  fontSize: 10,
  letterSpacing: ".4px",
  textTransform: "uppercase",
  color: "#9a927f",
  margin: "8px 0 2px",
};

const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: MULISH,
  fontSize: 13,
  padding: "7px 9px",
  border: "1px solid #d8d6cc",
  borderRadius: 6,
  color: "#333",
  background: "#fff",
};

const urlInput: CSSProperties = {
  ...input,
  fontSize: 11,
  padding: "5px 8px",
  border: "1px solid #e3e1d8",
  color: "#777",
  marginTop: 4,
};

const addBtn: CSSProperties = {
  fontFamily: OSWALD,
  fontSize: 11,
  letterSpacing: ".4px",
  textTransform: "uppercase",
  background: "#eef4f4",
  color: "#3c8d9a",
  border: "1px solid #cfe3e6",
  borderRadius: 6,
  padding: "6px 11px",
  cursor: "pointer",
};

const subAddBtn: CSSProperties = {
  ...addBtn,
  fontSize: 10,
  background: "#f3f6f6",
  border: "1px solid #d9e7e9",
  borderRadius: 5,
  padding: "5px 9px",
  marginTop: 6,
};

const delX: CSSProperties = {
  flex: "none",
  background: "none",
  border: "none",
  color: "#b06a5c",
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
  color: "#b06a5c",
  cursor: "pointer",
};

const footerBtn: CSSProperties = {
  fontFamily: OSWALD,
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: ".5px",
  textTransform: "uppercase",
  color: "#7a7363",
  background: "#f0eee6",
  border: "1px solid #ddd8cc",
  borderRadius: 6,
  padding: "9px 11px",
  cursor: "pointer",
};

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

  return (
    <div
      className="inf-screen-only"
      style={{
        flex: "none",
        width: 384,
        height: "100%",
        background: "#f7f6f2",
        borderRight: "1px solid #d8d5cb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header bar */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", padding: "14px 18px", background: "#3c8d9a", color: "#fff" }}>
        <div style={{ fontFamily: OSWALD, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", fontSize: 15 }}>Build Quote</div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 28px", fontFamily: MULISH }}>
        {/* Header */}
        <div style={{ ...groupTitle, marginTop: 2 }}>Header</div>
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
          <div key={hi} style={{ border: "1px solid #e1ddd3", borderRadius: 8, padding: 10, marginBottom: 10, background: "#fff" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                style={{ flex: 1, boxSizing: "border-box", fontFamily: OSWALD, fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase", fontSize: 13, padding: "6px 8px", border: "1px solid #d8d6cc", borderRadius: 6, color: "#4d4d4d", background: "#fff" }}
                placeholder="City"
                value={h.city}
                onChange={(e) => update((d) => { d.hotels[hi]!.city = e.target.value; })}
              />
              <button type="button" style={delWord} onClick={() => update((d) => { d.hotels.splice(hi, 1); })}>Delete</button>
            </div>
            {h.items.map((it, ii) => (
              <div key={ii} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #ece9df" }}>
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

        {/* Daily Itinerary */}
        <div style={{ ...groupTitle, margin: "20px 0 6px" }}>Daily Itinerary</div>
        <div style={{ fontSize: 11, color: "#9a927f", marginBottom: 10, lineHeight: 1.4 }}>
          Add a link inside any line with <span style={{ fontFamily: "monospace", background: "#efece2", padding: "1px 4px", borderRadius: 3 }}>[label](https://…)</span>
        </div>
        {data.days.map((day, di) => (
          <div key={di} style={{ border: "1px solid #e1ddd3", borderRadius: 8, padding: 10, marginBottom: 10, background: "#fff" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                style={{ flex: 1, boxSizing: "border-box", fontFamily: OSWALD, fontWeight: 500, letterSpacing: ".4px", fontSize: 13, padding: "6px 8px", border: "1px solid #d8d6cc", borderRadius: 6, color: "#4d4d4d", background: "#fff" }}
                placeholder="Day label (e.g. Wed. June 29)"
                value={day.date}
                onChange={(e) => update((d) => { d.days[di]!.date = e.target.value; })}
              />
              <button type="button" style={delWord} onClick={() => update((d) => { d.days.splice(di, 1); })}>Delete</button>
            </div>
            {day.rows.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 6 }}>
                <input style={{ width: 64, flex: "none", boxSizing: "border-box", fontFamily: MULISH, fontSize: 11, padding: "5px 6px", border: "1px solid #e3e1d8", borderRadius: 6, color: "#777", background: "#fff" }} placeholder="Time" value={row.time} onChange={(e) => update((d) => { d.days[di]!.rows[ri]!.time = e.target.value; })} />
                <input style={{ ...input, flex: 1, fontSize: 12, padding: "5px 8px" }} placeholder="Activity (supports [label](url))" value={row.text} onChange={(e) => update((d) => { d.days[di]!.rows[ri]!.text = e.target.value; })} />
                <button type="button" style={{ ...delX, fontSize: 16, padding: "3px 4px" }} onClick={() => update((d) => { d.days[di]!.rows.splice(ri, 1); })}>&times;</button>
              </div>
            ))}
            <button type="button" style={subAddBtn} onClick={() => update((d) => { d.days[di]!.rows.push({ time: "", text: "" }); })}>+ Row</button>
            <label style={{ ...label, margin: "10px 0 2px" }}>Overnight</label>
            <input style={{ ...input, fontSize: 12, padding: "5px 8px" }} placeholder="Overnight stay (optional, supports links)" value={day.overnight ?? ""} onChange={(e) => update((d) => { d.days[di]!.overnight = e.target.value; })} />
          </div>
        ))}
        <button type="button" style={{ ...addBtn, padding: "7px 13px" }} onClick={() => update((d) => { d.days.push({ date: "New Day", rows: [{ time: "", text: "" }], overnight: "" }); })}>+ Add day</button>
      </div>

      {/* Sticky footer: Export / Import / Sample / New */}
      <div style={{ flex: "none", display: "flex", gap: 7, padding: "12px 16px", borderTop: "1px solid #e1ddd3", background: "#fff" }}>
        <button type="button" onClick={onExport} style={{ flex: 1, fontFamily: OSWALD, fontWeight: 600, fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase", color: "#fff", background: "#3c8d9a", border: "none", borderRadius: 6, padding: 9, cursor: "pointer" }}>Export JSON</button>
        <label style={{ ...footerBtn, color: "#3c8d9a", background: "#eef4f4", border: "1px solid #cfe3e6", padding: "9px 12px" }}>
          Import
          <input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
        </label>
        <button type="button" onClick={onSample} style={footerBtn}>Sample</button>
        <button type="button" onClick={onNew} style={footerBtn}>New</button>
      </div>
    </div>
  );
}
