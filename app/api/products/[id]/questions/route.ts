import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function untyped(supabase: Awaited<ReturnType<typeof createClient>>): any {
  return supabase;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  const supabase = await createClient();
  const db = untyped(supabase);

  const { data: questions, error } = await db
    .from("product_questions")
    .select(
      "id, body, created_at, asker_id, profiles:asker_id(full_name, username, avatar_url), product_answers(id, body, created_at, is_seller, answerer_id, profiles:answerer_id(full_name, username))"
    )
    .eq("product_id", productId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    if (String(error.message).includes("product_questions") || error.code === "42P01") {
      return NextResponse.json({ questions: [], pendingMigration: true });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ questions: questions ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    body?: string;
    answer?: string;
    questionId?: string;
  };

  const db = untyped(supabase);

  // Seller/buyer answer
  if (body.questionId && body.answer?.trim()) {
    const { data: product } = await supabase
      .from("products")
      .select("vendor_id, vendors(user_id)")
      .eq("id", productId)
      .maybeSingle();
    const vendorUserId = (product?.vendors as { user_id?: string } | null)?.user_id;
    const isSeller = vendorUserId === user.id;

    const { data, error } = await db
      .from("product_answers")
      .insert({
        question_id: body.questionId,
        answerer_id: user.id,
        body: body.answer.trim().slice(0, 4000),
        is_seller: isSeller,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ answer: data });
  }

  const text = body.body?.trim() ?? "";
  if (text.length < 3) {
    return NextResponse.json({ error: "Question too short" }, { status: 400 });
  }

  const { data, error } = await db
    .from("product_questions")
    .insert({
      product_id: productId,
      asker_id: user.id,
      body: text.slice(0, 2000),
      is_public: true,
    })
    .select()
    .single();

  if (error) {
    if (String(error.message).includes("product_questions") || error.code === "42P01") {
      return NextResponse.json(
        { error: "Q&A not available yet — run migration 087" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ question: data });
}
