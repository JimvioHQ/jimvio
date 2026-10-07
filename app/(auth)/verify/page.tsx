import { Suspense } from "react";
import { VerifyEmailClient } from "./verify-client";
import { isMerchantAuthContext } from "@/lib/auth/merchant-auth-context";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify email",
};

export default async function VerifyEmailPage() {
  const merchantMode = await isMerchantAuthContext();
  return (
    <Suspense
      fallback={
        <div className="py-10 text-center text-sm text-zinc-500">Loading…</div>
      }
    >
      <VerifyEmailClient merchantMode={merchantMode} />
    </Suspense>
  );
}
