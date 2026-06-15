"use client";

import Link from "next/link";
import { CommunityChats } from "@/components/community/community-chats";
import { useWorkspace } from "@/components/community/workspace-context";
import { Users, TrendingUp } from "lucide-react";
import { HubBadge, HubCard, HubSectionTitle, HubStatCard } from "./hub-ui";

export function HubCommunityChatShell() {
  const { communityName, overview } = useWorkspace();

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_280px]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-[15px] font-bold">
                <span className="text-[var(--color-text-muted)]">#</span> General Chat
              </h1>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {(overview?.membersOnline ?? 0).toLocaleString()} online · Chat with the {communityName} community
              </p>
            </div>
          </div>
          <div className="mt-2 rounded-md border border-[#fd5000]/20 bg-[#fd5000]/5 px-3 py-2 text-[11px] font-semibold text-[#fd5000]">
            Welcome to {communityName}! Be respectful, helpful, and stay active.
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <CommunityChats />
        </div>
      </div>

      <aside className="hidden space-y-4 lg:block">
        <HubCard>
          <HubSectionTitle title="Community Stats" badge="This Week" />
          <div className="grid grid-cols-2 gap-2">
            <HubStatCard
              label="Messages"
              value={(overview?.messagesThisWeek ?? 0).toLocaleString()}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            <HubStatCard
              label="Online"
              value={(overview?.membersOnline ?? 0).toLocaleString()}
              icon={<Users className="h-3.5 w-3.5" />}
            />
          </div>
        </HubCard>

        {(overview?.activeMembers?.length ?? 0) > 0 && (
          <HubCard>
            <HubSectionTitle title="Active Now" />
            {overview!.activeMembers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.name} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fd5000]/15 text-[10px] font-bold text-[#fd5000]">
                      {u.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold">{u.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{u.status}</p>
                  </div>
                </div>
                <HubBadge variant="live">ACTIVE</HubBadge>
              </div>
            ))}
          </HubCard>
        )}

        {(overview?.upcomingEvents?.length ?? 0) > 0 && (
          <HubCard>
            <HubSectionTitle title="Upcoming Events" />
            {overview!.upcomingEvents.map((ev) => {
              const date = new Date(ev.start_date);
              return (
                <div key={ev.id} className="flex items-center justify-between border-t border-[var(--color-border)] py-2 first:border-0">
                  <div>
                    <span className="text-[10px] font-black text-[#fd5000]">
                      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()}
                    </span>
                    <p className="text-[11px] font-semibold">{ev.title}</p>
                  </div>
                  <Link href={ev.href} className="rounded-md bg-[#fd5000]/10 px-2 py-1 text-[10px] font-bold text-[#fd5000]">
                    View
                  </Link>
                </div>
              );
            })}
          </HubCard>
        )}
      </aside>
    </div>
  );
}

