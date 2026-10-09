import type { NextConfig } from "next";
import { getRemoteImagePatterns } from "./src/lib/image-config";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Keep the local review controls clear of the floating development badge.
  devIndicators: false,
  productionBrowserSourceMaps: false,
  images: {
    // In dev, localhost images can't pass through the optimization proxy
    // (Next.js blocks private IP resolution). Skip optimization locally.
    unoptimized: isDev,
    remotePatterns: getRemoteImagePatterns(process.env.NEXT_PUBLIC_IMAGE_HOSTS, isDev),
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ],
};

export default nextConfig;
