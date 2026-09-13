import Link from "next/link";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";

export type StorefrontCollectionTileData = {
  id: string;
  title: string;
  handle: string;
  image_url?: string | null;
  description?: string | null;
  product_count?: number | null;
};

export function StorefrontCollectionTile({
  collection,
  handle,
  onStoreHost = false,
}: {
  collection: StorefrontCollectionTileData;
  handle: string;
  onStoreHost?: boolean;
}) {
  const href = storefrontHref(
    handle,
    `/collections/${collection.handle}`,
    { onStoreHost }
  );
  const count =
    typeof collection.product_count === "number" && collection.product_count >= 0
      ? collection.product_count
      : null;

  return (
    <Link
      href={href}
      className="group relative flex min-h-[140px] min-w-0 flex-col overflow-hidden rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)] shadow-[var(--store-shadow,0_1px_2px_rgba(15,23,42,0.04))] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-primary,#FF5A1F)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[color-mix(in_srgb,var(--store-primary,#FF5A1F)_12%,white)]">
        {collection.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.image_url}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="grid h-full place-items-center text-2xl font-bold text-white"
            style={{ background: "var(--store-primary,#FF5A1F)" }}
            aria-hidden
          >
            {collection.title.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="line-clamp-2 text-sm font-semibold text-[var(--store-text,#111827)]">
          {collection.title}
        </p>
        {collection.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--store-muted,#6B7280)]">
            {collection.description}
          </p>
        ) : null}
        {count != null ? (
          <p className="mt-auto pt-2 text-[11px] font-medium text-[var(--store-muted,#6B7280)]">
            {count} {count === 1 ? "product" : "products"}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
