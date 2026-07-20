import { getAdminDB } from "@/services/base";
import { writeAuditEvent } from "@/services/ops/audit";

type ReportSource = "ugc_reports" | "community_content_reports";

type UnifiedReport = {
  id: string;
  source: ReportSource;
  created_at: string | null;
  status?: string | null;
  reason?: string | null;
  [key: string]: unknown;
};

export async function listUnifiedReports(limit = 100): Promise<UnifiedReport[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminDB() as any;

  const [ugcRes, communityRes] = await Promise.all([
    db.from("ugc_reports").select("*").order("created_at", { ascending: false }).limit(limit),
    db
      .from("community_content_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const ugc: UnifiedReport[] = (ugcRes.error ? [] : ugcRes.data ?? []).map(
    (row: Record<string, unknown>) => ({
      ...row,
      id: String(row.id),
      created_at: (row.created_at as string | null) ?? null,
      source: "ugc_reports" as const,
    })
  );
  const community: UnifiedReport[] = (communityRes.error ? [] : communityRes.data ?? []).map(
    (row: Record<string, unknown>) => ({
      ...row,
      id: String(row.id),
      created_at: (row.created_at as string | null) ?? null,
      source: "community_content_reports" as const,
    })
  );

  return [...ugc, ...community]
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, limit);
}

export async function resolveReport(input: {
  source: ReportSource;
  id: string;
  actorId: string;
  resolution?: string;
}) {
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminDB() as any;

  if (input.source === "ugc_reports") {
    const { error } = await db
      .from("ugc_reports")
      .update({
        status: "resolved",
        reviewed_by: input.actorId,
        reviewed_at: now,
      })
      .eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await db
      .from("community_content_reports")
      .update({
        status: "resolved",
        updated_at: now,
      })
      .eq("id", input.id);
    if (error) throw error;
  }

  await writeAuditEvent({
    actorId: input.actorId,
    action: "report.resolved",
    entityType: input.source,
    entityId: input.id,
    metadata: { resolution: input.resolution ?? null },
  });
}

export async function listSuspendedUsers(limit = 30) {
  const { data, error } = await getAdminDB()
    .from("profiles")
    .select("id, email, full_name, updated_at, is_active")
    .eq("is_active", false)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return error ? [] : data ?? [];
}
