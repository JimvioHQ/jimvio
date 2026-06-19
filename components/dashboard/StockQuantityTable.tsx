"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Filter,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StockRowStatus = "in_stock" | "coming_soon" | "out_of_stock";

export interface StockQuantityRow {
  id: string;
  name: string;
  code: string;
  status: StockRowStatus;
  stock: number;
  price: string;
  imageUrl?: string | null;
  imageColor?: string;
  editHref: string;
}

const STATUS_META: Record<
  StockRowStatus,
  { label: string; dot: string; badge: string }
> = {
  in_stock: {
    label: "In stock",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  },
  coming_soon: {
    label: "Coming soon",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/15",
  },
  out_of_stock: {
    label: "Out of stock",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 ring-red-600/15",
  },
};

interface StockQuantityTableProps {
  rows: StockQuantityRow[];
  onDelete?: (id: string, name: string) => void;
  addHref?: string;
  className?: string;
}

export function StockQuantityTable({
  rows,
  onDelete,
  addHref = "/dashboard/products/new",
  className,
}: StockQuantityTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const period = "This year";

  const allSelected = rows.length > 0 && selected.size === rows.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.stock - a.stock),
    [rows]
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[15px] font-bold text-[var(--color-text-primary)]">
          Stock quantity
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={addHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
          >
            <Plus className="size-3.5" />
            Add product
          </Link>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold text-[var(--color-text-muted)]"
          >
            <Filter className="size-3.5" />
            Filter
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold text-[var(--color-text-muted)]"
          >
            {period}
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="size-3.5 rounded border-[var(--color-border)]"
                  aria-label="Select all products"
                />
              </th>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Product code</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Stock</th>
              <th className="px-3 py-3 text-right">Price</th>
              <th className="w-20 px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-[var(--color-text-muted)]">
                  No products in inventory yet.{" "}
                  <Link href={addHref} className="font-semibold text-[var(--color-accent)] hover:underline">
                    Add your first product
                  </Link>
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const meta = STATUS_META[row.status];
                return (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--color-border)] last:border-0 transition-colors hover:bg-[var(--color-surface-secondary)]/40"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        className="size-3.5 rounded border-[var(--color-border)]"
                        aria-label={`Select ${row.name}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-[var(--color-border)]"
                          style={!row.imageUrl ? { background: row.imageColor ?? "#e5e7eb" } : undefined}
                        >
                          {row.imageUrl ? (
                            <img src={row.imageUrl} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-white">
                              {row.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                          {row.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[12px] font-medium tabular-nums text-[var(--color-text-muted)]">
                      {row.code}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                          meta.badge
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", meta.dot)} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {row.status === "out_of_stock" ? "00" : row.stock.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right text-[13px] font-bold tabular-nums text-[var(--color-text-primary)]">
                      {row.price}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(row.id, row.name)}
                            className="text-red-500 transition-opacity hover:opacity-70"
                            aria-label={`Delete ${row.name}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                        <Link
                          href={row.editHref}
                          className="text-[var(--color-text-muted)] transition-opacity hover:opacity-70"
                          aria-label={`Edit ${row.name}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function mapProductToStockRow(
  p: {
    id: string;
    name: string;
    slug: string | null;
    sku?: string | null;
    status: string;
    price: number;
    currency?: string | null;
    inventory_quantity?: number | null;
    track_inventory?: boolean | null;
    is_digital?: boolean | null;
    images?: unknown;
    imageUrl?: string | null;
    imageColor?: string;
  },
  formatMoney: (amount: number, currency: string) => string
): StockQuantityRow {
  const track = p.track_inventory && !p.is_digital;
  const qty = p.inventory_quantity ?? 0;

  let status: StockRowStatus = "in_stock";
  if (p.status === "draft" || p.status === "paused") status = "coming_soon";
  else if (track && qty <= 0) status = "out_of_stock";

  const code =
    p.sku?.trim() ||
    (p.slug ? `JV-${p.slug.slice(0, 8).toUpperCase()}` : `JV-${p.id.slice(0, 8).toUpperCase()}`);

  return {
    id: p.id,
    name: p.name,
    code,
    status,
    stock: track ? qty : 0,
    price: formatMoney(p.price, p.currency ?? "USD"),
    imageUrl: p.imageUrl ?? null,
    imageColor: p.imageColor,
    editHref: `/dashboard/products/${p.id}/edit`,
  };
}
