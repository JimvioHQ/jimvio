"use client";

import { Suspense } from "react";
import type { WorkspaceId } from "@/lib/workspace/config";
import { WorkspaceShell } from "./WorkspaceShell";

type WorkspaceLayoutClientProps = {
  workspace: WorkspaceId;
  children: React.ReactNode;
  user?: {
    name: string;
    avatarUrl?: string | null;
    isPremium?: boolean;
  };
};

function ShellFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
    </div>
  );
}

export function WorkspaceLayoutClient({
  workspace,
  children,
  user,
}: WorkspaceLayoutClientProps) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <WorkspaceShell workspace={workspace} user={user}>
        {children}
      </WorkspaceShell>
    </Suspense>
  );
}
