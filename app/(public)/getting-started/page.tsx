import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clapperboard, DollarSign, ShieldCheck, ShoppingBag, Store, Users } from "lucide-react";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Getting started on Jimvio",
  description: "Pick what you want to do on Jimvio — shop, sell, create for brands, promote products or run a community — and follow the steps.",
  path: "/getting-started",
});

const PATHS = [
  {
    icon: ShoppingBag,
    title: "Shop",
    lead: "Buy physical and digital products.",
    steps: [
      { text: "Browse the marketplace or search for what you need.", href: "/marketplace" },
      { text: "Open a product to see its full price with shipping to your country, and its listing quality." },
      { text: "Pay at checkout with a method offered for your order. Eligible orders are covered by Buyer Protection.", href: "/protection" },
      { text: "Track your order from My Orders.", href: "/orders" },
    ],
  },
  {
    icon: Store,
    title: "Sell",
    lead: "Open a store and list your products.",
    steps: [
      { text: "Create your account, then open your seller dashboard.", href: "/seller/products" },
      { text: "Add a product with clear photos, a real description and a price — listings are checked before they go live." },
      { text: "Set shipping options so buyers see the full price before paying." },
      { text: "Read the fees before you start.", href: "/pricing" },
    ],
  },
  {
    icon: Clapperboard,
    title: "Create for brands (UGC & clipping)",
    lead: "Make videos and clips for brand campaigns.",
    steps: [
      { text: "Set up your creator profile.", href: "/activate/influencer" },
      { text: "Open a live campaign and read its brief, budget and rules.", href: "/ugc" },
      { text: "Join, make your content and submit it from the campaign page." },
      { text: "Approved work is paid to your Jimvio wallet.", href: "/wallet" },
    ],
  },
  {
    icon: DollarSign,
    title: "Promote products (affiliate)",
    lead: "Share products and earn a commission on sales.",
    steps: [
      { text: "Choose products to promote — each shows its commission first.", href: "/affiliates" },
      { text: "Copy your link and share it anywhere." },
      { text: "Sales within 30 days of a click on your link are credited to you." },
      { text: "Follow clicks and earnings in your dashboard.", href: "/affiliates/dashboard" },
    ],
  },
  {
    icon: Users,
    title: "Run a community",
    lead: "Build a free or paid space for your audience.",
    steps: [
      { text: "Create your community — it takes a minute.", href: "/communities/create" },
      { text: "Add spaces, post, go live or publish courses." },
      { text: "Choose free or paid access, one-time or subscription, in Manage → Community Access." },
      { text: "Building Jimvio early? Apply to become a Founding Creator.", href: "/founding-creators" },
    ],
  },
];

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg,#fff)]">
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[1100px] px-4 pb-12 pt-28 sm:px-6">
          <p className="text-[12px] font-bold uppercase tracking-wider text-[#fd5000]">Getting started</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            What do you want to do on Jimvio?
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
            One account does it all. Pick a path below and follow the steps — you can add the others any time.
          </p>
          <nav aria-label="Paths" className="mt-6 flex flex-wrap gap-2">
            {PATHS.map((p) => (
              <a
                key={p.title}
                href={`#${p.title.split(" ")[0].toLowerCase()}`}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg,#fff)] px-4 py-2 text-[13px] font-semibold text-[var(--color-text-primary)] hover:border-[#fd5000]/40"
              >
                {p.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-12 sm:px-6">
        {PATHS.map(({ icon: Icon, title, lead, steps }) => (
          <section
            key={title}
            id={title.split(" ")[0].toLowerCase()}
            className="scroll-mt-24 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fd5000]/10 text-[#fd5000]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-black tracking-tight text-[var(--color-text-primary)]">{title}</h2>
                <p className="text-[13px] text-[var(--color-text-secondary)]">{lead}</p>
              </div>
            </div>
            <ol className="mt-6 grid gap-3 md:grid-cols-2">
              {steps.map((s, i) => (
                <li key={s.text} className="flex gap-3 rounded-2xl bg-[var(--color-bg,#fff)] p-4 ring-1 ring-[var(--color-border)]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fd5000] text-[12px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-[14px] leading-relaxed text-[var(--color-text-primary)]">
                    {s.text}
                    {s.href ? (
                      <Link href={s.href} className="ml-1 inline-flex items-center gap-0.5 font-semibold text-[#fd5000] hover:underline">
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section className="flex flex-col items-start gap-3 rounded-3xl bg-[#0f1115] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-amber-300" />
            <div>
              <p className="text-[16px] font-bold">Protect your account first</p>
              <p className="text-[13px] text-white/70">Turn on two-factor authentication and learn how Jimvio keeps you safe.</p>
            </div>
          </div>
          <Link href="/safety" className="rounded-full bg-[#fd5000] px-5 py-2.5 text-[14px] font-bold text-white hover:bg-[#e04800]">
            Safety Center
          </Link>
        </section>
      </div>
    </div>
  );
}
