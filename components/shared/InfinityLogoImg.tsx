import Image from "next/image";
import { BRAND } from "@/lib/helpers";

interface Props {
  height?: number;
  showText?: boolean;
}

export default function InfinityLogoImg({ height = 40, showText = true }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <Image
        src="/infinity-logo-navy.png"
        alt="Infinity Tours"
        width={0}
        height={0}
        sizes="200px"
        style={{ height, width: "auto", display: "block" }}
      />
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", fontWeight: 700, fontSize: height * 0.55, color: BRAND.navy, letterSpacing: 0.5 }}>
            INFINITY
          </span>
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 400, fontSize: height * 0.28, color: BRAND.navy, opacity: 0.5, letterSpacing: 2, textTransform: "uppercase" }}>
            TOURS + EVENTS
          </span>
        </div>
      )}
    </div>
  );
}
