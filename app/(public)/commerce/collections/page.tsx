import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { CreateCollectionForm } from "@/components/commerce-os/create-collection-form";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceCollectionsPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/collections");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Collections</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const { data: collections } = await db
    .from("jimvio_store_collections")
    .select("id, title, handle, published, sort_order, created_at")
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Collections</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Group products on {active.name}.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/collections"
      />
      {!collections?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No collections yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {collections.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-[#111827]">{c.title}</p>
                <p className="text-xs text-[#6B7280]">
                  /s/{active.handle}/collections/{c.handle} ·{" "}
                  {c.published ? "published" : "draft"}
                </p>
              </div>
              <Link
                href={`/s/${active.handle}/collections/${c.handle}`}
                className="text-xs font-semibold text-[#FF5A1F]"
                target="_blank"
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CreateCollectionForm storeId={active.id} />
    </div>
  );
}
