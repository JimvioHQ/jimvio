"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Bitcoin,
  CheckCircle2,
  Landmark,
  Settings2,
  Smartphone,
  Wallet,
} from "lucide-react";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import {
  BANK_COUNTRY_CONFIG,
  CRYPTO_ASSETS,
  CRYPTO_NETWORKS,
  MOBILE_MONEY_BY_COUNTRY,
  customerFacingWithdrawalStatus,
  normalizeWalletWithdrawalMethod,
  payoutMethodsForCountry,
  walletWithdrawalMethodLabel,
  withdrawalProcessingEstimate,
  type CryptoAssetId,
  type WalletWithdrawalMethod,
  type WithdrawalDestinationDetails,
} from "@/lib/payments/wallet-payout-method";
import {
  CUSTOM_INSTITUTION_ID,
  banksForCountry,
  enrichMobileMoneyProvider,
  findBank,
} from "@/lib/payments/payout-provider-catalog";
import { calculateWithdrawalFee } from "@/lib/payments/withdrawal-fees";
import { InstitutionPicker } from "@/components/wallet-os/InstitutionPicker";
import { ProviderLogo } from "@/components/wallet-os/ProviderLogo";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletPill,
  WalletSectionHeading,
  cn,
  statusTone,
  useWalletFetch,
} from "./wallet-ui";

interface WithdrawalRecord {
  id: string;
  amount: number;
  fee?: number;
  netAmount?: number;
  currency?: string;
  method?: string;
  payoutMethod?: string | null;
  methodLabel?: string;
  status: string;
  statusLabel?: string;
  createdAt: string;
  reference?: string | null;
  providerReference?: string | null;
  payoutAccount?: string | null;
  destinationDisplay?: string | null;
}

interface SavedPayoutMethod {
  id: string;
  method: string;
  methodLabel?: string;
  isDefault?: boolean;
  isActive?: boolean;
  accountDetails?: Record<string, unknown>;
  maskedDisplay?: string;
}

interface WalletWithdrawalsResponse {
  currency?: string;
  availableBalance?: number;
  withdrawals?: WithdrawalRecord[];
  methods?: string[];
  savedMethods?: SavedPayoutMethod[];
}

const METHOD_META: Array<{
  id: WalletWithdrawalMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  logoSrc?: string;
}> = [
  {
    id: "bank",
    label: "Bank transfer",
    icon: Landmark,
    description: "Receive funds in your bank account",
  },
  {
    id: "mobile_money",
    label: "Mobile Money",
    icon: Smartphone,
    description: "Receive funds on your mobile wallet",
  },
  {
    id: "binance_id",
    label: "Binance ID",
    icon: Wallet,
    description: "Receive your payout through Binance",
    logoSrc: "/logos/binance.png",
  },
  {
    id: "crypto",
    label: "Cryptocurrency",
    icon: Bitcoin,
    description: "Receive USDT or USDC to your wallet",
  },
];

const STATUS_FILTERS = ["all", "pending", "processing", "completed", "failed"] as const;

const fieldClass =
  "h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 text-[14px] text-[#121113] outline-none focus:border-[#FF5A1F]/50 focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/25";

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-[#726D64]">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[11px] text-[#9B968D]">{hint}</p> : null}
    </div>
  );
}

function displayStatus(status: string) {
  return customerFacingWithdrawalStatus(status);
}

export function WalletWithdrawalsClient() {
  const { status, data, error, retry } =
    useWalletFetch<WalletWithdrawalsResponse>("/api/wallet/os/withdrawals");

  const [panel, setPanel] = useState<"withdraw" | "activity">("withdraw");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("RW");
  const [method, setMethod] = useState<WalletWithdrawalMethod>("bank");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "review" | "success">("form");
  const [successPayload, setSuccessPayload] = useState<{
    amount: number;
    method: WalletWithdrawalMethod;
    reference: string;
    destination: string;
  } | null>(null);
  const [savedMethodId, setSavedMethodId] = useState<string | null>(null);

  // Bank
  const [bankId, setBankId] = useState(() => banksForCountry("RW")[0]?.id ?? CUSTOM_INSTITUTION_ID);
  const [customBankName, setCustomBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  // Mobile money
  const [mmProvider, setMmProvider] = useState(
    MOBILE_MONEY_BY_COUNTRY.RW.providers[0]?.id ?? "",
  );
  const [mmPhone, setMmPhone] = useState("");
  const [mmHolder, setMmHolder] = useState("");

  // Binance
  const [binanceId, setBinanceId] = useState("");
  const [confirmBinanceId, setConfirmBinanceId] = useState("");
  const [binanceName, setBinanceName] = useState("");

  // Crypto
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAssetId>("USDT");
  const [cryptoNetwork, setCryptoNetwork] = useState("TRC20");
  const [walletAddress, setWalletAddress] = useState("");

  const currency = data?.currency || "USD";
  const available = Number(data?.availableBalance ?? 0);
  const parsedAmount = Number(amount);

  const feeQuote = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return calculateWithdrawalFee(method, 0);
    }
    return calculateWithdrawalFee(method, parsedAmount);
  }, [method, parsedAmount]);

  const bankCfg = BANK_COUNTRY_CONFIG[country] ?? BANK_COUNTRY_CONFIG.OTHER;
  const mmCfg = MOBILE_MONEY_BY_COUNTRY[country];
  const cryptoNetworks = CRYPTO_NETWORKS[cryptoAsset] ?? [];
  const availableMethods = useMemo(() => payoutMethodsForCountry(country), [country]);
  const bankList = useMemo(() => banksForCountry(country), [country]);
  const mmProviders = useMemo(() => {
    if (!mmCfg) return [];
    return mmCfg.providers.map((p) =>
      enrichMobileMoneyProvider(p.id, p.label, country),
    );
  }, [mmCfg, country]);

  const selectedBank = bankId ? findBank(country, bankId) : null;
  const selectedMm = mmProviders.find((p) => p.id === mmProvider) ?? null;

  const filtered = useMemo(() => {
    const list = data?.withdrawals ?? [];
    if (statusFilter === "all") return list;
    return list.filter((w) => displayStatus(w.status).key === statusFilter);
  }, [data?.withdrawals, statusFilter]);

  const savedMethods = (data?.savedMethods ?? []).filter((m) => m.isActive !== false);

  function syncMethodForCountry(nextCountry: string) {
    const allowed = payoutMethodsForCountry(nextCountry);
    if (!allowed.includes(method)) {
      setMethod(allowed[0] ?? "bank");
    }
    const banks = banksForCountry(nextCountry);
    setBankId(banks[0]?.id ?? CUSTOM_INSTITUTION_ID);
    setCustomBankName("");
    const mm = MOBILE_MONEY_BY_COUNTRY[nextCountry];
    setMmProvider(mm?.providers[0]?.id ?? "");
    setSavedMethodId(null);
    setStep("form");
  }

  function buildDestination(): WithdrawalDestinationDetails {
    switch (method) {
      case "bank":
        return {
          method: "bank",
          country,
          bankId: bankId || CUSTOM_INSTITUTION_ID,
          bankName:
            bankId === CUSTOM_INSTITUTION_ID
              ? customBankName
              : selectedBank?.name || customBankName,
          accountHolder,
          accountNumber,
          routingNumber,
          sortCode,
          branchCode,
          iban,
          swift,
          bankAddress,
          currency: bankCfg.currency,
        };
      case "mobile_money":
        return {
          method: "mobile_money",
          country,
          provider: mmProvider,
          phone: mmPhone,
          accountHolder: mmHolder,
        };
      case "binance_id":
        return {
          method: "binance_id",
          binanceId,
          confirmBinanceId,
          recipientName: binanceName || undefined,
        };
      case "crypto":
        return {
          method: "crypto",
          asset: cryptoAsset,
          network: cryptoNetwork,
          walletAddress,
        };
    }
  }

  function reviewLines(): Array<{ label: string; value: string }> {
    const dest = buildDestination();
    const lines: Array<{ label: string; value: string }> = [
      { label: "Withdrawal", value: formatMoneyAsUSD(feeQuote.amount, currency) },
      { label: "Fee", value: formatMoneyAsUSD(feeQuote.fee, currency) },
      { label: "You receive", value: formatMoneyAsUSD(feeQuote.netAmount, currency) },
      { label: "Method", value: walletWithdrawalMethodLabel(method) },
      { label: "Country", value: bankCfg.label || mmCfg?.label || country },
    ];
    if (method === "bank") {
      lines.push({
        label: "Bank",
        value: dest.bankName || "—",
      });
      lines.push({
        label: "Account",
        value: dest.accountNumber
          ? `•••• ${dest.accountNumber.slice(-4)}`
          : dest.iban
            ? `•••• ${dest.iban.slice(-4)}`
            : "—",
      });
    }
    if (method === "mobile_money") {
      lines.push({
        label: "Provider",
        value: selectedMm?.name || dest.provider || "—",
      });
      lines.push({
        label: "Phone",
        value: dest.phone ? `•••• ${dest.phone.slice(-4)}` : "—",
      });
    }
    if (method === "binance_id") {
      lines.push({
        label: "Binance ID",
        value: dest.binanceId ? `•••• ${dest.binanceId.slice(-4)}` : "—",
      });
    }
    if (method === "crypto") {
      lines.push({ label: "Asset", value: `${dest.asset} · ${dest.network}` });
      lines.push({
        label: "Wallet",
        value: dest.walletAddress
          ? `•••• ${dest.walletAddress.slice(-4)}`
          : "—",
      });
    }
    lines.push({
      label: "Estimated processing",
      value: withdrawalProcessingEstimate(method),
    });
    return lines;
  }

  function applySavedMethod(m: SavedPayoutMethod) {
    const canonical = normalizeWalletWithdrawalMethod(m.method);
    if (!canonical) {
      toast.error("This saved method is no longer available");
      return;
    }
    const details = (m.accountDetails ?? {}) as WithdrawalDestinationDetails;
    setSavedMethodId(m.id);
    setMethod(canonical);
    if (details.country) {
      setCountry(String(details.country).toUpperCase());
    }
    if (canonical === "bank") {
      if (details.bankId) setBankId(String(details.bankId));
      else setBankId(CUSTOM_INSTITUTION_ID);
      setCustomBankName(String(details.bankName ?? ""));
      setAccountHolder(String(details.accountHolder ?? ""));
      setAccountNumber(String(details.accountNumber ?? ""));
      setRoutingNumber(String(details.routingNumber ?? ""));
      setSortCode(String(details.sortCode ?? ""));
      setBranchCode(String(details.branchCode ?? ""));
      setIban(String(details.iban ?? ""));
      setSwift(String(details.swift ?? ""));
      setBankAddress(String(details.bankAddress ?? ""));
    }
    if (canonical === "mobile_money") {
      setMmProvider(String(details.provider ?? ""));
      setMmPhone(String(details.phone ?? ""));
      setMmHolder(String(details.accountHolder ?? ""));
    }
    if (canonical === "binance_id") {
      setBinanceId(String(details.binanceId ?? ""));
      setConfirmBinanceId(String(details.binanceId ?? ""));
      setBinanceName(String(details.recipientName ?? ""));
    }
    if (canonical === "crypto") {
      const asset = String(details.asset ?? "USDT").toUpperCase() as CryptoAssetId;
      setCryptoAsset(CRYPTO_ASSETS.some((a) => a.id === asset) ? asset : "USDT");
      setCryptoNetwork(String(details.network ?? "TRC20"));
      setWalletAddress(String(details.walletAddress ?? ""));
    }
    setStep("form");
    toast.success("Saved payout method loaded");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "form") {
      if (!parsedAmount || parsedAmount <= 0) {
        toast.error("Enter a valid withdrawal amount");
        return;
      }
      if (parsedAmount > available) {
        toast.error("Amount exceeds available balance");
        return;
      }
      if (feeQuote.netAmount <= 0) {
        toast.error("Amount is too small after the Jimvio withdrawal fee");
        return;
      }
      if (!availableMethods.includes(method)) {
        toast.error("Choose a payout method available in this country");
        return;
      }
      setStep("review");
      return;
    }

    if (step !== "review") return;

    const canonical = normalizeWalletWithdrawalMethod(method);
    if (!canonical) {
      toast.error("Choose a supported payout method");
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey =
        typeof globalThis.crypto !== "undefined" &&
        typeof globalThis.crypto.randomUUID === "function"
          ? globalThis.crypto.randomUUID()
          : `wd-${String(parsedAmount)}-${submitting ? "1" : "0"}`;
      const res = await fetch("/api/wallet/os/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          amount: parsedAmount,
          payoutMethod: canonical,
          destination: buildDestination(),
          methodId: savedMethodId || undefined,
          idempotencyKey,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || "Withdrawal request failed");
      }

      const reference =
        body?.payout?.provider_reference ||
        body?.payout?.id ||
        idempotencyKey;
      const dest = buildDestination();
      setSuccessPayload({
        amount: parsedAmount,
        method: canonical,
        reference: String(reference),
        destination:
          canonical === "bank"
            ? dest.bankName || "Bank transfer"
            : walletWithdrawalMethodLabel(canonical),
      });
      setStep("success");
      toast.success(
        body?.duplicate
          ? "Withdrawal already submitted"
          : "Withdrawal requested",
      );
      setAmount("");
      setBankId(banksForCountry(country)[0]?.id ?? CUSTOM_INSTITUTION_ID);
      setCustomBankName("");
      setAccountHolder("");
      setAccountNumber("");
      setRoutingNumber("");
      setSortCode("");
      setBranchCode("");
      setIban("");
      setSwift("");
      setBankAddress("");
      setMmPhone("");
      setMmHolder("");
      setBinanceId("");
      setConfirmBinanceId("");
      setBinanceName("");
      setWalletAddress("");
      setSavedMethodId(null);
      retry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet"
        title="Withdrawals"
        description="Choose your country and payout method. Funds are reserved while your payout is processed."
        action={
          <div className="flex flex-wrap gap-2">
            <WalletButton
              variant={panel === "activity" ? "primary" : "outline"}
              size="md"
              type="button"
              onClick={() => setPanel(panel === "activity" ? "withdraw" : "activity")}
            >
              Activity
            </WalletButton>
            <Link href="/wallet/payout-methods">
              <WalletButton variant="outline" size="md">
                <Settings2 className="h-4 w-4" />
                Payout methods
              </WalletButton>
            </Link>
          </div>
        }
        className="mb-5"
      />

      {panel === "activity" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-[#121113]">Withdrawal activity</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35",
                    statusFilter === s
                      ? "bg-[#121113] text-white"
                      : "border border-black/[0.06] bg-white text-[#726D64]",
                  )}
                >
                  {s === "completed" ? "Completed" : s}
                </button>
              ))}
            </div>
          </div>
          {status === "loading" && <WalletLoading label="Loading activity…" />}
          {status === "error" && (
            <WalletErrorState message={error || "Could not load activity"} onRetry={retry} />
          )}
          {(status === "empty" || (status === "ready" && filtered.length === 0)) && (
            <WalletEmptyState
              title="No withdrawals yet"
              description="Your withdrawal activity will appear here."
            />
          )}
          {status === "ready" && filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((w) => {
                const face = displayStatus(w.status);
                return (
                  <WalletCard key={w.id} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#121113]">
                        {w.methodLabel ?? walletWithdrawalMethodLabel(w.method || w.payoutMethod)}
                      </p>
                      <p className="truncate text-[11px] text-[#9B968D]">
                        {w.destinationDisplay ? `${w.destinationDisplay} · ` : ""}
                        {new Date(w.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {w.reference || w.providerReference
                          ? ` · ${w.reference || w.providerReference}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <WalletPill tone={statusTone(w.status === "paid" ? "paid" : face.key)}>
                        {face.label}
                      </WalletPill>
                      <span className="text-[13px] font-semibold tabular-nums text-[#121113]">
                        {formatMoneyAsUSD(w.amount, w.currency || currency)}
                      </span>
                    </div>
                  </WalletCard>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          <WalletCard className="p-4 sm:p-5">
            {step === "success" && successPayload ? (
              <div className="space-y-4 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#ECFDF5] text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[17px] font-semibold text-[#121113]">Withdrawal requested</p>
                  <p className="mt-1 text-[13px] text-[#726D64]">
                    Your payout request has been received and is being processed.
                  </p>
                </div>
                <dl className="space-y-2 rounded-xl border border-black/[0.06] bg-[#F8FAFC] p-3.5 text-left text-[13px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#726D64]">Amount</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatMoneyAsUSD(successPayload.amount, currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#726D64]">Method</dt>
                    <dd className="font-semibold">
                      {walletWithdrawalMethodLabel(successPayload.method)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#726D64]">Status</dt>
                    <dd className="font-semibold">Processing</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#726D64]">Reference</dt>
                    <dd className="max-w-[60%] truncate font-mono text-[11px] font-semibold">
                      {successPayload.reference}
                    </dd>
                  </div>
                </dl>
                <WalletButton
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    setStep("form");
                    setSuccessPayload(null);
                    setPanel("activity");
                  }}
                >
                  View activity
                </WalletButton>
                <WalletButton
                  type="button"
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setStep("form");
                    setSuccessPayload(null);
                  }}
                >
                  New withdrawal
                </WalletButton>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
                    Request withdrawal
                  </p>
                  {typeof data?.availableBalance === "number" && (
                    <p className="mt-1 text-[13px] text-[#726D64]">
                      Available to withdraw:{" "}
                      <span className="font-semibold tabular-nums text-[#121113]">
                        {formatMoneyAsUSD(data.availableBalance, currency)}
                      </span>
                    </p>
                  )}
                </div>

                {savedMethods.length > 0 && step === "form" ? (
                  <div>
                    <p className="mb-1.5 text-[12px] font-medium text-[#726D64]">
                      Saved payout methods
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {savedMethods.slice(0, 4).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => applySavedMethod(m)}
                          className={cn(
                            "flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[12.5px] transition-colors",
                            savedMethodId === m.id
                              ? "border-[#FF5A1F]/50 bg-[#FFF6F1]"
                              : "border-black/[0.08] bg-white hover:border-black/15",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block font-semibold text-[#121113]">
                              {m.methodLabel ?? walletWithdrawalMethodLabel(m.method)}
                              {m.isDefault ? (
                                <span className="ml-1.5 text-[10px] font-medium text-[#9B968D]">
                                  Default
                                </span>
                              ) : null}
                            </span>
                            <span className="block truncate text-[11px] text-[#9B968D]">
                              {m.maskedDisplay || "Saved destination"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {step === "form" ? (
                  <>
                    <Field id="wd-amount" label="Amount (USD)">
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#B9B3A6]">
                          $
                        </span>
                        <input
                          id="wd-amount"
                          type="number"
                          min={1}
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          required
                          className={cn(fieldClass, "pl-8")}
                        />
                      </div>
                    </Field>

                    <Field id="wd-country" label="Country">
                      <select
                        id="wd-country"
                        value={country}
                        onChange={(e) => {
                          const next = e.target.value;
                          setCountry(next);
                          syncMethodForCountry(next);
                        }}
                        className={fieldClass}
                      >
                        {Object.entries(BANK_COUNTRY_CONFIG).map(([code, cfg]) => (
                          <option key={code} value={code}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <div>
                      <p className="mb-1.5 text-[12px] font-medium text-[#726D64]" id="method-label">
                        How do you want to receive money?
                      </p>
                      <div
                        className="grid grid-cols-1 gap-1.5"
                        role="radiogroup"
                        aria-labelledby="method-label"
                      >
                        {METHOD_META.filter((m) => availableMethods.includes(m.id)).map((m) => {
                          const Icon = m.icon;
                          const active = method === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => {
                                setMethod(m.id);
                                setSavedMethodId(null);
                                if (m.id === "crypto") {
                                  setCryptoNetwork(CRYPTO_NETWORKS.USDT[0]?.id ?? "TRC20");
                                }
                              }}
                              className={cn(
                                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35",
                                active
                                  ? "border-[#FF5A1F]/60 bg-[#FFF6F1]"
                                  : "border-black/[0.08] bg-white hover:border-black/15",
                              )}
                            >
                              {m.logoSrc ? (
                                <ProviderLogo src={m.logoSrc} size="sm" />
                              ) : (
                                <span
                                  className={cn(
                                    "grid h-7 w-7 place-items-center rounded-lg border border-black/[0.06]",
                                    active ? "bg-white text-[#D6480F]" : "bg-[#F8FAFC] text-[#9B968D]",
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-semibold text-[#121113]">
                                  {m.label}
                                </span>
                                <span className="block text-[11px] leading-snug text-[#9B968D]">
                                  {m.description}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {method === "bank" ? (
                      <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#F8FAFC] p-3">
                        <InstitutionPicker
                          id="bank-picker"
                          label="Select your bank"
                          institutions={bankList}
                          value={bankId || bankList[0]?.id || CUSTOM_INSTITUTION_ID}
                          onChange={(id) => {
                            setBankId(id);
                            setSavedMethodId(null);
                            if (id !== CUSTOM_INSTITUTION_ID) setCustomBankName("");
                          }}
                          searchPlaceholder="Search banks…"
                        />
                        {bankId === CUSTOM_INSTITUTION_ID ? (
                          <Field id="custom-bank" label="Bank / institution name">
                            <input
                              id="custom-bank"
                              value={customBankName}
                              onChange={(e) => setCustomBankName(e.target.value)}
                              className={fieldClass}
                              required
                            />
                          </Field>
                        ) : null}
                        <Field id="account-holder" label="Account holder name">
                          <input
                            id="account-holder"
                            value={accountHolder}
                            onChange={(e) => setAccountHolder(e.target.value)}
                            className={fieldClass}
                            autoComplete="name"
                            required
                          />
                        </Field>
                        {bankCfg.fields.includes("accountNumber") ? (
                          <Field id="account-number" label="Account number">
                            <input
                              id="account-number"
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                              className={fieldClass}
                              autoComplete="off"
                              required={!bankCfg.fields.includes("iban")}
                            />
                          </Field>
                        ) : null}
                        {bankCfg.fields.includes("routingNumber") ? (
                          <Field
                            id="routing"
                            label={country === "US" ? "Routing number" : "Routing / transit number"}
                          >
                            <input
                              id="routing"
                              value={routingNumber}
                              onChange={(e) => setRoutingNumber(e.target.value)}
                              className={fieldClass}
                              required={country === "US"}
                            />
                          </Field>
                        ) : null}
                        {bankCfg.fields.includes("sortCode") ? (
                          <Field id="sort-code" label="Sort code">
                            <input
                              id="sort-code"
                              value={sortCode}
                              onChange={(e) => setSortCode(e.target.value)}
                              className={fieldClass}
                              placeholder="12-34-56"
                              required
                            />
                          </Field>
                        ) : null}
                        {bankCfg.fields.includes("branchCode") ? (
                          <Field id="branch" label="Branch code (optional)">
                            <input
                              id="branch"
                              value={branchCode}
                              onChange={(e) => setBranchCode(e.target.value)}
                              className={fieldClass}
                            />
                          </Field>
                        ) : null}
                        {bankCfg.fields.includes("iban") ? (
                          <Field id="iban" label="IBAN">
                            <input
                              id="iban"
                              value={iban}
                              onChange={(e) => setIban(e.target.value)}
                              className={fieldClass}
                              required={!bankCfg.fields.includes("accountNumber") || !accountNumber}
                            />
                          </Field>
                        ) : null}
                        {bankCfg.fields.includes("swift") ? (
                          <Field id="swift" label="SWIFT / BIC (optional)">
                            <input
                              id="swift"
                              value={swift}
                              onChange={(e) => setSwift(e.target.value)}
                              className={fieldClass}
                            />
                          </Field>
                        ) : null}
                        {bankCfg.fields.includes("bankAddress") ? (
                          <Field id="bank-address" label="Bank address (optional)">
                            <input
                              id="bank-address"
                              value={bankAddress}
                              onChange={(e) => setBankAddress(e.target.value)}
                              className={fieldClass}
                            />
                          </Field>
                        ) : null}
                        <p className="text-[11px] text-[#9B968D]">
                          Settled from your USD balance · local currency reference: {bankCfg.currency}
                        </p>
                      </div>
                    ) : null}

                    {method === "mobile_money" && mmCfg ? (
                      <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#F8FAFC] p-3">
                        <InstitutionPicker
                          id="mm-picker"
                          label="Select Mobile Money provider"
                          institutions={mmProviders}
                          value={mmProvider}
                          onChange={(id) => {
                            setMmProvider(id);
                            setSavedMethodId(null);
                          }}
                          searchPlaceholder="Search providers…"
                        />
                        <Field
                          id="mm-phone"
                          label="Mobile number"
                          hint={`Use international format (e.g. ${mmCfg.dial}…)`}
                        >
                          <input
                            id="mm-phone"
                            type="tel"
                            value={mmPhone}
                            onChange={(e) => setMmPhone(e.target.value)}
                            className={fieldClass}
                            placeholder={`${mmCfg.dial}…`}
                            required
                          />
                        </Field>
                        <Field id="mm-holder" label="Account holder name (optional)">
                          <input
                            id="mm-holder"
                            value={mmHolder}
                            onChange={(e) => setMmHolder(e.target.value)}
                            className={fieldClass}
                          />
                        </Field>
                      </div>
                    ) : null}

                    {method === "binance_id" ? (
                      <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#F8FAFC] p-3">
                        <div className="flex items-start gap-2.5">
                          <ProviderLogo src="/logos/binance.png" size="md" />
                          <p className="text-[12px] leading-relaxed text-[#726D64]">
                            Receive your payout through your Binance account. Enter the Binance ID
                            that should receive funds.
                          </p>
                        </div>
                        <Field id="binance-id" label="Binance ID">
                          <input
                            id="binance-id"
                            inputMode="numeric"
                            value={binanceId}
                            onChange={(e) => setBinanceId(e.target.value)}
                            className={fieldClass}
                            placeholder="123456789"
                            required
                            autoComplete="off"
                          />
                        </Field>
                        <Field id="binance-confirm" label="Confirm Binance ID">
                          <input
                            id="binance-confirm"
                            inputMode="numeric"
                            value={confirmBinanceId}
                            onChange={(e) => setConfirmBinanceId(e.target.value)}
                            className={fieldClass}
                            required
                            autoComplete="off"
                          />
                        </Field>
                        <Field id="binance-name" label="Recipient name (optional)">
                          <input
                            id="binance-name"
                            value={binanceName}
                            onChange={(e) => setBinanceName(e.target.value)}
                            className={fieldClass}
                          />
                        </Field>
                      </div>
                    ) : null}

                    {method === "crypto" ? (
                      <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#F8FAFC] p-3">
                        <Field id="crypto-asset" label="Asset">
                          <select
                            id="crypto-asset"
                            value={cryptoAsset}
                            onChange={(e) => {
                              const next = e.target.value as CryptoAssetId;
                              setCryptoAsset(next);
                              setCryptoNetwork(CRYPTO_NETWORKS[next]?.[0]?.id ?? "");
                            }}
                            className={fieldClass}
                          >
                            {CRYPTO_ASSETS.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field id="crypto-network" label="Network">
                          <select
                            id="crypto-network"
                            value={cryptoNetwork}
                            onChange={(e) => setCryptoNetwork(e.target.value)}
                            className={fieldClass}
                          >
                            {cryptoNetworks.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field id="crypto-address" label="Wallet address">
                          <input
                            id="crypto-address"
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                            className={fieldClass}
                            autoComplete="off"
                            spellCheck={false}
                            required
                          />
                        </Field>
                        <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-950">
                          Use only the selected network. Sending on an incompatible network may
                          permanently lose funds. Network processing is required after submission.
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {step === "review" ? (
                  <div className="space-y-3">
                    <p className="text-[14px] font-semibold text-[#121113]">Review withdrawal</p>
                    {method === "bank" && selectedBank && bankId !== CUSTOM_INSTITUTION_ID ? (
                      <div className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-[#F8FAFC] px-3 py-2.5">
                        <ProviderLogo institution={selectedBank} size="md" />
                        <div>
                          <p className="text-[13px] font-semibold text-[#121113]">
                            {selectedBank.name}
                          </p>
                          <p className="text-[11px] text-[#9B968D]">Bank transfer · {bankCfg.label}</p>
                        </div>
                      </div>
                    ) : null}
                    {method === "mobile_money" && selectedMm ? (
                      <div className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-[#F8FAFC] px-3 py-2.5">
                        <ProviderLogo institution={selectedMm} size="md" />
                        <div>
                          <p className="text-[13px] font-semibold text-[#121113]">
                            {selectedMm.name}
                          </p>
                          <p className="text-[11px] text-[#9B968D]">Mobile Money · {mmCfg?.label}</p>
                        </div>
                      </div>
                    ) : null}
                    <dl className="space-y-2 rounded-xl border border-black/[0.08] bg-white p-3.5 text-[13px]">
                      {reviewLines().map((line) => (
                        <div key={line.label} className="flex justify-between gap-3">
                          <dt className="text-[#726D64]">{line.label}</dt>
                          <dd className="max-w-[60%] text-right font-semibold text-[#121113]">
                            {line.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}

                {step === "form" ? (
                  <div className="rounded-xl border border-black/[0.08] bg-white p-3.5">
                    <dl className="space-y-1.5 text-[13px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#726D64]">Withdrawal amount</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatMoneyAsUSD(feeQuote.amount || 0, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#726D64]">{feeQuote.label}</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatMoneyAsUSD(feeQuote.fee, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-black/[0.06] pt-1.5">
                        <dt className="font-semibold text-[#121113]">You receive</dt>
                        <dd className="font-bold tabular-nums text-[#D6480F]">
                          {formatMoneyAsUSD(feeQuote.netAmount, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3 pt-0.5">
                        <dt className="text-[#9B968D]">Estimated processing</dt>
                        <dd className="text-right text-[12px] text-[#726D64]">
                          {withdrawalProcessingEstimate(method)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}

                <div className="sticky bottom-0 z-10 -mx-4 border-t border-black/[0.06] bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {step === "review" ? (
                      <WalletButton
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto"
                        onClick={() => setStep("form")}
                        disabled={submitting}
                      >
                        Edit
                      </WalletButton>
                    ) : null}
                    <WalletButton
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={submitting}
                      className="w-full flex-1"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      {step === "review" ? "Request withdrawal" : "Continue to review"}
                    </WalletButton>
                  </div>
                  <p className="mt-2 text-center text-[11px] text-[#9B968D]">
                    Status stays Pending until your payout is completed. Processing time varies by
                    method.
                  </p>
                </div>
              </form>
            )}
          </WalletCard>

          <div className="hidden space-y-4 lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
              Recent activity
            </p>
            {status === "loading" && <WalletLoading label="Loading…" />}
            {status === "ready" && (data?.withdrawals ?? []).length === 0 && (
              <WalletEmptyState
                title="No withdrawals yet"
                description="Completed and pending payouts show here."
              />
            )}
            {status === "ready" &&
              (data?.withdrawals ?? []).slice(0, 6).map((w) => {
                const face = displayStatus(w.status);
                return (
                  <WalletCard key={w.id} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#121113]">
                        {w.methodLabel ?? walletWithdrawalMethodLabel(w.method || w.payoutMethod)}
                      </p>
                      <p className="truncate text-[11px] text-[#9B968D]">
                        {w.destinationDisplay || "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <WalletPill tone={statusTone(w.status === "paid" ? "paid" : face.key)}>
                        {face.label}
                      </WalletPill>
                      <span className="text-[13px] font-semibold tabular-nums">
                        {formatMoneyAsUSD(w.amount, w.currency || currency)}
                      </span>
                    </div>
                  </WalletCard>
                );
              })}
            <p className="text-[11.5px] text-[#9B968D]">
              Manage saved destinations in{" "}
              <Link
                href="/wallet/payout-methods"
                className="font-semibold text-[#D6480F] underline underline-offset-2"
              >
                payout methods
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
