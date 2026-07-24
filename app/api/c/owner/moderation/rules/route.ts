import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  DEFAULT_AUTO_MOD_RULES,
  mapAutoModRule,
  resolveModerationContext,
} from "@/lib/community/owner-console/moderation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const ctx = await resolveModerationContext(
    supabase,
    user.id,
    communityId,
    "moderation.view"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("community_auto_moderation_rules")
    .select(
      "id, community_id, rule_key, name, description, enabled, severity, action, config, updated_at"
    )
    .eq("community_id", communityId)
    .order("rule_key", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const existing = (data ?? []).map(mapAutoModRule);
  const have = new Set(existing.map((r) => r.ruleKey));
  const missing = DEFAULT_AUTO_MOD_RULES.filter((d) => !have.has(d.ruleKey));

  return NextResponse.json({
    rules: existing,
    catalog: DEFAULT_AUTO_MOD_RULES,
    missing: missing.map((m) => m.ruleKey),
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    communityId?: string;
    seedDefaults?: boolean;
    ruleKey?: string;
    name?: string;
    description?: string | null;
    enabled?: boolean;
    severity?: string;
    action?: string;
    config?: Record<string, unknown>;
  };

  const communityId = body.communityId?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const ctx = await resolveModerationContext(
    supabase,
    user.id,
    communityId,
    "moderation.manage"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();

  if (body.seedDefaults) {
    const rows = DEFAULT_AUTO_MOD_RULES.map((r) => ({
      community_id: communityId,
      rule_key: r.ruleKey,
      name: r.name,
      description: r.description,
      enabled: false,
      severity: r.severity,
      action: r.action,
      config: r.config,
      created_by: user.id,
    }));
    const { data, error } = await admin
      .from("community_auto_moderation_rules")
      .upsert(rows, { onConflict: "community_id,rule_key" })
      .select(
        "id, community_id, rule_key, name, description, enabled, severity, action, config, updated_at"
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({
      rules: (data ?? []).map(mapAutoModRule),
      seeded: true,
    });
  }

  const def = DEFAULT_AUTO_MOD_RULES.find((r) => r.ruleKey === body.ruleKey);
  const ruleKey = body.ruleKey?.trim() || def?.ruleKey;
  if (!ruleKey) {
    return NextResponse.json({ error: "ruleKey is required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("community_auto_moderation_rules")
    .upsert(
      {
        community_id: communityId,
        rule_key: ruleKey,
        name: body.name ?? def?.name ?? ruleKey,
        description: body.description ?? def?.description ?? null,
        enabled: Boolean(body.enabled),
        severity: body.severity ?? def?.severity ?? "medium",
        action: body.action ?? def?.action ?? "flag",
        config: body.config ?? def?.config ?? {},
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "community_id,rule_key" }
    )
    .select(
      "id, community_id, rule_key, name, description, enabled, severity, action, config, updated_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Save failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ rule: mapAutoModRule(data) });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    communityId?: string;
    ruleId?: string;
    enabled?: boolean;
    severity?: string;
    action?: string;
    config?: Record<string, unknown>;
    name?: string;
    description?: string | null;
  };

  const communityId = body.communityId?.trim() ?? "";
  const ruleId = body.ruleId?.trim() ?? "";
  if (!communityId || !ruleId) {
    return NextResponse.json(
      { error: "communityId and ruleId are required" },
      { status: 400 }
    );
  }

  const ctx = await resolveModerationContext(
    supabase,
    user.id,
    communityId,
    "moderation.manage"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.enabled !== undefined) patch.enabled = body.enabled;
  if (body.severity !== undefined) patch.severity = body.severity;
  if (body.action !== undefined) patch.action = body.action;
  if (body.config !== undefined) patch.config = body.config;
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("community_auto_moderation_rules")
    .update(patch)
    .eq("id", ruleId)
    .eq("community_id", communityId)
    .select(
      "id, community_id, rule_key, name, description, enabled, severity, action, config, updated_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Update failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ rule: mapAutoModRule(data) });
}
