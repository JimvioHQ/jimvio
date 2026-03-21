import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersRound } from "lucide-react";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

export default async function AdminCommunitiesPage() {
  const admin = getAdminDB();
  const { data: communities, count } = await admin
    .from("communities")
    .select("id, name, slug, description, is_public, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(50);
  const list = communities ?? [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Communities</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Moderate communities and remove harmful content</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            All communities
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">{count ?? 0} communit(ies)</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Slug</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Visibility</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Created</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)]">No communities yet</td></tr>
                ) : (
                  list.map((c: any) => (
                    <tr key={c.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)]/30">
                      <td className="py-3 px-4 font-medium">{c.name || "—"}</td>
                      <td className="py-3 px-4 text-[var(--color-text-muted)]">{c.slug || "—"}</td>
                      <td className="py-3 px-4">{c.is_public ? "Public" : "Private"}</td>
                      <td className="py-3 px-4 text-[var(--color-text-muted)]">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-[var(--color-text-muted)]">
        Post moderation (remove posts, ban users) can be added with actions linked to community_posts and members.
      </p>
    </div>
  );
}
