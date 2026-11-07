import type { NextConfig } from "next";
import { IMAGE_HOSTS } from "./lib/media/image-hosts";

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

  // Prevent flaky SSG timeouts on DB-backed pages during Vercel builds
  // (4-core / 8GB machines with concurrent workers).
  staticPageGenerationTimeout: 180,

  productionBrowserSourceMaps: false,

  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },

  turbopack: {
    root: "",
  },

  images: {
    // Explicit allowlist (lib/media/image-hosts.ts) instead of any host.
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
  },

  experimental: {
    webpackMemoryOptimizations: true,
    // Keep visited/prefetched pages in the browser so moving between
    // Marketplace, Communities, Commerce, Affiliates and UGC is instant.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    serverActions: {
      allowedOrigins: [
        "www.jimvio.com",
        "jimvio.com",
        "*.jimvio.com",
        "localhost:3000",
      ],
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
      // The public supplier directory was retired; stores stay at /vendors/<slug>.
      { source: "/vendors", destination: "/marketplace", permanent: true },
      { source: "/guides", destination: "/getting-started", permanent: true },
      // Dead Campaign Center "Orders" link → marketplace seller orders.
      {
        source: "/ugc/campaign-center/orders",
        destination: "/orders",
        permanent: true,
      },
      {
        source: "/ugc/campaign-center/orders/:path*",
        destination: "/orders",
        permanent: true,
      },
      // Legacy Brand Workspace alias — must not fall through to /ugc/[id].
      {
        source: "/ugc/brand-workspace",
        destination: "/ugc/campaign-center",
        permanent: true,
      },
      {
        source: "/ugc/brand-workspace/:path*",
        destination: "/ugc/campaign-center",
        permanent: true,
      },
      // Creator dashboard entry → public UGC discover board.
      {
        source: "/ugc/dashboard",
        destination: "/ugc",
        permanent: true,
      },
      // Brand Workspace has no /dashboard child; without this redirect Next
      // matches /ugc/[id]/dashboard with id="campaign-center".
      {
        source: "/ugc/campaign-center/dashboard",
        destination: "/ugc/campaign-center",
        permanent: true,
      },

      // /deals was a duplicate page with randomised "HOT DEAL" badges and
      // invented B2B figures; the data-driven deals page is canonical.
      {
        source: "/deals",
        has: [{ type: "host", value: "www.jimvio.com" }],
        destination: "/marketplace/flash-deals",
        permanent: true,
      },
      // Platform-only marketplace aliases. Merchant hosts (*.jimvio.com) must
      // NOT hit these — proxy maps /products → /s/{handle}/collections/all.
      {
        source: "/products",
        has: [{ type: "host", value: "www.jimvio.com" }],
        destination: "/marketplace",
        permanent: true,
      },
      {
        source: "/products/:path*",
        has: [{ type: "host", value: "www.jimvio.com" }],
        destination: "/marketplace/:path*",
        permanent: true,
      },
      {
        source: "/products",
        has: [{ type: "host", value: "localhost" }],
        destination: "/marketplace",
        permanent: false,
      },
      {
        source: "/products/:path*",
        has: [{ type: "host", value: "localhost" }],
        destination: "/marketplace/:path*",
        permanent: false,
      },
      {
        source: "/affiliate",
        has: [{ type: "host", value: "www.jimvio.com" }],
        destination: "/affiliates",
        permanent: true,
      },
      {
        source: "/affiliate/:path*",
        has: [{ type: "host", value: "www.jimvio.com" }],
        destination: "/affiliates/:path*",
        permanent: true,
      },
      {
        source: "/earn",
        has: [{ type: "host", value: "www.jimvio.com" }],
        destination: "/affiliates",
        permanent: true,
      },
      {
        source: "/campaigns",
        has: [{ type: "host", value: "www.jimvio.com" }],
        destination: "/ugc",
        permanent: true,
      },
      {
        source: "/listings/:path*",
        has: [{ type: "host", value: "www.jimvio.com" }],
        destination: "/marketplace/:path*",
        permanent: true,
      },
      {
        source: "/creators/:path*",
        has: [{ type: "host", value: "www.jimvio.com" }],
        destination: "/influencers/:path*",
        permanent: true,
      },
      { source: "/vendors/jimvio-dropshipping", destination: "/vendors/jimvio-store", permanent: true },
      // Company IA — no public IR dossier; keep bookmarks from 404ing.
      { source: "/investor-relations", destination: "/contact?topic=investors", permanent: false },
      // Canonical support form. Topic queries stay on /contact for vendor,
      // creator, press, partnership, and investor inquiries. Host-scoped so
      // merchant storefronts can keep /contact → /pages/contact.
      {
        source: "/contact",
        has: [{ type: "host", value: "www.jimvio.com" }],
        missing: [{ type: "query", key: "topic" }],
        destination: "/help/contact",
        permanent: true,
      },
      {
        source: "/contact",
        has: [{ type: "host", value: "localhost" }],
        missing: [{ type: "query", key: "topic" }],
        destination: "/help/contact",
        permanent: false,
      },

      // Canonical marketplaces (avoid duplicate ?type= indexation)
      {
        source: "/marketplace",
        has: [{ type: "query", key: "type", value: "physical" }],
        destination: "/marketplace/physical",
        permanent: true,
      },
      {
        source: "/marketplace",
        has: [{ type: "query", key: "type", value: "digital" }],
        destination: "/marketplace/digital",
        permanent: true,
      },
      // Community hub: /c → /communities (permanent for bookmarks + SEO)
      { source: "/c", destination: "/communities", permanent: true },
      { source: "/c/:path*", destination: "/communities/:path*", permanent: true },
      // Canonical account destinations
      { source: "/ugc/saved", destination: "/saved", permanent: false },
      { source: "/inbox", destination: "/notifications", permanent: false },
      // Older marketplace message notifications linked here (query string is kept).
      { source: "/dashboard/messages", destination: "/messages", permanent: false },
      // Commerce OS consolidation — Dropshipping OS → Commerce (preserve deep links)
      { source: "/dropshipping", destination: "/commerce", permanent: false },
      {
        source: "/dropshipping/stores",
        destination: "/commerce/connected-stores",
        permanent: false,
      },
      {
        source: "/dropshipping/integrations",
        destination: "/commerce/integrations",
        permanent: false,
      },
      {
        source: "/dropshipping/products",
        destination: "/commerce/channel-products",
        permanent: false,
      },
      {
        source: "/dropshipping/orders",
        destination: "/commerce/channel-orders",
        permanent: false,
      },
      {
        source: "/dropshipping/inventory",
        destination: "/commerce/channel-inventory",
        permanent: false,
      },
      {
        source: "/dropshipping/pricing",
        destination: "/commerce/pricing",
        permanent: false,
      },
      { source: "/dropshipping/sync", destination: "/commerce/sync", permanent: false },
      {
        source: "/dropshipping/api",
        destination: "/commerce/api-keys",
        permanent: false,
      },
      {
        source: "/dropshipping/settings",
        destination: "/commerce/channel-settings",
        permanent: false,
      },
      {
        source: "/dropshipping/dashboard",
        destination: "/commerce",
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/.well-known/bimi/jimvio-bimi.svg",
        headers: [
          { key: "Content-Type", value: "image/svg+xml" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        // Ensure HTML navigations are revalidated so clients never keep
        // stale references to deleted /_next/static chunks after deploys.
        source: "/((?!_next/static|_next/image|favicon.ico|icons|images|hero|sw.js|\\.well-known/bimi).*)",
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
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Live Studio needs first-party camera/mic. Empty allowlists (camera=())
            // force NotAllowedError/"Permission denied" even when the user clicks Allow.
            // Geolocation stays locked except on /settings/privacy, where the user
            // can choose to share a one-time location. Do not grant it to third parties.
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
        ],
      },
      {
        // Later duplicate keys override earlier ones. This page alone may prompt.
        source: "/settings/privacy",
        headers: [
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), display-capture=(self), geolocation=(self), payment=()",
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
