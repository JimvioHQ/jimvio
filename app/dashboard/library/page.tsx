"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Package, Search, ExternalLink, Video, FileText, ArrowRight, RefreshCw } from "lucide-react";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function DigitalLibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("order_items")
        .select(`
          id, product_name, product_image, created_at,
          orders!inner ( status, buyer_id )
        `)
        .eq("orders.buyer_id", user.id)
        .eq("orders.status", "delivered");

      setItems(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = items.filter(i => 
    i.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && items.length === 0) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
         <div className="relative">
           <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
           <div className="relative w-24 h-24 rounded-[32px] bg-surface dark:bg-surface border border-border shadow-2xl flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
             <Video className="h-10 w-10 text-stone-900 dark:text-white" />
           </div>
         </div>
         <div className="text-center space-y-3">
            <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Digital Library</h2>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Syncing Purchased Assets</p>
         </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="indigo" position="bottom-left" />

      <div className="max-w-[1400px] mx-auto space-y-12 px-6 pt-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-[20px] bg-surface dark:bg-surface border border-border shadow-2xl shrink-0">
                    <Video className="h-8 w-8 text-orange-500" />
                 </div>
                 Digital Library
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Access your purchased viral clips and digital assets
              </p>
           </div>
           
           <div className="relative w-full md:w-80">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 pointer-events-none" />
              <input
                 placeholder="Search your library..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full h-14 pl-12 pr-6 rounded-2xl bg-surface dark:bg-surface border border-border text-[13px] font-bold text-stone-900 dark:text-white placeholder:text-stone-300 shadow-xl focus:outline-none focus:bg-surface-secondary dark:focus:bg-zinc-800 transition-all"
              />
           </div>
        </div>

        {filtered.length === 0 ? (
           <GlassCard className="p-24 text-center rounded-[56px] border-border bg-surface dark:bg-surface/20">
              <div className="w-24 h-24 bg-surface dark:bg-surface rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-border shadow-xl">
                 <Video className="h-10 w-10 text-stone-300 dark:text-stone-600" />
              </div>
              <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter uppercase">Library is Empty</h2>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-4 max-w-sm mx-auto leading-relaxed">
                 Digital purchases like viral clips, course materials, and templates will appear here after delivery.
              </p>
              <Button asChild className="h-16 px-12 rounded-3xl bg-stone-900 text-white font-black text-[11px] uppercase tracking-widest shadow-2xl mt-10 hover:bg-black transition-all border-none">
                 <Link href="/marketplace">Explore Marketplace</Link>
              </Button>
           </GlassCard>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filtered.map((item) => (
                <GlassCard key={item.id} className="overflow-hidden p-0 rounded-[40px] border-border bg-surface dark:bg-surface/60 hover:shadow-2xl hover:bg-surface-secondary dark:hover:bg-zinc-800 transition-all duration-500 group">
                  <div className="aspect-[4/3] relative bg-stone-100 dark:bg-surface-secondary">
                    {item.product_image ? (
                      <img src={item.product_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-stone-200" /></div>
                    )}
                    <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                       <Button size="icon" className="rounded-2xl h-14 w-14 bg-surface dark:bg-surface text-stone-900 dark:text-white hover:bg-surface-secondary dark:hover:bg-zinc-800 border-0 shadow-2xl hover:scale-110 transition-all"><Download className="h-6 w-6" /></Button>
                       <Button size="icon" className="rounded-2xl h-14 w-14 bg-surface dark:bg-surface text-stone-900 dark:text-white hover:bg-surface-secondary dark:hover:bg-zinc-800 border-0 shadow-2xl hover:scale-110 transition-all"><ExternalLink className="h-6 w-6" /></Button>
                    </div>
                    <div className="absolute top-4 right-4 bg-surface/90 dark:bg-surface/90 backdrop-blur-xl px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] text-stone-900 dark:text-white shadow-xl border border-border">
                        Asset Node
                    </div>
                  </div>
                  <div className="p-8">
                    <h4 className="font-black text-xl text-stone-900 dark:text-white truncate tracking-tighter mb-4">{item.product_name}</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 bg-surface-secondary dark:bg-surface-secondary px-3 py-1.5 rounded-lg">
                         <FileText className="h-3.5 w-3.5" /> MP4 Archive
                      </div>
                      <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="p-8 pt-0">
                    <Button className="w-full justify-center gap-3 rounded-2xl text-[11px] font-black uppercase tracking-widest h-14 bg-stone-900 text-white shadow-xl hover:bg-black active:scale-95 transition-all border-none">
                       <Download className="h-4 w-4" /> Download Files
                    </Button>
                  </div>
                </GlassCard>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}
