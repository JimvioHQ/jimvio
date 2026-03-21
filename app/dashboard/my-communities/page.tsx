import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getJoinedCommunitiesWithRecentPosts } from "@/services/db";
import { redirect } from "next/navigation";
import { Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardMyCommunitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const communities = await getJoinedCommunitiesWithRecentPosts(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">My Communities</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Communities you’ve joined. View discussions and recent posts.
        </p>
      </div>

      {communities.length === 0 ? (
        <Card className="rounded-2xl shadow-sm border-[var(--color-border)] overflow-hidden">
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">No communities yet</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">
              Discover and join communities from the dashboard to see them here.
            </p>
            <Link href="/dashboard/communities">
              <Button className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold">
                Discover communities
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {communities.map((c: { id: string; name: string; slug: string; description?: string; avatar_url?: string; member_count?: number; post_count?: number; recent_posts?: { id: string; title: string | null; created_at: string }[] }) => (
            <Card key={c.id} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
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
                      <h3 className="font-bold text-[var(--color-text-primary)]">{c.name}</h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {(c.member_count ?? 0).toLocaleString()} members · {(c.post_count ?? 0).toLocaleString()} posts
                      </p>
                    </div>
                  </div>
                  {Array.isArray(c.recent_posts) && c.recent_posts.length > 0 && (
                    <ul className="mt-4 space-y-1.5">
                      {c.recent_posts.slice(0, 3).map((p: { id: string; title: string | null; created_at: string }) => (
                        <li key={p.id} className="text-sm text-[var(--color-text-secondary)] truncate">
                          {p.title || "Untitled"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <Link href={`/communities/${c.slug}`}>
                    <Button className="w-full rounded-xl" size="sm">
                      View Community <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
