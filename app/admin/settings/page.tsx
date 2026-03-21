import React from "react";
import { getAdminDB } from "@/services/db";
import { resolvePlatformSettingsFromRows } from "@/lib/platform-settings-shared";
import AdminPlatformSettingsForm from "./settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = getAdminDB();
  const { data } = await admin.from("platform_settings").select("key, value").in("key", ["fees", "social_proof", "marketing", "contact"]);

  const initial = resolvePlatformSettingsFromRows(data ?? []);

  return <AdminPlatformSettingsForm initial={initial} />;
}
