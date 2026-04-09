"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Megaphone, Users, ArrowRight, Zap, Globe, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface SpotlightProps {
  campaign?: any;
  community?: any;
}

export function PlatformSpotlight({ campaign, community }: SpotlightProps) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
      {/* FEATURED CAMPAIGN */}
      <div className="relative group overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 min-h-[300px] flex flex-col justify-between border border-white/10 shadow-2xl">
         <div className="absolute top-0 right-0 p-10 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-700"><Megaphone className="w-64 h-64 text-orange-500 rotate-12" /></div>
         
         <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest">
              <Zap className="w-3 h-3 fill-orange-500" /> Featured Mission
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none max-w-sm">
              {campaign?.title || "Boost your content earnings today."}
            </h2>
            <p className="text-slate-400 font-bold text-sm max-w-xs leading-relaxed">
              Earn ${campaign?.rate_per_1k_views || '3.50'} for every 1,000 views on your verified content. 
              Open platforms: TikTok, Instagram, YouTube.
            </p>
         </div>

         <div className="relative z-10 pt-6">
            <Button asChild size="lg" className="rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black px-8">
              <Link href={campaign ? `/ugc/campaigns/${campaign.id}` : "/ugc"}>
                Apply to Mission <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
         </div>
      </div>

      {/* FEATURED COMMUNITY */}
      <div className="relative group overflow-hidden rounded-[2.5rem] bg-indigo-600 p-8 min-h-[300px] flex flex-col justify-between border border-white/10 shadow-2xl">
         <div className="absolute top-0 right-0 p-10 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-700"><Users className="w-64 h-64 text-white -rotate-12" /></div>
         
         <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest">
              <Globe className="w-3 h-3" /> Elite Network
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none max-w-sm">
              {community?.name || "Join the Creator Alpha Circle."}
            </h2>
            <p className="text-indigo-100 font-bold text-sm max-w-xs leading-relaxed">
              Connect with {community?.member_count || '1,200'}+ verified creators and scaling vendors. 
              Weekly webinars and live sourcing drops.
            </p>
         </div>

         <div className="relative z-10 pt-6">
            <Button asChild size="lg" className="rounded-2xl bg-white text-indigo-600 hover:bg-zinc-100 font-black px-8">
              <Link href={community ? `/communities/${community.slug}` : "/communities"}>
                Join Community <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
         </div>
      </div>
    </section>
  );
}
