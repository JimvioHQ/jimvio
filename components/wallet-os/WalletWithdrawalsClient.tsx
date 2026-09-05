"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Bitcoin,
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
  normalizeWalletWithdrawalMethod,
  walletWithdrawalMethodLabel,
  withdrawalProcessingEstimate,
  type CryptoAssetId,
  type WalletWithdrawalMethod,
  type WithdrawalDestinationDetails,
} from "@/lib/payments/wallet-payout-method";
import { calculateWithdrawalFee } from "@/lib/payments/withdrawal-fees";
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
  createdAt: string;
  reference?: string | null;
  providerReference?: string | null;
  payoutAccount?: string | null;
  destinationDisplay?: string | null;
}

interface WalletWithdrawalsResponse {
  currency?: string;
  availableBalance?: number;
  withdrawals?: WithdrawalRecord[];
  methods?: string[];
}

const METHODS: Array<{
  id: WalletWithdrawalMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: "bank",
    label: "Bank transfer",
    icon: Landmark,
    description: withdrawalProcessingEstimate("bank"),
  },
  {
    id: "mobile_money",
    label: "Mobile Money",
    icon: Smartphone,
    description: withdrawalProcessingEstimate("mobile_money"),
  },
  {
    id: "binance_id",
    label: "Binance ID",
    icon: Wallet,
    description: withdrawalProcessingEstimate("binance_id"),
  },
  {
    id: "crypto",
    label: "Cryptocurrency",
    icon: Bitcoin,
    description: withdrawalProcessingEstimate("crypto"),
  },
];

const STATUS_FILTERS = ["all", "pending", "processing", "paid", "failed"] as const;

const fieldClass =
  "h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 text-[14px] text-[#121113] outline-none focus:border-[#FF5A1F]/50 focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/25";

function mapUiStatus(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "paid";
  return s;
}

function Field({
  id,
  label,
  children,
  hint,
  error,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-[#726D64]">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[11px] text-[#9B968D]">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-[11px] text-red-600" role="alert" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function WalletWithdrawalsClient() {
  const { status, data, error, retry } =
    useWalletFetch<WalletWithdrawalsResponse>("/api/wallet/os/withdrawals");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<WalletWithdrawalMethod>("bank");
  const [submitting, setSubmitting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  // Bank
  const [bankCountry, setBankCountry] = useState("US");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  // Mobile money
  const [mmCountry, setMmCountry] = useState("RW");
  const [mmProvider, setMmProvider] = useState(
    MOBILE_MONEY_BY_COUNTRY.RW.providers[0]?.id ?? ""
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

  const bankCfg = BANK_COUNTRY_CONFIG[bankCountry] ?? BANK_COUNTRY_CONFIG.OTHER;
  const mmCfg = MOBILE_MONEY_BY_COUNTRY[mmCountry];
  const cryptoNetworks = CRYPTO_NETWORKS[cryptoAsset] ?? [];

  const filtered = useMemo(() => {
    const list = data?.withdrawals ?? [];
    if (statusFilter === "all") return list;
    return list.filter((w) => mapUiStatus(w.status) === statusFilter);
  }, [data?.withdrawals, statusFilter]);

  function buildDestination(): WithdrawalDestinationDetails {
    switch (method) {
      case "bank":
        return {
          method: "bank",
          country: bankCountry,
          bankName,
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
          country: mmCountry,
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

  function resetDestinationFields() {
    setConfirmStep(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmStep) {
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
      setConfirmStep(true);
      return;
    }

    const canonical = normalizeWalletWithdrawalMethod(method);
    if (!canonical) {
      toast.error("Choose a supported payout method");
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${parsedAmount}`;
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
          idempotencyKey,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || "Withdrawal request failed");
      }
      toast.success(
        body?.duplicate
          ? "Withdrawal already submitted"
          : "Withdrawal request submitted — pending confirmation",
      );
      setAmount("");
      setConfirmStep(false);
      setBankName("");
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
      retry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet"
        title="Withdrawals"
        description="Request a payout to a supported destination. Funds stay reserved until the payout is confirmed by Jimvio."
        action={
          <Link href="/creator/payouts">
            <WalletButton variant="outline" size="md">
              <Settings2 className="h-4 w-4" />
              Payout methods
            </WalletButton>
          </Link>
        }
        className="mb-6"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <WalletCard className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
            Request withdrawal
          </p>
          {typeof data?.availableBalance === "number" && (
            <p className="mt-1 text-[13px] text-[#726D64]">
              Available to withdraw:{" "}
              <span className="font-semibold text-[#121113]">
                {formatMoneyAsUSD(data.availableBalance, currency)}
              </span>
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
            <Field id="wd-amount" label="Amount (USD)">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#B9B3A6]">
                  USD
                </span>
                <input
                  id="wd-amount"
                  type="number"
                  min={1}
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setConfirmStep(false);
                  }}
                  placeholder="0.00"
                  required
                  className={cn(fieldClass, "pl-14")}
                />
              </div>
            </Field>

            <div>
              <p className="mb-1.5 text-[12px] font-medium text-[#726D64]" id="method-label">
                Payout method
              </p>
              <div
                className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
                role="radiogroup"
                aria-labelledby="method-label"
              >
                {METHODS.map((m) => {
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
                        resetDestinationFields();
                        if (m.id === "crypto") {
                          setCryptoNetwork(CRYPTO_NETWORKS.USDT[0]?.id ?? "TRC20");
                        }
                        if (m.id === "mobile_money") {
                          setMmProvider(
                            MOBILE_MONEY_BY_COUNTRY[mmCountry]?.providers[0]?.id ?? ""
                          );
                        }
                      }}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35",
                        active
                          ? "border-[#FF5A1F]/60 bg-[#FFF6F1]"
                          : "border-black/[0.08] bg-white hover:border-black/15",
                      )}
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          active ? "text-[#D6480F]" : "text-[#9B968D]",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-[#121113]">
                          {m.label}
                        </span>
                        <span className="block text-[10.5px] leading-snug text-[#9B968D]">
                          {m.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method-specific forms */}
            {method === "bank" ? (
              <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#FAFAF8] p-3.5">
                <Field id="bank-country" label="Country">
                  <select
                    id="bank-country"
                    value={bankCountry}
                    onChange={(e) => {
                      setBankCountry(e.target.value);
                      setConfirmStep(false);
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
                <Field id="bank-name" label="Bank name">
                  <input
                    id="bank-name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className={fieldClass}
                    autoComplete="organization"
                    required
                  />
                </Field>
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
                    label={bankCountry === "US" ? "Routing number" : "Routing / transit number"}
                  >
                    <input
                      id="routing"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className={fieldClass}
                      autoComplete="off"
                      required={bankCountry === "US"}
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
                  <Field id="branch" label="Branch code">
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
                      autoComplete="off"
                      required={!bankCfg.fields.includes("accountNumber") || !accountNumber}
                    />
                  </Field>
                ) : null}
                {bankCfg.fields.includes("swift") ? (
                  <Field id="swift" label="SWIFT / BIC">
                    <input
                      id="swift"
                      value={swift}
                      onChange={(e) => setSwift(e.target.value)}
                      className={fieldClass}
                      autoComplete="off"
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
                  Payout currency reference: {bankCfg.currency}. Settled from your USD wallet balance.
                </p>
              </div>
            ) : null}

            {method === "mobile_money" ? (
              <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#FAFAF8] p-3.5">
                <Field id="mm-country" label="Country">
                  <select
                    id="mm-country"
                    value={mmCountry}
                    onChange={(e) => {
                      const next = e.target.value;
                      setMmCountry(next);
                      setMmProvider(
                        MOBILE_MONEY_BY_COUNTRY[next]?.providers[0]?.id ?? ""
                      );
                      setConfirmStep(false);
                    }}
                    className={fieldClass}
                  >
                    {Object.entries(MOBILE_MONEY_BY_COUNTRY).map(([code, cfg]) => (
                      <option key={code} value={code}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="mm-provider" label="Provider">
                  <select
                    id="mm-provider"
                    value={mmProvider}
                    onChange={(e) => setMmProvider(e.target.value)}
                    className={fieldClass}
                  >
                    {(mmCfg?.providers ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="mm-phone"
                  label="Phone number"
                  hint={`Include country code (e.g. ${mmCfg?.dial ?? "+…"})`}
                >
                  <input
                    id="mm-phone"
                    type="tel"
                    value={mmPhone}
                    onChange={(e) => setMmPhone(e.target.value)}
                    className={fieldClass}
                    placeholder={`${mmCfg?.dial ?? "+"}…`}
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
              <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#FAFAF8] p-3.5">
                <p className="text-[12px] leading-relaxed text-[#726D64]">
                  Binance ID is used for payout routing. Make sure it belongs to the
                  intended recipient. Processed after admin confirmation — not an
                  automated Binance transfer.
                </p>
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
              <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#FAFAF8] p-3.5">
                <Field id="crypto-asset" label="Asset">
                  <select
                    id="crypto-asset"
                    value={cryptoAsset}
                    onChange={(e) => {
                      const next = e.target.value as CryptoAssetId;
                      setCryptoAsset(next);
                      setCryptoNetwork(CRYPTO_NETWORKS[next]?.[0]?.id ?? "");
                      setConfirmStep(false);
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
                  Only withdraw using the selected network. Using an incompatible
                  network may permanently lose funds. Crypto payouts are processed
                  after admin confirmation.
                </p>
              </div>
            ) : null}

            {/* Fee + summary */}
            <div className="rounded-xl border border-black/[0.08] bg-white p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9B968D]">
                Withdrawal summary
              </p>
              <dl className="mt-2.5 space-y-1.5 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#726D64]">Amount requested</dt>
                  <dd className="font-semibold tabular-nums text-[#121113]">
                    {formatMoneyAsUSD(feeQuote.amount || 0, currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#726D64]">{feeQuote.label}</dt>
                  <dd className="font-semibold tabular-nums text-[#121113]">
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

            {confirmStep ? (
              <div className="rounded-xl border border-[#FF5A1F]/25 bg-[#FFF6F1] p-3.5 text-[13px] text-[#121113]">
                <p className="font-semibold">Confirm withdrawal</p>
                <p className="mt-1 text-[12px] text-[#726D64]">
                  {METHODS.find((m) => m.id === method)?.label} ·{" "}
                  {formatMoneyAsUSD(feeQuote.amount, currency)} requested · you receive{" "}
                  {formatMoneyAsUSD(feeQuote.netAmount, currency)} after Jimvio fee.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              {confirmStep ? (
                <WalletButton
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => setConfirmStep(false)}
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
                {confirmStep ? "Confirm request" : "Review withdrawal"}
              </WalletButton>
            </div>
            <p className="text-center text-[11px] text-[#9B968D]">
              Status stays pending until payout is confirmed. Never marked paid early.
            </p>
          </form>
        </WalletCard>

        <div className="space-y-6">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
              Supported methods
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <WalletCard key={m.id} className="flex flex-col items-start gap-2 p-3.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/[0.04] text-[#726D64]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="text-[12px] font-semibold text-[#121113]">{m.label}</p>
                    <p className="text-[10.5px] leading-snug text-[#9B968D]">{m.description}</p>
                  </WalletCard>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px] text-[#9B968D]">
              Save a default method in{" "}
              <Link
                href="/creator/payouts"
                className="font-semibold text-[#D6480F] underline underline-offset-2"
              >
                payout settings
              </Link>
              .
            </p>
          </div>

          <div>
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
                History
              </p>
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
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {status === "loading" && <WalletLoading label="Loading withdrawal history…" />}
            {status === "error" && (
              <WalletErrorState
                message={error || "The withdrawals endpoint isn't available yet."}
                onRetry={retry}
              />
            )}
            {(status === "empty" || (status === "ready" && filtered.length === 0)) && (
              <WalletEmptyState
                title="No withdrawals yet"
                description="Your withdrawal history will appear here."
              />
            )}
            {status === "ready" && filtered.length > 0 && (
              <div className="space-y-2">
                {filtered.map((w) => {
                  const methodKey = w.method || w.payoutMethod || "";
                  const methodMeta = METHODS.find((m) => m.id === methodKey);
                  const Icon = methodMeta?.icon ?? Landmark;
                  const displayStatus = mapUiStatus(w.status);
                  return (
                    <WalletCard key={w.id} className="flex items-center justify-between gap-3 p-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-[#726D64]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#121113]">
                            {w.methodLabel ??
                              methodMeta?.label ??
                              walletWithdrawalMethodLabel(methodKey)}
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
                          {typeof w.fee === "number" && w.fee > 0 ? (
                            <p className="text-[10.5px] text-[#9B968D]">
                              Fee {formatMoneyAsUSD(w.fee, w.currency || currency)}
                              {typeof w.netAmount === "number"
                                ? ` · Net ${formatMoneyAsUSD(w.netAmount, w.currency || currency)}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <WalletPill tone={statusTone(displayStatus)}>{displayStatus}</WalletPill>
                        <span className="text-[13px] font-semibold text-[#121113]">
                          {formatMoneyAsUSD(w.amount, w.currency || currency)}
                        </span>
                      </div>
                    </WalletCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
