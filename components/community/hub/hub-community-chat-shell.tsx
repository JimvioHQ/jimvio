"use client";

import Link from "next/link";
import { CommunityChats } from "@/components/community/community-chats";
import { useWorkspace } from "@/components/community/workspace-context";
import { Pin, Sparkles, TrendingUp, Users, MessageSquare, Heart, BarChart3, Radio, Calendar, Award, Clock, MapPin } from "lucide-react";
import { HubAvatar, HubBadge, HubCard, HubSectionTitle } from "./hub-ui";
import { cn } from "@/lib/utils";

export function HubCommunityChatShell() {
  const { communityName, overview } = useWorkspace();

  return (
    <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[1fr_340px]">
      {/* Chat area */}
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur">
        <div className="border-b border-[var(--color-border)]/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-[15px] font-black text-[var(--color-text-primary)]">
                <MessageSquare className="h-4 w-4 text-[var(--color-accent)]" />
                <span className="text-[var(--color-text-muted)]">#</span> General Chat
              </h1>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                {(overview?.membersOnline ?? 0).toLocaleString()} online · Chat with the {communityName} community
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-3 py-2 text-[11px] font-semibold text-[var(--color-accent)]">
            <Pin className="h-3 w-3 shrink-0" />
            <span className="truncate">Welcome to {communityName}! Be respectful, helpful, and stay active.</span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <CommunityChats />
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="hidden space-y-4 lg:block">
        {/* Community Stats */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Community Stats</h3>
            <HubBadge variant="default">This Week</HubBadge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Messages", value: overview?.messagesThisWeek ?? 0, delta: null, icon: MessageSquare, color: "growth" },
              { label: "Members Online", value: overview?.membersOnline ?? 0, delta: overview?.membersOnlineDelta ?? null, icon: Users, color: "live" },
              { label: "Voice Rooms", value: String(overview?.voiceRooms ?? 0), delta: overview?.voiceRoomsDelta ?? null, icon: Radio, color: "social" },
              { label: "Courses", value: String(overview?.courseCount ?? 0), delta: overview?.courseCountDelta ?? null, icon: GraduationCap, color: "events" },
            ].map(({ label, value, delta, icon: Icon, color }) => (
              <div key={label} className="relative rounded-xl p-3 hover-lift"
                   style={{ background: `var(--color-${color})/5`, border: "1px solid var(--color-border)/20" }}>
                <div className="flex items-center justify-between mb-1">
                  <Icon className="h-3.5 w-3.5" style={{ color: `var(--color-${color})` }} />
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                <p className="text-[18px] font-black text-[var(--color-text-primary)]">{value.toLocaleString()}</p>
                {delta && <p className="text-[10px] font-semibold text-emerald-500">{delta}</p>}
              </div>
            ))}
          </div>

          {/* Activity sparkline */}
          <div className="mt-3 flex h-16 items-end gap-1">
            {[40, 55, 35, 70, 50, 65, 80].map((h, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: "var(--color-accent)/20" }} />
            ))}
          </div>
        </div>

        {/* AI Community Insights */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">AI Community Insights</h3>
            <HubBadge variant="default">Beta</HubBadge>
          </div>
          <div className="space-y-2 text-[11px] text-[var(--color-text-secondary)]">
            <p className="flex gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
              Engagement is up this week — keep the conversation going.
            </p>
            <p className="flex gap-2">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {(overview?.membersOnline ?? 0).toLocaleString()} members active now across spaces.
            </p>
          </div>
        </div>

        {/* Active Now */}
        {(overview?.activeMembers?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <h3 className="mb-3 text-[13px] font-black text-[var(--color-text-primary)]">Active Now</h3>
            {overview!.activeMembers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.name} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-[10px] font-bold text-[var(--color-accent)]">
                      {u.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">{u.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{u.status}</p>
                  </div>
                </div>
                <HubBadge variant="live">ACTIVE</HubBadge>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Events */}
        {(overview?.upcomingEvents?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <h3 className="mb-3 text-[13px] font-black text-[var(--color-text-primary)]">Upcoming Events</h3>
            {overview!.upcomingEvents.map((ev) => {
              const date = new Date(ev.start_date);
              return (
                <div key={ev.id} className="flex items-center justify-between border-t border-[var(--color-border)]/30 py-2 first:border-0">
                  <div>
                    <span className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-wider">
                      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">{ev.title}</p>
                  </div>
                  <Link href={ev.href} className="rounded-md bg-[var(--color-accent)]/10 px-2 py-1 text-[10px] font-bold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20">
                    View
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Community Stats */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Community Stats</h3>
            <HubLinkButton href="/c/analytics" variant="ghost" size="sm">View all</HubLinkButton>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Messages", value: overview?.messagesThisWeek ?? 0, icon: MessageSquare, color: "growth" },
              { label: "Engagement", value: overview?.engagementRate ?? 0, icon: Heart, color: "live" },
              { label: "Communities", value: overview?.communitiesJoined ?? 0, icon: Users, color: "events" },
              { label: "Live sessions", value: overview?.liveSessions ?? 0, icon: Radio, color: "social" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="relative rounded-xl p-3 hover-lift"
                   style={{ background: `var(--color-${color})/5`, border: "1px solid var(--color-border)/20" }}>
                <div className="flex items-center justify-between mb-1">
                  <Icon className="h-3.5 w-3.5" style={{ color: `var(--color-${color})` }} />
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                <p className="text-[18px] font-black text-[var(--color-text-primary)]">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Mini bar chart */}
          <div className="mt-3 flex h-16 items-end gap-1">
            {[40, 55, 35, 70, 50, 65, 80].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-[var(--color-accent)]/20" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* AI Community Insights */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">AI Community Insights</h3>
            <HubBadge variant="default">Beta</HubBadge>
          </div>
          <div className="space-y-2 text-[11px] text-[var(--color-text-secondary)]">
            <p className="flex gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
              Engagement is up this week — keep the conversation going.
            </p>
            <p className="flex gap-2">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {(overview?.membersOnline ?? 0).toLocaleString()} members active now across spaces.
            </p>
          </div>
        </div>

        {/* Active Now */}
        {(overview?.activeMembers?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <h3 className="mb-3 text-[13px] font-black text-[var(--color-text-primary)]">Active Now</h3>
            {overview!.activeMembers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.name} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-[10px] font-bold text-[var(--color-accent)]">
                      {u.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">{u.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{u.status}</p>
                  </div>
                </div>
                <HubBadge variant="live">ACTIVE</HubBadge>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Events */}
        {(overview?.upcomingEvents?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <h3 className="mb-3 text-[13px] font-black text-[var(--color-text-primary)]">Upcoming Events</h3>
            {overview!.upcomingEvents.map((ev) => {
              const date = new Date(ev.start_date);
              return (
                <div key={ev.id} className="flex items-center justify-between border-t border-[var(--color-border)]/30 py-2 first:border-0">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)]">
                      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">{ev.title}</p>
                  </div>
                  <Link href={ev.href} className="rounded-md bg-[var(--color-accent)]/10 px-2 py-1 text-[10px] font-bold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20">
                    View
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}