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
  niche: unknown;
  bio: string | null;
  profile_image: string | null;
  total_followers: number | null;
  is_verified: boolean | null;
};

function normalizeNiche(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const labels = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return labels.length ? [...new Set(labels)].join(" · ") : null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["label", "name", "value"]) {
      if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
    }
  }
  return null;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString("en-US");
}

function browseHref(niche: string | null, query: string, page = 1): string {
  const params = new URLSearchParams();
  if (niche) params.set("niche", niche);
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? "/influencers/browse?" + search : "/influencers/browse";
}

export default async function InfluencersBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ niche?: string; q?: string; page?: string }>;
}) {
  const { niche: nicheParam, q: queryParam = "", page: pageParam } = await searchParams;
  const searchQuery = queryParam.trim().slice(0, 80).toLowerCase();
  const admin = getAdminDB();
  const { data, error: creatorError } = await admin
    .from("influencers")
    .select("id, user_id, display_name, niche, bio, profile_image, total_followers, is_verified")
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("total_followers", { ascending: false })
    .limit(120);

  const all = ((data ?? []) as CreatorRow[])
    .map((c) => ({ ...c, niche: normalizeNiche(c.niche) }))
    .filter((c) => c.display_name?.trim());
  const { data: seats } = await (admin as unknown as {
    from: (t: string) => { select: (c: string) => Promise<{ data: { user_id: string; seat_number: number }[] | null }> };
  })
    .from("founding_creators")
    .select("user_id, seat_number");
  const seatByUser = new Map((seats ?? []).map((r) => [r.user_id, r.seat_number]));
  // Niche chips come from real profiles only.
  const niches = [...new Set(all.map((c) => c.niche?.trim()).filter(Boolean) as string[])].sort();
  const activeNiche = nicheParam && niches.includes(nicheParam) ? nicheParam : null;
  const byNiche = activeNiche ? all.filter((c) => c.niche?.trim() === activeNiche) : all;
  const filtered = searchQuery
    ? byNiche.filter((creator) =>
        [creator.display_name, creator.niche, creator.bio]
          .some((value) => typeof value === "string" && value.toLowerCase().includes(searchQuery)),
      )
    : byNiche;
  const pageSize = 24;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageNumber = Math.min(pageCount, Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1));
  const creators = filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

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
        <form action="/influencers/browse" className="mb-6 flex max-w-xl gap-2">
          {activeNiche ? <input type="hidden" name="niche" value={activeNiche} /> : null}
          <label className="sr-only" htmlFor="creator-search">Search creators</label>
          <input id="creator-search" name="q" defaultValue={queryParam} maxLength={80} placeholder="Search creators, niches or bios" className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text-primary)] outline-none focus:border-[#fd5000]" />
          <button type="submit" className="rounded-xl bg-[#fd5000] px-5 text-sm font-semibold text-white hover:bg-[#e04800]">Search</button>
        </form>
        {niches.length > 0 ? (
          <nav aria-label="Filter by niche" className="mb-8 flex gap-2 overflow-x-auto pb-1">
            <Link
              href={browseHref(null, searchQuery)}
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
                href={browseHref(n, searchQuery)}
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

        {creatorError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
            <p className="text-lg font-bold text-red-800">Creators could not be loaded</p>
            <p className="mt-2 text-sm text-red-700">Please refresh the page and try again.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
            <p className="text-lg font-bold text-[var(--color-text-primary)]">No creators here yet</p>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-[var(--color-text-secondary)]">
              Try another search or clear the niche filter to see more creators.
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
        {pageCount > 1 ? (
          <nav aria-label="Creator pages" className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <Link
                key={page}
                href={browseHref(activeNiche, searchQuery, page)}
                aria-current={page === pageNumber ? "page" : undefined}
                className={page === pageNumber
                  ? "grid h-9 min-w-9 place-items-center rounded-full bg-[#111827] px-3 text-xs font-bold text-white"
                  : "grid h-9 min-w-9 place-items-center rounded-full border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-text-primary)]"}
              >
                {page}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
