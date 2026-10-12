"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/auth/actions";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { AuthAlert } from "@/components/auth/auth-alert";
import { RecoveryOtpEntry, readStoredRecoveryOtp, storeRecoveryOtp } from "@/components/auth/recovery-otp-entry";

export function ForgotPasswordForm({
  storefront,
}: {
  storefront?: {
    storeName: string;
    loginHref?: string;
    hideHeader?: boolean;
  };
} = {}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [issuedAt, setIssuedAt] = useState<number | null>(null);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [isPending, startTransition] = useTransition();
  const loginHref = storefront?.loginHref || "/login";

  useEffect(() => {
    const stored = readStoredRecoveryOtp();
    if (!stored) return;
    setPendingEmail(stored.email);
    setIssuedAt(stored.issuedAt);
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!captchaToken) {
      setError("Please complete the security check.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "").trim();
    formData.set("captchaToken", captchaToken);
    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result?.error) {
        setError(result.error);
        setCaptchaToken(null);
        setCaptchaReset((n) => n + 1);
        return;
      }
      if (result?.success && email) {
        const issued = Date.now();
        storeRecoveryOtp({ email, issuedAt: issued });
        setPendingEmail(email);
        setIssuedAt(issued);
        setSentNotice(result.success);
      }
    });
  }

  if (pendingEmail && issuedAt) {
    return (
      <RecoveryOtpEntry
        email={pendingEmail}
        issuedAt={issuedAt}
        loginHref={loginHref}
        notice={sentNotice}
      />
    );
  }

  return (
    <div className="w-full">
      {storefront?.hideHeader ? null : (
        <header className="mb-8 space-y-2">
          <h1 className="text-[1.75rem] font-black tracking-tight text-zinc-900 dark:text-white sm:text-[2rem]">
            Forgot password?
          </h1>
          <p className="text-[14px] leading-relaxed text-zinc-500">
            Enter your email and we&apos;ll send a 6-digit reset code if an account exists.
          </p>
        </header>
      )}

      <form
        method="post"
        action="/forgot-password"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        <Field label="Email" required icon={<Mail className="h-4 w-4" />}>
          <FieldInput
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
            disabled={isPending}
          />
        </Field>
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <TurnstileWidget
          onToken={setCaptchaToken}
          resetSignal={captchaReset}
          className="flex justify-center"
        />
        <Button
          type="submit"
          className="h-12 w-full rounded-lg bg-zinc-900 text-[14px] font-bold text-white shadow-none hover:bg-zinc-800 disabled:opacity-60"
          disabled={isPending || !captchaToken}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </span>
          ) : (
            "Send reset email"
          )}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <Link
          href={loginHref}
          className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-zinc-500 transition-colors hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 rounded-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
