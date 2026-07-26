import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getRecentlyViewed,
  recordDiscoveryView,
} from "@/lib/discovery/recommendations";
import { isDiscoveryEntityType } from "@/lib/discovery/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 12) || 12;
  const items = await getRecentlyViewed(user.id, limit);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    entityType?: string;
    entityId?: string;
    title?: string;
    href?: string;
    metadata?: Record<string, unknown>;
  } | null;

  if (!body?.entityType || !body?.entityId || !isDiscoveryEntityType(body.entityType)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await recordDiscoveryView({
    userId: user.id,
    entityType: body.entityType,
    entityId: body.entityId,
    title: body.title,
    href: body.href,
    metadata: body.metadata,
  });

  return NextResponse.json({ ok: true });
}
