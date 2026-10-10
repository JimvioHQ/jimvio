/**
 * Store product editor payload builder.
 * Updates name, description, images, and a single selling price.
 * Never includes SKU, inventory, variants, or ownership fields.
 */

export const STORE_PRODUCT_NAME_MIN = 2;
export const STORE_PRODUCT_NAME_MAX = 160;
export const STORE_PRODUCT_DESCRIPTION_MAX = 20000;
export const STORE_PRODUCT_IMAGE_MAX = 12;

const ALLOWED_PATCH_KEYS = new Set(["name", "description", "images", "price", "updated_at"]);

export type StoreProductUpdateInput = {
  name: string;
  description: string;
  images: string[];
  price?: number | null;
  variantCount: number;
  currentPrice: number;
};

export type StoreProductUpdateResult =
  | {
      ok: true;
      patch: {
        name: string;
        description: string;
        images: string[];
        price?: number;
        updated_at: string;
      };
    }
  | { ok: false; error: string };

export function parseSellingPrice(raw: unknown): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof raw === "string" && !raw.trim()) {
    return { ok: false, error: "Enter a selling price." };
  }
  const value = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: "Enter a selling price greater than 0." };
  }
  if (value > 99_999_999) {
    return { ok: false, error: "Selling price is too large." };
  }
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(value - rounded) > 0.000001) {
    return { ok: false, error: "Use at most two decimal places." };
  }
  return { ok: true, value: rounded };
}

export function buildStoreProductUpdate(
  input: StoreProductUpdateInput,
  now = new Date().toISOString(),
): StoreProductUpdateResult {
  const name = input.name.trim();
  if (name.length < STORE_PRODUCT_NAME_MIN) {
    return { ok: false, error: `Product name must be at least ${STORE_PRODUCT_NAME_MIN} characters.` };
  }
  if (name.length > STORE_PRODUCT_NAME_MAX) {
    return { ok: false, error: `Product name must be ${STORE_PRODUCT_NAME_MAX} characters or fewer.` };
  }

  const description = input.description ?? "";
  if (description.length > STORE_PRODUCT_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `Description must be ${STORE_PRODUCT_DESCRIPTION_MAX} characters or fewer.`,
    };
  }

  const images = input.images.map((url) => url.trim()).filter(Boolean);
  if (images.length > STORE_PRODUCT_IMAGE_MAX) {
    return { ok: false, error: `Use at most ${STORE_PRODUCT_IMAGE_MAX} photos.` };
  }
  if (images.some((url) => !isAllowedImageUrl(url))) {
    return { ok: false, error: "Each photo must be an https image URL." };
  }

  const patch: {
    name: string;
    description: string;
    images: string[];
    price?: number;
    updated_at: string;
  } = {
    name,
    description,
    images,
    updated_at: now,
  };

  if (input.price !== undefined && input.price !== null) {
    const parsed = parseSellingPrice(input.price);
    if (!parsed.ok) return parsed;
    if (input.variantCount > 1) {
      if (Math.abs(parsed.value - Number(input.currentPrice || 0)) > 0.001) {
        return {
          ok: false,
          error:
            "This product uses variant prices. Update each variant instead of one selling price.",
        };
      }
    } else {
      patch.price = parsed.value;
    }
  }

  for (const key of Object.keys(patch)) {
    if (!ALLOWED_PATCH_KEYS.has(key)) {
      return { ok: false, error: "Unsupported product field." };
    }
  }

  return { ok: true, patch };
}

export function marketplaceImportBlockReason(input: {
  productVendorId: string | null | undefined;
  merchantVendorId: string;
  source: string | null | undefined;
  status: string | null | undefined;
  alreadyLinked: boolean;
}): { code: string; error: string } | null {
  if (!input.productVendorId || input.productVendorId !== input.merchantVendorId) {
    return { code: "PRODUCT_NOT_FOUND", error: "That marketplace product is not available to this store." };
  }
  const source = (input.source || "vendor").toLowerCase();
  if (source === "cj" || source === "shopify") {
    return {
      code: "SOURCE_NOT_ALLOWED",
      error: "Import products from the Jimvio Marketplace only.",
    };
  }
  if (input.status !== "active") {
    return {
      code: "NOT_ELIGIBLE",
      error: "Only active Jimvio Marketplace products can be imported.",
    };
  }
  if (input.alreadyLinked) {
    return {
      code: "ALREADY_IMPORTED",
      error: "This product is already in the store.",
    };
  }
  return null;
}

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
