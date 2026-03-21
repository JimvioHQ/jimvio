"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ChevronDown,
  Clock,
  Package,
  Loader2,
  Store,
  LayoutGrid,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavLinkConfig } from "@/lib/platform-settings-shared";
import {
  addNavSearchHistory,
  clearNavSearchHistory,
  readNavSearchHistory,
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
  { label: "Buying requests", href: "/requests/new" },
];

function mergeQuickLinks(
  navLinks: NavLinkConfig[],
  primaryCta: { label: string; href: string } | undefined,
): NavLinkConfig[] {
  const seen = new Set<string>();
  const out: NavLinkConfig[] = [];
  for (const item of [...navLinks, ...(primaryCta ? [primaryCta] : []), ...EXTRA_QUICK_LINKS]) {
    if (!item?.href || !item?.label) continue;
    const key = item.href.replace(/\/$/, "") || "/";
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function filterQuickLinks(all: NavLinkConfig[], q: string): NavLinkConfig[] {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return all.slice(0, 8);
  return all
    .filter(
      (l) =>
        l.label.toLowerCase().includes(trimmed) || l.href.toLowerCase().includes(trimmed),
    )
    .slice(0, 8);
}

export interface NavbarSearchProps {
  searchQ: string;
  setSearchQ: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
  isScrolled: boolean;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
  runSearch: (override?: string) => void;
  navLinks: NavLinkConfig[];
  primaryCta?: { label: string; href: string };
}

type FlatRow =
  | { kind: "history"; text: string }
  | { kind: "product"; product: ProductRow }
  | { kind: "vendor"; vendor: VendorRow }
  | { kind: "category"; category: CategoryRow }
  | { kind: "link"; link: NavLinkConfig };

export function NavbarSearch({
  searchQ,
  setSearchQ,
  placeholder,
  isScrolled,
  variant,
  onNavigate,
  runSearch,
  navLinks,
  primaryCta,
}: NavbarSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const suggestReq = useRef(0);
  const [portalReady, setPortalReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputId = variant === "desktop" ? "nav-search-q" : "nav-search-q-mobile";
  const isDesktop = variant === "desktop";

  const allQuickLinks = useMemo(() => mergeQuickLinks(navLinks, primaryCta), [navLinks, primaryCta]);
  const quickLinksFiltered = useMemo(
    () => filterQuickLinks(allQuickLinks, searchQ),
    [allQuickLinks, searchQ],
  );

  const refreshHistory = useCallback(() => {
    setHistory(readNavSearchHistory());
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (pathname === "/marketplace") {
      const q = urlSearchParams.get("q");
      if (q != null) setSearchQ(q);
    }
  }, [pathname, urlSearchParams, setSearchQ]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setProducts([]);
      setVendors([]);
      setCategories([]);
      setLoading(false);
      suggestReq.current += 1;
      return;
    }
    const req = ++suggestReq.current;
    setLoading(true);
    const id = window.setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then(
          (d: {
            products?: ProductRow[];
            vendors?: VendorRow[];
            categories?: CategoryRow[];
          }) => {
            if (req !== suggestReq.current) return;
            setProducts(Array.isArray(d.products) ? d.products : []);
            setVendors(Array.isArray(d.vendors) ? d.vendors : []);
            setCategories(Array.isArray(d.categories) ? d.categories : []);
          },
        )
        .catch(() => {
          if (req !== suggestReq.current) return;
          setProducts([]);
          setVendors([]);
          setCategories([]);
        })
        .finally(() => {
          if (req === suggestReq.current) setLoading(false);
        });
    }, 260);
    return () => window.clearTimeout(id);
  }, [searchQ]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
      setActiveIndex(-1);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const historyFiltered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    const list = history;
    if (!q) return list.slice(0, 8);
    return list.filter((h) => h.toLowerCase().includes(q)).slice(0, 8);
  }, [history, searchQ]);

  const productNamesLower = useMemo(
    () => new Set(historyFiltered.map((h) => h.toLowerCase())),
    [historyFiltered],
  );

  const productsDeduped = useMemo(() => {
    const seen = new Set<string>();
    return products.filter((p) => {
      const k = p.name.toLowerCase();
      if (productNamesLower.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [products, productNamesLower]);

  const flatRows: FlatRow[] = useMemo(
    () => [
      ...historyFiltered.map((text) => ({ kind: "history" as const, text })),
      ...productsDeduped.map((product) => ({ kind: "product" as const, product })),
      ...vendors.map((vendor) => ({ kind: "vendor" as const, vendor })),
      ...categories.map((category) => ({ kind: "category" as const, category })),
      ...quickLinksFiltered.map((link) => ({ kind: "link" as const, link })),
    ],
    [historyFiltered, productsDeduped, vendors, categories, quickLinksFiltered],
  );

  const qTrim = searchQ.trim();
  const hasApiColumns = qTrim.length >= 2;
  const emptySearchState =
    hasApiColumns &&
    !loading &&
    productsDeduped.length === 0 &&
    vendors.length === 0 &&
    categories.length === 0 &&
    historyFiltered.length === 0 &&
    quickLinksFiltered.length === 0;

  const showPanel =
    open &&
    (historyFiltered.length > 0 ||
      productsDeduped.length > 0 ||
      vendors.length > 0 ||
      categories.length > 0 ||
      quickLinksFiltered.length > 0 ||
      loading ||
      emptySearchState);

  const closePanel = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const commitTextSearch = useCallback(
    (term: string) => {
      const t = term.trim();
      if (t) addNavSearchHistory(t);
      runSearch(t);
      closePanel();
      onNavigate?.();
    },
    [runSearch, closePanel, onNavigate],
  );

  const goProduct = useCallback(
    (p: ProductRow) => {
      addNavSearchHistory(p.name);
      router.push(`/marketplace/${p.slug}`);
      closePanel();
      onNavigate?.();
    },
    [router, closePanel, onNavigate],
  );

  const goVendor = useCallback(
    (v: VendorRow) => {
      addNavSearchHistory(v.business_name);
      router.push(`/vendors/${v.business_slug}`);
      closePanel();
      onNavigate?.();
    },
    [router, closePanel, onNavigate],
  );

  const goCategory = useCallback(
    (c: CategoryRow) => {
      addNavSearchHistory(c.name);
      router.push(`/marketplace?cat=${encodeURIComponent(c.slug)}`);
      closePanel();
      onNavigate?.();
    },
    [router, closePanel, onNavigate],
  );

  const goLink = useCallback(
    (l: NavLinkConfig) => {
      addNavSearchHistory(l.label);
      router.push(l.href);
      closePanel();
      onNavigate?.();
    },
    [router, closePanel, onNavigate],
  );

  const activateRow = useCallback(
    (row: FlatRow) => {
      if (row.kind === "history") commitTextSearch(row.text);
      else if (row.kind === "product") goProduct(row.product);
      else if (row.kind === "vendor") goVendor(row.vendor);
      else if (row.kind === "category") goCategory(row.category);
      else goLink(row.link);
    },
    [commitTextSearch, goProduct, goVendor, goCategory, goLink],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closePanel();
      return;
    }
    if (e.key === "ArrowDown") {
      if (!open) setOpen(true);
      e.preventDefault();
      if (flatRows.length === 0) return;
      setActiveIndex((i) => Math.min(i + 1, flatRows.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatRows.length === 0) return;
      setActiveIndex((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      if (activeIndex >= 0 && flatRows[activeIndex]) {
        e.preventDefault();
        activateRow(flatRows[activeIndex]);
      }
    }
  };

  const formHeight = isDesktop ? "h-10" : "h-12";

  const activeFlatIndex = (section: "history" | "product" | "vendor" | "category" | "link", localIdx: number) => {
    let base = 0;
    if (section === "history") return localIdx;
    base += historyFiltered.length;
    if (section === "product") return base + localIdx;
    base += productsDeduped.length;
    if (section === "vendor") return base + localIdx;
    base += vendors.length;
    if (section === "category") return base + localIdx;
    base += categories.length;
    return base + localIdx;
  };

  const panelInner = (
    <div
      ref={panelRef}
      id={`${inputId}-listbox`}
      role="listbox"
      className={cn(
        "w-full border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]",
        isDesktop
          ? "max-h-[min(72vh,560px)] overflow-y-auto border-b"
          : "max-h-[min(60vh,420px)] overflow-y-auto rounded-xl border",
      )}
    >
      <div className="mx-auto w-full max-w-[var(--container-max)] px-4 sm:px-5 md:px-8">
      {loading ? (
        <div className="flex items-center gap-2 border-b border-[var(--color-border)]/80 py-2.5 text-[12px] text-[var(--color-text-muted)]">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          Searching catalog, stores, and categories…
        </div>
      ) : null}

      {historyFiltered.length > 0 ? (
        <div className="border-b border-[var(--color-border)]/80 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Recent searches
            </span>
            <button
              type="button"
              className="text-[11px] font-medium text-[var(--color-accent)] hover:underline"
              onClick={() => {
                clearNavSearchHistory();
                setHistory([]);
                setActiveIndex(-1);
              }}
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {historyFiltered.map((text, i) => {
              const idx = activeFlatIndex("history", i);
              const active = activeIndex === idx;
              return (
                <button
                  key={`h-${text}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "max-w-full truncate rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-left text-[12px] font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent-light)]/30",
                    active && "border-[var(--color-accent)]/50 bg-[var(--color-accent-light)]/40",
                  )}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => commitTextSearch(text)}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <Package className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Products
          </div>
          {productsDeduped.length === 0 && !loading ? (
            <p className="text-[12px] text-[var(--color-text-muted)]">
              {hasApiColumns ? "No matching listings." : "Type to find products."}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {productsDeduped.map((p, j) => {
              const idx = activeFlatIndex("product", j);
              const active = activeIndex === idx;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]",
                      active && "bg-[var(--color-surface-secondary)]",
                    )}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => goProduct(p)}
                  >
                    <Package className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                    <span className="truncate">{p.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <Store className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Stores & vendors
          </div>
          {vendors.length === 0 && !loading ? (
            <p className="text-[12px] text-[var(--color-text-muted)]">
              {hasApiColumns ? "No matching storefronts." : "Type to find stores."}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {vendors.map((v, j) => {
              const idx = activeFlatIndex("vendor", j);
              const active = activeIndex === idx;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]",
                      active && "bg-[var(--color-surface-secondary)]",
                    )}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => goVendor(v)}
                  >
                    <Store className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                    <span className="truncate">{v.business_name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Categories
          </div>
          {categories.length === 0 && !loading ? (
            <p className="text-[12px] text-[var(--color-text-muted)]">
              {hasApiColumns ? "No matching categories." : "Type to browse categories."}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {categories.map((c, j) => {
              const idx = activeFlatIndex("category", j);
              const active = activeIndex === idx;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]",
                      active && "bg-[var(--color-surface-secondary)]",
                    )}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => goCategory(c)}
                  >
                    <LayoutGrid className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Quick links
          </div>
          {quickLinksFiltered.length === 0 ? (
            <p className="text-[12px] text-[var(--color-text-muted)]">No routes match.</p>
          ) : null}
          <ul className="space-y-0.5">
            {quickLinksFiltered.map((l, j) => {
              const idx = activeFlatIndex("link", j);
              const active = activeIndex === idx;
              return (
                <li key={`${l.href}-${l.label}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]",
                      active && "bg-[var(--color-surface-secondary)]",
                    )}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => goLink(l)}
                  >
                    <Link2 className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
                    <span className="truncate">{l.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {emptySearchState ? (
        <div className="border-t border-[var(--color-border)]/80 py-3 text-[13px] text-[var(--color-text-secondary)]">
          Nothing matched yet. Press{" "}
          <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5 text-[11px]">Enter</kbd> to search the
          marketplace catalog.
        </div>
      ) : null}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <form
        className={cn(
          "flex w-full rounded-xl overflow-hidden bg-[var(--color-surface)] ring-1 shadow-[var(--shadow-sm)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/35 focus-within:shadow-[var(--shadow-md)] transition-shadow",
          isScrolled ? "ring-[var(--color-border)]" : "ring-ink-darker/10",
          formHeight,
        )}
        onSubmit={(e) => {
          e.preventDefault();
          commitTextSearch(searchQ);
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          Search marketplace
        </label>
        <Link
          href="/marketplace"
          onClick={() => onNavigate?.()}
          className={cn(
            "pl-3 flex items-center gap-1 border-r border-[var(--color-border)] text-[12px] font-semibold hover:bg-zinc-100 transition-colors whitespace-nowrap shrink-0",
            isDesktop ? "pr-2.5 bg-zinc-50/90" : "pr-2 bg-zinc-50 min-w-[76px]",
            isScrolled ? "text-[var(--color-text-primary)]/85" : "text-[var(--color-text-secondary)]",
          )}
        >
          All <ChevronDown className="h-3 w-3 opacity-50" />
        </Link>
        <input
          id={inputId}
          type="search"
          value={searchQ}
          onChange={(e) => {
            setSearchQ(e.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => {
            refreshHistory();
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          aria-autocomplete="list"
          className={cn(
            "flex-1 min-w-0 outline-none font-medium placeholder:text-[var(--color-text-muted)] bg-transparent",
            isDesktop ? "px-3 text-[14px]" : "px-3 text-[15px]",
          )}
        />
        <button
          type="submit"
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 flex items-center justify-center transition-colors shrink-0"
          aria-label="Search"
        >
          <Search className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </form>

      {showPanel && portalReady && isDesktop
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close search"
                className="fixed inset-0 z-[65] cursor-default bg-ink-darker/20"
                onClick={closePanel}
              />
              <div
                className="fixed left-0 right-0 z-[70] animate-in fade-in slide-in-from-top-1 duration-150"
                style={{ top: "var(--navbar-height, 108px)" }}
              >
                {panelInner}
              </div>
            </>,
            document.body,
          )
        : null}

      {showPanel && !isDesktop ? (
        <div className="absolute left-0 right-0 top-full z-[120] mt-1">{panelInner}</div>
      ) : null}
    </div>
  );
}
