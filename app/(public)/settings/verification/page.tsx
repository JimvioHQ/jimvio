import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIdentityByUserId } from "@/lib/identity/resolve";
import { SettingsVerificationPanel } from "@/components/settings-center/SettingsVerificationPanel";

export const metadata = { title: "Verification" };
export const dynamic = "force-dynamic";

export default async function SettingsVerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/settings/verification")}`);

  const payload = await getIdentityByUserId(user.id, user.id);

  return (
    <Suspense fallback={<p className="text-[14px] text-[#6B7280]">Loading verification…</p>}>
      <SettingsVerificationPanel initialVerified={Boolean(payload?.profile.identityVerified)} />
    </Suspense>
  );
}
