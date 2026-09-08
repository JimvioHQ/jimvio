import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIdentityByUserId } from "@/lib/identity/resolve";
import { IdentityVerificationClient } from "@/components/identity/IdentityVerificationClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verification" };

export default async function IdentityVerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/identity/verification")}`);
  }

  const payload = await getIdentityByUserId(user.id, user.id);
  return (
    <IdentityVerificationClient
      initialVerified={Boolean(payload?.profile.identityVerified)}
    />
  );
}
