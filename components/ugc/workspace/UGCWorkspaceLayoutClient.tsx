"use client";

import { Suspense } from "react";
import { UGCWorkspaceShell } from "./UGCWorkspaceShell";
import { UgcBrandWorkspaceProvider } from "./UgcBrandWorkspaceProvider";

type UGCWorkspaceLayoutClientProps = {
  children: React.ReactNode;
  user?: {
    name: string;
    avatarUrl?: string | null;
    isPremium?: boolean;
    username?: string | null;
    identityHref?: string;
  };
};

/**
 * Provider must wrap the whole shell (including sidebar). The sidebar calls
 * useUgcBrandWorkspace — wrapping only page children caused production
 * "must be used within UgcBrandWorkspaceProvider" errors.
 * Suspense is required because the provider reads useSearchParams.
 */
export function UGCWorkspaceLayoutClient({ children, user }: UGCWorkspaceLayoutClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#F8FAFC]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F3F4F6] border-t-[#FF5A1F]" />
        </div>
      }
    >
      <UgcBrandWorkspaceProvider>
        <UGCWorkspaceShell user={user}>
          <div className="min-w-0 max-w-full overflow-x-clip px-3.5 py-3 sm:px-5 lg:px-6 lg:py-4">
            {children}
          </div>
        </UGCWorkspaceShell>
      </UgcBrandWorkspaceProvider>
    </Suspense>
  );
}
