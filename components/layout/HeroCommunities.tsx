"use client";
import { SharedCommunityCard, CommunityRow } from "@/components/community/community-card-shared";
import React, { useEffect, useState } from "react";

export default function HeroCommunities() {
  const [items, setItems] = useState<CommunityRow[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/communities");
        const data = await res.json();
        if (!mounted) return;
        const rows = (data.communities ?? []).map((c: any, i: number) => ({
          id: String(c.id || i + 1),
          name: c.name || `Community ${i + 1}`,
          slug: c.slug || (c.name || `community-${i + 1}`).toLowerCase().replace(/\s+/g, "-"),
          tagline: c.tagline ?? null,
          category: undefined,
          member_count: c.member_count ?? 0,
          post_count: undefined,
          is_free: c.is_free ?? true,
          monthly_price: c.monthly_price ?? null,
          currency: "RWF",
          cover_image: c.cover_image ?? undefined,
          image_url: undefined,
          avatar_url: c.avatar_url ?? undefined,
          created_at: undefined,
          profiles: null,
        } as CommunityRow));
        setItems(rows.slice(0, 3));
      } catch (e) {
        // fallback silent
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="rounded-2xl p-6 bg-surface border border-border">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold">Communities: Build, Grow, Monetize</h2>
          <p className="text-sm text-text-muted mt-1">Create spaces for your audience — host campaigns, sell digital goods, and run member-only content.</p>

          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <li className="text-sm"><strong>Create:</strong> Launch a community in minutes with templates and onboarding flows.</li>
            <li className="text-sm"><strong>Grow:</strong> Built-in discovery, campaigns, and affiliate tools to bring members.</li>
            <li className="text-sm"><strong>Monetize:</strong> Subscriptions, paid posts, and gated resources to earn recurring revenue.</li>
            <li className="text-sm"><strong>Collaborate:</strong> Integrations for creators, UGC campaigns, and brand partnerships.</li>
          </ul>

          <div className="mt-4 flex gap-3">
            <a href="/communities/create" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#fd5000] text-white font-semibold">Create Community</a>
            <a href="/communities" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm">Browse Communities</a>
          </div>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-sm text-text-muted">No communities to preview</div>
          ) : (
            items.map((c, i) => (
              <SharedCommunityCard key={c.id} c={c} rank={i + 1} showQuickActions={false} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
