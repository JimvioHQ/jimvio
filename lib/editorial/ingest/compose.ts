import type { MediaCategory } from "@/lib/editorial/types";
import { isMediaCategory } from "@/lib/editorial/validate";

const SENSITIVE =
  /\b(alleg\w*|accus\w*|lawsuit|court|killed|died|death|deaths|war|election|vote|voting|outbreak|scandal|fraud|crash|missile|bomb\w*|assault|abuse|suicide|bankrupt\w*|recall|sanction\w*|shooting|homicide)\b/i;

export function isSensitiveText(value: string): boolean {
  return SENSITIVE.test(value);
}

export type BriefMember = {
  sourceName: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string | null;
  creator: string | null;
};

export type OriginalBrief = {
  title: string;
  excerpt: string;
  bodyHtml: string;
  category: MediaCategory;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  sourceName: string;
  sourceUrl: string;
  evidence: string;
  sensitive: boolean;
  originalityOk: boolean;
  sufficient: boolean;
  issues: string[];
};

/** RSS metadata is not an article. The research writer produces the public story. */
export function buildOriginalBrief(input: {
  category: string;
  members: BriefMember[];
}): OriginalBrief {
  const primary = input.members.find((member) => member.title && member.url && member.sourceName);
  const category = isMediaCategory(input.category) ? input.category : "news";
  const sensitive = primary ? isSensitiveText(`${primary.title} ${primary.summary}`) : false;
  return {
    title: "",
    excerpt: "",
    bodyHtml: "",
    category,
    tags: "",
    seoTitle: "",
    seoDescription: "",
    sourceName: primary?.sourceName.slice(0, 120) ?? "",
    sourceUrl: primary?.url ?? "",
    evidence: primary ? `Held. The feed item is not an article. ${primary.url}`.slice(0, 2000) : "Held. The feed item is not an article.",
    sensitive,
    originalityOk: false,
    sufficient: false,
    issues: ["thin_source"],
  };
}
