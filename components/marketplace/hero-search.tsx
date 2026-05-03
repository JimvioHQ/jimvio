"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, Loader2, Sparkles, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AISourcingAssistant } from "./ai-sourcing-assistant";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [initialAIQuery, setInitialAIQuery] = useState("");
  const [results, setResults] = useState<{ products: any[]; vendors: any[]; categories: any[] }>({
    products: [],
    vendors: [],
    categories: [],
  });
  const [portalReady, setPortalReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (q.length < 2) {
      setResults({ products: [], vendors: [], categories: [] });
      return;
    }
    const id = setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setResults(d));
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

  const openAI = (text = q) => {
    setInitialAIQuery(text);
    setIsAIMode(true);
    setIsFocused(false);
  };

  return (
    <div ref={containerRef} className="w-full relative">
      {/* ── Search bar — matches HTML prototype search-wrap / search-bar ── */}
      <div
        className="px-[52px] py-3 border-b border-black/[.07] dark:border-white/[.06] bg-white dark:bg-surface"
      >
        <div
          className={cn(
            "flex items-center h-[52px] rounded-sm transition-all duration-200 overflow-hidden",
            "bg-[#f5f4f1] dark:bg-bg",
            isFocused
              ? "border border-[#fd5000]/60 shadow-[0_0_0_4px_rgba(253,80,0,0.1)]"
              : "border border-black/10 dark:border-white/10"
          )}
        >
          {/* Search icon */}
          <div className="pl-[22px] pr-[10px] shrink-0">
            <Search className="h-[15px] w-[15px] text-[#b0a898] dark:text-[#a89f93]" strokeWidth={2.5} />
          </div>

          {/* Input */}
          <input
            type="text"
            value={q}
            onFocus={() => setIsFocused(true)}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, suppliers, or ask Jimvio AI…"
            className="flex-1 bg-transparent border-0 outline-none text-[14px] text-[#1c1811] dark:text-[#f0e8dc] placeholder:text-[#a89f93] font-medium h-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />

          {/* AI button */}
          <button
            type="button"
            onClick={() => openAI()}
            className="flex items-center gap-1 px-[10px] py-[6px] rounded-sm border-none bg-transparent text-[#a89f93] text-[10px] font-black uppercase tracking-[.1em] hover:text-[#fd5000] transition-colors shrink-0"
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="#fd5000" stroke="none">
              <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
            </svg>
            AI
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-black/10 dark:bg-white/10 shrink-0" />

          {/* Attachment / extra icon */}
          <div className="px-2 shrink-0">
            <Paperclip className="h-[15px] w-[15px] text-[#b0a898] dark:text-[#a89f93]" strokeWidth={2} />
          </div>

          {/* Explore button */}
          <button
            type="button"
            onClick={() => handleSearch()}
            className="h-[38px] px-6 mr-1 rounded-sm bg-[#fd5000] hover:bg-orange-600 text-white text-[11px] font-black uppercase tracking-[.1em] transition-all active:scale-95 shrink-0"
          >
            Explore
          </button>
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {q.length >= 2 && isFocused && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute left-[52px] right-[52px] mt-2 bg-white dark:bg-[#1c1811] rounded-sm border border-black/[.07] dark:border-white/[.08] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-50"
            >
              <div className="p-3 space-y-1 max-h-[360px] overflow-y-auto no-scrollbar">
                {results.products.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {results.products.slice(0, 5).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => router.push(`/marketplace/${p.slug}`)}
                        className="flex items-center gap-3 p-3 rounded-sm hover:bg-[#f5f4f1] dark:hover:bg-[#252219] text-left transition-all group"
                      >
                        <Search className="h-[14px] w-[14px] text-[#c8c0b5] group-hover:text-[#fd5000]" />
                        <span className="text-[13px] font-semibold text-[#3c3429] dark:text-[#d4ccbf] truncate">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => openAI()}
                  className="w-full h-11 rounded-sm bg-orange-50 dark:bg-[rgba(253,80,0,0.08)] text-orange-700 dark:text-orange-400 text-[11px] font-black uppercase tracking-[.1em] flex items-center justify-center gap-2 border border-orange-100 dark:border-[rgba(253,80,0,0.18)] hover:bg-orange-100 transition-all"
                >
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
                  </svg>
                  Ask AI to find best deals for &ldquo;{q}&rdquo;
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI overlay portal */}
      {portalReady &&
        createPortal(
          <AnimatePresence>{isAIMode && <AISourcingAssistant />}</AnimatePresence>,
          document.body
        )}
    </div>
  );
}

