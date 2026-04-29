// "use client";

// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter, useParams } from "next/navigation";
// import {
//   Store,
//   Link2,
//   Video,
//   ArrowRight,
//   CheckCircle2,
//   Building2,
//   Loader2,
// } from "lucide-react";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { createClient } from "@/lib/supabase/client";

// const roleConfig: Record<string, { title: string; description: string; requirements: string[]; buttonLabel: string; setupPath: string; icon: React.ReactNode }> = {
//   vendor: {
//     title: "Become a Vendor",
//     description: "Start selling products to global buyers. List your catalog, manage orders, and get paid securely.",
//     requirements: ["Business name", "Business address", "Phone verification"],
//     buttonLabel: "Apply as Vendor",
//     setupPath: "/dashboard/vendor/setup",
//     icon: <Store className="h-12 w-12 text-[var(--color-accent)]" />,
//   },
//   affiliate: {
//     title: "Activate Affiliate",
//     description: "Promote products and earn commission on every sale you drive. Generate links and track performance.",
//     requirements: ["Active Jimvio account", "Accept affiliate terms"],
//     buttonLabel: "Activate Affiliate",
//     setupPath: "/dashboard/roles",
//     icon: <Link2 className="h-12 w-12 text-emerald-600" />,
//   },
//   influencer: {
//     title: "Join as Creator",
//     description: "Create viral product clips, join campaigns, and earn from your audience.",
//     requirements: ["Profile and social links", "Accept creator terms"],
//     buttonLabel: "Activate Creator",
//     setupPath: "/dashboard/roles",
//     icon: <Video className="h-12 w-12 text-pink-600" />,
//   },
// };

// export default function ActivateRolePage() {
//   const router = useRouter();
//   const params = useParams();
//   const role = (params?.role as string)?.toLowerCase() || "";
//   const config = roleConfig[role];
//   const [alreadyActive, setAlreadyActive] = useState(false);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!config) return;
//     const supabase = createClient();
//     supabase.auth.getUser().then(({ data: { user } }) => {
//       if (!user) {
//         setLoading(false);
//         return;
//       }
//       const table = role === "vendor" ? "vendors" : role === "affiliate" ? "affiliates" : "influencers";
//       supabase.from(table).select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
//         setAlreadyActive(!!data);
//         setLoading(false);
//       });
//     });
//   }, [role, config]);

//   if (!config) {
//     return (
//       <div className="max-w-lg mx-auto py-10 px-4 text-center">
//         <p className="text-[var(--color-text-muted)]">Unknown role.</p>
//         <Link href="/dashboard"><Button className="mt-4">Back to Dashboard</Button></Link>
//       </div>
//     );
//   }

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-[40vh]">
//         <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
//       </div>
//     );
//   }

//   if (alreadyActive) {
//     return (
//       <div className="max-w-lg mx-auto py-8 px-4">
//         <Card className="border-[var(--color-success)]/30 bg-[var(--color-success-light)]/30 rounded-2xl">
//           <CardContent className="p-5 sm:p-6 text-center">
//             <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-[var(--color-success)] mx-auto mb-4" />
//             <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">You&apos;re already active</h1>
//             <p className="text-sm text-[var(--color-text-secondary)] mb-6">This role is already activated on your account.</p>
//             <Button asChild><Link href="/dashboard">Go to Dashboard</Link></Button>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-xl mx-auto py-6 sm:py-8 px-4">
//       <Card className="shadow-lg border-[var(--color-border)] overflow-hidden rounded-2xl">
//         <CardContent className="p-5 sm:p-8">
//           <div className="flex justify-center mb-5 sm:mb-6">{config.icon}</div>
//           <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] text-center mb-2">{config.title}</h1>
//           <p className="text-[var(--color-text-secondary)] text-center text-xs sm:text-sm mb-6 sm:mb-8">{config.description}</p>

//           <div className="mb-8">
//             <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Requirements</h2>
//             <ul className="space-y-2">
//               {config.requirements.map((req, i) => (
//                 <li key={i} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
//                   <Building2 className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
//                   {req}
//                 </li>
//               ))}
//             </ul>
//           </div>

//           <Button asChild className="w-full" size="lg">
//             <Link href={config.setupPath}>
//               {config.buttonLabel}
//               <ArrowRight className="h-4 w-4 ml-2" />
//             </Link>
//           </Button>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Store, Link2, Video, ArrowRight, CheckCircle2,
  Loader2, ChevronDown, Globe, Zap, Clock,
  DollarSign, ShieldCheck, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleKey = "vendor" | "affiliate" | "influencer";

interface RoleConfig {
  title: string;
  description: string;
  /** Static requirements shown as a checklist */
  requirements: string[];
  /** Benefit stat tiles */
  stats: { label: string; value: string }[];
  /** FAQ items */
  faq: { q: string; a: string }[];
  buttonLabel: string;
  setupPath: string;
  icon: React.ReactNode;
  iconColor: string;
  /** Supabase table for checking activation */
  table: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLES: Record<RoleKey, RoleConfig> = {
  vendor: {
    title: "Become a vendor",
    description: "Sell products to global buyers. Manage your catalog, track orders, and get paid securely within 48 hours.",
    requirements: ["Business name and description", "Valid business address", "Payout method configured"],
    stats: [
      { label: "Platform fee", value: "0%" },
      { label: "First payout", value: "48h" },
      { label: "Countries", value: "190+" },
    ],
    faq: [
      { q: "How long does approval take?", a: "Most applications are reviewed within 24 hours. You'll receive an email once approved." },
      { q: "Can I sell digital products?", a: "Yes — you can list software, templates, courses, and any downloadable file alongside physical goods." },
      { q: "How do payouts work?", a: "Earnings are released 48h after a buyer confirms delivery. You can withdraw to bank, mobile money, or PayPal." },
      { q: "Is there a listing fee?", a: "No. Jimvio charges zero listing fees. A small transaction fee applies only when you make a sale." },
    ],
    buttonLabel: "Start application",
    setupPath: "/dashboard/vendor/setup",
    icon: <Store className="h-5 w-5" />,
    iconColor: "text-orange-500",
    table: "vendors",
  },
  affiliate: {
    title: "Activate affiliate",
    description: "Generate referral links for any product and earn commission on every sale you drive — no inventory needed.",
    requirements: ["Active Jimvio account", "Accepted affiliate terms", "At least one active referral source"],
    stats: [
      { label: "Commission", value: "Up to 20%" },
      { label: "Cookie window", value: "30 days" },
      { label: "Min payout", value: "$10" },
    ],
    faq: [
      { q: "How is commission calculated?", a: "You earn a percentage of each sale made through your referral link, set by the vendor (typically 5–20%)." },
      { q: "When do I get paid?", a: "Earnings are cleared 7 days after the order is confirmed and paid out on request." },
      { q: "Can I promote any product?", a: "You can generate affiliate links for any product on Jimvio that has affiliate enabled by the vendor." },
    ],
    buttonLabel: "Activate affiliate",
    setupPath: "/dashboard/roles",
    icon: <Link2 className="h-5 w-5" />,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    table: "affiliates",
  },
  influencer: {
    title: "Join as creator",
    description: "Create short product clips, join brand campaigns, and earn from your content and audience reach.",
    requirements: ["Complete profile with social links", "At least 500 followers on one platform", "Accepted creator terms"],
    stats: [
      { label: "Avg. campaign pay", value: "$25–$200" },
      { label: "Active campaigns", value: "40+" },
      { label: "Payout speed", value: "24h" },
    ],
    faq: [
      { q: "How do I join a campaign?", a: "Browse active UGC campaigns in the Explore section and apply. Brands review and approve creators within 48h." },
      { q: "What content formats are accepted?", a: "Short-form video (Reels, TikTok style), product demos, unboxings, and lifestyle photos." },
      { q: "How is creator pay calculated?", a: "Each campaign has a fixed rate or performance bonus set by the brand. You see the payout before applying." },
    ],
    buttonLabel: "Activate creator",
    setupPath: "/dashboard/roles",
    icon: <Video className="h-5 w-5" />,
    iconColor: "text-pink-600 dark:text-pink-400",
    table: "influencers",
  },
};

const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];

// ─── FAQ accordion item ───────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[var(--color-border)] py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)] leading-relaxed">
          {a}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ActivateRolePage() {
  const params = useParams();
  const rawRole = (params?.role as string)?.toLowerCase() as RoleKey;

  // Allow navigating between roles without a page reload
  const [activeRole, setActiveRole] = useState<RoleKey>(
    ROLE_KEYS.includes(rawRole) ? rawRole : "vendor"
  );

  const config = ROLES[activeRole];

  // Per-role activation status
  const [statusMap, setStatusMap] = useState<Record<RoleKey, boolean | null>>({
    vendor: null,
    affiliate: null,
    influencer: null,
  });
  const [loading, setLoading] = useState(true);

  // Account-level checks (email confirmed, profile complete)
  const [accountChecks, setAccountChecks] = useState({
    emailConfirmed: false,
    profileComplete: false,
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setAccountChecks({
        emailConfirmed: !!user.email_confirmed_at,
        profileComplete: !!(user.user_metadata?.full_name),
      });

      // Check all three roles in parallel
      const [vendorRes, affiliateRes, influencerRes] = await Promise.all([
        supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("influencers").select("id").eq("user_id", user.id).maybeSingle(),
      ]);

      setStatusMap({
        vendor: !!vendorRes.data,
        affiliate: !!affiliateRes.data,
        influencer: !!influencerRes.data,
      });
      setLoading(false);
    }
    load();
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
        <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
          Loading…
        </p>
      </div>
    );
  }

  const isActive = statusMap[activeRole];

  // ── Already active ─────────────────────────────────────────────────────────

  if (isActive) {
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--color-success-light)] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Already active
          </h1>
          <p className="text-[13px] text-[var(--color-text-muted)] mb-6 leading-relaxed">
            Your <span className="font-semibold text-[var(--color-text-primary)] capitalize">{activeRole}</span> role is already activated. Head to your dashboard to get started.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white border-none font-semibold text-[13px]">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <button
              onClick={() => setActiveRole(ROLE_KEYS.find((r) => !statusMap[r]) ?? "vendor")}
              className="text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              Activate another role
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ──────────────────────────────────────────────────────────────

  // Build the requirements checklist — first two are derived from account state
  const requirementChecks = [
    { label: "Jimvio account verified", done: accountChecks.emailConfirmed },
    { label: "Profile completed", done: accountChecks.profileComplete },
    ...config.requirements.map((r) => ({ label: r, done: false })),
  ];

  const allMet = requirementChecks.every((r) => r.done);

  return (
    <div className="max-w-lg mx-auto py-8 px-4">

      {/* Role switcher */}
      <div className="flex gap-1.5 p-1.5 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-2xl mb-6">
        {ROLE_KEYS.map((key) => {
          const cfg = ROLES[key];
          const active = key === activeRole;
          const done = statusMap[key];
          return (
            <button
              key={key}
              onClick={() => setActiveRole(key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[12px] font-semibold transition-all",
                active
                  ? "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <span className={cn("flex items-center", active ? cfg.iconColor : "text-[var(--color-text-muted)]")}>
                {cfg.icon}
              </span>
              <span className="hidden sm:inline capitalize">{key}</span>
              {done && (
                <CheckCircle2 className="h-3 w-3 text-[var(--color-success)] flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">

        {/* Card header */}
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center mb-4",
            "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]",
            config.iconColor
          )}>
            {config.icon}
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 capitalize">
            {config.title}
          </h1>
          <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
            {config.description}
          </p>
        </div>

        <div className="p-6 space-y-6">

          {/* Benefit stats */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              What you get
            </p>
            <div className="grid grid-cols-3 gap-2">
              {config.stats.map((s) => (
                <div
                  key={s.label}
                  className="bg-[var(--color-surface-secondary)] rounded-xl p-3 text-center"
                >
                  <p className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-0.5 tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements checklist */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Requirements
            </p>
            <div className="space-y-2.5">
              {requirementChecks.map((req) => (
                <div key={req.label} className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors",
                    req.done
                      ? "bg-[var(--color-success-light)] border-[var(--color-success)]/40"
                      : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
                  )}>
                    {req.done && (
                      <CheckCircle2 className="h-3 w-3 text-[var(--color-success)]" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[13px]",
                    req.done
                      ? "text-[var(--color-text-secondary)] line-through"
                      : "text-[var(--color-text-primary)]"
                  )}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress hint if not all met */}
            {!allMet && (
              <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">
                Complete the remaining steps above before applying.
                {!accountChecks.emailConfirmed && (
                  <> <Link href="/dashboard/settings" className="text-[var(--color-accent)] font-semibold hover:underline">Verify your email →</Link></>
                )}
              </p>
            )}
          </div>

          {/* CTA */}
          <Button
            asChild
            disabled={!allMet && accountChecks.emailConfirmed === false}
            className={cn(
              "w-full h-11 rounded-xl font-semibold text-[13px] border-none transition-all",
              allMet || accountChecks.emailConfirmed
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] cursor-not-allowed"
            )}
          >
            <Link href={config.setupPath} className="flex items-center justify-center gap-2">
              {config.buttonLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          {/* FAQ */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">
              Frequently asked
            </p>
            {config.faq.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>

          {/* Footer note */}
          <p className="text-center text-[11px] text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
            Questions?{" "}
            <Link
              href="/support"
              className="text-[var(--color-accent)] font-semibold hover:underline"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}