"use client";

import React from "react";
import Link from "next/link";
import { Star, UserPlus, Store, ChevronRight, Package } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/marketplace/follow-button";
import { cn } from "@/lib/utils";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  images?: string[] | null;
  price: number;
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
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] sm:text-[22px] font-extrabold text-text-primary flex items-center gap-2.5 tracking-tight">
            <Store className="h-5 w-5 text-[#f97316]" />
            Stores to discover
          </h2>
          <p className="text-[12px] text-[#6b7280] font-medium mt-0.5">Verified vendors · Follow for updates</p>
        </div>
        <Link
          href="/vendors"
          className="text-[11px] font-bold text-[#f97316] capitalize tracking-widest flex items-center gap-1.5 hover:gap-2.5 transition-all shrink-0"
        >
          View All <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {stores.map((s) => {
          const followers = formatFollowers(s.total_sales ?? 100);
          const storeUrl = s.business_slug ? `/vendors/${s.business_slug}` : `/marketplace?vendor=${s.id}`;
          const rating = (s.rating ?? 4.5).toFixed(1);
          const storeProducts = s.products ?? [];
          return (
            <div
              key={s.id}
              className="group flex flex-col p-5 rounded-2xl bg-white border border-[#f0f0f0] shadow-sm hover:shadow-lg hover:border-[#f97316]/20 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12 rounded-xl border-2 border-[#fff7ed]">
                  <AvatarImage src={s.business_logo ?? undefined} />
                  <AvatarFallback className="bg-[#f97316] text-white font-black text-sm rounded-xl">
                    {s.business_name?.[0] ?? "S"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-black text-text-primary truncate">
                    {s.business_name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-[11px] font-bold text-[#4b5563]">{rating}</span>
                    <span className="text-[10px] text-[#9ca3af]">· {followers} followers</span>
                  </div>
                </div>
              </div>
              {storeProducts.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-black text-[#9ca3af] uppercase tracking-wider mb-2">New in</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {storeProducts.slice(0, 5).map((pr) => (
                      <Link
                        key={pr.id}
                        href={`/marketplace/${pr.slug}`}
                        className="shrink-0 flex flex-col items-center w-[64px] group/product"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#f5f5f5] border border-[#f0f0f0] group-hover/product:border-[#f97316]/40 transition-colors">
                          {Array.isArray(pr.images) && pr.images[0] ? (
                            <img src={pr.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#ccc]">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-[#4b5563] truncate w-full text-center mt-1 group-hover/product:text-[#f97316]">{pr.name}</span>
                        <span className="text-[9px] font-black text-[#f97316]">${Number(pr.price).toFixed(2)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-auto">
                <FollowButton
                  vendorId={s.id}
                  className="flex-1 rounded-xl h-9 text-[11px] font-black border-[#f0f0f0] hover:border-[#f97316] hover:text-[#f97316]"
                />
                <Link href={storeUrl}>
                  <Button
                    size="sm"
                    className="rounded-xl h-9 px-4 text-[11px] font-black bg-[#f97316] hover:bg-[#ea580c] text-white border-0"
                  >
                    Visit
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
