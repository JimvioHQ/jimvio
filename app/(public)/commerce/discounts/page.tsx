import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { CreateDiscountForm } from "@/components/commerce-os/create-discount-form";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceDiscountsPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/discounts");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Discounts</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const { data: discounts } = await cosTable(db, "jimvio_store_discounts")
    .select(
      "id, code, title, discount_type, value, is_active, used_count, usage_limit, starts_at, ends_at"
    )
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Discounts</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Store-scoped discounts for {active.name}.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/discounts"
      />
      {!discounts?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No discounts yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {discounts.map((d) => (
            <li
              key={d.id}
              className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm"
            >
              <p className="font-medium text-[#111827]">{d.title}</p>
              <p className="text-xs text-[#6B7280]">
                {d.code ? `Code ${d.code} · ` : ""}
                {d.discount_type} {d.value}
                {d.discount_type === "percent" ? "%" : ""} ·{" "}
                {d.is_active ? "active" : "inactive"} · used {d.used_count}
                {d.usage_limit != null ? ` / ${d.usage_limit}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <CreateDiscountForm storeId={active.id} />
    </div>
  );
}
