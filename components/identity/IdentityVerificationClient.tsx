"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Loader2, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  IdentityButton,
  IdentityCard,
} from "@/components/identity/identity-ui";
import { VerifiedBadge } from "@/components/identity/VerifiedBadge";

type CustomerStatus = {
  key: string;
  label: string;
  headline?: string;
  detail?: string;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [data, setData] = useState<StatusPayload | null>(null);

  const refresh = useCallback(async (opts?: { sessionId?: string | null }) => {
    try {
      const qs = new URLSearchParams();
      if (opts?.sessionId) qs.set("sessionId", opts.sessionId);
      const url = qs.size
        ? `/api/identity/verification/session?${qs.toString()}`
        : "/api/identity/verification/session";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load verification status");
      setData(json as StatusPayload);
      return json as StatusPayload;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load verification");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hintSession =
      searchParams.get("verificationSessionId") ||
      searchParams.get("sessionId") ||
      searchParams.get("session_id");
    // Never trust ?status= from the URL — server retrieves Didit result.
    void (async () => {
      await refresh({ sessionId: hintSession });
      if (searchParams.get("return") || hintSession || searchParams.get("status")) {
        router.replace("/identity/verification", { scroll: false });
      }
    })();
  }, [refresh, router, searchParams]);

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
  const headline = verified
    ? "Verification successful"
    : data?.customer?.headline || data?.customer?.label || "Verify your identity";
  const detail = verified
    ? "Your identity has been verified."
    : data?.customer?.detail ||
      "Secure identity verification helps protect your account and unlock eligible Jimvio features.";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
          Jimvio Identity
        </p>
        <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
          Verification
        </h1>
      </div>

      <IdentityCard className="p-6 sm:p-8">
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#8B8579]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading verification status…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <span
                className={`grid h-11 w-11 place-items-center rounded-2xl ${
                  key === "verified"
                    ? "bg-emerald-50 text-emerald-700"
                    : key === "failed"
                      ? "bg-red-50 text-red-600"
                      : "bg-[#FFF1EA] text-[#D6480F]"
                }`}
              >
                {key === "verified" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : key === "failed" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : key === "in_review" || key === "in_progress" ? (
                  <Loader2 className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[17px] font-semibold text-[#161512]">{headline}</p>
                  <VerifiedBadge verified={verified} />
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#8B8579]">{detail}</p>
                {verified ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </p>
                ) : null}
              </div>
            </div>

            {data && !data.configured ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-950">
                Verification provider credentials are not configured in this environment yet.
                Contact support if you need access.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {key === "verified" ? (
                <Link
                  href="/identity/edit"
                  className="inline-flex h-10 items-center rounded-full bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white"
                >
                  Back to profile
                </Link>
              ) : null}

              {!verified && (key === "failed" || key === "expired" || key === "not_started") && data?.configured !== false ? (
                <IdentityButton onClick={startVerification} loading={starting}>
                  {key === "failed" || key === "expired" ? "Try again" : "Start verification"}
                </IdentityButton>
              ) : null}

              {!verified && (key === "in_review" || key === "in_progress") ? (
                <IdentityButton
                  onClick={() => void refresh({ sessionId: data?.sessionId })}
                  loading={loading}
                >
                  Refresh status
                </IdentityButton>
              ) : null}

              {key !== "verified" ? (
                <Link
                  href="/identity/edit"
                  className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-[13px] font-semibold text-[#1C1B19]"
                >
                  Back to profile
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </IdentityCard>
    </div>
  );
}
