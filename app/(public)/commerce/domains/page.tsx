import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { AddDomainForm } from "@/components/commerce-os/add-domain-form";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceDomainsPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/domains");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Domains</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const { data: domains } = await db
    .from("jimvio_store_domains")
    .select(
      "id, hostname, kind, is_primary, verification_status, ssl_status, dns_instructions, created_at"
    )
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Domains</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Path storefront is always available at /s/{active.handle}. Custom domains stay
          pending until DNS verification completes — SSL is never marked active prematurely.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/domains"
      />
      {!domains?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No domains recorded.
        </div>
      ) : (
        <ul className="space-y-2">
          {domains.map((d) => (
            <li
              key={d.id}
              className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm"
            >
              <p className="font-medium text-[#111827]">{d.hostname}</p>
              <p className="text-xs text-[#6B7280]">
                {d.kind}
                {d.is_primary ? " · primary" : ""} · verification{" "}
                {d.verification_status} · SSL {d.ssl_status}
              </p>
            </li>
          ))}
        </ul>
      )}
      <AddDomainForm storeId={active.id} />
    </div>
  );
}
