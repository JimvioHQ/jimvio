import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShoppingBag, Link2, Video, Users } from "lucide-react";

const benefits = [
  { icon: <ShoppingBag className="h-4 w-4" />, title: "Global Marketplace",  desc: "500K+ physical & digital products" },
  { icon: <Link2        className="h-4 w-4" />, title: "Affiliate Network",   desc: "Earn up to 50% commission per sale" },
  { icon: <Video        className="h-4 w-4" />, title: "Viral Clip Engine",   desc: "Promote products, earn automatically" },
  { icon: <Users        className="h-4 w-4" />, title: "Paid Communities",    desc: "Build & monetize your audience" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Left: Form */}
      <div className="flex-1 flex flex-col bg-[var(--color-surface)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Jimvio
          </Link>
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/jimvio-logo.png"
              alt="Jimvio"
              width={112}
              height={36}
              className="h-10 w-auto"
            />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-8">
          <div className="w-full max-w-[400px] animate-fade-in text-left">
            {children}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[var(--color-border)] text-center">
          <p className="text-xs text-[var(--color-text-muted)]">© {new Date().getFullYear()} Jimvio</p>
        </div>
      </div>

      {/* Right: Brand panel — always dark so text is readable in any theme */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden border-l border-[var(--color-border)] bg-[#0f0a06]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c2410c] via-[#9a3412] to-[#7c2d12]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-6 w-full">
          <div>
            <p className="text-white/90 text-[11px] font-semibold capitalize tracking-widest mb-3">
              B2B marketplace
            </p>
            <h2 className="text-2xl font-bold leading-tight mb-2 text-white">
              One account.
              <br />
              <span className="text-white">Buy, sell, grow.</span>
            </h2>
            <p className="text-white/80 text-sm leading-relaxed max-w-xs mb-6">
              Join buyers and suppliers. List products, run affiliates, or build communities.
            </p>

            <div className="space-y-3">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 text-white">
                    {b.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm">{b.title}</p>
                    <p className="text-white/75 text-xs mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "35,000+", label: "Active users" },
              { value: "99.9%", label: "Uptime" },
              { value: "50+", label: "Countries" },
              { value: "B2B", label: "Marketplace" },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-2.5 backdrop-blur-sm">
                <p className="text-base font-bold text-white">{s.value}</p>
                <p className="text-[11px] text-white/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
