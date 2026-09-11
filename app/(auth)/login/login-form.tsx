"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Wrench, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/actions";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import { formatAuthQueryStatus, formatLoginQueryError } from "@/lib/auth/sign-in-errors";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import { GoogleAuthButton } from "@/components/auth/google-button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthAlert } from "@/components/auth/auth-alert";

export function LoginForm({
  maintenanceMode = false,
  turnstileEnabled = true,
}: {
  maintenanceMode?: boolean;
  /** When false, login skips Turnstile UI/gate (temporary demo flag). */
  turnstileEnabled?: boolean;
}) {
  const searchParams = useSearchParams();

  const next =
    searchParams.get("next") ??
    searchParams.get("redirect") ??
    searchParams.get("returnUrl") ??
    "";
  const urlError = searchParams.get("error");
  const urlStatus = searchParams.get("status");

  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [suppressUrlMessages, setSuppressUrlMessages] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [pending, startTransition] = useTransition();

  const displayError =
    formError ??
    (!suppressUrlMessages && urlError
      ? formatLoginQueryError(decodeURIComponent(urlError))
      : null);
  const displayNotice =
    formNotice ??
    (!suppressUrlMessages && urlStatus ? formatAuthQueryStatus(urlStatus) : null);

  function bumpCaptcha() {
    if (!turnstileEnabled) return;
    setCaptchaToken(null);
    setCaptchaReset((n) => n + 1);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuppressUrlMessages(true);
    setFormError(null);
    setFormNotice(null);
    if (turnstileEnabled && !captchaToken) {
      setFormError("Please complete the security check.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    if (next) fd.set("next", next);
    if (turnstileEnabled && captchaToken) {
      fd.set("captchaToken", captchaToken);
    }
    startTransition(async () => {
      try {
        const result = await signIn(fd);
        if (result && typeof result === "object" && "error" in result && result.error) {
          setFormError(String(result.error));
          bumpCaptcha();
        }
      } catch (err: unknown) {
        if (isNextRedirectError(err)) throw err;
        setFormError("Something went wrong. Please try again.");
        bumpCaptcha();
      }
    });
  }

  const registerHref = next
    ? `/register?next=${encodeURIComponent(next)}`
    : "/register";

  return (
    <div className="w-full">
      <header className="mb-8 space-y-2">
        <h1 className="text-[1.75rem] font-black tracking-tight text-zinc-900 dark:text-white sm:text-[2rem]">
          Welcome back
        </h1>
        <p className="text-[14px] leading-relaxed text-zinc-500">
          Sign in to continue to Jimvio
        </p>
      </header>

      {maintenanceMode && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-left dark:border-amber-500/20 dark:bg-amber-500/10">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Maintenance mode is active
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-amber-800/80 dark:text-amber-200/80">
              Only platform administrators can sign in until maintenance ends.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <GoogleAuthButton next={next || undefined} disabled={pending} />

        <AuthDivider label="or continue with email" />

        <form method="post" action="/login" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {displayNotice && !displayError && <AuthAlert tone="success">{displayNotice}</AuthAlert>}
          {displayError && <AuthAlert tone="error">{displayError}</AuthAlert>}

          <Field label="Email" required icon={<Mail className="h-4 w-4" />}>
            <FieldInput
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="you@example.com"
              disabled={pending}
              aria-invalid={Boolean(displayError)}
            />
          </Field>

          <div className="relative">
            <Field label="Password" required icon={<Lock className="h-4 w-4" />}>
              <Link
                href="/forgot-password"
                className="absolute right-0 -top-6 z-10 text-[13px] font-semibold text-orange-600 transition-colors hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 rounded-sm"
              >
                Forgot password?
              </Link>
              <FieldInput
                id="login-password"
                type={showPw ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                disabled={pending}
                className="pr-11"
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
          </div>

          {turnstileEnabled ? (
            <TurnstileWidget
              onToken={setCaptchaToken}
              resetSignal={captchaReset}
              className="flex justify-center pt-1"
            />
          ) : null}

          <Button
            type="submit"
            className="mt-1 h-12 w-full rounded-lg bg-zinc-900 text-[14px] font-bold text-white shadow-none transition-colors hover:bg-zinc-800 disabled:opacity-60"
            disabled={pending || (turnstileEnabled && !captchaToken)}
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>

      <p className="mt-8 text-center text-[13px] font-medium text-zinc-600">
        Don&apos;t have an account?{" "}
        <Link
          href={registerHref}
          className="font-bold text-orange-600 transition-colors hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 rounded-sm"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
