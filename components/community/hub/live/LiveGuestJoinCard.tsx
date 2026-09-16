"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { JimvioLogo } from "@/components/ui/logo";
import { GoogleAuthButton } from "@/components/auth/google-button";
import { signInWithMagicLink } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import type { LiveGuestPreview } from "@/lib/live/guest-join";
import { buildLiveSessionPath } from "@/lib/live/guest-join";
import { FOCUS_RING } from "./studio-ui";

type Step = "choose" | "check_email";

function guestErrorMessage(code: string | null): string | null {
  switch (code) {
    case "expired":
      return "That email link expired. Request a new one below.";
    case "google":
      return "Google sign-in didn’t complete. You can try again or continue with email.";
    case "auth":
      return "Sign-in didn’t complete. Try Google or email again.";
    default:
      return null;
  }
}

export function LiveGuestJoinCard({
  sessionId,
  preview,
  initialError,
  loadingPreview,
}: {
  sessionId: string;
  preview: LiveGuestPreview | null;
  initialError?: string | null;
  loadingPreview?: boolean;
}) {
  const returnPath = buildLiveSessionPath(sessionId);
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const displayError = error ?? guestErrorMessage(initialError ?? null);

  useEffect(() => {
    if (cooldown <= 0) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === "choose") {
      const t = window.setTimeout(() => emailRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
  }, [step]);

  const title = preview?.title?.trim() || "Live room";
  const hostLine = preview?.hostName ? `Hosted by ${preview.hostName}` : null;
  const restricted = preview && !preview.canGuestJoin;
  const restrictedMessage =
    preview?.message ||
    "This Live isn’t open for guest join right now.";

  const sendMagicLink = (opts?: { resend?: boolean }) => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
    if (cooldown > 0 && opts?.resend) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", trimmed);
      fd.set("next", returnPath);
      const result = await signInWithMagicLink(fd);
      if (result.error) {
        setError(result.error);
        if (result.cooldownSeconds) setCooldown(result.cooldownSeconds);
        return;
      }
      setInfo(result.success ?? "Check your email for a secure link.");
      setStep("check_email");
      if (result.cooldownSeconds) setCooldown(result.cooldownSeconds);
    });
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-end justify-center bg-[#0B0B0C] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 sm:items-center sm:pb-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,90,31,0.18),_transparent_55%),linear-gradient(180deg,#141416_0%,#0B0B0C_60%)]"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-guest-join-title"
        className={cn(
          "relative z-10 w-full max-w-[420px] rounded-[24px] border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200"
        )}
      >
        <div className="flex flex-col items-center text-center">
          <JimvioLogo variant="full" size="sm" href="/" className="!text-[#111827]" />
          {loadingPreview ? (
            <p className="mt-6 text-[13px] text-neutral-500">Loading Live…</p>
          ) : (
            <>
              <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#FF5A1F]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#FF5A1F]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F]" aria-hidden />
                Live
              </p>
              <h1
                id="live-guest-join-title"
                className="mt-3 text-[22px] font-bold tracking-[-0.03em] text-[#111827] sm:text-[24px]"
              >
                {restricted ? "This Live is restricted" : "Join this Live"}
              </h1>
              <p className="mt-1.5 line-clamp-2 text-[14px] font-medium text-neutral-800">
                {title}
              </p>
              {hostLine ? (
                <p className="mt-1 text-[12px] text-neutral-500">{hostLine}</p>
              ) : null}
              <p className="mt-3 max-w-[32ch] text-[13px] leading-relaxed text-neutral-500">
                {restricted
                  ? restrictedMessage
                  : "Continue with Google or verify your email to enter."}
              </p>
            </>
          )}
        </div>

        {displayError ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-[12px] leading-relaxed text-red-700"
          >
            {displayError}
          </div>
        ) : null}
        {info && step === "check_email" ? (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-[12px] leading-relaxed text-emerald-800"
          >
            {info}
          </div>
        ) : null}

        {step === "check_email" ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-neutral-50 px-4 py-3 text-left">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#FF5A1F]" aria-hidden />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-neutral-900">Check your email</p>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                  We sent a secure link to{" "}
                  <span className="font-medium text-neutral-800">{email}</span>. Open it on
                  this device to join the Live.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={pending || cooldown > 0}
              onClick={() => sendMagicLink({ resend: true })}
              className={cn(
                "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111827] text-[13px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-60",
                FOCUS_RING
              )}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("choose");
                setInfo(null);
                setError(null);
              }}
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-full text-[13px] font-medium text-neutral-600 hover:bg-neutral-50",
                FOCUS_RING
              )}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <GoogleAuthButton
              next={returnPath}
              errorReturn={returnPath}
              disabled={loadingPreview}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-60"
            />

            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-neutral-200" />
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400">
                or
              </span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                sendMagicLink();
              }}
            >
              <label className="block text-left">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
                  Email
                </span>
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={pending || loadingPreview}
                  className={cn(
                    "h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#FF5A1F]/50 focus:ring-2 focus:ring-[#FF5A1F]/20 disabled:opacity-60",
                    FOCUS_RING
                  )}
                />
              </label>
              <button
                type="submit"
                disabled={pending || loadingPreview || !email.trim()}
                className={cn(
                  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF5A1F] text-[14px] font-semibold text-white hover:bg-[#e54e1a] disabled:opacity-60",
                  FOCUS_RING
                )}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Continue with Email
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-neutral-400">
          By continuing you agree to Jimvio’s terms.{" "}
          <Link href="/" className="font-medium text-neutral-600 underline-offset-2 hover:underline">
            Back to Jimvio
          </Link>
        </p>
      </div>
    </div>
  );
}
