import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // puppeteer-core and @sparticuz/chromium-min must not be bundled by the
  // server compiler. chromium-min ships no binary — the PDF route downloads
  // Chromium from a remote pack at runtime — so no file tracing is needed.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "abqiaxmnasjyqxmgzbqn.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
