import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { assertCanReadSubmission } from "@/lib/ugc/submission-access";
import { verifySubmissionViews } from "@/lib/ugc/verification/verify-submission";

export const dynamic = "force-dynamic";

const MIN_GAP_MS = 60 * 1000;

/**
 * Re-reads a submission's views from the platform API now.
 * Open to the creator, campaign reviewers and admins; at most once a minute.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();
  const { data } = await db
    .from("ugc_submissions")
    .select(
      "id, verification_checked_at, campaign:ugc_campaigns!campaign_id (brand_id), influencer:influencers!influencer_id (user_id)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = await assertCanReadSubmission(db, user.id, data as Parameters<typeof assertCanReadSubmission>[2]);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const last = (data as { verification_checked_at?: string | null }).verification_checked_at;
  if (last && Date.now() - Date.parse(last) < MIN_GAP_MS) {
    // Just checked: show the latest result instead of an error.
    return NextResponse.json({ outcome: { submissionId: id, status: "recent", note: "Up to date — checked less than a minute ago." } });
  }

  const outcome = await verifySubmissionViews(id, db);
  return NextResponse.json({ outcome });
}
