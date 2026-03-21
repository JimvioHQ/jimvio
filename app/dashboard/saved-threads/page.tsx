import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSavedPostsByUser } from "@/services/db";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SavedThreadsList } from "./saved-threads-list";

export default async function DashboardSavedThreadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const posts = await getSavedPostsByUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Saved Threads</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Posts you’ve bookmarked. Open to read the discussion or remove from saved.
        </p>
      </div>

      {posts.length === 0 ? (
        <Card className="rounded-2xl shadow-sm border-[var(--color-border)] overflow-hidden">
          <CardContent className="py-16 text-center">
            <Bookmark className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">No saved threads</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">
              When you save a post from a discussion, it will appear here.
            </p>
            <Link href="/dashboard/discussions" className="text-[var(--color-accent)] font-bold hover:underline">
              Browse discussions
            </Link>
          </CardContent>
        </Card>
      ) : (
        <SavedThreadsList posts={posts} />
      )}
    </div>
  );
}
