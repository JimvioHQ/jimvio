import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
  loadStoreProducts,
  loadStoreCollections,
} from "@/lib/commerce-os";
import type { ThemeDraft } from "@/lib/commerce-os/themes/registry";
import { BuilderClient } from "@/components/commerce-os/builder-client";
import { cosTable } from "@/lib/commerce-os/db";
import type { NavItem } from "@/lib/commerce-os/builder/nav-safe";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

function asNavItems(raw: unknown): NavItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is NavItem =>
        !!x &&
        typeof x === "object" &&
        typeof (x as NavItem).label === "string" &&
        typeof (x as NavItem).href === "string"
    )
    .map((x) => ({ label: x.label, href: x.href }));
}

export default async function CommerceBuilderPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/builder");
    return (
      <div className="grid h-dvh place-items-center p-6 text-sm text-[#4B5563]">
        {auth.error}
      </div>
    );
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="grid h-dvh place-items-center p-6">
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-semibold text-[#111827]">Store Builder</h1>
          <p className="text-sm text-[#6B7280]">Create a store to start designing.</p>
          <Link
            href="/commerce/stores"
            className="inline-flex rounded-lg bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white"
          >
            Create a store
          </Link>
          <div>
            <Link href="/commerce" className="text-xs font-semibold text-[#6B7280] underline">
              Back to Commerce
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: store } = await cosTable(db, "jimvio_stores")
    .select(
      "id, name, handle, theme_draft, logo_url, status, seo, social, description"
    )
    .eq("id", active.id)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  const [{ data: navRows }, { data: pageRows }, products, collections] =
    await Promise.all([
      cosTable(db, "jimvio_store_navigation")
        .select("location, items")
        .eq("store_id", active.id),
      cosTable(db, "jimvio_store_pages")
        .select("id, title, handle, body_html, seo, published")
        .eq("store_id", active.id)
        .eq("vendor_id", auth.vendorId)
        .order("title", { ascending: true }),
      loadStoreProducts(db, active.id, { limit: 24 }),
      loadStoreCollections(db, active.id, { limit: 12 }),
    ]);

  const headerNav = asNavItems(
    navRows?.find((n: { location: string }) => n.location === "header")?.items
  );
  const footerNav = asNavItems(
    navRows?.find((n: { location: string }) => n.location === "footer")?.items
  );

  return (
    <BuilderClient
      storeId={active.id}
      storeName={store?.name || active.name}
      handle={store?.handle || active.handle}
      logoUrl={store?.logo_url}
      status={store?.status || active.status}
      stores={stores.map((s) => ({
        id: s.id,
        name: s.name,
        handle: s.handle,
        status: s.status,
      }))}
      initialDraft={(store?.theme_draft as ThemeDraft) || null}
      initialNav={{ header: headerNav, footer: footerNav }}
      initialPages={(pageRows || []) as Array<{
        id: string;
        title: string;
        handle: string;
        body_html: string | null;
        seo: Record<string, unknown> | null;
        published: boolean;
      }>}
      initialSeo={(store?.seo as Record<string, unknown>) || {}}
      initialSocial={(store?.social as Record<string, unknown>) || {}}
      initialDescription={store?.description}
      previewProducts={
        products as Array<{
          id: string;
          name: string;
          slug: string;
          price: number | string | null;
          compare_at_price?: number | string | null;
          currency?: string | null;
          images?: unknown;
          short_description?: string | null;
          inventory_quantity?: number | null;
          track_inventory?: boolean | null;
        }>
      }
      previewCollections={collections}
    />
  );
}
