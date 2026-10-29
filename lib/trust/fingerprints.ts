import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hamming } from "./media-inspect";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createServiceRoleClient() as unknown as { from: (t: string) => any };

export type SeenBefore = { count: number; firstSeenAt: string | null; near: boolean };

/** How often Jimvio has seen this exact file (SHA-256) before this scan. */
export async function seenFile(sha: string): Promise<SeenBefore> {
  const { data } = await db().from("trust_fingerprints").select("seen_count, first_seen_at").eq("kind", "sha256").eq("value", sha).maybeSingle();
  return { count: Number(data?.seen_count ?? 0), firstSeenAt: data?.first_seen_at ?? null, near: false };
}

/** Same or visually near-identical image (difference hash within 5 bits). */
export async function seenImage(dhash: string): Promise<SeenBefore> {
  const { data: exact } = await db().from("trust_fingerprints").select("seen_count, first_seen_at").eq("kind", "dhash").eq("value", dhash).maybeSingle();
  if (exact) return { count: Number(exact.seen_count ?? 0), firstSeenAt: exact.first_seen_at ?? null, near: false };
  const { data: recent } = await db()
    .from("trust_fingerprints")
    .select("value, first_seen_at")
    .eq("kind", "dhash")
    .order("first_seen_at", { ascending: false })
    .limit(5000);
  const near = ((recent ?? []) as { value: string; first_seen_at: string }[]).find((r) => /^[0-9a-f]{16}$/.test(r.value) && hamming(r.value, dhash) <= 5);
  return near ? { count: 1, firstSeenAt: near.first_seen_at, near: true } : { count: 0, firstSeenAt: null, near: false };
}

export async function rememberFingerprints(scanId: string, items: { kind: "sha256" | "dhash"; value: string }[]): Promise<void> {
  for (const it of items) {
    const { data } = await db().from("trust_fingerprints").select("id, seen_count").eq("kind", it.kind).eq("value", it.value).maybeSingle();
    if (data?.id) {
      await db().from("trust_fingerprints").update({ seen_count: Number(data.seen_count ?? 1) + 1 }).eq("id", data.id);
    } else {
      await db().from("trust_fingerprints").insert({ kind: it.kind, value: it.value, first_scan_id: scanId });
    }
  }
}
