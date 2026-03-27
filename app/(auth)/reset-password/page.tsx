import { Suspense } from "react";
import { ResetPasswordClient } from "./reset-password-client";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-[var(--color-text-secondary)] py-10">Loading…</div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
