import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIdentityByUserId } from "@/lib/identity/resolve";
import { IdentityPrivacyClient } from "@/components/identity/IdentityPrivacyClient";
import type { IdentityPrivacyVisibility } from "@/lib/identity/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy & visibility" };

export default async function IdentityPrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/identity/privacy")}`);
  }

  const payload = await getIdentityByUserId(user.id, user.id);
  if (!payload) redirect("/");

  return (
    <IdentityPrivacyClient
      initialVisibility={payload.profile.privacyVisibility as IdentityPrivacyVisibility}
      initialCustom={payload.profile.privacyCustom ?? {}}
    />
  );
}
