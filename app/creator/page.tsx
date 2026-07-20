import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatorEarningsNudge } from "@/components/growth/CreatorEarningsNudge";

const modules = [
  ["Digital library", "/creator/digital", "Deliver and download digital products."],
  ["Courses", "/creator/courses", "Build structured learning in communities."],
  ["Learn", "/creator/learn", "Continue courses and track your progress."],
  ["Revenue", "/creator/revenue", "Track earnings across creator channels."],
  ["Payouts", "/creator/payouts", "Manage balances and withdrawals."],
  ["Analytics", "/creator/analytics", "Understand audience and conversion."],
] as const;

export default async function CreatorHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/creator")}`);
  }

  const { data: communities } = await supabase
    .from("communities")
    .select("id, name, slug")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <section>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Creator hub</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Your tools for selling, teaching, and growing.
      </p>

      {(communities?.length ?? 0) > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Your communities
          </h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {communities!.map((community) => (
              <li key={community.id}>
                <Link
                  href={`/creator/${community.id}/dashboard`}
                  className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[#fd5000]"
                >
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {community.name}
                  </span>
                  <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                    Open community studio
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(communities?.length ?? 0) === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
          No community yet.{" "}
          <Link href="/communities/create" className="font-semibold text-[#fd5000]">
            Create one
          </Link>{" "}
          to unlock memberships and live sessions.
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(([title, href, description]) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[#fd5000]"
          >
            <h2 className="font-semibold text-[var(--color-text-primary)]">{title}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
          </Link>
        ))}
      </div>
      <CreatorEarningsNudge />
    </section>
  );
}
