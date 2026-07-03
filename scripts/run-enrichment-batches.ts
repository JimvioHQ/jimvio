import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { processEnrichmentQueue, retryFailedEnrichments } = await import(
    "../lib/cj/premium-intelligence"
  );

  const batches = parseInt(process.argv[2] ?? "4", 10);
  let totalProcessed = 0;
  let totalSucceeded = 0;

  for (let i = 0; i < batches; i++) {
    await retryFailedEnrichments(50);
    const result = await processEnrichmentQueue(25);
    totalProcessed += result.processed;
    totalSucceeded += result.succeeded;
    console.log(`batch ${i + 1}/${batches}`, result);
    if (result.processed === 0) break;
  }

  console.log("done", { totalProcessed, totalSucceeded });
}

main().catch(console.error);
