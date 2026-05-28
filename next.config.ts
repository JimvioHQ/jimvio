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
      },
    ],
  },

  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  async headers() {
    return [
      {
        source: "/api/payments/binancepay/initiate",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://www.jimvio.com",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Vary",
            value: "Origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
