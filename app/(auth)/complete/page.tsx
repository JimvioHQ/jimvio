import { Suspense } from "react";
import { AuthCompleteClient } from "./complete-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Continuing - Jimvio",
};

export default function AuthCompletePage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-zinc-500 py-10">Continuing…</div>}>
      <AuthCompleteClient />
    </Suspense>
  );
}
