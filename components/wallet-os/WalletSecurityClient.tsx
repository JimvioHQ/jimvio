"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, KeyRound, Laptop, ShieldCheck, Smartphone, History as HistoryIcon } from "lucide-react";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletPill,
  WalletSectionHeading,
  useWalletFetch,
} from "./wallet-ui";

interface TrustedDevice {
  id: string;
  name: string;
  location?: string;
  lastActiveAt: string;
  current?: boolean;
}

interface SecurityActivity {
  id: string;
  action: string;
  ip?: string;
  createdAt: string;
}

interface WalletSecurityResponse {
  pinSet?: boolean;
  twoFactorEnabled?: boolean;
  trustedDevices?: TrustedDevice[];
  activity?: SecurityActivity[];
}

export function WalletSecurityClient() {
  const { status, data, error, retry } = useWalletFetch<WalletSecurityResponse>("/api/wallet/os/security");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PINs don't match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/os/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_pin", pin }),
      });
      if (!res.ok) throw new Error("Couldn't update PIN");
      toast.success("Wallet PIN updated");
      setPin("");
      setConfirmPin("");
      retry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update PIN");
    } finally {
      setSubmitting(false);
    }
  }

  const trustedDevices = data?.trustedDevices ?? [];
  const activity = data?.activity ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet OS"
        title="Security"
        description="Protect your wallet with a PIN, two-factor authentication, and device oversight."
        className="mb-6"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WalletCard className="p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#FFF1EA] text-[#D6480F]">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-[#121113]">Wallet PIN</p>
              <p className="text-[11.5px] text-[#9B968D]">
                {data?.pinSet ? "PIN is set — enter a new one to change it." : "Set a PIN to confirm withdrawals."}
              </p>
            </div>
          </div>
          <form onSubmit={handleSetPin} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="New PIN"
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 text-[14px] tracking-widest text-[#121113] outline-none focus:border-[#FF5A1F]/50"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Confirm PIN"
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 text-[14px] tracking-widest text-[#121113] outline-none focus:border-[#FF5A1F]/50"
            />
            <WalletButton type="submit" variant="primary" size="md" loading={submitting} className="w-full">
              {data?.pinSet ? "Update PIN" : "Set PIN"}
            </WalletButton>
          </form>
        </WalletCard>

        <WalletCard className="flex flex-col p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#EAF7EE] text-[#1C8A44]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-[#121113]">Two-factor authentication</p>
              <p className="text-[11.5px] text-[#9B968D]">
                {data?.twoFactorEnabled ? "Enabled on your account" : "Not enabled yet"}
              </p>
            </div>
          </div>
          <p className="flex-1 text-[12.5px] leading-relaxed text-[#726D64]">
            Two-factor authentication is managed at the account level and protects every login, including your wallet.
          </p>
          <Link href="/dashboard/security" className="mt-4">
            <WalletButton variant="outline" size="md" className="w-full">
              Manage 2FA in account security
              <ArrowUpRight className="h-4 w-4" />
            </WalletButton>
          </Link>
        </WalletCard>
      </div>

      {status === "loading" && <WalletLoading label="Loading security data…" />}
      {status === "error" && (
        <div className="mt-4">
          <WalletErrorState message={error || "Trusted devices and activity aren't available yet."} onRetry={retry} />
        </div>
      )}

      {(status === "ready" || status === "empty") && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Trusted devices</p>
            {trustedDevices.length === 0 ? (
              <WalletEmptyState icon={<Laptop className="h-5 w-5" />} title="No devices on record" />
            ) : (
              <div className="space-y-2">
                {trustedDevices.map((d) => (
                  <WalletCard key={d.id} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-[#726D64]">
                        {d.name.toLowerCase().includes("mobile") || d.name.toLowerCase().includes("phone") ? (
                          <Smartphone className="h-4 w-4" />
                        ) : (
                          <Laptop className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#121113]">{d.name}</p>
                        <p className="text-[11px] text-[#9B968D]">
                          {d.location ? `${d.location} · ` : ""}
                          {new Date(d.lastActiveAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    {d.current && <WalletPill tone="success">This device</WalletPill>}
                  </WalletCard>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">Activity log</p>
            {activity.length === 0 ? (
              <WalletEmptyState icon={<HistoryIcon className="h-5 w-5" />} title="No recent activity" />
            ) : (
              <div className="space-y-2">
                {activity.map((a) => (
                  <WalletCard key={a.id} className="flex items-center justify-between gap-3 p-3.5">
                    <p className="truncate text-[13px] text-[#121113]">{a.action}</p>
                    <p className="shrink-0 text-[11px] text-[#9B968D]">
                      {new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {a.ip ? ` · ${a.ip}` : ""}
                    </p>
                  </WalletCard>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
