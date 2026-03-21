import React from "react";
import { Zap, Clock, TrendingUp, Package, Percent, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProducts } from "@/services/db";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import Link from "next/link";

export default async function FlashDealsPage() {
  const { products } = await getProducts({ limit: 20, sort: "sales" });
  
  // Mix in some high discount logic if it doesn't already exist in the seed data
  const dealProducts = products.map(p => ({
    ...p,
    highlight: Math.random() > 0.7
  }));

  return (
    <div className="bg-[var(--color-bg)] min-h-screen">
      {/* Banner */}
      <section className="bg-ink-dark text-white py-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        <div className="absolute -left-24 -top-24 w-96 h-96 bg-[var(--color-accent)] opacity-20 blur-[120px] rounded-full" />
        
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="max-w-2xl">
              <Badge className="bg-[var(--color-accent)] text-white border-none mb-4 px-4 py-1 flex items-center gap-2 w-fit">
                <Zap className="h-4 w-4 fill-white stroke-none" /> FLASH DEALS
              </Badge>
              <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none">
                Limited Time <span className="text-[var(--color-accent)] underline decoration-white/20">Offers</span>
              </h1>
              <p className="text-white/60 text-xl font-medium mb-8 leading-relaxed max-w-xl">
                Premium products at wholesale prices. Updated every 24 hours. Don&apos;t miss out on these verified global sourcing deals.
              </p>
              
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-3xl font-black tracking-tighter">23:54:12</span>
                  <span className="text-[10px] text-white/40 capitalize font-black tracking-widest text-center mt-1">Time Remaining</span>
                </div>
                <div className="h-10 w-[1px] bg-white/10" />
                <Button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black h-14 px-8 rounded-xl shadow-xl shadow-[var(--color-accent)]/20">
                  Shop All Deals
                </Button>
              </div>
            </div>
            
            <div className="hidden lg:block relative">
               <div className="h-64 w-64 bg-[var(--color-accent)] rounded-[3rem] rotate-12 flex items-center justify-center relative shadow-2xl">
                 <Percent className="h-32 w-32 text-white opacity-20 -rotate-12" />
                 <div className="absolute -bottom-4 -left-4 bg-white text-text-primary px-6 py-4 rounded-2xl shadow-xl font-black text-2xl animate-bounce">
                   UP TO 70% OFF
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Filter Strip */}
      <div className="bg-white border-b border-[var(--color-border)] sticky top-[130px] z-[50]">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
           <div className="flex items-center gap-8 overflow-x-auto no-scrollbar py-2">
             {["All Deals", "Electronics", "Fashion", "Home & Garden", "Beauty", "Machinery"].map((cat, i) => (
               <button key={cat} className={`text-sm font-black whitespace-nowrap transition-colors ${i === 0 ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}>
                 {cat.toUpperCase()}
               </button>
             ))}
           </div>
           <Button variant="ghost" size="sm" className="hidden sm:flex font-bold text-xs capitalize tracking-widest">
             Filter <TrendingUp className="ml-2 h-3.5 w-3.5" />
           </Button>
        </div>
      </div>

      {/* Deals Grid */}
      <section className="py-12 max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {dealProducts.map((p) => (
            <div key={p.id} className="relative">
              {p.highlight && (
                <div className="absolute -top-2 -right-2 z-10 bg-[var(--color-accent)] text-white text-[9px] font-black px-2 py-1 rounded shadow-lg animate-pulse">
                  HOT DEAL
                </div>
              )}
              <ProductCardClient p={p as any} />
            </div>
          ))}
        </div>

        {dealProducts.length === 0 && (
          <div className="py-32 text-center bg-white border border-dashed border-[var(--color-border)] rounded-[2rem]">
            <Clock className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-text-secondary)] font-medium">New deals arriving in 4 hours. Stay tuned!</p>
          </div>
        )}
      </section>

      {/* Bulk Sourcing Extra */}
      <section className="py-20 max-w-[var(--container-max)] mx-auto px-4 sm:px-6 mb-20">
        <div className="bg-gradient-to-br from-ink-dark to-ink-darker rounded-[2.5rem] p-12 flex flex-col md:flex-row items-center gap-10 border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.1),transparent_70%)]" />
          <div className="flex-1 text-center md:text-left relative z-10">
            <h2 className="text-3xl font-black text-white mb-4">Bulk Sourcing?</h2>
            <p className="text-white/60 mb-8 max-w-md">Get even lower prices when you order in containers. Connect with our dedicated B2B sourcing agents.</p>
            <Button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black text-lg h-14 px-10 rounded-xl">
              Talk to an Agent <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <div className="relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center">
                <Package className="h-8 w-8 text-[var(--color-accent)] mx-auto mb-2" />
                <p className="text-white font-black text-2xl">40+</p>
                <p className="text-[10px] text-white/40 capitalize font-black">Containers/Month</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center">
                <Percent className="h-8 w-8 text-white mx-auto mb-2" />
                <p className="text-white font-black text-2xl">42%</p>
                <p className="text-[10px] text-white/40 capitalize font-black">Avg Savings</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
