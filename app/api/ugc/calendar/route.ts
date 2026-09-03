import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";
import {
  calendarEventHref,
  isIsoInInclusiveRange,
  isSkippedCampaignStatus,
  type UgcCalendarEvent,
  type UgcCalendarEventType,
} from "@/lib/ugc/calendar";

export const dynamic = "force-dynamic";

type CampaignLite = {
  id: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string | null;
  content_deadline?: string | null;
  live_at?: string | null;
  submission_deadline?: string | null;
  review_starts_at?: string | null;
  review_ends_at?: string | null;
  payment_at?: string | null;
};

function pushEvent(
  events: UgcCalendarEvent[],
  seen: Set<string>,
  event: UgcCalendarEvent,
) {
  const key = `${event.type}:${event.campaign_id ?? event.id}:${event.date}`;
  if (seen.has(key)) return;
  seen.add(key);
  events.push(event);
}

function maybePush(
  events: UgcCalendarEvent[],
  seen: Set<string>,
  from: string | null,
  to: string | null,
  input: {
    id: string;
    type: UgcCalendarEventType;
    title: string;
    date: string | null | undefined;
    campaignId: string | null;
    status: string | null;
    participantStatus?: string | null;
  },
) {
  const date = input.date?.trim();
  if (!date) return;
  if (!isIsoInInclusiveRange(date, from, to)) return;
  pushEvent(events, seen, {
    id: input.id,
    type: input.type,
    title: input.title,
    date,
    href: calendarEventHref({
      type: input.type,
      campaignId: input.campaignId,
      participantStatus: input.participantStatus,
    }),
    campaign_id: input.campaignId,
    status: input.status,
  });
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const { db, influencer, ready, completion } = await requireInfluencer(user.id);
  if (!ready || !influencer) {
    return NextResponse.json({
      data: [],
      needsProfile: true,
      complete: false,
      missing: completion.missing,
    });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const events: UgcCalendarEvent[] = [];
  const seen = new Set<string>();

  const [participantsRes, invitationsRes, payoutsRes] = await Promise.all([
    db
      .from("ugc_campaign_participants")
      .select(
        `
      status,
      campaign:ugc_campaigns!campaign_id (
        id, title, starts_at, ends_at, status,
        content_deadline, live_at, submission_deadline,
        review_starts_at, review_ends_at, payment_at
     
      )
    `,
      )
      .eq("influencer_id", influencer.id)
      .in("status", ["accepted", "invited", "pending", "waitlisted"]),
    db
      .from("ugc_creator_invitations")
      .select(
        `
      id, status,
      campaign:ugc_campaigns!campaign_id ( id, title, ends_at, status )
    `,
      )
      .or(`invitee_user_id.eq.${user.id},influencer_id.eq.${influencer.id}`)
      .eq("status", "pending"),
    db
      .from("ugc_payouts")
      .select(
        `
      id, status, paid_at, submission_id,
      submission:ugc_submissions!submission_id (
        campaign_id,
        campaign:ugc_campaigns!campaign_id ( id, title )
      )
    `,
      )
      .eq("influencer_id", influencer.id)
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(100),
  ]);

  for (const row of participantsRes.data ?? []) {
    const campaign = row.campaign as unknown as CampaignLite | null;
    if (!campaign?.id) continue;
    if (isSkippedCampaignStatus(campaign.status)) continue;
    const title = campaign.title?.trim() || campaign.id;
    const participantStatus = String(row.status ?? "");

    maybePush(events, seen, from, to, {
      id: `campaign-start-${campaign.id}`,
      type: "campaign_start",
      title,
      date: campaign.starts_at,
      campaignId: campaign.id,
      status: participantStatus,
      participantStatus,
    });
    maybePush(events, seen, from, to, {
      id: `campaign-end-${campaign.id}`,
      type: "campaign_end",
      title,
      date: campaign.ends_at,
      campaignId: campaign.id,
      status: participantStatus,
      participantStatus,
    });
    maybePush(events, seen, from, to, {
      id: `content-deadline-${campaign.id}`,
      type: "content_deadline",
      title,
      date: campaign.content_deadline ?? null,
      campaignId: campaign.id,
      status: participantStatus,
      participantStatus,
    });
    maybePush(events, seen, from, to, {
      id: `live-date-${campaign.id}`,
      type: "live_date",
      title,
      date: campaign.live_at ?? null,
      campaignId: campaign.id,
      status: participantStatus,
      participantStatus,
    });
    maybePush(events, seen, from, to, {
      id: `review-${campaign.id}`,
      type: "review",
      title,
      date: campaign.review_starts_at ?? campaign.review_ends_at ?? null,
      campaignId: campaign.id,
      status: participantStatus,
      participantStatus,
    });
    maybePush(events, seen, from, to, {
      id: `payment-${campaign.id}`,
      type: "payment",
      title,
      date: campaign.payment_at ?? null,
      campaignId: campaign.id,
      status: participantStatus,
      participantStatus,
    });
    if (
      participantStatus === "pending" ||
      participantStatus === "waitlisted" ||
      participantStatus === "invited"
    ) {
      maybePush(events, seen, from, to, {
        id: `application-deadline-${campaign.id}`,
        type: "application_deadline",
        title,
        date: campaign.ends_at,
        campaignId: campaign.id,
        status: participantStatus,
        participantStatus,
      });
    }
    if (participantStatus === "accepted") {
      maybePush(events, seen, from, to, {
        id: `submission-deadline-${campaign.id}`,
        type: "submission_deadline",
        title,
        date: campaign.submission_deadline ?? campaign.ends_at,
        campaignId: campaign.id,
        status: participantStatus,
        participantStatus,
      });
    }
  }

  const campaignIds = (participantsRes.data ?? [])
    .map((row) => (row.campaign as unknown as CampaignLite | null)?.id)
    .filter((id): id is string => Boolean(id));
  if (campaignIds.length > 0) {
    const { data: customEvents } = await db
      .from("ugc_campaign_events")
      .select("id, campaign_id, event_type, title, starts_at, description")
      .in("campaign_id", campaignIds);
    for (const custom of customEvents ?? []) {
      const type = (
        custom.event_type === "live_date" ||
        custom.event_type === "content_deadline" ||
        custom.event_type === "submission_deadline" ||
        custom.event_type === "payment" ||
        custom.event_type === "campaign_start" ||
        custom.event_type === "campaign_end"
          ? custom.event_type
          : "custom"
      ) as UgcCalendarEventType;
      maybePush(events, seen, from, to, {
        id: `custom-${custom.id}`,
        type,
        title: custom.title || "",
        date: custom.starts_at,
        campaignId: custom.campaign_id,
        status: "accepted",
        participantStatus: "accepted",
      });
    }
  }

  for (const inv of invitationsRes.data ?? []) {
    const campaign = inv.campaign as unknown as CampaignLite | null;
    if (!campaign?.id || !campaign.ends_at) continue;
    if (isSkippedCampaignStatus(campaign.status)) continue;
    maybePush(events, seen, from, to, {
      id: `application-deadline-invite-${inv.id}`,
      type: "application_deadline",
      title: campaign.title?.trim() || campaign.id,
      date: campaign.ends_at,
      campaignId: campaign.id,
      status: "invited",
      participantStatus: "invited",
    });
  }

  for (const payout of payoutsRes.data ?? []) {
    if (!payout.paid_at) continue;
    const submission = payout.submission as unknown as {
      campaign_id: string | null;
      campaign: { id: string; title: string | null } | null;
    } | null;
    const campaignId = submission?.campaign?.id ?? submission?.campaign_id ?? null;
    maybePush(events, seen, from, to, {
      id: `payout-${payout.id}`,
      type: "payout",
      title: submission?.campaign?.title?.trim() || "",
      date: payout.paid_at,
      campaignId,
      status: payout.status ?? "paid",
    });
  }

  events.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return NextResponse.json({ data: events, needsProfile: false });
}
