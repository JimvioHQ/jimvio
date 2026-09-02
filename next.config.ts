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
      { source: "/products/:path*", destination: "/marketplace/:path*", permanent: true },
      { source: "/affiliate", destination: "/affiliates", permanent: true },
      { source: "/affiliate/:path*", destination: "/affiliates/:path*", permanent: true },
      { source: "/earn", destination: "/affiliates", permanent: true },
      { source: "/campaigns", destination: "/ugc", permanent: true },
      { source: "/listings/:path*", destination: "/marketplace/:path*", permanent: true },
      { source: "/creators/:path*", destination: "/influencers/:path*", permanent: true },
      { source: "/vendors/jimvio-dropshipping", destination: "/vendors/jimvio-store", permanent: true },
      // Community hub: /c → /communities (permanent for bookmarks + SEO)
      { source: "/c", destination: "/communities", permanent: true },
      { source: "/c/:path*", destination: "/communities/:path*", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        // Ensure HTML navigations are revalidated so clients never keep
        // stale references to deleted /_next/static chunks after deploys.
        source: "/((?!_next/static|_next/image|favicon.ico|icons|images|hero|sw.js).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
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
