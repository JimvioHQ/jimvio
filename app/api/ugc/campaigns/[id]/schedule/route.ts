import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canReadCampaign, requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";
import {
  buildCampaignSchedule,
  type CampaignScheduleEvent,
  type CampaignScheduleKind,
} from "@/lib/ugc/campaign-schedule";
import type { UGCCampaign } from "@/types/ugc";

const KINDS = new Set<CampaignScheduleKind>([
  "campaign_start",
  "campaign_end",
  "content_deadline",
  "live_date",
  "submission_deadline",
  "review_start",
  "review_end",
  "payment",
  "custom",
]);

function mapCustom(row: {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  metadata: Record<string, unknown> | null;
}): CampaignScheduleEvent {
  const kind = KINDS.has(row.event_type as CampaignScheduleKind)
    ? (row.event_type as CampaignScheduleKind)
    : "custom";
  return {
    id: row.id,
    kind,
    title: row.title,
    description: row.description,
    date: row.starts_at,
    ends_at: row.ends_at,
    metadata: row.metadata,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createServiceRoleClient();
  const { data: campaign, error } = await db
    .from("ugc_campaigns")
    .select(
      `
      *,
      media:ugc_campaign_media(*),
      vendor:vendors!brand_id (
        business_name,
        business_logo,
        business_slug
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const readable = await canReadCampaign(db, user?.id ?? null, {
    status: campaign.status,
    brand_id: campaign.brand_id,
  });
  if (!readable) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: customRows } = await db
    .from("ugc_campaign_events")
    .select("id, event_type, title, description, starts_at, ends_at, metadata")
    .eq("campaign_id", id)
    .order("starts_at", { ascending: true });

  const custom = (customRows ?? []).map(mapCustom);
  const events = buildCampaignSchedule(campaign as UGCCampaign, custom);

  return NextResponse.json({
    campaign,
    events,
    custom,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireCampaignPermission(user.id, id, "campaigns.manage");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const date = String(body.starts_at ?? body.date ?? "").trim();
  if (!title) return NextResponse.json({ error: "Event title is required" }, { status: 400 });
  if (!date || Number.isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "A valid event date is required" }, { status: 400 });
  }
  const eventType = KINDS.has(body.event_type) ? body.event_type : "custom";

  const { data, error } = await access.db
    .from("ugc_campaign_events")
    .insert({
      campaign_id: id,
      created_by: user.id,
      event_type: eventType,
      title,
      description: typeof body.description === "string" ? body.description.trim() : null,
      starts_at: new Date(date).toISOString(),
      ends_at: body.ends_at ? new Date(String(body.ends_at)).toISOString() : null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save campaign event" }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
