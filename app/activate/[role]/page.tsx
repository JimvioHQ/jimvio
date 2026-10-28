"use client";

import React, { useEffect, useState, useTransition } from "react";
import { MAX_AFFILIATE_COMMISSION_PERCENT } from "@/lib/affiliate/commission-tiers";
import { DEFAULT_ATTRIBUTION_WINDOW_DAYS } from "@/lib/affiliate/attribution-window";
import { AFFILIATE_MIN_WITHDRAWAL_USD, AFFILIATE_RELEASE_TEXT } from "@/lib/payments/payout-terms";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Store, Link2, Video, ArrowRight, CheckCircle2,
  Loader2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { RoleActivationChecklist } from "@/components/growth/RoleActivationChecklist";
import { activateUserRole } from "@/lib/actions/account-settings";

type RoleKey = "vendor" | "affiliate" | "influencer";

interface RoleConfig {
  title: string;
  description: string;
  stats: { label: string; value: string }[];
  faq: { q: string; a: string }[];
  buttonLabel: string;
  successPath: string;
  icon: React.ReactNode;
  iconColor: string;
  table: string;
}

const ROLES: Record<RoleKey, RoleConfig> = {
  vendor: {
    title: "Become a vendor",
    description: "Sell products to global buyers. Manage your catalog, track orders, and get paid securely within 48 hours.",
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
    successPath: "/activate/vendor",
    icon: <Store className="h-5 w-5" />,
    iconColor: "text-orange-500",
    table: "vendors",
  },
  affiliate: {
    title: "Activate affiliate",
    description: "Generate referral links for any product and earn commission on every sale you drive — no inventory needed.",
    stats: [
      { label: "Commission", value: `Up to ${MAX_AFFILIATE_COMMISSION_PERCENT}%` },
      { label: "Cookie window", value: `${DEFAULT_ATTRIBUTION_WINDOW_DAYS} days` },
      { label: "Min payout", value: `$${AFFILIATE_MIN_WITHDRAWAL_USD}` },
    ],
    faq: [
      { q: "How is commission calculated?", a: `You earn a percentage of each sale made through your referral link. The seller sets the rate, up to ${MAX_AFFILIATE_COMMISSION_PERCENT}% depending on the item price.` },
      { q: "When do I get paid?", a: `${AFFILIATE_RELEASE_TEXT} You can withdraw once your available balance reaches $${AFFILIATE_MIN_WITHDRAWAL_USD}.` },
      { q: "Can I promote any product?", a: "You can generate affiliate links for any product on Jimvio that has affiliate enabled by the vendor." },
      { q: "Do I need a referral link before activating?", a: "No. Activate first, then pick products and create tracked /ref links from the Affiliate Hub." },
    ],
    buttonLabel: "Activate affiliate",
    successPath: "/affiliates/dashboard",
    icon: <Link2 className="h-5 w-5" />,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    table: "affiliates",
  },
  influencer: {
    title: "Join as creator",
    description: "Create short product clips, join brand campaigns, and earn from your content and audience reach.",
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
    successPath: "/ugc",
    icon: <Video className="h-5 w-5" />,
    iconColor: "text-pink-600 dark:text-pink-400",
    table: "influencers",
  },
};

const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];

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

export default function ActivateRolePage() {
  const params = useParams();
  const router = useRouter();
  const rawRole = (params?.role as string)?.toLowerCase() as RoleKey;

  const [activeRole, setActiveRole] = useState<RoleKey>(
    ROLE_KEYS.includes(rawRole) ? rawRole : "vendor"
  );

  const config = ROLES[activeRole];

  const [statusMap, setStatusMap] = useState<Record<RoleKey, boolean | null>>({
    vendor: null,
    affiliate: null,
    influencer: null,
  });
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [accountChecks, setAccountChecks] = useState({
    emailConfirmed: false,
    profileComplete: false,
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (ROLE_KEYS.includes(rawRole) && rawRole !== activeRole) {
      setActiveRole(rawRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawRole]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setAccountChecks({
        emailConfirmed: !!user.email_confirmed_at,
        profileComplete: !!(
          profile?.full_name?.trim() ||
          user.user_metadata?.full_name
        ),
      });

      const [vendorRes, affiliateRes, influencerRes] = await Promise.all([
        supabase
          .from("vendors")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("affiliates")
          .select("id, is_active")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("influencers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      setStatusMap({
        vendor: !!vendorRes.data,
        affiliate: !!affiliateRes.data?.is_active,
        influencer: !!influencerRes.data,
      });
      setLoading(false);
    }
    void load();
  }, []);

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
            Your{" "}
            <span className="font-semibold text-[var(--color-text-primary)] capitalize">
              {activeRole}
            </span>{" "}
            role is already activated.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              asChild
              className="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white border-none font-semibold text-[13px]"
            >
              <Link href={config.successPath}>
                {activeRole === "affiliate"
                  ? "Open Affiliate Dashboard"
                  : activeRole === "influencer"
                    ? "Open Creator Hub"
                    : "Continue setup"}
              </Link>
            </Button>
            <button
              type="button"
              onClick={() =>
                setActiveRole(ROLE_KEYS.find((r) => !statusMap[r]) ?? "vendor")
              }
              className="text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              Activate another role
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 text-center">
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Sign in required
          </h1>
          <p className="text-[13px] text-[var(--color-text-muted)] mb-6">
            Sign in to activate your {activeRole} role.
          </p>
          <Button
            asChild
            className="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white border-none font-semibold text-[13px]"
          >
            <Link
              href={`/login?next=${encodeURIComponent(`/activate/${activeRole}`)}`}
            >
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const requirementChecks =
    activeRole === "affiliate"
      ? [
          { label: "Jimvio account verified", done: accountChecks.emailConfirmed },
          { label: "Profile completed", done: accountChecks.profileComplete },
          { label: "Active Jimvio account", done: signedIn },
          { label: "Accepted affiliate terms", done: termsAccepted },
        ]
      : activeRole === "influencer"
        ? [
            { label: "Jimvio account verified", done: accountChecks.emailConfirmed },
            { label: "Profile completed", done: accountChecks.profileComplete },
            { label: "Active Jimvio account", done: signedIn },
          ]
        : [
            { label: "Jimvio account verified", done: accountChecks.emailConfirmed },
            { label: "Profile completed", done: accountChecks.profileComplete },
          ];

  const allMet = requirementChecks.every((r) => r.done);
  const canActivate =
    activeRole === "vendor" ? accountChecks.emailConfirmed : allMet;

  function handleActivate() {
    setError(null);
    setSuccessMsg(null);

    if (activeRole === "vendor") {
      router.push("/activate/vendor");
      return;
    }

    if (!canActivate) {
      setError("Complete the requirements above before activating.");
      return;
    }

    startTransition(async () => {
      const result = await activateUserRole(activeRole);
      if (!result.success) {
        setError(result.error || "Activation failed. Please try again.");
        return;
      }

      setStatusMap((prev) => ({ ...prev, [activeRole]: true }));
      setSuccessMsg(
        activeRole === "affiliate"
          ? "Affiliate activated ✓"
          : "Creator role activated ✓"
      );

      window.location.assign(config.successPath);
    });
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <RoleActivationChecklist role={activeRole} />

      <div className="flex gap-1.5 p-1.5 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-2xl mb-6">
        {ROLE_KEYS.map((key) => {
          const cfg = ROLES[key];
          const active = key === activeRole;
          const done = statusMap[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveRole(key);
                setError(null);
                setSuccessMsg(null);
                router.replace(`/activate/${key}`);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[12px] font-semibold transition-all",
                active
                  ? "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <span
                className={cn(
                  "flex items-center",
                  active ? cfg.iconColor : "text-[var(--color-text-muted)]"
                )}
              >
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

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[var(--color-border)]">
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center mb-4",
              "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]",
              config.iconColor
            )}
          >
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

          <div>
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
              Requirements
            </p>
            <div className="space-y-2.5">
              {requirementChecks.map((req) => (
                <div key={req.label} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors",
                      req.done
                        ? "bg-[var(--color-success-light)] border-[var(--color-success)]/40"
                        : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
                    )}
                  >
                    {req.done && (
                      <CheckCircle2 className="h-3 w-3 text-[var(--color-success)]" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[13px]",
                      req.done
                        ? "text-[var(--color-text-secondary)] line-through"
                        : "text-[var(--color-text-primary)]"
                    )}
                  >
                    {req.label}
                  </span>
                </div>
              ))}
            </div>

            {activeRole === "affiliate" ? (
              <label className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-orange-500"
                />
                <span className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                  I accept the Jimvio affiliate terms: I will promote products honestly,
                  use tracked links for attribution, and understand commissions are paid
                  after confirmed orders.
                </span>
              </label>
            ) : null}

            {!accountChecks.emailConfirmed ? (
              <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">
                Verify your email before activating.{" "}
                <Link
                  href="/settings/profile"
                  className="text-[var(--color-accent)] font-semibold hover:underline"
                >
                  Open settings →
                </Link>
              </p>
            ) : null}

            {accountChecks.emailConfirmed && !accountChecks.profileComplete ? (
              <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">
                Add your name to complete your profile.{" "}
                <Link
                  href="/settings/profile"
                  className="text-[var(--color-accent)] font-semibold hover:underline"
                >
                  Complete profile →
                </Link>
              </p>
            ) : null}
          </div>

          {successMsg ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700">
              {successMsg}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={!canActivate || pending}
            onClick={handleActivate}
            className={cn(
              "w-full h-11 rounded-xl font-semibold text-[13px] border-none transition-all",
              canActivate && !pending
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] cursor-not-allowed"
            )}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activating…
                </>
              ) : (
                <>
                  {config.buttonLabel}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </span>
          </Button>

          <div>
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">
              Frequently asked
            </p>
            {config.faq.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>

          <p className="text-center text-[11px] text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
            Questions?{" "}
            <Link
              href="/help"
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
