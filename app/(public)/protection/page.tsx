import type { Metadata } from "next";
import Link from "next/link";
import { InfoLinkList, InfoSection, PublicInfoPage } from "@/components/layout/public-info-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("protection");

export default function BuyerProtectionPage() {
  return (
    <PublicInfoPage
      eyebrow="Marketplace"
      title="Buyer Protection"
      lede="Trade Assurance helps protect buyers when an order does not match the listing or does not arrive. Eligible orders can be reviewed for a refund or another resolution through Jimvio support."
    >
      <InfoSection title="What review covers">
        <p>
          Open the order and compare it with the listing. If the item does not match what was
          purchased, or it does not arrive, support can review that order. A review is not the same
          as an automatic refund, and Jimvio does not promise that every purchase is insured.
        </p>
        <p>
          Refund windows depend on the product type. The published refund policy is the source for
          those windows.
        </p>
      </InfoSection>

      <InfoSection title="Checkout">
        <p>
          Pay with the methods shown at checkout for that order. Jimvio does not add a payment
          method that the checkout screen does not offer.
        </p>
      </InfoSection>

      <InfoSection title="What to do next">
        <InfoLinkList
          items={[
            {
              href: "/marketplace",
              label: "Browse products",
              detail: "Read the listing, including shipping, before you pay.",
            },
            {
              href: "/orders",
              label: "Your orders",
              detail: "Sign in to open an order and its stored status.",
            },
            {
              href: "/refunds-payouts",
              label: "Refund and dispute policy",
              detail: "Published buyer refund windows and dispute handling.",
            },
            {
              href: "/help/contact",
              label: "Contact support",
              detail: "Include the order reference when you ask for a review.",
            },
          ]}
        />
      </InfoSection>

      <p className="text-sm">
        Questions about a listing before you buy belong in{" "}
        <Link href="/help" className="font-medium text-[var(--color-accent)] hover:underline">
          Help Center
        </Link>
        .
      </p>
    </PublicInfoPage>
  );
}
