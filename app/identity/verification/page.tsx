import { Suspense } from "react";
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
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 text-[13px] text-[#8B8579]">
          Loading verification…
        </div>
      }
    >
      <IdentityVerificationClient
        initialVerified={Boolean(payload?.profile.identityVerified)}
      />
    </Suspense>
  );
}
