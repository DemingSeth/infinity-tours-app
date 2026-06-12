import { MapPin } from "lucide-react";
import { getMapUrl } from "@/lib/helpers";

// Shared Google Maps link for itinerary items. Renders ONLY when the item has a
// non-empty, non-whitespace address. The URL prefers a pasted map_link and
// otherwise builds a Google Maps search for the encoded address (via getMapUrl,
// so every view uses the same URL pattern). The visible label is always
// "Google Maps".
export default function GoogleMapsLink({
  address,
  mapLink = null,
  color = "#0369a1",
  fontSize = 11,
  style,
}: {
  address: string | null | undefined;
  mapLink?: string | null;
  color?: string;
  fontSize?: number;
  style?: React.CSSProperties;
}) {
  if (!address || !address.trim()) return null;
  const url = getMapUrl(mapLink, address);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        color, fontSize, fontWeight: 600, textDecoration: "none",
        ...style,
      }}
    >
      <MapPin size={fontSize} style={{ flexShrink: 0 }} />
      Google Maps
    </a>
  );
}
