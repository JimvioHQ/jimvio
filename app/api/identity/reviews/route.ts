import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { JipReviewRow, ReviewDirection } from "@/lib/identity/types";

export const dynamic = "force-dynamic";

const DIRECTIONS = new Set<ReviewDirection>(["brand_to_creator", "creator_to_brand"]);

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

interface VerificationResult {
  verified: boolean;
  source: "booking" | "ugc_campaign" | null;
  bookingId: string | null;
  campaignId: string | null;
}

/**
 * A review may only be marked verified (and, per Phase 1 rules, may only be
 * created at all) when the reviewer and subject share a completed booking or
 * a completed UGC campaign in the roles implied by `direction`.
 */
async function verifyReviewRelationship(
  db: ServiceClient,
  reviewerUserId: string,
  subjectUserId: string,
  direction: ReviewDirection,
  bookingIdHint?: string | null,
  campaignIdHint?: string | null
): Promise<VerificationResult> {
  const brandUserId = direction === "brand_to_creator" ? reviewerUserId : subjectUserId;
  const creatorUserId = direction === "brand_to_creator" ? subjectUserId : reviewerUserId;

  // 1. Completed booking between the two parties.
  try {
    const db2 = db as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let bookingQuery = db2
      .from("jip_bookings")
      .select("id")
      .eq("creator_id", creatorUserId)
      .eq("brand_user_id", brandUserId)
      .eq("status", "completed");
    if (bookingIdHint) bookingQuery = bookingQuery.eq("id", bookingIdHint);

    const { data: booking } = await bookingQuery.order("updated_at", { ascending: false }).maybeSingle();
    if (booking?.id) {
      return { verified: true, source: "booking", bookingId: booking.id, campaignId: null };
    }
  } catch (err) {
    console.error("verifyReviewRelationship: booking check failed", err);
  }

  // 2. Shared completed UGC campaign (brand owns the campaign, creator participated).
  try {
    const db2 = db as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const [{ data: vendor }, { data: influencer }] = await Promise.all([
      db2.from("vendors").select("id").eq("user_id", brandUserId).maybeSingle(),
      db2.from("influencers").select("id").eq("user_id", creatorUserId).maybeSingle(),
    ]);
    if (vendor?.id && influencer?.id) {
      let participantQuery = db2
        .from("ugc_campaign_participants")
        .select("campaign_id, ugc_campaigns!inner(id, brand_id, status)")
        .eq("influencer_id", influencer.id)
        .eq("ugc_campaigns.brand_id", vendor.id)
        .eq("ugc_campaigns.status", "completed");
      if (campaignIdHint) participantQuery = participantQuery.eq("campaign_id", campaignIdHint);

      const { data: participant } = await participantQuery.limit(1).maybeSingle();
      if (participant?.campaign_id) {
        return { verified: true, source: "ugc_campaign", bookingId: null, campaignId: participant.campaign_id };
      }
    }
  } catch (err) {
    console.error("verifyReviewRelationship: ugc campaign check failed", err);
  }

  return { verified: false, source: null, bookingId: null, campaignId: null };
}

function toReviewPayload(row: JipReviewRow, reviewer?: { id: string; full_name: string | null; username: string | null; avatar_url: string | null } | null) {
  return {
    id: row.id,
    subjectUserId: row.subject_user_id,
    reviewerUserId: row.reviewer_user_id,
    direction: row.direction,
    rating: Number(row.rating),
    title: row.title,
    body: row.body,
    isVerified: Boolean(row.is_verified),
    verificationSource: row.verification_source,
    bookingId: row.booking_id,
    campaignId: row.campaign_id,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
    reviewer: reviewer
      ? { userId: reviewer.id, fullName: reviewer.full_name, username: reviewer.username, avatarUrl: reviewer.avatar_url }
      : null,
  };
}

/**
 * GET /api/identity/reviews?subjectUserId=...|username=...
 * Public list of verified, public reviews for a subject. Owner (or admin)
 * viewing their own reviews also see non-public / unverified ones.
 */
export async function GET(req: NextRequest) {
  const subjectUserIdParam = req.nextUrl.searchParams.get("subjectUserId");
  const usernameParam = req.nextUrl.searchParams.get("username");
  const { user: viewer } = await requireUser();

  const db = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  let subjectUserId = subjectUserIdParam;
  if (!subjectUserId && usernameParam) {
    const { data: profileRow } = await db.from("profiles").select("id").ilike("username", usernameParam).maybeSingle();
    subjectUserId = profileRow?.id ?? null;
  }
  if (!subjectUserId) {
    return NextResponse.json({ error: "subjectUserId or username is required" }, { status: 400 });
  }

  const isSelf = Boolean(viewer) && viewer!.id === subjectUserId;

  let query = db
    .from("jip_reviews")
    .select("*")
    .eq("subject_user_id", subjectUserId)
    .order("created_at", { ascending: false });

  if (!isSelf) {
    query = query.eq("is_public", true).eq("is_verified", true);
  }

  const { data: reviews, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (reviews ?? []) as JipReviewRow[];
  const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewer_user_id)));

  type ReviewerRow = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };
  let reviewers: ReviewerRow[] = [];
  if (reviewerIds.length) {
    const { data } = await db.from("profiles").select("id, full_name, username, avatar_url").in("id", reviewerIds);
    reviewers = (data ?? []) as ReviewerRow[];
  }
  const byId = new Map<string, ReviewerRow>(reviewers.map((p) => [p.id, p]));

  return NextResponse.json({
    reviews: rows.map((row) => toReviewPayload(row, byId.get(row.reviewer_user_id) ?? null)),
  });
}

/**
 * POST /api/identity/reviews
 * Body: { subjectUserId, direction, rating, body, title?, bookingId?, campaignId?, isPublic? }
 * Only allowed when a completed booking or completed shared UGC campaign
 * exists between the reviewer and the subject — otherwise 403.
 */
export async function POST(req: NextRequest) {
  const { user, db: rawDb, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const db = rawDb as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const body = await req.json().catch(() => ({}));
  const subjectUserId = typeof body.subjectUserId === "string" ? body.subjectUserId : "";
  const direction = String(body.direction ?? "") as ReviewDirection;
  const rating = Number(body.rating);
  const reviewBody = typeof body.body === "string" ? body.body.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : null;

  if (!subjectUserId) return NextResponse.json({ error: "subjectUserId is required" }, { status: 400 });
  if (subjectUserId === user.id) {
    return NextResponse.json({ error: "You cannot review yourself" }, { status: 400 });
  }
  if (!DIRECTIONS.has(direction)) {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be between 1 and 5" }, { status: 400 });
  }
  if (!reviewBody) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const verification = await verifyReviewRelationship(
    db,
    user.id,
    subjectUserId,
    direction,
    typeof body.bookingId === "string" ? body.bookingId : null,
    typeof body.campaignId === "string" ? body.campaignId : null
  );

  if (!verification.verified) {
    return NextResponse.json({ error: "Verified relationship required" }, { status: 403 });
  }

  const row = {
    subject_user_id: subjectUserId,
    reviewer_user_id: user.id,
    direction,
    rating,
    title,
    body: reviewBody,
    is_verified: true,
    verification_source: verification.source,
    booking_id: verification.bookingId,
    campaign_id: verification.campaignId,
    is_public: body.isPublic === undefined ? true : Boolean(body.isPublic),
  };

  const { data, error: insertErr } = await db.from("jip_reviews").insert(row).select("*").single();
  if (insertErr) {
    const status = String((insertErr as { code?: string }).code) === "23505" ? 409 : 400;
    return NextResponse.json({ error: insertErr.message }, { status });
  }

  return NextResponse.json({ review: toReviewPayload(data as JipReviewRow) }, { status: 201 });
}
