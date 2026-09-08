"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BadgeCheck, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  IdentityButton,
  IdentityCard,
} from "@/components/identity/identity-ui";
import { VerifiedBadge } from "@/components/identity/VerifiedBadge";

type CustomerStatus = {
  key: string;
  label: string;
};

type StatusPayload = {
  configured: boolean;
  verified: boolean;
  status: string;
  customer: CustomerStatus;
  sessionId: string | null;
};

export function IdentityVerificationClient({
  initialVerified,
}: {
  initialVerified: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [data, setData] = useState<StatusPayload | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/identity/verification/session", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load verification status");
      setData(json as StatusPayload);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load verification");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function startVerification() {
    setStarting(true);
    try {
      const res = await fetch("/api/identity/verification/session", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not start verification");
      if (!json.verificationUrl) throw new Error("Missing verification URL");
      window.location.href = json.verificationUrl as string;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start verification");
      setStarting(false);
    }
  }

  const verified = Boolean(data?.verified ?? initialVerified);
  const key = verified ? "verified" : data?.customer?.key || "not_started";
  const label = verified
    ? "Identity verified"
    : data?.customer?.label || "Verify your identity";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
          Jimvio Identity
        </p>
        <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
          Verification
        </h1>
        <p className="mt-1 text-[13.5px] text-[#8B8579]">
          Secure identity verification helps protect your account and unlock eligible Jimvio
          features.
        </p>
      </div>

      <IdentityCard className="p-6 sm:p-8">
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#8B8579]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading verification status…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF1EA] text-[#D6480F]">
                {key === "verified" ? (
                  <BadgeCheck className="h-5 w-5" />
                ) : key === "failed" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[17px] font-semibold text-[#161512]">{label}</p>
                  <VerifiedBadge verified={verified} />
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#8B8579]">
                  {key === "verified"
                    ? "Your identity has been confirmed. The verified badge can appear on your public profile."
                    : key === "in_progress" || key === "in_review"
                      ? "We’re processing your verification. This page updates when the provider confirms a result."
                      : key === "failed" || key === "expired"
                        ? "You can try again. Jimvio only shows Verified after the provider confirms success."
                        : "Verification helps protect your account and unlock eligible Jimvio features."}
                </p>
              </div>
            </div>

            {data && !data.configured ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-950">
                Verification provider credentials are not configured in this environment yet.
                Contact support if you need access.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {!verified && data?.configured !== false ? (
                <IdentityButton onClick={startVerification} loading={starting}>
                  {key === "failed" || key === "expired" ? "Retry verification" : "Start verification"}
                </IdentityButton>
              ) : null}
              <Link
                href="/identity/edit"
                className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-[13px] font-semibold text-[#1C1B19]"
              >
                Back to profile
              </Link>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex h-10 items-center rounded-full px-3 text-[12.5px] font-semibold text-[#D6480F]"
              >
                Refresh status
              </button>
            </div>
          </div>
        )}
      </IdentityCard>
    </div>
  );
}
