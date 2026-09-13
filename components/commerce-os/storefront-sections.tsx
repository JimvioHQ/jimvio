import Link from "next/link";
import type { CSSProperties } from "react";
import type { ThemeSection } from "@/lib/commerce-os/themes/registry";
import {
  normalizeStorefrontHref,
  storefrontHref,
} from "@/lib/commerce-os/storefront-url";
import { StorefrontProductCard } from "@/components/commerce-os/storefront-product-card";
import { StorefrontHeaderActions } from "@/components/commerce-os/storefront-header-actions";
import { StorefrontCollectionTile } from "@/components/commerce-os/storefront-collection-tile";
import { splitHeadlineAccent } from "@/lib/commerce-os/storefront/headline";
import { categoryNavTiles } from "@/lib/commerce-os/storefront/collection-slice";

/** Builder canvas only. Production omits this and uses real viewport breakpoints. */
export type StorefrontPreviewDevice =
  | "desktop"
  | "laptop"
  | "tablet"
  | "mobile"
  | "custom";

function previewCompact(device?: StorefrontPreviewDevice) {
  return device === "mobile" || device === "tablet";
}

function previewDesktopChrome(device?: StorefrontPreviewDevice): boolean | null {
  if (!device) return null;
  return device === "desktop" || device === "laptop" || device === "custom";
}

/** Production uses CSS breakpoints; builder canvas forces compact/desktop classes. */
function viewportClass(
  device: StorefrontPreviewDevice | undefined,
  production: string,
  compact: string,
  desktop: string
) {
  if (!device) return production;
  return previewCompact(device) ? compact : desktop;
}

type ProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number | string | null;
  compare_at_price?: number | string | null;
  currency?: string | null;
  images?: unknown;
  short_description?: string | null;
  inventory_quantity?: number | null;
  track_inventory?: boolean | null;
  vendor_id?: string | null;
};

export type StorefrontCollectionTile = {
  id: string;
  title: string;
  handle: string;
  image_url?: string | null;
  description?: string | null;
  product_count?: number | null;
};

export function StorefrontAnnouncement({
  text,
  storeName,
  previewDevice,
}: {
  text?: string | null;
  storeName: string;
  previewDevice?: StorefrontPreviewDevice;
}) {
  const raw = text?.trim() || `Welcome to ${storeName}`;
  const parts = raw
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  const messages = parts.length > 1 ? parts : [raw];
  const compact = previewCompact(previewDevice);
  const showAside = previewDesktopChrome(previewDevice);

  return (
    <div
      className={viewportClass(
        previewDevice,
        "px-3 py-2 text-center text-[11px] font-medium leading-snug tracking-wide sm:px-4 sm:text-left sm:text-xs",
        "px-3 py-2 text-center text-[11px] font-medium leading-snug tracking-wide",
        "px-4 py-2 text-[11px] font-medium tracking-wide sm:text-xs"
      )}
      style={{
        background: "var(--store-announce-bg,#0F172A)",
        color: "var(--store-announce-text,#F8FAFC)",
      }}
    >
      <div
        className={`mx-auto flex min-w-0 max-w-[var(--store-max-width,80rem)] flex-wrap items-center gap-x-4 gap-y-1 ${
          compact ? "justify-center" : "justify-center sm:justify-between"
        }`}
      >
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {messages.slice(0, compact ? 2 : 3).map((m) => (
            <span key={m} className="max-w-full break-words opacity-90">
              {m}
            </span>
          ))}
        </div>
        {showAside === null ? (
          <span className="hidden opacity-55 sm:inline">Shop with confidence</span>
        ) : showAside ? (
          <span className="opacity-55">Shop with confidence</span>
        ) : null}
      </div>
    </div>
  );
}

export function StorefrontHeader({
  storeName,
  handle,
  logoUrl,
  navItems,
  onStoreHost = false,
  sticky = true,
  centered = false,
  showPoweredBy = true,
  storeId,
  currency,
  previewDevice,
}: {
  storeName: string;
  handle: string;
  logoUrl?: string | null;
  navItems?: Array<{ label: string; href: string }>;
  onStoreHost?: boolean;
  sticky?: boolean;
  centered?: boolean;
  showPoweredBy?: boolean;
  storeId?: string;
  currency?: string | null;
  /** Builder canvas only — forces mobile/desktop chrome without viewport breakpoints */
  previewDevice?: StorefrontPreviewDevice;
}) {
  const linkOpts = { onStoreHost };
  const home = storefrontHref(handle, "", linkOpts);
  const items =
    navItems && navItems.length
      ? navItems.map((item) => ({
          ...item,
          href: normalizeStorefrontHref(handle, item.href, linkOpts),
        }))
      : [
          { label: "Home", href: home },
          {
            label: "All products",
            href: storefrontHref(handle, "/collections/all", linkOpts),
          },
          {
            label: "Search",
            href: storefrontHref(handle, "/search", linkOpts),
          },
        ];

  const compact = previewCompact(previewDevice);
  const showDesktopNav = previewDesktopChrome(previewDevice);

  return (
    <header
      className={`${sticky ? "sticky top-0" : "relative"} z-30 min-w-0 overflow-x-clip border-b border-[var(--store-border,rgba(0,0,0,0.06))] backdrop-blur-md`}
      style={{ background: "color-mix(in srgb, var(--store-header-bg, var(--store-surface,#FFFFFF)) 95%, transparent)" }}
    >
      <div
        className={`mx-auto flex max-w-[var(--store-max-width,80rem)] min-w-0 items-center ${
          compact ? "gap-2 px-3 py-2.5" : "gap-3 px-4 py-3 sm:gap-4 sm:px-6"
        } ${centered ? "flex-col text-center" : ""}`}
      >
        <Link href={home} className="flex min-w-0 max-w-[58%] items-center gap-2.5 sm:max-w-none sm:shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={storeName}
              className="shrink-0 rounded-full object-contain"
              style={{ height: "var(--store-logo-size,36px)", width: "var(--store-logo-size,36px)" }}
            />
          ) : (
            <span
              className="grid shrink-0 place-items-center rounded-full text-xs font-bold text-white"
              style={{
                background: "var(--store-primary,#FF5A1F)",
                height: "var(--store-logo-size,36px)",
                width: "var(--store-logo-size,36px)",
              }}
              aria-hidden
            >
              {storeName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span
              className={`block font-semibold leading-snug tracking-tight text-[var(--store-text,#111827)] ${
                compact ? "line-clamp-2 text-sm" : "line-clamp-2 text-sm sm:line-clamp-none sm:text-base"
              }`}
            >
              {storeName}
            </span>
            {showPoweredBy ? (
              showDesktopNav === null ? (
                <span className="hidden text-[10px] text-[var(--store-muted,#6B7280)] sm:block">
                  Powered by Jimvio
                </span>
              ) : showDesktopNav ? (
                <span className="block text-[10px] text-[var(--store-muted,#6B7280)]">
                  Powered by Jimvio
                </span>
              ) : null
            ) : null}
          </span>
        </Link>

        <nav
          className={`min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm ${
            centered ? "justify-center" : "justify-center"
          } ${
            showDesktopNav === null
              ? "hidden lg:flex"
              : showDesktopNav
                ? "flex"
                : "hidden"
          }`}
          aria-label="Store"
          data-storefront-chrome="desktop-nav"
        >
          {items.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[var(--store-text,#111827)]/75 transition hover:bg-black/[0.04] hover:text-[var(--store-text,#111827)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={`ml-auto flex min-w-0 shrink-0 items-center gap-2 ${centered ? "w-full justify-center" : ""}`}>
          <StorefrontHeaderActions
            handle={handle}
            storeId={storeId}
            currency={currency}
            onStoreHost={onStoreHost}
            previewDevice={previewDevice}
            navItems={items}
          />
        </div>
      </div>
    </header>
  );
}

export function StorefrontHero({
  headline,
  headlineAccent,
  subhead,
  cta,
  ctaHref,
  ctaSecondary,
  ctaSecondaryHref,
  eyebrow,
  imageUrl,
  layout = "left",
  handle,
  onStoreHost = false,
  buttonStyle = "filled",
  height = "lg",
  overlay = "0",
  trustItems,
  previewDevice,
}: {
  headline?: string;
  headlineAccent?: string;
  subhead?: string;
  cta?: string;
  ctaHref?: string;
  ctaSecondary?: string;
  ctaSecondaryHref?: string;
  eyebrow?: string;
  imageUrl?: string;
  layout?: string;
  handle: string;
  onStoreHost?: boolean;
  buttonStyle?: string;
  height?: string;
  overlay?: string;
  trustItems?: string;
  previewDevice?: StorefrontPreviewDevice;
}) {
  const linkOpts = { onStoreHost };
  const shopPath =
    typeof ctaHref === "string" && ctaHref.startsWith("/")
      ? ctaHref
      : "/collections/all";
  const secondaryPath =
    typeof ctaSecondaryHref === "string" && ctaSecondaryHref.startsWith("/")
      ? ctaSecondaryHref
      : "/collections/all";
  const centered = layout === "center";
  const compact = previewCompact(previewDevice);
  const desktopChrome = previewDesktopChrome(previewDevice);
  const py = viewportClass(
    previewDevice,
    height === "xl"
      ? "py-10 sm:py-20 lg:py-28"
      : height === "md"
        ? "py-8 sm:py-12 lg:py-16"
        : "py-10 sm:py-14 lg:py-20",
    height === "xl" ? "py-10" : "py-8",
    height === "xl"
      ? "py-20 sm:py-28"
      : height === "md"
        ? "py-12 sm:py-16"
        : "py-14 sm:py-20"
  );
  const overlayOpacity = Math.min(Math.max(Number(overlay) || 0, 0), 0.7);
  const primaryStyle: CSSProperties =
    buttonStyle === "outline" || buttonStyle === "ghost" || buttonStyle === "link"
      ? {
          background: "transparent",
          color: "var(--store-btn, var(--store-primary,#FF5A1F))",
          border: "1px solid var(--store-btn, var(--store-primary,#FF5A1F))",
          borderRadius: "var(--store-btn-radius,9999px)",
          minHeight: "var(--store-btn-height,44px)",
        }
      : buttonStyle === "soft"
        ? {
            background:
              "color-mix(in srgb, var(--store-btn, var(--store-primary,#FF5A1F)) 15%, white)",
            color: "var(--store-btn, var(--store-primary,#FF5A1F))",
            borderRadius: "var(--store-btn-radius,9999px)",
            minHeight: "var(--store-btn-height,44px)",
          }
        : {
            background: "var(--store-btn, var(--store-primary,#FF5A1F))",
            color: "var(--store-btn-text,#FFFFFF)",
            borderRadius: "var(--store-btn-radius,9999px)",
            minHeight: "var(--store-btn-height,44px)",
          };

  const trusts = (trustItems || "")
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const { lead, accent } = splitHeadlineAccent(headline || "Shop the collection", headlineAccent);
  const showMediaColumn = !centered;
  const twoCol =
    !compact &&
    showMediaColumn &&
    desktopChrome !== false;

  return (
    <section className="relative overflow-x-clip border-b border-[var(--store-border,rgba(0,0,0,0.04))]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--store-primary,#FF5A1F) 14%, white) 0%, var(--store-bg,#F8FAFC) 48%, white 100%)",
        }}
        aria-hidden
      />
      {imageUrl && centered ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-[var(--store-bg,#F8FAFC)]"
            style={{ opacity: 0.55 + overlayOpacity }}
            aria-hidden
          />
        </>
      ) : null}
      <div
        className={`relative mx-auto grid max-w-[var(--store-max-width,80rem)] min-w-0 ${viewportClass(
          previewDevice,
          "gap-6 px-4 sm:gap-8 sm:px-6",
          "gap-6 px-3",
          "gap-8 px-4 sm:px-6"
        )} ${py} ${
          twoCol ? "lg:grid-cols-[1.1fr_0.9fr] lg:items-center" : ""
        } ${centered ? "text-center" : ""}`}
      >
        <div className={centered ? "mx-auto max-w-2xl" : "min-w-0"}>
          {eyebrow ? (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--store-primary,#FF5A1F)_12%,white)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--store-primary,#FF5A1F)]">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={`max-w-full break-words font-semibold tracking-tight text-[var(--store-text,#111827)] sm:max-w-xl ${
              eyebrow ? "mt-4" : ""
            } ${viewportClass(
              previewDevice,
              "text-[1.75rem] leading-[1.15] sm:text-4xl lg:text-5xl lg:leading-[1.1]",
              "text-[1.75rem] leading-[1.15]",
              "text-4xl leading-[1.1] sm:text-5xl"
            )}`}
            style={{ fontFamily: "var(--store-heading-font, inherit)" }}
          >
            <span className="block">{lead}</span>
            {accent ? (
              <span className="mt-1 block text-[var(--store-accent,var(--store-primary,#FF5A1F))]">
                {accent}
              </span>
            ) : null}
          </h1>
          {subhead ? (
            <p
              className={`mt-4 max-w-lg leading-relaxed text-[var(--store-muted,#6B7280)] ${viewportClass(
                previewDevice,
                "text-sm sm:text-base lg:text-lg",
                "text-sm",
                "text-base sm:text-lg"
              )}`}
            >
              {subhead}
            </p>
          ) : null}
          <div
            className={`mt-8 flex gap-3 ${viewportClass(
              previewDevice,
              "flex-col sm:flex-row sm:flex-wrap",
              "flex-col",
              "flex-wrap"
            )} ${centered ? "justify-center" : ""}`}
          >
            <Link
              href={storefrontHref(handle, shopPath, linkOpts)}
              className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-95 ${viewportClass(
                previewDevice,
                "w-full sm:w-auto",
                "w-full",
                ""
              )}`}
              style={primaryStyle}
            >
              {cta || "Shop now"} →
            </Link>
            <Link
              href={storefrontHref(handle, secondaryPath, linkOpts)}
              className={`inline-flex items-center justify-center border border-[var(--store-border,rgba(0,0,0,0.1))] bg-[var(--store-surface,#fff)]/80 px-5 py-2.5 text-sm font-semibold text-[var(--store-text,#111827)] backdrop-blur transition hover:bg-white ${viewportClass(
                previewDevice,
                "w-full sm:w-auto",
                "w-full",
                ""
              )}`}
              style={{
                borderRadius: "var(--store-btn-radius,9999px)",
                minHeight: "var(--store-btn-height,44px)",
              }}
            >
              {ctaSecondary || "Browse all products"}
            </Link>
          </div>
          {trusts.length ? (
            <ul
              className={`mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[var(--store-text,#111827)]/75 ${
                centered ? "justify-center" : ""
              }`}
            >
              {trusts.map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--store-primary,#FF5A1F)" }}
                  />
                  {t}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {showMediaColumn ? (
          <div
            className={`relative min-w-0 ${
              imageUrl
                ? ""
                : desktopChrome === null
                  ? "hidden lg:block"
                  : compact || desktopChrome === false
                    ? "hidden"
                    : ""
            }`}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className={`h-full w-full rounded-[var(--store-card-radius,16px)] object-cover shadow-[var(--store-shadow)] ${
                  compact ? "min-h-[200px] max-h-[260px]" : "min-h-[280px] sm:min-h-[380px]"
                }`}
              />
            ) : (
              <div
                className={`relative overflow-hidden rounded-[var(--store-card-radius,16px)] ${
                  compact ? "min-h-[180px]" : "min-h-[280px] sm:min-h-[380px]"
                }`}
                style={{
                  background:
                    "linear-gradient(160deg, color-mix(in srgb, var(--store-primary,#FF5A1F) 88%, #7c2d12) 0%, color-mix(in srgb, var(--store-primary,#FF5A1F) 35%, white) 100%)",
                }}
                aria-hidden
              >
                <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 70% 30%, white, transparent 55%)" }} />
                <div className="relative flex h-full min-h-[inherit] flex-col items-center justify-center px-6 py-10 text-center text-white">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-white/20 text-2xl font-bold backdrop-blur">
                    {(headline || "S").slice(0, 1).toUpperCase()}
                  </span>
                  <p className="mt-4 text-lg font-semibold tracking-tight">{headline || "Official store"}</p>
                </div>
              </div>
            )}
            {trusts.length && desktopChrome !== false && !compact ? (
              <div className="pointer-events-none absolute right-3 top-3 hidden w-[min(220px,46%)] space-y-2 lg:block">
                {trusts.slice(0, 3).map((label) => (
                  <div
                    key={label}
                    className="rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-surface,#fff)]/95 px-3.5 py-3 shadow-sm backdrop-blur"
                  >
                    <p className="text-sm font-semibold text-[var(--store-text,#111827)]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StorefrontCategoryNav({
  handle,
  collections,
  onStoreHost = false,
  title = "Shop by category",
  layout = "icons",
  previewDevice,
}: {
  handle: string;
  collections: StorefrontCollectionTile[];
  onStoreHost?: boolean;
  title?: string;
  layout?: string;
  previewDevice?: StorefrontPreviewDevice;
}) {
  const linkOpts = { onStoreHost };
  const tiles = categoryNavTiles(collections);
  const compact = previewCompact(previewDevice);
  const useTiles = layout === "tiles";

  if (useTiles) {
    return (
      <section className="min-w-0 overflow-x-clip border-b border-[var(--store-border,rgba(0,0,0,0.05))] bg-[var(--store-surface,#fff)]">
        <div className={`mx-auto max-w-[var(--store-max-width,80rem)] py-8 ${compact ? "px-3" : "px-4 sm:px-6"}`}>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--store-text,#111827)]">{title}</h2>
            <Link
              href={storefrontHref(handle, "/collections/all", linkOpts)}
              className="shrink-0 text-sm font-semibold text-[var(--store-primary,#FF5A1F)]"
            >
              View all →
            </Link>
          </div>
          <div
            className={
              compact
                ? "grid grid-cols-2 gap-2.5"
                : "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            }
          >
            {collections.map((c) => (
              <StorefrontCollectionTile
                key={c.id}
                collection={c}
                handle={handle}
                onStoreHost={onStoreHost}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 overflow-x-clip border-b border-[var(--store-border,rgba(0,0,0,0.05))] bg-[var(--store-surface,#fff)]">
      <div className={`mx-auto max-w-[var(--store-max-width,80rem)] py-8 ${compact ? "px-3" : "px-4 sm:px-6"}`}>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--store-text,#111827)]">
            {title}
          </h2>
          <Link
            href={storefrontHref(handle, "/collections/all", linkOpts)}
            className="shrink-0 text-sm font-semibold text-[var(--store-primary,#FF5A1F)]"
          >
            View all categories →
          </Link>
        </div>
        <div
          className={
            compact
              ? "flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "flex gap-3 overflow-x-auto rounded-[1.5rem] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-bg,#F8FAFC)]/60 px-2 py-3 pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-6 xl:grid-cols-8"
          }
        >
          {tiles.map((c) => (
            <Link
              key={c.id}
              href={storefrontHref(handle, `/collections/${c.handle}`, linkOpts)}
              className={`flex shrink-0 flex-col items-center gap-2 rounded-[var(--store-card-radius,16px)] px-2 py-2 text-center transition hover:bg-white ${
                compact ? "w-[84px]" : "w-[84px] sm:w-auto"
              }`}
            >
              <span
                className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl text-sm font-bold text-white shadow-sm"
                style={{ background: "var(--store-primary,#FF5A1F)" }}
              >
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  c.title.slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="line-clamp-2 text-[11px] font-semibold text-[var(--store-text,#111827)]">
                {c.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorefrontFeaturedProducts({
  title,
  handle,
  products,
  onStoreHost = false,
  subtitle,
  previewDevice,
  storeId,
  layout = "grid",
}: {
  title?: string;
  handle: string;
  products: ProductCard[];
  onStoreHost?: boolean;
  subtitle?: string;
  previewDevice?: StorefrontPreviewDevice;
  storeId?: string;
  layout?: "grid" | "rail";
}) {
  const linkOpts = { onStoreHost };
  const compact = previewCompact(previewDevice);
  const rail = layout === "rail";
  const gridClass = rail
    ? "mt-6 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    : previewDevice === "mobile"
      ? "mt-6 grid grid-cols-2 gap-2.5"
      : previewDevice === "tablet"
        ? "mt-7 grid grid-cols-2 gap-4"
        : "mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:[grid-template-columns:repeat(var(--store-grid-cols,3),minmax(0,1fr))]";
  const padClass = compact ? "px-3" : "px-4 sm:px-6";
  return (
    <section
      className={`mx-auto max-w-[var(--store-max-width,80rem)] min-w-0 ${padClass}`}
      style={{ paddingTop: "var(--store-section-space,3.5rem)", paddingBottom: "var(--store-section-space,3.5rem)" }}
    >
      {title ? (
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2
              className={`font-semibold tracking-tight text-[var(--store-text,#111827)] ${
                previewDevice === "mobile" ? "text-xl" : "text-2xl"
              }`}
              style={{ fontFamily: "var(--store-heading-font, inherit)" }}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--store-muted,#6B7280)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <Link
            href={storefrontHref(handle, "/collections/all", linkOpts)}
            className="shrink-0 text-sm font-semibold text-[var(--store-primary,#FF5A1F)]"
          >
            View all →
          </Link>
        </div>
      ) : null}
      {!products.length ? (
        <p className="mt-8 rounded-[var(--store-card-radius,16px)] border border-dashed border-[var(--store-border,rgba(0,0,0,0.1))] bg-[var(--store-surface,#fff)]/50 px-6 py-12 text-center text-sm text-[var(--store-muted,#6B7280)]">
          No products published yet.
        </p>
      ) : (
        <div className={gridClass}>
          {products.map((p) => (
            <div
              key={p.id}
              className={rail ? "w-[min(180px,70vw)] shrink-0" : undefined}
            >
              <StorefrontProductCard
                product={p}
                handle={handle}
                onStoreHost={onStoreHost}
                storeId={storeId}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function StorefrontTrustBar({
  headline,
  subhead,
  previewDevice,
}: {
  headline?: string;
  subhead?: string;
  previewDevice?: StorefrontPreviewDevice;
}) {
  const items = (subhead || "Secure checkout · Verified sourcing · Order tracking")
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  const compact = previewCompact(previewDevice);
  const cols =
    compact
      ? items.length >= 4
        ? "grid-cols-2"
        : "grid-cols-1"
      : items.length >= 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-3";
  return (
    <section className="border-y border-[var(--store-border,rgba(0,0,0,0.05))] bg-[var(--store-surface,#fff)]">
      <div className={`mx-auto max-w-[var(--store-max-width,80rem)] py-10 ${compact ? "px-3" : "px-4 sm:px-6"}`}>
        {headline ? (
          <p className="text-center text-sm font-semibold text-[var(--store-text,#111827)]">
            {headline}
          </p>
        ) : null}
        <div className={`grid gap-4 ${cols} ${headline ? "mt-5" : ""}`}>
          {items.map((item) => (
            <div
              key={item}
              className="rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.05))] bg-[var(--store-bg,#F8FAFC)] px-4 py-5 text-center text-sm font-medium text-[var(--store-text,#111827)]/80"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorefrontFooter({
  storeName,
  handle,
  navItems,
  onStoreHost = false,
  previewDevice,
  logoUrl,
  showPoweredBy = true,
}: {
  storeName: string;
  handle: string;
  navItems?: Array<{ label: string; href: string }>;
  onStoreHost?: boolean;
  previewDevice?: StorefrontPreviewDevice;
  logoUrl?: string | null;
  showPoweredBy?: boolean;
}) {
  const linkOpts = { onStoreHost };
  const items =
    navItems && navItems.length
      ? navItems.map((item) => ({
          ...item,
          href: normalizeStorefrontHref(handle, item.href, linkOpts),
        }))
      : [
          { label: "About", href: storefrontHref(handle, onStoreHost ? "/about" : "/pages/about", linkOpts) },
          { label: "Contact", href: storefrontHref(handle, onStoreHost ? "/contact" : "/pages/contact", linkOpts) },
          { label: "Terms", href: storefrontHref(handle, onStoreHost ? "/terms" : "/pages/terms", linkOpts) },
          { label: "Privacy", href: storefrontHref(handle, onStoreHost ? "/privacy" : "/pages/privacy", linkOpts) },
          { label: "Refunds", href: storefrontHref(handle, onStoreHost ? "/refund-policy" : "/pages/refund-policy", linkOpts) },
          { label: "Shipping", href: storefrontHref(handle, onStoreHost ? "/shipping-policy" : "/pages/shipping-policy", linkOpts) },
          { label: "Account", href: storefrontHref(handle, "/account", linkOpts) },
        ];

  return (
    <footer className="mt-auto border-t border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-surface,#fff)]">
      <div
        className={`mx-auto flex max-w-[var(--store-max-width,80rem)] flex-col gap-8 py-12 ${
          previewCompact(previewDevice)
            ? "px-3"
            : "px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6"
        }`}
      >
        <div className="flex items-start gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={storeName}
              className="h-10 w-10 rounded-full object-contain"
            />
          ) : (
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
              style={{ background: "var(--store-primary,#FF5A1F)" }}
              aria-hidden
            >
              {storeName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-[var(--store-text,#111827)]">{storeName}</p>
            {showPoweredBy ? (
              <p className="mt-1 text-xs text-[var(--store-muted,#6B7280)]">
                Powered by Jimvio
              </p>
            ) : null}
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--store-muted,#6B7280)]">
          {items.map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href} className="hover:text-[var(--store-text,#111827)]">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function renderHomeSections(opts: {
  sections: ThemeSection[];
  storeName: string;
  handle: string;
  logoUrl?: string | null;
  announcementBar?: string | null;
  products: ProductCard[];
  headerNav?: Array<{ label: string; href: string }>;
  footerNav?: Array<{ label: string; href: string }>;
  onStoreHost?: boolean;
}) {
  const onStoreHost = opts.onStoreHost ?? false;
  return opts.sections
    .filter((s) => s.enabled)
    .map((section) => {
      const props = section.props || {};
      switch (section.type) {
        case "announcement":
          return (
            <StorefrontAnnouncement
              key={section.id}
              storeName={opts.storeName}
              text={
                (typeof props.text === "string" ? props.text : null) ||
                opts.announcementBar
              }
            />
          );
        case "header":
          return (
            <StorefrontHeader
              key={section.id}
              storeName={opts.storeName}
              handle={opts.handle}
              logoUrl={opts.logoUrl}
              navItems={opts.headerNav}
              onStoreHost={onStoreHost}
            />
          );
        case "hero":
          return (
            <StorefrontHero
              key={section.id}
              handle={opts.handle}
              onStoreHost={onStoreHost}
              headline={
                typeof props.headline === "string" ? props.headline : opts.storeName
              }
              subhead={typeof props.subhead === "string" ? props.subhead : undefined}
              cta={typeof props.cta === "string" ? props.cta : undefined}
            />
          );
        case "banner":
          return (
            <StorefrontTrustBar
              key={section.id}
              headline={typeof props.headline === "string" ? props.headline : undefined}
              subhead={typeof props.subhead === "string" ? props.subhead : undefined}
            />
          );
        case "featured_products":
        case "collections":
          return (
            <StorefrontFeaturedProducts
              key={section.id}
              handle={opts.handle}
              onStoreHost={onStoreHost}
              title={
                typeof props.title === "string"
                  ? props.title
                  : section.type === "collections"
                    ? "Collections"
                    : "Featured"
              }
              products={opts.products}
            />
          );
        case "footer":
          return (
            <StorefrontFooter
              key={section.id}
              storeName={opts.storeName}
              handle={opts.handle}
              navItems={opts.footerNav}
              onStoreHost={onStoreHost}
            />
          );
        default:
          return null;
      }
    });
}
