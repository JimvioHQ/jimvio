import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";
import {
  buildMissingStorefrontMetadata,
  buildStorefrontMetadata,
} from "@/lib/commerce-os/storefront-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; pageSlug: string }> };

const POLICY_FALLBACKS: Record<
  string,
  { title: string; body: (storeName: string) => string }
> = {
  terms: {
    title: "Terms of service",
    body: (n) =>
      `<p>These terms govern your use of the ${n} storefront. By placing an order you agree to the store policies published here.</p><p>For questions, use the Contact page.</p>`,
  },
  privacy: {
    title: "Privacy policy",
    body: (n) =>
      `<p>${n} respects your privacy. We use order and contact details only to fulfill purchases and provide customer support.</p><p>Contact the store for privacy requests.</p>`,
  },
  "refund-policy": {
    title: "Refund policy",
    body: (n) =>
      `<p>${n} wants you to be satisfied. Reach out through Contact if an item arrives damaged or not as described. Approved refunds follow the store's review process.</p>`,
  },
  "shipping-policy": {
    title: "Shipping policy",
    body: (n) =>
      `<p>${n} ships orders as quickly as possible. Delivery times vary by destination and carrier. Tracking is provided when available.</p>`,
  },
  contact: {
    title: "Contact",
    body: (n) =>
      `<p>Questions about ${n}? Use the store contact details in the footer or reply to your order confirmation email.</p>`,
  },
  about: {
    title: "About",
    body: (n) =>
      `<p>Welcome to ${n}. We curate products and fulfill orders with care.</p>`,
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, pageSlug } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) return buildMissingStorefrontMetadata();
  const fallback = POLICY_FALLBACKS[pageSlug];
  return buildStorefrontMetadata(store, {
    path: `/pages/${pageSlug}`,
    title: `${fallback?.title || pageSlug} | ${store.name}`,
    description: store.description || `${fallback?.title || "Page"} — ${store.name}`,
  });
}

export default async function StorefrontContentPage({ params }: Props) {
  const { handle, pageSlug } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const { data: page } = await cosTable(supabase, "jimvio_store_pages")
    .select("title, handle, body_html, published")
    .eq("store_id", store.id)
    .eq("handle", pageSlug)
    .eq("published", true)
    .maybeSingle();

  const fallback = POLICY_FALLBACKS[pageSlug];
  if (!page && !fallback) notFound();

  const title = page?.title || fallback?.title || pageSlug;
  const bodyHtml =
    (page?.body_html && page.body_html.trim()) ||
    fallback?.body(store.name) ||
    `<p>Content coming soon.</p>`;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <div
        className="prose prose-sm mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </article>
  );
}
