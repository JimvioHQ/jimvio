/**
 * Background job toggles — automatic pipelines only.
 * Manual CJ actions (Manual Publish, Sync & Enrich, Refresh Stock) are unaffected.
 *
 * Set ENABLE_AUTOMATIC_AUTO_PUBLISH=true to re-enable scheduled auto-publish crons.
 * Set ENABLE_MARKETPLACE_INTELLIGENCE_CRON=true to re-enable intelligence crons.
 */

export function isAutomaticAutoPublishEnabled(): boolean {
  return process.env.ENABLE_AUTOMATIC_AUTO_PUBLISH === "true";
}

export function isMarketplaceIntelligenceCronEnabled(): boolean {
  return process.env.ENABLE_MARKETPLACE_INTELLIGENCE_CRON === "true";
}

export const BACKGROUND_JOB_DEFAULTS = {
  automaticAutoPublish: false,
  marketplaceIntelligenceCron: false,
} as const;
