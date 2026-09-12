import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
  loadStoreProducts,
} from "@/lib/commerce-os";
import type { ThemeDraft } from "@/lib/commerce-os/themes/registry";
import { StoreSelector } from "@/components/commerce-os/store-selector";
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
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Builder</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
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

  const [{ data: navRows }, { data: pageRows }, products] = await Promise.all([
    cosTable(db, "jimvio_store_navigation")
      .select("location, items")
      .eq("store_id", active.id),
    cosTable(db, "jimvio_store_pages")
      .select("id, title, handle, body_html, seo, published")
      .eq("store_id", active.id)
      .eq("vendor_id", auth.vendorId)
      .order("title", { ascending: true }),
    loadStoreProducts(db, active.id, { limit: 8 }),
  ]);

  const headerNav = asNavItems(
    navRows?.find((n: { location: string }) => n.location === "header")?.items
  );
  const footerNav = asNavItems(
    navRows?.find((n: { location: string }) => n.location === "footer")?.items
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Store Builder</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Design {active.name} for{" "}
            <a
              href={`https://${active.handle}.jimvio.com`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#FF5A1F] hover:underline"
            >
              {active.handle}.jimvio.com ↗
            </a>
          </p>
        </div>
        <StoreSelector
          stores={stores}
          activeId={active.id}
          basePath="/commerce/builder"
        />
      </div>
      <BuilderClient
        storeId={active.id}
        storeName={store?.name || active.name}
        handle={store?.handle || active.handle}
        logoUrl={store?.logo_url}
        status={store?.status || active.status}
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
            currency?: string | null;
            images?: unknown;
          }>
        }
      />
    </div>
  );
}
