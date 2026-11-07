"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import {
  MobileMoneyPaymentStep,
  type MoMoFormState,
} from "@/components/checkout/MobileMoneyCheckoutPanel";
import { WALLET_DEPOSIT_INITIABLE_METHODS } from "@/lib/payments/wallet-deposit-method";
import {
  campaignFundingChargeUsd,
  checkMinCampaignFunding,
  MIN_CAMPAIGN_FUNDING_USD,
} from "@/lib/ugc/min-funding";

const DEPOSIT_METHOD_SET = new Set<string>(WALLET_DEPOSIT_INITIABLE_METHODS);

type PaySelection =
  | { kind: "wallet" }
  | { kind: "external"; id: MethodId };

type Stage = "methods" | "mobile_money";

function mapExternalToDepositMethod(id: MethodId): "flutterwave" | "crypto" | "binancepay" {
  if (id === "nowpayments") return "crypto";
  if (id === "binancepay") return "binancepay";
  return "flutterwave";
}

function extractRedirectUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  for (const key of ["redirectUrl", "checkoutUrl", "checkout_url", "link"]) {
    const v = d[key];
    if (typeof v === "string" && v.startsWith("https://")) return v;
  }
  return null;
}

export function CampaignFundClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const topUpUsd = useMemo(() => {
    const raw = Number(searchParams.get("topUp"));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const pendingNewBudget = useMemo(() => {
    const raw = Number(searchParams.get("newBudget"));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [escrowHeld, setEscrowHeld] = useState(false);
  const [showFundDespiteActive, setShowFundDespiteActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<PaySelection>({
    kind: "external",
    id: "flutterwave",
  });
  const [stage, setStage] = useState<Stage>("methods");
  const [momoForm, setMomoForm] = useState<MoMoFormState>({
    country: "",
    network: "",
    phone: "",
  });
  const [momoError, setMomoError] = useState<string | null>(null);
  const [momoAwaiting, setMomoAwaiting] = useState(false);
  const momoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const momoPollCountRef = useRef(0);
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

  useEffect(() => {
    return () => {
      if (momoPollRef.current) clearInterval(momoPollRef.current);
    };
  }, []);

  const amountToFund = useMemo(() => {
    // Live budget top-up: charge only the incremental escrow amount.
    if (topUpUsd != null) return Math.round(topUpUsd * 100) / 100;
    const budget = Number(campaign?.total_budget) || 0;
    return campaignFundingChargeUsd(budget, "USD");
  }, [campaign, topUpUsd]);

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

  const backToMethods = useCallback(() => {
    if (momoPollRef.current) clearInterval(momoPollRef.current);
    setMomoAwaiting(false);
    setMomoError(null);
    setStage("methods");
  }, []);

  const fundMobileMoney = async () => {
    if (!campaign) return;
    if (readiness && !readiness.success) {
      setMomoError(readiness.errors.map((e) => e.message).join(" · "));
      return;
    }
    if (!momoForm.country) {
      setMomoError("Mobile Money is not available in this country.");
      return;
    }
    if (!momoForm.phone.trim()) {
      setMomoError("Please enter a valid Mobile Money number.");
      return;
    }

    setFunding(true);
    setMomoError(null);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/campaigns/${campaign.id}/deposit/mobile-money/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountToFund,
          country: momoForm.country,
          network: momoForm.network || undefined,
          phone: momoForm.phone,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json.error || t("fundingFailed");
        setMomoError(msg);
        throw new Error(msg);
      }
      if (json.already_funded) {
        setOutcome("activated");
        toast.success(t("campaignActivated"));
        window.setTimeout(() => router.push("/ugc/campaign-center/active"), 1800);
        return;
      }

      const redirectUrl = extractRedirectUrl(json);
      if (redirectUrl) {
        if (redirectUrl.includes("checkout.flutterwave.com/v3/hosted/pay")) {
          setMomoError("Mobile Money could not start. Please try again.");
          throw new Error("Invalid Mobile Money redirect");
        }
        window.location.assign(redirectUrl);
        return;
      }

      const txRef = typeof json.txRef === "string" ? json.txRef : "";
      if (!txRef) throw new Error(t("fundingFailed"));

      const pollUrl = `/api/ugc/campaigns/${campaign.id}/deposit/mobile-money/status?txRef=${encodeURIComponent(txRef)}`;
      setMomoAwaiting(true);
      toast.message(
        typeof json.message === "string" && json.message
          ? json.message
          : "Waiting for Mobile Money authorization…",
      );

      if (momoPollRef.current) clearInterval(momoPollRef.current);
      momoPollCountRef.current = 0;
      const MAX_POLLS = 60;

      await new Promise<void>((resolve, reject) => {
        momoPollRef.current = setInterval(async () => {
          momoPollCountRef.current += 1;
          if (momoPollCountRef.current > MAX_POLLS) {
            if (momoPollRef.current) clearInterval(momoPollRef.current);
            setMomoAwaiting(false);
            reject(new Error("The payment expired. Please try again."));
            return;
          }
          try {
            const st = await fetch(pollUrl);
            const body = await st.json();
            if (body.status === "successful") {
              if (momoPollRef.current) clearInterval(momoPollRef.current);
              setMomoAwaiting(false);
              setOutcome("activated");
              toast.success(t("campaignActivated"));
              window.setTimeout(() => router.push("/ugc/campaign-center/active"), 1800);
              resolve();
              return;
            }
            if (body.status === "failed" || body.status === "cancelled") {
              if (momoPollRef.current) clearInterval(momoPollRef.current);
              setMomoAwaiting(false);
              reject(
                new Error(
                  body.message ||
                    (body.status === "cancelled"
                      ? "The payment was cancelled."
                      : "The payment failed."),
                ),
              );
            }
          } catch {
            // Transient — keep polling
          }
        }, 5000);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("fundingFailed");
      setMomoError(msg);
      setError(msg);
    } finally {
      setFunding(false);
    }
  };

  const fund = async () => {
    if (!campaign) return;
    // Top-ups skip full wizard readiness; they only add confirmed escrow.
    if (!topUpUsd && readiness && !readiness.success) {
      setError(readiness.errors.map((e) => e.message).join(" · "));
      return;
    }
    if (!topUpUsd && !checkMinCampaignFunding(amountToFund, "USD").ok) {
      setError(t("minFundingIs", { amount: money(MIN_CAMPAIGN_FUNDING_USD) }));
      return;
    }
    if (topUpUsd && amountToFund <= 0) {
      setError("Top-up amount must be greater than zero.");
      return;
    }
    if (usingWallet && walletBalance < amountToFund) {
      setError(t("insufficientWalletEscrow"));
      return;
    }
    if (!usingWallet && externalId === "mobile_money") {
      setStage("mobile_money");
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
          ...(topUpUsd != null
            ? { topUp: true, newBudget: pendingNewBudget ?? undefined }
            : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const missing = Array.isArray(json.missing)
          ? (json.missing as { message?: string }[]).map((m) => m.message).filter(Boolean).join(" · ")
          : "";
        throw new Error(missing || json.error || t("fundingFailed"));
      }

      if (json.topUp && json.funded) {
        setOutcome("activated");
        toast.success(json.message || "Budget top-up confirmed.");
        window.setTimeout(() => {
          router.push(`/ugc/campaign-center/${campaign.id}/edit`);
        }, 1400);
        return;
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
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#111827]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToCampaignCenter")}
      </Link>

      <AnimatePresence mode="wait">
        {outcome === "activated" ? (
          <motion.div
            key="activated"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#D1FAE5] bg-[#ECFDF5] px-6 py-10 text-center"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white">
              <Check className="h-7 w-7 text-[#059669]" />
            </div>
            <h1 className="mt-4 text-[22px] font-bold text-[#111827]">{t("campaignActivated")}</h1>
            <p className="mt-2 text-[13px] text-[#6B7280]">Redirecting to active campaigns…</p>
          </motion.div>
        ) : outcome === "pending" ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center"
          >
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-700" />
            <h1 className="mt-4 text-[20px] font-bold text-[#111827]">{t("escrowPending")}</h1>
          </motion.div>
        ) : (
          <motion.div
            key="fund"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-xl"
          >
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1EA] text-[#FF5A1F]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-[20px] font-bold tracking-tight text-[#111827] sm:text-[22px]">
                    Fund campaign
                  </h1>
                  <p className="mt-1 text-[13px] text-[#6B7280]">{campaign.title}</p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <Row
                  label={topUpUsd != null ? "Budget top-up" : "Campaign budget"}
                  value={money(amountToFund)}
                  strong
                />
                {topUpUsd != null && pendingNewBudget != null ? (
                  <Row label="New total budget" value={money(pendingNewBudget)} />
                ) : null}
                <Row label="Minimum funding required" value={money(MIN_CAMPAIGN_FUNDING_USD)} />
                <Row label="Estimated reach" value={`~${estimatedReach.toLocaleString()} views`} />
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[#6B7280]">
                Jimvio requires a minimum of <strong>$100.00 USD</strong> (or the RWF equivalent at
                the current trusted rate) in confirmed escrow before a campaign can activate.
                Pending checkouts are not treated as funded.
              </p>

              {readiness && !readiness.success ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-900">
                  <p className="font-semibold">{t("campaignNotReadyToFund")}</p>
                  <ul className="mt-1 list-inside list-disc">
                    {incompleteSteps.map((s) => (
                      <li key={s.id}>{s.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                {stage === "mobile_money" ? (
                  <MobileMoneyPaymentStep
                    phoneInputId="ugc-fund-phone"
                    amountUsd={amountToFund}
                    formatMoney={(amt, cur) => formatMoneyAsUSD(amt, cur)}
                    value={momoForm}
                    onChange={setMomoForm}
                    onBack={backToMethods}
                    onContinue={() => void fundMobileMoney()}
                    submitting={funding}
                    awaitingConfirmation={momoAwaiting}
                    error={momoError}
                    title="Fund with Mobile Money"
                    subtitle="Pay securely using your local mobile wallet."
                    amountLabel="Funding amount"
                    continueLabel="Continue with Mobile Money"
                    secureNote="Your campaign is funded only after payment is verified."
                  />
                ) : (
                  <>
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
                          : externalId === "mobile_money"
                            ? null
                            : (externalId as MethodId)
                      }
                      onSelect={(methodId) => {
                        if (methodId === "mobile_money") {
                          setSelection({ kind: "external", id: "mobile_money" });
                          setMomoError(null);
                          setError(null);
                          setStage("mobile_money");
                          return;
                        }
                        setSelection({ kind: "external", id: methodId });
                      }}
                      orderTotal={amountToFund}
                      orderCurrency={PLATFORM_CURRENCY}
                      showSummary={false}
                      enabledMethodIds={enabledMethods}
                      loading={funding}
                    />

                    <button
                      type="button"
                      disabled={payDisabled || externalId === "mobile_money"}
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
                            ? topUpUsd != null
                              ? `Confirm top-up · ${money(amountToFund)}`
                              : `${t("fundAndActivate")} · ${money(amountToFund)}`
                            : topUpUsd != null
                              ? "Complete top-up payment"
                              : "Complete Secure Payment"}
                        </>
                      )}
                    </button>
                  </>
                )}
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
