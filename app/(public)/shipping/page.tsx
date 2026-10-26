import type { Metadata } from "next";
import Link from "next/link";
import { InfoLinkList, InfoSection, PublicInfoPage } from "@/components/layout/public-info-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("shipping");

export default function GlobalShippingPage() {
  return (
    <PublicInfoPage
      eyebrow="Marketplace"
      title="Global Shipping"
      lede="Shipping information is whatever the product page and checkout show for that item. Jimvio does not guarantee a delivery date."
    >
      <InfoSection title="What you can rely on">
        <p>
          Read the shipping details on the product before you pay, then review the checkout
          summary. Seller-fulfilled and supplier-fulfilled items depend on that seller or supplier.
          International delivery depends on the shipping offered for the product.
        </p>
        <p>
          An estimate on a listing is not a promise if the order is later delayed. Support cannot
          invent a courier date.
        </p>
      </InfoSection>

      <InfoSection title="After you order">
        <p>
          Use the order page for updates. Tracking is the tracking number stored on the order, when
          one exists. Digital orders do not have courier tracking.
        </p>
        <InfoLinkList
          items={[
            {
              href: "/marketplace/physical",
              label: "Browse physical products",
              detail: "Shipping shown on a listing is specific to that product.",
            },
            {
              href: "/help/articles/shipping-estimates",
              label: "How shipping estimates work",
              detail: "Help article for buyers and sellers.",
            },
            {
              href: "/help/topics/orders",
              label: "Orders and shipping help",
              detail: "Order status, tracking, delays, and cancellations.",
            },
            {
              href: "/protection",
              label: "Buyer protection",
              detail: "How eligible order problems are reviewed.",
            },
          ]}
        />
      </InfoSection>

      <p className="text-sm">
        If checkout never showed shipping for a physical item, contact support with the product
        link before you rely on it.{" "}
        <Link href="/help/contact" className="font-medium text-[var(--color-accent)] hover:underline">
          Contact support
        </Link>
      </p>
    </PublicInfoPage>
  );
}
