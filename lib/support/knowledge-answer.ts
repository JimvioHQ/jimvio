import { articlePlainText } from "./format";
import { searchSupportArticles } from "./search";
import type { SupportArticle } from "./types";

export function knowledgeAnswer(articles: SupportArticle[], question: string) {
  const hits = searchSupportArticles(articles, question, { limit: 3 });
  if (hits.length === 0) {
    return {
      mode: "knowledge" as const,
      answer:
        "The Jimvio help articles do not cover that reliably. Open a support ticket and include the page, the time, and any order, wallet, or campaign reference. Do not include passwords or card numbers. Support cannot confirm a payment, payout, refund, or approval unless the product record shows it.",
      slugs: [] as string[],
    };
  }

  const top = articles.find((article) => article.slug === hits[0]?.slug);
  const body = top
    ? `${top.lead}\n\n${top.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}\n\n${top.next}`
    : hits[0]!.excerpt;

  return {
    mode: "knowledge" as const,
    answer: `This answer comes from the Jimvio help articles, not from a live account lookup.\n\n${body}`,
    slugs: hits.map((hit) => hit.slug),
    context: top ? articlePlainText(top) : body,
  };
}
