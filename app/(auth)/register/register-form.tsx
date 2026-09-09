"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resendSignUpConfirmation, signUp } from "@/lib/auth/actions";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import { GoogleAuthButton } from "@/components/auth/google-button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_HINT } from "@/lib/auth/password-rules";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? searchParams.get("redirect") ?? "";

  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!captchaToken) {
      setError("Please complete the CAPTCHA challenge.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    if (next) fd.set("next", next);
    fd.set("captchaToken", captchaToken);
    const email = String(fd.get("email") ?? "");
    startTransition(async () => {
      try {
        const res = await signUp(fd);
        if (res?.error) {
          setError(res.error);
          setCaptchaToken(null);
        }
        if (res?.success) {
          setSubmittedEmail(email);
          setSuccess(res.success);
        }
      } catch (err: unknown) {
        if (isNextRedirectError(err)) throw err;
        setError("Something went wrong. Please try again.");
        setCaptchaToken(null);
      }
    });
  }

  if (success) {
    return (
      <div className="w-full text-center animate-fade-in mt-16">
        <div className="w-16 h-16 rounded-sm bg-green-50 flex items-center justify-center mx-auto mb-6 ring-4 ring-green-50">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Check your email</h2>
        <p className="text-[14px] font-medium text-zinc-500 mb-8 max-w-xs mx-auto">{success}</p>
        {resendNotice && (
          <p className="text-[13px] font-medium text-emerald-600 mb-4">{resendNotice}</p>
        )}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="w-full h-12 rounded-sm font-bold text-[14px]"
            onClick={() => {
              const fd = new FormData();
              fd.set("email", submittedEmail);
              startTransition(async () => {
                const res = await resendSignUpConfirmation(fd);
                setResendNotice(res.success ?? res.error ?? "Try again.");
              });
            }}
          >
            {pending ? "Sending…" : "Try again"}
          </Button>
          <Link href="/login">
            <Button className="w-full h-12 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[14px] shadow-none transition-all">
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-3 mb-10">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Create an account</h1>
        <p className="text-[14px] font-medium text-zinc-500">
          Join Jimvio — completely free to sign up.
        </p>
      </div>

      <div className="space-y-6">
        <GoogleAuthButton next={next || undefined} disabled={pending} />

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-zinc-200 dark:border-border"></div>
          <span className="flex-shrink-0 mx-4 text-[12px] font-medium text-zinc-500">or sign up with email</span>
          <div className="flex-grow border-t border-zinc-200 dark:border-border"></div>
        </div>

        <form method="post" action="/register" onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div role="alert" className="p-3.5 rounded-sm text-[13px] font-semibold bg-red-50 text-red-600 flex items-center justify-center text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="full_name" className="block text-[13px] font-bold text-zinc-800 dark:text-text-secondary">
              Full Name
            </label>
            <div className="relative group">
              <Input
                icon={<User className="h-5 w-5  text-zinc-400 group-focus-within:text-orange-500 transition-colors pointer-events-none" />}
                id="full_name"
                name="full_name"
                placeholder="Jane Doe"
                className="pl-11 h-12 rounded-sm border-zinc-200 dark:border-border bg-white dark:bg-surface text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-none"
                required
                autoComplete="name"
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[13px] font-bold text-zinc-800 dark:text-text-secondary">
              Email Address
            </label>
            <div className="relative group">
              <Input
                icon={<Mail className=" h-5 w-5 text-zinc-400 group-focus-within:text-orange-500 transition-colors pointer-events-none" />}
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                className="pl-11 h-12 rounded-sm border-zinc-200 dark:border-border bg-white dark:bg-surface text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-none"
                required
                autoComplete="email"
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[13px] font-bold text-zinc-800 dark:text-text-secondary">
              Password
            </label>
            <div className="relative group">
              <Input
                icon={<Lock className="h-5 w-5 text-zinc-400 group-focus-within:text-orange-500 transition-colors pointer-events-none" />}
                id="password"
                type={showPw ? "text" : "password"}
                name="password"
                placeholder={PASSWORD_REQUIREMENTS_HINT}
                className="pl-11 pr-11 h-12 rounded-sm border-zinc-200 dark:border-border bg-white dark:bg-surface text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-none"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                disabled={pending}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 p-1 rounded-sm transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <TurnstileWidget onToken={setCaptchaToken} className="flex justify-center" />

          <Button
            type="submit"
            className="w-full h-12 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[14px] shadow-none transition-all mt-6"
            disabled={pending || !captchaToken}
          >
            {pending ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-[12px] text-zinc-500 text-center leading-relaxed font-medium mx-auto pt-2">
            By joining, you agree to our{" "}
            <Link href="/terms" className="text-zinc-700 dark:text-zinc-300 hover:text-orange-600 transition-colors underline underline-offset-2 decoration-zinc-300">Terms</Link> &{" "}
            <Link href="/privacy" className="text-zinc-700 dark:text-zinc-300 hover:text-orange-600 transition-colors underline underline-offset-2 decoration-zinc-300">Privacy Policy</Link>.
          </p>
        </form>
      </div>

      <p className="text-center text-[13px] font-medium text-zinc-600 mt-8">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-bold text-orange-600 hover:text-orange-500 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
