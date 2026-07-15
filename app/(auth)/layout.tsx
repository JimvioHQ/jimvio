import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata(
  "Account",
  "Sign in or create your Jimvio account.",
  "/login",
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:w-1/2 xl:w-5/12 bg-[var(--color-surface)] relative overflow-y-auto">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-10">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="relative shrink-0 rounded-[22%] bg-[var(--color-accent)]">
                <div className="absolute -inset-2 rounded-full bg-[var(--color-accent)]/10 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Image
                  src="/jimvio-logo.svg"
                  alt="Jimvio"
                  width={40}
                  height={40}
                  className="relative shrink-0"
                  style={{ borderRadius: "22%" }}
                />
              </div>
              <span className="text-[30px] font-black tracking-[-0.07em] leading-none select-none">
                <span className="text-[var(--color-text-primary)]">Jim</span>
                <span className="text-[var(--color-accent)]">vio</span>
              </span>
            </Link>
          </div>

          {children}
        </div>
      </div>

      <div className="relative hidden w-0 flex-1 lg:block bg-[var(--color-bg-dark)] overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[70%] rounded-sm bg-gradient-to-bl from-[var(--color-accent)]/20 via-[var(--color-events)]/5 to-transparent blur-[130px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-sm bg-gradient-to-tr from-[var(--color-accent)]/10 to-transparent blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.1] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="absolute inset-0 flex flex-col justify-center px-16 xl:px-24 z-10">
          <h2 className="text-4xl xl:text-[52px] font-bold text-[var(--color-paper)] mb-6 leading-[1.1]">
            Viral commerce,
            <br /> built for growth.
          </h2>
          <p className="text-lg text-[var(--color-paper-dim)] max-w-md mb-16 leading-relaxed">
            Join an elite network of vendors, creators, and community leaders running powerful affiliate programs.
          </p>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 max-w-lg">
            <div>
              <p className="text-3xl xl:text-4xl font-primary font-bold text-[var(--color-paper)] mb-1.5">500k+</p>
              <p className="text-[12px] font-bold text-[color-mix(in_srgb,var(--color-paper)_60%,transparent)] uppercase tracking-widest">Active Products</p>
              <div className="h-0.5 w-8 bg-[color-mix(in_srgb,var(--color-accent)_50%,transparent)] mt-4 rounded-sm" />
            </div>
            <div>
              <p className="text-3xl xl:text-4xl font-black font-primary text-[var(--color-paper)] mb-1.5">$2M+</p>
              <p className="text-[12px] font-bold text-[color-mix(in_srgb,var(--color-paper)_60%,transparent)] uppercase tracking-widest">Commissions Paid</p>
              <div className="h-0.5 w-8 bg-[color-mix(in_srgb,var(--color-events)_50%,transparent)] mt-4 rounded-sm" />
            </div>
          </div>

          <div className="absolute bottom-12 left-16 xl:left-24 text-[12px] font-medium text-[color-mix(in_srgb,var(--color-paper)_50%,transparent)]">
            &copy; {new Date().getFullYear()} Jimvio Inc.
          </div>
        </div>
      </div>
    </div>
  );
}
