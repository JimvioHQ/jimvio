/**
 * Verify community reality invariants after seed-community-reality.ts
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(root, ".env.local") });

const PRESERVED = ["forex-hub", "gcs-unity"];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing env");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const mismatches = [];
  const overCap = [];
  const ownerDup = new Map();
  let editorial = 0;
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("communities")
      .select("id, slug, member_count, owner_id, settings")
      .eq("is_active", true)
      .range(from, from + 199);
    if (error) throw error;
    if (!data?.length) break;
    for (const c of data) {
      if (PRESERVED.includes(c.slug)) continue;
      const jimvio = c.settings?.jimvio;
      if (jimvio?.origin !== "editorial") continue;
      editorial += 1;
      if ((c.member_count ?? 0) > 2000) overCap.push(c.slug);
      const { count } = await db
        .from("community_memberships")
        .select("id", { count: "exact", head: true })
        .eq("community_id", c.id)
        .eq("status", "active");
      if ((count ?? 0) !== (c.member_count ?? 0)) {
        mismatches.push({ slug: c.slug, display: c.member_count, actual: count });
      }
      if (c.owner_id) {
        ownerDup.set(c.owner_id, (ownerDup.get(c.owner_id) ?? 0) + 1);
      }
    }
    if (data.length < 200) break;
    from += 200;
  }

  const multiOwners = [...ownerDup.entries()].filter(([, n]) => n > 1);
  const { data: preserved } = await db
    .from("communities")
    .select("slug, settings")
    .in("slug", PRESERVED);

  const report = {
    editorial,
    mismatches: mismatches.slice(0, 10),
    mismatchCount: mismatches.length,
    overCap,
    multiOwnerCount: multiOwners.length,
    preservedOk: (preserved ?? []).every((p) => !p.settings?.jimvio),
    ok:
      editorial >= 200 &&
      mismatches.length === 0 &&
      overCap.length === 0 &&
      multiOwners.length === 0 &&
      (preserved ?? []).length === 2,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
