import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
} from "@/lib/commerce-os";
import { CreateStoreForm } from "@/components/commerce-os/create-store-form";
import { TemplateThumbnail } from "@/components/commerce-os/template-thumbnail";
import { cosTable } from "@/lib/commerce-os/db";
import { storefrontDisplayUrl } from "@/lib/commerce-os/storefront-url";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";
import { mergeThemeSettings, type ThemeDraft } from "@/lib/commerce-os/themes/registry";
import { providerStoreSettings, storeTemplateById } from "@/lib/commerce-os/themes/store-template";

export const dynamic = "force-dynamic";

export default async function CommerceStoresPage() {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/stores");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);

  const { data: full } = await cosTable(db, "jimvio_stores")
    .select(
      "id, name, handle, logo_url, status, published_at, created_at, updated_at, theme_draft",
    )
    .eq("vendor_id", auth.vendorId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const storeRows = full ?? [];
  const storeIds = storeRows.map((s) => s.id);
  const productCount = new Map<string, number>();

  if (storeIds.length) {
    const { data: links } = await cosTable(db, "jimvio_store_products")
      .select("store_id, status")
      .in("store_id", storeIds)
      .neq("status", "archived");
    for (const row of links ?? []) {
      if (!row.store_id) continue;
      productCount.set(row.store_id, (productCount.get(row.store_id) || 0) + 1);
    }
  }

  if (!stores.length) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Your Stores</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage your storefront, customize its design, and grow your online business.
          </p>
        </div>
        <CreateStoreForm variant="hero" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Your Stores</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage your storefront, customize its design, and grow your online business.
          </p>
        </div>
        <CreateStoreForm variant="compact" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {storeRows.map((store) => {
          const draft = (store.theme_draft as ThemeDraft | null) || null;
          const template = storeTemplateById(draft?.templateId);
          const settings = mergeThemeSettings(providerStoreSettings(), draft?.settings || {});
          const published = store.status === "published";
          const liveUrl = storefrontDisplayUrl(store.handle);
          const products = productCount.get(store.id) || 0;
          const overviewHref = `/commerce/builder?storeId=${store.id}`;
          return (
            <CommerceCard key={store.id} className="overflow-hidden p-0">
              <div className="grid gap-0 sm:grid-cols-[180px_minmax(0,1fr)]">
                <Link href={overviewHref} className="block bg-[#F8FAFC] p-3" aria-label={`${store.name} overview`}>
                  <TemplateThumbnail settings={settings} label={template?.label || store.name} />
                </Link>
                <div className="flex min-w-0 flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#111827] text-sm font-bold text-white">
                        {store.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <Link href={overviewHref} className="font-semibold text-[#111827] hover:text-[#FF5A1F]">
                        {store.name}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-[#6B7280]">{store.handle}.jimvio.com</p>
                      <span
                        className={
                          published
                            ? "mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                            : "mt-2 inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                        }
                      >
                        {published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    {products} {products === 1 ? "product" : "products"}
                    {template ? ` · ${template.label}` : " · Custom design"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/commerce/builder?storeId=${store.id}&view=editor`}
                      className="rounded-md bg-[#FF5A1F] px-2.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Edit Store
                    </Link>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                    >
                      View Store
                    </a>
                    <Link
                      href={overviewHref}
                      className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                    >
                      Customize Design
                    </Link>
                    <Link
                      href={`/commerce/settings?storeId=${store.id}`}
                      className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                    >
                      Settings
                    </Link>
                  </div>
                </div>
              </div>
            </CommerceCard>
          );
        })}
      </div>
    </div>
  );
}
