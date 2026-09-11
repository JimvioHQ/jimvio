import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertCanCreateJimvioStore,
  slugifyHandle,
} from "./tenant";

export type CreateStoreInput = {
  vendorId: string;
  name: string;
  handle?: string;
  description?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  industry?: string | null;
  defaultCurrency?: string;
  defaultCountry?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  themeCode?: string;
};

export type CreateStoreResult =
  | { ok: true; storeId: string; handle: string; url: string }
  | { ok: false; error: string; code: string };

export async function createJimvioStore(
  db: SupabaseClient,
  input: CreateStoreInput
): Promise<CreateStoreResult> {
  const name = input.name.trim();
  if (name.length < 2) {
    return { ok: false, error: "Store name must be at least 2 characters.", code: "INVALID_NAME" };
  }

  const handle = slugifyHandle(input.handle || name);
  if (handle.length < 2) {
    return {
      ok: false,
      error: "Store handle must use letters, numbers, and dashes.",
      code: "INVALID_HANDLE",
    };
  }

  const entitlement = await assertCanCreateJimvioStore(db, input.vendorId);
  if (entitlement.ok === false) {
    return { ok: false, error: entitlement.error, code: "ENTITLEMENT" };
  }

  const { data: conflict } = await db
    .from("jimvio_stores")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  if (conflict) {
    return {
      ok: false,
      error: "That store handle is already taken. Choose another.",
      code: "HANDLE_TAKEN",
    };
  }

  let themeId: string | null = null;
  let themeSettings: Record<string, unknown> = {};
  const themeCode = input.themeCode || "modern";
  const { data: theme } = await db
    .from("jimvio_themes")
    .select("id, default_settings")
    .eq("code", themeCode)
    .eq("is_active", true)
    .maybeSingle();
  if (theme) {
    themeId = theme.id;
    themeSettings = (theme.default_settings as Record<string, unknown>) || {};
  }

  const { data: store, error } = await db
    .from("jimvio_stores")
    .insert({
      vendor_id: input.vendorId,
      name,
      handle,
      description: input.description ?? null,
      logo_url: input.logoUrl ?? null,
      favicon_url: input.faviconUrl ?? null,
      industry: input.industry ?? null,
      default_currency: input.defaultCurrency || "USD",
      default_country: (input.defaultCountry || "US").toUpperCase(),
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      theme_id: themeId,
      theme_settings: themeSettings,
      theme_draft: {
        sections: {
          home: [
            { id: "announcement", type: "announcement", enabled: true },
            { id: "header", type: "header", enabled: true },
            { id: "hero", type: "hero", enabled: true, props: { headline: name, subhead: "Shop the latest" } },
            { id: "featured_products", type: "featured_products", enabled: true },
            { id: "footer", type: "footer", enabled: true },
          ],
        },
        settings: themeSettings,
      },
      status: "draft",
      settings: {
        checkout: { guestCheckout: true },
        inventory: { trackInventory: true, continueSellingWhenOutOfStock: false },
        notifications: { orderConfirmation: true },
      },
    })
    .select("id, handle")
    .single();

  if (error || !store) {
    return {
      ok: false,
      error: error?.message || "Failed to create store.",
      code: "CREATE_FAILED",
    };
  }

  // Default subdomain record (verification pending until DNS/platform wiring)
  await db.from("jimvio_store_domains").insert({
    store_id: store.id,
    vendor_id: input.vendorId,
    hostname: `${store.handle}.jimvio.com`,
    kind: "jimvio_subdomain",
    is_primary: true,
    verification_status: "pending",
    ssl_status: "pending",
    dns_instructions: {
      note: "Jimvio subdomain routing is pending platform DNS configuration. Path storefront is available at /s/" + store.handle,
    },
  });

  // Default navigation + policy pages
  await db.from("jimvio_store_navigation").insert([
    {
      store_id: store.id,
      location: "header",
      items: [
        { label: "Home", href: `/s/${store.handle}` },
        { label: "All products", href: `/s/${store.handle}/collections/all` },
      ],
    },
    {
      store_id: store.id,
      location: "footer",
      items: [
        { label: "About", href: `/s/${store.handle}/pages/about` },
        { label: "Contact", href: `/s/${store.handle}/pages/contact` },
        { label: "Shipping", href: `/s/${store.handle}/pages/shipping-policy` },
        { label: "Refunds", href: `/s/${store.handle}/pages/refund-policy` },
      ],
    },
  ]);

  const defaultPages = [
    { title: "About", handle: "about", body_html: `<p>Welcome to ${name}.</p>` },
    { title: "Contact", handle: "contact", body_html: "<p>Contact us for support.</p>" },
    { title: "Shipping Policy", handle: "shipping-policy", body_html: "<p>Shipping details coming soon.</p>" },
    { title: "Refund Policy", handle: "refund-policy", body_html: "<p>Refund details coming soon.</p>" },
    { title: "Privacy Policy", handle: "privacy", body_html: "<p>Privacy policy coming soon.</p>" },
    { title: "Terms", handle: "terms", body_html: "<p>Terms of service coming soon.</p>" },
  ];

  await db.from("jimvio_store_pages").insert(
    defaultPages.map((p) => ({
      store_id: store.id,
      vendor_id: input.vendorId,
      ...p,
      published: true,
    }))
  );

  // Owner staff row
  const { data: vendor } = await db
    .from("vendors")
    .select("user_id")
    .eq("id", input.vendorId)
    .maybeSingle();
  if (vendor?.user_id) {
    await db.from("jimvio_store_staff").insert({
      store_id: store.id,
      vendor_id: input.vendorId,
      user_id: vendor.user_id,
      role: "owner",
      permissions: { all: true },
    });
  }

  return {
    ok: true,
    storeId: store.id,
    handle: store.handle,
    url: `/s/${store.handle}`,
  };
}

export async function publishJimvioStore(
  db: SupabaseClient,
  storeId: string,
  vendorId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: store } = await db
    .from("jimvio_stores")
    .select("id, theme_draft, theme_settings")
    .eq("id", storeId)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (!store) return { ok: false, error: "Store not found." };

  const draft = (store.theme_draft as Record<string, unknown>) || {};
  const settings = (draft.settings as Record<string, unknown>) || store.theme_settings || {};

  const { error } = await db
    .from("jimvio_stores")
    .update({
      status: "published",
      theme_settings: settings,
      published_at: new Date().toISOString(),
      published_theme_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId)
    .eq("vendor_id", vendorId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
