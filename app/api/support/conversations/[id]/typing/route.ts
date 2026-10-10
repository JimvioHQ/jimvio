import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/auth/platform-admin";
import { readTyping, touchTyping } from "@/lib/support/conversations";

type Params = { params: Promise<{ id: string }> };

async function userId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ customer: false, staff: false });
  const user = await userId();
  if (!user) return NextResponse.json({ customer: false, staff: false });
  return NextResponse.json(await readTyping(id, user.id, false));
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const user = await userId();
  if (!user) return NextResponse.json({ error: "Sign in to message support." }, { status: 401 });
  const result = await touchTyping(id, "customer", user.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
