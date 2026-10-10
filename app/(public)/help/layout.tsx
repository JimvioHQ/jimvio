import type { Metadata } from "next";
import { SupportFrame } from "@/components/support/support-frame";
import { FaqJsonLd } from "@/components/seo/FaqJsonLd";
import { SUPPORT_ARTICLES } from "@/lib/support/articles";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("help");

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  const items = SUPPORT_ARTICLES.slice(0, 8).map((article) => ({
    question: article.title,
    answer: article.lead,
  }));

  return (
    <>
      <FaqJsonLd items={items} />
      <SupportFrame>{children}</SupportFrame>
    </>
  );
}
