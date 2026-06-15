import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg,#f4f4f5)] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fd5000]/10 text-[#fd5000]">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 1l22 22" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <h1 className="text-xl font-black text-[var(--color-text-primary,#18181b)]">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-[var(--color-text-muted,#71717a)]">
        It looks like you&apos;ve lost your internet connection. Check your network and try again — some pages you&apos;ve already visited may still work.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center rounded-full bg-[#fd5000] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#e04800]"
      >
        Try again
      </Link>
    </main>
  );
}
