import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAdminProductDetail } from "@/services/products";
import { AdminProductDetailActions } from "@/components/admin/products/admin-product-detail-actions";
import { StatusPill } from "@/components/ui/admin";
import { formatAdminMoney } from "@/lib/admin/format-money";
import { absoluteTime, cn, formatNumber } from "@/lib/utils";
import {
  ArrowLeft,
  Package,
  Building2,
  Star,
  Eye,
  ShoppingBag,
  Truck,
  Layers,
  Hash,
  Globe,
  Tag,
  Clock,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

function Card({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
        {Icon && <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono = false }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[var(--color-border)]/60 last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={cn(
          "text-[12.5px] text-[var(--color-text-primary)] text-right min-w-0 break-words",
          mono && "font-mono text-[11px]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SourceBadge({ source }: { source?: string | null }) {
  if (!source) return null;
  const styles: Record<string, string> = {
    cj: "bg-violet-50 text-violet-700 ring-violet-600/20",
    shopify: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    vendor: "bg-sky-50 text-sky-700 ring-sky-600/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ring-1",
        styles[source] ?? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] ring-[var(--color-border)]"
      )}
    >
      {source}
    </span>
  );
}

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminProductDetail(id);
  if (!detail) notFound();

  const { product, images, cjPid, orderCount, reviewCount, averageRating, recentOrderItems } = detail;
  const vendor = product.vendors;
  const category = product.product_categories;
  const variants = product.product_variants ?? [];
  const shipping = product.product_shipping_options ?? [];
  const meta = (product.source_metadata ?? {}) as Record<string, unknown>;
  const currency = (product.currency as string) ?? "USD";
  const trackInventory = Boolean(product.track_inventory);
  const inventory = Number(product.inventory_quantity ?? 0);
  const lowStockThreshold = Number(product.low_stock_threshold ?? 5);
  const isLowStock = trackInventory && inventory <= lowStockThreshold;

  return (
    <div className="space-y-6 max-w-[1400px] pb-10">
      <nav className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)]">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Products
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)] font-medium truncate max-w-[280px]">
          {String(product.name ?? "Product")}
        </span>
      </nav>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row gap-6">
          <div className="flex gap-3 shrink-0">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)]">
              {images[0] ? (
                <Image src={images[0]} alt={String(product.name)} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package className="h-8 w-8 text-[var(--color-text-muted)]/40" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="hidden sm:flex flex-col gap-2 max-h-32 overflow-y-auto">
                {images.slice(1, 5).map((url) => (
                  <div
                    key={url}
                    className="relative w-14 h-14 rounded-lg overflow-hidden ring-1 ring-[var(--color-border)] shrink-0"
                  >
                    <Image src={url} alt="" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={String(product.status ?? "draft")} />
              <SourceBadge source={product.source as string | null} />
              {Boolean(product.is_featured) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-600/20">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  Featured
                </span>
              )}
              {Boolean(product.affiliate_enabled) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-600/20">
                  Affiliate {product.affiliate_commission_rate ? `${product.affiliate_commission_rate}%` : "on"}
                </span>
              )}
              {isLowStock && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-600/20">
                  <AlertCircle className="h-3 w-3" />
                  Low stock
                </span>
              )}
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {String(product.name)}
              </h1>
              <p className="mt-1 text-[13px] text-[var(--color-text-muted)] font-mono truncate">
                /{String(product.slug)}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-[13px]">
              <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">
                {formatAdminMoney(Number(product.price ?? 0), currency)}
              </span>
              {product.compare_at_price ? (
                <span className="text-[var(--color-text-muted)] line-through tabular-nums">
                  {formatAdminMoney(Number(product.compare_at_price), currency)}
                </span>
              ) : null}
              {product.cost_price ? (
                <span className="text-[var(--color-text-muted)]">
                  Cost {formatAdminMoney(Number(product.cost_price), currency)}
                </span>
              ) : null}
            </div>

            {product.short_description ? (
              <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)] max-w-3xl">
                {String(product.short_description)}
              </p>
            ) : null}
          </div>

          <div className="lg:shrink-0">
            <AdminProductDetailActions
              productId={id}
              status={String(product.status ?? "draft")}
              source={product.source as string | null}
              cjPid={cjPid}
              slug={String(product.slug)}
              vendorName={vendor?.business_name}
              hasImages={images.length > 0}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Views", value: formatNumber(Number(product.view_count ?? 0)), icon: Eye },
          { label: "Sales", value: formatNumber(Number(product.sale_count ?? 0)), icon: ShoppingBag },
          { label: "Orders", value: formatNumber(orderCount), icon: Package },
          { label: "Reviews", value: reviewCount > 0 ? `${reviewCount}${averageRating ? ` · ${averageRating}★` : ""}` : "—", icon: Star },
          { label: "Variants", value: String(variants.length), icon: Layers },
          { label: "Inventory", value: trackInventory ? String(inventory) : "Not tracked", icon: Hash },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-2">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Product details" icon={Package}>
            <DetailRow label="Type" value={String(product.product_type ?? "—")} />
            <DetailRow label="SKU" value={String(product.sku ?? "—")} mono />
            <DetailRow label="Category" value={category?.name ?? "—"} />
            <DetailRow
              label="Digital"
              value={product.is_digital ? "Yes" : "No — requires shipping"}
            />
            <DetailRow label="Pricing" value={String(product.pricing_type ?? "one_time")} />
            {product.billing_period ? (
              <DetailRow label="Billing" value={String(product.billing_period)} />
            ) : null}
            <DetailRow label="Active" value={product.is_active ? "Yes" : "No"} />
            <DetailRow label="Created" value={absoluteTime(String(product.created_at ?? ""))} />
            <DetailRow label="Updated" value={absoluteTime(String(product.updated_at ?? ""))} />
            {product.cj_last_synced_at ? (
              <DetailRow label="CJ synced" value={absoluteTime(String(product.cj_last_synced_at))} />
            ) : null}
          </Card>

          {product.description ? (
            <Card title="Description" icon={Globe}>
              <div
                className="prose prose-sm max-w-none text-[var(--color-text-secondary)] [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: String(product.description) }}
              />
            </Card>
          ) : null}

          {variants.length > 0 && (
            <Card title={`Variants (${variants.length})`} icon={Layers}>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                      <th className="pb-2 pr-3 font-medium">Name</th>
                      <th className="pb-2 pr-3 font-medium">SKU</th>
                      <th className="pb-2 pr-3 font-medium">Price</th>
                      <th className="pb-2 font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={String(v.id)} className="border-b border-[var(--color-border)]/50 last:border-0">
                        <td className="py-2.5 pr-3 text-[var(--color-text-primary)]">{String(v.name ?? "—")}</td>
                        <td className="py-2.5 pr-3 font-mono text-[11px]">{String(v.sku ?? "—")}</td>
                        <td className="py-2.5 pr-3 tabular-nums">
                          {formatAdminMoney(Number(v.price ?? 0), currency)}
                        </td>
                        <td className="py-2.5 tabular-nums">{String(v.inventory_quantity ?? "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {shipping.length > 0 && (
            <Card title={`Shipping options (${shipping.length})`} icon={Truck}>
              <div className="space-y-3">
                {shipping.slice(0, 6).map((opt) => (
                  <div
                    key={String(opt.id)}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[var(--color-border)]/50 last:border-0"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                        {String(opt.method_name ?? opt.carrier ?? "Shipping")}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {String(opt.ship_from_country ?? "—")} → {String(opt.ship_to_country ?? "—")}
                        {opt.estimated_delivery ? ` · ${String(opt.estimated_delivery)}` : ""}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums">
                      {opt.is_free_shipping
                        ? "Free"
                        : formatAdminMoney(Number(opt.shipping_fee ?? 0), String(opt.currency ?? currency))}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {vendor && (
            <Card title="Vendor" icon={Building2}>
              <div className="flex items-center gap-3 mb-4">
                {vendor.business_logo ? (
                  <img
                    src={vendor.business_logo}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover ring-1 ring-[var(--color-border)]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center text-sm font-bold">
                    {vendor.business_name?.charAt(0) ?? "V"}
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/admin/vendors/${vendor.id}`}
                    className="text-[13px] font-semibold text-[var(--color-text-primary)] hover:text-orange-500 transition-colors truncate block"
                  >
                    {vendor.business_name}
                  </Link>
                  <p className="text-[11px] text-[var(--color-text-muted)] capitalize">
                    {vendor.verification_status ?? "unknown"}
                  </p>
                </div>
              </div>
              {vendor.business_email ? (
                <DetailRow label="Email" value={vendor.business_email} />
              ) : null}
              {vendor.business_slug ? (
                <DetailRow
                  label="Storefront"
                  value={
                    <Link href={`/vendors/${vendor.business_slug}`} className="text-orange-500 hover:underline">
                      View vendor
                    </Link>
                  }
                />
              ) : null}
            </Card>
          )}

          {(product.source === "cj" || cjPid) && (
            <Card title="CJ Dropshipping" icon={Tag}>
              <DetailRow label="CJ PID" value={cjPid ?? "—"} mono />
              <DetailRow label="CJ SKU" value={String(meta.cj_sku ?? product.sku ?? "—")} mono />
              <DetailRow label="Category" value={String(meta.cj_category_name ?? "—")} />
              <DetailRow
                label="Free shipping"
                value={meta.cj_is_free_shipping ? "Yes" : "No"}
              />
              {Array.isArray(meta.cj_shipping_countries) && meta.cj_shipping_countries.length > 0 ? (
                <DetailRow
                  label="Ships from"
                  value={(meta.cj_shipping_countries as string[]).join(", ")}
                />
              ) : null}
            </Card>
          )}

          <Card title="Recent orders" icon={Clock}>
            {recentOrderItems.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">No orders yet for this product.</p>
            ) : (
              <div className="space-y-2">
                {recentOrderItems.map((item) =>
                  item.order ? (
                    <Link
                      key={item.id}
                      href={`/admin/orders/${item.order.id}`}
                      className="flex items-center justify-between gap-3 py-2 border-b border-[var(--color-border)]/50 last:border-0 hover:bg-[var(--color-surface-secondary)]/50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                          #{item.order.order_number ?? item.order.id.slice(0, 8)}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          Qty {item.quantity} · {item.order.status}
                        </p>
                      </div>
                      <span className="text-[12px] font-semibold tabular-nums shrink-0">
                        {formatAdminMoney(item.total_price, item.order.currency ?? currency)}
                      </span>
                    </Link>
                  ) : null
                )}
              </div>
            )}
          </Card>

          {images.length > 0 && (
            <Card title="Gallery" icon={Package}>
              <div className="grid grid-cols-3 gap-2">
                {images.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square rounded-lg overflow-hidden ring-1 ring-[var(--color-border)]"
                  >
                    <Image src={url} alt="" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminProductDetail(id);
  return {
    title: detail ? `${detail.product.name} · Admin Products` : "Product · Admin",
  };
}
