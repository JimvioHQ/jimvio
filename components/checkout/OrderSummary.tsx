"use client";

import { Package } from "lucide-react";
import { formatDisplayMoney } from "@/lib/utils";

export type OrderSummaryItem = {
  id: string;
  product_name: string;
  product_image?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export function OrderSummary({
  items,
  subtotal,
  total,
  currency,
}: {
  items: OrderSummaryItem[];
  subtotal: number;
  total: number;
  currency: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Order summary</h3>
      <ul className="space-y-4 mb-6 max-h-[360px] overflow-y-auto pr-1">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-center">
              {item.product_image ? (
                <img src={item.product_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-6 w-6 text-[var(--color-text-muted)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2">{item.product_name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Qty {item.quantity}</p>
            </div>
            <p className="text-sm font-bold text-[var(--color-text-primary)] shrink-0">
              {formatDisplayMoney(Number(item.total_price), currency)}
            </p>
          </li>
        ))}
      </ul>
      <div className="space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
        <div className="flex justify-between text-[var(--color-text-secondary)]">
          <span>Subtotal</span>
          <span>{formatDisplayMoney(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between text-[var(--color-text-secondary)]">
          <span>Shipping</span>
          <span>{formatDisplayMoney(0, currency)}</span>
        </div>
        <div className="flex justify-between text-lg font-black text-[var(--color-text-primary)] pt-2">
          <span>Total</span>
          <span className="text-[var(--color-accent)]">{formatDisplayMoney(total, currency)}</span>
        </div>
      </div>
      <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
        Secured checkout · Jimvio
      </p>
    </div>
  );
}
