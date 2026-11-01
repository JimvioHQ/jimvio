import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, Sparkles, UserPlus } from "lucide-react";
import { getAdminDB } from "@/services/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { constructMetadata } from "@/lib/seo";
import { FoundingBadge } from "@/components/founding/FoundingBadge";

export const revalidate = 300;

export const metadata: Metadata = constructMetadata({
  title: "Popular Users on Jimvio",
  description: "Discover the people building, creating and connecting on Jimvio.",
  path: "/users/browse",
});

type PublicUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
};

export default async function PopularUsersPage() {
  const admin = getAdminDB();
  const verifiedIds: string[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data: authResult, error: authError } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (authError) {
      console.error("[users/browse] Could not load verified accounts:", authError.message);
      break;
    }
    const batch = authResult?.users ?? [];
    verifiedIds.push(...batch.filter((user) => Boolean(user.email_confirmed_at)).map((user) => user.id));
    if (batch.length < 1000) break;
  }

  let users: PublicUser[] = [];
  if (verifiedIds.length) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio, is_verified")
      .in("id", verifiedIds)
      .not("username", "is", null)
      .not("full_name", "is", null)
      .or("is_active.is.null,is_active.eq.true")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[users/browse] Could not load public profiles:", error.message);
    } else {
      users = (data ?? [])
        .filter((profile) => typeof profile.full_name === "string" && profile.full_name.trim().length > 1)
        .map((profile) => ({
          id: profile.id,
          username: String(profile.username ?? ""),
          full_name: String(profile.full_name ?? "").trim(),
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          is_verified: Boolean(profile.is_verified),
        }));
    }
  }

  const { data: seats } = await (admin as unknown as {
    from: (table: string) => { select: (columns: string) => Promise<{ data: { user_id: string; seat_number: number }[] | null }> };
  }).from("founding_creators").select("user_id, seat_number");
  const seatByUser = new Map((seats ?? []).map((seat) => [seat.user_id, seat.seat_number]));

  return (
    <div className="min-h-screen bg-[var(--color-bg,#fff)]">
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-28 sm:px-6">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#fd5000]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#fd5000]">
            <Sparkles className="h-3 w-3" /> Community
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Popular Users on Jimvio
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            Meet real people who have joined Jimvio to create, build communities, discover opportunities and connect with others.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full bg-[#fd5000] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#e04800]">
              <UserPlus className="h-4 w-4" /> Join Jimvio
            </Link>
            <Link href="/founding-creators" className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-[13px] font-semibold text-amber-800 hover:bg-amber-100">
              Founding Creators
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6" aria-label="Popular users">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
            <p className="text-lg font-bold text-[var(--color-text-primary)]">No public users to show yet</p>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-[var(--color-text-secondary)]">Verified members with a completed public profile will appear here.</p>
          </div>
        ) : (
          <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {users.map((user) => (
              <li key={user.id}>
                <Link href={`/u/${encodeURIComponent(user.username)}`} className="flex h-full min-h-[184px] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[#fd5000]/40 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={user.avatar_url ?? undefined} alt="" />
                      <AvatarFallback className="bg-[#fd5000]/10 text-lg font-bold text-[#fd5000]">{user.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate text-[15px] font-bold text-[var(--color-text-primary)]">
                        <span className="truncate">{user.full_name}</span>
                        {user.is_verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" aria-label="Verified profile" /> : null}
                      </p>
                      <p className="truncate text-[12px] text-[var(--color-text-muted)]">@{user.username}</p>
                      {seatByUser.get(user.id) ? <FoundingBadge seat={seatByUser.get(user.id)!} compact className="mt-1" /> : null}
                    </div>
                  </div>
                  {user.bio ? <p className="mt-3 line-clamp-2 text-[13px] text-[var(--color-text-secondary)]">{user.bio}</p> : null}
                  <div className="mt-auto flex justify-end pt-4 text-[12px] font-semibold text-[#fd5000]">View profile →</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
