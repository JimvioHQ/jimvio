import type { Metadata } from "next";
import type { ComponentType } from "react";
import { notFound, redirect } from "next/navigation";
import {
  AffiliateTermsDocument,
  AdvertisingDisclosureDocument,
  BuyerTermsDocument,
  CommerceIntegrationsDocument,
  CopyrightIpDocument,
  DeveloperDocument,
  DigitalProductsDocument,
  EarningsDocument,
  SellerTermsDocument,
  UgcClippingDocument,
  WalletDocument,
  YouthSafetyDocument,
} from "@/components/legal";
import { getLegalDocument } from "@/lib/legal/catalog";
import { constructMetadata } from "@/lib/seo";

const SLUG_TO_COMPONENT: Record<string, ComponentType> = {
  "buyer-terms": BuyerTermsDocument,
  "seller-terms": SellerTermsDocument,
  earnings: EarningsDocument,
  "ugc-clipping": UgcClippingDocument,
  "digital-products": DigitalProductsDocument,
  wallet: WalletDocument,
  "commerce-integrations": CommerceIntegrationsDocument,
  developer: DeveloperDocument,
  "copyright-ip": CopyrightIpDocument,
  "youth-safety": YouthSafetyDocument,
  "affiliate-terms": AffiliateTermsDocument,
  "advertising-disclosure": AdvertisingDisclosureDocument,
};

/** Canonical aliases that already have dedicated top-level routes. */
const CANONICAL_REDIRECTS: Record<string, string> = {
  terms: "/terms",
  privacy: "/privacy",
  cookies: "/cookies",
  "community-guidelines": "/community-guidelines",
  "prohibited-products": "/prohibited-products",
  "refunds-disputes": "/refunds-payouts",
  "refunds-payouts": "/refunds-payouts",
};

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(SLUG_TO_COMPONENT).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = getLegalDocument(slug);
  if (!doc || !SLUG_TO_COMPONENT[slug]) {
    return constructMetadata({
      title: "Legal document",
      description: "Jimvio legal document",
      path: `/legal/${slug}`,
    });
  }
  return constructMetadata({
    title: doc.title,
    description: doc.description,
    path: doc.href,
  });
}

export default async function LegalSlugPage({ params }: Props) {
  const { slug } = await params;

  if (CANONICAL_REDIRECTS[slug]) {
    redirect(CANONICAL_REDIRECTS[slug]);
  }

  const Component = SLUG_TO_COMPONENT[slug];
  if (!Component) notFound();

  return <Component />;
}
