/**
 * System-level product publish — used by Auto Publish Worker (no admin session).
 * Mirrors publishAdminProduct() logic without modifying the admin publish pipeline.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  filterProductsForCustomers,
  getMarketplaceVisibilitySets,
} from "./marketplace-filter";

export const AUTO_PUBLISH_WORKER_BATCH_SIZE = 25;

export const AUTO_PUBLISH_RETRY_DELAYS_MS = [
  60_000,      // 1 minute
  300_000,     // 5 minutes
  900_000,     // 15 minutes
  1_800_000,   // 30 minutes
  3_600_000,   // 1 hour
] as const;

export const AUTO_PUBLISH_MAX_RETRIES = 5;

/** Debounce window: 2–5 minutes after becoming READY */
export function computePublishDebounceMs(): number {
  const min = 2 * 60_000;
  const max = 5 * 60_000;
  return min + Math.floor(Math.random() * (max - min));
}

export interface SystemPublishResult {
  success: boolean;
  error?: string;
  alreadyPublished?: boolean;
}

export interface PublishVerification {
  verified: boolean;
  checks: {
    productExists: boolean;
    statusActive: boolean;
    isActive: boolean;
    hasImages: boolean;
    marketplaceVisible: boolean;
    homepageEligible: boolean;
    trendingEligible: boolean;
  };
  errors: string[];
}

export async function publishProductSystem(
  productId: string
): Promise<SystemPublishResult> {
  const admin = createAdminClient();

  const { data: product, error: fetchErr } = await admin
    .from("products")
    .select("id, images, status, is_active, source, source_metadata")
    .eq("id", productId)
    .maybeSingle();

  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!product) return { success: false, error: "Product not found." };

  if (product.status === "active" && product.is_active) {
    return { success: true, alreadyPublished: true };
  }

  const images = Array.isArray(product.images)
    ? product.images.filter(
        (x): x is string => typeof x === "string" && x.startsWith("http")
      )
    : [];

  if (images.length === 0) {
    return {
      success: false,
      error: "Product has no images — add images before publishing.",
    };
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("products")
    .update({
      status: "active",
      is_active: true,
      updated_at: now,
    })
    .eq("id", productId);

  if (error) return { success: false, error: error.message };

  try {
    revalidatePath("/admin/products");
    revalidatePath("/marketplace");
  } catch {
    // Safe outside Next.js request context (cron workers, scripts)
  }

  return { success: true };
}

export async function verifyPublishedProduct(
  productId: string
): Promise<PublishVerification> {
  const admin = createAdminClient();
  const errors: string[] = [];

  const { data: product } = await admin
    .from("products")
    .select(
      "id, status, is_active, images, source, source_metadata, published_by_admin_override, auto_unpublished, view_count, sale_count"
    )
    .eq("id", productId)
    .maybeSingle();

  const productExists = Boolean(product);
  const statusActive = product?.status === "active";
  const isActive = product?.is_active === true;

  const images = Array.isArray(product?.images)
    ? product.images.filter(
        (x): x is string => typeof x === "string" && x.startsWith("http")
      )
    : [];
  const hasImages = images.length > 0;

  if (!productExists) errors.push("Product not found after publish");
  if (!statusActive) errors.push("Status is not ACTIVE");
  if (!isActive) errors.push("is_active is not true");
  if (!hasImages) errors.push("No valid images");

  let marketplaceVisible = false;
  let homepageEligible = false;
  let trendingEligible = false;

  if (product && statusActive && isActive) {
    const sets = await getMarketplaceVisibilitySets();
    const filtered = filterProductsForCustomers([product], sets);
    marketplaceVisible = filtered.length > 0;
    homepageEligible = marketplaceVisible;
    trendingEligible = marketplaceVisible;

    if (!marketplaceVisible) {
      errors.push("Product not eligible for marketplace visibility filter");
    }
  }

  const checks = {
    productExists,
    statusActive,
    isActive,
    hasImages,
    marketplaceVisible,
    homepageEligible,
    trendingEligible,
  };

  const verified =
    productExists &&
    statusActive &&
    isActive &&
    hasImages &&
    marketplaceVisible;

  return { verified, checks, errors };
}

export async function unpublishProductSystem(
  productId: string,
  reason: string
): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("products")
    .update({
      status: "draft",
      is_active: false,
      auto_unpublished: true,
      auto_unpublish_reason: reason,
      auto_unpublished_at: now,
      updated_at: now,
    })
    .eq("id", productId);

  if (error) return false;

  try {
    revalidatePath("/admin/products");
    revalidatePath("/marketplace");
  } catch {
    // Safe outside Next.js request context
  }

  return true;
}
