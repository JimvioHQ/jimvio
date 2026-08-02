import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type VerificationRequestType = "identity" | "documents" | "social" | "trust" | "level";

const REQUEST_TYPES: VerificationRequestType[] = ["identity", "documents", "social", "trust", "level"];

/** POST /api/identity/verify-request — a creator asks the platform to verify them. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const requestType = body?.requestType as string | undefined;
  if (!requestType || !REQUEST_TYPES.includes(requestType as VerificationRequestType)) {
    return NextResponse.json({ error: "Invalid requestType" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("jip_verification_requests")
    .insert({
      user_id: user.id,
      request_type: requestType,
      payload: (body?.payload && typeof body.payload === "object" ? body.payload : {}) as never,
    } as never)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}
