import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createProductFeedback, type FeedbackCategory } from "@/services/feedback/product-feedback";
import { trackGrowthEvent } from "@/services/growth/events";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const category = body?.category as FeedbackCategory | undefined;
  const message = typeof body?.message === "string" ? body.message : "";
  if (!category || !message) {
    return NextResponse.json({ error: "category and message required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const row = await createProductFeedback({
      userId: user.id,
      category,
      message,
      pagePath: typeof body.pagePath === "string" ? body.pagePath : null,
      userAgent: request.headers.get("user-agent"),
    });
    void trackGrowthEvent(user.id, "growth.feedback_submitted", {
      category,
      id: row.id,
    });
    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save feedback" },
      { status: 400 },
    );
  }
}
