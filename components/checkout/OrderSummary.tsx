"use client";

import { Package, ShieldCheck, Lock, BadgeCheck } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

export type OrderSummaryItem = {
  id: string;
  product_name: string;
  product_image?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  pricing_type?: string;
  billing_period?: string;
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
  const c = currency.toUpperCase();
  const { formatMoney } = useCurrency();

  return (
    <div className="rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-none)]">
      <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Order summary</h3>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">Review items before you pay.</p>

      <ul className="space-y-4 mb-6 max-h-[min(360px,50vh)] overflow-y-auto pr-1 -mr-1 scrollbar-thin">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-none border border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-center">
              {item.product_image ? (
                <img src={item.product_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-6 w-6 text-[var(--color-text-muted)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2 leading-snug">{item.product_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-[var(--color-text-muted)]">Qty {item.quantity}</p>
                {item.pricing_type === 'recurring' && (
                  <span className="text-[10px] font-bold text-orange-500 uppercase px-1.5 py-0.5 bg-orange-500/10 rounded-none">
                    {item.billing_period}
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] shrink-0 tabular-nums">
              {formatMoney(Number(item.total_price), c)}
            </p>
          </li>
        ))}
      </ul>

      <div className="space-y-2.5 border-t border-[var(--color-border)] pt-5 text-sm">
        <div className="flex justify-between text-[var(--color-text-secondary)]">
          <span>Subtotal</span>
          <span className="font-medium text-[var(--color-text-primary)] tabular-nums">{formatMoney(subtotal, c)}</span>
        </div>
        <div className="flex justify-between text-[var(--color-text-secondary)]">
          <span>Shipping</span>
          <span className="text-[var(--color-text-muted)]">Calculated next</span>
        </div>
        <div className="flex justify-between items-baseline pt-3 border-t border-[var(--color-border)]">
          <span className="text-base font-semibold text-[var(--color-text-primary)]">Total</span>
          <span className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums tracking-tight">
            {formatMoney(total, c)}
          </span>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-[var(--color-border)] space-y-3">
        <div className="flex items-start gap-2.5 text-[11px] text-[var(--color-text-secondary)]">
          <Lock className="h-4 w-4 shrink-0 text-[var(--color-accent)] mt-0.5" aria-hidden />
          <span>Secure SSL checkout "” your payment details are encrypted.</span>
        </div>
        <div className="flex items-start gap-2.5 text-[11px] text-[var(--color-text-secondary)]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--color-accent)] mt-0.5" aria-hidden />
          <span>Buyer protection on eligible orders through Jimvio.</span>
        </div>
        <div className="flex items-start gap-2.5 text-[11px] text-[var(--color-text-secondary)]">
          <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--color-accent)] mt-0.5" aria-hidden />
          <span>PCI-aligned payment partners (PesaPal, PawaPay, NowPayments).</span>
        </div>
      </div>
    </div>
  );
}

