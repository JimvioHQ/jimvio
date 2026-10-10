import type { SupportArticle, SupportCategoryId } from "./types";

export function defineArticle(
  category: SupportCategoryId,
  slug: string,
  title: string,
  lead: string,
  steps: string[],
  eligibility: string,
  troubleshooting: string[],
  next: string,
  tags: string[],
  related: string[] = [],
): SupportArticle {
  return {
    slug,
    category,
    title,
    lead,
    steps,
    eligibility,
    troubleshooting,
    next,
    tags,
    related,
    updated: "2026-10-10",
  };
}
