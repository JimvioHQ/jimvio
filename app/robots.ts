import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
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
          "/settings/",
          "/admin/",
          "/api/",
          "/c/",
          "/products",
          "/offline",
          "/maintenance",
          "/*?*",
        ],
      },
    ],
    host: SITE.url,
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
