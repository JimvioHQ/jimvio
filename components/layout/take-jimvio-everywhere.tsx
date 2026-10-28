import Image from "next/image";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { BarChart3, ShoppingBag, Users } from "lucide-react";

const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

const TAKE_JIMVIO_FEATURES = [
  {
    title: "Shop & sell on the go",
    desc: "Discover, buy and sell products anytime, anywhere.",
    icon: ShoppingBag,
  },
  {
    title: "Track earnings in real time",
    desc: "See sales, commissions and payouts as they are recorded.",
    icon: BarChart3,
  },
  {
    title: "Join campaigns from your phone",
    desc: "Collaborate with brands and grow your income.",
    icon: Users,
  },
] as const;

/** Server-rendered app section. The photo is below the fold and lazy-loaded. */
export function TakeJimvioEverywhere() {
  return (
    <section
      className="jimvio-take-everywhere jimvio-home-section relative w-full overflow-x-clip"
      aria-labelledby="jimvio-take-everywhere-title"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 65% at 78% 42%, rgba(255,90,31,0.08) 0%, transparent 64%)",
          }}
        />
      </div>

      <div className={`relative ${shell}`}>
        <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-10">
          <div className="w-full max-w-xl">
            <div className="flex min-w-0 items-stretch gap-3">
              <span aria-hidden className="mt-1.5 w-[3px] shrink-0 rounded-full bg-[#FF5A1F]" />
              <h2
                id="jimvio-take-everywhere-title"
                className="min-w-0 text-[clamp(1.45rem,4.4vw,2.35rem)] font-black leading-[1.08] tracking-[-0.035em] text-[#111827] text-balance"
              >
                Take Jimvio <span className="text-[#FF5A1F]">Everywhere</span>
              </h2>
            </div>

            <p className="mt-3 max-w-[42ch] text-[14px] leading-relaxed text-[#6B7280] sm:text-[15px]">
              Run marketplace, campaigns, and earnings from your phone — the same Jimvio, wherever you are.
            </p>

            <ul className="mt-5 space-y-3 sm:mt-6">
              {TAKE_JIMVIO_FEATURES.map(({ title, desc, icon: Icon }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-[#FF5A1F]/10 text-[#FF5A1F]">
                    <Icon className="size-4" strokeWidth={2.15} aria-hidden />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-[14px] font-bold tracking-[-0.015em] text-[#111827]">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-[#6B7280]">
                      {desc}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <span className="mb-2.5 block text-[13px] font-bold tracking-[-0.01em] text-[#111827]">
                Get the app
              </span>
              <InstallAppButton />
              <p className="mt-3 text-[12px] leading-relaxed text-[#9CA3AF]">
                Installs from your browser. No app store needed.
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[720px] overflow-hidden lg:max-w-none">
            <Image
              src="/images/jimvio-mobile-app-hero.jpg"
              alt="Jimvio creators using the mobile app and laptop — Create, Connect, Earn Anywhere"
              width={687}
              height={342}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-auto w-full select-none object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
