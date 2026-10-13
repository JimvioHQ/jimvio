#!/usr/bin/env node
/**
 * Idempotent community feed curation — soft-archive excess editorial/demo posts.
 *
 * Safety:
 * - Never hard-deletes posts, likes, comments, or views
 * - Never archives unmarked/organic posts or restricted-audience posts
 * - Never invents engagement
 * - Writes an auditable backup table before mutating
 * - Safe to re-run (only archives archived_at IS NULL candidates)
 *
 * Usage:
 *   node scripts/ops/curate-community-feed-cleanup.mjs --dry-run
 *   node scripts/ops/curate-community-feed-cleanup.mjs --apply
 *
 * Target: ~2500 eligible public feed posts (promotions already excluded from feed).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const TARGET_ELIGIBLE = 2500;
const BATCH = "2026-10-05-community-curation";
const PER_COMMUNITY_SOFT_CAP = 8;
const dryRun = !process.argv.includes("--apply");
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, "../../scripts/tmp");

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return { url, key };
}

function contentHash(row) {
  const body = String(row.body ?? "")
    .trim()
    .toLowerCase();
  const images = JSON.stringify(row.images ?? null);
  const video = String(row.video_url ?? "");
  return createHash("md5")
    .update(`${body}|${images}|${video}`)
    .digest("hex");
}

function hasMedia(row) {
  const images = row.images;
  if (Array.isArray(images) && images.length > 0) return true;
  if (images && typeof images === "object" && !Array.isArray(images)) {
    if (Object.keys(images).length > 0) return true;
  }
  return Boolean(String(row.video_url ?? "").trim());
}

function originOf(row) {
  const o = row.attachments?.jimvio?.origin;
  return typeof o === "string" ? o : null;
}

function isRestricted(row) {
  if (row.is_exclusive) return true;
  const a = String(row.audience ?? "public").toLowerCase().trim();
  return a && a !== "public" && a !== "everyone" && a !== "all";
}

function qualityScore(row) {
  const origin = originOf(row);
  const organicBoost = !origin || origin === "" ? 10_000 : 0;
  const mediaBoost = hasMedia(row) ? 50 : 0;
  const likes = Math.max(0, Number(row.like_count ?? 0) || 0);
  const comments = Math.max(0, Number(row.comment_count ?? 0) || 0);
  const views = Math.max(0, Number(row.view_count ?? 0) || 0);
  const bodyLen = Math.min(String(row.body ?? "").trim().length, 400);
  return (
    organicBoost +
    mediaBoost +
    Math.log1p(likes) * 2 +
    Math.log1p(comments) * 3 +
    Math.log1p(views) * 0.1 +
    bodyLen / 40
  );
}

async function fetchAllEligible(db) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("community_posts")
      .select(
        "id, community_id, author_id, body, images, video_url, attachments, like_count, comment_count, view_count, share_count, audience, is_exclusive, is_published, archived_at, created_at"
      )
      .is("archived_at", null)
      .eq("is_published", true)
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (originOf(row) === "promotion") continue;
      rows.push(row);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

function planCleanup(rows) {
  const eligible = rows.filter((r) => !isRestricted(r));
  const restrictedKept = rows.filter(isRestricted);

  // Near-duplicate: keep best editorial post per content hash.
  const byHash = new Map();
  const exactDupeArchive = [];
  for (const row of eligible) {
    const origin = originOf(row);
    if (origin !== "editorial") continue;
    const hash = contentHash(row);
    const score = qualityScore(row);
    const prev = byHash.get(hash);
    if (!prev) {
      byHash.set(hash, { row, score });
      continue;
    }
    if (score > prev.score) {
      exactDupeArchive.push({
        row: prev.row,
        reason: "near_duplicate_editorial",
        content_hash: hash,
        quality_score: prev.score,
      });
      byHash.set(hash, { row, score });
    } else {
      exactDupeArchive.push({
        row,
        reason: "near_duplicate_editorial",
        content_hash: hash,
        quality_score: score,
      });
    }
  }
  const dupeArchivedIds = new Set(exactDupeArchive.map((x) => x.row.id));

  const afterDedupe = eligible.filter((r) => !dupeArchivedIds.has(r.id));

  // Soft per-community cap on editorial only; organic always kept.
  const byCommunity = new Map();
  for (const row of afterDedupe) {
    const list = byCommunity.get(row.community_id) ?? [];
    list.push(row);
    byCommunity.set(row.community_id, list);
  }

  const keep = [];
  const lowQualityArchive = [];
  for (const [, list] of byCommunity) {
    const organic = list.filter((r) => originOf(r) !== "editorial");
    const editorial = list
      .filter((r) => originOf(r) === "editorial")
      .sort((a, b) => {
        const ds = qualityScore(b) - qualityScore(a);
        if (ds !== 0) return ds;
        return String(b.created_at).localeCompare(String(a.created_at)) || String(b.id).localeCompare(String(a.id));
      });
    keep.push(...organic);
    const retained = editorial.slice(0, PER_COMMUNITY_SOFT_CAP);
    const dropped = editorial.slice(PER_COMMUNITY_SOFT_CAP);
    keep.push(...retained);
    for (const row of dropped) {
      lowQualityArchive.push({
        row,
        reason: hasMedia(row)
          ? "community_cap_editorial"
          : "low_quality_or_excess_editorial",
        content_hash: contentHash(row),
        quality_score: qualityScore(row),
      });
    }
  }

  // If still above target, archive lowest-scoring editorial keepers.
  let keepEditorial = keep.filter((r) => originOf(r) === "editorial");
  const keepOrganic = keep.filter((r) => originOf(r) !== "editorial");
  keepEditorial.sort((a, b) => {
    const ds = qualityScore(a) - qualityScore(b);
    if (ds !== 0) return ds;
    return String(a.id).localeCompare(String(b.id));
  });

  const overflowArchive = [];
  while (
    keepOrganic.length + keepEditorial.length + restrictedKept.length >
      TARGET_ELIGIBLE &&
    keepEditorial.length > 0
  ) {
    const row = keepEditorial.shift();
    overflowArchive.push({
      row,
      reason: "target_trim_editorial",
      content_hash: contentHash(row),
      quality_score: qualityScore(row),
    });
  }

  const finalKeep = [...keepOrganic, ...keepEditorial, ...restrictedKept];
  const toArchive = [
    ...exactDupeArchive,
    ...lowQualityArchive,
    ...overflowArchive,
  ];

  return {
    beforeEligible: eligible.length + restrictedKept.length,
    afterEligible: finalKeep.length,
    exactDuplicateGroups: byHash.size
      ? exactDupeArchive.length
      : 0,
    exactDuplicateArchived: exactDupeArchive.length,
    lowQualityArchived: lowQualityArchive.length,
    overflowArchived: overflowArchive.length,
    totalArchive: toArchive.length,
    toArchive,
    finalKeepIds: new Set(finalKeep.map((r) => r.id)),
  };
}

async function ensureBackupTable(db) {
  const { error } = await db.rpc("exec_sql", {
    query: `
      CREATE TABLE IF NOT EXISTS public.jimvio_ops_post_cleanup_20261005 (
        post_id uuid PRIMARY KEY,
        community_id uuid,
        author_id uuid,
        origin text,
        reason text NOT NULL,
        content_hash text,
        quality_score double precision,
        batch text NOT NULL,
        snapshot jsonb NOT NULL,
        restored_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE public.jimvio_ops_post_cleanup_20261005 ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.jimvio_ops_post_cleanup_20261005 FORCE ROW LEVEL SECURITY;
      REVOKE ALL ON TABLE public.jimvio_ops_post_cleanup_20261005 FROM PUBLIC;
      REVOKE ALL ON TABLE public.jimvio_ops_post_cleanup_20261005 FROM anon;
      REVOKE ALL ON TABLE public.jimvio_ops_post_cleanup_20261005 FROM authenticated;
      GRANT ALL ON TABLE public.jimvio_ops_post_cleanup_20261005 TO service_role;
    `,
  });
  // rpc may not exist — fall back to direct insert-only backup via JSON file + optional table create through REST is limited.
  return error;
}

async function main() {
  const { url, key } = requireEnv();
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "apply", batch: BATCH, target: TARGET_ELIGIBLE }));

  const rows = await fetchAllEligible(db);
  const plan = planCleanup(rows);

  const report = {
    generated_at: new Date().toISOString(),
    batch: BATCH,
    mode: dryRun ? "dry-run" : "apply",
    before: {
      eligible_public_feedish: plan.beforeEligible,
      total_fetched_non_promotion: rows.length,
    },
    proposed: {
      retained_eligible: plan.afterEligible,
      archive_exact_near_dupes: plan.exactDuplicateArchived,
      archive_community_cap_or_lq: plan.lowQualityArchived,
      archive_target_trim: plan.overflowArchived,
      archive_total: plan.totalArchive,
    },
    policy: {
      soft_delete_column: "archived_at",
      per_community_editorial_cap: PER_COMMUNITY_SOFT_CAP,
      preserve_organic: true,
      preserve_restricted: true,
      never_hard_delete: true,
      idempotent: true,
    },
    sample_archive_ids: plan.toArchive.slice(0, 20).map((x) => x.row.id),
  };

  mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = join(REPORT_DIR, `community-feed-cleanup-${BATCH}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Report written: ${reportPath}`);

  if (dryRun) {
    console.log("Dry-run complete — no mutations.");
    return;
  }

  if (plan.toArchive.length === 0) {
    console.log("Nothing to archive.");
    return;
  }

  // Backup snapshots + archive in chunks.
  const now = new Date().toISOString();
  let archived = 0;
  for (let i = 0; i < plan.toArchive.length; i += 100) {
    const chunk = plan.toArchive.slice(i, i + 100);
    const backups = chunk.map(({ row, reason, content_hash, quality_score }) => ({
      post_id: row.id,
      community_id: row.community_id,
      author_id: row.author_id,
      origin: originOf(row),
      reason,
      content_hash,
      quality_score,
      batch: BATCH,
      snapshot: row,
    }));

    // Best-effort backup table (created via SQL migration/MCP separately if needed).
    const { error: backupError } = await db
      .from("jimvio_ops_post_cleanup_20261005")
      .upsert(backups, { onConflict: "post_id" });
    if (backupError) {
      // Fall back to local JSONL backup if table missing.
      const fallback = join(REPORT_DIR, `community-feed-cleanup-backup-${BATCH}.jsonl`);
      writeFileSync(
        fallback,
        backups.map((b) => JSON.stringify(b)).join("\n") + "\n",
        { flag: "a" }
      );
      console.warn("Backup table upsert failed; wrote JSONL fallback:", backupError.message);
    }

    const ids = chunk.map((c) => c.row.id);
    const { error: archiveError } = await db
      .from("community_posts")
      .update({ archived_at: now })
      .in("id", ids)
      .is("archived_at", null);
    if (archiveError) throw archiveError;
    archived += ids.length;
    console.log(`Archived ${archived}/${plan.toArchive.length}`);
  }

  // Refresh community post_count caches for affected communities.
  const communityIds = [
    ...new Set(plan.toArchive.map((x) => x.row.community_id).filter(Boolean)),
  ];
  for (const communityId of communityIds) {
    const { count } = await db
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .is("archived_at", null)
      .eq("is_published", true);
    await db
      .from("communities")
      .update({ post_count: count ?? 0 })
      .eq("id", communityId);
  }

  console.log(
    JSON.stringify({
      ok: true,
      archived,
      retained_estimate: plan.afterEligible,
      backup_table: "jimvio_ops_post_cleanup_20261005",
      restore:
        "UPDATE community_posts SET archived_at = NULL WHERE id IN (SELECT post_id FROM jimvio_ops_post_cleanup_20261005 WHERE batch = '" +
        BATCH +
        "');",
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
