import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/auth/platform-admin";
import { customerSupportEmail } from "@/lib/contact-email";
import { releaseHandoffNotification, requestHumanHandoff } from "@/lib/support/conversations";
import { deliverStaffHandoffNotice } from "@/lib/support/notify";

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
  if (result.staffNotice) {
    try {
      const email = await deliverStaffHandoffNotice({
        ...result.staffNotice,
        supportEmail: customerSupportEmail(),
      });
      if (!email.sent && email.reason !== "not_configured") {
        await releaseHandoffNotification(id);
        console.error("[support-live] handoff email", email.reason);
      }
    } catch (error) {
      console.error("[support-live] handoff email", error instanceof Error ? error.message : "error");
    }
  }
  return NextResponse.json({
    ok: result.ok,
    agentsAvailable: result.agentsAvailable,
    availability: result.availability,
    conversation: result.conversation,
    messages: result.messages,
  });
}
