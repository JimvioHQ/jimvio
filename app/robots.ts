import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/** Authenticated hub tools — not for indexing. Public `/communities` + `/communities/[slug]` stay allowlisted. */
const HUB_TOOL_DISALLOWS = [
  "/communities/messages",
  "/communities/bookmarks",
  "/communities/wallet",
  "/communities/analytics",
  "/communities/settings",
  "/communities/profile",
  "/communities/live",
  "/communities/spaces",
  "/communities/missions",
  "/communities/courses",
  "/communities/events",
  "/communities/community",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // "/og?*" is longer than "/*?*", so link-preview crawlers may fetch OG cards.
        allow: ["/", "/favicon.ico", "/favicon.png", "/favicon.svg", "/og?*"],
        disallow: [
          "/login",
          "/register",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/auth/",
          "/cart",
          "/checkout/",
          "/account/",
          "/dashboard/",
          "/creator/",
          "/settings/",
          "/admin/",
          "/media/admin",
          "/media/preview",
          "/api/",
          "/c/",
          ...HUB_TOOL_DISALLOWS,
          "/products",
          "/offline",
          "/maintenance",
          "/*?*",
        ],
      },
    ],
    host: SITE.url,
    sitemap: [`${SITE.url}/sitemap.xml`, `${SITE.url}/media/sitemap.xml`],
  };
}
