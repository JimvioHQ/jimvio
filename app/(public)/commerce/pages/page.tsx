import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { cosTable } from "@/lib/commerce-os/db";
import {
  defaultStorePageHtml,
  defaultStorePageTitle,
  missingDefaultStorePageHandles,
} from "@/lib/commerce-os/storefront/page-content";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommercePagesPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/pages");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Pages</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const { data: existingPages } = await cosTable(db, "jimvio_store_pages")
    .select("id, title, handle, published, updated_at")
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("title", { ascending: true });

  const missing = missingDefaultStorePageHandles(
    (existingPages ?? []).map((p) => String(p.handle))
  );
  if (missing.length) {
    const { data: storeRow } = await cosTable(db, "jimvio_stores")
      .select("name, contact_email, contact_phone, business_info")
      .eq("id", active.id)
      .eq("vendor_id", auth.vendorId)
      .maybeSingle();
    const info =
      storeRow?.business_info &&
      typeof storeRow.business_info === "object" &&
      !Array.isArray(storeRow.business_info)
        ? (storeRow.business_info as Record<string, unknown>)
        : {};
    const address = typeof info.address === "string" ? info.address : null;
    await cosTable(db, "jimvio_store_pages").insert(
      missing.map((handle) => ({
        store_id: active.id,
        vendor_id: auth.vendorId,
        title: defaultStorePageTitle(handle),
        handle,
        body_html: defaultStorePageHtml(handle, storeRow?.name || active.name, {
          email: storeRow?.contact_email,
          phone: storeRow?.contact_phone,
          address,
        }),
        published: false,
      }))
    );
  }

  const { data: pages } = missing.length
    ? await cosTable(db, "jimvio_store_pages")
        .select("id, title, handle, published, updated_at")
        .eq("store_id", active.id)
        .eq("vendor_id", auth.vendorId)
        .order("title", { ascending: true })
    : { data: existingPages };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Pages</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Content pages for {active.name} (About, policies, etc.).
        </p>
      </div>
      <StoreSelector stores={stores} activeId={active.id} basePath="/commerce/pages" />
      {!pages?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No pages yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-[#111827]">{p.title}</p>
                <p className="text-xs text-[#6B7280]">
                  {active.handle}.jimvio.com/
                  {["terms", "privacy", "contact", "about", "refund-policy", "shipping-policy"].includes(
                    p.handle
                  )
                    ? p.handle
                    : `pages/${p.handle}`}{" "}
                  · {p.published ? "published" : "draft"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/commerce/pages/${p.id}?storeId=${active.id}`}
                  className="text-xs font-semibold text-[#111827]"
                >
                  Edit
                </Link>
                <Link
                  href={`https://${active.handle}.jimvio.com/${["terms","privacy","contact","about","refund-policy","shipping-policy"].includes(p.handle) ? p.handle : `pages/${p.handle}`}`}
                  className="text-xs font-semibold text-[#FF5A1F]"
                  target="_blank"
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
