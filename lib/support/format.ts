import { SUPPORT_CATEGORIES, type SupportArticle } from "./types";

export function categoryById(id: string) {
  return SUPPORT_CATEGORIES.find((category) => category.id === id) ?? null;
}

export function articleHref(slug: string) {
  return `/help/articles/${slug}`;
}

export function articlePlainText(article: SupportArticle): string {
  const lines = [
    article.lead,
    "",
    "What to do:",
    ...article.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    `Eligibility: ${article.eligibility}`,
    "",
    "If something goes wrong:",
    ...article.troubleshooting.map((item) => `- ${item}`),
    "",
    article.next,
  ];
  return lines.join("\n");
}

export function customerVisibleMessages<T extends { visibility?: string; id: string; author_role: string; body: string; created_at: string }>(
  messages: T[],
) {
  return messages
    .filter((message) => message.visibility === "customer")
    .map((message) => ({
      id: message.id,
      authorRole: message.author_role,
      body: message.body,
      createdAt: message.created_at,
    }));
}

export function statusLabel(status: string) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "waiting_for_customer":
      return "Waiting for Customer";
    case "open":
      return "Open";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function articleExcerpt(article: SupportArticle, max = 180): string {
  const text = article.lead.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
