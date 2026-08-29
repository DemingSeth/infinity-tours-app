import BrandLockup from "@/components/shared/BrandLockup";

// Brand lockup (crisp mark PNG + live Fjalla One wordmark) for card surfaces:
// the login page and the public access-code card. Renders the navy variant in
// light mode and the light variant in dark mode (globals.css swaps them via
// .theme-light-only / .theme-dark-only), so the mark never vanishes on a dark
// card. Thin wrapper over BrandLockup so the wordmark proportions live in one
// place.
export default function InfinityLogoImg({ height = 40 }: { height?: number }) {
  return (
    <>
      <BrandLockup height={height} variant="navy" className="theme-light-only" />
      <BrandLockup height={height} variant="light" className="theme-dark-only" />
    </>
  );
}
