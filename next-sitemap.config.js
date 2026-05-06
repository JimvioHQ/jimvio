// /** @type {import('next-sitemap').IConfig} */
// module.exports = {
//   siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://jimvio.com',
//   generateRobotsTxt: true,
//   sitemapSize: 7000,
//   exclude: ['/dashboard/*', '/admin/*', '/api/*'],
//   robotsTxtOptions: {
//     policies: [
//       {
//         userAgent: '*',
//         allow: '/',
//         disallow: ['/dashboard', '/admin', '/api'],
//       },
//     ],
//     additionalSitemaps: [
//       'https://jimvio.com/sitemap.xml',
//     ],
//   },
// }
/** @type {import('next-sitemap').IConfig} */

const SITE_URL = "https://www.jimvio.com";

module.exports = {
  siteUrl: SITE_URL,

  // ─── OUTPUT ────────────────────────────────────────────────────────────────
  generateRobotsTxt: true, // auto-generate robots.txt
  generateIndexSitemap: true, // create sitemap-index.xml
  sitemapSize: 5000, // max URLs per child sitemap
  outDir: "public",

  // ─── EXCLUSIONS ────────────────────────────────────────────────────────────
  // Pages that must NEVER be indexed
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

    // Parameterised / filter URLs  (handled by robots.txt Disallow too)
    "/marketplace?*",
    "/search?*",
    "/*?sort=*",
    "/*?page=*",
    "/*?cat=*",
    "/*?filter=*",
    "/*?q=*",
    "/*?ref=*",
    "/*?utm_*",

    // Utility / legal (add back if you DO want these indexed)
    "/404",
    "/500",
    "/terms",
    "/privacy",
    "/cookie-policy",

    // Prevent self-reference recursion  ← FIX #2
    "/sitemap.xml",
    "/sitemap-index.xml",
  ],

  // ─── ROBOTS.TXT ────────────────────────────────────────────────────────────
  robotsTxtOptions: {
    // FIX #3: canonical domain only in Host directive
    // FIX #5: block all parameterised URLs
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

          // FIX #5 – block all query-param URLs
          "/*?", // any URL with ANY query string
          "/*?sort=",
          "/*?page=",
          "/*?cat=",
          "/*?filter=",
          "/*?q=",
          "/*?ref=",
          "/*?utm_source=",
          "/*?utm_medium=",
          "/*?utm_campaign=",
        ],
      },
    ],

    additionalSitemaps: [`${SITE_URL}/sitemap.xml`],
  },

  // ─── TRANSFORM (add lastmod / priority / changefreq per URL) ───────────────
  transform: async (config, url) => {
    // Strip any accidental localhost references  ← FIX #1
    if (
      url.includes("localhost") ||
      url.includes("127.0.0.1") ||
      url.includes("0.0.0.0")
    ) {
      return null; // omit from sitemap
    }

    // Prevent self-referencing sitemap inside sitemap  ← FIX #2
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

    // Change frequency rules
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

  // ─── ADDITIONAL PATHS ──────────────────────────────────────────────────────
  // FIX #7 – make sure core pages always appear in the sitemap
  additionalPaths: async (config) => [
    await config.transform(config, `${SITE_URL}/`),
    await config.transform(config, `${SITE_URL}/marketplace`),
    await config.transform(config, `${SITE_URL}/communities`),
    await config.transform(config, `${SITE_URL}/earn`),
    await config.transform(config, `${SITE_URL}/campaigns`),
  ],
};
