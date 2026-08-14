import type { NextConfig } from "next";

// Storage images are served from the Supabase project host, which differs
// between production and staging. Derive it from NEXT_PUBLIC_SUPABASE_URL so a
// deploy pointed at another project resolves its own images with no code
// change. When the variable is missing or unparseable, fall back to the
// production host: that is the only project whose images have ever been
// referenced from a build with no environment configured, and leaving the list
// empty would break every stored image instead of just the wrong ones.
const PRODUCTION_IMAGE_HOST = "abqiaxmnasjyqxmgzbqn.supabase.co";

function supabaseImageHost(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return PRODUCTION_IMAGE_HOST;
  try {
    return new URL(url).hostname;
  } catch {
    return PRODUCTION_IMAGE_HOST;
  }
}

const supabaseHost = supabaseImageHost();

const nextConfig: NextConfig = {
  // puppeteer-core and @sparticuz/chromium-min must not be bundled by the
  // server compiler. chromium-min ships no binary (the PDF route downloads
  // Chromium from a remote pack at runtime) so no file tracing is needed.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
