import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/auth/platform-admin";
import { requestHumanHandoff } from "@/lib/support/conversations";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to reach a person." }, { status: 401 });
  const result = await requestHumanHandoff(user.id, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
