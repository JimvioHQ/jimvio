import {
  BarChart3,
  FileText,
  Globe,
  Lock,
  Radio,
  Scissors,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_STATS } from "@/lib/platform-stats";

const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

const WHY: readonly { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: ShieldCheck, title: "Checked vendors", desc: "We review suppliers before they list." },
  { icon: Wallet, title: "Wallet payouts", desc: "Earnings land in your Jimvio balance." },
  {
    icon: Globe,
    title: "Works across borders",
    desc: `Buyers and sellers in ${PLATFORM_STATS.countries} countries.`,
  },
  { icon: Users, title: "One login", desc: "Store, affiliates, UGC, and groups together." },
  { icon: BarChart3, title: "Campaign stats", desc: "See views, clicks, and what's paying off." },
  { icon: FileText, title: "Creator listings", desc: "Brands can find people to work with." },
  {
    icon: ShoppingCart,
    title: "All product types",
    desc: "Physical, digital, courses, subscriptions, and more.",
  },
  {
    icon: Truck,
    title: "Dropshipping",
    desc: "Import products, sync inventory, and fulfill orders.",
  },
  {
    icon: Scissors,
    title: "UGC & clipping tools",
    desc: "Turn content into sales with built-in tools.",
  },
  { icon: Radio, title: "Live commerce", desc: "Go live, pin products, and sell in real time." },
  { icon: Lock, title: "Secure & trusted", desc: "Buyer protection and secure checkout." },
  {
    icon: Sparkles,
    title: "AI assistance",
    desc: "Use Jimvio AI tools where they are already available.",
  },
];

/** Server-rendered trust grid. No client timer or observer. */
export function WhyChooseJimvio() {
  return (
    <section
      className="jimvio-why-stick jimvio-home-section relative overflow-x-clip"
      aria-labelledby="jimvio-why-stick-title"
    >
      <div className={shell}>
        <h2
          id="jimvio-why-stick-title"
          className="mb-4 text-center text-[clamp(1.35rem,2.8vw,1.85rem)] font-black tracking-[-0.03em] text-[#111827] sm:mb-5"
        >
          Why people stick with Jimvio
        </h2>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-3.5 lg:grid-cols-4 lg:gap-4">
          {WHY.map((w) => (
            <article
              key={w.title}
              className={cn(
                "flex items-start gap-1.5 rounded-[12px] border border-[rgba(17,24,39,0.07)] bg-white",
                "px-2 py-2 shadow-[0_4px_14px_rgba(17,24,39,0.035)]",
                "sm:items-center sm:gap-3.5 sm:rounded-[16px] sm:px-4 sm:py-3.5",
                "transition-[transform,box-shadow,border-color] duration-200",
                "hover:-translate-y-0.5 hover:border-[rgba(255,90,31,0.18)] hover:shadow-[0_10px_22px_rgba(17,24,39,0.06)]",
                "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              )}
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FF5A1F]/10 text-[#FF5A1F] sm:size-11">
                <w.icon className="size-3.5 sm:size-5" strokeWidth={2.1} aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-[11.5px] font-bold leading-tight tracking-[-0.015em] text-[#111827] sm:text-[14.5px]">
                  {w.title}
                </h3>
                <p className="mt-0.5 text-[10.5px] leading-snug text-[#6B7280] sm:text-[12.5px]">
                  {w.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
