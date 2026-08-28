import type { SupabaseClient } from "@supabase/supabase-js";
import { emitUgcWebhook } from "@/lib/ugc/enterprise/webhooks";
import { notifyUser } from "@/lib/notifications/notify-user";

type RunOpts = {
  brandId: string;
  eventType: string;
  campaignId?: string | null;
  entityId: string;
  payload: Record<string, unknown>;
};

type Action = { type?: string; label?: string } | string;

async function recordRun(
  db: SupabaseClient,
  opts: {
    automationId: string;
    brandId: string;
    triggerEvent: string;
    entityId: string;
    status: "completed" | "failed" | "skipped";
    error?: string | null;
  },
) {
  const insert = await db.from("ugc_automation_runs").insert({
    automation_id: opts.automationId,
    brand_id: opts.brandId,
    trigger_event: opts.triggerEvent,
    entity_id: opts.entityId,
    status: opts.status,
    error: opts.error ?? null,
  });
  if (insert.error?.code === "23505") return { duplicate: true };
  if (insert.error) return { duplicate: false, error: insert.error.message };
  return { duplicate: false };
}

async function brandOwnerUserId(db: SupabaseClient, brandId: string): Promise<string | null> {
  const { data } = await db.from("vendors").select("user_id").eq("id", brandId).maybeSingle();
  return data?.user_id ?? null;
}

export async function runUgcAutomations(db: SupabaseClient, opts: RunOpts) {
  const { data: rules } = await db
    .from("ugc_automations")
    .select("id, brand_id, campaign_id, trigger_event, actions, is_enabled, name")
    .eq("brand_id", opts.brandId)
    .eq("is_enabled", true)
    .eq("trigger_event", opts.eventType);

  const matches = (rules ?? []).filter(
    (r) => !r.campaign_id || r.campaign_id === opts.campaignId,
  );

  for (const rule of matches) {
    const entityId = `${opts.eventType}:${opts.entityId}`;
    const recorded = await recordRun(db, {
      automationId: rule.id,
      brandId: opts.brandId,
      triggerEvent: opts.eventType,
      entityId,
      status: "completed",
    });
    if (recorded.duplicate) {
      const { data: existing } = await db
        .from("ugc_automation_runs")
        .select("id, status")
        .eq("automation_id", rule.id)
        .eq("entity_id", entityId)
        .maybeSingle();
      if (existing?.status !== "failed") continue;
      await db
        .from("ugc_automation_runs")
        .update({ status: "completed", error: null })
        .eq("id", existing.id);
    }
    if (recorded.error) {
      await recordRun(db, {
        automationId: rule.id,
        brandId: opts.brandId,
        triggerEvent: opts.eventType,
        entityId: `${entityId}:err`,
        status: "failed",
        error: recorded.error,
      });
      continue;
    }

    const actions: Action[] = Array.isArray(rule.actions) ? rule.actions : [];
    const ownerId = await brandOwnerUserId(db, opts.brandId);
    let failed: string | null = null;

    for (const raw of actions) {
      const type = typeof raw === "string" ? raw : String(raw.type ?? raw.label ?? "");
      try {
        if (type === "notify_brand" || type === "notification" || type === "notify") {
          if (ownerId) {
            await notifyUser(db, {
              userId: ownerId,
              type: "system",
              title: rule.name || "UGC automation",
              message: `${opts.eventType} fired for your campaign.`,
              data: { event: opts.eventType, ...opts.payload },
            });
          }
        } else if (type === "webhook" || type === "emit_webhook") {
          await emitUgcWebhook(db, opts.brandId, opts.eventType, opts.payload);
        } else if (type === "notify_creator") {
          const creatorUserId =
            typeof opts.payload.creatorUserId === "string" ? opts.payload.creatorUserId : null;
          if (creatorUserId) {
            await notifyUser(db, {
              userId: creatorUserId,
              type: "influencer",
              title: rule.name || "Campaign update",
              message: `${opts.eventType} on your UGC campaign.`,
              data: { event: opts.eventType, ...opts.payload },
            });
          }
        }
      } catch (err) {
        failed = err instanceof Error ? err.message : String(err);
      }
    }

    if (failed) {
      await db
        .from("ugc_automation_runs")
        .update({ status: "failed", error: failed })
        .eq("automation_id", rule.id)
        .eq("entity_id", entityId);
    }
  }
}
