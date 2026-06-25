import Image from "next/image";

// Brand lockup = the infinity MARK (crisp PNG) + a LIVE Fjalla One wordmark, so
// "INFINITY / TOURS + EVENTS" renders as sharp as the live tour-name text beside
// it (the full-lockup PNG's wordmark looked soft when scaled down). Proportions
// follow the 2025 brand art, measured against the block height H:
//   INFINITY cap ≈ 62% of H, TOURS+EVENTS cap ≈ 26%, gap ≈ 13%; the mark height
//   ≈ the full two-line wordmark block so they read as one balanced lockup.
// Fjalla One cap ≈ 0.73·font-size, so font-size ≈ cap / 0.73.

const FJALLA = "'Fjalla One', Georgia, sans-serif";

export default function BrandLockup({
  height,
  variant = "light",
  print = false,
}: {
  /** Overall lockup height (≈ mark height ≈ two-line wordmark block height). */
  height: number;
  /** light = white text on navy/photo; navy = #0B1957 text on light/cream. */
  variant?: "light" | "navy";
  /** Print path uses a plain eager <img> for the mark (no next/image optimizer). */
  print?: boolean;
}) {
  const H = height;
  const color = variant === "navy" ? "#0B1957" : "#ffffff";
  const subColor = variant === "navy" ? "#0B1957" : "rgba(255,255,255,0.85)";
  const mark = variant === "navy" ? "/infinity-mark-navy.png" : "/infinity-mark-light.png";

  const markStyle: React.CSSProperties = { height: H, width: "auto", display: "block", flexShrink: 0 };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: H * 0.2, flexShrink: 0 }}>
      {print ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mark} alt="Infinity Tours + Events" style={markStyle} />
      ) : (
        <Image src={mark} alt="Infinity Tours + Events" width={0} height={0} sizes="120px" style={markStyle} />
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span style={{ fontFamily: FJALLA, fontWeight: 400, fontSize: H * 0.82, lineHeight: 0.82, letterSpacing: "0.04em", color, whiteSpace: "nowrap" }}>
          INFINITY
        </span>
        <span style={{ fontFamily: FJALLA, fontWeight: 400, fontSize: H * 0.32, lineHeight: 1, letterSpacing: "0.2em", color: subColor, textTransform: "uppercase", marginTop: H * 0.05, whiteSpace: "nowrap" }}>
          TOURS + EVENTS
        </span>
      </div>
    </div>
  );
}
