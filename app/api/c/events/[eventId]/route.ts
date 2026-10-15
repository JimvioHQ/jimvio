import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEventForViewer, listEventRegistrations } from "@/lib/community/event-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token");
  const event = await getEventForViewer({ userId: user.id, eventId, token });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (req.nextUrl.searchParams.get("registrations") === "1") {
    try {
      const registrations = await listEventRegistrations({
        userId: user.id,
        eventId,
        cursor: Number(req.nextUrl.searchParams.get("cursor") ?? 0),
      });
      return NextResponse.json({ event, ...registrations });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Forbidden" },
        { status: 403 },
      );
    }
  }
  return NextResponse.json({ event });
}
