import { getAdminDB } from "@/services/base";
import { writeAuditEvent } from "@/services/ops/audit";

type ReportSource = "ugc_reports" | "community_content_reports";

function admin() {
  return getAdminDB();
}

async function safeRows<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const result = await query;
  return result.error ? [] : result.data ?? [];
}

export async function listUnifiedReports(limit = 100) {
  const [ugc, community] = await Promise.all([
    safeRows(
      admin()
        .from("ugc_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)
    ),
    safeRows(
      admin()
        .from("community_content_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)
    ),
  ]);

  return [
    ...ugc.map((row) => ({ ...row, source: "ugc_reports" as const })),
    ...community.map((row) => ({
      ...row,
      source: "community_content_reports" as const,
    })),
  ]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
}

export async function resolveReport(input: {
  source: ReportSource;
  id: string;
  actorId: string;
  resolution?: string;
}) {
  const now = new Date().toISOString();

  if (input.source === "ugc_reports") {
    const { error } = await admin()
      .from("ugc_reports")
      .update({
        status: "resolved",
        reviewed_by: input.actorId,
        reviewed_at: now,
      })
      .eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await admin()
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
  // Account status lives on auth user metadata; surface recent profiles as a
  // lightweight ops hint. Detailed enforcement remains in admin-users actions.
  const { data, error } = await admin()
    .from("profiles")
    .select("id, email, full_name, updated_at, is_active")
    .eq("is_active", false)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return error ? [] : data ?? [];
}
