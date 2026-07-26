import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getActivityFeed,
  groupActivityByDate,
  getUnreadCount,
} from "@/lib/notifications/activity";
import { isNotificationCategory } from "@/lib/notifications/categories";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** GET — unified activity feed (timeline, filters, pagination, search). */
export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`notif-feed:${user.id}`, 60, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const sp = req.nextUrl.searchParams;
  const categoryRaw = sp.get("category");
  const category =
    categoryRaw && isNotificationCategory(categoryRaw) ? categoryRaw : categoryRaw === "all" ? "all" : null;

  try {
    const feed = await getActivityFeed({
      userId: user.id,
      cursor: sp.get("cursor"),
      limit: Number(sp.get("limit") ?? 30) || 30,
      category,
      type: sp.get("type"),
      q: sp.get("q"),
      unreadOnly: sp.get("unread") === "1",
      includeArchived: sp.get("archived") === "1",
    });

    const unreadCount = await getUnreadCount(user.id);
    const grouped = groupActivityByDate(feed.items);

    return NextResponse.json({
      ...feed,
      grouped,
      unreadCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load feed" },
      { status: 500 }
    );
  }
}
