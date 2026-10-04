/**
 * Idempotent: join designated editorial demo personas into P7 PROVIDER.
 *
 * - Uses existing editorial+*@jimvio.com profiles only (never invents users)
 * - Unique (community_id, user_id) — safe to re-run
 * - Syncs communities.member_count and free/inherit space counts from real rows
 * - Does not modify non-demo memberships or invent display floors
 *
 * Usage: npx tsx scripts/seed-p7provider-memberships.ts
 *        npx tsx scripts/seed-p7provider-memberships.ts --dry-run
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const P7_SLUG = "p7provider";
const TARGET_MEMBERS = 1300;
const BATCH = 200;
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

  const { data: community, error: communityError } = await db
    .from("communities")
    .select("id, slug, name, owner_id, member_count, avatar_url, cover_image")
    .eq("slug", P7_SLUG)
    .maybeSingle();
  if (communityError) throw communityError;
  if (!community) throw new Error(`Community ${P7_SLUG} not found`);

  const { count: beforeCount } = await db
    .from("community_memberships")
    .select("id", { count: "exact", head: true })
    .eq("community_id", community.id)
    .eq("status", "active");

  const before = beforeCount ?? 0;
  const needed = Math.max(0, TARGET_MEMBERS - before);

  // Designated demo accounts: editorial personas already in the platform.
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
      if (row.id && row.id !== community.owner_id) eligible.push(row.id);
    }
    if (data.length < 1000) break;
    from += 1000;
  }

  // Load existing member ids in pages for accurate filtering.
  const existingIds = new Set<string>();
  let mFrom = 0;
  for (;;) {
    const { data, error } = await db
      .from("community_memberships")
      .select("user_id")
      .eq("community_id", community.id)
      .range(mFrom, mFrom + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) existingIds.add(row.user_id);
    if (data.length < 1000) break;
    mFrom += 1000;
  }

  const candidates = eligible.filter((id) => !existingIds.has(id));
  const toAdd = candidates.slice(0, needed);

  console.log(
    JSON.stringify(
      {
        community: community.slug,
        before_active: before,
        target: TARGET_MEMBERS,
        editorial_eligible: eligible.length,
        not_yet_members: candidates.length,
        will_add: toAdd.length,
        shortfall: Math.max(0, TARGET_MEMBERS - (before + toAdd.length)),
        dryRun,
      },
      null,
      2
    )
  );

  if (dryRun) return;

  // Ensure owner membership exists.
  if (community.owner_id && !existingIds.has(community.owner_id)) {
    const { error } = await db.from("community_memberships").upsert(
      {
        community_id: community.id,
        user_id: community.owner_id,
        role: "owner",
        plan_type: "lifetime",
        status: "active",
      },
      { onConflict: "community_id,user_id" }
    );
    if (error) throw error;
  }

  for (let i = 0; i < toAdd.length; i += BATCH) {
    const chunk = toAdd.slice(i, i + BATCH);
    const rows = chunk.map((user_id) => ({
      community_id: community.id,
      user_id,
      role: "member" as const,
      plan_type: "lifetime",
      status: "active",
    }));
    const { error } = await db.from("community_memberships").upsert(rows, {
      onConflict: "community_id,user_id",
      ignoreDuplicates: true,
    });
    if (error) throw new Error(`membership insert: ${error.message}`);
  }

  const { count: afterCount } = await db
    .from("community_memberships")
    .select("id", { count: "exact", head: true })
    .eq("community_id", community.id)
    .eq("status", "active");
  const after = afterCount ?? before;

  const patch: Record<string, unknown> = { member_count: after };
  // Prefer avatar as cover when no cover exists so discovery cards aren't letter-only.
  if (!community.cover_image && community.avatar_url) {
    patch.cover_image = community.avatar_url;
  }

  const { error: updateError } = await db
    .from("communities")
    .update(patch)
    .eq("id", community.id);
  if (updateError) throw updateError;

  const { data: spaces } = await db
    .from("spaces")
    .select("id, access_type")
    .eq("community_id", community.id)
    .eq("is_active", true);
  for (const space of spaces ?? []) {
    const access = (space.access_type || "free").toLowerCase();
    if (access === "free" || access === "inherit" || access === "public" || access === "open") {
      await db.from("spaces").update({ member_count: after }).eq("id", space.id);
    }
  }

  console.log(
    JSON.stringify(
      {
        added: Math.max(0, after - before),
        after_active: after,
        shortfall: Math.max(0, TARGET_MEMBERS - after),
        cover_synced: Boolean(patch.cover_image),
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
