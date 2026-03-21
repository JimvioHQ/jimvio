import React from "react";
import { createClient } from "@/lib/supabase/server";
import { getJoinedCommunities } from "@/services/db";
import { redirect } from "next/navigation";
import { CreatePostFormDashboard } from "./create-post-form-dashboard";

export default async function DashboardCreatePostPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const communities = await getJoinedCommunities(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Create Post</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Share with a community. Add a title, content, and optionally an image.
        </p>
      </div>

      <CreatePostFormDashboard communities={communities} />
    </div>
  );
}
