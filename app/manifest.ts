import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#F95405",
    theme_color: "#F95405",
    lang: "en",
    dir: "ltr",
    categories: ["shopping", "social", "business"],
    icons: [
      {
        src: "/api/site-icons/pwa-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/site-icons/pwa-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/site-icons/apple-touch",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/site-icons/pwa-384",
        sizes: "384x384",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/site-icons/pwa-maskable-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/api/site-icons/pwa-maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/api/site-icons/pwa-mono-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "monochrome",
      },
      {
        src: "/api/site-icons/pwa-mono-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "monochrome",
      },
    ],
    shortcuts: [
      {
        name: "Feed",
        short_name: "Feed",
        url: "/communities",
        icons: [{ src: "/api/site-icons/pwa-192", sizes: "192x192" }],
      },
      {
        name: "Marketplace",
        short_name: "Market",
        url: "/marketplace",
        icons: [{ src: "/api/site-icons/pwa-192", sizes: "192x192" }],
      },
      {
        name: "Messages",
        short_name: "Messages",
        url: "/communities/messages",
        icons: [{ src: "/api/site-icons/pwa-192", sizes: "192x192" }],
      },
    ],
  };
}
