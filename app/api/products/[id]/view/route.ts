import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: productId } = await params;
    if (!productId) {
      return NextResponse.json({ success: false, error: "Missing product id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const insertPayload: {
      product_id: string;
      user_id?: string;
      session_id?: string;
    } = { product_id: productId };

    if (user) insertPayload.user_id = user.id;

    // Use service role so view logging works for guests and does not require SELECT on RETURNING.
    const admin = createAdminClient();
    const { error } = await admin.from("product_views").insert(insertPayload);

    if (error) {
      console.error("[recordProductView] supabase error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[recordProductView] error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
