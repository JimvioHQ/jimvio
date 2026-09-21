import type { ReactNode } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreCollections,
  loadStoreProducts,
} from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";
import { handleFromJimvioSubdomain } from "@/lib/commerce-os/domains/host";
import { themeSettingsToCssVars } from "@/lib/commerce-os/themes/registry";
import {
  buildMissingStorefrontMetadata,
  buildStorefrontMetadata,
} from "@/lib/commerce-os/storefront-metadata";
import "@/styles/storefront-product-grid.css";
import {
  StorefrontAnnouncement,
  StorefrontHeader,
  StorefrontFooter,
} from "@/components/commerce-os/storefront-sections";
import { StorefrontMobileNav } from "@/components/commerce-os/storefront-mobile-nav";
import { mergeStorefrontHeaderNav } from "@/lib/commerce-os/storefront/header-nav";
import { productsOnSale } from "@/lib/commerce-os/storefront/sale-products";
import { mobileNavOffsetVar } from "@/lib/commerce-os/storefront/related-products";

export const dynamic = "force-dynamic";

type Props = {
  children: ReactNode;
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) return buildMissingStorefrontMetadata();
  return buildStorefrontMetadata(store, {
    themeLogoUrl: store.theme_settings?.logoUrl ?? null,
  });
}

export default async function StorefrontLayout({ children, params }: Props) {
  const { handle } = await params;
  const headerStore = await headers();
  const hostname =
    headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
  const onStoreHost = Boolean(
    headerStore.get("x-jimvio-store-handle") ||
      handleFromJimvioSubdomain(hostname)
  );
  const requestPath =
    headerStore.get("x-jimvio-pathname") ||
    headerStore.get("x-invoke-path") ||
    "";
  const minimalChrome =
    requestPath === "/checkout" ||
    requestPath.startsWith("/checkout?") ||
    requestPath === "/login" ||
    requestPath.startsWith("/login?") ||
    requestPath === "/register" ||
    requestPath.startsWith("/register?") ||
    requestPath.includes("/checkout") ||
    /\/s\/[^/]+\/(checkout|login|register)(\/|$|\?)/.test(requestPath);

  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const settings = store.theme_settings;
  const homeSections = store.published_sections.home;
  const mobileNavStyle = settings.mobileNavStyle || "bottom";

  const [{ data: navRows }, collections, products, { data: aboutPage }] =
    await Promise.all([
      cosTable(supabase, "jimvio_store_navigation")
        .select("location, items")
        .eq("store_id", store.id),
      loadStoreCollections(supabase, store.id, { limit: 8 }),
      loadStoreProducts(supabase, store.id, { limit: 24, sort: "manual" }),
      cosTable(supabase, "jimvio_store_pages")
        .select("id")
        .eq("store_id", store.id)
        .eq("handle", "about")
        .eq("published", true)
        .maybeSingle(),
    ]);

  const savedHeader =
    (
      navRows?.find((n: { location: string }) => n.location === "header")
        ?.items as Array<{ label: string; href: string }>
    ) || undefined;
  const footerNav =
    (
      navRows?.find((n: { location: string }) => n.location === "footer")
        ?.items as Array<{ label: string; href: string }>
    ) || undefined;

  const headerNav = mergeStorefrontHeaderNav({
    saved: savedHeader,
    collections,
    hasSaleProducts: productsOnSale(products).length > 0,
    hasAbout: Boolean(aboutPage),
  });

  const showAnnouncement =
    !minimalChrome &&
    homeSections.some((s) => s.type === "announcement" && s.enabled);
  const showHeader =
    !minimalChrome &&
    homeSections.some((s) => s.type === "header" && s.enabled);
  const showFooter =
    !minimalChrome &&
    homeSections.some((s) => s.type === "footer" && s.enabled);
  const announcementSection = homeSections.find((s) => s.type === "announcement");

  const cssVars = themeSettingsToCssVars(settings);

  return (
    <div
      className={`flex min-h-dvh flex-col ${
        !minimalChrome && mobileNavStyle === "bottom" ? "pb-16 lg:pb-0" : ""
      }`}
      style={{
        ...cssVars,
        ["--store-mobile-nav-h" as string]: minimalChrome
          ? "0px"
          : mobileNavOffsetVar(mobileNavStyle),
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
        fontSize: `calc(100% * var(--store-font-scale, 1))`,
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
          sticky={settings.stickyHeader !== false}
          centered={
            settings.headerAlign === "centered" ||
            settings.headerStyle === "centered"
          }
          showPoweredBy={false}
          storeId={store.id}
          currency={store.default_currency}
          mobileNavStyle={mobileNavStyle}
        />
      ) : null}
      <main className="flex-1">{children}</main>
      {showFooter ? (
        <StorefrontFooter
          storeName={store.name}
          handle={store.handle}
          navItems={footerNav}
          onStoreHost={onStoreHost}
          logoUrl={store.logo_url || settings.logoUrl}
          showPoweredBy={false}
          social={store.social}
        />
      ) : null}
      {!minimalChrome && mobileNavStyle === "bottom" ? (
        <StorefrontMobileNav
          handle={store.handle}
          storeId={store.id}
          onStoreHost={onStoreHost}
        />
      ) : null}
    </div>
  );
}
