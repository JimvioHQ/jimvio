import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createFlutterwavePaymentLink } from "@/lib/flutterwave";
import { generateTxRef } from "@/lib/payments/tx-ref";
import { getActiveEnrollment } from "@/lib/community/courses/access";
import { serverPriceCents } from "@/lib/community/courses/rules";
import { purchaseCourseWithWallet } from "@/lib/community/courses/wallet-checkout";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await params;
  const body = (await req.json().catch(() => ({}))) as { method?: string };
  const method = body.method === "wallet" ? "wallet" : "flutterwave";

  const admin = createServiceRoleClient();
  const { data: course } = await admin
    .from("community_courses")
    .select("id, title, price_cents, currency, is_published, archived_at, creator_id, community_id")
    .eq("id", courseId)
    .maybeSingle();
  if (!course || !course.is_published || course.archived_at) {
    return NextResponse.json({ error: "Course is not available" }, { status: 400 });
  }
  const priceCents = serverPriceCents(course.price_cents);
  if (!priceCents) return NextResponse.json({ error: "This course is free" }, { status: 400 });
  if (course.creator_id === user.id) {
    return NextResponse.json({ error: "Creators already have access" }, { status: 400 });
  }
  const existing = await getActiveEnrollment(courseId, user.id);
  if (existing) return NextResponse.json({ enrollment: existing, alreadyEnrolled: true });

  const amount = priceCents / 100;
  const currency = String(course.currency || "USD").toUpperCase();
  if (currency !== "USD") {
    return NextResponse.json({ error: "Paid courses currently settle in USD" }, { status: 400 });
  }

  if (method === "wallet") {
    const purchased = await purchaseCourseWithWallet(admin, {
      userId: user.id,
      course: {
        id: course.id,
        title: String(course.title ?? "Course"),
        price_cents: course.price_cents,
        currency: course.currency,
      },
    });
    if (!purchased.ok) {
      return NextResponse.json({ error: purchased.error }, { status: purchased.status });
    }
    return NextResponse.json({
      enrollment: purchased.enrollment,
      confirmed: true,
      alreadyEnrolled: purchased.alreadyEnrolled,
      replayed: purchased.replayed,
    });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.jimvio.com";
  const txRef = generateTxRef("CRS");
  try {
    const checkoutUrl = await createFlutterwavePaymentLink({
      txRef,
      amount,
      currency: "USD",
      redirectUrl: `${origin.replace(/\/$/, "")}/api/payments/flutterwave/callback?course=${courseId}`,
      customerEmail: profile?.email || user.email || "student@jimvio.com",
      customerName: profile?.full_name || "Jimvio student",
      customerPhone: profile?.phone || "",
      orderDescription: `Course ${String(course.title).slice(0, 80)}`,
      meta: { purpose: "course_purchase", course_id: courseId },
      paymentOptions: "card",
    });
    await admin.from("transactions").insert({
      user_id: user.id,
      type: "course_purchase",
      amount,
      currency: "USD",
      status: "pending",
      direction: "debit",
      provider: "flutterwave",
      provider_transaction_id: txRef,
      reference: txRef,
      description: `Course ${course.title}`,
      metadata: { purpose: "course_purchase", course_id: courseId, amount_cents: priceCents },
    });
    return NextResponse.json({ checkoutUrl, paymentRef: txRef });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
