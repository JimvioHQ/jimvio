/** @type {import('next-sitemap').IConfig} */

const SITE_URL = "https://www.jimvio.com";

module.exports = {
  siteUrl: SITE_URL,

  // ─── OUTPUT ───────────────────────────────────────────────────────────────
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  sitemapSize: 5000,
  // outDir removed — next-sitemap defaults to "public" already

  // ─── EXCLUSIONS ───────────────────────────────────────────────────────────
  exclude: [
    // Auth / account flows
    "/login",
    "/register",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/auth/*",

    // Transactional / user-session pages
    "/cart",
    "/checkout",
    "/checkout/*",
    "/order-confirmation",
    "/order/*",
    "/account",
    "/account/*",
    "/dashboard",
    "/dashboard/*",
    "/profile/edit",
    "/settings",
    "/settings/*",
    "/notifications",
    "/messages",
    "/messages/*",

    // Admin / internal
    "/admin",
    "/admin/*",
    "/api/*",

    // Utility / legal
    "/404",
    "/500",
    "/terms",
    "/privacy",
    "/cookie-policy",

    // Prevent self-reference recursion
    "/sitemap.xml",
    "/sitemap-index.xml",
  ],

  // ─── ROBOTS.TXT ───────────────────────────────────────────────────────────
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Auth & transactional
          "/login",
          "/register",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/auth/",
          "/cart",
          "/checkout",
          "/account/",
          "/dashboard/",
          "/settings/",
          "/admin/",
          "/api/",

          // Block ALL query-string URLs (single pattern covers all cases)
          "/*?*",
        ],
      },
    ],
    // FIX: removed self-referencing additionalSitemaps — causes a loop
    // The sitemap-index.xml is already auto-generated and registered by next-sitemap
  },

  // ─── TRANSFORM ────────────────────────────────────────────────────────────
  transform: async (config, url) => {
    // Strip any accidental localhost references
    if (
      url.includes("localhost") ||
      url.includes("127.0.0.1") ||
      url.includes("0.0.0.0")
    ) {
      return null;
    }

    // Prevent self-referencing sitemap inside sitemap
    if (url.includes("/sitemap.xml") || url.includes("/sitemap-index.xml")) {
      return null;
    }

    // Priority rules
    const priorities = {
      "/": 1.0,
      "/marketplace": 0.9,
      "/communities": 0.85,
      "/earn": 0.85,
      "/campaigns": 0.85,
    };

    const priority = priorities[url.replace(SITE_URL, "")] ?? 0.7;

    const isProduct = url.includes("/products/") || url.includes("/listings/");
    const isProfile = url.includes("/creators/") || url.includes("/users/");
    const changefreq = isProduct
      ? "daily"
      : isProfile
        ? "weekly"
        : url === SITE_URL
          ? "daily"
          : "weekly";

    return {
      loc: url,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
      alternateRefs: [],
    };
  },

  // ─── ADDITIONAL PATHS ─────────────────────────────────────────────────────
  // FIX: filter out null values to prevent crashes when transform returns null
  additionalPaths: async (config) => {
    const paths = await Promise.all([
      config.transform(config, `${SITE_URL}/`),
      config.transform(config, `${SITE_URL}/marketplace`),
      config.transform(config, `${SITE_URL}/communities`),
      config.transform(config, `${SITE_URL}/earn`),
      config.transform(config, `${SITE_URL}/campaigns`),
    ]);
    return paths.filter(Boolean);
  },
};