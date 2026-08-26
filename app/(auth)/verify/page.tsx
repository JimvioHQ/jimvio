import { Suspense } from "react";
import { VerifyEmailClient } from "./verify-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify email - Jimvio",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-zinc-500 py-10">Loading…</div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
