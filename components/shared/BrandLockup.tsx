import Image from "next/image";

// Brand lockup = the infinity MARK (crisp PNG) + a LIVE Fjalla One wordmark, so
// "INFINITY / TOURS + EVENTS" renders as sharp as the live tour-name text beside
// it (the full-lockup PNG's wordmark looked soft when scaled down). Proportions
// follow the 2025 brand art, measured against the block height H:
//   INFINITY cap ≈ 62% of H, TOURS+EVENTS cap ≈ 26%, gap ≈ 13%; the mark height
//   ≈ the full two-line wordmark block so they read as one balanced lockup.
// Fjalla One cap ≈ 0.73·font-size, so font-size ≈ cap / 0.73.
//
// Every dimension is in em against a container font-size of H px, so a CSS
// class can shrink the whole lockup proportionally at narrow widths (see the
// .brand-lockup rules in globals.css) without touching the proportions.

const FJALLA = "'Fjalla One', Georgia, sans-serif";

export default function BrandLockup({
  height,
  variant = "light",
  print = false,
  className,
}: {
  /** Overall lockup height (≈ mark height ≈ two-line wordmark block height). */
  height: number;
  /** light = white text on navy/photo; navy = #0B1957 text on light/cream. */
  variant?: "light" | "navy";
  /** Print path uses a plain eager <img> for the mark (no next/image optimizer). */
  print?: boolean;
  /** Responsive hook, e.g. "brand-lockup--nav" (see globals.css). */
  className?: string;
}) {
  const H = height;
  const color = variant === "navy" ? "#0B1957" : "#ffffff";
  const subColor = variant === "navy" ? "#0B1957" : "rgba(255,255,255,0.85)";
  const mark = variant === "navy" ? "/infinity-mark-navy.png" : "/infinity-mark-light.png";

  const markStyle: React.CSSProperties = { height: "1em", width: "auto", display: "block", flexShrink: 0 };

  return (
    <div className={["brand-lockup", className].filter(Boolean).join(" ")} style={{ display: "flex", alignItems: "center", gap: "0.2em", flexShrink: 0, fontSize: H, lineHeight: 1 }}>
      {print ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mark} alt="Infinity Tours + Events" style={markStyle} />
      ) : (
        <Image src={mark} alt="Infinity Tours + Events" width={0} height={0} sizes="120px" style={markStyle} />
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span style={{ fontFamily: FJALLA, fontWeight: 400, fontSize: "0.82em", lineHeight: 0.82, letterSpacing: "0.04em", color, whiteSpace: "nowrap" }}>
          INFINITY
        </span>
        <span style={{ fontFamily: FJALLA, fontWeight: 400, fontSize: "0.32em", lineHeight: 1, letterSpacing: "0.2em", color: subColor, textTransform: "uppercase", marginTop: "0.16em", whiteSpace: "nowrap" }}>
          TOURS + EVENTS
        </span>
      </div>
    </div>
  );
}
