import BrandLockup from "@/components/shared/BrandLockup";

// Navy brand lockup (crisp mark PNG + live Fjalla One wordmark) for light/cream
// surfaces — the login page and the public access-code card. Thin wrapper over
// BrandLockup so the wordmark proportions live in one place.
export default function InfinityLogoImg({ height = 40 }: { height?: number }) {
  return <BrandLockup height={height} variant="navy" />;
}
