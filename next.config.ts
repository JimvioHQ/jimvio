import type { NextConfig } from "next";

let withBundleAnalyzer: (config: NextConfig) => NextConfig = (c) => c;
if (process.env.ANALYZE === "true") {
  try {
    const mod = require("@next/bundle-analyzer");
    withBundleAnalyzer = mod({ enabled: true });
  } catch { }
}
let nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  turbopack: {
  },

  images: {
    deviceSizes: [640, 750, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "cf.cjdropshipping.com",
      },
      {
        protocol: "https",
        hostname: "oss-cf.cjdropshipping.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  experimental: {
    // webpackMemoryOptimizations: true,
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost", "jimvio.com", "www.jimvio.com"],
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

export default withBundleAnalyzer(nextConfig);
