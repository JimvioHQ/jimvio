"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Zap, Loader2, Package, Store, LayoutGrid, Clock, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ products: any[], vendors: any[], categories: any[] }>({ products: [], vendors: [], categories: [] });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.length < 2) {
      setResults({ products: [], vendors: [], categories: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => setResults(d))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsFocused(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleSearch = (term = q) => {
    const sp = new URLSearchParams();
    if (term.trim()) sp.set("q", term.trim());
    router.push(`/marketplace${sp.toString() ? `?${sp.toString()}` : ""}`);
  };

  return (
    <div ref={containerRef} className="w-full max-w-[800px] z-[100] relative group/hero">
      <motion.form
        animate={{ 
           scale: isFocused ? 1.02 : 1,
           y: isFocused ? -5 : 0
        }}
        className={cn(
          "relative flex items-center h-16 sm:h-20 rounded-[2.5rem] transition-all duration-500 overflow-hidden",
          isFocused 
            ? "bg-white border-2 border-[#f97316] shadow-[0_32px_80px_rgba(249,115,22,0.25)]" 
            : "bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:bg-white/60 hover:border-white/80"
        )}
        onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
      >
        <div className="flex-1 flex items-center px-6 sm:px-10 h-full">
           {loading ? <Loader2 className="h-6 w-6 animate-spin text-[#f97316] mr-4" /> : <Search className="h-6 w-6 text-zinc-400 mr-4" />}
           <input
             type="text"
             value={q}
             onFocus={() => setIsFocused(true)}
             onChange={(e) => setQ(e.target.value)}
             placeholder="Search products or explore industries..."
             className="flex-1 bg-transparent border-0 outline-none text-[16px] sm:text-[20px] font-black text-zinc-900 placeholder:text-zinc-400 placeholder:font-bold h-full"
           />
        </div>

        <button
          type="submit"
          className="h-full px-8 sm:px-12 bg-zinc-900 hover:bg-black text-white text-[14px] sm:text-[18px] font-black flex items-center gap-3 transition-colors shrink-0 group/btn"
        >
          <Zap className="h-5 w-5 fill-[#f97316] stroke-none group-hover:scale-120 transition-transform" />
          <span className="hidden sm:inline">AI Match</span>
        </button>
      </motion.form>

      {/* QUICK ACCESS PANEL */}
      <AnimatePresence>
         {isFocused && (
            <motion.div
               initial={{ opacity: 0, y: 15, scale: 0.98 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 10, scale: 0.98 }}
               className="absolute top-full left-0 right-0 mt-4 bg-white/90 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 shadow-[0_40px_100px_rgba(0,0,0,0.2)] overflow-hidden"
            >
               <div className="grid grid-cols-1 md:grid-cols-12 divide-x divide-zinc-50">
                  {/* SEARCH RESULTS */}
                  <div className="md:col-span-8 p-10 space-y-8 max-h-[500px] overflow-y-auto no-scrollbar">
                     {q.length < 2 ? (
                        <div className="space-y-6">
                           <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Trending Now</h4>
                           <div className="grid grid-cols-2 gap-3">
                              {["Electric Vehicles", "Sustainable Fashion", "Smart Home Tech", "Organic Skincare"].map(t => (
                                 <button key={t} onClick={() => { setQ(t); handleSearch(t); }} className="flex items-center justify-between p-4 rounded-3xl bg-zinc-50 hover:bg-[#f97316]/5 text-left transition-all group">
                                    <span className="text-[14px] font-bold text-zinc-700">{t}</span>
                                    <ArrowUpRight className="h-4 w-4 text-zinc-300 group-hover:text-[#f97316] transition-all" />
                                 </button>
                              ))}
                           </div>
                        </div>
                     ) : (
                        <div className="space-y-6">
                           {results.products.length > 0 && (
                              <div>
                                 <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-4">Discovery Results</h4>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {results.products.slice(0, 4).map(p => (
                                       <button key={p.id} onClick={() => router.push(`/marketplace/${p.slug}`)} className="flex items-center gap-4 p-4 rounded-[2rem] bg-zinc-50/50 hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-zinc-100 group text-left">
                                          <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                             <Package className="h-5 w-5 text-[#f97316]" />
                                          </div>
                                          <span className="text-[14px] font-bold text-zinc-800 truncate">{p.name}</span>
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           )}
                           
                           {results.categories.length > 0 && (
                              <div className="pt-6 border-t border-zinc-50">
                                 <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-4">Industries</h4>
                                 <div className="flex flex-wrap gap-2">
                                    {results.categories.slice(0, 6).map(c => (
                                       <button key={c.id} onClick={() => router.push(`/marketplace?cat=${c.slug}`)} className="px-5 py-2 rounded-full bg-zinc-100/50 text-zinc-600 text-[13px] font-bold hover:bg-[#f97316] hover:text-white transition-all">
                                          {c.name}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     )}
                  </div>

                  {/* SIDEBAR: STORES & HELP */}
                  <div className="md:col-span-4 p-10 bg-zinc-50/30 space-y-10">
                     {results.vendors.length > 0 && (
                        <div>
                           <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-6">Top Verified Stores</h4>
                           <div className="space-y-2">
                              {results.vendors.slice(0, 3).map(v => (
                                 <button key={v.id} onClick={() => router.push(`/vendors/${v.business_slug}`)} className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white text-left transition-all">
                                    <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[15px] font-black text-[#f97316]">{v.business_name[0]}</div>
                                    <div className="min-w-0">
                                       <p className="text-[14px] font-bold text-zinc-900 truncate">{v.business_name}</p>
                                       <p className="text-[10px] font-black text-[#f97316] uppercase mt-0.5">Verified</p>
                                    </div>
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}

                     <div>
                        <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-6">Quick Links</h4>
                        <div className="grid grid-cols-1 gap-2">
                           <button onClick={() => router.push('/help')} className="flex items-center gap-3 text-zinc-500 hover:text-zinc-900 text-[14px] font-bold transition-all p-2 rounded-xl hover:bg-white">
                              <LayoutGrid className="h-4 w-4" /> Support Portal
                           </button>
                           <button onClick={() => router.push('/marketplace')} className="flex items-center gap-3 text-zinc-500 hover:text-zinc-900 text-[14px] font-bold transition-all p-2 rounded-xl hover:bg-white">
                              <Clock className="h-4 w-4" /> Browsing History
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               <button onClick={() => handleSearch()} className="w-full h-16 bg-zinc-900 hover:bg-black text-white text-[15px] font-black flex items-center justify-center gap-3 transition-colors">
                  Explore full marketplace for "{q || 'everything'}" <ArrowUpRight className="h-5 w-5" />
               </button>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
