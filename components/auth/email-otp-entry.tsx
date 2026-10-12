"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { resendSignUpConfirmation, verifySignUpOtp } from "@/lib/auth/actions";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import {
  OTP_RESEND_COOLDOWN_MS,
  SIGNUP_OTP_STORAGE_KEY,
  formatOtpCountdown,
  normalizeOtpToken,
  otpRemainingMs,
} from "@/lib/auth/email-otp";

type StoredOtp = { email: string; issuedAt: number; next?: string };

export function readStoredSignupOtp(): StoredOtp | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SIGNUP_OTP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredOtp;
    if (!parsed?.email || !Number.isFinite(parsed.issuedAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeSignupOtp(value: StoredOtp) {
  window.sessionStorage.setItem(SIGNUP_OTP_STORAGE_KEY, JSON.stringify(value));
}

export function EmailOtpEntry({
  email,
  next = "",
  issuedAt,
  loginHref,
}: {
  email: string;
  next?: string;
  issuedAt: number;
  loginHref: string;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(issuedAt + OTP_RESEND_COOLDOWN_MS);
  const [startedAt, setStartedAt] = useState(issuedAt);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const submitting = useRef(false);
  const resending = useRef(false);
  const [captchaReset, setCaptchaReset] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = otpRemainingMs(startedAt, now);
  const expired = remaining <= 0;
  const coolingDown = now < cooldownUntil;
  const code = digits.join("");

  function writeDigits(nextDigits: string[], focusIndex: number) {
    setDigits(nextDigits);
    window.requestAnimationFrame(() => inputs.current[focusIndex]?.focus());
  }

  function onDigitChange(index: number, value: string) {
    const cleaned = normalizeOtpToken(value);
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }
    const nextDigits = [...digits];
    const chars = cleaned.slice(0, 6 - index).split("");
    chars.forEach((char, offset) => {
      nextDigits[index + offset] = char;
    });
    writeDigits(nextDigits, Math.min(index + chars.length, 5));
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const nextDigits = [...digits];
      nextDigits[index - 1] = "";
      writeDigits(nextDigits, index - 1);
    }
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus();
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = normalizeOtpToken(event.clipboardData.getData("text"));
    if (pasted.length < 2) return;
    event.preventDefault();
    const nextDigits = Array(6).fill("");
    pasted.split("").forEach((char, index) => {
      nextDigits[index] = char;
    });
    writeDigits(nextDigits, Math.min(pasted.length, 5));
  }

  function submitCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (submitting.current || pending) return;
    setError(null);
    setNotice(null);
    if (expired) {
      setError("This code has expired. Request a new one.");
      return;
    }
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    submitting.current = true;
    const fd = new FormData();
    fd.set("email", email);
    fd.set("token", code);
    if (next) fd.set("next", next);
    startTransition(async () => {
      try {
        const res = await verifySignUpOtp(fd);
        if (res?.error) setError(res.error);
        if (res?.success) {
          window.sessionStorage.removeItem(SIGNUP_OTP_STORAGE_KEY);
          setNotice(res.success);
        }
      } catch (err) {
        if (isNextRedirectError(err)) throw err;
        setError("We couldn't reach the verification service. Try again.");
      } finally {
        submitting.current = false;
      }
    });
  }

  return (
    <div className="w-full">
      <header className="mb-8 space-y-2 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF5A1F]">Email verification</p>
        <h1 className="text-[1.75rem] font-black tracking-tight text-zinc-900 dark:text-white">Confirm your email</h1>
        <p className="text-[14px] leading-relaxed text-zinc-500">
          Enter the 6-digit code we sent to your email to activate your Jimvio account.
        </p>
        <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">{email}</p>
      </header>

      <form className="space-y-5" onSubmit={submitCode}>
        <fieldset>
          <legend className="sr-only">6-digit confirmation code</legend>
          <div className="flex justify-between gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputs.current[index] = node;
                }}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1}`}
                maxLength={index === 0 ? 6 : 1}
                value={digit}
                disabled={pending}
                onChange={(event) => onDigitChange(index, event.target.value)}
                onKeyDown={(event) => onKeyDown(index, event)}
                onPaste={onPaste}
                className="h-14 w-full rounded-xl border border-zinc-200 bg-white text-center text-[1.35rem] font-black tracking-tight text-zinc-900 outline-none transition focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/30 disabled:opacity-60 dark:border-border dark:bg-surface dark:text-white"
              />
            ))}
          </div>
        </fieldset>

        <p className="text-center text-[13px] font-medium text-zinc-500" role="status">
          {expired ? "This code has expired." : `Code expires in ${formatOtpCountdown(remaining)}`}
        </p>

        {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
        {notice ? <AuthAlert tone="success">{notice}</AuthAlert> : null}

        <Button type="submit" className="h-12 w-full rounded-lg" disabled={pending || expired || code.length !== 6}>
          {pending ? "Verifying…" : "Verify email"}
        </Button>
      </form>

      <div className="mt-5 space-y-3">
        <TurnstileWidget onToken={setCaptcha} resetSignal={captchaReset} className="flex justify-center" />
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-lg"
          disabled={pending || coolingDown || !captcha}
          onClick={() => {
            if (coolingDown || !captcha || pending || resending.current) return;
            resending.current = true;
            setError(null);
            setNotice(null);
            const fd = new FormData();
            fd.set("email", email);
            fd.set("captchaToken", captcha);
            if (next) fd.set("next", next);
            startTransition(async () => {
              try {
                const res = await resendSignUpConfirmation(fd);
                if (res.error) {
                  setError(res.error);
                  setCooldownUntil(Date.now() + OTP_RESEND_COOLDOWN_MS);
                  setCaptcha(null);
                  setCaptchaReset((value) => value + 1);
                  return;
                }
                const issued = Date.now();
                setStartedAt(issued);
                setCooldownUntil(issued + OTP_RESEND_COOLDOWN_MS);
                storeSignupOtp({ email, issuedAt: issued, next });
                setDigits(Array(6).fill(""));
                setNotice(res.success ?? "If that email can receive mail, a new 6-digit code is on the way. It replaces the previous code.");
                setCaptcha(null);
                setCaptchaReset((value) => value + 1);
              } catch {
                setError("We couldn't reach the verification service. Try again.");
              } finally {
                resending.current = false;
              }
            });
          }}
        >
          {coolingDown ? "Please wait before resending" : "Resend code"}
        </Button>
        <p className="text-center text-[12px] leading-relaxed text-zinc-500">
          The email also includes a confirmation link if you prefer that.
        </p>
        <Link href={loginHref} className="block text-center text-[13px] font-semibold text-zinc-600 hover:text-[#FF5A1F]">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
