import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { getMaintenanceModeEnabled } from "@/lib/platform-maintenance";

export const metadata = {
  title: "Sign In - Jimvio",
};

export default async function LoginPage() {
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

