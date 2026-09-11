import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";
import { handleFromJimvioSubdomain } from "@/lib/commerce-os/domains/host";
import {
  StorefrontAnnouncement,
  StorefrontHeader,
  StorefrontFooter,
} from "@/components/commerce-os/storefront-sections";

export const dynamic = "force-dynamic";

type Props = {
  children: ReactNode;
  params: Promise<{ handle: string }>;
};

export default async function StorefrontLayout({ children, params }: Props) {
  const { handle } = await params;
  const headerStore = await headers();
  const hostname =
    headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
  const onStoreHost = Boolean(
    headerStore.get("x-jimvio-store-handle") ||
      handleFromJimvioSubdomain(hostname)
  );

  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const settings = store.theme_settings;
  const homeSections = store.published_sections.home;

  const { data: navRows } = await cosTable(supabase, "jimvio_store_navigation")
    .select("location, items")
    .eq("store_id", store.id);

  const headerNav =
    (
      navRows?.find((n: { location: string }) => n.location === "header")
        ?.items as Array<{ label: string; href: string }>
    ) || undefined;
  const footerNav =
    (
      navRows?.find((n: { location: string }) => n.location === "footer")
        ?.items as Array<{ label: string; href: string }>
    ) || undefined;

  const showAnnouncement = homeSections.some(
    (s) => s.type === "announcement" && s.enabled
  );
  const showHeader = homeSections.some((s) => s.type === "header" && s.enabled);
  const showFooter = homeSections.some((s) => s.type === "footer" && s.enabled);
  const announcementSection = homeSections.find((s) => s.type === "announcement");

  const cssVars = {
    ["--store-primary" as string]: settings.primaryColor,
    ["--store-bg" as string]: settings.backgroundColor,
    ["--store-text" as string]: settings.textColor,
    ["--store-radius" as string]: settings.radius,
  };

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{
        ...cssVars,
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
        fontFamily: settings.fontFamily
          ? `${settings.fontFamily}, system-ui, sans-serif`
          : undefined,
      }}
      data-jimvio-storefront={store.handle}
      data-jimvio-store-host={onStoreHost ? "1" : "0"}
    >
      {showAnnouncement ? (
        <StorefrontAnnouncement
          storeName={store.name}
          text={
            (typeof announcementSection?.props?.text === "string"
              ? announcementSection.props.text
              : null) || store.announcement_bar
          }
        />
      ) : null}
      {showHeader ? (
        <StorefrontHeader
          storeName={store.name}
          handle={store.handle}
          logoUrl={store.logo_url || settings.logoUrl}
          navItems={headerNav}
          onStoreHost={onStoreHost}
        />
      ) : null}
      <main className="flex-1">{children}</main>
      {showFooter ? (
        <StorefrontFooter
          storeName={store.name}
          handle={store.handle}
          navItems={footerNav}
          onStoreHost={onStoreHost}
        />
      ) : null}
    </div>
  );
}
