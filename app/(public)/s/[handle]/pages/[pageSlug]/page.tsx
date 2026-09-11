import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; pageSlug: string }> };

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

  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      <div
        className="prose prose-sm mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: page.body_html || "" }}
      />
    </article>
  );
}
