/**
 * Idempotent editorial posts for the Communities feed.
 *
 * Usage:
 *   npm run seed:feed-editorial -- --dry-run
 *   npm run seed:feed-editorial
 *
 * Safety:
 * - assertProductionScriptAllowed
 * - existing editorial personas only (editorial+*@jimvio.com)
 * - editorial communities only
 * - never updates or deletes existing posts, comments, reactions, or profiles
 * - no likes, comments, or inflated counts on inserted posts
 * - second run inserts nothing new
 */
import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { editorialPostAttachments, readPostEditorialMeta } from "../lib/community/editorial-origin";
import { isEditorialPersonaEmail } from "../lib/community/editorial-personas";
import { ensureDefaultCommunityWorkspace } from "../lib/community/ensure-default-workspace";
import {
  FEED_EDITORIAL_KEY_PREFIX,
  FEED_EDITORIAL_POSTS,
  auditFeedEditorialCollection,
  feedEditorialKey,
  normalizeCaption,
  type FeedEditorialDraft,
} from "../lib/community/feed-editorial/collection";
import {
  buildMediaProvenance,
  downloadAndValidateImage,
  hasCloudinaryCredentials,
  licensedUnsplashPhoto,
  uploadValidatedImageToCloudinary,
  type CloudinaryPhotoUpload,
  type LicensedPhotoSpec,
} from "../lib/community/photo-content";
import { readCommunityEditorialOrigin } from "../lib/community/editorial-origin";
import { assertProductionScriptAllowed } from "../lib/ops/script-safety";

const cloudinaryFromProcess = {
  cloudName:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
    "",
  apiKey: process.env.CLOUDINARY_API_KEY?.trim() || "",
  apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || "",
};

loadEnv({ path: ".env.local", override: true });

if (!process.env.CLOUDINARY_API_KEY?.trim() && cloudinaryFromProcess.apiKey) {
  process.env.CLOUDINARY_API_KEY = cloudinaryFromProcess.apiKey;
}
if (!process.env.CLOUDINARY_API_SECRET?.trim() && cloudinaryFromProcess.apiSecret) {
  process.env.CLOUDINARY_API_SECRET = cloudinaryFromProcess.apiSecret;
}
if (
  !(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
    process.env.CLOUDINARY_CLOUD_NAME?.trim()
  ) &&
  cloudinaryFromProcess.cloudName
) {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = cloudinaryFromProcess.cloudName;
  process.env.CLOUDINARY_CLOUD_NAME = cloudinaryFromProcess.cloudName;
}

assertProductionScriptAllowed("seed-feed-editorial");

// Local app URL cannot upload. Production ops route stores licensed photos in Cloudinary.
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
if (
  !process.env.JIMVIO_OPS_BASE_URL?.trim() &&
  (!appUrl || /localhost|127\.0\.0\.1/.test(appUrl))
) {
  process.env.JIMVIO_OPS_BASE_URL = "https://www.jimvio.com";
}

const PRESERVED = new Set(["forex-hub", "gcs-unity"]);
const CATEGORY_ALIASES: Record<string, string[]> = {
  Food: ["Health", "Other", "Business"],
  Other: ["Education", "Business", "Travel"],
};

type PersonaRow = { id: string; email: string; full_name: string | null; username: string | null };
type CommunityRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  is_private: boolean;
};

function parseDryRun(argv: string[]): boolean {
  return argv.includes("--dry-run");
}

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

async function loadPersonas(db: SupabaseClient): Promise<Map<string, PersonaRow>> {
  const map = new Map<string, PersonaRow>();
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("profiles")
      .select("id, email, full_name, username")
      .ilike("email", "editorial%@jimvio.com")
      .eq("is_active", true)
      .range(from, from + 499);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as PersonaRow[];
    for (const row of batch) {
      if (!isEditorialPersonaEmail(row.email)) continue;
      const local = row.email.split("@")[0]?.replace(/^editorial\+/i, "") ?? "";
      if (local) map.set(local.toLowerCase(), row);
    }
    if (batch.length < 500) break;
    from += 500;
  }
  return map;
}

async function loadCommunities(db: SupabaseClient): Promise<CommunityRow[]> {
  const { data, error } = await db
    .from("communities")
    .select("id, slug, name, category, settings, is_private, is_active")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  const out: CommunityRow[] = [];
  for (const row of data ?? []) {
    const slug = String(row.slug ?? "");
    if (!slug || PRESERVED.has(slug)) continue;
    if (readCommunityEditorialOrigin(row.settings) !== "editorial") continue;
    if (row.is_private) continue;
    out.push({
      id: row.id as string,
      slug,
      name: String(row.name ?? slug),
      category: String(row.category ?? "Other"),
      is_private: false,
    });
  }
  return out;
}

function pickCommunity(
  communities: CommunityRow[],
  draft: FeedEditorialDraft,
): CommunityRow | null {
  const wanted = [draft.category, ...(CATEGORY_ALIASES[draft.category] ?? [])];
  let pool: CommunityRow[] = [];
  for (const name of wanted) {
    pool = communities.filter((c) => c.category.toLowerCase() === name.toLowerCase());
    if (pool.length) break;
  }
  if (!pool.length) return null;

  const needles = [draft.category, ...draft.hashtags]
    .map((value) => value.toLowerCase())
    .filter((value) => value.length >= 4);

  const scored = pool.map((community) => {
    const hay = `${community.slug} ${community.name}`.toLowerCase();
    const score = needles.reduce((sum, needle) => sum + (hay.includes(needle) ? 1 : 0), 0);
    return { community, score };
  });
  const best = Math.max(...scored.map((row) => row.score));
  const tied = scored.filter((row) => row.score === best).map((row) => row.community);
  let h = 0;
  for (let i = 0; i < draft.id.length; i++) h = (h * 33 + draft.id.charCodeAt(i)) >>> 0;
  return tied[h % tied.length]!;
}

async function existingSeedState(db: SupabaseClient): Promise<{
  keys: Set<string>;
  captions: Set<string>;
}> {
  const keys = new Set<string>();
  const captions = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("community_posts")
      .select("body, attachments")
      .range(from, from + 499);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    for (const row of batch) {
      const meta = readPostEditorialMeta(row.attachments);
      if (!meta.key?.startsWith(FEED_EDITORIAL_KEY_PREFIX)) continue;
      keys.add(meta.key);
      if (row.body) captions.add(normalizeCaption(row.body));
    }
    if (batch.length < 500) break;
    from += 500;
  }
  return { keys, captions };
}

async function storeLicensedPhoto(photo: LicensedPhotoSpec): Promise<CloudinaryPhotoUpload> {
  if (hasCloudinaryCredentials()) {
    const validated = await downloadAndValidateImage(photo.sourceUrl);
    return uploadValidatedImageToCloudinary(validated, photo);
  }
  const base = (process.env.JIMVIO_OPS_BASE_URL || "https://www.jimvio.com").replace(/\/$/, "");
  const token = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const res = await fetch(`${base}/api/ops/editorial-media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceUrl: photo.sourceUrl,
      sourceId: photo.sourceId,
      provider: photo.provider,
      attributionUrl: photo.attributionUrl,
      license: photo.license,
      licenseUrl: photo.licenseUrl,
      photographer: photo.photographer,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    data?: CloudinaryPhotoUpload;
  };
  if (!res.ok || !json.data?.secureUrl) {
    throw new Error(json.error || `ops upload HTTP ${res.status}`);
  }
  return json.data;
}

function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function atDaysAgo(daysAgo: number, hour: number): string {
  const date = new Date(Date.now() - daysAgo * 86_400_000);
  date.setUTCHours(hour % 24, (daysAgo * 13) % 60, 0, 0);
  return date.toISOString();
}

async function main() {
  const dryRun = parseDryRun(process.argv.slice(2));
  const issues = auditFeedEditorialCollection();
  if (issues.length) {
    console.error("Collection failed audit:");
    for (const issue of issues) console.error(`  ${issue.id}: ${issue.message}`);
    process.exit(1);
  }

  const { url, key } = requireEnv();
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const before = {
    posts: await countTable(db, "community_posts"),
    comments: await countTable(db, "community_post_comments"),
    likes: await countTable(db, "community_post_likes"),
    reactions: await countTable(db, "community_post_reactions"),
    profiles: await countTable(db, "profiles"),
  };

  const personas = await loadPersonas(db);
  const communities = await loadCommunities(db);
  const existing = await existingSeedState(db);

  console.log(
    `[seed-feed-editorial] dryRun=${dryRun} personas=${personas.size} editorialCommunities=${communities.length} existingKeys=${existing.keys.size} catalog=${FEED_EDITORIAL_POSTS.length}`
  );
  console.log("[seed-feed-editorial] before", before);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;
  const authorsUsed = new Set<string>();
  const touched = new Set<string>();
  const failures: string[] = [];

  for (const draft of FEED_EDITORIAL_POSTS) {
    const seedKey = feedEditorialKey(draft.id);
    const caption = normalizeCaption(draft.body);
    if (existing.keys.has(seedKey) || existing.captions.has(caption)) {
      skipped += 1;
      continue;
    }

    const author = personas.get(draft.personaKey.toLowerCase());
    const community = pickCommunity(communities, draft);
    if (!author || !community) {
      failed += 1;
      failures.push(
        `${draft.id}: ${!author ? `missing persona ${draft.personaKey}` : `no community for ${draft.category}`}`
      );
      continue;
    }

    if (dryRun) {
      inserted += 1;
      authorsUsed.add(author.email);
      console.log(`[dry-run] ${draft.id} -> ${community.slug} as ${author.username ?? author.email}`);
      continue;
    }

    try {
      const photo = licensedUnsplashPhoto({
        sourceId: draft.photoId,
        themes: [draft.category],
      });
      const upload = await withTimeout(storeLicensedPhoto(photo), 70_000, `upload ${draft.photoId}`);
      if (!upload.secureUrl?.startsWith("https://")) {
        throw new Error("upload returned no secure url");
      }
      const media = buildMediaProvenance(photo, upload);
      const workspace = await ensureDefaultCommunityWorkspace(db, community.id, {
        communityName: community.name,
        communitySlug: community.slug,
      });
      if (!workspace.roomId || !workspace.spaceId) {
        throw new Error("missing space/room");
      }

      const index = inserted + skipped;
      const publishedAt = atDaysAgo(1 + (index % 18), 8 + (index % 10));
      const attachments = editorialPostAttachments({
        key: seedKey,
        origin: "editorial",
        extra: {
          hashtags: draft.hashtags.map((tag) => tag.toLowerCase()),
          media,
          license: photo.license,
          attributionUrl: photo.attributionUrl,
        },
      });

      const { error } = await db.from("community_posts").insert({
        community_id: community.id,
        room_id: workspace.roomId,
        space_id: workspace.spaceId,
        author_id: author.id,
        title: draft.title,
        body: draft.body.trim(),
        post_type: "discussion",
        attachments,
        images: [upload.secureUrl],
        video_url: null,
        audience: "public",
        is_published: true,
        is_pinned: false,
        is_exclusive: false,
        published_at: publishedAt,
        created_at: publishedAt,
        updated_at: publishedAt,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        view_count: 0,
        unique_view_count: 0,
      });
      if (error) throw new Error(error.message);

      existing.keys.add(seedKey);
      existing.captions.add(caption);
      authorsUsed.add(author.email);
      touched.add(community.id);
      inserted += 1;
      console.log(`+ ${draft.id} ${community.slug}`);
    } catch (err) {
      failed += 1;
      failures.push(`${draft.id}: ${err instanceof Error ? err.message : String(err)}`);
      console.warn(`! ${draft.id}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (!dryRun && touched.size) {
    for (const communityId of touched) {
      const { count } = await db
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId)
        .eq("is_published", true);
      await db
        .from("communities")
        .update({ post_count: count ?? 0, updated_at: new Date().toISOString() })
        .eq("id", communityId);
    }
  }

  const after = dryRun
    ? before
    : {
        posts: await countTable(db, "community_posts"),
        comments: await countTable(db, "community_post_comments"),
        likes: await countTable(db, "community_post_likes"),
        reactions: await countTable(db, "community_post_reactions"),
        profiles: await countTable(db, "profiles"),
      };

  console.log("\n=== seed-feed-editorial report ===");
  console.log(`inserted: ${inserted}`);
  console.log(`skipped: ${skipped}`);
  console.log(`failed: ${failed}`);
  console.log(`authors: ${[...authorsUsed].sort().join(", ") || "(none)"}`);
  console.log("before", before);
  console.log("after", after);
  console.log(
    `preserved comments/likes/reactions/profiles: ${
      after.comments === before.comments &&
      after.likes === before.likes &&
      after.reactions === before.reactions &&
      after.profiles === before.profiles
    }`
  );
  console.log(`post delta: ${after.posts - before.posts} (expected ${dryRun ? 0 : inserted})`);
  if (failures.length) {
    console.log("failures:");
    for (const line of failures) console.log(`  - ${line}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
