"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Flame, Globe, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavLinkConfig } from "@/lib/platform-settings-shared";
import { TRENDING_SEARCHES, iconForHref } from "./navbar-helpers";

interface MobileSearchOverlayProps {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (override?: string) => void;
  onClose: () => void;
  navLinks: NavLinkConfig[];
  placeholder?: string;
}

export function MobileSearchOverlay({
  open, query, onQueryChange, onSearch, onClose, navLinks, placeholder,
}: MobileSearchOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[9990] bg-black/50 md:hidden"
          />
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed top-20 inset-x-0 z-[9991] md:hidden bg-white dark:bg-[var(--color-ink-deep)] border-b border-stone-100 dark:border-white/8 shadow-2xl"
          >
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              <div className="flex-1 flex items-center gap-2.5 bg-stone-50 dark:bg-[#111] border border-[var(--color-accent)]/40 focus-within:border-[var(--color-accent)] rounded-full px-4 h-11 transition-colors duration-150">
                <Search className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) onSearch(); }}
                  placeholder={placeholder ?? "Search products, stores\u2026"}
                  className="flex-1 bg-transparent text-[14px] text-stone-900 dark:text-white placeholder:text-stone-400 outline-none"
                />
                {query && (
                  <button
                    onClick={() => onQueryChange("")}
                    className="flex items-center justify-center h-5 w-5 rounded-full bg-stone-200 dark:bg-stone-700 shrink-0 transition-colors hover:bg-stone-300 dark:hover:bg-stone-600"
                  >
                    <X className="h-3 w-3 text-stone-500 dark:text-stone-300" />
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-[13px] font-semibold text-[var(--color-accent)] shrink-0 px-1 active:opacity-60 transition-opacity"
              >
                Cancel
              </button>
            </div>

            <div className="px-4 pb-6 max-h-[72vh] overflow-y-auto">
              {!query.trim() ? (
                <>
                  <div className="flex items-center gap-2 px-1 pb-2 pt-1">
                    <Flame className="h-3.5 w-3.5 text-orange-500" />
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Trending</p>
                  </div>
                  <div className="space-y-0.5">
                    {TRENDING_SEARCHES.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => onSearch(item.label)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-white/5 text-left transition-colors group"
                      >
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                          <item.icon className="h-4 w-4" style={{ color: item.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-stone-800 dark:text-white leading-tight">{item.label}</p>
                          <p className="text-[11px] text-stone-400 mt-0.5">{item.count}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 shrink-0 group-hover:text-[var(--color-accent)] transition-colors" />
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-stone-100 dark:border-white/5">
                    <div className="flex items-center gap-2 px-1 pb-2">
                      <Globe className="h-3.5 w-3.5 text-stone-400" />
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Browse</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {navLinks.slice(0, 4).map((l: NavLinkConfig) => {
                        const Icon = iconForHref(l.href);
                        return (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={onClose}
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/8 transition-colors"
                          >
                            <Icon className="h-4 w-4 text-stone-400 shrink-0" />
                            <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300 truncate">{l.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-1 pb-2 pt-1">
                    <Search className="h-3.5 w-3.5 text-stone-400" />
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      Results for &ldquo;{query}&rdquo;
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {navLinks
                      .filter((l: NavLinkConfig) => l.label.toLowerCase().includes(query.toLowerCase()))
                      .map((l: NavLinkConfig) => {
                        const Icon = iconForHref(l.href);
                        return (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={onClose}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-white/5 transition-colors group"
                          >
                            <div className="h-9 w-9 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-stone-400" />
                            </div>
                            <span className="text-[13px] font-semibold text-stone-800 dark:text-white flex-1">{l.label}</span>
                            <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 shrink-0 group-hover:text-[var(--color-accent)] transition-colors" />
                          </Link>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => onSearch()}
                    className="w-full mt-3 flex items-center gap-3 p-3.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/15 border border-orange-100 dark:border-orange-500/20 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
                      <Search className="h-4 w-4 text-[var(--color-accent)]" />
                    </div>
                    <span className="text-[13px] font-bold text-[var(--color-accent)] text-left flex-1">
                      Search all results for &ldquo;{query}&rdquo;
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
