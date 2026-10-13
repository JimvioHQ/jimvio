/**
 * Resumable stock refresh for published CJ products.
 * Stops when the supplier quota circuit opens.
 *
 *   npx tsx scripts/refresh-published-cj-stock.ts
 *   OFFSET=200 LIMIT=25 npx tsx scripts/refresh-published-cj-stock.ts
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Module from "node:module";

const originalLoad = (Module as { _load: (...args: unknown[]) => unknown })._load;
(Module as { _load: (...args: unknown[]) => unknown })._load = function (
  request: unknown,
  parent: unknown,
  isMain: unknown,
) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

config({ path: ".env.local" });
config();

const checkpointPath = process.env.CHECKPOINT ?? "/tmp/jimvio-cj-stock-checkpoint.json";

function readOffset(): number {
  if (process.env.OFFSET) return Number(process.env.OFFSET);
  try {
    const saved = JSON.parse(readFileSync(checkpointPath, "utf8")) as { nextOffset?: number };
    return Number(saved.nextOffset ?? 0);
  } catch {
    return 0;
  }
}

function writeOffset(nextOffset: number, extra: Record<string, unknown>) {
  mkdirSync(dirname(checkpointPath), { recursive: true });
  writeFileSync(checkpointPath, JSON.stringify({ nextOffset, ...extra }, null, 2));
}

async function main() {
  const limit = Number(process.env.LIMIT ?? 20);
  const maxBatches = Number(process.env.MAX_BATCHES ?? 80);
  let offset = readOffset();
  const { getServiceClient, getCJToken } = await import("../lib/cj/client");
  const { refreshCJProductStockBatch } = await import("../lib/cj/sync-inventory");
  const { assertCjQuotaAvailableForBackground } = await import("../lib/cj/quota-circuit");
  const db = getServiceClient();
  if (!(await assertCjQuotaAvailableForBackground())) {
    console.log(JSON.stringify({ stopped: "quota_circuit_open", offset }));
    return;
  }
  const token = await getCJToken(db);
  let batches = 0;
  let variantsUpdated = 0;
  let variantsChecked = 0;
  let variantsFailed = 0;
  let productsProcessed = 0;

  while (batches < maxBatches) {
    if (!(await assertCjQuotaAvailableForBackground())) {
      writeOffset(offset, { stopped: "quota_circuit_open" });
      console.log(JSON.stringify({ stopped: "quota_circuit_open", offset, productsProcessed, variantsUpdated, variantsFailed }));
      return;
    }
    const result = await refreshCJProductStockBatch(db, token, offset, limit);
    batches += 1;
    productsProcessed += result.productsProcessed;
    variantsUpdated += result.variantsUpdated;
    variantsChecked += result.variantsChecked;
    variantsFailed += result.variantsFailed;
    offset = result.nextOffset;
    writeOffset(offset, {
      productsProcessed,
      variantsUpdated,
      variantsChecked,
      variantsFailed,
      quotaPaused: result.quotaPaused,
      networkPaused: result.networkPaused,
      done: result.done,
      totalProducts: result.totalProducts,
    });
    console.log(JSON.stringify({
      batch: batches,
      offset,
      productsProcessed: result.productsProcessed,
      variantsUpdated: result.variantsUpdated,
      variantsChecked: result.variantsChecked,
      variantsFailed: result.variantsFailed,
      quotaPaused: result.quotaPaused,
      networkPaused: result.networkPaused,
      done: result.done,
      totalProducts: result.totalProducts,
    }));
    if (result.quotaPaused || result.networkPaused || result.done) break;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
