import React from "react";
import { Video, Play, TrendingUp, Users, Heart, Share2, ShoppingCart, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getViralClips } from "@/services/db";
import Link from "next/link";

export default async function ViralClippingsPage() {
  const clips = await getViralClips(12);

  return (
    <div className="bg-[var(--color-bg)] min-h-screen">
      {/* Hero */}
      <section className="bg-white border-b border-[var(--color-border)] py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-50 to-transparent" />
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 relative z-10">
          <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)] border-none mb-6 px-4 py-1.5 capitalize tracking-widest font-black text-[10px]">
            <Video className="h-3.5 w-3.5 mr-2" /> Creator Commerce
          </Badge>
          <h1 className="text-5xl md:text-7xl font-[900] text-[var(--color-text-primary)] mb-8 tracking-tighter leading-[0.95] max-w-3xl">
            Viral Clips for <span className="text-[var(--color-accent)]">Viral Sales</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xl mb-12 max-w-2xl font-medium leading-relaxed">
            Discover trending short-form content that drives real revenue. Download high-converting clips for your products or hire creators to make new ones.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="xl" className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black rounded-xl h-16 px-10 shadow-xl shadow-[var(--color-accent)]/20">
              Browse All Clips
            </Button>
            <Button size="xl" variant="outline" className="font-black rounded-xl h-16 px-10 border-2">
              Hire Creator
            </Button>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16 max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-2xl font-black text-[var(--color-text-primary)]">Trending This Week</h2>
          <div className="flex gap-2">
            {["Recent", "Most Views", "Highest ROI"].map(tag => (
              <button key={tag} className="px-5 py-2 rounded-full border border-[var(--color-border)] text-xs font-bold hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all">
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {clips.map((clip: any) => (
            <div key={clip.id} className="group bg-white border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500">
              <div className="relative aspect-[9/16] bg-ink-dark overflow-hidden">
                {clip.thumbnail_url ? (
                  <img src={clip.thumbnail_url} alt={clip.title} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-12 w-12 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/80 via-transparent to-ink-darker/20" />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-white/10 backdrop-blur-md text-white border-white/20 text-[10px]">
                    {clip.duration || "0:15"}
                  </Badge>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-16 w-16 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-xl">
                    <Play className="h-8 w-8 text-white fill-white ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-white font-black text-lg leading-tight mb-2 line-clamp-2">{clip.title}</h3>
                  <div className="flex items-center gap-4 text-white/60 text-[10px] font-bold capitalize tracking-widest">
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {clip.total_views?.toLocaleString() || "120k"} VIEWS</span>
                    <span className="flex items-center gap-1 text-[var(--color-accent)]"><Heart className="h-3 w-3 fill-current" /> {clip.total_conversions || 420}+ SALES</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-[var(--color-accent)] font-black text-[10px]">
                    {clip.vendors?.business_name?.charAt(0) || "S"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-[var(--color-text-primary)] truncate">{clip.vendors?.business_name || "Official Store"}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold capitalize">{clip.products?.name || "Premium Product"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black text-[10px] h-10 rounded-xl">
                    <ShoppingCart className="h-3 w-3 mr-2" /> Buy Product
                  </Button>
                  <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-2">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {clips.length === 0 && (
          <div className="py-32 text-center">
            <Video className="h-16 w-16 text-[var(--color-text-muted)] mx-auto mb-6" />
            <p className="text-xl font-bold text-[var(--color-text-secondary)]">The clips gallery is warming up. Check back in a few minutes!</p>
          </div>
        )}
      </section>

      {/* Benefits */}
      <section className="py-24 bg-ink-dark text-white">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: <Zap />, title: "High Conversion", desc: "Clips are pre-tested and proven to drive 5x higher engagement than static ads." },
              { icon: <Users />, title: "Native Content", desc: "Authentic, creator-led videos that resonate with TikTok and Reels audiences." },
              { icon: <TrendingUp />, title: "Ready-to-Use", desc: "Download in 4K resolution with rights included for all your marketing channels." }
            ].map((b, i) => (
              <div key={i} className="text-center md:text-left">
                <div className="h-14 w-14 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center mb-6 text-white mx-auto md:ml-0">
                  {b.icon}
                </div>
                <h3 className="text-xl font-black mb-4">{b.title}</h3>
                <p className="text-white/60 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
