import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_ICON_SETTING_KEY } from "@/lib/site-icons/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let version = "default";
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("platform_settings")
      .select("updated_at")
      .eq("key", SITE_ICON_SETTING_KEY)
      .maybeSingle();
    if (data?.updated_at) version = encodeURIComponent(data.updated_at);
  } catch {
    // Keep the repository fallback icons available if settings cannot be read.
  }

  const icon = (key: string) => `/api/site-icons/${key}?v=${version}`;

  return {
    name: "Jimvio",
    short_name: "Jimvio",
    description: "All-in-one creator commerce and digital business platform",
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
      { src: icon("pwa-192"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon("pwa-384"), sizes: "384x384", type: "image/png", purpose: "any" },
      { src: icon("pwa-512"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon("apple-touch"), sizes: "180x180", type: "image/png", purpose: "any" },
      { src: icon("pwa-maskable-192"), sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: icon("pwa-maskable-512"), sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: icon("pwa-mono-192"), sizes: "192x192", type: "image/png", purpose: "monochrome" },
      { src: icon("pwa-mono-512"), sizes: "512x512", type: "image/png", purpose: "monochrome" },
    ],
    shortcuts: [
      { name: "Feed", short_name: "Feed", url: "/communities", icons: [{ src: icon("pwa-192"), sizes: "192x192" }] },
      { name: "Marketplace", short_name: "Market", url: "/marketplace", icons: [{ src: icon("pwa-192"), sizes: "192x192" }] },
      { name: "Messages", short_name: "Messages", url: "/communities/messages", icons: [{ src: icon("pwa-192"), sizes: "192x192" }] },
    ],
  };
}
