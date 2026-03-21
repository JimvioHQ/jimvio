"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ListFilter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "trending", label: "Trending Now" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "sales", label: "Best Selling" },
];

export function SortSelect({ currentSort }: { currentSort?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = SORT_OPTIONS.find(opt => opt.value === (currentSort || "trending")) || SORT_OPTIONS[0];

  const handleSort = (sort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", sort);
    params.set("page", "1");
    router.push(`/marketplace?${params.toString()}`, { scroll: false });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-5 h-12 bg-white rounded-2xl border border-zinc-100 shadow-sm transition-all text-sm font-bold text-zinc-900 hover:border-ink-dark active:scale-95 whitespace-nowrap",
          isOpen && "ring-2 ring-ink-dark border-ink-dark"
        )}
      >
        <ListFilter className="h-4 w-4 text-zinc-400" />
        <span className="text-zinc-400 font-medium">Sort by:</span>
        <span>{selectedOption.label}</span>
        <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[110]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute right-0 top-14 w-64 bg-white rounded-[2rem] border border-zinc-100 shadow-2xl shadow-black/10 p-3 z-[120] overflow-hidden"
            >
              <div className="space-y-1">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSort(option.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all",
                      selectedOption.value === option.value 
                        ? "bg-ink-dark text-white shadow-xl shadow-ink-dark/20" 
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-text-primary"
                    )}
                  >
                    {option.label}
                    {selectedOption.value === option.value && (
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
