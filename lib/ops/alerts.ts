import { getAdminDB } from "@/services/base";
import { logger } from "@/lib/ops/logger";

export async function recordAlert(input: {
  severity: "critical" | "warning" | "info";
  source: string;
  title: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await (getAdminDB() as any).from("ops_alert_events").insert({
    ...input,
    metadata: input.metadata ?? {},
  });
  if (error) {
    logger.error("ops_alert_write_failed", { source: input.source, error: error.message });
    return false;
  }
  return true;
}
