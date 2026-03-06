import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "minio-production-8a8b.up.railway.app",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9002",
      },
    ],
  },
};

export default nextConfig;
