import React from "react";
import Link from "next/link";
import { getTopVendors } from "@/services/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Sparkles, TrendingUp, Users, Video } from "lucide-react";

export default async function InfluencersBrowsePage() {
  const vendors = await getTopVendors(30);

  const niches = ["All Categories", "Fashion & Beauty", "Tech & Gadgets", "Home & Lifestyle", "Food & Drink", "Travel"];

  return (
    <div className="min-h-screen bg-white">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden bg-zinc-950 pt-32 pb-20 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_50%)]" />
        
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-6">
            <Sparkles className="h-3 w-3 animate-pulse" /> Global Creator Network
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Meet the world's <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500">
              best content creators
            </span>
          </h1>
          <p className="max-w-xl text-zinc-400 text-sm md:text-base font-medium leading-relaxed mb-10">
            Connect with verified influencers and UGC creators who drive real results. 
            Browse top performers across TikTok, Instagram, and YouTube.
          </p>

          <div className="flex flex-wrap gap-6 md:gap-12">
            <div className="flex flex-col">
              <span className="text-white text-2xl font-black">2.4k+</span>
              <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider">Verified Creators</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-2xl font-black">450M+</span>
              <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider">Monthly Views</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-2xl font-black">12k+</span>
              <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider">Active Campaigns</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-12">
        {/* Filters Strip */}
        <div className="flex items-center gap-2 mb-12 overflow-x-auto pb-4 no-scrollbar">
          {niches.map((n, i) => (
            <button
              key={n}
              className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-[13px] font-black transition-all ${
                i === 0 
                  ? "bg-zinc-900 text-white shadow-xl shadow-zinc-900/20" 
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Creators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vendors.map((v: any) => (
            <Link
              key={v.id}
              href={`/influencers/${v.business_slug}`}
              className="group relative bg-white border border-zinc-100 rounded-[32px] overflow-hidden hover:shadow-2xl hover:border-orange-200 transition-all duration-500"
            >
              {/* Card Header Visual */}
              <div className="h-28 bg-zinc-50 group-hover:bg-orange-50 transition-colors relative">
                <div className="absolute -bottom-10 left-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-4 border-white shadow-xl ring-1 ring-zinc-100 group-hover:scale-110 transition-transform duration-500">
                      <AvatarImage src={v.business_logo} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-violet-600 text-white text-xl font-black">
                        {v.business_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-lg">
                      <BadgeCheck className="h-5 w-5 text-blue-500 fill-blue-500 stroke-white" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-4 right-4 flex gap-1">
                   {['tiktok', 'instagram'].map(p => (
                     <div key={p} className="h-8 w-8 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center">
                       <Video className="h-3.5 w-3.5 text-zinc-600" />
                     </div>
                   ))}
                </div>
              </div>

              {/* Card Body */}
              <div className="pt-14 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-zinc-900 truncate leading-none">
                    {v.business_name}
                  </h3>
                </div>
                
                <div className="flex items-center gap-4 text-zinc-500 mb-6">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-[12px] font-bold">12.4k</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-[12px] font-bold">8.4% ER</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-6">
                  {["Fashion", "Style"].map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-zinc-50 text-[10px] font-black text-zinc-400 uppercase tracking-tight">#{tag}</span>
                  ))}
                </div>

                <Button className="w-full h-12 rounded-2xl bg-zinc-900 hover:bg-orange-500 text-white font-black text-sm shadow-lg shadow-zinc-900/10 hover:shadow-orange-500/20 transition-all group/btn">
                  View Creator Portfolio
                </Button>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State / Load More */}
        <div className="mt-20 text-center">
           <Button variant="outline" className="h-14 rounded-3xl px-10 border-zinc-200 font-black text-zinc-900 hover:bg-zinc-50">
             Discover More Creators
           </Button>
        </div>
      </div>
    </div>
  );
}
