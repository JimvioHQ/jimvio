import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reorderCartLines, type ReorderLine } from "@/lib/orders/reorder";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { items?: ReorderLine[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = (body.items ?? []).filter(
    (i) => i?.product_id && i?.vendor_id,
  );

  if (items.length === 0) {
    return NextResponse.json(
      { error: "No valid items to reorder" },
      { status: 400 },
    );
  }

  const result = await reorderCartLines(items);

  if (result.added === 0) {
    const reason = result.skipped[0]?.reason ?? "Products may no longer be available.";
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    cartUrl: "/cart",
    added: result.added,
    skipped: result.skipped,
  });
}
