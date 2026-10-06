"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
import {
  storefrontDisplayHost,
  storefrontDisplayUrl,
} from "@/lib/commerce-os/storefront-url";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";
import { cn } from "@/lib/utils";

type Store = {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  announcement_bar: string | null;
  default_currency: string;
  default_country: string;
  status: string;
  industry: string | null;
  theme_settings?: Record<string, unknown> | null;
  seo?: Record<string, unknown> | null;
  social?: Record<string, unknown> | null;
};

type CategoryId =
  | "general"
  | "branding"
  | "storefront"
  | "domain"
  | "payments"
  | "shipping"
  | "notifications"
  | "seo"
  | "policies"
  | "advanced";

const CATEGORIES: Array<{ id: CategoryId; label: string; description: string }> = [
  {
    id: "general",
    label: "General",
    description: "Store identity, contact details, and region.",
  },
  {
    id: "branding",
    label: "Branding",
    description: "Control how your store appears to customers.",
  },
  {
    id: "storefront",
    label: "Storefront",
    description: "Theme and presentation shortcuts.",
  },
  {
    id: "domain",
    label: "Domain",
    description: "Your Jimvio subdomain and custom domain.",
  },
  {
    id: "payments",
    label: "Payments",
    description: "Active checkout providers for this store.",
  },
  {
    id: "shipping",
    label: "Shipping",
    description: "Delivery settings for fulfilled orders.",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Order and shipping communication.",
  },
  {
    id: "seo",
    label: "SEO",
    description: "Search title and meta description.",
  },
  {
    id: "policies",
    label: "Policies",
    description: "Legal pages managed in Pages / Builder.",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Danger zone and developer pointers.",
  },
];

export function StoreSettingsForm({ store }: { store: Store }) {
  const router = useRouter();
  const [category, setCategory] = useState<CategoryId>("general");
  const [form, setForm] = useState(store);
  const [primaryColor, setPrimaryColor] = useState(
    String(store.theme_settings?.primaryColor || "#FF5A1F"),
  );
  const [seoTitle, setSeoTitle] = useState(
    String(store.seo?.title || store.name || ""),
  );
  const [seoDescription, setSeoDescription] = useState(
    String(store.seo?.description || store.description || ""),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const liveUrl = storefrontDisplayUrl(store.handle);
  const liveHost = storefrontDisplayHost(store.handle);

  const activeCategory = useMemo(
    () => CATEGORIES.find((c) => c.id === category) || CATEGORIES[0],
    [category],
  );

  function markDirty() {
    setDirty(true);
    setMessage(null);
  }

  async function saveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/commerce/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          announcement_bar: form.announcement_bar,
          default_currency: "USD",
          default_country: form.default_country,
          industry: form.industry,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Save failed.");
        return;
      }
      setMessage("General settings saved.");
      setDirty(false);
      router.refresh();
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBranding() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/commerce/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo_url: form.logo_url,
          favicon_url: form.favicon_url,
          branding: {
            logo_url: form.logo_url,
            favicon_url: form.favicon_url,
            primaryColor,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Save failed.");
        return;
      }
      setMessage("Branding saved.");
      setDirty(false);
      router.refresh();
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSeo() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/commerce/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seo: {
            title: seoTitle,
            description: seoDescription,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Save failed.");
        return;
      }
      setMessage("SEO settings saved.");
      setDirty(false);
      router.refresh();
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/commerce/stores/${store.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Publish failed.");
        return;
      }
      setMessage("Store published.");
      router.refresh();
    } catch {
      setError("Publish request failed.");
    } finally {
      setBusy(false);
    }
  }

  function field(
    key: keyof Store,
    label: string,
    opts?: { textarea?: boolean; hint?: string },
  ) {
    const value = form[key] ?? "";
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-[#374151]">{label}</span>
        {opts?.textarea ? (
          <textarea
            value={String(value)}
            onChange={(e) => {
              markDirty();
              setForm((f) => ({ ...f, [key]: e.target.value }));
            }}
            rows={3}
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
          />
        ) : (
          <input
            value={String(value)}
            onChange={(e) => {
              markDirty();
              setForm((f) => ({ ...f, [key]: e.target.value }));
            }}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
          />
        )}
        {opts?.hint ? (
          <span className="mt-1 block text-[11px] text-[#9CA3AF]">{opts.hint}</span>
        ) : null}
      </label>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav
        aria-label="Settings categories"
        className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
      >
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
              category === c.id
                ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
                : "text-[#4B5563] hover:bg-[#F3F4F6]",
            )}
          >
            {c.label}
          </button>
        ))}
      </nav>

      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">
              {activeCategory.label}
            </h2>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              {activeCategory.description}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={
                dirty
                  ? "rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-800"
                  : "rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"
              }
            >
              {dirty ? "Unsaved changes" : message ? "Saved" : "Up to date"}
            </span>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 font-semibold text-[#374151]"
            >
              View store
            </a>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-emerald-700" role="status">
            {message}
          </p>
        ) : null}

        {category === "general" ? (
          <form onSubmit={saveGeneral} className="space-y-3">
            <CommerceCard className="space-y-3 p-4">
              {field("name", "Store name")}
              {field("description", "Description", { textarea: true })}
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Store handle
                </span>
                <input
                  value={form.handle}
                  disabled
                  className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#6B7280]"
                />
                <span className="mt-1 block text-[11px] text-[#9CA3AF]">
                  {liveHost}
                </span>
              </label>
              {field("contact_email", "Contact email")}
              {field("contact_phone", "Contact phone")}
              {field("industry", "Industry")}
              {field("announcement_bar", "Announcement bar")}
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-[#374151]">
                    Default currency
                  </span>
                  <input
                    value="USD"
                    disabled
                    className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#6B7280]"
                  />
                  <span className="mt-1 block text-[11px] text-[#9CA3AF]">
                    Merchant Commerce UI displays USD.
                  </span>
                </label>
                {field("default_country", "Country")}
              </div>
            </CommerceCard>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Save general
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void publish()}
                className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50"
              >
                Publish store
              </button>
            </div>
          </form>
        ) : null}

        {category === "branding" ? (
          <div className="space-y-3">
            <CommerceCard className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Logo
              </p>
              <div className="flex items-center gap-3">
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logo_url}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <span className="grid h-14 w-14 place-items-center rounded-xl bg-[#FF5A1F] text-lg font-bold text-white">
                    {form.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="space-y-2">
                  <CloudinaryUploadButton
                    folder="jimvio/vendor-logos"
                    resourceType="image"
                    buttonText={form.logo_url ? "Replace logo" : "Upload logo"}
                    onUploadSuccess={(url) => {
                      markDirty();
                      setForm((f) => ({ ...f, logo_url: url }));
                    }}
                    onUploadError={(err) => setError(err)}
                  />
                  {form.logo_url ? (
                    <button
                      type="button"
                      onClick={() => {
                        markDirty();
                        setForm((f) => ({ ...f, logo_url: null }));
                      }}
                      className="block text-xs font-semibold text-[#6B7280] underline"
                    >
                      Remove logo
                    </button>
                  ) : null}
                </div>
              </div>
            </CommerceCard>

            <CommerceCard className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Favicon
              </p>
              <div className="flex items-center gap-3">
                {form.favicon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.favicon_url}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#F3F4F6] text-xs font-semibold text-[#9CA3AF]">
                    —
                  </span>
                )}
                <div className="space-y-2">
                  <CloudinaryUploadButton
                    folder="jimvio/vendor-logos"
                    resourceType="image"
                    buttonText={
                      form.favicon_url ? "Replace favicon" : "Upload favicon"
                    }
                    onUploadSuccess={(url) => {
                      markDirty();
                      setForm((f) => ({ ...f, favicon_url: url }));
                    }}
                    onUploadError={(err) => setError(err)}
                  />
                  {form.favicon_url ? (
                    <button
                      type="button"
                      onClick={() => {
                        markDirty();
                        setForm((f) => ({ ...f, favicon_url: null }));
                      }}
                      className="block text-xs font-semibold text-[#6B7280] underline"
                    >
                      Remove favicon
                    </button>
                  ) : null}
                  <p className="text-[11px] text-[#9CA3AF]">
                    Square PNG or ICO, at least 32×32.
                  </p>
                </div>
              </div>
            </CommerceCard>

            <CommerceCard className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Brand colors
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-[#374151]">
                    Primary
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        markDirty();
                        setPrimaryColor(e.target.value);
                      }}
                      className="h-10 w-12 cursor-pointer rounded border border-[#E5E7EB]"
                    />
                    <input
                      value={primaryColor}
                      onChange={(e) => {
                        markDirty();
                        setPrimaryColor(e.target.value);
                      }}
                      className="h-10 w-28 rounded-lg border border-[#E5E7EB] px-3 text-sm uppercase"
                    />
                  </div>
                </label>
                <div
                  className="rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm"
                  style={{ background: primaryColor, color: "#fff" }}
                >
                  Preview button
                </div>
              </div>
            </CommerceCard>

            <button
              type="button"
              disabled={busy}
              onClick={() => void saveBranding()}
              className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Save branding
            </button>
          </div>
        ) : null}

        {category === "storefront" ? (
          <CommerceCard className="space-y-3 p-4 text-sm text-[#4B5563]">
            <p>
              Design your homepage, navigation, header, and footer in the
              Storefront builder.
            </p>
            <a
              href={`/commerce/builder?storeId=${store.id}`}
              className="inline-flex rounded-lg bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
            >
              Open Storefront builder
            </a>
          </CommerceCard>
        ) : null}

        {category === "domain" ? (
          <CommerceCard className="space-y-3 p-4 text-sm text-[#4B5563]">
            <div>
              <p className="text-xs font-medium text-[#6B7280]">Store subdomain</p>
              <p className="mt-1 font-semibold text-[#111827]">{liveHost}</p>
            </div>
            <a
              href={`/commerce/domains?storeId=${store.id}`}
              className="inline-flex rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
            >
              Manage domains
            </a>
          </CommerceCard>
        ) : null}

        {category === "payments" ? (
          <CommerceCard className="space-y-2 p-4 text-sm text-[#4B5563]">
            <p>Active providers: Flutterwave, Mobile Money, NOWPayments, Binance Pay.</p>
            <a
              href={`/commerce/payments?storeId=${store.id}`}
              className="inline-flex rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
            >
              Open payments
            </a>
          </CommerceCard>
        ) : null}

        {category === "shipping" ? (
          <CommerceCard className="space-y-2 p-4 text-sm text-[#4B5563]">
            <p>Configure shipping zones and rates for this store.</p>
            <a
              href={`/commerce/shipping?storeId=${store.id}`}
              className="inline-flex rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
            >
              Open shipping
            </a>
          </CommerceCard>
        ) : null}

        {category === "notifications" ? (
          <CommerceCard className="p-4 text-sm text-[#6B7280]">
            Customer order, payment, and shipping emails are sent by the platform
            checkout lifecycle. Per-store notification toggles are not available
            yet.
          </CommerceCard>
        ) : null}

        {category === "seo" ? (
          <div className="space-y-3">
            <CommerceCard className="space-y-3 p-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  SEO title
                </span>
                <input
                  value={seoTitle}
                  onChange={(e) => {
                    markDirty();
                    setSeoTitle(e.target.value);
                  }}
                  className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Meta description
                </span>
                <textarea
                  value={seoDescription}
                  onChange={(e) => {
                    markDirty();
                    setSeoDescription(e.target.value);
                  }}
                  rows={3}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
                />
              </label>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                <p className="text-sm font-semibold text-[#1a0dab]">
                  {seoTitle || form.name}
                </p>
                <p className="text-xs text-[#006621]">{liveHost}</p>
                <p className="mt-1 text-xs text-[#4B5563]">
                  {seoDescription || "Your store meta description will appear here."}
                </p>
              </div>
            </CommerceCard>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveSeo()}
              className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Save SEO
            </button>
          </div>
        ) : null}

        {category === "policies" ? (
          <CommerceCard className="space-y-2 p-4 text-sm text-[#4B5563]">
            <p>
              Terms, privacy, refund, and shipping policy pages are managed as
              store pages.
            </p>
            <a
              href={`/commerce/pages?storeId=${store.id}`}
              className="inline-flex rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
            >
              Manage pages
            </a>
          </CommerceCard>
        ) : null}

        {category === "advanced" ? (
          <div className="space-y-3">
            <CommerceCard className="p-4 text-sm text-[#6B7280]">
              API keys and webhooks for native stores are platform-managed.
              Merchant-facing developer credentials are not exposed here.
            </CommerceCard>
            <CommerceCard className="border-red-200 p-4">
              <h3 className="text-sm font-semibold text-red-700">Danger zone</h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                Store archive/delete is not available from Commerce Settings yet.
                Contact Jimvio support for irreversible store removal.
              </p>
            </CommerceCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
