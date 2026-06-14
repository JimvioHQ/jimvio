"use client";



import Link from "next/link";

import {

  Users, Radio, Mic, GraduationCap, Trophy, Calendar, ShieldCheck, Target, FileText,

} from "lucide-react";

import { useWorkspace } from "@/components/community/workspace-context";

import { HubCard, HubLinkButton, HubProgressBar, HubSectionTitle, HubStatCard } from "./hub-ui";



export function HubCommunityOverview() {

  const { communityName, slug, memberCount, avatarUrl, points, overview } = useWorkspace();

  const base = `/c/community/${slug}`;



  const QUICK_LINKS = [

    { icon: Calendar, label: "Community Calendar", href: `${base}` },

    { icon: FileText, label: "Resources", href: `${base}/room` },

    { icon: Target, label: "Missions", href: `/c/missions` },

    { icon: Radio, label: "Live Schedule", href: `${base}/live` },

    { icon: Trophy, label: "Leaderboard", href: `${base}/leaderboard` },

  ];



  return (

    <div className="space-y-4">

      <HubCard className="overflow-hidden !p-0">

        <div className="relative h-36 bg-gradient-to-r from-zinc-900 via-zinc-800 to-[#fd5000]/40 sm:h-44">

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">

            <div className="flex items-center gap-3">

              {avatarUrl ? (

                <img src={avatarUrl} alt={communityName} className="h-14 w-14 rounded-md object-cover ring-2 ring-white" />

              ) : (

                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#fd5000] text-xl font-black text-white">{communityName[0]}</div>

              )}

              <div>

                <div className="flex items-center gap-2">

                  <h1 className="text-[18px] font-black text-white">{communityName}</h1>

                  <ShieldCheck className="h-4 w-4 text-blue-400" />

                </div>

                <p className="text-[11px] text-white/70">Public Community · {(memberCount ?? 0).toLocaleString()} members</p>

              </div>

            </div>

            <HubLinkButton href={`${base}/members`} variant="primary">Invite People</HubLinkButton>

          </div>

        </div>

      </HubCard>



      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">

        <HubStatCard

          label="Members Online"

          value={(overview?.membersOnline ?? 0).toLocaleString()}

          delta={overview?.membersOnlineDelta ?? undefined}

          icon={<Users className="h-4 w-4" />}

          accent="#22c55e"

        />

        <HubStatCard label="Live Now" value={String(overview?.liveNow ?? 0)} icon={<Radio className="h-4 w-4" />} accent="#ef4444" />

        <HubStatCard label="Voice Rooms" value={String(overview?.voiceRooms ?? 0)} icon={<Mic className="h-4 w-4" />} accent="#8b5cf6" />

        <HubStatCard label="Courses" value={String(overview?.courseCount ?? 0)} icon={<GraduationCap className="h-4 w-4" />} />

        <HubStatCard label="Active Rooms" value={String(overview?.activeRoomCount ?? 0)} icon={<Users className="h-4 w-4" />} />

      </div>



      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">

        {QUICK_LINKS.map(({ icon: Icon, label, href }) => (

          <Link key={label} href={href}

            className="flex flex-col items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center transition hover:border-[#fd5000]/30 hover:bg-[#fd5000]/5">

            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#fd5000]/10 text-[#fd5000]"><Icon className="h-4 w-4" /></div>

            <span className="text-[10px] font-semibold leading-tight">{label}</span>

          </Link>

        ))}

      </div>



      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">

        <div className="space-y-4">

          <HubCard>

            <HubSectionTitle title="About" />

            <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">

              {overview?.description ?? `Welcome to ${communityName}! Connect with creators, join live sessions, complete missions, and grow together.`}

            </p>

          </HubCard>



          {(overview?.courses?.length ?? 0) > 0 && (

            <HubCard>

              <div className="mb-3 flex items-center justify-between">

                <HubSectionTitle title="Courses" />

                <Link href={`${base}/courses`} className="text-[11px] font-semibold text-[#fd5000]">View all</Link>

              </div>

              <div className="grid gap-3 sm:grid-cols-3">

                {overview!.courses.map((c) => (

                  <Link key={c.id} href={c.href} className="overflow-hidden rounded-md border border-[var(--color-border)] transition hover:border-[#fd5000]/30">

                    <div className="h-20 bg-gradient-to-br from-[#fd5000]/20 to-zinc-800" />

                    <div className="p-2.5">

                      <p className="text-[11px] font-bold">{c.title}</p>

                      <p className="text-[10px] capitalize text-[var(--color-text-muted)]">{c.difficulty} · {c.total_lessons} lessons</p>

                      <HubProgressBar value={c.progress} max={100} className="mt-2" />

                    </div>

                  </Link>

                ))}

              </div>

            </HubCard>

          )}

        </div>



        <aside className="space-y-4">

          <HubCard>

            <HubSectionTitle title="Community Progress" />

            <p className="text-[20px] font-black">Level {points?.level ?? 1}</p>

            <HubProgressBar

              value={(points?.total_points ?? 0) - (points?.level_start_xp ?? 0)}

              max={Math.max((points?.next_level_xp ?? 1) - (points?.level_start_xp ?? 0), 1)}

              className="mt-2"

            />

            <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">

              {(points?.total_points ?? 0).toLocaleString()} XP total

            </p>

          </HubCard>



          {(overview?.rules?.length ?? 0) > 0 && (

            <HubCard>

              <HubSectionTitle title="Community Guidelines" />

              {overview!.rules.map((r) => (

                <p key={r} className="flex items-center gap-2 py-1 text-[11px]"><ShieldCheck className="h-3 w-3 text-emerald-500" />{r}</p>

              ))}

            </HubCard>

          )}

        </aside>

      </div>

    </div>

  );

}


