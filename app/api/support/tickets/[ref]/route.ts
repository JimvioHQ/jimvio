import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnTicket } from "@/lib/support/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  const { ref } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view this ticket." }, { status: 401 });

  const result = await getOwnTicket(user.id, ref);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
