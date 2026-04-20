"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getSearchSuggestions } from "@/lib/actions/marketplace";
import { LocalizedPrice } from "@/components/currency/localized-price";

/** Merge query params; reset to page 1 unless `updates` includes a `page` key. */
export function marketplaceHref(
  current: Record<string, string | undefined>,
  updates: Record<string, string | undefined | null>,
  basePath = "/marketplace"
): string {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(current)) {
    if (v != null && v !== "") out[k] = v;
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === "") delete out[k];
    else out[k] = v;
  }

  const pageExplicit = Object.prototype.hasOwnProperty.call(updates, "page");
  if (!pageExplicit) out.page = "1";
  else if (updates.page === null || updates.page === "") delete out.page;

  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(out)) {
    if (v != null && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export function MarketplaceSearch({
  currentParams,
  className,
  basePath = "/marketplace"
}: {
  currentParams: Record<string, string | undefined>;
  className?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(currentParams.q ?? "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state if URL changes externally
  useEffect(() => {
    setQ(currentParams.q ?? "");
  }, [currentParams.q]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Auto-Submit & Suggestions
  const handleType = async (newVal: string) => {
    setQ(newVal);
    const trimmed = newVal.trim();

    if (!trimmed) {
      setSuggestions([]);
      setShowDropdown(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    setShowDropdown(true);
    setIsLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    // Auto submit after 600ms of typing (slightly longer for full search)
    debounceRef.current = setTimeout(async () => {
      // Fetch suggestions
      const result = await getSearchSuggestions(trimmed);
      if (result.success) {
        setSuggestions(result.products || []);
      }
      setIsLoading(false);

      // Perform full search update in URL
      const href = marketplaceHref(currentParams, { q: trimmed || null });
      router.push(href);
    }, 400);
  };

  const handleClear = () => {
    setQ("");
    setSuggestions([]);
    setShowDropdown(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const href = marketplaceHref(currentParams, { q: null });
    router.push(href);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-[600px] group isolate z-[100]", className)}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
        {isLoading ? (
          <Loader2 className="h-[18px] w-[18px] text-[#f97316] animate-spin" />
        ) : (
          <Search className="h-[18px] w-[18px] text-zinc-400 group-focus-within:text-[#f97316] transition-colors" />
        )}
      </div>
      
      <input
        type="search"
        value={q}
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => q.trim() && setShowDropdown(true)}
        placeholder={
          currentParams.type === "digital" 
            ? "Search for digital assets, courses & tools..." 
            : currentParams.type === "physical"
            ? "Search for physical products & gear..."
            : "Search for amazing products..."
        }
        autoComplete="off"
        className={cn(
          "w-full h-[56px] pl-12 pr-12 rounded-full",
          "border border-white/80 dark:border-border-strong/80 bg-white dark:bg-surface/60 dark:bg-surface/60",
          "shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(249,115,22,0.08)]",
          "text-[16px] font-bold text-stone-900 dark:text-white tracking-tight",
          "placeholder:text-stone-400 dark:placeholder:text-stone-500 placeholder:font-semibold",
          "focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500/50 focus:bg-white dark:bg-surface dark:focus:bg-zinc-900",
          "transition-all duration-300 ease-out",
          "apple-glass-blur"
        )}
        style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setShowDropdown(false);
            router.push(marketplaceHref(currentParams, { q: q.trim() || null }, basePath));
          }
        }}
      />
      
      {q.trim() && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-4 flex items-center group/clear outline-none z-10"
        >
          <div className="bg-zinc-100 dark:bg-surface-secondary p-1 rounded-full group-hover/clear:bg-zinc-200 dark:group-hover/clear:bg-zinc-700 transition-colors">
            <X className="h-3 w-3 text-zinc-600 dark:text-text-muted" />
          </div>
        </button>
      )}

      {/* SEARCH DROPDOWN */}
      <AnimatePresence>
        {showDropdown && (q.trim().length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-surface/95 dark:bg-surface/95 backdrop-blur-3xl border border-stone-200/50 dark:border-border/50 rounded-[28px] shadow-[0_30px_60px_rgba(0,0,0,0.12)] overflow-hidden"
          >
            <div className="p-2">
              {suggestions.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-5 py-3 text-[11px] font-black text-stone-400 uppercase tracking-widest flex items-center justify-between">
                    Top Matches
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin text-orange-500" />}
                  </div>
                  {suggestions.map((p) => (
                    <Link
                      key={p.id}
                      href={`/marketplace/${p.slug}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-4 px-3 py-2.5 rounded-[20px] hover:bg-stone-50 dark:bg-surface/50 dark:hover:bg-stone-800/50 transition-colors group/item mx-2"
                    >
                      <div className="h-10 w-10 rounded-xl overflow-hidden bg-zinc-100 dark:bg-surface-secondary border border-zinc-100 dark:border-border shrink-0 group-hover/item:border-[#f97316]/20">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-300">
                             <Search className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[15px] font-black text-stone-900 dark:text-white truncate group-hover/item:text-orange-500 transition-colors">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-2">
                             <LocalizedPrice amount={p.price} currency={p.currency} className="text-[14px] font-black text-orange-500" />
                             <span className="text-[12px] text-stone-400 font-semibold">· in store</span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-stone-300 -translate-x-3 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100 transition-all" />
                    </Link>
                  ))}
                  <Link
                    href={marketplaceHref(currentParams, { q: q.trim() }, basePath)}
                    onClick={() => setShowDropdown(false)}
                    className="group flex items-center justify-between w-[calc(100%-16px)] mx-2 my-2 py-4 px-6 text-[14px] font-black text-white dark:text-zinc-900 dark:text-white bg-stone-900 dark:bg-white dark:bg-surface hover:bg-black dark:hover:bg-zinc-200 rounded-2xl transition-all shadow-md hover:shadow-lg hover:shadow-stone-900/20 dark:hover:shadow-white/20"
                  >
                    <span>View all results for "{q.trim()}"</span>
                    <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              ) : !isLoading ? (
                <div className="px-4 py-8 text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-50 dark:bg-surface-secondary text-zinc-300 dark:text-zinc-600">
                     <Search className="h-6 w-6" />
                  </div>
                  <p className="text-[14px] font-bold text-zinc-900 dark:text-white">No products found</p>
                  <p className="text-[12px] text-zinc-500 font-medium px-4">Try checking your spelling or use different keywords.</p>
                </div>
              ) : (
                <div className="px-4 py-12 flex flex-col items-center gap-3">
                   <Loader2 className="h-6 w-6 text-[#f97316] animate-spin" />
                   <p className="text-[13px] font-bold text-zinc-400">Searching the marketplace...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
