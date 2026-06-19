import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // puppeteer-core and @sparticuz/chromium must not be bundled by the server
  // compiler — they load native/binary assets at runtime (the quote PDF route).
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // @sparticuz/chromium loads its Chromium binary via a computed path, so
  // Vercel's file tracing misses it. Force the package's files into the PDF
  // route's serverless function. The key is the built route's URL path —
  // the (dashboard) route group is stripped from the URL.
  outputFileTracingIncludes: {
    "/quote-builder/[id]/pdf": ["./node_modules/@sparticuz/chromium/**"],
  },
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
