"use client";

import { Suspense, type ReactNode } from "react";
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

/** Isolates useSearchParams so the shell chrome is never blocked by Suspense. */
function BrandProviderGate({ children }: { children: ReactNode }) {
  return <UgcBrandWorkspaceProvider>{children}</UgcBrandWorkspaceProvider>;
}

export function UGCWorkspaceLayoutClient({ children, user }: UGCWorkspaceLayoutClientProps) {
  return (
    <UGCWorkspaceShell user={user}>
      <Suspense
        fallback={
          <div className="min-w-0 max-w-full overflow-x-clip px-3.5 py-8 sm:px-5 lg:px-6">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#F3F4F6] border-t-[#FF5A1F]" />
          </div>
        }
      >
        <BrandProviderGate>
          <div className="min-w-0 max-w-full overflow-x-clip px-3.5 py-3 sm:px-5 lg:px-6 lg:py-4">
            {children}
          </div>
        </BrandProviderGate>
      </Suspense>
    </UGCWorkspaceShell>
  );
}
