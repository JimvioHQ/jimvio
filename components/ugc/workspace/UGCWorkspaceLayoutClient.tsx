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

function ShellFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F3F4F6] border-t-[#FF5A1F]" />
    </div>
  );
}

export function UGCWorkspaceLayoutClient({ children, user }: UGCWorkspaceLayoutClientProps) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <UgcBrandWorkspaceProvider>
        <UGCWorkspaceShell user={user}>
          <div className="px-3.5 py-3 sm:px-5 lg:px-6 lg:py-4">{children}</div>
        </UGCWorkspaceShell>
      </UgcBrandWorkspaceProvider>
    </Suspense>
  );
}
