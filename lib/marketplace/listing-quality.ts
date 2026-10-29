/**
 * N-5: the listing quality score a buyer sees on every product page.
 *
 * Computed in code from the listing itself — never typed in by hand — so the
 * buyer can see exactly why a listing scored what it did. It rates how
 * complete and clear the listing is, not the product.
 */
import { cleanSupplierProductName } from "../catalog/clean-product-name";

export type ListingQualityInput = {
  name?: string | null;
  description?: string | null;
  short_description?: string | null;
  images?: unknown;
  price?: number | string | null;
  category_id?: string | null;
  is_digital?: boolean | null;
  product_type?: string | null;
  digital_verification_state?: string | null;
  product_shipping_options?: Array<{ is_active?: boolean | null }> | null;
  /** Supplier listings (CJ) get shipping quoted live for the buyer's region. */
  source?: string | null;
  vendors?: { verification_status?: string | null } | null;
};

export type ListingQualityCheck = {
  id: "title" | "description" | "photos" | "price" | "category" | "delivery" | "seller";
  label: string;
  points: number;
  earned: number;
  detail: string;
};

export type ListingQuality = {
  score: number;
  level: "excellent" | "good" | "fair" | "needs-work";
  checks: ListingQualityCheck[];
};

function plainText(html: string | null | undefined): string {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function imageCount(images: unknown): number {
  if (Array.isArray(images)) {
    return images.filter((i) => (typeof i === "string" ? i.trim() : (i as { url?: string })?.url)).length;
  }
  if (typeof images === "string" && images.trim()) {
    try {
      return imageCount(JSON.parse(images));
    } catch {
      return 1;
    }
  }
  return 0;
}

const VERIFIED = new Set(["verified", "approved"]);

export function listingQuality(p: ListingQualityInput): ListingQuality {
  const name = (p.name ?? "").trim();
  const desc = plainText(p.description) || plainText(p.short_description);
  const photos = imageCount(p.images);
  const price = Number(p.price ?? 0);
  const digital = p.is_digital === true || (p.product_type ?? "physical") !== "physical";
  const shipping = (p.product_shipping_options ?? []).filter((o) => o.is_active !== false).length;
  const liveShipping = (p.source ?? "").toLowerCase() === "cj";

  const titleOk = name.length >= 10 && name.length <= 140 && cleanSupplierProductName(name) === name;
  const checks: ListingQualityCheck[] = [
    {
      id: "title",
      label: "Clear title",
      points: 15,
      earned: titleOk ? 15 : 0,
      detail: titleOk ? "Readable name without supplier keywords" : "Title is too short, too long or has supplier keywords",
    },
    {
      id: "description",
      label: "Description",
      points: 20,
      earned: desc.length >= 200 ? 20 : desc.length >= 40 ? 10 : 0,
      detail:
        desc.length >= 200 ? "Detailed description" : desc.length >= 40 ? "Short description" : "No real description",
    },
    {
      id: "photos",
      label: "Photos",
      points: 20,
      earned: photos >= 3 ? 20 : photos >= 1 ? 10 : 0,
      detail: photos === 0 ? "No photos" : `${photos} photo${photos === 1 ? "" : "s"}`,
    },
    {
      id: "price",
      label: "Price set",
      points: 10,
      earned: price > 0 ? 10 : 0,
      detail: price > 0 ? "Has a price" : "No price",
    },
    {
      id: "category",
      label: "Category",
      points: 10,
      earned: p.category_id ? 10 : 0,
      detail: p.category_id ? "Listed in a category" : "No category",
    },
    digital
      ? {
          id: "delivery",
          label: "Checked by Jimvio",
          points: 15,
          earned: p.digital_verification_state === "approved" ? 15 : 0,
          detail:
            p.digital_verification_state === "approved"
              ? "Files passed Jimvio's checks"
              : "Files not yet checked by Jimvio",
        }
      : {
          id: "delivery",
          label: "Shipping info",
          points: 15,
          earned: shipping > 0 || liveShipping ? 15 : 0,
          detail:
            shipping > 0
              ? "Shipping options listed"
              : liveShipping
                ? "Shipping quoted live for your region"
                : "No shipping options listed",
        },
    {
      id: "seller",
      label: "Verified seller",
      points: 10,
      earned: VERIFIED.has((p.vendors?.verification_status ?? "").toLowerCase()) ? 10 : 0,
      detail: VERIFIED.has((p.vendors?.verification_status ?? "").toLowerCase())
        ? "Seller passed verification"
        : "Seller not verified yet",
    },
  ];

  const score = checks.reduce((sum, c) => sum + c.earned, 0);
  const level = score >= 90 ? "excellent" : score >= 75 ? "good" : score >= 50 ? "fair" : "needs-work";
  return { score, level, checks };
}
