import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // puppeteer-core and @sparticuz/chromium must not be bundled by the server
  // compiler — they load native/binary assets at runtime (the quote PDF route).
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
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
