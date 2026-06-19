import type { CSSProperties } from "react";
import type { QuoteData } from "@/lib/quotes/types";
import { parseLinks } from "@/lib/quotes/parseLinks";

// Font stacks resolve to the route-scoped next/font CSS variables (see
// app/(dashboard)/quote-builder/fonts.ts), falling back to literal family names.
const OSWALD = "var(--font-oswald), 'Oswald', sans-serif";
const MULISH = "var(--font-mulish), 'Mulish', sans-serif";
const PINYON = "var(--font-pinyon), 'Pinyon Script', cursive";

const LINK_TEAL = "#3a93a0";

// Render a possibly-link-bearing string as italic body text with italic
// underlined teal anchors (target="_blank").
function LinkedText({ text }: { text: string }) {
  return (
    <>
      {parseLinks(text).map((seg, i) =>
        seg.plain ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <a
            key={i}
            href={seg.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: LINK_TEAL, textDecoration: "underline", fontStyle: "italic" }}
          >
            {seg.text}
          </a>
        )
      )}
    </>
  );
}

const sidebarLink: CSSProperties = {
  display: "block",
  color: LINK_TEAL,
  fontFamily: MULISH,
  fontStyle: "italic",
  textDecoration: "underline",
  fontSize: 12,
  lineHeight: 1.45,
};

const sectionTitle: CSSProperties = {
  fontFamily: OSWALD,
  fontWeight: 600,
  fontSize: 13,
  letterSpacing: ".7px",
  color: "#8b7d67",
  textTransform: "uppercase",
};

// The print-ready quote document. Fixed 816px (US Letter @96dpi). Pure
// presentation — all content comes from `data`.
export default function QuoteDocument({ data }: { data: QuoteData }) {
  const destLine = `${data.destination || ""} ${data.year || ""}`.trim();

  return (
    <div
      className="inf-page"
      style={{
        position: "relative",
        width: 816,
        background: "#ffffff",
        boxShadow: "0 8px 36px rgba(0,0,0,.16)",
        overflow: "hidden",
      }}
    >
      <style>{`
        @media print {
          .inf-screen-only { display: none !important; }
          .inf-page { box-shadow: none !important; }
          @page { size: letter portrait; margin: 0; }
        }
      `}</style>

      {/* HERO */}
      <div style={{ position: "relative", height: 222, overflow: "hidden", background: "#c4ced0" }}>
        {data.heroPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.heroPhotoUrl}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,.45), rgba(0,0,0,0) 45%), linear-gradient(105deg, rgba(0,0,0,.20), rgba(0,0,0,0) 40%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "absolute", top: 22, right: 30, textAlign: "right", pointerEvents: "none" }}>
          <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 44, letterSpacing: "6px", color: "#fff", lineHeight: 0.9, textShadow: "0 1px 10px rgba(0,0,0,.35)" }}>
            INFINITY
          </div>
          <div style={{ fontFamily: OSWALD, fontWeight: 300, fontSize: 12, letterSpacing: "7px", color: "#fff", marginTop: 5, marginRight: 2, textShadow: "0 1px 8px rgba(0,0,0,.35)" }}>
            TOURS + EVENTS
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, bottom: 24, paddingLeft: 26 }}>
          <div style={{ color: "#fff", fontFamily: OSWALD, fontWeight: 600, fontSize: 24, letterSpacing: "1.5px", textTransform: "uppercase", textShadow: "0 1px 8px rgba(0,0,0,.45)" }}>
            {data.group}
          </div>
          <div style={{ width: 180, height: 1, background: "#fff", margin: "7px 0", opacity: 0.85 }} />
          <div style={{ display: "inline-block", color: "#fff", fontFamily: PINYON, fontSize: 36, lineHeight: 0.95, textShadow: "0 1px 8px rgba(0,0,0,.45)" }}>
            {destLine}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {/* SIDEBAR */}
        <div style={{ width: 236, flex: "none", background: "#efece5", padding: "24px 22px 28px", borderRight: "1px solid #b3b3b3" }}>
          <div style={{ ...sectionTitle, lineHeight: 1.05, marginBottom: 9 }}>
            Additional<br />Trip Details
          </div>
          {data.tripLinks.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={sidebarLink}>
              {l.label}
            </a>
          ))}

          <div style={{ marginTop: 16, fontSize: 12, color: "#6f6f6f", fontFamily: MULISH, fontStyle: "italic", lineHeight: 1.4 }}>
            {data.embassyName}
          </div>
          <div style={{ fontSize: 12, color: "#6f6f6f", fontFamily: MULISH, fontStyle: "italic" }}>
            {data.embassyPhone}
          </div>

          <div style={{ ...sectionTitle, marginTop: 18, marginBottom: 6 }}>Hotels</div>
          <a href={data.roomingLink.url} target="_blank" rel="noopener noreferrer" style={{ ...sidebarLink, lineHeight: 1.45 }}>
            {data.roomingLink.label}
          </a>
          {data.hotels.map((h, hi) => (
            <div key={hi}>
              <div style={{ fontFamily: OSWALD, fontWeight: 600, fontSize: 12, letterSpacing: ".6px", color: "#8b7d67", textTransform: "uppercase", marginTop: 13 }}>
                {h.city}
              </div>
              {h.items.map((it, ii) => (
                <div key={ii}>
                  <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 12.5, color: "#4d4d4d", marginTop: 4 }}>
                    {it.name}
                  </div>
                  <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ ...sidebarLink, fontSize: 11.5, lineHeight: 1.4 }}>
                    {it.addr}
                  </a>
                </div>
              ))}
            </div>
          ))}

          <div style={{ ...sectionTitle, marginTop: 18, marginBottom: 6 }}>Activities</div>
          <a href={data.activitiesLink.url} target="_blank" rel="noopener noreferrer" style={{ ...sidebarLink, lineHeight: 1.4 }}>
            {data.activitiesLink.label}
          </a>

          <div style={{ ...sectionTitle, marginTop: 18, marginBottom: 6 }}>Tour Host Details</div>
          <div style={{ fontSize: 12.5, color: "#4d4d4d", fontFamily: MULISH, fontStyle: "italic" }}>{data.hostName}</div>
          <div style={{ fontSize: 12.5, color: "#4d4d4d", fontFamily: MULISH, fontStyle: "italic" }}>{data.hostPhone}</div>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, padding: "22px 24px 30px" }}>
          <div style={{ columnCount: 2, columnGap: "26px" }}>
            {data.days.map((day, di) => {
              const hasOvernight = !!(day.overnight && day.overnight.trim());
              return (
                <div key={di} style={{ breakInside: "avoid", marginBottom: 16 }}>
                  <div style={{ background: "#a9d2d8", color: "#fff", fontFamily: OSWALD, fontWeight: 500, fontSize: 14, letterSpacing: ".6px", textAlign: "center", padding: 6, marginBottom: 8 }}>
                    {day.date}
                  </div>
                  {day.rows.map((row, ri) => (
                    <div key={ri} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 11, lineHeight: 1.32 }}>
                      <div style={{ width: 50, flex: "none", textAlign: "right", color: "#a8a298", fontFamily: MULISH, fontStyle: "italic" }}>
                        {row.time}
                      </div>
                      <div style={{ flex: 1, color: "#4d4d4d", fontFamily: MULISH, fontStyle: "italic" }}>
                        <LinkedText text={row.text} />
                      </div>
                    </div>
                  ))}
                  {hasOvernight && (
                    <div style={{ display: "flex", gap: 8, marginTop: 5, fontSize: 11, lineHeight: 1.32 }}>
                      <div style={{ width: 50, flex: "none", textAlign: "right", color: "#a8a298", fontFamily: MULISH, fontStyle: "italic", fontSize: 9.5 }}>
                        Overnight
                      </div>
                      <div style={{ flex: 1, color: "#4d4d4d", fontFamily: MULISH, fontStyle: "italic" }}>
                        <LinkedText text={day.overnight ?? ""} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ background: "#acd1d7", padding: "15px 28px 17px" }}>
        <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 27, letterSpacing: "4px", color: "#fff", lineHeight: 0.85 }}>
          INFINITY
        </div>
        <div style={{ fontFamily: OSWALD, fontWeight: 300, fontSize: 9, letterSpacing: "5px", color: "rgba(255,255,255,.9)", marginTop: 3 }}>
          TOURS + EVENTS
        </div>
      </div>
    </div>
  );
}
