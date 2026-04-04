"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
   Search, Package, Loader2, Store, Command, ArrowRight, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NavLinkConfig } from "@/lib/platform-settings-shared";
import {
   addNavSearchHistory, clearNavSearchHistory, readNavSearchHistory,
} from "@/lib/marketplace-search-history";

type ProductRow = { id: string; name: string; slug: string };
type VendorRow = { id: string; business_name: string; business_slug: string };
type CategoryRow = { id: string; name: string; slug: string };

const EXTRA_QUICK_LINKS: NavLinkConfig[] = [
   { label: "Help", href: "/help" },
   { label: "Deals", href: "/deals" },
   { label: "Contact", href: "/contact" },
   { label: "Blog", href: "/blog" },
   { label: "Cart", href: "/cart" },
];

function mergeQuickLinks(navLinks: NavLinkConfig[]): NavLinkConfig[] {
   const seen = new Set<string>();
   const out: NavLinkConfig[] = [];
   for (const item of [...navLinks, ...EXTRA_QUICK_LINKS]) {
      if (!item?.href || !item?.label) continue;
      const key = item.href.replace(/\/$/, "") || "/";
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
   }
   return out;
}

export function NavbarSearch({
   searchQ, setSearchQ, placeholder, isScrolled, variant,
   onNavigate, runSearch, navLinks,
}: any) {
   const router = useRouter();
   const containerRef = useRef<HTMLDivElement>(null);
   const inputRef = useRef<HTMLInputElement>(null);
   const [portalReady, setPortalReady] = useState(false);
   const [open, setOpen] = useState(false);
   const [isFocused, setIsFocused] = useState(false);
   const [history, setHistory] = useState<string[]>([]);
   const [products, setProducts] = useState<ProductRow[]>([]);
   const [vendors, setVendors] = useState<VendorRow[]>([]);
   const [categories, setCategories] = useState<CategoryRow[]>([]);
   const [loading, setLoading] = useState(false);

   const isDesktop = variant === "desktop";

   useEffect(() => {
      setPortalReady(true);
      const handleKeyDown = (e: KeyboardEvent) => {
         if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            inputRef.current?.focus();
         }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
   }, []);

   useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
         if (e.key === "Escape" && open) { e.preventDefault(); closePanel(); inputRef.current?.blur(); }
      };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
   }, [open]);

   useEffect(() => {
      const onDoc = (e: MouseEvent) => {
         if (containerRef.current?.contains(e.target as Node)) return;
         closePanel(); setIsFocused(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
   }, []);

   useEffect(() => {
      const q = searchQ.trim();
      if (q.length < 2) {
         setProducts([]); setVendors([]); setCategories([]); setLoading(false); return;
      }
      setLoading(true);
      const id = setTimeout(() => {
         fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => {
               setProducts(d.products || []);
               setVendors(d.vendors || []);
               setCategories(d.categories || []);
            })
            .finally(() => setLoading(false));
      }, 300);
      return () => clearTimeout(id);
   }, [searchQ]);

   const closePanel = () => setOpen(false);
   const commitSearch = (term: string) => {
      addNavSearchHistory(term); runSearch(term); closePanel();
      setIsFocused(false); inputRef.current?.blur();
   };

   const showPanel = open && (searchQ.trim().length > 0 || isFocused);
   const expandedWidth = isDesktop ? (isFocused ? 420 : searchQ ? 200 : 180) : "100%";

   const resultsPanel = (
      <div className="bg-white/95 backdrop-blur-3xl border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden rounded-[32px] max-h-[600px]">
         {/* Header */}
         <div className="p-5 border-b border-zinc-100 flex items-center gap-4 bg-zinc-50/50">
            <Search className="h-5 w-5 text-[#f97316] shrink-0" />
            <p className="text-[15px] font-bold text-zinc-900 flex-1 truncate">
               {searchQ ? `Searching for "${searchQ}"` : "Explore the marketplace"}
            </p>
            <button
               onClick={() => { closePanel(); inputRef.current?.blur(); }}
               className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-zinc-200 text-[10px] font-black text-zinc-400 hover:border-zinc-300 transition-colors"
            >
               <Command className="h-3 w-3" /> ESC
            </button>
         </div>

         {/* Body */}
         <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-12 divide-x divide-zinc-50">
            {/* Left: results */}
            <div className="md:col-span-8 p-6 space-y-8">
               {loading && (
                  <div className="flex items-center gap-3 py-4">
                     <Loader2 className="h-5 w-5 animate-spin text-[#f97316]" />
                     <p className="text-[14px] font-black text-zinc-400">Summoning product matches…</p>
                  </div>
               )}

               {!loading && products.length > 0 && (
                  <div>
                     <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-4">Top Matches</h4>
                     <div className="space-y-2">
                        {products.map(p => (
                           <button
                              key={p.id}
                              onClick={() => { router.push(`/marketplace/${p.slug}`); closePanel(); setIsFocused(false); }}
                              className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50/30 hover:bg-[#f97316]/5 border border-transparent hover:border-[#f97316]/10 transition-all group"
                           >
                              <div className="flex items-center gap-4">
                                 <Package className="h-5 w-5 text-zinc-300 group-hover:text-[#f97316] transition-colors" />
                                 <span className="text-[14px] font-bold text-zinc-700 group-hover:text-zinc-900 truncate max-w-[300px]">{p.name}</span>
                              </div>
                              <ArrowRight className="h-4 w-4 text-zinc-300 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                           </button>
                        ))}
                     </div>
                  </div>
               )}

               {!loading && searchQ && products.length === 0 && vendors.length === 0 && (
                  <div className="py-20 text-center space-y-4">
                     <div className="h-16 w-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
                        <Search className="h-8 w-8 text-zinc-200" />
                     </div>
                     <div>
                        <p className="text-[15px] font-black text-zinc-900">No immediate matches</p>
                        <p className="text-[13px] font-medium text-zinc-500 mt-1">Try checking your spelling or hit Enter for a full search.</p>
                     </div>
                  </div>
               )}

               {!loading && !searchQ && (
                  <div>
                     <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-4">Quick Search Suggestions</h4>
                     <p className="text-[13px] font-medium text-zinc-400">Start typing to discover products, vendors & more.</p>
                  </div>
               )}
            </div>

            {/* Right: vendors + quick links */}
            <div className="md:col-span-4 p-6 bg-zinc-50/30 space-y-8">
               {vendors.length > 0 && (
                  <div>
                     <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-4">Stores</h4>
                     <div className="space-y-1">
                        {vendors.map(v => (
                           <button
                              key={v.id}
                              onClick={() => { router.push(`/vendors/${v.business_slug}`); closePanel(); setIsFocused(false); }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white text-[13px] font-bold text-zinc-600 transition-all"
                           >
                              <Store className="h-4 w-4 opacity-50" /> {v.business_name}
                           </button>
                        ))}
                     </div>
                  </div>
               )}

               <div>
                  <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-4">Quick Browse</h4>
                  <div className="grid grid-cols-1 gap-1">
                     {mergeQuickLinks(navLinks).slice(0, 6).map(l => (
                        <button
                           key={l.href}
                           onClick={() => { router.push(l.href); closePanel(); setIsFocused(false); }}
                           className="flex items-center justify-between p-3 rounded-xl hover:bg-white border border-transparent hover:border-zinc-100 transition-all text-[13px] font-bold text-zinc-500 group"
                        >
                           {l.label}
                           <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* Footer CTA */}
         <button
            onClick={() => commitSearch(searchQ)}
            className="p-4 bg-zinc-900 hover:bg-black text-white text-[13px] font-black flex items-center justify-center gap-2 transition-all"
         >
            View full catalog results for "{searchQ || "everything"}" <ArrowRight className="h-4 w-4" />
         </button>
      </div>
   );

   return (
      <div ref={containerRef} className={cn("relative z-[200]", isDesktop ? "flex-initial" : "flex-1 w-full")}>
         <motion.div
            animate={{
               width: isDesktop ? expandedWidth : "100%",
               scale: isFocused ? 1.02 : 1,
            }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className={cn(
               "flex items-center h-[46px] rounded-full border transition-all duration-300 overflow-hidden",
               isFocused
                  ? "bg-white border-[#f97316]/40 shadow-[0_0_25px_rgba(249,115,22,0.15)]"
                  : searchQ
                     ? "bg-white border-zinc-200 shadow-sm"
                     : "bg-zinc-100/60 border-zinc-200/50 hover:bg-zinc-100"
            )}
         >
            <div className="pl-4 pr-1 shrink-0">
               {loading
                  ? <Loader2 className="h-[18px] w-[18px] animate-spin text-[#f97316]" />
                  : <Search className={cn("h-[18px] w-[18px] transition-colors", isFocused || searchQ ? "text-[#f97316]" : "text-zinc-400")} />
               }
            </div>
            <input
               ref={inputRef}
               type="text"
               value={searchQ}
               onChange={(e) => { setSearchQ(e.target.value); setOpen(true); }}
               onFocus={() => { setOpen(true); setIsFocused(true); setHistory(readNavSearchHistory()); }}
               onBlur={() => setTimeout(() => setIsFocused(false), 150)}
               onKeyDown={(e) => {
                  if (e.key === "Enter") commitSearch(searchQ);
                  if (e.key === "Escape") { closePanel(); inputRef.current?.blur(); }
               }}
               placeholder={isDesktop && !isFocused && !searchQ ? "" : (placeholder ?? "Search…")}
               className="flex-1 min-w-0 bg-transparent border-0 outline-none px-2 text-[13.5px] font-black text-zinc-900 placeholder:text-zinc-400 placeholder:font-bold"
            />

            {/* Clear */}
            <AnimatePresence>
               {searchQ && (
                  <motion.button
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.8 }}
                     transition={{ duration: 0.15 }}
                     onClick={() => { setSearchQ(""); setOpen(false); inputRef.current?.focus(); }}
                     className="mr-3 h-5 w-5 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center shrink-0 transition-colors"
                     tabIndex={-1}
                  >
                     <X className="h-3 w-3 text-zinc-500" />
                  </motion.button>
               )}
            </AnimatePresence>

            {/* Cmd+K hint */}
            <AnimatePresence>
               {!isFocused && !searchQ && isDesktop && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pr-4 flex items-center gap-1.5 shrink-0 pointer-events-none">
                     <div className="px-1.5 py-0.5 rounded bg-zinc-200/50 text-[8px] font-black text-zinc-400 flex items-center gap-0.5">
                        <Command className="h-2 w-2" /> K
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </motion.div>

         {/* Portal panel */}
         {showPanel && portalReady && createPortal(
            <div className="fixed inset-0 z-[190] p-4 flex items-start justify-center pt-[100px] sm:pt-[120px]">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/5 backdrop-blur-[2px]" onClick={closePanel} />
               <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full max-w-[800px] relative z-10"
               >
                  {resultsPanel}
               </motion.div>
            </div>,
            document.body
         )}
      </div>
   );
}