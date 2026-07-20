"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function MembershipUpgradeNudge() {
  const [community, setCommunity] = useState<{ slug: string; name: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async (result: { data: { user: { id: string } | null } }) => {
      const user = result.data.user;
      if (!user) return;
      const { data } = await supabase
        .from("communities")
        .select("slug, name")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setCommunity(data);
    });
  }, []);

  if (!community) return null;
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Upgrade members</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Add membership tiers to {community.name} and turn your community into recurring revenue.
      </p>
      <Link href={`/communities/${community.slug}/memberships`} className="mt-3 inline-flex text-xs font-semibold text-[#fd5000]">
        Manage memberships →
      </Link>
    </section>
  );
}
