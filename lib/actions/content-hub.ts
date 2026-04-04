"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ContentComment = {
  id: string;
  body: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
};

export async function getContentComments(contentId: string, itemType: "clipping" | "ugc") {
  try {
    const supabase = await createClient();
    const table = itemType === "clipping" ? "clip_comments" : "ugc_post_comments";
    const idField = itemType === "clipping" ? "clip_id" : "post_id";

    const { data, error } = await supabase
      .from(table)
      .select(`
        id, body, created_at,
        profiles:user_id ( id, full_name, avatar_url )
      `)
      .eq(idField, contentId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      comments: (data || []).map((c: any) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        return {
          id: c.id,
          body: c.body,
          created_at: c.created_at,
          user: {
            id: profile?.id,
            full_name: profile?.full_name || "Community Member",
            avatar_url: profile?.avatar_url || "",
          },
        };
      }),
    };
  } catch (error: any) {
    console.error("Fetch comments error:", error);
    return { success: false, error: error.message };
  }
}

export async function addContentComment(contentId: string, itemType: "clipping" | "ugc", body: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const table = itemType === "clipping" ? "clip_comments" : "ugc_post_comments";
    const idField = itemType === "clipping" ? "clip_id" : "post_id";

    const { data, error } = await supabase
      .from(table)
      .insert({
        [idField]: contentId,
        user_id: user.id,
        body: body.trim(),
      })
      .select(`
        id, body, created_at,
        profiles:user_id ( id, full_name, avatar_url )
      `)
      .single();

    if (error) throw error;

    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

    return {
      success: true,
      comment: {
        id: data.id,
        body: data.body,
        created_at: data.created_at,
        user: {
          id: profile?.id,
          full_name: profile?.full_name || "Community Member",
          avatar_url: profile?.avatar_url || "",
        },
      },
    };
  } catch (error: any) {
    console.error("Add comment error:", error);
    return { success: false, error: error.message };
  }
}
