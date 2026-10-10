import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";
import { answerSupportQuestion } from "@/lib/support/answer-question";
import { listOwnTickets } from "@/lib/support/store";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`support-ask:${ip}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many questions. Please wait a minute." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 2000) : "";
  if (question.length < 2) {
    return NextResponse.json({ error: "Enter a question." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let ownTickets: Array<{ publicRef: string; status: string; subject: string }> = [];
  if (user && /ticket|payout|order|wallet|refund/i.test(question)) {
    const listed = await listOwnTickets(user.id, { limit: 5 });
    if ("tickets" in listed && listed.tickets) {
      ownTickets = listed.tickets.map((ticket) => ({
        publicRef: ticket.public_ref,
        subject: ticket.subject,
        status: ticket.status,
      }));
    }
  }

  const answer = await answerSupportQuestion({ question, ownTickets });
  return NextResponse.json({
    mode: answer.mode,
    answer: answer.answer,
    articles: answer.articles,
    tickets: ownTickets,
  });
}
