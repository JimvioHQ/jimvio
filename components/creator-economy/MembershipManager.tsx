"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  CreditCard,
  Loader2,
  RefreshCw,
  Shield,
  Users,
  XCircle,
} from "lucide-react";

type Tier = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  plan_type: string;
  price: number;
  currency: string;
  trial_days: number;
  features: string[] | unknown;
  is_default: boolean;
};

type Member = {
  id: string;
  role: string;
  plan_type: string | null;
  status: string;
  expires_at: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  profiles: {
    id: string;
    full_name: string | null;
    username: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

type BillingRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_provider: string | null;
  created_at: string;
  creator_earnings?: number;
};

function money(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function MembershipManager({ slug }: { slug: string }) {
  const [tab, setTab] = useState<"tiers" | "members" | "billing">("tiers");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [billing, setBilling] = useState<BillingRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "tiers") {
        const res = await fetch(`/api/creator/memberships/${slug}?view=tiers`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setTiers(data.tiers ?? []);
      } else if (tab === "members") {
        const res = await fetch(`/api/creator/memberships/${slug}?view=members`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setMembers(data.members ?? []);
      } else {
        const res = await fetch(
          `/api/creator/memberships/${slug}?view=billing&as=owner`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setBilling(data.history ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [slug, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function ensureTiers() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/creator/memberships/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ensure_tiers" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTiers(data.tiers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Memberships
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Free & paid plans, trials, member management, and billing history.
          </p>
        </div>
        <Link
          href={`/communities/${slug}/subscribe`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)]"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Public subscribe page
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {(
          [
            { id: "tiers" as const, label: "Tiers", icon: Shield },
            { id: "members" as const, label: "Members", icon: Users },
            { id: "billing" as const, label: "Billing", icon: CreditCard },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:flex-none ${
              tab === t.id
                ? "bg-[#fd5000] text-white"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : tab === "tiers" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void ensureTiers()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#fd5000] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Seed default tiers
            </button>
          </div>
          {tiers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
              No tiers yet. Seed defaults from community pricing, or create paid plans on community settings.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tiers.map((tier) => {
                const features = Array.isArray(tier.features)
                  ? (tier.features as string[])
                  : [];
                return (
                  <div
                    key={tier.id}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-[var(--color-text-primary)]">{tier.name}</h3>
                      {tier.is_default && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-2xl font-black text-[#fd5000]">
                      {tier.plan_type === "free"
                        ? "Free"
                        : money(Number(tier.price), tier.currency)}
                      {tier.plan_type === "monthly" && (
                        <span className="text-sm font-medium text-[var(--color-text-muted)]">/mo</span>
                      )}
                      {tier.plan_type === "yearly" && (
                        <span className="text-sm font-medium text-[var(--color-text-muted)]">/yr</span>
                      )}
                    </p>
                    {tier.trial_days > 0 && (
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {tier.trial_days}-day trial
                      </p>
                    )}
                    <ul className="mt-3 space-y-1.5">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-[var(--color-text-secondary)]">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : tab === "members" ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="divide-y divide-[var(--color-border)]">
            {members.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--color-text-muted)]">No members yet.</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {m.profiles?.full_name || m.profiles?.username || "Member"}
                    </p>
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      {m.profiles?.email || m.profiles?.username || m.role}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {m.plan_type || "free"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      m.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {m.status}
                  </span>
                  {m.cancel_at_period_end && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                      <XCircle className="h-3 w-3" /> Cancels at period end
                    </span>
                  )}
                  {m.trial_ends_at && (
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      Trial ends {new Date(m.trial_ends_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="divide-y divide-[var(--color-border)]">
            {billing.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--color-text-muted)]">
                No billing history yet.
              </p>
            ) : (
              billing.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {money(Number(row.amount), row.currency)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(row.created_at).toLocaleString()} · {row.payment_provider || "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                    {row.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
