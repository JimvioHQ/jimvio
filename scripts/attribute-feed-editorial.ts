/**
 * Set published_as on the existing 78 editorial feed posts.
 * Updates attachments.jimvio only. Does not insert, delete, or change
 * author_id, body, media, community_id, or engagement.
 *
 *   ALLOW_PRODUCTION_SCRIPT=1 npx tsx scripts/attribute-feed-editorial.ts --dry-run
 *   ALLOW_PRODUCTION_SCRIPT=1 npx tsx scripts/attribute-feed-editorial.ts
 */
import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readPostEditorialMeta } from "../lib/community/editorial-origin";
import { FEED_EDITORIAL_KEY_PREFIX } from "../lib/community/feed-editorial/collection";
import { planEditorialPublishAs, readPublishAs, withPublishAs } from "../lib/feed/post-identity";
import { assertProductionScriptAllowed } from "../lib/ops/script-safety";

loadEnv({ path: ".env.local", override: true });
assertProductionScriptAllowed("attribute-feed-editorial");

const dryRun = process.argv.includes("--dry-run");

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");
  return { url, key };
}

async function countTable(db: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const { url, key } = requireEnv();
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const before = {
    posts: await countTable(db, "community_posts"),
    comments: await countTable(db, "community_post_comments"),
    likes: await countTable(db, "community_post_likes"),
    reactions: await countTable(db, "community_post_reactions"),
    profiles: await countTable(db, "profiles"),
  };

  const rows: Array<{ id: string; attachments: unknown; author_id: string; body: string; community_id: string }> = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("community_posts")
      .select("id, attachments, author_id, body, community_id")
      .range(from, from + 499);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    for (const row of page) {
      const meta = readPostEditorialMeta(row.attachments);
      if (meta.origin === "editorial" && meta.key?.startsWith(FEED_EDITORIAL_KEY_PREFIX)) {
        rows.push(row);
      }
    }
    if (page.length < 500) break;
    from += 500;
  }

  const plan = new Map(planEditorialPublishAs(rows.map((row) => readPostEditorialMeta(row.attachments).key || "")).map((item) => [item.key, item.publishAs]));
  let updated = 0;
  let unchanged = 0;
  for (const row of rows) {
    const key = readPostEditorialMeta(row.attachments).key || "";
    const publishAs = plan.get(key);
    if (!publishAs) continue;
    if (readPublishAs(row.attachments) === publishAs) {
      unchanged += 1;
      continue;
    }
    const next = withPublishAs(row.attachments, publishAs);
    if (!dryRun) {
      const { error } = await db.from("community_posts").update({ attachments: next }).eq("id", row.id);
      if (error) throw new Error(`${row.id}: ${error.message}`);
    }
    updated += 1;
  }

  const after = {
    posts: await countTable(db, "community_posts"),
    comments: await countTable(db, "community_post_comments"),
    likes: await countTable(db, "community_post_likes"),
    reactions: await countTable(db, "community_post_reactions"),
    profiles: await countTable(db, "profiles"),
  };
  const community = [...plan.values()].filter((value) => value === "community").length;
  const profile = [...plan.values()].filter((value) => value === "profile").length;
  console.log(JSON.stringify({
    dryRun,
    editorialPosts: rows.length,
    community,
    profile,
    updated,
    unchanged,
    before,
    after,
    preserved: before.posts === after.posts && before.comments === after.comments && before.likes === after.likes && before.reactions === after.reactions && before.profiles === after.profiles,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
