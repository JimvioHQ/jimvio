"use server";
import { createClient } from "@/lib/supabase/server";

export async function togglePostBookmark(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required" };

  const { data: existing } = await supabase
    .from("community_saved_posts")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    await supabase.from("community_saved_posts").delete().eq("id", existing.id);
    return { success: true, saved: false };
  }
  await supabase.from("community_saved_posts").insert({ user_id: user.id, post_id: postId });
  return { success: true, saved: true };
}