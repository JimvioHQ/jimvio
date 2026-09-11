/** Shopify App Store mandatory compliance webhook topics. */
export const SHOPIFY_COMPLIANCE_TOPICS = [
  "customers/data_request",
  "customers/redact",
  "shop/redact",
] as const;

export type ShopifyComplianceTopic = (typeof SHOPIFY_COMPLIANCE_TOPICS)[number];

export function isShopifyComplianceTopic(topic: string): topic is ShopifyComplianceTopic {
  return (SHOPIFY_COMPLIANCE_TOPICS as readonly string[]).includes(topic);
}
