"use client";

interface Props {
  height?: number;
  color?: string;
  showText?: boolean;
}

export default function InfinityLogo({ height = 28, color = "#fff", showText = true }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
      <svg width={height * 1.8} height={height} viewBox="0 0 90 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M45 25 C45 25 35 8 22 8 C10 8 2 15.5 2 25 C2 34.5 10 42 22 42 C35 42 45 25 45 25 Z" stroke={color} strokeWidth="4.5" fill="none" strokeLinecap="round"/>
        <path d="M45 25 C45 25 55 42 68 42 C80 42 88 34.5 88 25 C88 15.5 80 8 68 8 C55 8 45 25 45 25 Z" stroke={color} strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      </svg>
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: height * 0.55, color, letterSpacing: 0.5 }}>
            INFINITY
          </span>
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400, fontSize: height * 0.28, color, opacity: 0.7, letterSpacing: 2, textTransform: "uppercase" }}>
            TOURS + EVENTS
          </span>
        </div>
      )}
    </div>
  );
}
