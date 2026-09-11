import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminCommercePage() {
  const db = createServiceRoleClient();

  const [
    storesTotal,
    storesPublished,
    storesDraft,
    storeProducts,
    domains,
    storeOrders,
  ] = await Promise.all([
    db.from("jimvio_stores").select("id", { count: "exact", head: true }),
    db
      .from("jimvio_stores")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    db
      .from("jimvio_stores")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    db.from("jimvio_store_products").select("id", { count: "exact", head: true }),
    db.from("jimvio_store_domains").select("id", { count: "exact", head: true }),
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .not("jimvio_store_id", "is", null),
  ]);

  const cards = [
    { label: "Jimvio stores", value: storesTotal.count ?? 0 },
    { label: "Published stores", value: storesPublished.count ?? 0 },
    { label: "Draft stores", value: storesDraft.count ?? 0 },
    { label: "Store product links", value: storeProducts.count ?? 0 },
    { label: "Domains", value: domains.count ?? 0 },
    { label: "Store-channel orders", value: storeOrders.count ?? 0 },
  ];

  const { data: recent } = await db
    .from("jimvio_stores")
    .select("id, name, handle, status, vendor_id, created_at, published_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Commerce OS</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Platform-wide counts for native Jimvio stores (not Shopify merchant_stores).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-[#E5E7EB] bg-white p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              {c.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <p className="text-sm font-medium text-[#111827]">Recent stores</p>
        {!recent?.length ? (
          <p className="mt-2 text-sm text-[#6B7280]">No Jimvio stores yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {recent.map((s) => (
              <li key={s.id} className="border-b border-[#F3F4F6] pb-2">
                <span className="font-medium text-[#111827]">{s.name}</span>
                <span className="text-[#6B7280]">
                  {" "}
                  · /s/{s.handle} · {s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
