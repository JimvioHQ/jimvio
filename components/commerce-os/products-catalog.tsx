"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { CommerceCard, CommerceEmptyState } from "@/components/commerce-os/commerce-shell";
import {
  CommerceStatusBadge,
  inventoryStatusTone,
  productStatusTone,
} from "@/components/commerce-os/commerce-status-badge";
import { formatCommerceMoney } from "@/lib/commerce-os/money";
import { cn } from "@/lib/utils";

export type CatalogProduct = {
  linkId: string;
  productId: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  currency: string;
  status: string;
  productStatus: string | null;
  inventory: number | null;
  trackInventory: boolean;
  lowStockThreshold: number;
  images: string[];
  updatedAt: string | null;
  variantCount: number;
};

type Props = {
  storeId: string;
  storeHandle: string;
  products: CatalogProduct[];
};

type StockFilter = "all" | "in" | "low" | "out";
type StatusFilter = "all" | "published" | "draft" | "archived";

export function ProductsCatalog({ storeId, storeHandle, products }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CatalogProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const total = products.length;
    const published = products.filter((p) => p.status === "published").length;
    const draft = products.filter((p) => p.status === "draft").length;
    const out = products.filter(
      (p) => p.trackInventory && Number(p.inventory ?? 0) <= 0,
    ).length;
    const low = products.filter((p) => {
      if (!p.trackInventory) return false;
      const qty = Number(p.inventory ?? 0);
      return qty > 0 && qty <= p.lowStockThreshold;
    }).length;
    return { total, published, draft, out, low };
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (stock !== "all" && p.trackInventory) {
        const qty = Number(p.inventory ?? 0);
        if (stock === "out" && qty > 0) return false;
        if (stock === "in" && qty <= 0) return false;
        if (stock === "low" && !(qty > 0 && qty <= p.lowStockThreshold)) return false;
      } else if (stock !== "all" && !p.trackInventory) {
        return false;
      }
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        (p.sku || "").toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle)
      );
    });
  }, [products, q, status, stock]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.productId));

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtered.map((p) => p.productId)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function setStatusFor(
    productIds: string[],
    nextStatus: "published" | "draft" | "archived",
  ) {
    setError(null);
    const results = await Promise.all(
      productIds.map(async (productId) => {
        const res = await fetch("/api/commerce/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId, productId, status: nextStatus }),
        });
        return res.ok;
      }),
    );
    if (results.some((ok) => !ok)) {
      setError("Some products could not be updated. Try again.");
    }
    setSelected(new Set());
    setMenuId(null);
    setConfirmDelete(null);
    startTransition(() => router.refresh());
  }

  async function exportCsv() {
    const rows = [
      ["Name", "SKU", "Status", "Inventory", "Price USD", "Updated"],
      ...filtered.map((p) => [
        p.name,
        p.sku || "",
        p.status,
        p.trackInventory ? String(p.inventory ?? 0) : "",
        formatCommerceMoney(p.price, p.currency).replace(/[$,]/g, ""),
        p.updatedAt ? new Date(p.updatedAt).toISOString() : "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commerce-products-${storeHandle}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedCount = selected.size;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-5">
        {[
          { label: "Total products", value: summary.total },
          { label: "Published", value: summary.published },
          { label: "Draft", value: summary.draft },
          { label: "Out of stock", value: summary.out },
          { label: "Low stock", value: summary.low },
        ].map((item) => (
          <CommerceCard key={item.label} className="px-3 py-3">
            <p className="text-[11px] text-[#6B7280]">{item.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[#111827]">
              {item.value}
            </p>
          </CommerceCard>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm outline-none ring-[#FF5A1F]/30 focus:ring-2"
            aria-label="Search products"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={stock}
            onChange={(e) => setStock(e.target.value as StockFilter)}
            className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm"
            aria-label="Filter by inventory"
          >
            <option value="all">All inventory</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
          <button
            type="button"
            onClick={() => void exportCsv()}
            className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#374151]"
          >
            Export
          </button>
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm">
          <span className="font-medium text-[#111827]">
            {selectedCount} product{selectedCount === 1 ? "" : "s"} selected
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              void setStatusFor(Array.from(selected), "published")
            }
            className="rounded-md bg-[#FF5A1F] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            Publish
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void setStatusFor(Array.from(selected), "draft")}
            className="rounded-md border border-[#E5E7EB] px-2.5 py-1 text-xs font-semibold text-[#374151] disabled:opacity-50"
          >
            Unpublish
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void setStatusFor(Array.from(selected), "archived")}
            className="rounded-md border border-[#E5E7EB] px-2.5 py-1 text-xs font-semibold text-[#374151] disabled:opacity-50"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs font-semibold text-[#6B7280]"
          >
            Clear
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {!filtered.length ? (
        <CommerceEmptyState
          title={products.length ? "No products match your filters" : "No products yet"}
          description={
            products.length
              ? "Try clearing search or filters."
              : "Add your first product to start selling, or import from the Jimvio Marketplace."
          }
          action={
            <Link
              href={`/commerce/products/new?storeId=${storeId}`}
              className="rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white"
            >
              Add product
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {filtered.map((p) => {
              const inv = inventoryStatusTone(p.inventory, p.trackInventory);
              return (
                <CommerceCard key={p.linkId} className="p-3">
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.productId)}
                      onChange={() => toggleOne(p.productId)}
                      aria-label={`Select ${p.name}`}
                      className="mt-1"
                    />
                    <Thumb images={p.images} name={p.name} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/commerce/products/${p.productId}/edit?storeId=${storeId}`}
                        className="font-semibold text-[#111827]"
                      >
                        {p.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-[#9CA3AF]">
                        {p.sku ? `SKU ${p.sku} · ` : ""}
                        {p.variantCount > 1 ? `${p.variantCount} variants · ` : ""}
                        {formatCommerceMoney(p.price, p.currency)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <CommerceStatusBadge
                          label={p.status}
                          tone={productStatusTone(p.status)}
                        />
                        <CommerceStatusBadge label={inv.label} tone={inv.tone} />
                      </div>
                    </div>
                  </div>
                </CommerceCard>
              );
            })}
          </div>

          <CommerceCard className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      aria-label="Select all products"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Inventory</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                  <th className="px-3 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const inv = inventoryStatusTone(p.inventory, p.trackInventory);
                  return (
                    <tr
                      key={p.linkId}
                      className="border-b border-[#F3F4F6] last:border-0"
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(p.productId)}
                          onChange={() => toggleOne(p.productId)}
                          aria-label={`Select ${p.name}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Thumb images={p.images} name={p.name} />
                          <div className="min-w-0">
                            <Link
                              href={`/commerce/products/${p.productId}/edit?storeId=${storeId}`}
                              className="font-medium text-[#111827] hover:text-[#FF5A1F]"
                            >
                              {p.name}
                            </Link>
                            <p className="text-xs text-[#9CA3AF]">
                              {p.sku ? `SKU ${p.sku}` : p.slug}
                              {p.variantCount > 1
                                ? ` · ${p.variantCount} variants`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <CommerceStatusBadge
                          label={p.status}
                          tone={productStatusTone(p.status)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <p className="tabular-nums text-[#374151]">
                            {p.trackInventory ? p.inventory ?? 0 : "—"}
                          </p>
                          <CommerceStatusBadge label={inv.label} tone={inv.tone} />
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums font-medium text-[#111827]">
                        {formatCommerceMoney(p.price, p.currency)}
                      </td>
                      <td className="px-3 py-3 text-[#6B7280]">
                        {p.updatedAt
                          ? new Date(p.updatedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="relative px-3 py-3 text-right">
                        <button
                          type="button"
                          className="inline-grid h-8 w-8 place-items-center rounded-md border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                          aria-label={`Actions for ${p.name}`}
                          aria-expanded={menuId === p.productId}
                          onClick={() =>
                            setMenuId((id) =>
                              id === p.productId ? null : p.productId,
                            )
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuId === p.productId ? (
                          <div className="absolute right-3 z-20 mt-1 w-44 rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
                            <MenuLink
                              href={`/commerce/products/${p.productId}/edit?storeId=${storeId}`}
                              icon={Pencil}
                              label="Edit"
                            />
                            <MenuLink
                              href={`https://${storeHandle}.jimvio.com/product/${p.slug}`}
                              icon={Copy}
                              label="View storefront"
                              external
                            />
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#374151] hover:bg-[#F9FAFB]"
                              onClick={() =>
                                void setStatusFor([p.productId], "archived")
                              }
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Archive
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              onClick={() => setConfirmDelete(p)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CommerceCard>
        </>
      )}

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="delete-product-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2
              id="delete-product-title"
              className="text-base font-semibold text-[#111827]"
            >
              Archive product?
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              <span className="font-medium text-[#111827]">
                {confirmDelete.name}
              </span>{" "}
              will be archived on this store so historical orders stay readable.
              Destructive hard-delete is not used when a product may appear in
              order history.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#374151]"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() =>
                  void setStatusFor([confirmDelete.productId], "archived")
                }
              >
                Archive product
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Thumb({ images, name }: { images: string[]; name: string }) {
  const src = images[0];
  if (!src) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F3F4F6] text-xs font-semibold text-[#9CA3AF]">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={40}
      height={40}
      className="h-10 w-10 shrink-0 rounded-lg object-cover"
      unoptimized
    />
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  external,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  external?: boolean;
}) {
  const className =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#374151] hover:bg-[#F9FAFB]";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
