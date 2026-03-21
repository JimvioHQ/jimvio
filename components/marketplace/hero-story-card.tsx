"use client";

import React, { useState } from "react";
import { Play } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ViralStoryRow } from "./viral-story-row";

interface HeroStoryCardProps {
  viralClips: any[];
}

export function HeroStoryCard({ viralClips }: HeroStoryCardProps) {
  const [showPlayer, setShowPlayer] = useState(false);

  if (!viralClips || viralClips.length === 0) return null;

  const firstClip = viralClips[0];

  return (
    <>
      <div 
        onClick={() => setShowPlayer(true)}
        className="relative aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl group-hover/clip:scale-[1.02] transition-transform duration-700 cursor-pointer ring-8 ring-white shadow-orange-500/10 active:scale-[0.98]"
      >
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: firstClip.thumbnail_url ? `url(${firstClip.thumbnail_url})` : 'url(https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/80 via-transparent to-transparent" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white scale-90 group-hover/clip:scale-100 transition-transform">
            <Play className="h-8 w-8 fill-white" />
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 text-white text-left">
          <p className="text-[14px] font-black leading-tight mb-2 drop-shadow-md">{firstClip.title}</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#f97316] flex items-center justify-center text-[10px] font-black border border-white/20">
              {firstClip.vendors?.business_name?.[0] || "V"}
            </div>
            <span className="text-[11px] font-bold text-white/80">@{firstClip.vendors?.business_name?.toLowerCase().replace(/\s/g, '') || "verified"}</span>
          </div>
        </div>
      </div>

      {/* We reuse the player logic by rendering a hidden ViralStoryRow or similar */}
      {showPlayer && (
        <div className="fixed inset-0 z-[2000]">
           <ViralStoryRow 
             clips={viralClips} 
             initialActiveIndex={0} 
             onClose={() => setShowPlayer(false)} 
             forceOpen={true}
           />
        </div>
      )}
    </>
  );
}
