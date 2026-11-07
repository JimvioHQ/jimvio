import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIdentityByUserId } from "@/lib/identity/resolve";
import { SettingsPrivacyForm } from "@/components/settings-center/SettingsPrivacyForm";
import type { IdentityPrivacyVisibility } from "@/lib/identity/types";
import { summarizePreciseLocation } from "@/lib/geo/precise-location";
import { readPreciseLocation } from "@/lib/geo/precise-location-store";

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

  const precise = await readPreciseLocation(user.id);

  return (
    <SettingsPrivacyForm
      initialVisibility={payload.profile.privacyVisibility as IdentityPrivacyVisibility}
      initialCustom={payload.profile.privacyCustom ?? {}}
      preciseLocation={summarizePreciseLocation(precise)}
      username={payload.profile.username}
    />
  );
}
