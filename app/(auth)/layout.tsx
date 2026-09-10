import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";
import { JimvioLogo } from "@/components/ui/logo";

export const metadata: Metadata = noIndexMetadata(
  "Account",
  "Sign in or create your Jimvio account.",
  "/login",
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-[var(--color-bg)]">
      <div className="relative flex flex-1 flex-col justify-center bg-[var(--color-surface)] px-5 py-10 sm:px-8 lg:w-[48%] lg:flex-none xl:w-[42%]">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 sm:mb-10">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-zinc-500 transition-colors hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 rounded-sm"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back to Jimvio
            </Link>

            {/* Mark and wordmark kept optically separate — never gap-0 */}
            <JimvioLogo
              href="/"
              size="lg"
              presentation="premium"
              className="gap-3"
            />
          </div>

          {children}
        </div>
      </div>

      <aside
        className="relative hidden flex-1 overflow-hidden bg-zinc-950 lg:block"
        aria-hidden="true"
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute right-[-10%] top-[-20%] h-[70%] w-[60%] rounded-full bg-gradient-to-bl from-orange-500/25 via-amber-500/5 to-transparent blur-[130px]" />
          <div className="absolute bottom-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-gradient-to-tr from-orange-600/12 to-transparent blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="absolute inset-0 z-10 flex flex-col justify-center px-14 xl:px-20">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400/90">
            Creator commerce
          </p>
          <h2 className="mb-5 max-w-lg text-[2.35rem] font-black leading-[1.08] tracking-tight text-white xl:text-[2.85rem]">
            Viral commerce,
            <br />
            built for growth.
          </h2>
          <p className="mb-14 max-w-md text-[15px] leading-relaxed text-zinc-400 xl:text-base">
            Sell products, run affiliates, launch UGC campaigns, and grow your
            community — all in one place.
          </p>

          <div className="grid max-w-md grid-cols-2 gap-x-10 gap-y-10">
            <div>
              <p className="mb-1.5 text-3xl font-black tracking-tight text-white xl:text-4xl">
                500k+
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                Active Products
              </p>
              <div className="mt-4 h-0.5 w-8 rounded-full bg-orange-500/50" />
            </div>
            <div>
              <p className="mb-1.5 text-3xl font-black tracking-tight text-white xl:text-4xl">
                $2M+
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                Commissions Paid
              </p>
              <div className="mt-4 h-0.5 w-8 rounded-full bg-amber-500/50" />
            </div>
          </div>

          <p className="absolute bottom-10 left-14 text-[12px] font-medium text-zinc-600 xl:left-20">
            &copy; {new Date().getFullYear()} Jimvio Inc.
          </p>
        </div>
      </aside>
    </div>
  );
}
