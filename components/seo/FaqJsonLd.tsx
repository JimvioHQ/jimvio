export type FaqItem = {
  question: string;
  answer: string;
};

export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/** Core FAQs surfaced on the help center for rich results. */
export const HELP_FAQ_ITEMS: FaqItem[] = [
  {
    question: "How do I verify my vendor account on Jimvio?",
    answer:
      "Complete your vendor profile, submit business verification documents in the dashboard, and wait for the Jimvio team to review your application. Verified vendors receive a badge on their storefront.",
  },
  {
    question: "What is Jimvio Buyer Protection?",
    answer:
      "Buyer Protection helps protect buyers when orders do not match the listing or fail to arrive. Eligible orders can be reviewed for refunds or resolution through Jimvio support.",
  },
  {
    question: "How do I withdraw affiliate earnings?",
    answer:
      "Affiliate earnings accrue in your Jimvio wallet. Once you meet the minimum payout threshold, request a withdrawal from the dashboard and choose your preferred payout method.",
  },
  {
    question: "How does shipping work for physical products?",
    answer:
      "Shipping options are shown on each product page based on your region. Vendors and suppliers configure rates; some listings include free shipping.",
  },
  {
    question: "Is Jimvio free to start?",
    answer:
      "Yes. You can create an account, browse the marketplace, join communities, and list products without upfront platform fees. Paid features and transaction fees may apply depending on your plan.",
  },
];
