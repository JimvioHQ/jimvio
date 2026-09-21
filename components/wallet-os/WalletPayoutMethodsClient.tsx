"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Star, Trash2 } from "lucide-react";
import {
  BANK_COUNTRY_CONFIG,
  MOBILE_MONEY_BY_COUNTRY,
  CRYPTO_NETWORKS,
  payoutMethodsForCountry,
  walletWithdrawalMethodLabel,
  type WalletWithdrawalMethod,
  type WithdrawalDestinationDetails,
} from "@/lib/payments/wallet-payout-method";
import {
  banksForCountry,
  enrichMobileMoneyProvider,
  CUSTOM_INSTITUTION_ID,
  findBank,
} from "@/lib/payments/payout-provider-catalog";
import { InstitutionPicker } from "./InstitutionPicker";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletSectionHeading,
  useWalletFetch,
} from "./wallet-ui";

type MethodRow = {
  id: string;
  method: string;
  methodLabel: string;
  display: string;
  isDefault: boolean;
  isActive: boolean;
};

type ListResponse = { methods?: MethodRow[]; error?: string };

const COUNTRY_OPTIONS = Object.entries(MOBILE_MONEY_BY_COUNTRY)
  .map(([code, cfg]) => ({ code, label: cfg.label }))
  .concat(
    Object.entries(BANK_COUNTRY_CONFIG)
      .filter(([code]) => code !== "OTHER" && !MOBILE_MONEY_BY_COUNTRY[code])
      .map(([code, cfg]) => ({ code, label: cfg.label })),
  )
  .sort((a, b) => a.label.localeCompare(b.label));

export function WalletPayoutMethodsClient() {
  const { status, data, error, retry } = useWalletFetch<ListResponse>(
    "/api/wallet/os/payout-methods",
  );
  const methods = (data?.methods ?? []).filter((m) => m.isActive !== false);

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [country, setCountry] = useState("RW");
  const [method, setMethod] = useState<WalletWithdrawalMethod>("mobile_money");
  const [bankId, setBankId] = useState(banksForCountry("RW")[0]?.id ?? CUSTOM_INSTITUTION_ID);
  const [customBankName, setCustomBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [mmProvider, setMmProvider] = useState(
    MOBILE_MONEY_BY_COUNTRY.RW?.providers[0]?.id ?? "",
  );
  const [mmPhone, setMmPhone] = useState("");
  const [binanceId, setBinanceId] = useState("");
  const [confirmBinanceId, setConfirmBinanceId] = useState("");
  const [cryptoAsset, setCryptoAsset] = useState<"USDT" | "USDC">("USDT");
  const [cryptoNetwork, setCryptoNetwork] = useState("TRC20");
  const [walletAddress, setWalletAddress] = useState("");
  const [makeDefault, setMakeDefault] = useState(true);

  const availableMethods = useMemo(() => payoutMethodsForCountry(country), [country]);
  const mmCfg = MOBILE_MONEY_BY_COUNTRY[country];
  const bankList = useMemo(() => banksForCountry(country), [country]);
  const mmProviders = useMemo(() => {
    if (!mmCfg) return [];
    return mmCfg.providers.map((p) => enrichMobileMoneyProvider(p.id, p.label, country));
  }, [mmCfg, country]);

  function onCountryChange(next: string) {
    setCountry(next);
    const allowed = payoutMethodsForCountry(next);
    if (!allowed.includes(method)) setMethod(allowed[0] ?? "bank");
    setBankId(banksForCountry(next)[0]?.id ?? CUSTOM_INSTITUTION_ID);
    setMmProvider(MOBILE_MONEY_BY_COUNTRY[next]?.providers[0]?.id ?? "");
  }

  function buildDetails(): WithdrawalDestinationDetails {
    switch (method) {
      case "bank":
        return {
          method: "bank",
          country,
          bankId,
          bankName:
            bankId === CUSTOM_INSTITUTION_ID
              ? customBankName
              : findBank(country, bankId)?.name || customBankName,
          accountHolder,
          accountNumber,
          currency: (BANK_COUNTRY_CONFIG[country] ?? BANK_COUNTRY_CONFIG.OTHER).currency,
        };
      case "mobile_money":
        return {
          method: "mobile_money",
          country,
          provider: mmProvider,
          phone: mmPhone,
          accountHolder: accountHolder || undefined,
        };
      case "binance_id":
        return {
          method: "binance_id",
          binanceId,
          confirmBinanceId,
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

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/wallet/os/payout-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          details: buildDetails(),
          isDefault: makeDefault,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Could not save payout method");
      toast.success("Payout method saved");
      setAdding(false);
      retry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(id: string) {
    try {
      const res = await fetch("/api/wallet/os/payout-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_default", id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Could not set default");
      toast.success("Default updated");
      retry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not set default");
    }
  }

  async function removeMethod(id: string) {
    try {
      const res = await fetch(`/api/wallet/os/payout-methods?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Could not remove");
      toast.success("Payout method removed");
      retry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet"
        title="Payout methods"
        description="Save preferred destinations for faster withdrawals."
        action={
          <Link href="/wallet/withdrawals">
            <WalletButton variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Withdrawals
            </WalletButton>
          </Link>
        }
        className="mb-6"
      />

      <div className="mb-4 flex justify-end">
        <WalletButton
          variant="primary"
          size="md"
          type="button"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {adding ? "Close" : "Add payout method"}
        </WalletButton>
      </div>

      {adding ? (
        <WalletCard className="mb-6 space-y-4 p-5">
          <label className="block text-[12px] font-semibold text-[#6B7280]">
            Country
            <select
              value={country}
              onChange={(e) => onCountryChange(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[14px] text-[#111827]"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
              <option value="US">United States</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {availableMethods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-xl border px-3 py-2.5 text-left text-[12px] font-semibold ${
                  method === m
                    ? "border-[#FF5A1F] bg-[#FFF1EA] text-[#FF5A1F]"
                    : "border-[#E5E7EB] bg-white text-[#374151]"
                }`}
              >
                {walletWithdrawalMethodLabel(m)}
              </button>
            ))}
          </div>

          {method === "bank" ? (
            <div className="space-y-3">
              <InstitutionPicker
                id="save-bank"
                label="Bank"
                institutions={bankList}
                value={bankId}
                onChange={setBankId}
              />
              {bankId === CUSTOM_INSTITUTION_ID ? (
                <input
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  placeholder="Bank name"
                  className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-[14px]"
                />
              ) : null}
              <input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Account holder name"
                className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-[14px]"
              />
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Account number"
                className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-[14px]"
              />
            </div>
          ) : null}

          {method === "mobile_money" && mmCfg ? (
            <div className="space-y-3">
              <InstitutionPicker
                id="save-mm"
                label="Mobile Money provider"
                institutions={mmProviders}
                value={mmProvider}
                onChange={setMmProvider}
              />
              <input
                value={mmPhone}
                onChange={(e) => setMmPhone(e.target.value)}
                placeholder={`${mmCfg.dial}…`}
                className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-[14px]"
              />
            </div>
          ) : null}

          {method === "binance_id" ? (
            <div className="space-y-3">
              <input
                value={binanceId}
                onChange={(e) => setBinanceId(e.target.value)}
                placeholder="Binance ID"
                className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-[14px]"
              />
              <input
                value={confirmBinanceId}
                onChange={(e) => setConfirmBinanceId(e.target.value)}
                placeholder="Confirm Binance ID"
                className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-[14px]"
              />
            </div>
          ) : null}

          {method === "crypto" ? (
            <div className="space-y-3">
              <select
                value={cryptoAsset}
                onChange={(e) => {
                  const a = e.target.value as "USDT" | "USDC";
                  setCryptoAsset(a);
                  setCryptoNetwork(CRYPTO_NETWORKS[a]?.[0]?.id ?? "TRC20");
                }}
                className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-[14px]"
              >
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
              </select>
              <select
                value={cryptoNetwork}
                onChange={(e) => setCryptoNetwork(e.target.value)}
                className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-[14px]"
              >
                {(CRYPTO_NETWORKS[cryptoAsset] ?? []).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
              <input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Wallet address"
                className="h-11 w-full rounded-xl border border-black/[0.08] px-3 text-[14px]"
              />
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-[13px] text-[#374151]">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
            />
            Set as default
          </label>

          <WalletButton
            variant="primary"
            size="md"
            type="button"
            loading={saving}
            onClick={() => void handleSave()}
          >
            Save payout method
          </WalletButton>
        </WalletCard>
      ) : null}

      {status === "loading" && <WalletLoading label="Loading payout methods…" />}
      {status === "error" && (
        <WalletErrorState message={error || "Could not load payout methods"} onRetry={retry} />
      )}

      {(status === "ready" || status === "empty") && methods.length === 0 && !adding ? (
        <WalletEmptyState
          title="No payout methods yet"
          description="Add a bank account, Mobile Money number, Binance ID, or crypto wallet to withdraw faster."
        />
      ) : null}

      {(status === "ready" || status === "empty") && methods.length > 0 ? (
        <ul className="space-y-3">
          {methods.map((m) => (
            <li key={m.id}>
              <WalletCard className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#111827]">{m.methodLabel}</p>
                  <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">{m.display}</p>
                  {m.isDefault ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FFF1EA] px-2 py-0.5 text-[10px] font-semibold text-[#FF5A1F]">
                      <Star className="h-3 w-3" />
                      Default
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {!m.isDefault ? (
                    <button
                      type="button"
                      onClick={() => void setDefault(m.id)}
                      className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[11px] font-semibold text-[#374151] hover:bg-[#F8FAFC]"
                    >
                      Set default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void removeMethod(m.id)}
                    aria-label="Remove"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[#E5E7EB] text-[#9CA3AF] hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </WalletCard>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
