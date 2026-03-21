import { ShopifyConnectClient } from "./shopify-connect-client";

export default function AdminShopifyPage() {
  const platformVendorConfigured = Boolean(process.env.JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID?.trim());
  return <ShopifyConnectClient platformVendorConfigured={platformVendorConfigured} />;
}
