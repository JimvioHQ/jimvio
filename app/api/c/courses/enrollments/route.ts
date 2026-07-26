import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listPurchaseHistory } from "@/lib/community/courses/access";

export const dynamic = "force-dynamic";

/** GET — learner course enrollment / purchase history. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollments = await listPurchaseHistory(user.id);
  return NextResponse.json({ enrollments });
}
