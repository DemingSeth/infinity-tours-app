// Small color helpers for the raised, deeper Overview style (October 2026).
// Inputs are the app's #rrggbb status and host colors; anything else (a CSS
// variable, a short hex) is returned unchanged so callers never break.

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

/** A darker shade of the color: amount 0.25 moves a quarter of the way to black. */
export function deepen(hex: string, amount = 0.25): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(...(rgb.map(v => v * (1 - amount)) as [number, number, number]));
}

/** The color at the given opacity, for tinted shadows. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** A top-lit gradient from the color to a deeper shade of it. */
export function deepGradient(hex: string, amount = 0.22): string {
  return `linear-gradient(180deg, ${hex} 0%, ${deepen(hex, amount)} 100%)`;
}
