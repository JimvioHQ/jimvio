"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Zap, ChevronDown, Camera, Sparkles } from "lucide-react";

export type HeroSearchCategory = { label: string; slug: string };

interface HeroSearchProps {
  categories: HeroSearchCategory[];
}

export function HeroSearch({ categories }: HeroSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const searchUrl = (params: { q?: string; cat?: string; ai?: string }) => {
    const sp = new URLSearchParams();
    if (params.q?.trim()) sp.set("q", params.q.trim());
    if (params.cat) sp.set("cat", params.cat);
    if (params.ai === "1") sp.set("sort", "trending");
    return `/marketplace${sp.toString() ? `?${sp.toString()}` : ""}`;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, useAi: boolean) => {
    e.preventDefault();
    router.push(searchUrl({ q, cat: cat || undefined, ai: useAi ? "1" : undefined }));
  };

  return (
    <div className="w-full max-w-[720px] space-y-4">
      {/* Main search — hero command bar */}
      <form
        className="group/search overflow-hidden rounded-[1.25rem] border border-white/55 bg-white/50 shadow-[0_8px_40px_-16px_rgba(43,34,72,0.18),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-white/40 backdrop-blur-xl transition-all duration-300 hover:border-[#f97316]/40 focus-within:border-[#f97316]/55 focus-within:shadow-[0_12px_48px_-12px_rgba(249,115,22,0.2),inset_0_1px_0_rgba(255,255,255,0.75)] focus-within:ring-[#f97316]/25"
        onSubmit={(e) => handleSubmit(e, false)}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center min-h-[56px] sm:min-h-[64px]">
          {/* Category dropdown */}
          <div className="relative shrink-0 border-b sm:border-b-0 sm:border-r border-[#ebe8f2] bg-gradient-to-b from-[#faf9fc] to-[#f5f3fa] sm:min-h-[64px] flex items-center">
            <button
              type="button"
              onClick={() => setIsCategoryOpen((o) => !o)}
              className="flex items-center justify-between gap-2 px-5 py-4 sm:py-0 sm:min-h-[64px] text-left w-full sm:w-[180px] text-[14px] font-bold text-text-primary hover:bg-[#f5f5f5] transition-colors"
            >
              <span className="truncate">{cat ? categories.find((c) => c.slug === cat)?.label ?? "Category" : "All categories"}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-[#9ca3af] transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
            </button>
            {isCategoryOpen && (
              <>
                <div className="absolute left-0 sm:w-[240px] right-0 sm:right-auto top-full z-20 mt-1 bg-white border border-[#ebe8f2] rounded-xl shadow-xl py-2 max-h-[300px] overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setCat("");
                      setIsCategoryOpen(false);
                    }}
                    className="w-full px-5 py-3 text-left text-[14px] font-semibold text-text-primary hover:bg-[#fff7ed]"
                  >
                    All categories
                  </button>
                  {categories.slice(0, 14).map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => {
                        setCat(c.slug);
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full px-5 py-3 text-left text-[14px] hover:bg-[#fff7ed] ${cat === c.slug ? "font-bold text-[#f97316] bg-[#fff7ed]/60" : "text-[#4b5563]"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setIsCategoryOpen(false)}
                />
              </>
            )}
          </div>

          {/* Search input — larger and more spacious */}
          <div className="flex min-h-[52px] flex-1 items-center gap-3 bg-white/35 px-5 py-4 backdrop-blur-sm sm:min-h-[64px] sm:py-0">
            <Search className="h-6 w-6 text-[#9ca3af] shrink-0 group-focus-within/search:text-[#f97316] transition-colors" />
            <input
              type="text"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, suppliers, or describe what you need..."
              className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-[#6b7280] text-[15px] sm:text-[16px] font-medium min-w-0 placeholder:font-normal"
              autoComplete="off"
            />
            <Link
              href="/marketplace"
              className="p-2.5 rounded-xl text-[#9ca3af] hover:text-[#f97316] hover:bg-[#fff7ed] transition-colors shrink-0"
              title="Search by image (coming soon)"
            >
              <Camera className="h-5 w-5" />
            </Link>
          </div>

          {/* Action: AI Match only — Enter still submits form to search */}
          <div className="flex border-t sm:border-t-0 sm:border-l border-[#ebe8f2] sm:min-h-[64px]">
            <button
              type="button"
              onClick={() => {
                router.push(searchUrl({ q, cat: cat || undefined, ai: "1" }));
              }}
              className="flex items-center justify-center gap-2 w-full px-6 py-4 sm:py-0 bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white hover:from-[#ea580c] hover:to-[#c2410c] transition-all shrink-0 min-h-[52px] sm:min-h-[64px] shadow-lg shadow-[#f97316]/30 text-[14px] font-black"
            >
              <Zap className="h-5 w-5 fill-white stroke-none" />
              AI Match
            </button>
          </div>
        </div>
      </form>

      {/* Supporting line + quick filters */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex items-center gap-1.5 text-[11px] text-[#6b7280] font-medium">
          <Sparkles className="h-3.5 w-3.5 text-[#f97316]" />
          Get AI-powered product matches & supplier recommendations
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#9ca3af] font-bold uppercase tracking-wider">Quick:</span>
          <Link
            href="/marketplace"
            className="text-[11px] font-bold text-[#4b5563] hover:text-[#f97316] hover:underline"
          >
            Verified suppliers
          </Link>
          <span className="text-[#e5e7eb]">|</span>
          <Link
            href="/marketplace?type=physical"
            className="text-[11px] font-bold text-[#4b5563] hover:text-[#f97316] hover:underline"
          >
            In stock
          </Link>
        </div>
      </div>
    </div>
  );
}
