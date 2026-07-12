import {
  evaluateAutoPublish,
  toAutoPublishDbPayload,
} from "../import-intelligence/auto-publish-engine";
import type { EnrichedProduct } from "../import-intelligence/types";
import { updateIntelligence } from "./catalog-repository";

export interface AutoPublishPersistPayload {
  pid: string;
  auto_publish_ready: boolean;
  auto_publish_score: number;
  auto_publish_status: string;
  auto_publish_failures: string[];
  pending_enrichment_reasons: string[];
  last_auto_publish_check: string;
}

export function toAutoPublishPersistPayload(
  product: EnrichedProduct
): AutoPublishPersistPayload {
  const result = evaluateAutoPublish(product);
  return {
    pid: product.pid,
    ...toAutoPublishDbPayload(result),
  };
}

export async function persistAutoPublishForProduct(
  product: EnrichedProduct
): Promise<void> {
  const payload = toAutoPublishPersistPayload(product);
  await updateIntelligence(payload.pid, payload);
}

export async function persistAutoPublishBatch(
  products: EnrichedProduct[]
): Promise<number> {
  if (products.length === 0) return 0;

  const BATCH = 50;
  let saved = 0;

  for (let i = 0; i < products.length; i += BATCH) {
    const chunk = products.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (product) => {
        try {
          await persistAutoPublishForProduct(product);
          saved += 1;
        } catch {
          // Non-fatal
        }
      })
    );
  }

  return saved;
}
