"use client";

import React from "react";
import Link from "next/link";
import { Star, UserPlus, Store, ChevronRight, Package, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
    <section className={cn("space-y-6 relative group/section", className)}>
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-[24px] font-black text-zinc-900 dark:text-white flex items-center gap-3 tracking-tighter leading-none">
            <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center border border-orange-100 dark:border-orange-900/50 shadow-sm">
              <Store className="h-5 w-5 text-[#f97316]" />
            </div>
            Stores to discover
          </h2>
          <p className="text-[12px] text-zinc-500 dark:text-text-muted font-bold mt-2 uppercase tracking-widest pl-1">
            Verified vendors · Follow for updates
          </p>
        </div>
        <Link
          href="/vendors"
          className="text-[11px] font-black text-zinc-400 dark:text-text-muted hover:text-[#f97316] uppercase tracking-[0.2em] flex items-center gap-2 transition-all bg-white dark:bg-surface px-4 py-2 rounded-full border border-zinc-100 dark:border-border hover:border-orange-100 dark:hover:border-orange-900 shadow-sm"
        >
          View All <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="relative -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 pt-2 snap-x snap-mandatory">
          {stores.filter(s => (s.products?.length ?? 0) > 0).map((s) => {
            const followers = formatFollowers(s.total_sales ?? 100);
            const storeUrl = s.business_slug ? `/vendors/${s.business_slug}` : `/marketplace?vendor=${s.id}`;
            const rating = (s.rating ?? 4.5).toFixed(1);
            const storeProducts = s.products ?? [];
            
            return (
              <div
                key={s.id}
              className="snap-start shrink-0 w-[300px] sm:w-[320px] group flex flex-col p-5 rounded-[32px] bg-white dark:bg-surface border border-zinc-100/80 dark:border-border shadow-sm hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/30 dark:hover:border-orange-900/50 transition-all duration-500 relative overflow-hidden"
              >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/50 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />

                <div className="flex items-start justify-between mb-5 relative z-10">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 rounded-2xl border-2 border-white shadow-md group-hover:scale-105 transition-transform duration-300">
                      <AvatarImage src={s.business_logo ?? undefined} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-black text-lg rounded-2xl">
                        {s.business_name?.[0] ?? "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="text-[15px] font-black text-zinc-900 dark:text-white truncate tracking-tight">
                          {s.business_name}
                        </h3>
                        <div className="h-3.5 w-3.5 bg-blue-500 rounded-full flex items-center justify-center p-0.5" title="Verified Vendor">
                           <ShieldCheck className="h-full w-full text-white" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-lg border border-amber-100 dark:border-amber-900/50">
                           <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                           <span className="text-[10px] font-black text-amber-700 dark:text-amber-400">{rating}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 dark:text-text-muted font-bold uppercase tracking-wider">{followers} followers</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6 relative z-10">
                  <div className="grid grid-cols-3 gap-2">
                    {storeProducts.slice(0, 3).map((pr) => (
                      <Link
                        key={pr.id}
                        href={`/marketplace/${pr.slug}`}
                        className="group/product relative aspect-square rounded-2xl overflow-hidden bg-zinc-50 dark:bg-surface-secondary border border-zinc-100/50 dark:border-border-strong/50 hover:border-orange-500/40 transition-all shadow-sm"
                      >
                        {pr.images?.[0] ? (
                          <img src={pr.images[0]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover/product:scale-115" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-zinc-200 dark:text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/60 via-black/20 to-transparent translate-y-full group-hover/product:translate-y-0 transition-transform duration-300">
                           <p className="text-[8px] font-black text-white truncate">{pr.name}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2.5 mt-auto relative z-10">
                  <FollowButton
                    vendorId={s.id}
                    className="flex-1 rounded-[14px] h-11 text-[11px] font-black border-none"
                  />
                    <Link href={storeUrl} className="flex-1">
                      <Button
                        className="w-full rounded-[14px] h-11 text-[11px] font-black bg-zinc-900 dark:bg-white dark:bg-surface border-none text-white dark:text-zinc-900 dark:text-white hover:bg-black dark:hover:bg-zinc-100 hover:scale-[1.02] shadow-xl shadow-zinc-900/10 active:scale-95 transition-all"
                      >
                      Enter Store
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
          
          {/* See All Card */}
          <Link href="/vendors" className="snap-start shrink-0 w-[200px] flex flex-col items-center justify-center p-6 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-border-strong hover:border-orange-500/40 hover:bg-orange-50/10 dark:hover:bg-orange-950/10 transition-all group">
             <div className="h-14 w-14 rounded-full bg-zinc-50 dark:bg-surface-secondary flex items-center justify-center group-hover:bg-orange-500 group-hover:scale-110 transition-all duration-300 mb-4 text-zinc-400 dark:text-text-muted group-hover:text-white">
                <ChevronRight className="h-6 w-6" />
             </div>
             <p className="text-[13px] font-black text-zinc-400 dark:text-text-muted group-hover:text-orange-600 transition-colors uppercase tracking-[0.2em] text-center">
                Explore all<br/>{stores.length >= 8 ? "500+" : ""} vendors
             </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
