import { IntegrationsForm } from "@/components/settings/integrations-form";
import { getAdminDB } from "@/services/db";
import { loadSupplierSourcesSettings } from "@/lib/sources/supplier-settings";

export const metadata = { title: "Integrations · Platform settings" };

export default async function IntegrationsPage() {
  const admin = getAdminDB();
  const suppliers = await loadSupplierSourcesSettings(admin);
  const shopifyPlatformConfigured = Boolean(process.env.JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID?.trim());

  return (
    <IntegrationsForm
      cjEnabled={suppliers.cj.enabled}
      shopifyPlatformConfigured={shopifyPlatformConfigured}
    />
  );
}
