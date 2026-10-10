import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";
import { PageEditor } from "@/components/commerce-os/page-editor";

export const dynamic = "force-dynamic";

const PUBLIC_HANDLES = new Set([
  "terms",
  "privacy",
  "contact",
  "about",
  "refund-policy",
  "shipping-policy",
]);

type Props = { params: Promise<{ pageId: string }>; searchParams: Promise<{ storeId?: string }> };

export default async function CommercePageEditorPage({ params, searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/pages");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { pageId } = await params;
  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);
  if (!active) {
    return (
      <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
        Create a store
      </Link>
    );
  }

  const { data: page } = await cosTable(db, "jimvio_store_pages")
    .select("id, title, handle, body_html, published, store_id")
    .eq("id", pageId)
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (!page) notFound();

  const path = PUBLIC_HANDLES.has(page.handle) ? page.handle : `pages/${page.handle}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Edit page</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {active.name} · {page.title}
        </p>
      </div>
      <PageEditor
        storeId={active.id}
        viewHref={`https://${active.handle}.jimvio.com/${path}`}
        page={{
          id: page.id,
          title: page.title,
          handle: page.handle,
          body_html: page.body_html || "",
          published: Boolean(page.published),
        }}
      />
    </div>
  );
}
