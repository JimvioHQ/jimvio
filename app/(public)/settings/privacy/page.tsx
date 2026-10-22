import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIdentityByUserId } from "@/lib/identity/resolve";
import { SettingsPrivacyForm } from "@/components/settings-center/SettingsPrivacyForm";
import type { IdentityPrivacyVisibility } from "@/lib/identity/types";

export const metadata = { title: "Privacy & Visibility" };
export const dynamic = "force-dynamic";

export default async function SettingsPrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/settings/privacy")}`);

  const payload = await getIdentityByUserId(user.id, user.id);
  if (!payload) redirect("/");

  return (
    <SettingsPrivacyForm
      initialVisibility={payload.profile.privacyVisibility as IdentityPrivacyVisibility}
      initialCustom={payload.profile.privacyCustom ?? {}}
    />
  );
}
