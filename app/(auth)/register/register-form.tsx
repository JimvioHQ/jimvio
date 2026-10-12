"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/auth/actions";
import { EmailOtpEntry, readStoredSignupOtp, storeSignupOtp } from "@/components/auth/email-otp-entry";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import { GoogleAuthButton } from "@/components/auth/google-button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthAlert } from "@/components/auth/auth-alert";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import {
  PASSWORD_MIN_LENGTH,
  validateNewPassword,
} from "@/lib/auth/password-rules";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";

export function RegisterForm({
  storefront,
  defaultNext,
}: {
  /** Merchant storefront branding — hides platform “Jimvio” marketing copy. */
  storefront?: {
    storeName: string;
    loginHref?: string;
    hideHeader?: boolean;
  };
  /** Used when the URL has no next/redirect (e.g. merchant /register → /account). */
  defaultNext?: string;
} = {}) {
  const searchParams = useSearchParams();
  const next =
    searchParams.get("next") ??
    searchParams.get("redirect") ??
    defaultNext ??
    "";

  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [issuedAt, setIssuedAt] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const stored = readStoredSignupOtp();
    if (!stored) return;
    setSubmittedEmail(stored.email);
    setIssuedAt(stored.issuedAt);
    setSuccess("pending");
  }, []);

  function bumpCaptcha() {
    setCaptchaToken(null);
    setCaptchaReset((n) => n + 1);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!captchaToken) {
      setError("Please complete the security check.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const pw = String(fd.get("password") ?? "");
    const passwordError = validateNewPassword(pw, email);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (next) fd.set("next", next);
    fd.set("captchaToken", captchaToken);
    startTransition(async () => {
      try {
        const res = await signUp(fd);
        if (res?.error) {
          setError(res.error);
          bumpCaptcha();
        }
        if (res?.success) {
          const issued = Date.now();
          setSubmittedEmail(email);
          setIssuedAt(issued);
          storeSignupOtp({ email, issuedAt: issued, next });
          setSuccess(res.success);
        }
      } catch (err: unknown) {
        if (isNextRedirectError(err)) throw err;
        setError("Something went wrong. Please try again.");
        bumpCaptcha();
      }
    });
  }

  const loginBase = storefront?.loginHref || "/login";
  const loginHref = next
    ? `${loginBase}${loginBase.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}`
    : loginBase;

  if (success && submittedEmail.includes("@") && issuedAt > 0) {
    return (
      <EmailOtpEntry
        email={submittedEmail}
        next={next}
        issuedAt={issuedAt}
        loginHref={loginHref}
      />
    );
  }

  const isMerchantStorefront = Boolean(storefront);
  const subtitle = storefront
    ? "Create an account to checkout faster and manage your orders."
    : "Join Jimvio — free to start";

  return (
    <div className="w-full">
      {storefront?.hideHeader ? null : (
        <header className="mb-8 space-y-2">
          <h1 className="text-[1.75rem] font-black tracking-tight text-zinc-900 dark:text-white sm:text-[2rem]">
            Create an account
          </h1>
          <p className="text-[14px] leading-relaxed text-zinc-500">
            {subtitle}
          </p>
        </header>
      )}

      <div className="space-y-5">
        {!isMerchantStorefront ? (
          <>
            <GoogleAuthButton next={next || undefined} disabled={pending} />
            <AuthDivider label="or sign up with email" />
          </>
        ) : null}

        <form method="post" action="/register" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <AuthAlert tone="error">{error}</AuthAlert>}

          <Field label="Full name" required icon={<User className="h-4 w-4" />}>
            <FieldInput
              id="full_name"
              name="full_name"
              placeholder="Jane Doe"
              required
              autoComplete="name"
              disabled={pending}
            />
          </Field>

          <Field label="Email" required icon={<Mail className="h-4 w-4" />}>
            <FieldInput
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              inputMode="email"
              disabled={pending}
            />
          </Field>

          <div className="relative">
            <Field label="Password" required icon={<Lock className="h-4 w-4" />}>
              <FieldInput
                id="register-password"
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="Create a strong password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                disabled={pending}
                className="pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 text-zinc-400 transition-colors hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:text-zinc-300"
                aria-label={showPw ? "Hide password" : "Show password"}
                aria-pressed={showPw}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>
            <PasswordRequirements password={password} />
          </div>

          <TurnstileWidget
            onToken={setCaptchaToken}
            resetSignal={captchaReset}
            className="flex justify-center pt-1"
          />

          <Button
            type="submit"
            className="mt-1 h-12 w-full rounded-lg bg-zinc-900 text-[14px] font-bold text-white shadow-none transition-colors hover:bg-zinc-800 disabled:opacity-60"
            disabled={pending || !captchaToken}
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Creating account…
              </span>
            ) : (
              "Create account"
            )}
          </Button>

          <p className="pt-1 text-center text-[12px] leading-relaxed text-zinc-500">
            By creating an account, you agree to our{" "}
            <Link
              href="/terms"
              className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-orange-600 dark:text-zinc-300"
            >
              Terms
            </Link>{" "}
            &{" "}
            <Link
              href="/privacy"
              className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-orange-600 dark:text-zinc-300"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      </div>

      <p className="mt-8 text-center text-[13px] font-medium text-zinc-600">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="font-bold text-orange-600 transition-colors hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 rounded-sm"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
