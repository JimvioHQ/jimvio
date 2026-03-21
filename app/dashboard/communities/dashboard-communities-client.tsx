"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Search, UserPlus, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { joinCommunity, leaveCommunity } from "@/lib/actions/community";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Community = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatar_url?: string | null;
  category?: string | null;
  member_count?: number | null;
  post_count?: number | null;
  is_private?: boolean | null;
  is_featured?: boolean | null;
};

export function DashboardCommunitiesClient({
  initialCommunities,
  initialJoinedIds,
  searchQuery,
  userId,
}: {
  initialCommunities: Community[];
  initialJoinedIds: string[];
  searchQuery: string;
  userId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery);
  const [memberships, setMemberships] = useState<Set<string>>(() => new Set(initialJoinedIds));
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    router.push(`/dashboard/communities${params.toString() ? `?${params}` : ""}`);
  };

  const toggleJoin = (communityId: string, isMember: boolean) => {
    startTransition(async () => {
      const action = isMember ? leaveCommunity : joinCommunity;
      const res = await action(communityId);
      if (res.success) {
        setMemberships((prev) => {
          const next = new Set(prev);
          if (isMember) next.delete(communityId);
          else next.add(communityId);
          return next;
        });
        router.refresh();
        toast.success(isMember ? "Left community" : "Joined community");
      } else toast.error(res.error ?? "Failed");
    });
  };

  return (
    <>
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search communities..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
          />
        </div>
        <Button type="submit" variant="outline" className="rounded-xl shrink-0">
          Search
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialCommunities.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <Users className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
            <p className="font-medium text-[var(--color-text-primary)]">No communities found</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {searchQuery ? "Try a different search." : "Communities will appear here."}
            </p>
          </div>
        ) : (
          initialCommunities.map((c) => {
            const isMember = memberships.has(c.id);
            return (
              <Card
                key={c.id}
                className="rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-6 w-6 text-[var(--color-accent)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[var(--color-text-primary)] truncate">{c.name}</h3>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {(c.member_count ?? 0).toLocaleString()} members
                        </p>
                      </div>
                    </div>
                    {c.description && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-3 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="px-5 pb-5 flex gap-2">
                    <Link href={`/communities/${c.slug}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-xl">
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant={isMember ? "outline" : "default"}
                      className={cn(
                        "rounded-xl shrink-0 min-w-[100px]",
                        isMember ? "" : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]"
                      )}
                      disabled={isPending}
                      onClick={() => toggleJoin(c.id, isMember)}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isMember ? (
                        <>
                          <LogOut className="h-3.5 w-3.5 mr-1" /> Leave
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Join
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
