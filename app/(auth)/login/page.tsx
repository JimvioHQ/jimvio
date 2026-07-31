import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { getMaintenanceModeEnabled } from "@/lib/platform-maintenance";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-authenticated";

export const metadata = {
  title: "Sign In - Jimvio",
};

interface PageProps {
  searchParams: Promise<{ next?: string; redirect?: string; returnUrl?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = params.next ?? params.redirect ?? params.returnUrl ?? null;
  await redirectIfAuthenticated(next);

  const maintenanceMode = await getMaintenanceModeEnabled();

  return (
    <Suspense
      fallback={
        <div className="w-full space-y-6 animate-pulse">
          <div className="h-8 bg-[var(--color-surface-secondary)] rounded-sm w-3/4 mx-auto" />
          <div className="h-11 bg-[var(--color-surface-secondary)] rounded-sm" />
          <div className="h-11 bg-[var(--color-surface-secondary)] rounded-sm" />
          <div className="h-11 bg-[var(--color-surface-secondary)] rounded-sm" />
        </div>
      }
    >
      <LoginForm maintenanceMode={maintenanceMode} />
    </Suspense>
  );
}

