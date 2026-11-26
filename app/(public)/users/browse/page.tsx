import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, BriefcaseBusiness, Building2, Globe2, Search, Users, Video } from "lucide-react";
import { getAdminDB } from "@/services/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { constructMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = constructMetadata({
  title: "People on Jimvio",
  description: "Discover real people on Jimvio — creators, community builders, affiliates, brands and members. Open their public profiles.",
  path: "/users/browse",
});

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  country: string | null;
  language: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  follower_count: number | null;
};

type IdentityRow = {
  user_id: string;
  headline: string | null;
  skills: string[] | null;
  specialties: string[] | null;
  industries: string[] | null;
  privacy_visibility: string | null;
};

type MemberCard = ProfileRow & {
  headline: string | null;
  specialties: string[];
  roles: string[];
};

const PAGE_SIZE = 24;

function safeQuery(value: string): string {
  return value.trim().slice(0, 80).replace(/[,%()]/g, " ").replace(/\\s+/g, " ");
}

function pageHref(page: number, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/users/browse?${suffix}` : "/users/browse";
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\\.0$/, "")}K`;
  return value.toLocaleString("en-US");
}

function formatJoinedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `Joined ${new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date)}`;
}

function roleLabel(role: string): string {
  if (role === "creator") return "Creator";
  if (role === "community") return "Community builder";
  if (role === "brand") return "Brand";
  if (role === "affiliate") return "Affiliate";
  return "Member";
}

export default async function UsersBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const queryText = safeQuery(params.q ?? "");
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const admin = getAdminDB();

  let query = admin
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, website, country, language, is_verified, created_at, follower_count", { count: "exact" })
    .or("is_active.is.null,is_active.eq.true")
    .not("email", "ilike", "%@removed.jimvio")
    .not("email", "ilike", "editorial+%@jimvio.com")
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true });

  if (queryText) {
    const term = `%${queryText}%`;
    query = query.or(`full_name.ilike.${term},username.ilike.${term},bio.ilike.${term},country.ilike.${term}`);
  }

  const from = (requestedPage - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  const profiles = (data ?? []) as ProfileRow[];
  const userIds = profiles.map((profile) => profile.id);

  const [identityResult, influencerResult, vendorResult, affiliateResult, communityResult] = userIds.length
    ? await Promise.all([
        admin.from("jip_identity").select("user_id, headline, skills, specialties, industries, privacy_visibility").in("user_id", userIds),
        admin.from("influencers").select("user_id").eq("is_active", true).in("user_id", userIds),
        admin.from("vendors").select("user_id").eq("is_active", true).in("user_id", userIds),
        admin.from("affiliates").select("user_id").eq("is_active", true).in("user_id", userIds),
        admin.from("communities").select("owner_id").in("owner_id", userIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const identities = new Map<string, IdentityRow>(
    ((identityResult.data ?? []) as IdentityRow[]).map((row) => [row.user_id, row]),
  );
  const creators = new Set((influencerResult.data ?? []).map((row: { user_id: string }) => row.user_id));
  const brands = new Set((vendorResult.data ?? []).map((row: { user_id: string }) => row.user_id));
  const affiliates = new Set((affiliateResult.data ?? []).map((row: { user_id: string }) => row.user_id));
  const communityBuilders = new Set((communityResult.data ?? []).map((row: { owner_id: string }) => row.owner_id));

  const members: MemberCard[] = profiles
    .filter((profile) => {
      const visibility = identities.get(profile.id)?.privacy_visibility ?? "public";
      return visibility === "public";
    })
    .map((profile) => {
      const identity = identities.get(profile.id);
      const roles: string[] = [];
      if (creators.has(profile.id)) roles.push("creator");
      if (communityBuilders.has(profile.id)) roles.push("community");
      if (brands.has(profile.id)) roles.push("brand");
      if (affiliates.has(profile.id)) roles.push("affiliate");
      if (!roles.length) roles.push("member");
      const specialties = [...(identity?.specialties ?? []), ...(identity?.skills ?? [])]
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .slice(0, 3);
      return { ...profile, headline: identity?.headline ?? null, specialties, roles };
    });

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, pageCount);

  return (
    <main className="min-h-screen bg-[var(--color-bg,#fff)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[1200px] px-4 pb-9 pt-28 sm:px-6">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#fd5000]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#fd5000]">
            <Users className="h-3.5 w-3.5" /> Jimvio community
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            People on Jimvio
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            Real people who joined Jimvio to create content, run communities and work with brands.
            Discover every public member profile — not only people registered as creators.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
              <Users className="h-4 w-4 text-[var(--color-text-muted)]" />
              {total.toLocaleString("en-US")} {total === 1 ? "member" : "members"}
            </span>
            <span className="text-[12px] text-[var(--color-text-muted)]">Creators · Community builders · Affiliates · Brands · Members</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <form action="/users/browse" method="get" className="mb-7 flex max-w-2xl gap-2">
          <label htmlFor="member-search" className="sr-only">Search people</label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              id="member-search"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              maxLength={80}
              placeholder="Search by name, username, bio or country"
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none focus:border-[#fd5000]"
            />
          </div>
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#fd5000] px-5 text-sm font-semibold text-white transition hover:bg-[#e44800]">
            Search
          </button>
        </form>

        {error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
            <p className="text-lg font-bold text-red-800">People could not be loaded</p>
            <p className="mt-2 text-sm text-red-700">Please refresh the page and try again.</p>
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
            <p className="text-lg font-bold text-[var(--color-text-primary)]">No matching people found</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">Try another name or clear your search to discover more Jimvio members.</p>
            {queryText ? <Link href="/users/browse" className="mt-5 inline-flex text-sm font-semibold text-[#fd5000]">Clear search</Link> : null}
          </div>
        ) : (
          <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((member) => {
              const displayName = member.full_name?.trim() || (member.username ? `@${member.username}` : "Jimvio member");
              const profileHref = member.username
                ? `/u/${encodeURIComponent(member.username)}`
                : `/members/${member.id}`;
              const joined = formatJoinedAt(member.created_at);
              const followers = Number(member.follower_count ?? 0);
              return (
                <li key={member.id}>
                  <Link
                    href={profileHref}
                    className="group flex h-full min-h-[218px] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[#fd5000]/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-14 w-14 shrink-0">
                        <AvatarImage src={member.avatar_url ?? undefined} alt={displayName} />
                        <AvatarFallback className="bg-[#fd5000]/10 text-lg font-bold text-[#fd5000]">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 text-[15px] font-bold text-[var(--color-text-primary)]">
                          <span className="truncate">{displayName}</span>
                          {member.is_verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" aria-label="Verified" /> : null}
                        </p>
                        {member.username ? <p className="truncate text-[12px] text-[var(--color-text-muted)]">@{member.username}</p> : null}
                        {member.country ? <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]"><Globe2 className="h-3 w-3" />{member.country}</p> : null}
                      </div>
                    </div>

                    {member.headline ? <p className="mt-4 line-clamp-2 text-[13px] font-semibold text-[var(--color-text-primary)]">{member.headline}</p> : null}
                    {member.bio ? <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{member.bio}</p> : null}

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {member.roles.map((role) => (
                        <span key={role} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                          {role === "creator" ? <Video className="h-3 w-3" /> : role === "brand" ? <Building2 className="h-3 w-3" /> : role === "community" ? <Users className="h-3 w-3" /> : role === "affiliate" ? <BriefcaseBusiness className="h-3 w-3" /> : null}
                          {roleLabel(role)}
                        </span>
                      ))}
                      {member.specialties.map((specialty) => <span key={specialty} className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] text-[var(--color-text-muted)]">{specialty}</span>)}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-[11px]">
                      <span className="text-[var(--color-text-muted)]">{followers > 0 ? `${formatCount(followers)} followers` : joined ?? "Jimvio member"}</span>
                      <span className="shrink-0 font-semibold text-[#fd5000] group-hover:underline">View profile →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {pageCount > 1 ? (
          <nav aria-label="People pages" className="mt-9 flex items-center justify-center gap-2">
            {currentPage > 1 ? <Link href={pageHref(currentPage - 1, queryText)} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">Previous</Link> : null}
            <span className="px-3 text-sm text-[var(--color-text-muted)]">Page {currentPage} of {pageCount}</span>
            {currentPage < pageCount ? <Link href={pageHref(currentPage + 1, queryText)} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">Next</Link> : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
