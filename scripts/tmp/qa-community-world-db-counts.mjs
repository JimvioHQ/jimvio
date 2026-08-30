/**
 * Live DB counts for world community ecosystem (service role).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(root, ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function headCount(table, apply) {
  let q = db.from(table).select("id", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const activeCommunities = await headCount("communities", (q) => q.eq("is_active", true));

  let editorial = 0;
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("communities")
      .select("slug, member_count, settings")
      .eq("is_active", true)
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const c of data) {
      const j = c.settings?.jimvio;
      if (j?.editorial || j?.origin === "editorial") editorial += 1;
    }
    if (data.length < 1000) break;
    from += 1000;
  }

  const { data: preserved } = await db
    .from("communities")
    .select("slug, member_count, settings")
    .in("slug", ["forex-hub", "gcs-unity"]);

  const { data: overCap } = await db
    .from("communities")
    .select("slug, member_count")
    .gt("member_count", 2000)
    .limit(10);

  const posts = await headCount("community_posts", (q) => q.eq("is_published", true));
  const comments = await headCount("community_post_comments", (q) =>
    q.eq("is_published", true)
  );
  const messages = await headCount("community_messages", (q) => q.eq("is_deleted", false));
  const rooms = await headCount("rooms", (q) => q.eq("is_active", true));
  const photoPosts = await headCount("community_posts", (q) =>
    q.eq("is_published", true).not("images", "is", null)
  );
  const videoPosts = await headCount("community_posts", (q) =>
    q.eq("is_published", true).not("video_url", "is", null)
  );
  const pollPosts = await headCount("community_posts", (q) =>
    q.eq("is_published", true).eq("post_type", "poll")
  );

  const { data: maxMembers } = await db
    .from("communities")
    .select("slug, member_count")
    .eq("is_active", true)
    .order("member_count", { ascending: false })
    .limit(5);
  const { data: minMembers } = await db
    .from("communities")
    .select("slug, member_count")
    .eq("is_active", true)
    .order("member_count", { ascending: true })
    .limit(5);

  const report = {
    activeCommunities,
    editorialCommunities: editorial,
    overCap: overCap ?? [],
    preserved: (preserved ?? []).map((p) => ({
      slug: p.slug,
      members: p.member_count,
      hasJimvioSettings: Boolean(p.settings?.jimvio),
    })),
    posts,
    photoPosts,
    videoPosts,
    pollPosts,
    comments,
    messages,
    rooms,
    maxMembers,
    minMembers,
    ok:
      activeCommunities >= 200 &&
      editorial >= 200 &&
      !(overCap ?? []).length &&
      (preserved ?? []).length === 2 &&
      (preserved ?? []).every((p) => !p.settings?.jimvio),
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
