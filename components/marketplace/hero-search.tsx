"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, Zap, Loader2, Sparkles, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AISourcingAssistant } from "./ai-sourcing-assistant";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [initialAIQuery, setInitialAIQuery] = useState("");
  const [results, setResults] = useState<{ products: any[], vendors: any[], categories: any[] }>({ products: [], vendors: [], categories: [] });
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
        .then(r => r.json())
        .then(d => setResults(d));
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
    <div ref={containerRef} className="w-full max-w-[800px] z-[100] relative mx-auto">
      {/* TRIGGER SEARCH BAR */}
      <div className="relative">
        <motion.div
          animate={{ 
             scale: isFocused ? 1.01 : 1,
             y: isFocused ? -2 : 0
          }}
          className={cn(
            "relative flex items-center h-16 sm:h-18 rounded-full transition-all duration-300 overflow-hidden",
            isFocused 
              ? "bg-white border-2 border-orange-500 shadow-[0_20px_60px_rgba(249,115,22,0.1)]" 
              : "bg-white/60 backdrop-blur-md border border-zinc-200"
          )}
        >
          <div className="flex-1 flex items-center px-6 sm:px-8 h-full">
             <Search className="h-5 w-5 text-zinc-400 mr-3" />
             <input
               type="text"
               value={q}
               onFocus={() => setIsFocused(true)}
               onChange={(e) => setQ(e.target.value)}
               placeholder="Search products, suppliers, or ask Jimvio AI..."
               className="flex-1 bg-transparent border-0 outline-none text-[15px] sm:text-[17px] font-bold text-zinc-900 placeholder:text-zinc-400 placeholder:font-medium h-full"
               onKeyDown={(e) => {
                 if (e.key === "Enter") handleSearch();
               }}
             />
             <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => openAI()} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 transition-colors flex items-center gap-1 group">
                   <Sparkles size={16} className="text-orange-400" />
                   <span className="text-[10px] font-black uppercase text-zinc-400">AI</span>
                </button>
                <div className="h-4 w-px bg-zinc-200 mx-1" />
                <button type="button" className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 transition-colors">
                   <Paperclip size={18} />
                </button>
             </div>
          </div>

          <button
            type="button"
            onClick={() => handleSearch()}
            className="h-full px-6 sm:px-8 bg-zinc-900 hover:bg-black text-white text-[13px] sm:text-[15px] font-black transition-colors"
          >
            Explore
          </button>
        </motion.div>

        {/* DROPDOWN */}
        <AnimatePresence>
          {q.length >= 2 && isFocused && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl border border-zinc-100 shadow-[0_32px_80px_rgba(0,0,0,0.1)] overflow-hidden"
            >
              <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                {results.products.length > 0 && (
                   <div className="grid grid-cols-1 gap-1">
                      {results.products.slice(0, 5).map(p => (
                         <button key={p.id} onClick={() => router.push(`/marketplace/${p.slug}`)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 text-left transition-all">
                            <Search className="h-4 w-4 text-zinc-300" />
                            <span className="text-[14px] font-bold text-zinc-700 truncate">{p.name}</span>
                         </button>
                      ))}
                   </div>
                )}
                <button   
                  onClick={() => openAI()}
                  className="w-full h-12 rounded-2xl bg-orange-50 text-orange-600 text-[12px] font-black flex items-center justify-center gap-2 border border-orange-100 hover:bg-orange-100 transition-all"
                >
                   <Sparkles size={14} /> Ask AI to find best deals for "{q}"
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI MODE OVERLAY - PORTALED TO DOCUMENT BODY */}
      {portalReady && createPortal(
        <AnimatePresence>
          {isAIMode && (
            <AISourcingAssistant />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
