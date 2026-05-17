import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      }
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  }
};

export default nextConfig;
