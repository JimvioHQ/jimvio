/**
 * Replace broken googleapis sample video URLs with Cloudinary demo assets.
 * Idempotent. Usage: npx tsx scripts/tmp/fix-community-video-urls.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(root, ".env.local") });

const REPLACEMENTS = [
  {
    from: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    to: "https://res.cloudinary.com/demo/video/upload/ski_jump.mp4",
  },
  {
    from: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    to: "https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4",
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const db = createClient(url, key, { auth: { persistSession: false } });

  let updated = 0;
  for (const { from, to } of REPLACEMENTS) {
    const { data, error } = await db
      .from("community_posts")
      .update({ video_url: to })
      .eq("video_url", from)
      .select("id");
    if (error) throw error;
    updated += data?.length ?? 0;
    console.log(`replaced ${data?.length ?? 0}: ${from.slice(0, 60)}…`);
  }
  console.log(`done. updated=${updated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
