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

// FIX: "clipping" and "ugc" item types removed — neither "clip_comments" nor
// "ugc_post_comments" exist in the schema. The only valid comments table for
// content is "short_video_comments" (video_id FK) and "community_post_comments"
// (post_id FK). Map itemType accordingly.
export async function getContentComments(
  contentId: string,
  itemType: "short" | "post"
) {
  try {
    const supabase = await createClient();

    if (itemType === "short") {
      const { data, error } = await supabase
        .from("short_video_comments")
        .select(`
          id, body, created_at,
          profiles:user_id ( id, full_name, avatar_url )
        `)
        .eq("video_id", contentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DATABASE ERROR] getContentComments failed:", error);
        throw error;
      }

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
    } else {
      const { data, error } = await supabase
        .from("community_post_comments")
        .select(`
          id, body, created_at,
          profiles:author_id ( id, full_name, avatar_url )
        `)
        .eq("post_id", contentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DATABASE ERROR] getContentComments failed:", error);
        throw error;
      }

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
    }
  } catch (error: any) {
    console.error("Fetch comments error:", error);
    return { success: false, error: error.message };
  }
}

export async function addContentComment(
  contentId: string,
  itemType: "short" | "post",
  body: string
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    if (itemType === "short") {
      const { data, error } = await supabase
        .from("short_video_comments")
        .insert({
          body: body.trim(),
          video_id: contentId,
          user_id: user.id,
        })
        .select(`
          id, body, created_at,
          profiles:user_id ( id, full_name, avatar_url )
        `)
        .single();

      if (error) {
        console.error("[DATABASE ERROR] addContentComment failed:", error);
        throw error;
      }

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
    } else {
      const { data, error } = await supabase
        .from("community_post_comments")
        .insert({
          body: body.trim(),
          post_id: contentId,
          author_id: user.id,
        })
        .select(`
          id, body, created_at,
          profiles:author_id ( id, full_name, avatar_url )
        `)
        .single();

      if (error) {
        console.error("[DATABASE ERROR] addContentComment failed:", error);
        throw error;
      }

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
    }
  } catch (error: any) {
    console.error("Add comment error:", error);
    return { success: false, error: error.message };
  }
}