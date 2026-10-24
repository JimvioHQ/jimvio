import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCustomerIssue } from "@/lib/digital-products/trust/service";
import { ISSUE_TYPES, type CustomerIssueType } from "@/lib/digital-products/trust/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to report an issue." }, { status: 401 });

  const body = await req.json().catch(() => null) as {
    productId?: string;
    orderId?: string;
    issueType?: string;
    details?: string;
    refund?: boolean;
  } | null;
  if (!body?.productId || !ISSUE_TYPES.includes(body.issueType as CustomerIssueType)) {
    return NextResponse.json({ error: "Choose a valid issue type." }, { status: 400 });
  }

  const result = await createCustomerIssue({
    reporterId: user.id,
    productId: body.productId,
    orderId: body.orderId,
    issueType: body.issueType as CustomerIssueType,
    details: body.details || "",
    refund: body.refund,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, duplicate: result.duplicate, id: result.id });
}
