import { MapPin } from "lucide-react";
import { getMapUrl } from "@/lib/helpers";

// Shared Google Maps link for itinerary items. Renders whenever the item has a
// non-empty (non-whitespace) map_link — on every item type, regardless of
// whether an address is set. An empty map_link shows nothing: there is no
// address-based fallback for an empty field. The href prefers the pasted
// map_link and only resolves to an address search for known demo-placeholder
// links (via getMapUrl). The visible label is always "Google Maps".
export default function GoogleMapsLink({
  address = null,
  mapLink = null,
  color = "#0369a1",
  fontSize = 11,
  style,
}: {
  address?: string | null | undefined;
  mapLink?: string | null;
  color?: string;
  fontSize?: number;
  style?: React.CSSProperties;
}) {
  if (!mapLink || !mapLink.trim()) return null;
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
