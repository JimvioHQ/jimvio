"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Package, Search, ExternalLink, Video, FileText, Zap, RefreshCw } from "lucide-react";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface LibraryItem {
  id: string;
  product_name: string;
  product_image: string | null;
  product_type: string | null;
  digital_download_url: string | null;
  access_granted_at: string | null;
  created_at: string;
  orders: { payment_status: string; buyer_id: string } | null;
}

function fileTypeBadge(url: string | null) {
  if (!url) return "Digital File";
  const ext = url.split(".").pop()?.toUpperCase() ?? "";
  if (["PDF"].includes(ext)) return "PDF Document";
  if (["ZIP", "RAR"].includes(ext)) return "Archive Package";
  if (["MP4", "MOV", "AVI"].includes(ext)) return "Video File";
  if (["MP3", "WAV"].includes(ext)) return "Audio File";
  if (["PNG", "JPG", "JPEG", "WEBP"].includes(ext)) return "Image File";
  if (["DOCX", "DOC"].includes(ext)) return "Word Document";
  if (["XLSX", "XLS"].includes(ext)) return "Spreadsheet";
  return "Digital Asset";
}

export default function DigitalLibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch digital order items from paid orders
      // order_items.product_type = 'digital' (from migration 053)
      // Falls back to any order with access_granted_at for backward compat
      const { data } = await supabase
        .from("order_items")
        .select(`
          id, product_name, product_image, product_type,
          digital_download_url, access_granted_at, created_at,
          orders!inner ( payment_status, buyer_id )
        `)
        .eq("orders.buyer_id", user.id)
        .eq("orders.payment_status", "completed")
        .in("product_type", ["digital", "software", "courses", "ai-tools", "templates", "ebooks", "music-audio", "graphics-design", "photography"])
        .order("created_at", { ascending: false });

      // Fallback: also fetch items where access_granted_at is set (legacy records)
      const { data: legacyData } = await supabase
        .from("order_items")
        .select(`
          id, product_name, product_image, product_type,
          digital_download_url, access_granted_at, created_at,
          orders!inner ( payment_status, buyer_id )
        `)
        .eq("orders.buyer_id", user.id)
        .eq("orders.payment_status", "completed")
        .not("access_granted_at", "is", null)
        .is("product_type", null);

      // Merge and deduplicate by id
      const combined = [...(data ?? []), ...(legacyData ?? [])];
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );

      setItems(unique as unknown as LibraryItem[]);
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
           <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-none scale-150 animate-pulse" />
           <div className="relative w-24 h-24 rounded-none bg-surface dark:bg-surface border border-border shadow-none flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-none animate-spin m-2" />
             <Video className="h-10 w-10 text-stone-900 dark:text-white" />
           </div>
         </div>
         <div className="text-center space-y-3">
            <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Digital Library</h2>
            <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest pl-[0.1em]">Syncing Purchased Assets</p>
         </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="indigo" position="bottom-left" />

      <div className="max-w-[1400px] mx-auto space-y-10 px-4 sm:px-6 pt-8 sm:pt-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8">
           <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-none bg-surface dark:bg-surface border border-border shadow-none shrink-0">
                    <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-orange-500" />
                 </div>
                 Digital Library
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-[0.3em] pl-14 sm:pl-16">
                 {items.length} purchased {items.length === 1 ? "asset" : "assets"} · Instant access
              </p>
           </div>
           
           <div className="relative w-full md:w-80">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 dark:text-stone-600 pointer-events-none" />
              <input
                 placeholder="Search your library..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full h-12 sm:h-14 pl-12 pr-6 rounded-none bg-surface dark:bg-surface border border-border text-[13px] font-bold text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-600 shadow-none focus:outline-none focus:bg-surface-secondary dark:focus:bg-zinc-800 transition-all"
              />
           </div>
        </div>

        {filtered.length === 0 ? (
           <GlassCard className="p-16 sm:p-24 text-center rounded-none sm:rounded-none border-border bg-surface dark:bg-surface/20">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-surface dark:bg-surface rounded-none sm:rounded-none flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-border shadow-none">
                 <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-stone-300 dark:text-stone-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tighter uppercase">Library is Empty</h2>
              <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest mt-4 max-w-sm mx-auto leading-relaxed">
                 Digital purchases like templates, courses, and software will appear here instantly after payment.
              </p>
              <Button asChild className="h-14 sm:h-16 px-10 sm:px-12 rounded-none sm:rounded-none bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-none mt-8 sm:mt-10 hover:bg-black dark:hover:bg-stone-100 transition-all border-none">
                 <Link href="/marketplace">Explore Marketplace</Link>
              </Button>
           </GlassCard>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {filtered.map((item) => {
                const fileLabel = fileTypeBadge(item.digital_download_url);
                const grantedDate = item.access_granted_at
                  ? new Date(item.access_granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

                return (
                  <GlassCard key={item.id} className="overflow-hidden p-0 rounded-none sm:rounded-none border-border bg-surface dark:bg-surface/60 hover:shadow-none hover:bg-surface-secondary dark:hover:bg-zinc-800 transition-all duration-500 group">
                    {/* Thumbnail */}
                    <div className="aspect-[4/3] relative bg-stone-100 dark:bg-surface-secondary overflow-hidden">
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
                          <Zap className="h-10 w-10 text-indigo-300 dark:text-indigo-700" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 dark:text-indigo-700">Digital Asset</span>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                         {item.digital_download_url ? (
                           <a href={item.digital_download_url} target="_blank" rel="noopener noreferrer" download>
                             <Button size="icon" className="rounded-none h-12 w-12 sm:h-14 sm:w-14 bg-surface dark:bg-surface text-stone-900 dark:text-white hover:bg-surface-secondary dark:hover:bg-zinc-800 border-0 shadow-none hover:scale-110 transition-all">
                               <Download className="h-5 w-5 sm:h-6 sm:w-6" />
                             </Button>
                           </a>
                         ) : (
                           <Button size="icon" disabled className="rounded-none h-12 w-12 sm:h-14 sm:w-14 opacity-50 bg-surface dark:bg-surface border-0">
                             <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                           </Button>
                         )}
                         <a href={item.digital_download_url ?? "#"} target="_blank" rel="noopener noreferrer">
                           <Button size="icon" className="rounded-none h-12 w-12 sm:h-14 sm:w-14 bg-surface dark:bg-surface text-stone-900 dark:text-white hover:bg-surface-secondary dark:hover:bg-zinc-800 border-0 shadow-none hover:scale-110 transition-all">
                             <ExternalLink className="h-5 w-5 sm:h-6 sm:w-6" />
                           </Button>
                         </a>
                      </div>

                      {/* Type badge */}
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-surface/90 dark:bg-surface/90 backdrop-blur-xl px-3 py-1.5 sm:px-4 rounded-none text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-stone-900 dark:text-white shadow-none border border-border">
                          âš¡ Digital
                      </div>

                      {/* Access granted indicator */}
                      {item.digital_download_url && (
                        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 rounded-none text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-white">
                          ✓" Access Granted
                        </div>
                      )}
                      {!item.digital_download_url && (
                        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-amber-500/90 backdrop-blur-md px-2.5 py-1 rounded-none text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-white">
                          â³ Processing
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-5 sm:p-8">
                      <h4 className="font-black text-base sm:text-xl text-stone-900 dark:text-white truncate tracking-tighter mb-3 sm:mb-4 group-hover:text-orange-600 transition-colors">{item.product_name}</h4>
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted bg-surface-secondary dark:bg-surface-secondary px-2.5 py-1.5 rounded-none">
                           <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {fileLabel}
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-bold text-stone-300 dark:text-stone-600 uppercase tracking-widest">{grantedDate}</span>
                      </div>

                      {/* Download button */}
                      {item.digital_download_url ? (
                        <a href={item.digital_download_url} target="_blank" rel="noopener noreferrer" download className="block">
                          <Button className="w-full justify-center gap-2 sm:gap-3 rounded-none sm:rounded-none text-[10px] sm:text-[11px] font-black uppercase tracking-widest h-12 sm:h-14 bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white shadow-none hover:bg-black dark:hover:bg-stone-100 active:scale-95 transition-all border-none">
                             <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Download File
                          </Button>
                        </a>
                      ) : (
                        <Button disabled className="w-full justify-center gap-2 sm:gap-3 rounded-none sm:rounded-none text-[10px] sm:text-[11px] font-black uppercase tracking-widest h-12 sm:h-14 bg-stone-200 dark:bg-surface-secondary text-stone-400 dark:text-text-muted border-none opacity-70">
                           <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> Preparing...
                        </Button>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
           </div>
        )}
      </div>
    </div>
  );
}

