import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("community_posts")
    .select("id, title, body, post_type, is_published, published_at, scheduled_at, created_at, communities(name, slug)")
    .eq("author_id", user.id)
    .is("archived_at", null)
    .is("hidden_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(
    { posts: data ?? [] },
    { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
  );
}
