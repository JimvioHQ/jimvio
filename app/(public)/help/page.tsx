"use client";

import React, { useState, useEffect } from "react";
import { 
  HelpCircle, Search, Book, MessageSquare, Zap, 
  ShieldCheck, Mail, ArrowRight, FileText, 
  Sparkles, ChevronRight, MessageCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function HelpCenterPage() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const categories = [
    { icon: ShieldCheck, title: "Trust & Safety", count: "12 articles", color: "bg-blue-50 text-blue-600" },
    { icon: Zap, title: "Getting Started", count: "8 articles", color: "bg-orange-50 text-[#f97316]" },
    { icon: FileText, title: "Selling Guide", count: "15 articles", color: "bg-purple-50 text-purple-600" },
    { icon: Book, title: "Buying Guide", count: "10 articles", color: "bg-emerald-50 text-emerald-600" },
    { icon: MessageSquare, title: "Messenger", count: "5 articles", color: "bg-pink-50 text-pink-600" },
    { icon: HelpCircle, title: "FAQ", count: "24 articles", color: "bg-zinc-100 text-zinc-600" },
  ];

  const commonQuestions = [
    "How do I verify my vendor account?",
    "What is Jimvio Trade Assurance?",
    "How to withdraw affiliate earnings?",
    "Shipping and logistics support for creators",
    "Managing your subscription billing"
  ];

  return (
    <div className="bg-zinc-50 dark:bg-surface/50 min-h-screen selection:bg-[#f97316]/20">
      {/* GLOSSY HEADER SECTION */}
      <section className="relative pt-32 pb-44 overflow-hidden bg-white dark:bg-surface border-b border-zinc-100 dark:border-border">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-[0.03] pointer-events-none">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#f97316,transparent_70%)]" />
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
             <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none bg-orange-50 text-[#f97316] text-[11px] font-black uppercase tracking-widest mb-6">
                <Sparkles className="h-3 w-3" /> Support Intelligence
             </span>
             <h1 className="text-5xl md:text-7xl font-black text-zinc-900 dark:text-white mb-10 tracking-tight leading-[0.95]">
               How can we <span className="text-[#f97316] italic">help you?</span>
             </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.2 }}
            className="relative max-w-3xl mx-auto"
          >
             <form className={cn(
                "group flex h-16 sm:h-20 items-center rounded-none border transition-all p-2 pr-2.5",
                isSearchFocused 
                  ? "bg-white dark:bg-surface border-[#f97316] shadow-[0_25px_60px_-15px_rgba(249,115,22,0.2)] ring-4 ring-[#f97316]/5 scale-[1.02]" 
                  : "bg-zinc-50 dark:bg-surface/50 border-zinc-200 dark:border-border shadow-none hover:border-zinc-300"
             )}>
                <div className="flex h-full flex-1 items-center px-6">
                   <Search className={cn("mr-4 h-6 w-6 transition-colors", isSearchFocused ? "text-[#f97316]" : "text-zinc-400")} />
                   <input
                     type="text"
                     value={searchVal}
                     onChange={(e) => setSearchVal(e.target.value)}
                     onFocus={() => setIsSearchFocused(true)}
                     onBlur={() => setIsSearchFocused(false)}
                     placeholder="Describe your issue or ask Jimvio AI..."
                     className="h-full w-full bg-transparent text-[16px] sm:text-[19px] font-bold text-zinc-900 dark:text-white outline-none placeholder:font-medium placeholder:text-zinc-400/80"
                   />
                </div>
                <button
                  type="button"
                  className="h-full flex items-center gap-3 rounded-none bg-zinc-900 px-6 sm:px-10 text-[14px] sm:text-[16px] font-black text-white shadow-none shadow-zinc-900/10 transition-all hover:bg-black hover:-translate-y-0.5"
                >
                   <Zap className="h-5 w-5 fill-[#f97316] stroke-none" />
                   <span className="hidden sm:inline">Ask AI</span>
                </button>
             </form>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3 mt-10">
             {["Verification", "Shipping", "Refunds", "Payouts"].map(tag => (
               <button key={tag} className="text-[12px] font-black text-zinc-500 hover:text-zinc-900 dark:text-white bg-zinc-50 dark:bg-surface/50 hover:bg-white dark:bg-surface border border-zinc-200 dark:border-border px-5 py-2.5 rounded-none transition-all">{tag}</button>
             ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES GRID WITH CARDS */}
      <section className="max-w-7xl mx-auto px-6 -mt-20 pb-24 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((cat, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative bg-white dark:bg-surface border border-zinc-100 dark:border-border p-10 rounded-none shadow-none shadow-black/[0.02] hover:shadow-none hover:shadow-black/[0.05] transition-all cursor-pointer overflow-hidden active:scale-95 duration-300"
            >
              <div className={cn("h-16 w-16 rounded-none flex items-center justify-center mb-8 transition-transform group-hover:scale-110 group-hover:rotate-12", cat.color)}>
                 <cat.icon className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-3 tracking-tight">{cat.title}</h3>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-8">{cat.count}</p>
              
              <div className="flex items-center gap-2 text-[13px] font-black text-[#f97316] opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all">
                 Browse Guide <ArrowRight className="h-4 w-4" />
              </div>
              
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                 <cat.icon className="h-32 w-32" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* REFINED FAQ SECTION */}
      <section className="py-32 bg-white dark:bg-surface border-y border-zinc-100 dark:border-border">
        <div className="max-w-4xl mx-auto px-6">
           <div className="text-center mb-20">
              <h2 className="text-4xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight">Most Searched Topics</h2>
              <p className="text-[15px] font-bold text-zinc-400">Quick answers to the common hurdles on our path.</p>
           </div>
           
           <div className="space-y-4">
             {commonQuestions.map((q, i) => (
               <div key={i} className="group flex items-center justify-between p-8 rounded-none bg-zinc-50 dark:bg-surface/50 border border-transparent hover:border-[#f97316]/20 hover:bg-white dark:bg-surface transition-all cursor-pointer">
                 <span className="text-[17px] font-bold text-zinc-800 dark:text-text-secondary group-hover:text-zinc-900 dark:text-white">{q}</span>
                 <div className="h-10 w-10 rounded-none bg-white dark:bg-surface shadow-none flex items-center justify-center group-hover:bg-[#f97316] group-hover:text-white transition-all">
                    <ChevronRight className="h-5 w-5" />
                 </div>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* HIGH-END CONTACT CTAs */}
      <section className="py-40 bg-zinc-50 dark:bg-surface/50">
         <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="relative bg-zinc-900 p-16 rounded-none text-white overflow-hidden group">
                  <div className="relative z-10">
                     <div className="h-14 w-14 rounded-none bg-[#f97316] flex items-center justify-center mb-10 shadow-none shadow-orange-500/40">
                        <MessageCircle className="h-7 w-7 text-white" />
                     </div>
                     <h2 className="text-4xl font-black mb-4 tracking-tight">Talk to our experts.</h2>
                     <p className="text-lg text-zinc-400 font-medium mb-10 max-w-sm">Get real-time assistance from our specialist team available 24/7.</p>
                     <Button className="h-14 px-10 rounded-none bg-white dark:bg-surface text-zinc-900 dark:text-white font-black hover:bg-zinc-100 transition-all text-base">Start Live Chat</Button>
                  </div>
                  <div className="absolute -bottom-20 -right-20 h-80 w-80 bg-[#f97316] opacity-[0.05] blur-[100px] group-hover:opacity-[0.1] transition-opacity" />
               </div>

               <div className="relative bg-white dark:bg-surface p-16 rounded-none border border-zinc-100 dark:border-border overflow-hidden group">
                   <div className="relative z-10">
                      <div className="h-14 w-14 rounded-none bg-zinc-50 dark:bg-surface/50 flex items-center justify-center mb-10 border border-zinc-100 dark:border-border">
                         <Mail className="h-7 w-7 text-zinc-900 dark:text-white" />
                      </div>
                      <h2 className="text-4xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight">Open a Support Case.</h2>
                      <p className="text-lg text-zinc-400 font-medium mb-10 max-w-sm">Detailed technical issues or specialized requests. We respond in &lt;12h.</p>
                      <Button variant="outline" className="h-14 px-10 rounded-none border-zinc-200 dark:border-border text-zinc-900 dark:text-white font-black hover:bg-zinc-50 dark:bg-surface/50 transition-all text-base">Submit a Ticket</Button>
                   </div>
                   <div className="absolute top-0 right-0 p-16 text-[#f97316] opacity-[0.02]">
                      <Mail className="h-64 w-64" />
                   </div>
               </div>
            </div>
         </div>
      </section>

      {/* FOOTER-LIKE BADGES */}
      <footer className="py-20 text-center border-t border-zinc-200 dark:border-border bg-white dark:bg-surface">
         <div className="max-w-4xl mx-auto px-6">
            <div className="flex flex-wrap justify-center gap-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all">
               <div className="flex items-center gap-2 font-black text-zinc-900 dark:text-white"><ShieldCheck className="h-5 w-5" /> Secured by Jimvio Shield</div>
               <div className="flex items-center gap-2 font-black text-zinc-900 dark:text-white"><Zap className="h-5 w-5" /> AI Augmented Support</div>
               <div className="flex items-center gap-2 font-black text-zinc-900 dark:text-white"><MessageSquare className="h-5 w-5" /> Humans on Standby</div>
            </div>
         </div>
      </footer>
    </div>
  );
}

