import "server-only";

/** Resolve public account ticks from authoritative verification records only. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VerificationDb = { from: any };

export async function loadVerifiedUserIds(db: VerificationDb, userIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Set();

  // Keep PostgREST URLs bounded; feed pages can contain hundreds of authors.
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));

  const batches = await Promise.all(chunks.map(async (chunk) => Promise.allSettled([
    db.from("jip_identity").select("user_id").in("user_id", chunk).eq("identity_verified", true),
    db.from("influencers").select("user_id").in("user_id", chunk).eq("is_verified", true),
    db.from("vendors").select("user_id").in("user_id", chunk).eq("verification_status", "verified"),
  ])));

  const verified = new Set<string>();
  for (const batch of batches) {
    for (const result of batch) {
      if (result.status !== "fulfilled") continue;
      for (const row of Array.isArray(result.value?.data) ? result.value.data : []) {
        if (typeof row?.user_id === "string") verified.add(row.user_id);
      }
    }
  }
  return verified;
}
