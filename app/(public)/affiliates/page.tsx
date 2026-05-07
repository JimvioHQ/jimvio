// import React from "react";
// import Link from "next/link";
// import { TrendingUp, Link2, DollarSign, Users, Star, ArrowRight, Zap, Award, CheckCircle2, ShieldCheck, Globe } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { getTopAffiliates, getAffiliateProgramStats, getAffiliateSpotlightProducts } from "@/services/db";
// import { formatPlatformCount, getResolvedPlatformSettings } from "@/lib/platform-settings";

// export default async function AffiliatesPage() {
//   const [topEarners, stats, spotlightRes, settings] = await Promise.all([
//     getTopAffiliates(5),
//     getAffiliateProgramStats(),
//     getAffiliateSpotlightProducts(9),
//     getResolvedPlatformSettings(),
//   ]);

//   const spotlight = spotlightRes.products ?? [];
//   const maxRate = spotlight.reduce(
//     (m, p) => Math.max(m, Number((p as { affiliate_commission_rate?: number | null }).affiliate_commission_rate ?? 0)),
//     0
//   );
//   const heroRate =
//     maxRate > 0 ? Math.round(maxRate) : Math.round(settings.fees.default_affiliate_commission_percent);

//   const statsGrid = [
//     { label: "Active Affiliates", value: stats.affiliateCount ? formatPlatformCount(stats.affiliateCount) : "" },
//     { label: "Affiliate-ready SKUs", value: stats.affiliateSkus ? formatPlatformCount(stats.affiliateSkus) : "" },
//     { label: "Top listed rate", value: maxRate > 0 ? `${Math.round(maxRate)}%` : `${heroRate}% default` },
//     { label: "Live products", value: stats.totalProducts ? formatPlatformCount(stats.totalProducts) : "" },
//   ];

//   const topProducts = spotlight.map((p) => {
//     const row = p as {
//       id: string;
//       slug: string;
//       name: string;
//       price: number;
//       product_type?: string;
//       affiliate_commission_rate?: number | null;
//       sale_count?: number | null;
//       view_count?: number | null;
//       product_categories?: { name?: string | null } | null;
//     };
//     const cat = row.product_categories?.name ?? row.product_type ?? "General";
//     const rate = Number(row.affiliate_commission_rate ?? settings.fees.default_affiliate_commission_percent);
//     const earning = Math.round(Number(row.price) * (rate / 100));
//     return {
//       id: row.id,
//       slug: row.slug,
//       name: row.name,
//       category: cat,
//       commission: `${rate}%`,
//       avgEarning: earning,
//       engagement: Number(row.sale_count ?? 0) + Number(row.view_count ?? 0),
//     };
//   });

//   return (
//     <div className="bg-[var(--color-bg)] min-h-screen">
//       {/* Hero */}
//       <section className="relative py-24 px-4 overflow-hidden bg-white dark:bg-bg border-b border-[var(--color-border)]">
//         <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[var(--color-accent)]/5 to-transparent" />
//         <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center text-center">
//           <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)] border-none mb-6 px-4 py-1.5 capitalize tracking-widest font-black text-[10px]">
//             <TrendingUp className="h-3.5 w-3.5 mr-2" /> Affiliate Program
//           </Badge>
//           <h1 className="text-5xl md:text-7xl font-[900] text-[var(--color-text-primary)] mb-8 tracking-tighter leading-[0.95]">
//             Turn Your Influence Into <span className="text-[var(--color-accent)]">Income</span>
//           </h1>
//           <p className="text-[var(--color-text-secondary)] text-xl mb-12 max-w-2xl font-medium leading-relaxed">
//             Market verified products from global suppliers. Earn up to {heroRate}% commission on listed offers (varies by product)
//             and withdraw when you meet the platform minimum.
//           </p>
//           <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
//             <Button size="xl" className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black rounded-sm h-16 px-12 text-lg shadow-none shadow-[var(--color-accent)]/20" asChild>
//               <Link href="/register?role=affiliate">
//                 Join Now For Free <ArrowRight className="ml-2 h-5 w-5" />
//               </Link>
//             </Button>
//             <Button size="xl" variant="outline" className="font-black rounded-sm h-16 px-12 text-lg border-2" asChild>
//               <Link href="/marketplace">Explore Products</Link>
//             </Button>
//           </div>

//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
//             {statsGrid.map((s, i) => (
//               <div key={i} className="bg-white dark:bg-surface border border-[var(--color-border)] p-6 rounded-sm shadow-none">
//                 <p className="text-2xl font-black text-[var(--color-text-primary)] mb-1">{s.value}</p>
//                 <p className="text-[10px] text-[var(--color-text-muted)] font-black capitalize tracking-widest">{s.label}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* How it Works */}
//       <section className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
//         <div className="text-center mb-16">
//           <h2 className="text-3xl font-black text-[var(--color-text-primary)] mb-4">How You Earn</h2>
//           <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto">Start your affiliate business on Jimvio in three simple steps.</p>
//         </div>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//           {[
//             { 
//               step: "01", 
//               title: "Discover Products", 
//               desc: "Select from a massive catalog of electronics, fashion, and digital products.",
//               icon: <Globe className="h-6 w-6" />
//             },
//             { 
//               step: "02", 
//               title: "Share Your Link", 
//               desc: "Promote on social media, your blog, or via direct messaging using smart tracking links.",
//               icon: <Link2 className="h-6 w-6" />
//             },
//             { 
//               step: "03", 
//               title: "Earn Commissions", 
//               desc: "Every successful purchase through your link adds to your balance instantly.",
//               icon: <DollarSign className="h-6 w-6" />
//             }
//           ].map((item, i) => (
//             <div key={i} className="relative bg-white dark:bg-surface border border-[var(--color-border)] p-8 rounded-sm shadow-none hover:shadow-none transition-shadow group">
//               <span className="absolute top-4 right-8 text-5xl font-black text-[var(--color-accent)] opacity-5 group-hover:opacity-10 transition-opacity">{item.step}</span>
//               <div className="h-12 w-12 rounded-sm bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center mb-6">
//                 {item.icon}
//               </div>
//               <h3 className="text-xl font-black text-[var(--color-text-primary)] mb-4">{item.title}</h3>
//               <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{item.desc}</p>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* High Converting Products */}
//       <section className="py-24 bg-[var(--color-surface-secondary)]">
//         <div className="max-w-6xl mx-auto px-4 sm:px-6">
//           <div className="flex items-center justify-between mb-12">
//             <div>
//               <h2 className="text-3xl font-black text-[var(--color-text-primary)] mb-2">High Converting Products</h2>
//               <p className="text-[var(--color-text-secondary)]">Current top performers for affiliates this week.</p>
//             </div>
//             <Button variant="ghost" className="font-bold text-[var(--color-accent)]" asChild>
//               <Link href="/marketplace">View Full Catalog <ArrowRight className="ml-2 h-4 w-4" /></Link>
//             </Button>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {topProducts.length === 0 ? (
//               <p className="col-span-full text-center text-[var(--color-text-muted)] py-8">
//                 No affiliate-enabled products yet. Check back soon or browse the full marketplace.
//               </p>
//             ) : (
//               topProducts.map((p) => (
//                 <div
//                   key={p.id}
//                   className="bg-white dark:bg-surface border border-[var(--color-border)] rounded-sm p-6 shadow-none hover:shadow-none transition-all duration-300"
//                 >
//                   <div className="flex justify-between items-start mb-6">
//                     <div>
//                       <Badge variant="secondary" className="mb-2 text-[10px] capitalize font-bold">
//                         {p.category}
//                       </Badge>
//                       <h3 className="font-black text-[var(--color-text-primary)] truncate max-w-[180px]">{p.name}</h3>
//                     </div>
//                     <div className="bg-[var(--color-accent-light)] text-[var(--color-accent)] font-black px-3 py-1 rounded-sm text-lg">
//                       {p.commission}
//                     </div>
//                   </div>

//                   <div className="space-y-3 mb-6">
//                     <div className="flex justify-between text-sm">
//                       <span className="text-[var(--color-text-muted)] font-medium">Est. per unit (RWF)</span>
//                       <span className="font-black text-[var(--color-text-primary)]">RWF {p.avgEarning.toLocaleString()}</span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-[var(--color-text-muted)] font-medium">Sales + views (signal)</span>
//                       <span className="font-black text-[var(--color-text-primary)]">{p.engagement.toLocaleString()}</span>
//                     </div>
//                   </div>

//                   <Button className="w-full bg-ink-dark hover:opacity-90 font-bold h-11 rounded-sm" asChild>
//                     <Link href={`/marketplace/${p.slug}`}>
//                       <Link2 className="h-4 w-4 mr-2" /> View product
//                     </Link>
//                   </Button>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </section>

//       {/* Leaderboard */}
//       <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6">
//         <div className="text-center mb-16">
//           <Badge className="bg-orange-50 text-orange-600 mb-4 px-3 py-1 capitalize tracking-widest font-black text-[10px]">
//             <Award className="h-3.5 w-3.5 mr-2" /> Top Performers
//           </Badge>
//           <h2 className="text-3xl font-black text-[var(--color-text-primary)]">Affiliate Leaderboard</h2>
//         </div>

//         <div className="bg-white dark:bg-surface border border-[var(--color-border)] rounded-sm overflow-hidden shadow-none">
//           {topEarners.length > 0 ? (
//             <div className="divide-y divide-[var(--color-border)]">
//               {topEarners.map((aff: any, idx: number) => (
//                 <div key={aff.id} className="flex items-center gap-6 p-6 hover:bg-[var(--color-surface-secondary)] transition-colors">
//                   <div className="w-10 h-10 rounded-sm bg-[var(--color-accent-light)] flex items-center justify-center font-black text-[var(--color-accent)] shrink-0">
//                     {idx + 1}
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <h4 className="font-black text-[var(--color-text-primary)] truncate capitalize tracking-tight">User #{aff.user_id.slice(0, 8)}</h4>
//                     <p className="text-xs text-[var(--color-text-muted)] font-bold">{aff.total_conversions || 0} CONVERSIONS</p>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-xl font-black text-[var(--color-accent)] leading-none">
//                       RWF {Number(aff.total_earnings ?? 0).toLocaleString()}
//                     </p>
//                     <p className="text-[10px] text-[var(--color-text-muted)] font-black capitalize mt-1">TOTAL EARNINGS</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <div className="p-12 text-center text-[var(--color-text-muted)]">
//               No earnings recorded yet this month. Be the first!
//             </div>
//           )}
//         </div>
//       </section>

//       {/* Final CTA */}
//       <section className="py-24 px-4 sm:px-6">
//         <div className="max-w-4xl mx-auto bg-ink-dark rounded-sm p-12 text-center relative overflow-hidden">
//           <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-accent)] opacity-10 blur-[100px]" />
//           <Zap className="h-12 w-12 text-[var(--color-accent)] mx-auto mb-6" />
//           <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Launch Your Affiliate Empire</h2>
//           <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
//             Market verified products from global suppliers. Earn up to {heroRate}% on eligible listings and withdraw when you reach
//             the platform minimum.
//           </p>
//           <Button size="xl" className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black rounded-sm h-16 px-12 shadow-none shadow-[var(--color-accent)]/40" asChild>
//             <Link href="/register?role=affiliate">Activate Your Account Now</Link>
//           </Button>
//         </div>
//       </section>
//     </div>
//   );
// }

import React from "react";
import Link from "next/link";
import {
  TrendingUp, Link2, DollarSign, Users,
  ArrowRight, Zap, Award, Globe, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getTopAffiliates,
  getAffiliateProgramStats,
  getAffiliateSpotlightProducts,
} from "@/services/db";
import {
  formatPlatformCount,
  getResolvedPlatformSettings,
} from "@/lib/platform-settings";

// ─── tiny local helpers ────────────────────────────────────────────────
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[120px]">
      <span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-[0.08em]">
        {label}
      </span>
      <span className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums leading-none">
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div className="hidden md:block w-px h-10 bg-[var(--color-border)]" />
  );
}

const RANKS = ["🥇", "🥈", "🥉"];

export default async function AffiliatesPage() {
  const [topEarners, stats, spotlightRes, settings] = await Promise.all([
    getTopAffiliates(5),
    getAffiliateProgramStats(),
    getAffiliateSpotlightProducts(9),
    getResolvedPlatformSettings(),
  ]);

  const spotlight = spotlightRes.products ?? [];
  const maxRate = spotlight.reduce(
    (m, p) =>
      Math.max(
        m,
        Number(
          (p as { affiliate_commission_rate?: number | null })
            .affiliate_commission_rate ?? 0
        )
      ),
    0
  );
  const heroRate =
    maxRate > 0
      ? Math.round(maxRate)
      : Math.round(settings.fees.default_affiliate_commission_percent);

  const statsRow = [
    {
      label: "Active Affiliates",
      value: stats.affiliateCount ? formatPlatformCount(stats.affiliateCount) : "—",
    },
    {
      label: "Affiliate SKUs",
      value: stats.affiliateSkus ? formatPlatformCount(stats.affiliateSkus) : "—",
    },
    {
      label: "Top Commission",
      value: maxRate > 0 ? `${Math.round(maxRate)}%` : `${heroRate}%`,
    },
    {
      label: "Live Products",
      value: stats.totalProducts ? formatPlatformCount(stats.totalProducts) : "—",
    },
  ];

  const topProducts = spotlight.map((p) => {
    const row = p as {
      id: string;
      slug: string;
      name: string;
      price: number;
      product_type?: string;
      affiliate_commission_rate?: number | null;
      sale_count?: number | null;
      view_count?: number | null;
      product_categories?: { name?: string | null } | null;
    };
    const cat =
      row.product_categories?.name ?? row.product_type ?? "General";
    const rate = Number(
      row.affiliate_commission_rate ??
      settings.fees.default_affiliate_commission_percent
    );
    const earning = Math.round(Number(row.price) * (rate / 100));
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: cat,
      rate,
      commission: `${rate}%`,
      avgEarning: earning,
      engagement:
        Number(row.sale_count ?? 0) + Number(row.view_count ?? 0),
    };
  });

  const maxEarning =
    topEarners.length > 0
      ? Math.max(...topEarners.map((a: any) => Number(a.total_earnings ?? 0)))
      : 1;

  return (
    <div className="bg-[var(--color-bg)] min-h-screen font-sans">

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">

        {/* Diagonal background split */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Ink left panel */}
          <div
            className="absolute inset-0 bg-[#0f0e0d]"
            style={{ clipPath: "polygon(0 0, 58% 0, 50% 100%, 0 100%)" }}
          />
          {/* Subtle grid on dark side */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              clipPath: "polygon(0 0, 58% 0, 50% 100%, 0 100%)",
              backgroundImage:
                "linear-gradient(var(--color-accent) 1px, transparent 1px), linear-gradient(90deg, var(--color-accent) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-32">
          <div className="grid md:grid-cols-[1fr_auto] gap-12 items-center">

            {/* Left: headline */}
            <div>
              <div className="inline-flex items-center gap-2 text-[var(--color-accent)] mb-6 text-[11px] font-semibold uppercase tracking-[0.12em]">
                <span className="w-6 h-px bg-[var(--color-accent)]" />
                Affiliate Program
              </div>

              <h1 className="text-5xl md:text-[4.5rem] font-bold text-white leading-[1.02] tracking-[-0.03em] mb-6 max-w-xl">
                Turn Your
                <br />
                Influence{" "}
                <em className="not-italic text-[var(--color-accent)]">
                  into Income
                </em>
              </h1>

              <p className="text-white/50 text-base md:text-lg leading-relaxed max-w-md mb-10 font-normal">
                Promote verified products, earn up to{" "}
                <span className="text-white/80 font-medium">{heroRate}%</span>{" "}
                commission per sale, and withdraw once you hit the platform
                minimum.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold h-12 px-8 rounded-md shadow-none"
                  asChild
                >
                  <Link href="/register?role=affiliate">
                    Start Earning Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-white/70 hover:text-white hover:bg-white/10 font-medium h-12 px-8 rounded-md"
                  asChild
                >
                  <Link href="/marketplace">Browse Products</Link>
                </Button>
              </div>
            </div>

            {/* Right: stats card — floats on the light side */}
            <div className="hidden md:flex flex-col gap-0 bg-white dark:bg-[#1a1917] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xl shadow-black/20 w-72 shrink-0 self-start mt-8">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                  Program snapshot
                </p>
              </div>
              {statsRow.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-secondary)] transition-colors"
                >
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {s.label}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile stats row */}
          <div className="md:hidden mt-12 flex flex-wrap gap-8">
            {statsRow.map((s, i) => (
              <StatPill key={i} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-accent)] mb-3">
              How it works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] tracking-tight leading-tight">
              Three steps to your
              <br />
              first commission
            </h2>
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm max-w-xs leading-relaxed md:text-right">
            No upfront cost, no approval wait. Sign up and start sharing within
            minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--color-border)] rounded-xl overflow-hidden">
          {[
            {
              n: "01",
              title: "Pick a product",
              desc: "Browse thousands of verified electronics, fashion, and digital products with clear commission rates.",
              icon: Globe,
            },
            {
              n: "02",
              title: "Share your link",
              desc: "Post to social media, embed in your blog, or send directly. Every click is tracked in real time.",
              icon: Link2,
            },
            {
              n: "03",
              title: "Collect earnings",
              desc: "Commissions credit instantly on confirmed sales. Withdraw once you hit the platform minimum.",
              icon: DollarSign,
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="group relative bg-[var(--color-bg)] dark:bg-[#111110] p-8 md:p-10 flex flex-col gap-6 hover:bg-[var(--color-surface-secondary)] transition-colors duration-200"
              >
                {/* Large ordinal as background art */}
                <span
                  aria-hidden
                  className="absolute top-6 right-6 text-[72px] font-black leading-none text-[var(--color-text-primary)] opacity-[0.04] select-none group-hover:opacity-[0.07] transition-opacity"
                >
                  {item.n}
                </span>

                <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-[var(--color-accent)]" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TOP PRODUCTS ─────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-accent)] mb-3">
                Top performers
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] tracking-tight">
                High-converting products
              </h2>
            </div>
            <Button
              variant="ghost"
              className="text-[var(--color-accent)] font-semibold gap-1 self-start md:self-auto"
              asChild
            >
              <Link href="/marketplace">
                Full catalog <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {topProducts.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-16 text-center text-[var(--color-text-muted)] text-sm">
              No affiliate-enabled products yet. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topProducts.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/marketplace/${p.slug}`}
                  className="group block bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6 hover:border-[var(--color-accent)]/40 hover:shadow-sm transition-all duration-200"
                >
                  {/* Category + rank */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--color-text-muted)]">
                      {p.category}
                    </span>
                    {i < 3 && (
                      <span className="text-xs text-[var(--color-text-muted)]" title={`#${i + 1} this week`}>
                        #{i + 1}
                      </span>
                    )}
                  </div>

                  {/* Name + commission side by side */}
                  <div className="flex items-start justify-between gap-3 mb-6">
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)] leading-snug tracking-tight line-clamp-2">
                      {p.name}
                    </h3>
                    {/* Commission as a large typographic element */}
                    <span className="text-2xl font-bold tabular-nums text-[var(--color-accent)] shrink-0 leading-none">
                      {p.commission}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="flex items-center justify-between text-sm mb-5">
                    <div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mb-0.5 uppercase tracking-wide">
                        Est. per sale
                      </p>
                      <p className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                        RWF {p.avgEarning.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[var(--color-text-muted)] mb-0.5 uppercase tracking-wide">
                        Engagement
                      </p>
                      <p className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {p.engagement.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Commission bar */}
                  <div className="h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${Math.min(100, p.rate * 3)}%` }}
                    />
                  </div>

                  {/* CTA row */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {p.rate}% commission rate
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-accent)] flex items-center gap-1 group-hover:gap-2 transition-all">
                      Promote <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── LEADERBOARD ──────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-accent)] mb-3">
              Leaderboard
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Top earners this month
            </h2>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
            Resets every month. Your rank is based on confirmed earnings only.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
          {topEarners.length > 0 ? (
            <div>
              {topEarners.map((aff: any, idx: number) => {
                const earning = Number(aff.total_earnings ?? 0);
                const barPct = maxEarning > 0 ? (earning / maxEarning) * 100 : 0;
                const isTop = idx === 0;
                return (
                  <div
                    key={aff.id}
                    className={`relative flex items-center gap-5 px-6 py-5 border-b border-[var(--color-border)] last:border-0 transition-colors hover:bg-[var(--color-surface-secondary)] ${isTop ? "bg-[var(--color-accent)]/[0.04]" : ""}`}
                  >
                    {/* Earning bar (behind content) */}
                    <div
                      className="absolute inset-y-0 left-0 bg-[var(--color-accent)]/[0.04] pointer-events-none"
                      style={{ width: `${barPct}%` }}
                    />

                    {/* Rank */}
                    <div className="relative z-10 w-8 shrink-0 text-center">
                      {idx < 3 ? (
                        <span className="text-lg">{RANKS[idx]}</span>
                      ) : (
                        <span className="text-sm font-bold text-[var(--color-text-muted)]">
                          #{idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Identity */}
                    <div className="relative z-10 flex-1 min-w-0">
                      <p className="font-semibold text-[var(--color-text-primary)] truncate text-sm">
                        User #{aff.user_id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {aff.total_conversions || 0} conversions
                      </p>
                    </div>

                    {/* Earnings */}
                    <div className="relative z-10 text-right shrink-0">
                      <p className="text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                        RWF {earning.toLocaleString()}
                      </p>
                      {isTop && (
                        <span className="inline-block text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wider mt-0.5">
                          Top earner
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-[var(--color-text-muted)] text-sm">
              No earnings yet this month —{" "}
              <Link
                href="/register?role=affiliate"
                className="text-[var(--color-accent)] font-semibold hover:underline"
              >
                be the first
              </Link>
              .
            </div>
          )}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden bg-[#0f0e0d] px-8 py-16 md:p-16">

            {/* Geometric accent — top-right quadrant */}
            <svg
              aria-hidden
              className="absolute top-0 right-0 w-80 h-80 opacity-10"
              viewBox="0 0 320 320"
              fill="none"
            >
              <circle cx="320" cy="0" r="200" stroke="var(--color-accent)" strokeWidth="1" />
              <circle cx="320" cy="0" r="140" stroke="var(--color-accent)" strokeWidth="1" />
              <circle cx="320" cy="0" r="80" stroke="var(--color-accent)" strokeWidth="1" />
            </svg>

            {/* Accent line */}
            <div className="w-12 h-0.5 bg-[var(--color-accent)] mb-8" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
              <div className="max-w-xl">
                <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.05] tracking-[-0.03em] mb-4">
                  Ready to start earning?
                  <br />
                  <span className="text-[var(--color-accent)]">
                    It takes two minutes.
                  </span>
                </h2>
                <p className="text-white/50 text-base leading-relaxed font-normal">
                  Join thousands of affiliates already promoting verified products
                  and earning up to {heroRate}% per sale. No fees, no waiting.
                </p>
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                <Button
                  size="lg"
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold h-12 px-10 rounded-md shadow-none whitespace-nowrap"
                  asChild
                >
                  <Link href="/register?role=affiliate">
                    Create free account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-white/30 text-xs text-center">
                  No credit card required
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}