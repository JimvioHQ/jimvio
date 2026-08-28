import type { SupabaseClient } from "@supabase/supabase-js";
import { emitUgcWebhook } from "@/lib/ugc/enterprise/webhooks";
import { runUgcAutomations } from "@/lib/ugc/enterprise/run-automations";

export async function emitUgcEvent(
  db: SupabaseClient,
  brandId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  await emitUgcWebhook(db, brandId, eventType, payload);
  await runUgcAutomations(db, {
    brandId,
    eventType,
    campaignId: typeof payload.campaignId === "string" ? payload.campaignId : null,
    entityId:
      typeof payload.submissionId === "string"
        ? payload.submissionId
        : typeof payload.participantId === "string"
          ? payload.participantId
          : typeof payload.campaignId === "string"
            ? payload.campaignId
            : eventType,
    payload,
  });
}
