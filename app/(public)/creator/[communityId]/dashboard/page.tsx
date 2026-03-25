import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCommunityOwner } from "@/lib/creator-server";
import { CreatorRevenueChart, CreatorSettingsButton } from "@/components/community/creator/CreatorDashboardClient";
import { cn, formatDisplayMoney } from "@/lib/utils";

export const metadata = {
  title: "Creator dashboard",
};

export default async function CreatorDashboardPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const community = await requireCommunityOwner(supabase, user.id, communityId);

  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);

  const { data: payments } = await supabase
    .from("community_payments")
    .select("creator_earnings, created_at, status")
    .eq("community_id", communityId)
    .eq("status", "completed")
    .gte("created_at", thirtyAgo.toISOString())
    .order("created_at", { ascending: true });

  const byDay = new Map<string, number>();
  for (const p of payments ?? []) {
    const d = new Date(p.created_at).toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + Number(p.creator_earnings ?? 0));
  }
  const chartData: { date: string; amount: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    chartData.push({ date: key.slice(5), amount: byDay.get(key) ?? 0 });
  }

  const { data: allPay } = await supabase
    .from("community_payments")
    .select("creator_earnings")
    .eq("community_id", communityId)
    .eq("status", "completed");

  const lifetime = (allPay ?? []).reduce((s, p) => s + Number(p.creator_earnings ?? 0), 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: monthPay } = await supabase
    .from("community_payments")
    .select("creator_earnings")
    .eq("community_id", communityId)
    .eq("status", "completed")
    .gte("created_at", monthStart.toISOString());
  const monthlyRev = (monthPay ?? []).reduce((s, p) => s + Number(p.creator_earnings ?? 0), 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: activeWeek } = await supabase
    .from("member_points")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId)
    .gte("last_active_at", weekAgo.toISOString());

  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, name, icon, access_type, room_count, member_count, sort_order")
    .eq("community_id", communityId)
    .eq("is_active", true)
    .order("sort_order");

  const { data: recentMembers } = await supabase
    .from("community_memberships")
    .select("user_id, plan_type, created_at, profiles(full_name, avatar_url, username)")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(5);

  const dayAgo = new Date();
  dayAgo.setDate(dayAgo.getDate() - 1);
  const { count: posts24 } = await supabase
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId)
    .gte("created_at", dayAgo.toISOString());

  const { count: msg24 } = await supabase
    .from("community_messages")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId)
    .gte("created_at", dayAgo.toISOString());

  const { data: taskRooms } = await supabase.from("community_tasks").select("id").eq("community_id", communityId);
  const taskIds = (taskRooms ?? []).map((t) => t.id);
  let taskCount = 0;
  if (taskIds.length) {
    const { count } = await supabase
      .from("task_completions")
      .select("id", { count: "exact", head: true })
      .in("task_id", taskIds)
      .gte("created_at", dayAgo.toISOString());
    taskCount = count ?? 0;
  }

  const memberTotal = community.member_count ?? 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
            {community.avatar_url ? (
              <Image src={community.avatar_url} alt="" width={56} height={56} className="object-cover h-full w-full" unoptimized />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-lg font-black text-[var(--color-accent)]">{community.name[0]}</div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--color-text-primary)]">{community.name}</h1>
            <div className="flex flex-wrap gap-3 mt-1">
              <Link href={`/communities/${community.slug}/workspace`} className="text-sm font-bold text-[var(--color-accent)] hover:underline">
                View Community
              </Link>
            </div>
          </div>
        </div>
        <CreatorSettingsButton communityId={communityId} />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: memberTotal.toLocaleString(), sub: "+ vs last month", tone: "text-[var(--color-success)]" },
          { label: "Monthly Revenue", value: formatDisplayMoney(monthlyRev, community.currency || "USD"), sub: "This calendar month", tone: "text-[var(--color-text-muted)]" },
          { label: "Active This Week", value: String(activeWeek ?? 0), sub: "Members (activity)", tone: "text-[var(--color-text-muted)]" },
          { label: "Total Earnings", value: formatDisplayMoney(lifetime, community.currency || "USD"), sub: "Lifetime (after commission)", tone: "text-[var(--color-text-muted)]" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{c.label}</p>
            <p className="text-2xl font-black text-[var(--color-text-primary)] mt-1">{c.value}</p>
            <p className={cn("text-xs mt-1 font-semibold", c.tone)}>{c.sub}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-4">Daily earnings (30 days)</h2>
        <CreatorRevenueChart data={chartData} />
      </section>

      <section>
        <h2 className="text-lg font-black text-[var(--color-text-primary)] mb-3">Spaces</h2>
        <div className="space-y-2">
          {(spaces ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-6 text-center border border-dashed border-[var(--color-border)] rounded-2xl">No spaces yet.</p>
          ) : (
            (spaces ?? []).map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{s.icon || "·"}</span>
                  <span className="font-bold text-[var(--color-text-primary)] truncate">{s.name}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">{s.access_type}</span>
                </div>
                <div className="text-xs text-[var(--color-text-muted)] font-semibold">
                  {s.room_count ?? 0} rooms · {s.member_count ?? 0} in space
                </div>
                <Link
                  href={`/creator/${communityId}/spaces`}
                  className="text-xs font-black text-[var(--color-accent)] px-3 py-1.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-accent-light)]"
                >
                  Manage
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-[var(--color-text-primary)]">Recent members</h2>
            <Link href={`/creator/${communityId}/members`} className="text-xs font-bold text-[var(--color-accent)]">
              View all
            </Link>
          </div>
          <ul className="space-y-3">
            {(recentMembers ?? []).map((m: { user_id: string; plan_type: string | null; created_at: string | null; profiles: unknown }) => {
              const prof = m.profiles as { full_name: string | null; avatar_url: string | null; username: string | null } | null;
              return (
                <li key={m.user_id} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                    {prof?.avatar_url ? (
                      <Image src={prof.avatar_url} alt="" width={36} height={36} className="object-cover h-full w-full" unoptimized />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-black text-[var(--color-accent)]">
                        {(prof?.full_name || prof?.username || "?")[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{prof?.full_name || prof?.username || "Member"}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {m.plan_type} · {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
          <h2 className="text-lg font-black text-[var(--color-text-primary)] mb-4">Recent activity (24h)</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">New posts</span>
              <span className="font-black text-[var(--color-text-primary)]">{posts24 ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">New messages</span>
              <span className="font-black text-[var(--color-text-primary)]">{msg24 ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Task completions</span>
              <span className="font-black text-[var(--color-text-primary)]">{taskCount}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
