"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, Package, Loader2, Store, Command, ArrowRight, X } from "lucide-react";
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
const INPUT_IDLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};
const INPUT_FOCUSED: React.CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  backdropFilter: "blur(32px) saturate(180%)",
  WebkitBackdropFilter: "blur(32px) saturate(180%)",
  border: "1px solid rgba(251,146,60,0.30)",
  boxShadow: "0 0 20px rgba(249,115,22,0.08), inset 0 1px 0 rgba(255,255,255,0.10)",
};
/* Light mode variant */
const INPUT_LIGHT: React.CSSProperties = {
  background: "rgba(255,255,255,0.68)",
  backdropFilter: "blur(32px) saturate(180%)",
  WebkitBackdropFilter: "blur(32px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.90)",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)",
};
const INPUT_LIGHT_FOCUSED: React.CSSProperties = {
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(251,146,60,0.35)",
  boxShadow: "0 0 24px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,1)",
};

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
    <div ref={containerRef} className={cn("relative", isDesktop ? "flex-initial" : "flex-1 w-full")}>
      <motion.div
        animate={{ width: isDesktop ? expandedW : "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative flex items-center h-11 rounded-full overflow-hidden transition-all duration-200"
        style={inputStyle}
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
          style={{ color: "#1c1917", caretColor: "#f97316" }}
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

      {/* ── Results portal ── */}
      {showPanel && portalReady && createPortal(
        <div className="fixed inset-0 z-[190] flex items-start justify-center pt-24 sm:pt-28 px-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.12)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="w-full max-w-[780px] relative z-10 rounded-[28px] overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(48px) saturate(200%) brightness(108%)",
              WebkitBackdropFilter: "blur(48px) saturate(200%) brightness(108%)",
              border: "1px solid rgba(255,255,255,0.88)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,1)",
            }}
          >
            {/* Specular */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,1) 40%,rgba(255,255,255,0.8) 60%,transparent)" }} />
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
              <div className="absolute" style={{ top: "-40%", left: "-20%", width: "50%", height: "90%", background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 55%)", transform: "rotate(-15deg)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
              <Search className="h-5 w-5 text-orange-500 shrink-0" />
              <p className="text-[15px] font-semibold text-stone-900 flex-1 truncate">
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
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-left transition-all group"
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(249,115,22,0.05)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                        >
                          <div className="h-7 w-7 rounded-[9px] flex items-center justify-center shrink-0"
                            style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)" }}>
                            <Package className="h-3.5 w-3.5 text-orange-500" />
                          </div>
                          <span className="text-[13px] font-semibold text-stone-700 group-hover:text-stone-900 flex-1 truncate transition-colors">{p.name}</span>
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
                    <p className="text-[14px] font-semibold text-stone-700">No matches found</p>
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
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[11px] text-left transition-all text-[12px] font-semibold text-stone-600 hover:text-stone-900"
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
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-[11px] text-[12px] font-semibold text-stone-500 hover:text-stone-800 transition-colors group"
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
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
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-[12px] font-black uppercase tracking-widest text-orange-600 transition-all hover:bg-orange-500/10"
              style={{
                background: "rgba(251,146,60,0.12)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                borderTop: "1px solid rgba(251,146,60,0.35)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
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