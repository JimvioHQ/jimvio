import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";
import { getSupportArticle } from "@/lib/support/articles";
import { hashIp } from "@/lib/support/validation";
import { saveArticleFeedback } from "@/lib/support/store";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`support-feedback:${ip}`, 12, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many feedback submissions." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!getSupportArticle(slug)) {
    return NextResponse.json({ error: "Unknown article." }, { status: 404 });
  }
  if (typeof body?.helpful !== "boolean") {
    return NextResponse.json({ error: "Choose whether the article helped." }, { status: 400 });
  }
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const result = await saveArticleFeedback({
    slug,
    helpful: body.helpful,
    note: note || null,
    userId: user?.id ?? null,
    ipHash: hashIp(ip),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
