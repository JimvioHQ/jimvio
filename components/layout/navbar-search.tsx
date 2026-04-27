// "use client";

// import React, { useCallback, useEffect, useRef, useState } from "react";
// import { createPortal } from "react-dom";
// import { useRouter } from "next/navigation";
// import { Search, Package, Loader2, Store, Command, ArrowRight, X, SlidersHorizontal } from "lucide-react";
// import { motion, AnimatePresence } from "framer-motion";
// import { cn } from "@/lib/utils";
// import type { NavLinkConfig } from "@/lib/platform-settings-shared";
// import { addNavSearchHistory, readNavSearchHistory } from "@/lib/marketplace-search-history";
// import { Input } from "@/components/ui/input";

// type ProductRow  = { id: string; name: string; slug: string };
// type VendorRow   = { id: string; business_name: string; business_slug: string };

// const EXTRA: NavLinkConfig[] = [
//   { label: "Help",    href: "/help"    },
//   { label: "Deals",   href: "/deals"   },
//   { label: "Contact", href: "/contact" },
//   { label: "Blog",    href: "/blog"    },
//   { label: "Cart",    href: "/cart"    },
// ];

// function mergeLinks(navLinks: NavLinkConfig[]) {
//   const seen = new Set<string>();
//   return [...navLinks, ...EXTRA].filter(l => {
//     if (!l?.href || !l?.label) return false;
//     const k = l.href.replace(/\/$/, "") || "/";
//     if (seen.has(k)) return false;
//     seen.add(k); return true;
//   });
// }

// /* ── Dark glass search input shell ── */
// /* ── Professional Solid Input Shells ── */
// const INPUT_IDLE: React.CSSProperties = {
//   background: "var(--color-bg)",
//   border: "1px solid var(--color-border)",
//   boxShadow: "none",
// };
// const INPUT_FOCUSED: React.CSSProperties = {
//   background: "var(--color-bg)",
//   border: "1.5px solid var(--color-accent)",
//   boxShadow: "none",
// };
// const INPUT_LIGHT: React.CSSProperties = INPUT_IDLE;
// const INPUT_LIGHT_FOCUSED: React.CSSProperties = INPUT_FOCUSED;

// export function NavbarSearch({
//   searchQ, setSearchQ, placeholder, isScrolled, variant,
//   runSearch, navLinks,
// }: any) {
//   const router = useRouter();
//   const containerRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
//   const [portalReady, setPortalReady] = useState(false);
//   const [open, setOpen] = useState(false);
//   const [focused, setFocused] = useState(false);
//   const [products, setProducts] = useState<ProductRow[]>([]);
//   const [vendors, setVendors] = useState<VendorRow[]>([]);
//   const [loading, setLoading] = useState(false);

//   const isDesktop = variant === "desktop";

//   useEffect(() => {
//     setPortalReady(true);
//     const kd = (e: KeyboardEvent) => {
//       if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); }
//     };
//     window.addEventListener("keydown", kd);
//     return () => window.removeEventListener("keydown", kd);
//   }, []);

//   useEffect(() => {
//     const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && open) { close(); inputRef.current?.blur(); } };
//     document.addEventListener("keydown", esc);
//     return () => document.removeEventListener("keydown", esc);
//   }, [open]);

//   useEffect(() => {
//     const outside = (e: MouseEvent) => {
//       if (!containerRef.current?.contains(e.target as Node)) { close(); setFocused(false); }
//     };
//     document.addEventListener("mousedown", outside);
//     return () => document.removeEventListener("mousedown", outside);
//   }, []);

//   useEffect(() => {
//     const q = searchQ.trim();
//     if (q.length < 2) { setProducts([]); setVendors([]); setLoading(false); return; }
//     setLoading(true);
//     const id = setTimeout(() => {
//       fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
//         .then(r => r.json())
//         .then(d => { setProducts(d.products || []); setVendors(d.vendors || []); })
//         .finally(() => setLoading(false));
//     }, 300);
//     return () => clearTimeout(id);
//   }, [searchQ]);

//   const close = () => setOpen(false);
//   const commit = (term: string) => {
//     addNavSearchHistory(term); runSearch(term); close(); setFocused(false); inputRef.current?.blur();
//   };

//   const showPanel = open && (searchQ.trim().length > 0 || focused);
//   const expandedW = isDesktop ? (focused ? 360 : searchQ ? 250 : 130) : "100%";

//   /* ── Input style selection ── */
//   const inputStyle = focused ? INPUT_LIGHT_FOCUSED : INPUT_LIGHT;

//   return (
//     <div ref={containerRef} className={cn("relative flex items-center", isDesktop ? "flex-initial gap-2" : "flex-1 w-full")}>
//       <motion.div
//         animate={{ width: isDesktop ? expandedW : "auto" }}
//         transition={{ type: "spring", damping: 32, stiffness: 320 }}
//         className={cn("relative flex items-center h-11 rounded-sm overflow-hidden transition-all duration-200", !isDesktop && "flex-1")}
//         style={isDesktop ? inputStyle : { background: "transparent" }}
//       >
//         {/* Top border highlight */}
//         <div className="absolute inset-x-0 top-0 h-[1.5px] bg-white/5 dark:bg-white/5" />

//         <div className="pl-3.5 pr-1 shrink-0">
//           {loading
//             ? <Loader2 className="h-[17px] w-[17px] animate-spin text-orange-500" />
//             : <Search className={cn("h-[17px] w-[17px] transition-colors ", focused || searchQ
//                 ? "text-orange-500"
//                 : "text-stone-400")} />
//           }
//         </div>

//         <Input
//           ref={inputRef}

//           type="text"
//           value={searchQ}
//           onChange={e => { setSearchQ(e.target.value); setOpen(true); }}
//           onFocus={() => { setOpen(true); setFocused(true); }}
//           onBlur={() => setTimeout(() => setFocused(false), 150)}
//           onKeyDown={e => {
//             if (e.key === "Enter") commit(searchQ);
//             if (e.key === "Escape") { close(); inputRef.current?.blur(); }
//           }}
//           placeholder={!isDesktop && !focused && !searchQ ? "" : (placeholder ?? "Search…")}
//           className="flex-1 min-w-0 rounded-sm bg-transparent border-0 outline-none px-2 text-[13px] font-semibold placeholder:font-normal"
//           style={{ color: "var(--color-text-primary)", caretColor: "#f97316" }}
//         />

//         {/* Clear */}
//         <AnimatePresence>
//           {searchQ && (
//             <motion.button
//               initial={{ opacity: 0, scale: 0.7 }}
//               animate={{ opacity: 1, scale: 1 }}
//               exit={{ opacity: 0, scale: 0.7 }}
//               transition={{ duration: 0.12 }}
//               onClick={() => { setSearchQ(""); setOpen(false); inputRef.current?.focus(); }}
//               className="mr-3 h-5 w-5 rounded-sm flex items-center justify-center shrink-0 transition-all"
//               style={{ background: "rgba(0,0,0,0.08)" }}
//               tabIndex={-1}
//             >
//               <X className="h-3 w-3 text-stone-500" />
//             </motion.button>
//           )}
//         </AnimatePresence>

//         {/* Cmd+K hint — desktop only */}
//         <AnimatePresence>
//           {!focused && !searchQ && isDesktop && (
//             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//               className="pr-3.5 flex items-center gap-1 shrink-0 pointer-events-none">
//               <kbd className="px-1.5 py-0.5 rounded text-[8px] font-bold text-stone-400 flex items-center gap-0.5"
//                 style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)" }}>
//                 <Command className="h-2 w-2" /> K
//               </kbd>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </motion.div>

//       {/* Integrated Filter button for mobile */}
//       {!isDesktop && (
//         <button
//           onClick={() => { /* Action */ }}
//           className="h-full px-4 flex items-center justify-center border-l border-black/5 dark:border-white/10 text-orange-500 active:bg-black/5 transition-colors"
//         >
//           <SlidersHorizontal className="h-5 w-5" />
//         </button>
//       )}

//       {/* ── Results portal ── */}
//       {showPanel && portalReady && createPortal(
//         <div className="fixed inset-0 z-[10001] flex items-start justify-center pt-32 sm:pt-28 px-3">
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             className="absolute inset-0 bg-black/50"
//             onClick={close}
//           />

//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             className="w-full max-w-[780px] relative z-10 rounded-sm border border-border shadow-none bg-surface overflow-hidden"
//           >

//             {/* Header */}
//             <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
//               <Search className="h-5 w-5 text-orange-500 shrink-0" />
//               <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 flex-1 truncate">
//                 {searchQ ? `"${searchQ}"` : "Search marketplace"}
//               </p>
//               <button
//                 onClick={close}
//                 className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-bold text-stone-400 transition-colors hover:text-stone-600"
//                 style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.07)" }}
//               >
//                 <Command className="h-3 w-3" /> ESC
//               </button>
//             </div>

//             {/* Body grid */}
//             <div className="flex divide-x divide-black/[0.04] max-h-[480px] overflow-hidden">

//               {/* Left — results */}
//               <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: "none" }}>
//                 {loading && (
//                   <div className="flex items-center gap-3 py-4">
//                     <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
//                     <span className="text-[13px] font-semibold text-stone-400">Searching…</span>
//                   </div>
//                 )}

//                 {!loading && products.length > 0 && (
//                   <div>
//                     <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-3">Products</p>
//                     <div className="space-y-1">
//                       {products.map(p => (
//                         <button
//                           key={p.id}
//                           onClick={() => { router.push(`/marketplace/${p.slug}`); close(); setFocused(false); }}
//                           className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-left transition-all group hover:bg-stone-50 dark:hover:bg-white/5"
//                         >
//                           <div className="h-7 w-7 rounded-sm flex items-center justify-center shrink-0 bg-orange-500/10 border border-orange-500/20">
//                             <Package className="h-3.5 w-3.5 text-orange-500" />
//                           </div>
//                           <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:text-white dark:group-hover:text-white flex-1 truncate transition-colors">{p.name}</span>
//                           <ArrowRight className="h-3.5 w-3.5 text-stone-300 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all shrink-0" />
//                         </button>
//                       ))}
//                     </div>
//                   </div>
//                 )}

//                 {!loading && searchQ && !products.length && !vendors.length && (
//                   <div className="py-16 text-center">
//                     <div className="h-14 w-14 rounded-sm flex items-center justify-center mx-auto mb-4"
//                       style={{ background: "rgba(0,0,0,0.04)" }}>
//                       <Search className="h-7 w-7 text-stone-200" />
//                     </div>
//                     <p className="text-[14px] font-semibold text-stone-700 dark:text-stone-300">No matches found</p>
//                     <p className="text-[12px] text-stone-400 mt-1">Try a different term or press Enter for full results</p>
//                   </div>
//                 )}

//                 {!loading && !searchQ && (
//                   <div>
//                     <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-3">Start typing</p>
//                     <p className="text-[13px] text-stone-400">Search products, vendors and more.</p>
//                   </div>
//                 )}
//               </div>

//               {/* Right sidebar */}
//               <div className="w-[200px] shrink-0 p-4 space-y-5 overflow-y-auto" style={{ scrollbarWidth: "none", background: "rgba(0,0,0,0.015)" }}>
//                 {vendors.length > 0 && (
//                   <div>
//                     <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">Stores</p>
//                     <div className="space-y-0.5">
//                       {vendors.map(v => (
//                         <button
//                           key={v.id}
//                           onClick={() => { router.push(`/vendors/${v.business_slug}`); close(); setFocused(false); }}
//                           className="w-full flex items-center gap-2 px-2.5 py-2 rounded-sm text-left transition-all text-[12px] font-semibold text-stone-600 dark:text-text-muted hover:text-stone-900 dark:text-white dark:hover:text-stone-200"
//                           onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"}
//                           onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
//                         >
//                           <Store className="h-3.5 w-3.5 text-stone-400 shrink-0" />
//                           <span className="truncate">{v.business_name}</span>
//                         </button>
//                       ))}
//                     </div>
//                   </div>
//                 )}

//                 <div>
//                   <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">Browse</p>
//                   <div className="space-y-0.5">
//                     {mergeLinks(navLinks).slice(0, 6).map(l => (
//                       <button
//                         key={l.href}
//                         onClick={() => { router.push(l.href); close(); setFocused(false); }}
//                         className="w-full flex items-center justify-between px-2.5 py-2 rounded-sm text-[12px] font-semibold text-stone-500 dark:text-text-muted hover:text-stone-800 hover:bg-stone-50 dark:text-text-secondary dark:hover:text-stone-200 transition-colors group"
//                       >
//                         <span className="truncate">{l.label}</span>
//                         <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Footer CTA */}
//             <button
//               onClick={() => commit(searchQ)}
//               className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-[12px] font-black uppercase tracking-widest text-orange-600 transition-all hover:bg-orange-50 bg-stone-50 border-t border-border"
//             >
//               View all results for "{searchQ || "everything"}"
//               <ArrowRight className="h-4 w-4" />
//             </button>
//           </motion.div>
//         </div>,
//         document.body,
//       )}
//     </div>
//   );
// }
"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search, Package, Loader2, Store, Command,
  ArrowRight, X, SlidersHorizontal, Clock, TrendingUp, Zap,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NavLinkConfig } from "@/lib/platform-settings-shared";
import { addNavSearchHistory, readNavSearchHistory } from "@/lib/marketplace-search-history";

type ProductRow = { id: string; name: string; slug: string; discount?: number };
type VendorRow  = { id: string; business_name: string; business_slug: string };

const EXTRA: NavLinkConfig[] = [
  { label: "Help",    href: "/help"    },
  { label: "Deals",   href: "/deals"   },
  { label: "Contact", href: "/contact" },
  { label: "Blog",    href: "/blog"    },
  { label: "Cart",    href: "/cart"    },
];

const TRENDING = ["Power bank", "Smartwatch", "USB Hub", "Drone", "Gaming chair", "Solar panel"];

function mergeLinks(navLinks: NavLinkConfig[]) {
  const seen = new Set<string>();
  return [...navLinks, ...EXTRA].filter((l) => {
    if (!l?.href || !l?.label) return false;
    const k = l.href.replace(/\/$/, "") || "/";
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Highlight matched query term ──────────────────────────────────────────────
function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[3px] bg-accent-light px-px text-accent">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Result row ────────────────────────────────────────────────────────────────
function ResultRow({
  icon, iconVariant = "product", label, query, badge, onClick,
}: {
  icon: React.ReactNode;
  iconVariant?: "product" | "vendor";
  label: string;
  query?: string;
  badge?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-2.5 px-2.5 py-2 text-left",
        "rounded-sm border-[1.5px] border-transparent",
        "transition-all duration-[140ms]",
        "hover:border-[rgba(253,80,0,0.12)] hover:bg-accent-light"
      )}
    >
      <div className={cn(
        "flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-sm border-[1.5px]",
        iconVariant === "product"
          ? "border-[rgba(253,80,0,0.15)] bg-accent-light text-accent"
          : "border-[rgba(48,164,108,0.2)] bg-[rgba(48,164,108,0.08)] text-success"
      )}>
        {icon}
      </div>
      <span className="flex-1 truncate text-[13px] font-medium tracking-[-0.01em] text-text-secondary transition-colors group-hover:text-text-primary">
        {query ? <Highlighted text={label} query={query} /> : label}
      </span>
      {badge && <span className="shrink-0">{badge}</span>}
      <ArrowRight size={13} className="shrink-0 -translate-x-1 text-text-muted opacity-0 transition-all duration-[140ms] group-hover:translate-x-0 group-hover:opacity-100" />
    </button>
  );
}

// ── Section eyebrow title ─────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="home-section-eyebrow mb-2.5">{children}</p>;
}

// ── Main component ────────────────────────────────────────────────────────────
export function NavbarSearch({
  searchQ, setSearchQ, placeholder, runSearch, navLinks, variant,
}: {
  searchQ: string;
  setSearchQ: (q: string) => void;
  placeholder?: string;
  runSearch: (q: string) => void;
  navLinks: NavLinkConfig[];
  variant?: "desktop" | "mobile";
}) {
  const router       = useRouter();
  const panelInpRef  = useRef<HTMLInputElement>(null);   // ← only the panel input
  const panelRef     = useRef<HTMLDivElement>(null);

  const [portalReady, setPortalReady] = useState(false);
  const [open, setOpen]               = useState(false);
  const [products, setProducts]       = useState<ProductRow[]>([]);
  const [vendors, setVendors]         = useState<VendorRow[]>([]);
  const [loading, setLoading]         = useState(false);
  const [history, setHistory]         = useState<string[]>([]);

  const isDesktop = variant === "desktop";
  const hasQuery  = searchQ.trim().length > 0;
  const hasResults = products.length > 0 || vendors.length > 0;

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    setPortalReady(true);
    setHistory(readNavSearchHistory());

    const onKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openPanel();
      }
      if (e.key === "Escape" && open) closePanel();
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [open]);

  // ── Close on click outside the panel ─────────────────────────────────────
  //    The overlay div (pointer-events layer behind the panel) handles this —
  //    clicking the overlay calls closePanel(). This is the correct pattern:
  //    the panel ref is only needed if you want to check containment manually.
  useEffect(() => {
    if (!open) return;
    const onMousedown = (e: MouseEvent) => {
      // If the click target is outside the panel → close
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    // Use capture so we catch the event before it reaches the panel
    document.addEventListener("mousedown", onMousedown, true);
    return () => document.removeEventListener("mousedown", onMousedown, true);
  }, [open]);

  // ── Debounced API fetch ───────────────────────────────────────────────────
  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) { setProducts([]); setVendors([]); setLoading(false); return; }
    setLoading(true);
    const id = setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => { setProducts(d.products || []); setVendors(d.vendors || []); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(id);
  }, [searchQ]);

  function openPanel() {
    setOpen(true);
    // Let the portal mount first, then focus the panel input
    requestAnimationFrame(() => panelInpRef.current?.focus());
  }

  function closePanel() {
    setOpen(false);
    setLoading(false);
  }

  function commit(term: string) {
    if (!term.trim()) return;
    addNavSearchHistory(term);
    setHistory(readNavSearchHistory());
    runSearch(term);
    closePanel();
  }

  // ── Desktop shell width ───────────────────────────────────────────────────
  const shellWidth = isDesktop ? (open || hasQuery ? 240 : 148) : "100%";

  return (
    <div className={cn("relative flex items-center", isDesktop ? "gap-2" : "flex-1 w-full")}>

      {/* ── Trigger shell — purely visual, owns no real input ── */}
      <motion.div
        animate={{ width: shellWidth }}
        transition={{ type: "spring", damping: 80, stiffness: 300 }}
        onClick={openPanel}
        role="button"
        aria-label="Open search"
        className={cn(
          "relative flex h-10 items-center overflow-hidden cursor-text",
          "border-[1.5px] border-border bg-surface",
          "rounded-md shadow-[var(--shadow-sm)]",
          "transition-[border-color,box-shadow] duration-[180ms]",
          open
            ? "border-accent shadow-[var(--shadow-sm),var(--shadow-glow)]"
            : "hover:border-border-strong",
          !isDesktop && "flex-1"
        )}
      >
        <div className="flex shrink-0 items-center pl-3 pr-2">
          <Search size={15} className={cn("transition-colors duration-[180ms]", open || hasQuery ? "text-accent" : "text-text-muted")} />
        </div>

        {/* Visual mirror of current query */}
        <span className={cn(
          "flex-1 min-w-0 truncate text-[13px] tracking-[-0.01em] select-none",
          hasQuery ? "font-medium text-text-primary" : "font-normal text-text-muted"
        )}>
          {hasQuery ? searchQ : (placeholder ?? "Search products…")}
        </span>

        {/* Clear — works on the shell even when panel is closed */}
        <AnimatePresence>
          {hasQuery && !open && (
            <motion.button
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.12 }}
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); setSearchQ(""); }}
              className="mr-2.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm bg-black/[0.07] text-text-muted transition-colors hover:bg-black/[0.12]"
            >
              <X size={10} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ⌘K badge */}
        <AnimatePresence>
          {!open && !hasQuery && isDesktop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none flex shrink-0 items-center pr-2.5"
            >
              <kbd className="flex items-center gap-px rounded border border-black/[0.09] bg-black/[0.05] px-1.5 py-0.5 text-[9px] font-bold text-text-muted">
                <Command size={8} /> K
              </kbd>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Filter — mobile only */}
      {!isDesktop && (
        <button className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center",
          "rounded-md border-[1.5px] border-border bg-surface",
          "shadow-[var(--shadow-sm)] text-text-muted",
          "transition-all duration-[180ms]",
          "hover:border-accent hover:text-accent hover:bg-accent-light"
        )}>
          <SlidersHorizontal size={15} />
        </button>
      )}

      {/* ── Portal ─────────────────────────────────────────────────────────── */}
      {portalReady && createPortal(
        <AnimatePresence>
          {open && (
            <>
              {/* ① Overlay — full viewport, below panel, closes on click */}
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[10000] bg-black/35 backdrop-blur-[2px]"
                // onClick here is the primary outside-click handler
                onClick={closePanel}
              />

              {/* ② Panel — sits above overlay via z-index */}
              <div className="fixed inset-x-0 top-[72px] z-[10001] flex justify-center px-3 pointer-events-none">
                <motion.div
                  key="panel"
                  ref={panelRef}              // ← ref for containment check
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ type: "spring", damping: 28, stiffness: 340 }}
                  className={cn(
                    "w-full max-w-[760px] pointer-events-auto",
                    "rounded-lg border-[1.5px] border-border bg-surface overflow-hidden",
                    "shadow-[var(--shadow-xl)]"
                  )}
                  // Prevent clicks inside the panel from bubbling to the overlay
                  onClick={(e) => e.stopPropagation()}
                >

                  {/* ── Panel header — THE real live input ── */}
                  <div className="flex items-center gap-3 border-b border-border px-4 shadow-[var(--shadow-sm)]">
                    <div className="flex shrink-0 items-center py-1">
                      {loading
                        ? <Loader2 size={16} className="animate-spin text-accent" />
                        : <Search size={16} className={cn("transition-colors", hasQuery ? "text-accent" : "text-text-muted")} />
                      }
                    </div>

                    {/* ★ The real input — autoFocus, always visible, never covered */}
                    <input
                      ref={panelInpRef}
                      autoFocus
                      type="text"
                      value={searchQ}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => setSearchQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")  commit(searchQ);
                        if (e.key === "Escape") closePanel();
                      }}
                      placeholder={placeholder ?? "Search products, vendors, deals…"}
                      className={cn(
                        "flex-1 min-w-0 h-[52px] bg-transparent border-none outline-none",
                        "text-[15px] font-medium tracking-[-0.015em] text-text-primary",
                        "placeholder:text-text-muted placeholder:font-normal",
                        "[caret-color:var(--color-accent)]"
                      )}
                    />

                    {/* Clear */}
                    <AnimatePresence>
                      {hasQuery && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ duration: 0.12 }}
                          tabIndex={-1}
                          onClick={() => { setSearchQ(""); panelInpRef.current?.focus(); }}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/[0.07] text-text-muted transition-colors hover:bg-black/[0.12]"
                        >
                          <X size={11} />
                        </motion.button>
                      )}
                    </AnimatePresence>

                    {/* ESC hint */}
                    <button
                      onClick={closePanel}
                      className="flex shrink-0 items-center gap-1 rounded-sm border border-black/[0.08] bg-black/[0.05] px-2 py-1 text-[10px] font-bold text-text-muted transition-colors hover:text-text-secondary"
                    >
                      <Command size={9} /> ESC
                    </button>
                  </div>

                  {/* ── Panel body ── */}
                  <div className="flex divide-x divide-border" style={{ maxHeight: 420, overflow: "hidden" }}>

                    {/* Main column */}
                    <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "none" }}>

                      {loading && (
                        <div className="flex items-center gap-3 py-4">
                          <Loader2 size={16} className="animate-spin text-accent" />
                          <span className="text-[13px] font-medium text-text-muted">Searching marketplace…</span>
                        </div>
                      )}

                      {/* Products */}
                      {!loading && products.length > 0 && (
                        <div className="mb-4">
                          <SectionTitle>Products</SectionTitle>
                          <div className="space-y-0.5">
                            {products.map((p) => (
                              <ResultRow
                                key={p.id}
                                icon={<Package size={13} />}
                                label={p.name}
                                query={searchQ}
                                badge={p.discount ? <span className="text-[11px] font-bold text-accent">−{p.discount}%</span> : undefined}
                                onClick={() => { router.push(`/marketplace/${p.slug}`); closePanel(); }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {!loading && hasQuery && !hasResults && (
                        <div className="flex flex-col items-center py-10 text-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border-[1.5px] border-border bg-surface-secondary">
                            <Search size={20} className="text-border-strong" />
                          </div>
                          <p className="text-[14px] font-semibold text-text-primary">No results found</p>
                          <p className="mt-1 text-[12px] text-text-muted">Try a different term or press Enter to search all</p>
                        </div>
                      )}

                      {/* Default state */}
                      {!loading && !hasQuery && (
                        <div className="space-y-5">
                          {history.length > 0 && (
                            <div>
                              <SectionTitle>Recent searches</SectionTitle>
                              <div className="flex flex-wrap gap-1.5">
                                {history.slice(0, 5).map((h) => (
                                  <button
                                    key={h}
                                    onClick={() => setSearchQ(h)}
                                    className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface-secondary px-3 py-1 text-[12px] font-medium text-text-secondary shadow-[var(--shadow-sm)] transition-all hover:border-accent hover:bg-accent-light hover:text-accent"
                                  >
                                    <Clock size={10} className="text-text-muted" /> {h}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <SectionTitle>Trending now</SectionTitle>
                            <div className="flex flex-wrap gap-1.5">
                              {TRENDING.map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setSearchQ(t)}
                                  className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-border bg-surface px-3 py-1 text-[11px] font-semibold text-text-muted shadow-[var(--shadow-sm)] transition-all hover:border-border-strong hover:text-text-primary"
                                >
                                  <Star size={9} /> {t}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <SectionTitle>
                              <span className="flex items-center gap-1"><Zap size={10} className="text-accent" /> Flash deals</span>
                            </SectionTitle>
                            <div className="space-y-0.5">
                              {[
                                { label: "Portable Bluetooth Speaker 40W", discount: 38, slug: "speaker-40w" },
                                { label: "Mechanical Keyboard TKL RGB",    discount: 22, slug: "keyboard-tkl" },
                              ].map((p) => (
                                <ResultRow
                                  key={p.slug}
                                  icon={<Package size={13} />}
                                  label={p.label}
                                  badge={<span className="text-[11px] font-bold text-accent">−{p.discount}%</span>}
                                  onClick={() => { router.push(`/marketplace/${p.slug}`); closePanel(); }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sidebar */}
                    <div className="w-[188px] shrink-0 overflow-y-auto bg-surface-secondary p-4 space-y-4" style={{ scrollbarWidth: "none" }}>
                      {vendors.length > 0 && (
                        <div>
                          <SectionTitle>Stores</SectionTitle>
                          <div className="space-y-0.5">
                            {vendors.map((v) => (
                              <ResultRow
                                key={v.id}
                                icon={<Store size={12} />}
                                iconVariant="vendor"
                                label={v.business_name}
                                query={searchQ}
                                onClick={() => { router.push(`/vendors/${v.business_slug}`); closePanel(); }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <SectionTitle>Browse</SectionTitle>
                        <div className="space-y-0.5">
                          {mergeLinks(navLinks).slice(0, 6).map((l) => (
                            <button
                              key={l.href}
                              onClick={() => { router.push(l.href); closePanel(); }}
                              className="group w-full flex items-center justify-between rounded-sm px-2.5 py-[7px] text-[12px] font-medium text-text-secondary transition-all hover:bg-accent-light hover:text-accent"
                            >
                              <span className="truncate">{l.label}</span>
                              <ArrowRight size={11} className="shrink-0 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <button
                    onClick={() => commit(searchQ)}
                    className="w-full flex items-center justify-center gap-2 border-t border-border bg-surface-secondary px-5 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-accent transition-colors hover:bg-accent-light"
                  >
                    View all results{hasQuery ? ` for "${searchQ}"` : ""}
                    <ArrowRight size={13} />
                  </button>

                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}