import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { CONFIDENTIAL_AI_REFUSAL, isConfidentialAiRequest } from "@/lib/ai/ai-guard";
import { rateLimit } from "@/lib/ops/rate-limit";
import { SUPPORT_ARTICLES, getSupportArticle } from "@/lib/support/articles";
import { articlePlainText } from "@/lib/support/format";
import { knowledgeAnswer } from "@/lib/support/knowledge-answer";
import { searchSupportArticles } from "@/lib/support/search";
import { listOwnTickets } from "@/lib/support/store";

function usableKey(key?: string) {
  if (!key?.trim() || key.trim().length < 12) return false;
  const value = key.trim().toLowerCase();
  return !value.includes("your-") && !value.includes("changeme") && value !== "xxx";
}

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
  if (isConfidentialAiRequest(question)) {
    return NextResponse.json({
      mode: "refused",
      answer: CONFIDENTIAL_AI_REFUSAL,
      articles: [],
    });
  }

  const hits = searchSupportArticles(SUPPORT_ARTICLES, question, { limit: 4 });
  const articles = hits
    .map((hit) => getSupportArticle(hit.slug))
    .filter((article) => article !== null)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      href: `/help/articles/${article.slug}`,
      excerpt: article.lead,
    }));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let ownTickets: Array<{ publicRef: string; subject: string; status: string }> = [];
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

  const fallback = knowledgeAnswer(SUPPORT_ARTICLES, question);
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!usableKey(key)) {
    return NextResponse.json({
      mode: "knowledge",
      answer: fallback.answer,
      articles,
      tickets: ownTickets,
    });
  }

  try {
    const context = hits
      .map((hit) => {
        const article = getSupportArticle(hit.slug);
        return article ? `# ${article.title}\n${articlePlainText(article)}` : "";
      })
      .filter(Boolean)
      .join("\n\n");
    const ticketContext = ownTickets.length
      ? `\n\nThe signed-in user can see only these ticket references: ${ownTickets
          .map((ticket) => `${ticket.publicRef} (${ticket.status})`)
          .join(", ")}. Do not invent other tickets.`
      : "\n\nDo not invent ticket, payment, wallet, refund, or approval status.";

    const genAI = new GoogleGenerativeAI(key!.trim());
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: "You are Jimvio Support. Answer only from the help articles provided. If they do not answer the question, say so and tell the person to open a support ticket. Never invent payment status, wallet balances, payout completion, refunds, campaign approvals, delivery dates, or verification results. Never ask for passwords, card numbers, or authenticator codes.",
          },
        ],
      },
      generationConfig: { maxOutputTokens: 700, temperature: 0.2 },
    });
    const result = await model.generateContent(
      `Help articles:\n${context || "No matching article."}${ticketContext}\n\nQuestion:\n${question}`,
    );
    const text = result.response.text().trim();
    return NextResponse.json({
      mode: "live",
      answer: text || fallback.answer,
      articles,
      tickets: ownTickets,
    });
  } catch (error) {
    console.error("[support-ask] model failed", error instanceof Error ? error.message : "error");
    return NextResponse.json({
      mode: "knowledge",
      answer: fallback.answer,
      articles,
      tickets: ownTickets,
    });
  }
}
