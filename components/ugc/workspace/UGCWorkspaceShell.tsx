"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Suspense, useState } from "react";
import { AppTopNav } from "@/components/shell/AppTopNav";
import { UGCWorkspaceSidebar } from "./UGCWorkspaceSidebar";

type UGCWorkspaceShellProps = {
  children: React.ReactNode;
  user?: {
    name: string;
    avatarUrl?: string | null;
    isPremium?: boolean;
    username?: string | null;
    identityHref?: string;
  };
};

export function UGCWorkspaceShell({ children, user }: UGCWorkspaceShellProps) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC]">
      <AppTopNav showUtilityBar activeNav="UGC & Clipping" user={user} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden shrink-0 border-r border-[#EEF0F2] bg-white lg:block">
          <Suspense fallback={<div className="h-full w-[220px] animate-pulse bg-[#F8FAFC]" />}>
            <UGCWorkspaceSidebar />
          </Suspense>
        </aside>

        {mobileNav && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileNav(false)}
            />
            <aside className="relative h-full w-[min(280px,88vw)] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#F0F0F0] px-4 py-3">
                <span className="text-sm font-semibold text-[#111827]">UGC &amp; Clipping</span>
                <button type="button" onClick={() => setMobileNav(false)} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Suspense fallback={null}>
                <UGCWorkspaceSidebar onNavigate={() => setMobileNav(false)} />
              </Suspense>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-[#EEF0F2] bg-[#F8FAFC]/92 px-4 py-2.5 backdrop-blur-md lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)]"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[#111827]">UGC &amp; Clipping</span>
            <Link href="/dashboard" className="ml-auto text-xs font-semibold text-[#FF5A1F]">
              Mission Control
            </Link>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
