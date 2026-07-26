import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  archiveNotification,
  dismissNotification,
  markNotificationRead,
  trackNotificationClick,
} from "@/lib/actions/notifications";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: "read" | "archive" | "click";
  };

  if (body.action === "archive") {
    const result = await archiveNotification(id);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (body.action === "click") {
    const result = await trackNotificationClick(id);
    return NextResponse.json(result);
  }

  const result = await markNotificationRead(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await dismissNotification(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
