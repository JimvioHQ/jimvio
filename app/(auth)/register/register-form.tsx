"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendSignUpConfirmation, signUp } from "@/lib/auth/actions";
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

export function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? searchParams.get("redirect") ?? "";

  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [resendCaptcha, setResendCaptcha] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
          setSubmittedEmail(email);
          setSuccess(res.success);
        }
      } catch (err: unknown) {
        if (isNextRedirectError(err)) throw err;
        setError("Something went wrong. Please try again.");
        bumpCaptcha();
      }
    });
  }

  if (success) {
    return (
      <div className="w-full">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 ring-4 ring-emerald-50 dark:bg-emerald-500/10 dark:ring-emerald-500/10">
            <CheckCircle className="h-7 w-7 text-emerald-500" aria-hidden />
          </div>
          <h1 className="mb-2 text-[1.65rem] font-black tracking-tight text-zinc-900 dark:text-white">
            Check your email
          </h1>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-500">
            {success}
            {submittedEmail ? (
              <>
                {" "}
                We sent a confirmation link
                {submittedEmail.includes("@") ? (
                  <>
                    {" "}
                    to <span className="font-semibold text-zinc-700 dark:text-zinc-300">{submittedEmail}</span>
                  </>
                ) : null}
                .
              </>
            ) : null}
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-border dark:bg-surface-secondary/40">
          <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            Didn&apos;t get it? Check spam, then resend. Confirmation is required before you can sign in with email.
          </p>
          {resendNotice && <AuthAlert tone="success">{resendNotice}</AuthAlert>}
          <TurnstileWidget
            onToken={setResendCaptcha}
            className="flex justify-center"
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending || !resendCaptcha}
            className="h-11 w-full rounded-lg text-[14px] font-bold"
            onClick={() => {
              if (!resendCaptcha) return;
              const fd = new FormData();
              fd.set("email", submittedEmail);
              fd.set("captchaToken", resendCaptcha);
              startTransition(async () => {
                const res = await resendSignUpConfirmation(fd);
                setResendNotice(res.success ?? res.error ?? "If an account exists, we sent another email.");
                setResendCaptcha(null);
              });
            }}
          >
            {pending ? "Sending…" : "Resend confirmation email"}
          </Button>
        </div>

        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="mt-6 block"
        >
          <Button className="h-12 w-full rounded-lg bg-zinc-900 text-[14px] font-bold text-white shadow-none hover:bg-zinc-800">
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="w-full">
      <header className="mb-8 space-y-2">
        <h1 className="text-[1.75rem] font-black tracking-tight text-zinc-900 dark:text-white sm:text-[2rem]">
          Create an account
        </h1>
        <p className="text-[14px] leading-relaxed text-zinc-500">
          Join Jimvio — free to start
        </p>
      </header>

      <div className="space-y-5">
        <GoogleAuthButton next={next || undefined} disabled={pending} />

        <AuthDivider label="or sign up with email" />

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
            By joining, you agree to our{" "}
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
