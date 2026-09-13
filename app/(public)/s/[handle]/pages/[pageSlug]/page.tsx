import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";
import {
  buildMissingStorefrontMetadata,
  buildStorefrontMetadata,
} from "@/lib/commerce-os/storefront-metadata";
import { POLICY_TEMPLATES } from "@/lib/commerce-os/builder/policy-templates";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; pageSlug: string }> };

function policyFallback(pageSlug: string, storeName: string) {
  const tpl = POLICY_TEMPLATES[pageSlug];
  if (!tpl) return null;
  return { title: tpl.title, body: tpl.bodyHtml(storeName) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, pageSlug } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) return buildMissingStorefrontMetadata();
  const fallback = policyFallback(pageSlug, store.name);
  return buildStorefrontMetadata(store, {
    path: `/pages/${pageSlug}`,
    title: `${fallback?.title || pageSlug} | ${store.name}`,
    description: store.description || `${fallback?.title || "Page"} — ${store.name}`,
    themeLogoUrl: store.theme_settings?.logoUrl ?? null,
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

  const fallback = policyFallback(pageSlug, store.name);
  if (!page && !fallback) notFound();

  const title = page?.title || fallback?.title || pageSlug;
  const bodyHtml =
    (page?.body_html && page.body_html.trim()) ||
    fallback?.body ||
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
