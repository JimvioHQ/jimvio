import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIdentityByUserId } from "@/lib/identity/resolve";
import { getPublicAppUrl } from "@/lib/app-url";
import { SettingsProfileForm } from "@/components/settings-center/SettingsProfileForm";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function SettingsProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/settings/profile")}`);

  const payload = await getIdentityByUserId(user.id, user.id);
  if (!payload) redirect("/");

  return (
    <SettingsProfileForm
      initialPayload={payload}
      email={user.email || ""}
      origin={await getPublicAppUrl()}
    />
  );
}
