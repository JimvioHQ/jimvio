import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPostsByAuthor } from "@/services/db";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMyPostsList } from "./dashboard-my-posts-list";

export default async function DashboardMyPostsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const posts = await getPostsByAuthor(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">My Posts</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Manage your community posts. Edit, delete, or view the discussion.
          </p>
        </div>
        <Link href="/dashboard/create-post">
          <Button className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold shrink-0">
            Create Post
          </Button>
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <FileText className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">No posts yet</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">
            Join a community and create your first post to see it here.
          </p>
          <Link href="/dashboard/create-post">
            <Button className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold">
              Create Post
            </Button>
          </Link>
        </div>
      ) : (
        <DashboardMyPostsList posts={posts} />
      )}
    </div>
  );
}
