import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";
import {
  listProductFeedback,
  updateProductFeedbackStatus,
  type FeedbackStatus,
} from "@/services/feedback/product-feedback";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const limit = Number(new URL(request.url).searchParams.get("limit") || 50);
  try {
    return NextResponse.json({ items: await listProductFeedback(limit) });
  } catch {
    return NextResponse.json({ error: "Unable to load feedback" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }
  const status = body.status as FeedbackStatus;
  if (!["open", "triaged", "resolved", "wontfix"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  try {
    const row = await updateProductFeedbackStatus(
      body.id,
      status,
      typeof body.adminNotes === "string" ? body.adminNotes : null,
    );
    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update" },
      { status: 400 },
    );
  }
}
