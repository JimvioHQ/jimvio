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
  return s ? `/marketplace?${s}` : "/marketplace";
}

export function MarketplaceSearch({
  currentParams,
  className,
}: {
  currentParams: Record<string, string | undefined>;
  className?: string;
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
        placeholder="Search marketplace..."
        autoComplete="off"
        className="w-full h-[52px] pl-11 pr-12 rounded-2xl border border-zinc-200 bg-white/70 backdrop-blur-xl text-[15px] font-medium text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-[#f97316]/10 focus:border-[#f97316]/40 hover:border-[#f97316]/30 hover:bg-white transition-all shadow-sm"
      />
      
      {q.trim() && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-4 flex items-center group/clear outline-none z-10"
        >
          <div className="bg-zinc-100 p-1 rounded-full group-hover/clear:bg-zinc-200 transition-colors">
            <X className="h-3 w-3 text-zinc-600" />
          </div>
        </button>
      )}

      {/* SEARCH DROPDOWN */}
      <AnimatePresence>
        {showDropdown && (q.trim().length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-2xl border border-zinc-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            <div className="p-2">
              {suggestions.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-4 py-2 text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                    Quick Results
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin text-[#f97316]" />}
                  </div>
                  {suggestions.map((p) => (
                    <Link
                      key={p.id}
                      href={`/marketplace/${p.slug}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 p-3 rounded-[18px] hover:bg-zinc-50 transition-colors group/item"
                    >
                      <div className="h-10 w-10 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-100 shrink-0 group-hover/item:border-[#f97316]/20">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-300">
                             <Search className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-bold text-zinc-900 truncate group-hover/item:text-[#f97316] transition-colors">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-2">
                             <LocalizedPrice amount={p.price} currency={p.currency} className="text-[13px] font-black text-[#f97316]" />
                             <span className="text-[11px] text-zinc-400 font-medium">· marketplace</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-300 -translate-x-2 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100 transition-all" />
                    </Link>
                  ))}
                  <Link
                    href={marketplaceHref(currentParams, { q: q.trim() })}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 mt-1 text-[13px] font-black text-white bg-zinc-900 hover:bg-black rounded-2xl transition-all"
                  >
                    View all results for "{q.trim()}"
                  </Link>
                </div>
              ) : !isLoading ? (
                <div className="px-4 py-8 text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-50 text-zinc-300">
                     <Search className="h-6 w-6" />
                  </div>
                  <p className="text-[14px] font-bold text-zinc-900">No products found</p>
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
