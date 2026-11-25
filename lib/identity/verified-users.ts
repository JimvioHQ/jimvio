import "server-only";

/** Resolve public account ticks from authoritative verification records only. */
type VerificationDb = { from: (table: string) => any };

export async function loadVerifiedUserIds(db: VerificationDb, userIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Set();
  const queries = await Promise.allSettled([
    db.from("jip_identity").select("user_id").in("user_id", ids).eq("identity_verified", true),
    db.from("influencers").select("user_id").in("user_id", ids).eq("is_verified", true),
    db.from("vendors").select("user_id").in("user_id", ids).eq("verification_status", "verified"),
  ]);
  const verified = new Set<string>();
  for (const result of queries) {
    if (result.status !== "fulfilled") continue;
    for (const row of Array.isArray(result.value?.data) ? result.value.data : []) {
      if (typeof row?.user_id === "string") verified.add(row.user_id);
    }
  }
  return verified;
}
