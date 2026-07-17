import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdfkit",
    "exceljs",
    "@prisma/client",
    "prisma",
    "maplibre-gl",
    "openai",
    "cloudinary",
    "sharp",
  ],

  productionBrowserSourceMaps: false,

  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },

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
    webpackMemoryOptimizations: true,
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "jimvio.com" }],
        destination: "https://www.jimvio.com/:path*",
        permanent: true,
      },
      { source: "/products", destination: "/marketplace", permanent: true },
      { source: "/products/:path*", destination: "/marketplace", permanent: true },
      { source: "/earn", destination: "/affiliates", permanent: true },
      { source: "/campaigns", destination: "/ugc", permanent: true },
      { source: "/listings/:path*", destination: "/marketplace/:path*", permanent: true },
      { source: "/creators/:path*", destination: "/influencers/:path*", permanent: true },
      // Community hub: /c → /communities (permanent for bookmarks + SEO)
      { source: "/c", destination: "/communities", permanent: true },
      { source: "/c/:path*", destination: "/communities/:path*", permanent: true },
    ];
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
