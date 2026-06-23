"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import { type DbProduct, getImage, getDiscount, fmtCount, getEffectiveCompareAtPrice } from "@/lib/utils";

type FlashDealProduct = DbProduct & {
  currency?: string | null;
  vendors?: { id: string; verification_status?: string | null } | null;
};

export function FlashDealsClient({ deals }: { deals: FlashDealProduct[] }) {
  return (
    <div className="grid w-full max-w-full grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {deals.map((d) => (
        <FlashDealCard key={d.id} d={d} />
      ))}
    </div>
  );
}

function FlashDealCard({ d }: { d: FlashDealProduct }) {
  const { formatMoney } = useCurrency();
  const discount = getDiscount(d);
  const compareAtPrice = getEffectiveCompareAtPrice(d);
  const isVerifiedSupplier = d.vendors?.verification_status === "verified";

  return (
    <Link
      href={`/marketplace/${d.slug}`}
      className="group relative flex w-full min-w-0 flex-col rounded-xl border border-border bg-card p-2 transition-shadow hover:shadow-[var(--shadow-card)] sm:p-2.5"
    >
      {discount && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          {discount}
        </span>
      )}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/50">
        <img
          src={getImage(d.images)}
          alt={d.name}
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-center transition-transform group-hover:scale-105"
        />
        {isVerifiedSupplier && (
          <span className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center gap-0.5 rounded-md bg-blue-600/95 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm backdrop-blur-sm">
            <ShieldCheck className="size-2.5" />
            Verified supplier
          </span>
        )}
      </div>
      <h4 className="mt-2 truncate text-xs font-bold">{d.name}</h4>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-sm font-black text-primary">{formatMoney(d.price, d.currency)}</span>
        {compareAtPrice && (
          <span className="text-[11px] text-muted-foreground line-through">
            {formatMoney(compareAtPrice, d.currency)}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{(d.sold_count ?? d.sale_count ?? 0) > 0 ? `${fmtCount(d.sold_count ?? d.sale_count)} sold` : "New Product"}</span>
      </div>
    </Link>
  );
}
