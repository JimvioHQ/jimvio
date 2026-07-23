"use client";

import { useMemo, useState } from "react";
import { Package, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMMERCE_KINDS,
  COMMERCE_KIND_LABELS,
  type CommerceEmbed,
  type CommerceKind,
} from "@/lib/community/commerce";
import { createClient } from "@/lib/supabase/client";

/**
 * Attach a commerce offer into the conversation (reuses products table when available).
 */
export function AttachCommerceDialog({
  open,
  onClose,
  onAttach,
}: {
  open: boolean;
  onClose: () => void;
  onAttach: (embed: CommerceEmbed) => void;
}) {
  const [kind, setKind] = useState<CommerceKind>("product");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kinds = useMemo(() => COMMERCE_KINDS, []);

  if (!open) return null;

  async function loadProduct() {
    const s = slug.trim();
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, slug, price, compare_at_price, images, inventory_quantity, rating, review_count, vendor_id, vendors(business_name)"
        )
        .eq("slug", s)
        .eq("status", "active")
        .maybeSingle();
      if (!data) {
        setError("Product not found");
        return;
      }
      const images = data.images as string[] | null;
      const vendors = data.vendors as { business_name?: string } | null;
      onAttach({
        kind: "product",
        id: data.id,
        title: data.name,
        price: Number(data.price),
        compareAtPrice: data.compare_at_price
          ? Number(data.compare_at_price)
          : null,
        imageUrl: Array.isArray(images) ? images[0] : null,
        href: `/marketplace/${data.slug}`,
        sellerId: data.vendor_id,
        sellerName: vendors?.business_name ?? null,
        inventory: data.inventory_quantity ?? null,
        rating: data.rating != null ? Number(data.rating) : null,
        reviewCount: data.review_count ?? null,
        currency: "RWF",
      });
      onClose();
    } catch {
      setError("Could not load product");
    } finally {
      setLoading(false);
    }
  }

  function submitManual() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    const id = `manual-${Date.now()}`;
    const priceNum = price.trim() ? Number(price) : null;
    const base: CommerceEmbed = {
      kind,
      id,
      title: title.trim(),
      price: priceNum != null && !Number.isNaN(priceNum) ? priceNum : null,
      currency: kind === "donation" ? "USD" : "RWF",
      href:
        kind === "course"
          ? `/courses/${id}`
          : kind === "product" || kind === "marketplace_item"
            ? `/marketplace/${id}`
            : null,
    };
    if (kind === "affiliate") {
      base.affiliateCode = "jimvio";
      base.commissionRate = 10;
    }
    if (kind === "booking") {
      base.bookingType = "mentorship";
      base.durationMinutes = 30;
    }
    if (kind === "donation" || kind === "subscription") {
      base.donationMode = kind === "subscription" ? "monthly" : "support";
    }
    if (kind === "coupon") {
      base.couponCode = "CREATOR10";
      base.discountLabel = "10% off";
    }
    if (kind === "course") {
      base.lessons = 8;
      base.certificate = true;
    }
    onAttach(base);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="attach-commerce-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2
            id="attach-commerce-title"
            className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]"
          >
            <Package className="h-4 w-4 text-[var(--color-accent)]" />
            Attach commerce
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-[var(--color-surface-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-1">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-md px-2 py-1 text-[10px] font-semibold",
                  kind === k
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                )}
              >
                {COMMERCE_KIND_LABELS[k]}
              </button>
            ))}
          </div>

          {(kind === "product" || kind === "marketplace_item") && (
            <div className="space-y-2 rounded-lg border border-dashed border-[var(--color-border)] p-3">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                Load from marketplace
              </p>
              <div className="flex gap-2">
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Product slug"
                  className="flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadProduct()}
                  className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  {loading ? "…" : "Load"}
                </button>
              </div>
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              placeholder={COMMERCE_KIND_LABELS[kind]}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
              Price (optional)
            </span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              placeholder="0"
            />
          </label>

          {error && (
            <p className="text-[12px] font-medium text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submitManual}
            className="w-full rounded-md bg-[var(--color-accent)] py-2 text-sm font-semibold text-white"
          >
            Attach to conversation
          </button>
        </div>
      </div>
    </div>
  );
}
