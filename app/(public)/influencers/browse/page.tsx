import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, Sparkles, UserPlus, Users } from "lucide-react";
import { getAdminDB } from "@/services/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { constructMetadata } from "@/lib/seo";
import { FoundingBadge } from "@/components/founding/FoundingBadge";

export const revalidate = 300;

export const metadata: Metadata = constructMetadata({
  title: "Creators on Jimvio",
  description: "Browse the creators who have joined Jimvio and open their profiles.",
  path: "/influencers/browse",
});

type CreatorRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  niche: string | null;
  bio: string | null;
  profile_image: string | null;
  total_followers: number | null;
  is_verified: boolean | null;
};

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString("en-US");
}

export default async function InfluencersBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ niche?: string }>;
}) {
  const { niche: nicheParam } = await searchParams;
  const admin = getAdminDB();
  const { data } = await admin
    .from("influencers")
    .select("id, user_id, display_name, niche, bio, profile_image, total_followers, is_verified")
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("total_followers", { ascending: false })
    .limit(120);

  const all = ((data ?? []) as CreatorRow[]).filter((c) => c.display_name?.trim());
  const { data: seats } = await (admin as unknown as {
    from: (t: string) => { select: (c: string) => Promise<{ data: { user_id: string; seat_number: number }[] | null }> };
  })
    .from("founding_creators")
    .select("user_id, seat_number");
  const seatByUser = new Map((seats ?? []).map((r) => [r.user_id, r.seat_number]));
  // Niche chips come from real profiles only.
  const niches = [...new Set(all.map((c) => c.niche?.trim()).filter(Boolean) as string[])].sort();
  const activeNiche = nicheParam && niches.includes(nicheParam) ? nicheParam : null;
  const creators = activeNiche ? all.filter((c) => c.niche?.trim() === activeNiche) : all;

  return (
    <div className="min-h-screen bg-[var(--color-bg,#fff)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-28 sm:px-6">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#fd5000]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#fd5000]">
            <Sparkles className="h-3 w-3" /> Creators
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Creators on Jimvio
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            Real people who joined Jimvio to create content, run communities and work with brands. Follower
            counts come from each creator&apos;s own profile.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
              <Users className="h-4 w-4 text-[var(--color-text-muted)]" />
              {all.length.toLocaleString("en-US")} {all.length === 1 ? "creator" : "creators"}
            </span>
            <Link
              href="/activate/influencer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#fd5000] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#e04800]"
            >
              <UserPlus className="h-4 w-4" /> Join as a creator
            </Link>
            <Link
              href="/founding-creators"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-[13px] font-semibold text-amber-800 hover:bg-amber-100"
            >
              Founding Creators
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        {niches.length > 0 ? (
          <nav aria-label="Filter by niche" className="mb-8 flex gap-2 overflow-x-auto pb-1">
            <Link
              href="/influencers/browse"
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold ${
                !activeNiche
                  ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                  : "border border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }`}
            >
              All
            </Link>
            {niches.map((n) => (
              <Link
                key={n}
                href={`/influencers/browse?niche=${encodeURIComponent(n)}`}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold ${
                  activeNiche === n
                    ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                    : "border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                }`}
              >
                {n}
              </Link>
            ))}
          </nav>
        ) : null}

        {creators.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
            <p className="text-lg font-bold text-[var(--color-text-primary)]">No creators here yet</p>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-[var(--color-text-secondary)]">
              Be one of the first creators on Jimvio — set up your profile and start working with brands.
            </p>
            <Link
              href="/activate/influencer"
              className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#fd5000] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#e04800]"
            >
              <UserPlus className="h-4 w-4" /> Join as a creator
            </Link>
          </div>
        ) : (
          <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {creators.map((c) => {
              const followers = Number(c.total_followers ?? 0);
              return (
                <li key={c.id}>
                  <Link
                    href={`/influencers/u/${c.user_id}`}
                    className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[#fd5000]/40 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={c.profile_image ?? undefined} alt="" />
                        <AvatarFallback className="bg-[#fd5000]/10 text-lg font-bold text-[#fd5000]">
                          {c.display_name?.trim().charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate text-[15px] font-bold text-[var(--color-text-primary)]">
                          <span className="truncate">{c.display_name}</span>
                          {c.is_verified ? (
                            <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" aria-label="Verified creator" />
                          ) : null}
                        </p>
                        {c.niche ? (
                          <p className="truncate text-[12px] text-[var(--color-text-muted)]">{c.niche}</p>
                        ) : null}
                        {seatByUser.get(c.user_id) ? (
                          <FoundingBadge seat={seatByUser.get(c.user_id)!} compact className="mt-1" />
                        ) : null}
                      </div>
                    </div>
                    {c.bio ? (
                      <p className="mt-3 line-clamp-2 text-[13px] text-[var(--color-text-secondary)]">{c.bio}</p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-4 text-[12px]">
                      <span className="text-[var(--color-text-muted)]">
                        {followers > 0 ? `${formatFollowers(followers)} followers` : "New creator"}
                      </span>
                      <span className="font-semibold text-[#fd5000]">View profile →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
