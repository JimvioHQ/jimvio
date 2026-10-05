/**
 * Idempotent: create real user_follows rows for @p7provider from existing
 * editorial+*@jimvio.com demo personas (never invents users).
 *
 * - Unique (follower_id, following_id) — safe to re-run
 * - follower_count updated by DB trigger on user_follows
 * - Target 300 when enough eligible personas exist; otherwise max achievable
 *
 * Usage: npx tsx scripts/seed-p7provider-followers.ts
 *        npx tsx scripts/seed-p7provider-followers.ts --dry-run
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const P7_USERNAME = "p7provider";
const TARGET_FOLLOWERS = 300;
const BATCH = 100;
const dryRun = process.argv.includes("--dry-run");

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return { url, key };
}

async function main() {
  const { url, key } = requireEnv();
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: target, error: targetError } = await db
    .from("profiles")
    .select("id, username, full_name, avatar_url, follower_count")
    .in("username", [P7_USERNAME, `@${P7_USERNAME}`])
    .eq("is_active", true)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) throw new Error(`Profile @${P7_USERNAME} not found`);

  const { count: beforeCount } = await db
    .from("user_follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", target.id);
  const before = beforeCount ?? 0;
  const needed = Math.max(0, TARGET_FOLLOWERS - before);

  const eligible: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("profiles")
      .select("id, email")
      .ilike("email", "editorial+%@jimvio.com")
      .eq("is_active", true)
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (row.id && row.id !== target.id) eligible.push(row.id);
    }
    if (data.length < 1000) break;
    from += 1000;
  }

  const existingIds = new Set<string>();
  let fFrom = 0;
  for (;;) {
    const { data, error } = await db
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", target.id)
      .range(fFrom, fFrom + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) existingIds.add(row.follower_id);
    if (data.length < 1000) break;
    fFrom += 1000;
  }

  const candidates = eligible.filter((id) => !existingIds.has(id));
  const toAdd = candidates.slice(0, needed);

  console.log(
    JSON.stringify(
      {
        username: target.username,
        target_id: target.id,
        before_followers: before,
        profile_follower_count: target.follower_count,
        goal: TARGET_FOLLOWERS,
        editorial_eligible: eligible.length,
        not_yet_following: candidates.length,
        will_add: toAdd.length,
        max_achievable: before + candidates.length,
        shortfall: Math.max(0, TARGET_FOLLOWERS - (before + toAdd.length)),
        dryRun,
      },
      null,
      2
    )
  );

  if (dryRun) return;

  for (let i = 0; i < toAdd.length; i += BATCH) {
    const chunk = toAdd.slice(i, i + BATCH);
    const rows = chunk.map((follower_id) => ({
      follower_id,
      following_id: target.id,
    }));
    const { error } = await db.from("user_follows").upsert(rows, {
      onConflict: "follower_id,following_id",
      ignoreDuplicates: true,
    });
    if (error) throw new Error(`follow insert: ${error.message}`);
  }

  const { count: afterCount } = await db
    .from("user_follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", target.id);
  const after = afterCount ?? before;

  // Reconcile cache to real relationship count (trigger may have raced).
  const { error: syncError } = await db
    .from("profiles")
    .update({ follower_count: after })
    .eq("id", target.id);
  if (syncError) throw syncError;

  const { data: refreshed } = await db
    .from("profiles")
    .select("follower_count, avatar_url, full_name, username")
    .eq("id", target.id)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        added: Math.max(0, after - before),
        after_followers: after,
        profile_follower_count: refreshed?.follower_count ?? after,
        shortfall: Math.max(0, TARGET_FOLLOWERS - after),
        avatar_present: Boolean(refreshed?.avatar_url),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
