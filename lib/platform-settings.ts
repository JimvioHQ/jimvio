/** @deprecated Import from `@/lib/platform-settings-shared` in client code to avoid bundling server modules. */
export * from "./platform-settings-shared";
export {
  getResolvedPlatformSettings,
  getDefaultAffiliateCommissionPercent,
  getShopifyPlatformCommissionFallback,
} from "./platform-settings-server";
