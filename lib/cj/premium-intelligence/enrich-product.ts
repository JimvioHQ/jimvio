import { getServiceClient, getCJToken, cjFetch } from "@/lib/cj/client";
import { fetchCjProductVideoUrls } from "@/lib/cj/fetch-product-videos";
import { mapDetailToIntelligence } from "../import-intelligence/intelligence-mapper";
import { attachAutoPublish, evaluateAutoPublish, toAutoPublishDbPayload } from "../import-intelligence/auto-publish-engine";
import { patchProductWithIntelligence } from "../import-intelligence/enrichment-merge";
import type { EnrichedProduct } from "../import-intelligence/types";
import {
  getRawProduct,
  markQueueJob,
  MAX_ENRICHMENT_ATTEMPTS,
  updateIntelligence,
} from "./catalog-repository";
import { rawRowToCJProduct } from "./map-to-cj-product";
import { scoreEnrichedProduct } from "./score-product";
import { resolveDeliveryDaysFromFreight } from "./resolve-delivery-days";
import { detectSignalChanges, scheduleSignalRecalc, type IntelSnapshot } from "./signal-watch";
import { indexProductSearchRow } from "./search-index";

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 1_800_000];

export async function enrichSingleProduct(pid: string): Promise<boolean> {
  const raw = await getRawProduct(pid);
  if (!raw) {
    await markQueueJob(pid, {
      status: "failed",
      last_error: "raw product not found",
    });
    return false;
  }

  await updateIntelligence(pid, {
    enrichment_status: "processing",
  });

  const { getCatalogDB } = await import("./db");
  const db = getCatalogDB();
  const { data: priorIntel } = await db
    .from("cj_product_intelligence")
    .select("has_video, supplier_verified, delivery_days, image_count, description_length, trending")
    .eq("pid", pid)
    .maybeSingle();

  const beforeSnapshot: IntelSnapshot = {
    has_video: priorIntel?.has_video,
    supplier_verified: priorIntel?.supplier_verified,
    delivery_days: priorIntel?.delivery_days,
    image_count: priorIntel?.image_count,
    description_length: priorIntel?.description_length,
    trending: priorIntel?.trending,
    stock: raw.stock,
    warehouse: raw.warehouse,
    orders: raw.orders,
  };

  try {
    const supabase = getServiceClient();
    const token = await getCJToken(supabase);

    const detailRes = await cjFetch<{ data: Record<string, unknown> }>(
      `/product/query?pid=${encodeURIComponent(pid)}&features=enable_video,enable_inventory`,
      token
    );
    const detail = detailRes.data;

    const { videos } = await fetchCjProductVideoUrls(token, pid, {
      productVideo: detail.productVideo as string[] | undefined,
      videoList: detail.videoList as string[] | undefined,
      description: detail.description as string | undefined,
      bigImage: detail.bigImage as string | undefined,
    });

    const intelPayload = mapDetailToIntelligence(detail as never, videos);

    const freightDays = await resolveDeliveryDaysFromFreight(supabase, pid, detail);
    if (freightDays !== null && !intelPayload.deliveryCycle) {
      intelPayload.deliveryCycle = String(freightDays);
    }
    const base = rawRowToCJProduct(raw);
    const stub: EnrichedProduct = {
      ...base,
      intelligence: {
        healthScore: 0,
        healthLabel: "poor",
        profit: { cjCost: 0, shippingCost: 0, suggestedSelling: 0, estimatedProfit: 0, marginPercent: 0, roi: 0 },
        isImported: false,
        marketFit: { us: false, eu: false, uk: false, worldwide: true },
        supplierScore: 0,
        trending: false,
        hasVariants: false,
        stockStable: false,
        opportunityScore: 0,
        opportunityLevel: "skip",
        opportunityReasons: [],
        catalogTier: "PENDING",
        catalogBadges: [],
        qualityScores: {
          videoScore: 0, supplierScore: 0, shippingScore: 0, profitScore: 0,
          trendScore: 0, stockScore: 0, reviewScore: 0, imageQualityScore: 0,
          descriptionQualityScore: 0, opportunityScore: 0, healthScore: 0,
        },
      },
    };

    const patched = patchProductWithIntelligence(stub, intelPayload) as EnrichedProduct;
    const scored = scoreEnrichedProduct(patched, "complete");
    const withAutoPublish = attachAutoPublish(patched);

    const description = String(detail.description ?? "").replace(/<[^>]+>/g, " ").trim();
    const imageSet = Array.isArray(detail.productImageSet) ? detail.productImageSet : [];
    const images = [
      ...imageSet,
      ...(detail.bigImage ? [detail.bigImage] : []),
    ].filter((u) => typeof u === "string" && u.startsWith("http"));
    const uniqueImages = [...new Set(images)];

    const deliveryDays = intelPayload.deliveryCycle
      ? parseInt(intelPayload.deliveryCycle, 10)
      : null;

    await updateIntelligence(pid, {
      enrichment_status: "complete",
      enriched_at: new Date().toISOString(),
      has_video: intelPayload.hasVideo,
      video_count: intelPayload.videoCount,
      image_count: uniqueImages.length || (intelPayload.imageCount ?? 0),
      description_length: intelPayload.descriptionLength ?? description.length,
      delivery_days: Number.isNaN(deliveryDays!) ? null : deliveryDays,
      rating: intelPayload.rating ?? null,
      review_count: intelPayload.reviewCount ?? 0,
      supplier_verified: intelPayload.supplierVerified,
      verified_warehouse: intelPayload.verifiedWarehouse ?? null,
      margin_percent: patched.intelligence.profit.marginPercent,
      health_score: scored.qualityScores.healthScore,
      confidence_score: scored.confidenceScore,
      quality_scores: scored.qualityScores as unknown as Record<string, number>,
      opportunity_score: scored.opportunityScore,
      catalog_tier: scored.catalogTier,
      trending: scored.trending,
      badges: scored.badges,
      scored_at: new Date().toISOString(),
      last_error: null,
      ...toAutoPublishDbPayload(evaluateAutoPublish(withAutoPublish)),
    });

    await markQueueJob(pid, { status: "complete", last_error: null });

    const afterSnapshot: IntelSnapshot = {
      has_video: intelPayload.hasVideo,
      supplier_verified: intelPayload.supplierVerified,
      delivery_days: Number.isNaN(deliveryDays!) ? null : deliveryDays,
      image_count: uniqueImages.length || (intelPayload.imageCount ?? 0),
      description_length: intelPayload.descriptionLength ?? description.length,
      trending: scored.trending,
      stock: raw.stock,
      warehouse: raw.warehouse,
      orders: raw.orders,
    };

    const signalChanges = detectSignalChanges(beforeSnapshot, afterSnapshot);
    if (signalChanges.length > 0) {
      await scheduleSignalRecalc(pid, signalChanges);
    }

    await indexProductSearchRow(
      pid,
      { ...raw, raw_payload: raw.raw_payload },
      { linked_product_id: null },
      description.slice(0, 500)
    );

    const autoPublishResult = evaluateAutoPublish(withAutoPublish);
    if (autoPublishResult.ready) {
      const { triggerAutoPublishEvaluation } = await import("./auto-publish-trigger");
      await triggerAutoPublishEvaluation(pid, "enrichment_complete");
    }

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "enrichment failed";
    const raw2 = await getRawProduct(pid);
    const attempts = (await getAttempts(pid)) + 1;
    const delay = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
    const isDeadLetter = attempts >= MAX_ENRICHMENT_ATTEMPTS;

    await updateIntelligence(pid, {
      enrichment_status: isDeadLetter ? "dead_letter" : "pending",
      enrichment_attempts: attempts,
      last_error: message,
      catalog_tier: "PENDING",
    });

    await markQueueJob(pid, {
      status: isDeadLetter ? "dead_letter" : "failed",
      attempts,
      last_error: message,
      next_attempt_at: isDeadLetter
        ? new Date().toISOString()
        : new Date(Date.now() + delay).toISOString(),
    });

    return false;
  }
}

async function getAttempts(pid: string): Promise<number> {
  const { getCatalogDB } = await import("./db");
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_product_intelligence")
    .select("enrichment_attempts")
    .eq("pid", pid)
    .maybeSingle();
  return data?.enrichment_attempts ?? 0;
}
