"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, X, Brain, Send, Search, Package, 
  ShieldCheck, ArrowRight, Loader2, MessageSquare, 
  Table as TableIcon, Layers, Zap, Ship, TrendingUp, Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { useAIStore } from "@/lib/store/use-ai-store";

const SMART_QUERIES = [
  { icon: ShieldCheck, label: "Find verified manufacturers", query: "Who are the top verified manufacturers for consumer electronics?" },
  { icon: Ship, label: "Compare shipping rates", query: "Compare shipping rates from China to Rwanda for bulk textile orders." },
  { icon: TrendingUp, label: "Market trend analysis", query: "What are the rising product trends in West African fashion?" },
  { icon: Brain, label: "Analyze bestsellers", query: "Analyze the top 10 best-selling home decor products this month." },
];

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  type?: "text" | "products" | "comparison";
  data?: any;
  links?: { label: string; href: string }[];
  thinking?: boolean;
}

export function AISourcingAssistant() {
  const { isAssistantOpen: isOpen, closeAssistant: onClose, initialQuery } = useAIStore();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedInitial = useRef(false);

  useEffect(() => {
    if (isOpen && initialQuery && !processedInitial.current) {
      handleSend(initialQuery);
      processedInitial.current = true;
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      processedInitial.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text = query) => {
    if (!text.trim()) return;
    
    // 1. Add user message
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const chatHistory = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setQuery("");

    // 2. Add empty AI message with thinking state
    const aiId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiId, role: "ai", content: "", thinking: true }]);

    try {
      // 3. Call Chat API (Streaming)
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           messages: chatHistory.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }))
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to reach AI");
      }

      // 4. Handle Stream (SSE Parsing)
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream found");
      const decoder = new TextDecoder();
      let fullContent = "";

      // Remove thinking state when stream starts
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, thinking: false } : m));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
           if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                 const json = JSON.parse(data);
                 const content = json.choices[0]?.delta?.content || "";
                 fullContent += content;

                 // Update UI
                 setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: fullContent } : m));
              } catch (e) {
                 // Skip malformed JSON in stream
              }
           }
        }
      }

      let finalContent = fullContent;
      let productData: any = undefined;
      let quickLinks: {label: string, href: string}[] | undefined = undefined;

      // 5. Post-Process (Detect Tags)
      const productMatch = fullContent.match(/\[PRODUCTS:\s*"(.*)"\]/);
      const linksMatch = fullContent.match(/\[LINKS:\s*(.*)\]/);

      if (productMatch) {
         const searchQuery = productMatch[1];
         finalContent = finalContent.replace(productMatch[0], "").trim();
         
         const prefetched = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
         const d = await prefetched.json();
         if (d.products?.length > 0) {
            productData = d.products.map((p: any) => ({
               id: p.id,
               name: p.name,
               price: `$${p.price.toLocaleString()}`,
               mqo: `${p.moq} pcs`,
               slug: p.slug
            }));
         }
      }

      if (linksMatch) {
         try {
           const linksStr = linksMatch[1];
           // Parse links like "Label|/path", "Label|/path"
           const linkItems = linksStr.split(",").map(item => {
              const cleaned = item.replace(/"/g, "").trim();
              const parts = cleaned.split("|");
              const label = parts[0]?.trim() || "Link";
              const href = parts[1]?.trim() || "#";
              return { label, href };
           });
           quickLinks = linkItems;
           finalContent = finalContent.replace(linksMatch[0], "").trim();
         } catch (e) {}
      }

      // 6. Update final state
      setMessages(prev => prev.map(m => m.id === aiId ? { 
         ...m, 
         content: finalContent, 
         type: productData ? "products" : "text", 
         data: productData,
         links: quickLinks 
      } : m));

    } catch (err: any) {
      const errorMsg = err.message || "Unknown error";
      const isConfigError = errorMsg.toLowerCase().includes("key") || errorMsg.includes("GOOGLE_GENERATIVE_AI");

      console.error("[AI Assistant Error]:", errorMsg);

      setMessages(prev => prev.map(m => m.id === aiId ? {
        ...m,
        thinking: false,
        content: isConfigError
          ? "I'm ready to answer any question! To activate my full intelligence, please add a **GOOGLE_GENERATIVE_AI_API_KEY** to your **.env** file from **aistudio.google.com**. Once added, I can handle everything from market trends to logistics." 
          : `Something went wrong: **${errorMsg}**. Please check your Gemini API usage or check the console.`
      } : m));
    }
  };

  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  if (!isOpen || !portalReady) return null;

  return createPortal(
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 z-[9999] bg-white dark:bg-surface w-full h-full min-h-full flex flex-col overflow-hidden"
      style={{ height: "100%", bottom: 0, top: 0 }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 sm:px-10 py-3 sm:py-5 border-b border-zinc-100 dark:border-border bg-white dark:bg-surface sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-sm bg-orange-500 flex items-center justify-center text-white shadow-none shadow-orange-500/10">
            <Brain size={16} className="sm:size-[18px]" />
          </div>
          <div>
            <h2 className="text-[14px] sm:text-[16px] font-black text-zinc-900 dark:text-white leading-none">Jimvio AI</h2>
            <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
               <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-sm bg-green-500 animate-pulse" />
               <p className="text-[8px] sm:text-[9px] font-black text-zinc-400 capitalize tracking-widest hidden xs:block">Active Assistant</p>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-sm hover:bg-zinc-100 transition-colors"
        >
          <X size={18} className="text-zinc-400" />
        </button>
      </div>

      {/* VIEWPORT */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* MESSAGES / CHAT AREA */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-10 space-y-6 sm:space-y-8 scroll-smooth no-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-8 lg:py-20">
              <div className="p-3 sm:p-4 rounded-sm sm:rounded-sm bg-orange-50 mb-6 sm:mb-8">
                 <Sparkles className="h-8 w-8 sm:h-12 sm:w-12 text-orange-500" />
              </div>
              <h3 className="text-[22px] sm:text-[36px] font-black text-zinc-900 dark:text-white tracking-tight leading-tight px-4 capitalize">
                 Describe your <span className="text-orange-500">Sourcing Goals</span>
              </h3>
              <p className="text-[13px] sm:text-[15px] font-medium text-zinc-400 mt-3 sm:mt-4 max-w-xs sm:max-w-md px-4">
                I'll analyze 240,000+ products and verified vendors to find you the best deals and logistics paths.
              </p>

              {/* Smart Pills (Inside Modal) */}
              <div className="mt-8 sm:mt-12 flex sm:flex-wrap gap-2 sm:gap-2.5 justify-start sm:justify-center overflow-x-auto no-scrollbar w-full px-4 pb-2">
                 {SMART_QUERIES.map((sq, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sq.query)}
                      className="flex-none flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-sm sm:rounded-sm bg-zinc-50 dark:bg-surface/50 border border-zinc-100 dark:border-border hover:border-orange-200 hover:bg-white dark:bg-surface hover:shadow-none hover:shadow-orange-500/5 transition-all group"
                    >
                      <sq.icon size={14} className="text-zinc-400 group-hover:text-orange-500" />
                      <span className="text-[12px] sm:text-[13px] font-black text-zinc-600 group-hover:text-zinc-900 dark:text-white whitespace-nowrap">{sq.label}</span>
                    </button>
                 ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn(
              "flex gap-3 sm:gap-6",
              msg.role === "user" ? "flex-reverse items-end justify-end" : "items-start"
            )}>
              {msg.role === "ai" && (
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 border border-orange-100 bg-orange-50">
                  <AvatarFallback><Brain size={14} className="text-orange-600 sm:size-[18px]" /></AvatarFallback>
                </Avatar>
              )}
              
              <div className={cn(
                "max-w-[90%] sm:max-w-[70%] space-y-3 sm:space-y-4",
                msg.role === "user" ? "text-right" : "text-left"
              )}>
                {msg.content && (
                  <div className={cn(
                    "p-4 sm:p-6 rounded-sm sm:rounded-sm",
                    msg.role === "user" 
                      ? "bg-zinc-900 text-white rounded-sm-none" 
                      : "bg-zinc-50 dark:bg-surface/50 border border-zinc-100 dark:border-border text-zinc-800 dark:text-text-secondary text-[14px] sm:text-[16px] font-medium leading-relaxed"
                  )}>
                    {msg.content}
                  </div>
                )}

                {msg.thinking && (
                   <div className="flex flex-col gap-3 p-4 sm:p-6 rounded-sm sm:rounded-sm bg-zinc-50 dark:bg-surface/50 border border-dashed border-zinc-200 dark:border-border">
                      <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-zinc-400 animate-pulse">
                         <Loader2 size={12} className="animate-spin" /> Analyzing data...
                      </div>
                      <div className="space-y-2">
                         <div className="h-1.5 w-full bg-zinc-200 rounded-sm" />
                         <div className="h-1.5 w-2/3 bg-zinc-200 rounded-sm" />
                      </div>
                   </div>
                )}

                {msg.links && msg.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {msg.links.map((link, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          if (link.href?.startsWith("http")) window.open(link.href, "_blank");
                          else { /* handle internal navigation if needed */ }
                        }}
                        className="px-4 py-2 rounded-sm bg-white dark:bg-surface border border-zinc-200 dark:border-border text-[12px] font-black text-zinc-600 hover:border-orange-500 hover:text-orange-600 transition-all flex items-center gap-2 group shadow-none"
                      >
                         {link.label} <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                      </button>
                    ))}
                  </div>
                )}

                {msg.type === "products" && msg.data && (
                  <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 overflow-x-auto pb-6 sm:pb-0 px-1 sm:px-0 no-scrollbar snap-x snap-mandatory">
                    {msg.data.map((p: any) => (
                      <div key={p.id} className="min-w-[85%] xs:min-w-[75%] sm:min-w-0 snap-center p-4 rounded-sm border border-zinc-100 dark:border-border bg-white dark:bg-surface hover:shadow-none hover:shadow-orange-500/10 transition-all group shadow-none flex flex-col">
                         <div className="flex items-center gap-1.5 mb-3">
                            <div className="h-1.5 w-1.5 rounded-sm bg-green-500" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Matches 100% requirements</span>
                         </div>
                         <div className="h-40 sm:h-48 w-full mb-4 rounded-sm bg-zinc-50 dark:bg-surface/50 flex flex-col items-center justify-center relative overflow-hidden group-hover:bg-zinc-100 transition-colors">
                            <Package className="h-10 w-10 text-zinc-200 group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-sm bg-white dark:bg-surface/80 border border-zinc-100 dark:border-border text-[10px] font-black shadow-none">
                               <ShieldCheck size={12} className="text-orange-500" /> Verified
                            </div>
                         </div>
                         <h4 className="text-[14px] font-black text-zinc-900 dark:text-white leading-tight mb-2 group-hover:text-orange-600 transition-colors line-clamp-2">{p.name}</h4>
                         
                         <div className="flex flex-col gap-1 mt-auto">
                            <div className="flex items-end justify-between">
                               <span className="text-orange-600 font-black text-[18px] leading-none tracking-tight">{p.price}</span>
                               <span className="text-[10px] font-black text-zinc-400">Min: {p.mqo}</span>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-50">
                               <div className="flex items-center gap-2">
                                  <div className="h-4 w-6 rounded-sm bg-zinc-100 flex items-center justify-center text-[10px] font-black text-zinc-500">CN</div>
                                  <span className="text-[10px] font-bold text-zinc-400">6 yrs</span>
                               </div>
                               <Button variant="ghost" size="sm" className="h-7 px-2 rounded-sm text-zinc-400 hover:text-zinc-900 dark:text-white">
                                  <ArrowRight size={14} />
                                </Button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 border border-zinc-200 dark:border-border">
                  <AvatarFallback className="bg-zinc-100 font-black text-zinc-600 text-[10px] sm:text-[11px]">ME</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>

        {/* FLOATING ACTION BAR */}
        <div className="px-3 sm:px-6 pb-6 sm:pb-10 pt-2 sm:pt-4 bg-white dark:bg-surface border-t border-zinc-50 sm:border-0">
           <div className="max-w-4xl mx-auto">
             <form 
               onSubmit={(e) => { e.preventDefault(); handleSend(); }}
               className="relative flex items-center"
             >
                <div className="absolute left-4 sm:left-6 text-orange-500">
                  <Sparkles size={16} className="sm:size-5" />
                </div>
                <input 
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={messages.length === 0 ? "What are you sourcing?" : "Ask follow-up..."}
                  className="w-full h-14 sm:h-20 pl-11 sm:pl-16 pr-20 sm:pr-24 bg-zinc-50 dark:bg-surface/50 rounded-sm border-2 border-transparent focus:border-orange-500 focus:bg-white dark:bg-surface outline-none text-[14px] sm:text-[18px] font-bold text-zinc-900 dark:text-white shadow-none transition-all"
                />
                <div className="absolute right-3 sm:right-4 flex items-center gap-1 sm:gap-2">
                  <button type="button" className="p-2 sm:p-3 text-zinc-400 hover:text-orange-500 transition-colors">
                    <Paperclip size={18} className="sm:size-5" />
                  </button>
                  <button 
                    type="submit"
                    disabled={!query.trim()}
                    className="h-10 w-10 sm:h-12 sm:w-12 bg-zinc-900 disabled:bg-zinc-100 text-white rounded-sm flex items-center justify-center hover:scale-105 transition-all shadow-none shadow-black/10"
                  >
                    <Send size={15} className="sm:size-[18px]" />
                  </button>
                </div>
             </form>
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

