"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const UGCWorkspaceShell = dynamic(
  () =>
    import("@/components/ugc/workspace/UGCWorkspaceShell").then((m) => ({
      default: m.UGCWorkspaceShell,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh items-center justify-center bg-[#FAFAFA]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F3F4F6] border-t-[#FF5A1F]" />
      </div>
    ),
  }
);

type UGCWorkspaceLayoutClientProps = {
  children: React.ReactNode;
  user?: {
    name: string;
    avatarUrl?: string | null;
    isPremium?: boolean;
  };
};

export function UGCWorkspaceLayoutClient({ children, user }: UGCWorkspaceLayoutClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#FAFAFA]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F3F4F6] border-t-[#FF5A1F]" />
        </div>
      }
    >
      <UGCWorkspaceShell user={user}>
        <div className="px-3 py-2 lg:px-4 lg:py-2.5">{children}</div>
      </UGCWorkspaceShell>
    </Suspense>
  );
}
