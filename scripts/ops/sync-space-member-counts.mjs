/**
 * Sync free-space member_count to active community memberships.
 * Product model: free spaces are accessible to all community members;
 * there is no separate space_memberships table.
 *
 * Usage: ALLOW_PRODUCTION_SCRIPT=1 node --env-file=.env.local scripts/ops/sync-space-member-counts.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(root, ".env.local") });

const PRESERVED = new Set(["forex-hub", "gcs-unity"]);
const PRODUCTION_REFS = new Set(["vsfhwfimudpdipdkxbww"]);

function projectRefFromUrl(url) {
  const match = String(url ?? "").match(/https?:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

function assertProductionScriptAllowed(scriptName) {
  const ref =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!ref || !PRODUCTION_REFS.has(ref) || process.env.ALLOW_PRODUCTION_SCRIPT === "1") return;
  console.error(
    `[script-safety] Refusing ${scriptName} against production ${ref}. Set ALLOW_PRODUCTION_SCRIPT=1.`,
  );
  process.exit(1);
}

assertProductionScriptAllowed("sync-space-member-counts");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const db = createClient(url, key, { auth: { persistSession: false } });

  let updatedSpaces = 0;
  let updatedCommunities = 0;
  let from = 0;
  for (;;) {
    const { data: communities, error } = await db
      .from("communities")
      .select("id, slug, member_count, settings")
      .eq("is_active", true)
      .range(from, from + 199);
    if (error) throw error;
    if (!communities?.length) break;

    for (const community of communities) {
      const editorial = community.settings?.jimvio?.origin === "editorial";
      if (!editorial && !PRESERVED.has(community.slug)) continue;

      const { count } = await db
        .from("community_memberships")
        .select("id", { count: "exact", head: true })
        .eq("community_id", community.id)
        .eq("status", "active");
      const members = count ?? 0;

      if ((community.member_count ?? 0) !== members) {
        await db.from("communities").update({ member_count: members }).eq("id", community.id);
        updatedCommunities += 1;
      }

      const { data: spaces } = await db
        .from("spaces")
        .select("id, access_type, member_count")
        .eq("community_id", community.id)
        .eq("is_active", true);

      for (const space of spaces ?? []) {
        const access = (space.access_type || "free").toLowerCase();
        const expected =
          access === "free" || access === "inherit" ? members : space.member_count ?? 0;
        if ((space.member_count ?? 0) !== expected) {
          await db.from("spaces").update({ member_count: expected }).eq("id", space.id);
          updatedSpaces += 1;
        }
      }
    }

    if (communities.length < 200) break;
    from += 200;
  }

  console.log(JSON.stringify({ updatedSpaces, updatedCommunities, ok: true }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
