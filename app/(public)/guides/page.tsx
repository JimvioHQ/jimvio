import type { Metadata } from "next";
import { InfoLinkList, InfoSection, PublicInfoPage } from "@/components/layout/public-info-page";
import { articlesInCategory } from "@/lib/support/articles";
import { SUPPORT_CATEGORIES } from "@/lib/support/types";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("guides");

const TRADE_CATEGORY_IDS = ["marketplace", "selling", "dropshipping", "orders"] as const;

export default function TradeGuidesPage() {
  const sections = TRADE_CATEGORY_IDS.map((id) => {
    const category = SUPPORT_CATEGORIES.find((item) => item.id === id);
    return {
      category,
      articles: articlesInCategory(id),
    };
  }).filter((section) => section.category && section.articles.length > 0);

  return (
    <PublicInfoPage
      eyebrow="Resources"
      title="Guides"
      lede="These guides are the existing Jimvio help articles for buying, selling, supplier fulfillment, and shipping. They describe the product as it works today."
    >
      {sections.map(({ category, articles }) => (
        <InfoSection key={category!.id} title={category!.title}>
          <p>{category!.summary}</p>
          <InfoLinkList
            items={articles.map((article) => ({
              href: `/help/articles/${article.slug}`,
              label: article.title,
              detail: article.lead,
            }))}
          />
        </InfoSection>
      ))}
    </PublicInfoPage>
  );
}
