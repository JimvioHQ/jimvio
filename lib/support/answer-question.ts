import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIDENTIAL_AI_REFUSAL, isConfidentialAiRequest } from "@/lib/ai/ai-guard";
import { SUPPORT_ARTICLES, getSupportArticle } from "./articles";
import { articlePlainText } from "./format";
import { knowledgeAnswer } from "./knowledge-answer";
import { searchSupportArticles } from "./search";

export type SupportAnswerArticle = {
  slug: string;
  title: string;
  href: string;
  excerpt: string;
};

export type SupportAnswer = {
  mode: "knowledge" | "live" | "refused";
  answer: string;
  articles: SupportAnswerArticle[];
};

function usableKey(key?: string) {
  if (!key?.trim() || key.trim().length < 12) return false;
  const value = key.trim().toLowerCase();
  return !value.includes("your-") && !value.includes("changeme") && value !== "xxx";
}

export async function answerSupportQuestion(input: {
  question: string;
  ownTickets?: Array<{ publicRef: string; status: string }>;
}): Promise<SupportAnswer> {
  const question = input.question.trim().slice(0, 2000);
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

  if (isConfidentialAiRequest(question)) {
    return { mode: "refused", answer: CONFIDENTIAL_AI_REFUSAL, articles: [] };
  }

  const fallback = knowledgeAnswer(SUPPORT_ARTICLES, question);
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!usableKey(key)) {
    return { mode: "knowledge", answer: fallback.answer, articles };
  }

  const ownTickets = input.ownTickets ?? [];
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
    return {
      mode: "live",
      answer: text || fallback.answer,
      articles,
    };
  } catch (error) {
    console.error("[support-ask] model failed", error instanceof Error ? error.message : "error");
    return { mode: "knowledge", answer: fallback.answer, articles };
  }
}
