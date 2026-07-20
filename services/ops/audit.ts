import { getAdminDB } from "@/services/base";
import { logger } from "@/lib/ops/logger";

export async function writeAuditEvent(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const { error } = await (getAdminDB() as any).from("admin_audit_events").insert({
    actor_id: input.actorId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ip: input.ip ?? null,
    user_agent: input.userAgent ?? null,
  });
  if (error) logger.error("audit_event_write_failed", { action: input.action, error: error.message });
}

export async function listAuditEvents(limit = 20) {
  const { data, error } = await (getAdminDB() as any)
    .from("admin_audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) throw error;
  return data ?? [];
}
