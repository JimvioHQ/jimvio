import React from "react";
import { getAdminDB } from "@/services/db";
import { resolvePlatformSettingsFromRows } from "@/lib/platform-settings-shared";
import { mergeSupplierSources } from "@/lib/sources/supplier-settings";
import AdminPlatformSettingsForm from "./settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = getAdminDB();
  const { data } = await admin.from("platform_settings").select("key, value").in("key", ["fees", "social_proof", "marketing", "contact"]);

  const initial = resolvePlatformSettingsFromRows(data ?? []);

  const { data: ssRow } = await admin.from("platform_settings").select("value").eq("key", "supplier_sources").maybeSingle();
  const supplierSourcesInitial = mergeSupplierSources((ssRow as any)?.value);

  return <AdminPlatformSettingsForm initial={initial} supplierSourcesInitial={supplierSourcesInitial} />;
}
