"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import type { UGCCampaign } from "@/types/ugc";
import { cn } from "@/lib/utils";
import { formatMoneyAsUSD, PLATFORM_CURRENCY } from "@/lib/currency/platform";
import {
  assertCampaignReadyForFunding,
  campaignWizardIncompleteSteps,
  toCampaignWizardDraft,
} from "@/lib/ugc/campaign-wizard-validation";
import { useLocale } from "@/context/LocaleContext";
import {
  PaymentMethodSelector,
  type MethodId,
} from "@/components/checkout/PaymentMethodSelector";
import { WALLET_DEPOSIT_INITIABLE_METHODS } from "@/lib/payments/wallet-deposit-method";

const MIN_FUNDING_USD = 1;

const DEPOSIT_METHOD_SET = new Set<string>(WALLET_DEPOSIT_INITIABLE_METHODS);

type PaySelection =
  | { kind: "wallet" }
  | { kind: "external"; id: MethodId };

function mapExternalToDepositMethod(id: MethodId): "flutterwave" | "crypto" | "binancepay" {
  if (id === "nowpayments") return "crypto";
  if (id === "binancepay") return "binancepay";
  return "flutterwave";
}

export function CampaignFundClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [escrowHeld, setEscrowHeld] = useState(false);
  const [showFundDespiteActive, setShowFundDespiteActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<PaySelection>({
    kind: "external",
    id: "flutterwave",
  });
  const [phone, setPhone] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletCurrency, setWalletCurrency] = useState<string>(PLATFORM_CURRENCY);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"idle" | "activated" | "pending">("idle");
  const [enabledMethods, setEnabledMethods] = useState<MethodId[]>([
    ...WALLET_DEPOSIT_INITIABLE_METHODS,
  ] as MethodId[]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [campaignRes, walletRes, providersRes, escrowRes] = await Promise.all([
          fetch(`/api/ugc/campaigns/${id}`),
          fetch("/api/identity/wallet"),
          fetch("/api/platform/payment-providers"),
          fetch(`/api/ugc/brand/campaigns/${id}/escrow`),
        ]);
        const json = await campaignRes.json();
        const walletJson = walletRes.ok ? await walletRes.json().catch(() => ({})) : {};
        const providersJson = providersRes.ok
          ? await providersRes.json().catch(() => ({}))
          : {};
        const escrowJson = escrowRes.ok ? await escrowRes.json().catch(() => ({})) : {};
        if (!cancelled) {
          setCampaign(json.campaign ?? null);
          const escRows = Array.isArray(escrowJson?.escrow)
            ? escrowJson.escrow
            : escrowJson?.escrow
              ? [escrowJson.escrow]
              : [];
          setEscrowHeld(
            escRows.some((e: { status?: string }) => {
              const s = String(e?.status ?? "").toLowerCase();
              return s === "held" || s === "funded" || s === "released";
            }),
          );
          setWalletBalance(Number(walletJson.balance ?? 0));
          setWalletCurrency(
            String(walletJson.currency || PLATFORM_CURRENCY).toUpperCase() || PLATFORM_CURRENCY,
          );
          const enabled = Array.isArray(providersJson.enabled) ? providersJson.enabled : [];
          const filtered = enabled.filter((m: string): m is MethodId =>
            DEPOSIT_METHOD_SET.has(m),
          );
          const nextMethods = (
            filtered.length > 0 ? filtered : [...WALLET_DEPOSIT_INITIABLE_METHODS]
          ) as MethodId[];
          setEnabledMethods(nextMethods);
          setSelection((prev) => {
            if (prev.kind === "wallet") return prev;
            if (nextMethods.includes(prev.id)) return prev;
            return { kind: "external", id: nextMethods[0] ?? "flutterwave" };
          });
        }
      } catch {
        if (!cancelled) setCampaign(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const amountToFund = useMemo(() => {
    const budget = Number(campaign?.total_budget) || MIN_FUNDING_USD;
    return Math.max(MIN_FUNDING_USD, budget);
  }, [campaign]);

  const money = (amount: number, currency: string = PLATFORM_CURRENCY) =>
    formatMoneyAsUSD(amount, currency);

  const readiness = useMemo(
    () => (campaign ? assertCampaignReadyForFunding(campaign as unknown as Record<string, unknown>) : null),
    [campaign],
  );
  const incompleteSteps = useMemo(
    () =>
      campaign
        ? campaignWizardIncompleteSteps(toCampaignWizardDraft(campaign as unknown as Record<string, unknown>))
        : [],
    [campaign],
  );

  const estimatedReach = useMemo(() => {
    const rate = Number(campaign?.rate_per_1k_views) || 1;
    const views = Math.floor((amountToFund / rate) * 1000);
    return Math.max(views, 1000);
  }, [amountToFund, campaign]);

  const usingWallet = selection.kind === "wallet";
  const externalId = selection.kind === "external" ? selection.id : null;
  const depositMethod = usingWallet
    ? "wallet"
    : mapExternalToDepositMethod(externalId ?? "flutterwave");

  const fund = async () => {
    if (!campaign) return;
    if (readiness && !readiness.success) {
      setError(readiness.errors.map((e) => e.message).join(" · "));
      return;
    }
    if (amountToFund < MIN_FUNDING_USD) {
      setError(t("minFundingIs", { amount: money(MIN_FUNDING_USD) }));
      return;
    }
    if (depositMethod === "flutterwave" && !phone.trim()) {
      setError(t("phoneRequired"));
      return;
    }
    if (usingWallet && walletBalance < amountToFund) {
      setError(t("insufficientWalletEscrow"));
      return;
    }
    setFunding(true);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/campaigns/${campaign.id}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountToFund,
          payment_method: depositMethod,
          phone: depositMethod === "flutterwave" ? phone : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const missing = Array.isArray(json.missing)
          ? (json.missing as { message?: string }[]).map((m) => m.message).filter(Boolean).join(" · ")
          : "";
        throw new Error(missing || json.error || t("fundingFailed"));
      }

      const activated = Boolean(json.activated);
      if (activated) {
        setOutcome("activated");
        toast.success(t("campaignActivated"));
        window.setTimeout(() => {
          router.push("/ugc/campaign-center/active");
        }, 1800);
        return;
      }

      if (typeof json.checkout_url === "string" && json.checkout_url) {
        window.location.assign(json.checkout_url);
        return;
      }

      setOutcome("pending");
      toast.message(json.message || t("escrowPending"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("fundingFailed"));
    } finally {
      setFunding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[15px] font-semibold text-[#111827]">{t("campaignNotFound")}</p>
        <Link
          href="/ugc/campaign-center"
          className="mt-4 inline-flex text-[13px] font-semibold text-[#FF5A1F]"
        >
          {t("backToCampaignCenter")}
        </Link>
      </div>
    );
  }

  if (campaign.status === "active" && escrowHeld) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#ECFDF5]">
          <Check className="h-7 w-7 text-[#059669]" />
        </div>
        <h1 className="mt-4 text-[22px] font-bold text-[#111827]">{t("alreadyActive")}</h1>
        <p className="mt-2 text-[13px] text-[#6B7280]">
          {t("alreadyActiveDetail", { title: campaign.title })}
        </p>
        <Link
          href="/ugc/campaign-center/active"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-[#FF5A1F] px-5 text-[13px] font-bold text-white"
        >
          {t("viewActiveCampaigns")}
        </Link>
      </div>
    );
  }

  if (campaign.status === "active" && !escrowHeld && !showFundDespiteActive) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50">
          <Lock className="h-7 w-7 text-amber-700" />
        </div>
        <h1 className="mt-4 text-[22px] font-bold text-[#111827]">{t("alreadyActive")}</h1>
        <p className="mt-2 text-[13px] text-[#6B7280]">
          {t("alreadyActiveAdminDetail", { title: campaign.title })}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setShowFundDespiteActive(true)}
            className="inline-flex h-10 items-center rounded-full bg-[#FF5A1F] px-5 text-[13px] font-bold text-white"
          >
            {t("fundAdminActivatedCta")}
          </button>
          <Link
            href="/ugc/campaign-center/active"
            className="inline-flex h-10 items-center rounded-full border border-[#E5E7EB] px-5 text-[13px] font-semibold text-[#374151]"
          >
            {t("viewActiveCampaigns")}
          </Link>
        </div>
      </div>
    );
  }

  const walletSelected = usingWallet;
  const payDisabled =
    funding ||
    Boolean(readiness && !readiness.success) ||
    (usingWallet && walletBalance < amountToFund) ||
    (!usingWallet && !externalId);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[920px] px-4 py-6 sm:px-6">
      <Link
        href="/ugc/campaign-center"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#FF5A1F]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("backToCampaignCenter")}
      </Link>

      <div className="mt-4 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#FF5A1F]">
          {t("campaignCenter")}
        </p>
        <h1 className="mt-1 break-words text-[24px] font-bold tracking-tight text-[#111827] sm:text-[28px]">
          {t("fundCampaign")}
        </h1>
        <p className="mt-1 max-w-xl text-[13px] text-[#6B7280]">
          {t("fundMustBeFunded")}
        </p>
      </div>

      {readiness && !readiness.success ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800" role="alert">
          <p className="font-semibold">{t("campaignNotReadyToFund")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {incompleteSteps.map((s) => (
              <li key={s.id}>
                {s.label}: {s.errors.map((e) => e.message).join(" ")}
              </li>
            ))}
          </ul>
          <Link
            href={`/ugc/campaign-center/${campaign.id}/edit`}
            className="mt-3 inline-flex text-[13px] font-semibold text-[#FF5A1F]"
          >
            {t("completeRequiredFields")}
          </Link>
        </div>
      ) : null}

      <ol className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
        {[
          { id: "draft", label: t("statusDraft"), done: true, current: false },
          { id: "pending", label: t("pendingFundingLabel"), done: true, current: true },
          { id: "active", label: t("statusActive"), done: outcome === "activated", current: false },
        ].map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            {i > 0 ? <span className="text-[#D1D5DB]" aria-hidden="true">→</span> : null}
            <span
              aria-current={s.current && outcome !== "activated" ? "step" : undefined}
              className={cn(
                "rounded-full px-2.5 py-1",
                s.done && !s.current && "bg-[#ECFDF5] text-[#059669]",
                s.current && outcome === "idle" && "bg-[#FFF0E8] text-[#FF5A1F]",
                outcome === "activated" && s.id === "active" && "bg-[#ECFDF5] text-[#059669]",
                outcome === "pending" && s.id === "pending" && "bg-[#FFF0E8] text-[#FF5A1F]",
                !s.done && !s.current && "bg-[#F3F4F6] text-[#9CA3AF]",
              )}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        {outcome !== "idle" ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 rounded-3xl border border-[#BBF7D0] bg-gradient-to-br from-[#ECFDF5] to-white p-10 text-center shadow-lg"
            role="status"
            aria-live="polite"
          >
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#059669] text-white shadow-[0_10px_30px_rgba(5,150,105,0.35)]"
              aria-hidden="true"
            >
              <Check className="h-8 w-8" strokeWidth={2.5} />
            </motion.div>
            <h2 className="mt-5 text-[22px] font-bold text-[#111827]">
              {outcome === "activated" ? t("campaignActivated") : t("fundingPending")}
            </h2>
            <p className="mt-2 text-[13px] text-[#6B7280]">
              {outcome === "activated"
                ? t("escrowLockedCreatorsCanJoin", { title: campaign.title })
                : t("escrowPending")}
            </p>
            {outcome === "pending" ? (
              <Link
                href="/ugc/campaign-center"
                className="mt-6 inline-flex h-10 items-center rounded-full bg-[#FF5A1F] px-5 text-[13px] font-bold text-white"
              >
                {t("backToCampaignCenter")}
              </Link>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[1.05fr_0.95fr]"
          >
            <div className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-[#EEF0F2] bg-white p-5 shadow-sm">
                <h2 className="text-[14px] font-bold text-[#111827]">{t("campaignSummary")}</h2>
                <p className="mt-2 break-words text-[16px] font-bold text-[#111827]">{campaign.title}</p>
                <p className="mt-1 line-clamp-3 text-[12.5px] text-[#6B7280]">
                  {campaign.description || t("noDescription")}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                  <div className="min-w-0 rounded-xl bg-[#F9FAFB] px-3 py-2.5">
                    <p className="text-[#9CA3AF]">{t("reviewType")}</p>
                    <p className="mt-0.5 break-words font-semibold capitalize text-[#111827]">
                      {campaign.campaign_type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl bg-[#F9FAFB] px-3 py-2.5">
                    <p className="text-[#9CA3AF]">{t("wizardTotalBudget")}</p>
                    <p className="mt-0.5 font-semibold text-[#111827]">
                      {money(campaign.total_budget ?? 0)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-[#FFE4D6] bg-[#FFF8F5] px-3 py-3">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-[#9A3412]">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#FF5A1F]" />
                    {t("estimatedCreatorReach")}
                  </div>
                  <p className="mt-1 text-[18px] font-bold tabular-nums text-[#FF5A1F]">
                    {t("viewsApprox", { count: estimatedReach.toLocaleString() })}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#EEF0F2] bg-white p-5 shadow-sm">
                <h2 className="text-[14px] font-bold text-[#111827]">{t("fundingProgress")}</h2>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                  <div
                    className="h-full rounded-full bg-[#FF5A1F] transition-all"
                    style={{ width: "18%" }}
                  />
                </div>
                <p className="mt-2 text-[12px] text-[#6B7280]">
                  {t("escrowEmptyFund")}
                </p>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-[#EEF0F2] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5A1F]" />
                <div className="min-w-0">
                  <h2 className="text-[14px] font-bold text-[#111827]">{t("secureFunding")}</h2>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#6B7280]">
                    {t("fundsLockedUntilApproved")}{" "}
                    <strong className="text-[#111827]">
                      {money(MIN_FUNDING_USD)}
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                <Row label={t("currentBalance")} value={money(walletBalance, walletCurrency)} />
                <Row
                  label={t("minimumRequired")}
                  value={money(MIN_FUNDING_USD)}
                />
                <Row
                  label={t("amountToFund")}
                  value={money(amountToFund)}
                  strong
                />
              </div>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  role="radio"
                  aria-checked={walletSelected}
                  aria-pressed={walletSelected}
                  onClick={() => setSelection({ kind: "wallet" })}
                  className={cn(
                    "relative w-full text-left transition-[transform,border-color,background-color,box-shadow] duration-200",
                    "rounded-xl overflow-hidden border active:scale-[0.99]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35 focus-visible:ring-offset-2",
                    walletSelected
                      ? "border-[#FF5A1F] bg-[#FFF8F5] shadow-[0_8px_24px_rgba(253,80,0,0.08)] ring-1 ring-[#FF5A1F]/25"
                      : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]",
                  )}
                >
                  <div className="flex items-start gap-3 px-4 py-3.5 lg:items-center">
                    <div
                      className={cn(
                        "grid h-12 w-12 shrink-0 place-items-center rounded-full",
                        walletSelected ? "bg-[#FF5A1F] text-white" : "bg-[#F3F4F6] text-[#6B7280]",
                      )}
                    >
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-[#111827]">{t("methodWallet")}</p>
                      <p className="mt-0.5 text-[12px] text-[#6B7280]">{t("methodWalletDesc")}</p>
                      <p className="mt-1 text-[11px] font-medium text-[#9CA3AF]">
                        {money(walletBalance, walletCurrency)} available
                      </p>
                    </div>
                    <span
                      className={cn(
                        "mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                        walletSelected
                          ? "border-[#FF5A1F] bg-[#FF5A1F]"
                          : "border-[#D1D5DB] bg-white",
                      )}
                      aria-hidden="true"
                    >
                      {walletSelected ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
                    </span>
                  </div>
                </button>

                <PaymentMethodSelector
                  selected={
                    usingWallet
                      ? (("__wallet__" as unknown) as MethodId)
                      : (externalId as MethodId)
                  }
                  onSelect={(id) => setSelection({ kind: "external", id })}
                  orderTotal={amountToFund}
                  orderCurrency={PLATFORM_CURRENCY}
                  showSummary={false}
                  enabledMethodIds={enabledMethods}
                  loading={funding}
                />

                {depositMethod === "flutterwave" ? (
                  <div>
                    <label htmlFor="ugc-fund-phone" className="mb-1 block text-[11px] font-semibold text-[#6B7280]">
                      {t("phoneMobileMoney")}
                    </label>
                    <input
                      id="ugc-fund-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="2507…"
                      autoComplete="tel"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "ugc-fund-error" : undefined}
                      className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-[13px] outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15"
                    />
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={payDisabled}
                  onClick={() => void fund()}
                  aria-describedby={error ? "ugc-fund-error" : undefined}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-sm py-3.5 text-[15px] font-bold text-white transition-all duration-150",
                    "bg-[#FF5A1F] hover:bg-[#E54E18] active:scale-[0.99]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {funding ? (
                    "Processing…"
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      {usingWallet
                        ? `${t("fundAndActivate")} · ${money(amountToFund)}`
                        : "Complete Secure Payment"}
                    </>
                  )}
                </button>
              </div>

              {error ? (
                <p id="ugc-fund-error" role="alert" className="mt-3 text-[12.5px] font-medium text-red-600">{error}</p>
              ) : null}

              <p className="mt-2 text-center text-[11px] text-[#9CA3AF]">
                {t("activationBlockedUntilEscrow")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F9FAFB] px-3 py-2.5">
      <span className="text-[12px] text-[#6B7280]">{label}</span>
      <span
        className={cn(
          "text-[13px] tabular-nums",
          strong ? "font-bold text-[#FF5A1F]" : "font-semibold text-[#111827]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
