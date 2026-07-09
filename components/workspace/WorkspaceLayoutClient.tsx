"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { WorkspaceId } from "@/lib/workspace/config";

const WorkspaceShell = dynamic(
  () =>
    import("@/components/workspace/WorkspaceShell").then((m) => ({
      default: m.WorkspaceShell,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    ),
  }
);

type WorkspaceLayoutClientProps = {
  workspace: WorkspaceId;
  children: React.ReactNode;
  user?: {
    name: string;
    avatarUrl?: string | null;
    isPremium?: boolean;
  };
};

export function WorkspaceLayoutClient({
  workspace,
  children,
  user,
}: WorkspaceLayoutClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
        </div>
      }
    >
      <WorkspaceShell workspace={workspace} user={user}>
        {children}
      </WorkspaceShell>
    </Suspense>
  );
}
