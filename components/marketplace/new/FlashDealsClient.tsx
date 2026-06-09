"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import { type DbProduct, getImage, getDiscount, fmtCount } from "@/lib/utils";

type FlashDealProduct = DbProduct & {
  currency?: string | null;
};

export function FlashDealsClient({ deals }: { deals: FlashDealProduct[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {deals.map((d) => <FlashDealCard key={d.id} d={d} />)}
      </div>
      <button
        onClick={() => scroll("left")}
        className="absolute left-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-card shadow-md transition-colors hover:bg-muted"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-card shadow-md transition-colors hover:bg-muted"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function FlashDealCard({ d }: { d: DbProduct }) {
  const { formatMoney } = useCurrency();
  const pct = d.claimed_pct ?? 0;
  const discount = getDiscount(d);
  const earn = d.affiliate_commission_rate
    ? `Earn ${formatMoney(d.price * (d.affiliate_commission_rate / 100), d.currency)}`
    : null;

  return (
    <Link
      href={`/marketplace/${d.slug}`}
      className="group relative w-[42vw] max-w-[180px] shrink-0 flex flex-col rounded-xl border border-border bg-card p-2 sm:w-[160px] sm:p-2.5 md:w-[180px] transition-shadow hover:shadow-[var(--shadow-card)]"
    >
      {discount && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          {discount}
        </span>
      )}
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted/50">
        <img
          src={getImage(d.images)}
          alt={d.name}
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain object-center p-1.5 transition-transform group-hover:scale-105"
        />
      </div>
      <h4 className="mt-2 truncate text-xs font-bold">{d.name}</h4>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-sm font-black text-primary">{formatMoney(d.price, d.currency)}</span>
        {d.compare_at_price && d.compare_at_price > d.price && (
          <span className="text-[11px] text-muted-foreground line-through">
            {formatMoney(d.compare_at_price, d.currency)}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{fmtCount(d.sold_count ?? d.sale_count)} sold</span>
        {pct > 0 && <span>{pct}% claimed</span>}
      </div>
      {pct > 0 && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {earn && (
        <div className="mt-2 flex items-center justify-center gap-1 rounded-md bg-accent/10 py-1 text-[11px] font-bold text-accent">
          <DollarSign className="size-3" /> {earn}
        </div>
      )}
    </Link>
  );
}