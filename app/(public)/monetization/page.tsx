import type { Metadata } from "next";
import { InfoLinkList, InfoSection, PublicInfoPage } from "@/components/layout/public-info-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("monetization");

export default function CreatorMonetizationPage() {
  return (
    <PublicInfoPage
      eyebrow="Earn & Grow"
      title="Creator Monetization"
      lede="Creators can use the earning tools Jimvio already offers. Income is not guaranteed, and a balance appears only after the product records it."
    >
      <InfoSection title="Ways to earn">
        <InfoLinkList
          items={[
            {
              href: "/affiliates",
              label: "Affiliate program",
              detail: "Create tracked links and review recorded commissions.",
            },
            {
              href: "/ugc",
              label: "UGC and clipping campaigns",
              detail: "Browse briefs, then apply or submit where the campaign allows it.",
            },
            {
              href: "/ugc/brand-deals",
              label: "Brand campaigns",
              detail: "Promotion campaigns that are currently available.",
            },
            {
              href: "/ugc/clipping",
              label: "Clipping",
              detail: "Short-clip campaign tools.",
            },
            {
              href: "/influencers",
              label: "Influencer hub",
              detail: "Creator profiles and clips.",
            },
          ]}
        />
      </InfoSection>

      <InfoSection title="Earnings and rules">
        <p>
          Wallet balances, withdrawals, and payout methods require a signed-in account. Opening
          the wallet does not mean a payout has been sent.
        </p>
        <InfoLinkList
          items={[
            {
              href: "/wallet",
              label: "Earnings and payouts",
              detail: "Sign in to see your wallet, transactions, and withdrawal options.",
            },
            {
              href: "/ugc/earnings",
              label: "Campaign earnings",
              detail: "Earnings recorded for your UGC workspace.",
            },
            {
              href: "/help/topics/creators",
              label: "Creator guides",
              detail: "How creator profiles, submissions, and earnings work.",
            },
            {
              href: "/legal/earnings",
              label: "Earnings policy",
              detail: "Published rules for creator and seller earnings.",
            },
          ]}
        />
      </InfoSection>
    </PublicInfoPage>
  );
}
