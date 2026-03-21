import React from "react";
import { createClient } from "@/lib/supabase/server";
import { getCommunitiesSearch, getJoinedCommunities } from "@/services/db";
import { redirect } from "next/navigation";
import { DashboardCommunitiesClient } from "./dashboard-communities-client";

export default async function DashboardCommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const [communities, joined] = await Promise.all([
    getCommunitiesSearch({ search: search || undefined, limit: 24 }),
    getJoinedCommunities(user.id),
  ]);
  const joinedIds = joined.map((c: { id: string }) => c.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Communities</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Discover and join communities to discuss and share.
        </p>
      </div>

      <DashboardCommunitiesClient
        initialCommunities={communities}
        initialJoinedIds={joinedIds}
        searchQuery={search}
        userId={user.id}
      />
    </div>
  );
}
