/**
 * Idempotent licensed photo seeder for existing Jimvio editorial communities.
 *
 * Usage:
 *   npm run seed:community-content
 *   npm run seed:community-content -- --dry-run
 *   npm run seed:community-content -- --limit=20 --posts-per-community=5
 *   npm run seed:community-content -- --slug=faith-and-inspiration
 *
 * Safety:
 * - Uses assertProductionScriptAllowed (set ALLOW_PRODUCTION_SCRIPT=1 for prod)
 * - Only editorial communities (settings.jimvio.origin === "editorial")
 * - Only existing editorial persona authors (editorial+*@jimvio.com)
 * - Never creates users, likes, comments, or followers
 * - Never touches preserved slugs: forex-hub, gcs-unity
 * - Never deletes or overwrites existing production posts
 *
 * Media path:
 *   licensed Unsplash photo → validate → Cloudinary (jimvio/communities) → community_posts
 */
import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildMediaProvenance,
  buildPhotoCaption,
  captionKinds,
  catalogStats,
  downloadAndValidateImage,
  photoContentKey,
  PHOTO_CONTENT_KEY_PREFIX,
  selectPhotosForCommunity,
  uploadValidatedImageToCloudinary,
  type CommunityPhotoTarget,
} from "../lib/community/photo-content";
import {
  editorialPostAttachments,
  JIMVIO_EDITORIAL_AUTHOR_EMAIL,
  readCommunityEditorialOrigin,
  readPostEditorialMeta,
} from "../lib/community/editorial-origin";
import { isEditorialPersonaEmail } from "../lib/community/editorial-personas";
import { ensureDefaultCommunityWorkspace } from "../lib/community/ensure-default-workspace";
import { assertProductionScriptAllowed } from "../lib/ops/script-safety";

// Capture Cloudinary from the process environment first (e.g. `vercel env run`),
// then load .env.local with override so local Supabase URL/keys always win.
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

if (process.env.JIMVIO_ENV_FILE) {
  const before = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secret: process.env.SUPABASE_SECRET_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  loadEnv({ path: process.env.JIMVIO_ENV_FILE, override: true });
  if (before.url) process.env.NEXT_PUBLIC_SUPABASE_URL = before.url;
  if (before.secret) process.env.SUPABASE_SECRET_KEY = before.secret;
  if (before.service) process.env.SUPABASE_SERVICE_ROLE_KEY = before.service;
}

assertProductionScriptAllowed("seed-community-content");

const PRESERVED = new Set(["forex-hub", "gcs-unity"]);
const DEFAULT_POSTS = 5;
const CONCURRENCY = 2;

type Args = {
  dryRun: boolean;
  limit: number | null;
  postsPerCommunity: number;
  slug: string | null;
  preferApi: boolean;
  skipExistingCovers: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    limit: null,
    postsPerCommunity: DEFAULT_POSTS,
    slug: null,
    preferApi: Boolean(
      process.env.UNSPLASH_ACCESS_KEY?.trim() || process.env.UNSPLASH_API_KEY?.trim()
    ),
    skipExistingCovers: true,
  };
  for (const raw of argv) {
    if (raw === "--dry-run") args.dryRun = true;
    else if (raw === "--prefer-api") args.preferApi = true;
    else if (raw.startsWith("--limit=")) {
      const n = Number(raw.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n);
    } else if (raw.startsWith("--posts-per-community=")) {
      const n = Number(raw.slice("--posts-per-community=".length));
      if (Number.isFinite(n) && n > 0) args.postsPerCommunity = Math.min(12, Math.floor(n));
    } else if (raw.startsWith("--slug=")) {
      args.slug = raw.slice("--slug=".length).trim() || null;
    }
  }
  return args;
}

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");
  }
  return { url, key };
}

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|429|503|502|network|timeout/i.test(
    msg
  );
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isTransient(err) || i === attempts) break;
      const waitMs = Math.min(20_000, 700 * 2 ** (i - 1));
      console.warn(`retry ${i}/${attempts} ${label}: ${err instanceof Error ? err.message : err}`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw last;
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
) {
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      await worker(items[i]!, i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, () => run())
  );
}

function atDaysAgo(daysAgo: number, hour: number): string {
  const date = new Date(Date.now() - daysAgo * 86_400_000);
  date.setUTCHours(hour % 24, (daysAgo * 11) % 60, (daysAgo * 17) % 60, 0);
  return date.toISOString();
}

type PersonaRow = { id: string; email: string; full_name: string | null; username: string | null };

async function loadEditorialPersonas(db: SupabaseClient): Promise<PersonaRow[]> {
  const rows: PersonaRow[] = [];
  let from = 0;
  const page = 500;
  for (;;) {
    const { data, error } = await db
      .from("profiles")
      .select("id, email, full_name, username")
      // Avoid `+` in PostgREST querystrings (becomes space). Filter precisely client-side.
      .ilike("email", "editorial%@jimvio.com")
      .eq("is_active", true)
      .range(from, from + page - 1);
    if (error) throw new Error(`load personas: ${error.message}`);
    const batch = (data ?? []) as PersonaRow[];
    rows.push(...batch.filter((r) => isEditorialPersonaEmail(r.email)));
    if (batch.length < page) break;
    from += page;
  }

  const { data: admin } = await db
    .from("profiles")
    .select("id, email, full_name, username")
    .eq("email", JIMVIO_EDITORIAL_AUTHOR_EMAIL)
    .maybeSingle();
  if (admin?.id && !rows.some((r) => r.id === admin.id)) {
    rows.push(admin as PersonaRow);
  }

  if (!rows.length) {
    throw new Error("No editorial personas found — run seed-community-world first");
  }
  return rows;
}

async function loadEditorialCommunities(
  db: SupabaseClient,
  args: Args
): Promise<CommunityPhotoTarget[]> {
  const { data, error } = await db
    .from("communities")
    .select("id, slug, name, category, tagline, description, settings, is_private, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(`load communities: ${error.message}`);

  const out: CommunityPhotoTarget[] = [];
  for (const row of data ?? []) {
    const slug = String(row.slug ?? "");
    if (!slug || PRESERVED.has(slug)) continue;
    if (args.slug && slug !== args.slug) continue;
    if (readCommunityEditorialOrigin(row.settings) !== "editorial") continue;
    out.push({
      id: row.id as string,
      slug,
      name: String(row.name ?? slug),
      category: String(row.category ?? "Other"),
      tagline: (row.tagline as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      isPrivate: Boolean(row.is_private),
    });
  }
  if (args.limit) return out.slice(0, args.limit);
  return out;
}

function pickAuthor(personas: PersonaRow[], _category: string, salt: string): string {
  const pool = personas.filter((p) => isEditorialPersonaEmail(p.email));
  const authors = pool.length ? pool : personas;
  let h = 0;
  for (let i = 0; i < salt.length; i++) h = (h * 31 + salt.charCodeAt(i)) >>> 0;
  return authors[h % authors.length]!.id;
}

async function existingPhotoKeys(
  db: SupabaseClient,
  communityId: string
): Promise<Set<string>> {
  const keys = new Set<string>();
  const { data, error } = await db
    .from("community_posts")
    .select("attachments")
    .eq("community_id", communityId);
  if (error) throw new Error(`load posts: ${error.message}`);
  for (const row of data ?? []) {
    const meta = readPostEditorialMeta(row.attachments);
    if (meta.key?.startsWith(PHOTO_CONTENT_KEY_PREFIX)) keys.add(meta.key);
  }
  return keys;
}

async function seedCommunity(
  db: SupabaseClient,
  community: CommunityPhotoTarget,
  personas: PersonaRow[],
  args: Args,
  stats: SeedStats
): Promise<void> {
  const existingKeys = await existingPhotoKeys(db, community.id);
  const excludeSourceIds = new Set<string>();
  for (const key of existingKeys) {
    const parts = key.slice(PHOTO_CONTENT_KEY_PREFIX.length).split(":");
    if (parts.length >= 2) excludeSourceIds.add(parts.slice(1).join(":"));
  }

  const needed = args.postsPerCommunity;
  const already = [...existingKeys].filter((k) =>
    k.startsWith(`${PHOTO_CONTENT_KEY_PREFIX}${community.slug}:`)
  ).length;
  const toCreate = Math.max(0, needed - already);
  if (toCreate === 0) {
    stats.skippedCommunities += 1;
    stats.skippedPosts += already;
    return;
  }

  const selected = await selectPhotosForCommunity({
    category: community.category,
    slug: community.slug,
    name: community.name,
    description: community.description ?? community.tagline,
    count: toCreate + 3, // buffer for validation rejects
    excludeSourceIds,
    preferApiSearch: args.preferApi,
  });

  if (!selected.photos.length) {
    stats.unseedable.push(`${community.slug} (${community.category})`);
    return;
  }

  const workspace = await ensureDefaultCommunityWorkspace(db, community.id, {
    communityName: community.name,
    communitySlug: community.slug,
  });
  if (!workspace.spaceId || !workspace.roomId) {
    throw new Error(`[${community.slug}] missing space/room`);
  }

  let created = 0;
  for (let i = 0; i < selected.photos.length && created < toCreate; i++) {
    const photo = selected.photos[i]!;
    const key = photoContentKey(community.slug, photo.sourceId);
    if (existingKeys.has(key)) {
      stats.duplicatesPrevented += 1;
      continue;
    }

    const kinds = captionKinds();
    const caption = buildPhotoCaption({
      category: community.category,
      communityName: community.name,
      salt: key,
      kind: kinds[i % kinds.length],
    });

    if (args.dryRun) {
      console.log(
        `[dry-run] ${community.slug} ← ${photo.provider}:${photo.sourceId} — ${caption.body.slice(0, 60)}`
      );
      created += 1;
      stats.createdPosts += 1;
      continue;
    }

    try {
      const validated = await withRetry(`download ${photo.sourceId}`, () =>
        downloadAndValidateImage(photo.sourceUrl)
      );
      const upload = await withRetry(`upload ${photo.sourceId}`, () =>
        uploadValidatedImageToCloudinary(validated, photo)
      );
      const media = buildMediaProvenance(photo, upload);
      const daysAgo = 1 + ((i * 2 + community.slug.length) % 12);
      const hour = 8 + ((i * 3) % 12);
      const publishedAt = atDaysAgo(daysAgo, hour);

      const attachments = editorialPostAttachments({
        key,
        origin: "editorial",
        extra: {
          media,
        },
      });

      const { error } = await db.from("community_posts").insert({
        community_id: community.id,
        room_id: workspace.roomId,
        space_id: workspace.spaceId,
        author_id: pickAuthor(personas, community.category, key),
        title: caption.title,
        body: caption.body,
        post_type: "discussion",
        attachments,
        images: [upload.secureUrl],
        video_url: null,
        audience: community.isPrivate ? "community" : "public",
        is_published: true,
        is_pinned: false,
        is_exclusive: false,
        published_at: publishedAt,
        created_at: publishedAt,
        updated_at: publishedAt,
        // No fabricated engagement
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        view_count: 0,
        unique_view_count: 0,
      });

      if (error) {
        if (/duplicate|unique/i.test(error.message)) {
          stats.duplicatesPrevented += 1;
          continue;
        }
        throw new Error(`[${community.slug}] insert: ${error.message}`);
      }

      existingKeys.add(key);
      excludeSourceIds.add(photo.sourceId);
      created += 1;
      stats.createdPosts += 1;
      stats.providers.add(photo.provider);
      console.log(`+ ${community.slug} photo ${created}/${toCreate} (${photo.sourceId})`);
    } catch (err) {
      stats.rejectedImages += 1;
      console.warn(
        `! skip ${community.slug} ${photo.sourceId}: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  if (created > 0) {
    stats.populatedCommunities += 1;
    const { count } = await db
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("community_id", community.id)
      .eq("is_published", true);
    await db
      .from("communities")
      .update({ post_count: count ?? 0, updated_at: new Date().toISOString() })
      .eq("id", community.id);
  } else if (toCreate > 0) {
    stats.unseedable.push(`${community.slug} (${community.category}) — validation failures`);
  }
}

type SeedStats = {
  communities: number;
  personas: number;
  createdPosts: number;
  skippedPosts: number;
  skippedCommunities: number;
  populatedCommunities: number;
  duplicatesPrevented: number;
  rejectedImages: number;
  unseedable: string[];
  providers: Set<string>;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { url, key } = requireEnv();
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const statsCatalog = catalogStats();
  console.log(
    `[seed-community-content] catalog: ${statsCatalog.categories} categories, ${statsCatalog.uniquePhotos} unique photos`
  );
  console.log(
    `[seed-community-content] mode=${args.dryRun ? "dry-run" : "write"} postsPerCommunity=${args.postsPerCommunity} preferApi=${args.preferApi}`
  );

  const personas = await loadEditorialPersonas(db);
  const communities = await loadEditorialCommunities(db, args);
  console.log(
    `[seed-community-content] discovered ${communities.length} editorial communities, ${personas.length} editorial personas`
  );

  const stats: SeedStats = {
    communities: communities.length,
    personas: personas.length,
    createdPosts: 0,
    skippedPosts: 0,
    skippedCommunities: 0,
    populatedCommunities: 0,
    duplicatesPrevented: 0,
    rejectedImages: 0,
    unseedable: [],
    providers: new Set(),
  };

  await mapPool(communities, CONCURRENCY, async (community) => {
    await withRetry(`community ${community.slug}`, () =>
      seedCommunity(db, community, personas, args, stats)
    );
  });

  console.log("\n=== seed-community-content report ===");
  console.log(`editorial communities: ${stats.communities}`);
  console.log(`editorial personas: ${stats.personas}`);
  console.log(`posts created: ${stats.createdPosts}`);
  console.log(`communities newly populated: ${stats.populatedCommunities}`);
  console.log(`communities already satisfied: ${stats.skippedCommunities}`);
  console.log(`duplicates prevented: ${stats.duplicatesPrevented}`);
  console.log(`rejected images: ${stats.rejectedImages}`);
  console.log(`providers: ${[...stats.providers].join(", ") || "(none)"}`);
  if (stats.unseedable.length) {
    console.log(`unseedable / skipped for imagery:`);
    for (const line of stats.unseedable.slice(0, 40)) console.log(`  - ${line}`);
    if (stats.unseedable.length > 40) {
      console.log(`  …and ${stats.unseedable.length - 40} more`);
    }
  }
  console.log("existing production posts: preserved (additive only)");
  console.log("engagement: none fabricated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
