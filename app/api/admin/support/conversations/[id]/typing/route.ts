import { NextResponse } from "next/server";
import { isUuid, requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { touchTyping } from "@/lib/support/conversations";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const result = await touchTyping(id, "staff", auth.user.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
