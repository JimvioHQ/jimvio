import { customerSupportEmail } from "../contact-email";
import { articlePlainText } from "./format";
import { searchSupportArticles } from "./search";
import type { SupportArticle } from "./types";

function topicOf(question: string) {
  return question.trim().replace(/\s+/g, " ").slice(0, 180);
}

export function knowledgeAnswer(articles: SupportArticle[], question: string) {
  const hits = searchSupportArticles(articles, question, { limit: 3 });
  const topic = topicOf(question);
  const topHit = hits[0];
  if (!topHit || topHit.score < 3) {
    const closest = topHit
      ? `The closest article I can see is “${topHit.title}”. If that is not it, tell me what you were trying to do and which page you were on.`
      : "Tell me what you were trying to do and which page you were on.";
    return {
      mode: "knowledge" as const,
      answer: `I could not find a reliable Jimvio help article for “${topic}”.\n\n${closest}\n\nIf a person needs to look this up, keep describing it in this chat after you sign in, or email ${customerSupportEmail()}. I have not looked up a wallet, order, payment, or account.`,
      slugs: topHit ? [topHit.slug] : ([] as string[]),
    };
  }

  const top = articles.find((article) => article.slug === topHit.slug);
  const body = top
    ? `${top.lead}\n\n${top.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}\n\n${top.next}`
    : topHit.excerpt;
  const followUp = "What do you see when you try that, or which step should we look at more closely?";

  return {
    mode: "knowledge" as const,
    answer: `${body}\n\n${followUp}\n\nThis comes from Jimvio help articles. I have not looked up your wallet, orders, payments, or account.`,
    slugs: hits.map((hit) => hit.slug),
    context: top ? articlePlainText(top) : body,
  };
}
