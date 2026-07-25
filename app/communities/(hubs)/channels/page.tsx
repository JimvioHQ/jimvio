"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Hash, Loader2, Search, ChevronRight } from "lucide-react";
import { HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";

type HubChannel = {
  id: string;
  name: string;
  slug: string;
  room_type: string;
  community_name: string;
  community_slug: string;
  space_name: string;
  href: string;
};

function channelEmoji(channel: HubChannel): string {
  if (channel.room_type === "resources" || /resource/i.test(channel.name)) return "📚";
  if (channel.room_type === "voice" || /voice/i.test(channel.name)) return "🎤";
  if (/signal/i.test(channel.name)) return "📈";
  return "💬";
}

export default function HubChannelsPage() {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<HubChannel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/c/channels");
        if (!res.ok) return;
        const json = (await res.json()) as { channels: HubChannel[] };
        if (!cancelled) setChannels(json.channels ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      channels.filter(
        (channel) =>
          channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          channel.community_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          channel.space_name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [channels, searchQuery]
  );

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="w-full space-y-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Hash className="h-5 w-5 text-[#fd5000]" />
              Channels
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Discussion rooms across communities you joined
            </p>
          </div>
          <HubLinkButton href="/communities" variant="secondary">
            Back to Feed
          </HubLinkButton>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels or communities…"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-[13px] focus:border-[#fd5000]/40 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <HubCard className="py-10 text-center">
            <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              No channels yet
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Join a community to see its discussion channels here.
            </p>
          </HubCard>
        ) : (
          <div className="space-y-2">
            {filtered.map((channel) => (
              <Link key={channel.id} href={channel.href}>
                <HubCard className="flex items-center gap-3 !p-3.5 transition hover:border-[#fd5000]/30">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fd5000]/10 text-[16px]">
                    {channelEmoji(channel)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-[var(--color-text-primary)]">
                      {channel.name}
                    </p>
                    <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                      {channel.community_name}
                      {channel.space_name ? ` · ${channel.space_name}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                </HubCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
