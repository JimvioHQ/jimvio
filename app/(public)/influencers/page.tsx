import React from "react";
import Link from "next/link";
import { getFeedClips, getTopVendors } from "@/services/db";
import { TikTokFeed } from "@/components/influencer/tiktok-feed";
import { Button } from "@/components/ui/button";
import { ArrowRight, Video, Users, Store } from "lucide-react";

export default async function InfluencersPage() {
  const clips = await getFeedClips(30).catch(() => []);

  return (
    <div className="min-h-screen bg-ink-darker">
      {/* TikTok-style video feed — main screen */}
      <section className="relative">
        <TikTokFeed clips={clips} />
      </section>

      {/* Bottom bar: Browse creators & stores (when not fullscreen) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-ink-darker/90 to-transparent pt-12 pb-6 px-4 pointer-events-none md:pointer-events-auto">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
          <Link href="/influencers/browse">
            <Button variant="secondary" className="rounded-2xl bg-white/15 border border-white/20 text-white hover:bg-white/25 font-bold gap-2">
              <Users className="h-4 w-4" />
              Browse Creators
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="secondary" className="rounded-2xl bg-white/15 border border-white/20 text-white hover:bg-white/25 font-bold gap-2">
              <Video className="h-4 w-4" />
              Explore Products
            </Button>
          </Link>
          <Link href="/vendors">
            <Button variant="secondary" className="rounded-2xl bg-white/15 border border-white/20 text-white hover:bg-white/25 font-bold gap-2">
              <Store className="h-4 w-4" />
              Visit Stores
            </Button>
          </Link>
        </div>
      </div>

      {/* Top CTA strip — below navbar */}
      <div className="fixed left-0 right-0 z-20 py-3 px-4 bg-gradient-to-b from-ink-darker/60 to-transparent pointer-events-none" style={{ top: 'var(--navbar-height, 108px)' }}>
        <div className="max-w-[1280px] mx-auto flex justify-between items-center">
          <span className="text-white/90 text-sm font-bold">Creator Feed</span>
          <Link href="/influencers/browse" className="pointer-events-auto text-[#f97316] text-sm font-black hover:underline flex items-center gap-1">
            All creators <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
