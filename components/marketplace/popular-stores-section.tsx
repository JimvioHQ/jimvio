"use client";

import React from "react";
import Link from "next/link";
import { Star, Store, ChevronRight, Package, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/marketplace/follow-button";
import { cn } from "@/lib/utils";
import { LocalizedPrice } from "@/components/currency/localized-price";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  images?: string[] | null;
  price: number;
  currency?: string | null;
};

export type StoreVendor = {
  id: string;
  business_name: string;
  business_slug?: string | null;
  business_logo?: string | null;
  rating?: number | null;
  total_sales?: number | null;
  products?: StoreProduct[];
};

interface PopularStoresSectionProps {
  stores: StoreVendor[];
  className?: string;
}

function formatFollowers(sales: number): string {
  if (sales >= 1000000) return (sales / 1000000).toFixed(1) + "M";
  if (sales >= 1000) return (sales / 1000).toFixed(1) + "K";
  return String(Math.max(1, sales));
}

export function PopularStoresSection({ stores, className }: PopularStoresSectionProps) {
  if (!stores?.length) return null;

  return (
    <section className={cn("space-y-5 relative", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/8 text-[10px] font-semibold text-stone-600 dark:text-stone-400 tracking-wide">
            <Store className="h-3 w-3" />
            Verified Vendors
          </span>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#11181c] dark:text-[#ededed] tracking-tight leading-tight">
            Stores to discover
          </h2>
          <p className="text-[12px] text-[#889096] dark:text-[#6a6a6a] font-medium">
            Follow verified vendors for exclusive deals.
          </p>
        </div>
        <Link
          href="/vendors"
          className="flex items-center gap-1 text-[12px] font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-white transition-colors shrink-0 ml-4"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal scroll strip */}
      <div className="relative -mx-4 sm:-mx-6">
        {/* Fade edge mask */}
        <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[var(--color-bg)] to-transparent z-10 pointer-events-none" />
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 pt-1 px-4 sm:px-6 snap-x snap-mandatory">
          {stores.filter((s) => (s.products?.length ?? 0) > 0).map((s) => {
            const followers = formatFollowers(s.total_sales ?? 100);
            const storeUrl = s.business_slug ? `/vendors/${s.business_slug}` : `/marketplace?vendor=${s.id}`;
            const rating = (s.rating ?? 4.5).toFixed(1);
            const storeProducts = s.products ?? [];

            return (
              <div
                key={s.id}
                className="snap-start shrink-0 w-[280px] sm:w-[300px] flex flex-col p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111] border border-stone-100 dark:border-white/6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
              >
                {/* Subtle ambient glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#fd5000]/4 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />

                {/* Store header */}
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border border-stone-100 dark:border-white/8 shadow-sm">
                      <AvatarImage src={s.business_logo ?? undefined} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-[#fd5000] to-orange-600 text-white font-bold text-lg rounded-xl">
                        {s.business_name?.[0] ?? "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-[14px] font-semibold text-[#11181c] dark:text-[#ededed] truncate max-w-[120px]">
                          {s.business_name}
                        </h3>
                        <div className="h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center p-0.5 shrink-0" title="Verified Vendor">
                          <ShieldCheck className="h-full w-full text-white" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/50">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">{rating}</span>
                        </div>
                        <span className="text-[10px] text-[#889096] font-medium">{followers} followers</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product preview grid */}
                <div className="mb-4 relative z-10">
                  <div className="grid grid-cols-3 gap-1.5">
                    {storeProducts.slice(0, 3).map((pr) => (
                      <Link
                        key={pr.id}
                        href={`/marketplace/${pr.slug}`}
                        className="group/product relative aspect-square rounded-xl overflow-hidden bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/6 hover:border-[#fd5000]/40 transition-all"
                      >
                        {pr.images?.[0] ? (
                          <img src={pr.images[0]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover/product:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-stone-300 dark:text-stone-600" />
                          </div>
                        )}
                        {/* Name overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover/product:translate-y-0 transition-transform duration-300">
                          <p className="text-[8px] font-semibold text-white truncate">{pr.name}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-auto relative z-10">
                  <FollowButton
                    vendorId={s.id}
                    className="flex-1 rounded-full h-10 text-[12px] font-semibold border border-stone-200 dark:border-white/8 bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/8 text-stone-700 dark:text-stone-300"
                  />
                  <Link href={storeUrl} className="flex-1">
                    <button className="w-full rounded-full h-10 text-[12px] font-semibold bg-[#11181c] dark:bg-white text-white dark:text-[#11181c] hover:bg-stone-800 dark:hover:bg-stone-100 active:scale-95 transition-all shadow-sm">
                      Visit Store
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}

          {/* See All Card */}
          <Link
            href="/vendors"
            className="snap-start shrink-0 w-[180px] flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-stone-200 dark:border-white/8 hover:border-[#fd5000]/40 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 transition-all group"
          >
            <div className="h-12 w-12 rounded-2xl bg-stone-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-[#fd5000] group-hover:scale-110 transition-all duration-300 mb-3 text-stone-400 group-hover:text-white">
              <ChevronRight className="h-5 w-5" />
            </div>
            <p className="text-[12px] font-semibold text-stone-400 dark:text-stone-500 group-hover:text-[#fd5000] transition-colors text-center leading-tight">
              Explore all<br />vendors
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
