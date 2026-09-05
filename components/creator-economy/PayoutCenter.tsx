"use client";

import { FormEvent, useEffect, useState } from "react";

type Data = {
  wallet: {
    available_balance: number;
    pending_balance?: number;
    currency: string;
  } | null;
  payouts: { id: string; amount: number; status: string; created_at: string; payout_method?: string }[];
  methods: { id: string; method: string; is_default?: boolean }[];
};

export function PayoutCenter() {
  const [data, setData] = useState<Data | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [account, setAccount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/creator/payouts")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Failed to load payouts");
        setData(body);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));

  useEffect(() => {
    void load();
  }, []);

  async function withdraw(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const r = await fetch("/api/creator/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw", amount: Number(amount) }),
    });
    const body = await r.json();
    if (!r.ok) {
      setError(body.error || "Withdrawal failed");
      return;
    }
    setMessage("Withdrawal requested.");
    setAmount("");
    void load();
  }

  async function saveMethod(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const r = await fetch("/api/creator/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_method",
        method,
        accountDetails: { account },
        isDefault: true,
      }),
    });
    const body = await r.json();
    if (!r.ok) {
      setError(body.error || "Unable to save method");
      return;
    }
    setMessage(
      method === "binance_id"
        ? "Binance ID saved. Withdrawals stay pending until payout is confirmed."
        : method === "crypto"
          ? "Crypto method saved. Withdrawals stay pending until payout is confirmed."
          : "Payout method saved.",
    );
    setAccount("");
    void load();
  }

  const currency = data?.wallet?.currency ?? "USD";

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Payout center</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Request withdrawals via bank transfer, mobile money, Binance ID, or crypto.
          PayPal and Flutterwave are not available for payouts (Flutterwave remains available for deposits).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs text-[var(--color-text-muted)]">Available balance</p>
          <p className="text-3xl font-bold text-[#fd5000]">
            {currency} {Number(data?.wallet?.available_balance ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs text-[var(--color-text-muted)]">Pending earnings</p>
          <p className="text-3xl font-bold text-[var(--color-text-primary)]">
            {currency} {Number(data?.wallet?.pending_balance ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      <form
        onSubmit={saveMethod}
        className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-3"
      >
        <label className="sr-only" htmlFor="payout-method">
          Payout method
        </label>
        <select
          id="payout-method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="min-h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm"
        >
          <option value="bank">Bank transfer</option>
          <option value="mobile_money">Mobile money</option>
          <option value="binance_id">Binance ID</option>
          <option value="crypto">Cryptocurrency</option>
        </select>
        <label className="sr-only" htmlFor="payout-account">
          Account details
        </label>
        <input
          id="payout-account"
          required
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder={
            method === "binance_id"
              ? "Binance ID (numbers only)"
              : method === "crypto"
                ? "Wallet address"
                : method === "mobile_money"
                  ? "Mobile money phone (+…)"
                  : "Account or wallet details"
          }
          className="min-h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm"
        />
        <button className="min-h-10 rounded-lg border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-primary)]">
          Save method
        </button>
      </form>

      {(data?.methods?.length ?? 0) > 0 && (
        <ul className="space-y-1 text-sm text-[var(--color-text-muted)]">
          {data?.methods.map((item) => (
            <li key={item.id}>
              {item.method}
              {item.is_default ? " · default" : ""}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={withdraw} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="withdraw-amount">
          Withdrawal amount
        </label>
        <input
          id="withdraw-amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Withdrawal amount"
          className="min-h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm"
        />
        <button className="min-h-10 rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white">
          Request payout
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-[var(--color-text-muted)]">{message}</p>}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {data?.payouts?.length ? (
          data.payouts.map((item) => (
            <div
              key={item.id}
              className="flex justify-between gap-3 border-b border-[var(--color-border)] p-3 text-sm last:border-0"
            >
              <span>
                {currency} {Number(item.amount).toFixed(2)}
                {item.payout_method ? ` · ${item.payout_method}` : ""}
              </span>
              <span className="capitalize text-[var(--color-text-muted)]">{item.status}</span>
            </div>
          ))
        ) : (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">No payout history.</p>
        )}
      </div>
    </section>
  );
}
