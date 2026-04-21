"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, Package, Loader2, Store, Command, ArrowRight, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NavLinkConfig } from "@/lib/platform-settings-shared";
import { addNavSearchHistory, readNavSearchHistory } from "@/lib/marketplace-search-history";

type ProductRow  = { id: string; name: string; slug: string };
type VendorRow   = { id: string; business_name: string; business_slug: string };

const EXTRA: NavLinkConfig[] = [
  { label: "Help",    href: "/help"    },
  { label: "Deals",   href: "/deals"   },
  { label: "Contact", href: "/contact" },
  { label: "Blog",    href: "/blog"    },
  { label: "Cart",    href: "/cart"    },
];

function mergeLinks(navLinks: NavLinkConfig[]) {
  const seen = new Set<string>();
  return [...navLinks, ...EXTRA].filter(l => {
    if (!l?.href || !l?.label) return false;
    const k = l.href.replace(/\/$/, "") || "/";
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

/* ── Dark glass search input shell ── */
/* ── Professional Solid Input Shells ── */
const INPUT_IDLE: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  boxShadow: "var(--shadow-sm)",
};
const INPUT_FOCUSED: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-accent)",
  boxShadow: "0 0 0 1px var(--color-accent)",
};
const INPUT_LIGHT: React.CSSProperties = INPUT_IDLE;
const INPUT_LIGHT_FOCUSED: React.CSSProperties = INPUT_FOCUSED;

export function NavbarSearch({
  searchQ, setSearchQ, placeholder, isScrolled, variant,
  runSearch, navLinks,
}: any) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(false);

  const isDesktop = variant === "desktop";

  useEffect(() => {
    setPortalReady(true);
    const kd = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && open) { close(); inputRef.current?.blur(); } };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  useEffect(() => {
    const outside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) { close(); setFocused(false); }
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) { setProducts([]); setVendors([]); setLoading(false); return; }
    setLoading(true);
    const id = setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => { setProducts(d.products || []); setVendors(d.vendors || []); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(id);
  }, [searchQ]);

  const close = () => setOpen(false);
  const commit = (term: string) => {
    addNavSearchHistory(term); runSearch(term); close(); setFocused(false); inputRef.current?.blur();
  };

  const showPanel = open && (searchQ.trim().length > 0 || focused);
  const expandedW = isDesktop ? (focused ? 320 : searchQ ? 200 : 180) : "100%";

  /* ── Input style selection ── */
  const inputStyle = focused ? INPUT_LIGHT_FOCUSED : INPUT_LIGHT;

  return (
    <div ref={containerRef} className={cn("relative flex items-center", isDesktop ? "flex-initial gap-2" : "flex-1 w-full")}>
      <motion.div
        animate={{ width: isDesktop ? expandedW : "auto" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className={cn("relative flex items-center h-11 rounded-full overflow-hidden transition-all duration-200", !isDesktop && "flex-1")}
        style={isDesktop ? inputStyle : { background: "transparent" }}
      >
        {/* Top specular on input */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-full"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,1) 50%,transparent)" }}
        />

        <div className="pl-3.5 pr-1 shrink-0">
          {loading
            ? <Loader2 className="h-[17px] w-[17px] animate-spin text-orange-500" />
            : <Search className={cn("h-[17px] w-[17px] transition-colors ", focused || searchQ
                ? "text-orange-500"
                : "text-stone-400")} />
          }
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQ}
          onChange={e => { setSearchQ(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setFocused(true); }}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={e => {
            if (e.key === "Enter") commit(searchQ);
            if (e.key === "Escape") { close(); inputRef.current?.blur(); }
          }}
          placeholder={!isDesktop && !focused && !searchQ ? "" : (placeholder ?? "Search…")}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none px-2 text-[13px] font-semibold placeholder:font-normal"
          style={{ color: "var(--color-text-primary)", caretColor: "#f97316" }}
        />

        {/* Clear */}
        <AnimatePresence>
          {searchQ && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
              onClick={() => { setSearchQ(""); setOpen(false); inputRef.current?.focus(); }}
              className="mr-3 h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all"
              style={{ background: "rgba(0,0,0,0.08)" }}
              tabIndex={-1}
            >
              <X className="h-3 w-3 text-stone-500" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Cmd+K hint — desktop only */}
        <AnimatePresence>
          {!focused && !searchQ && isDesktop && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="pr-3.5 flex items-center gap-1 shrink-0 pointer-events-none">
              <kbd className="px-1.5 py-0.5 rounded text-[8px] font-bold text-stone-400 flex items-center gap-0.5"
                style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)" }}>
                <Command className="h-2 w-2" /> K
              </kbd>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Integrated Filter button for mobile */}
      {!isDesktop && (
        <button
          onClick={() => { /* Action */ }}
          className="h-full px-4 flex items-center justify-center border-l border-black/5 dark:border-white/10 text-orange-500 active:bg-black/5 transition-colors"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      )}

      {/* ── Results portal ── */}
      {showPanel && portalReady && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-start justify-center pt-32 sm:pt-28 px-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.12)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[780px] relative z-10 rounded-xl border border-border shadow-2xl bg-surface overflow-hidden"
          >

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
              <Search className="h-5 w-5 text-orange-500 shrink-0" />
              <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 flex-1 truncate">
                {searchQ ? `"${searchQ}"` : "Search marketplace"}
              </p>
              <button
                onClick={close}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-stone-400 transition-colors hover:text-stone-600"
                style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.07)" }}
              >
                <Command className="h-3 w-3" /> ESC
              </button>
            </div>

            {/* Body grid */}
            <div className="flex divide-x divide-black/[0.04] max-h-[480px] overflow-hidden">

              {/* Left — results */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: "none" }}>
                {loading && (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                    <span className="text-[13px] font-semibold text-stone-400">Searching…</span>
                  </div>
                )}

                {!loading && products.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-3">Products</p>
                    <div className="space-y-1">
                      {products.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { router.push(`/marketplace/${p.slug}`); close(); setFocused(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group hover:bg-stone-50 dark:hover:bg-white/5"
                        >
                          <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 bg-orange-500/10 border border-orange-500/20">
                            <Package className="h-3.5 w-3.5 text-orange-500" />
                          </div>
                          <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:text-white dark:group-hover:text-white flex-1 truncate transition-colors">{p.name}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-stone-300 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!loading && searchQ && !products.length && !vendors.length && (
                  <div className="py-16 text-center">
                    <div className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: "rgba(0,0,0,0.04)" }}>
                      <Search className="h-7 w-7 text-stone-200" />
                    </div>
                    <p className="text-[14px] font-semibold text-stone-700 dark:text-stone-300">No matches found</p>
                    <p className="text-[12px] text-stone-400 mt-1">Try a different term or press Enter for full results</p>
                  </div>
                )}

                {!loading && !searchQ && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-3">Start typing</p>
                    <p className="text-[13px] text-stone-400">Search products, vendors and more.</p>
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <div className="w-[200px] shrink-0 p-4 space-y-5 overflow-y-auto" style={{ scrollbarWidth: "none", background: "rgba(0,0,0,0.015)" }}>
                {vendors.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">Stores</p>
                    <div className="space-y-0.5">
                      {vendors.map(v => (
                        <button
                          key={v.id}
                          onClick={() => { router.push(`/vendors/${v.business_slug}`); close(); setFocused(false); }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[11px] text-left transition-all text-[12px] font-semibold text-stone-600 dark:text-text-muted hover:text-stone-900 dark:text-white dark:hover:text-stone-200"
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                        >
                          <Store className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{v.business_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">Browse</p>
                  <div className="space-y-0.5">
                    {mergeLinks(navLinks).slice(0, 6).map(l => (
                      <button
                        key={l.href}
                        onClick={() => { router.push(l.href); close(); setFocused(false); }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] font-semibold text-stone-500 dark:text-text-muted hover:text-stone-800 hover:bg-stone-50 dark:text-text-secondary dark:hover:text-stone-200 transition-colors group"
                      >
                        <span className="truncate">{l.label}</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <button
              onClick={() => commit(searchQ)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-[12px] font-black uppercase tracking-widest text-orange-600 transition-all hover:bg-orange-50 bg-stone-50 border-t border-border"
            >
              View all results for "{searchQ || "everything"}"
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>,
        document.body,
      )}
    </div>
  );
}