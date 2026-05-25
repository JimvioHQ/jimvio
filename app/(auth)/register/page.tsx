"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp, signInWithGoogle } from "@/lib/auth/actions";
import { isNextRedirectError } from "@/lib/auth/redirect-error";

function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? searchParams.get("redirect") ?? "";

  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (next) fd.set("next", next);
    startTransition(async () => {
      try {
        const res = await signUp(fd);
        if (res?.error) setError(res.error);
        if (res?.success) setSuccess(res.success);
      } catch (err: unknown) {
        if (isNextRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Registration failed.");
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
        <Link href="/login">
          <Button className="w-full h-12 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[14px] shadow-none transition-all">
            Back to sign in
          </Button>
        </Link>
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
        <Button
          type="button"
          onClick={() => startTransition(async () => {
            try {
              await signInWithGoogle(next);
            } catch (err: unknown) {
              if (isNextRedirectError(err)) throw err;
            }
          })}
          disabled={pending}
          className="w-full h-12 bg-white dark:bg-surface hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-border shadow-none rounded-sm font-bold transition-all flex items-center justify-center gap-3"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="text-[14px]">Sign up with Google</span>
        </Button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-zinc-200 dark:border-border"></div>
          <span className="flex-shrink-0 mx-4 text-[12px] font-medium text-zinc-500">or sign up with email</span>
          <div className="flex-grow border-t border-zinc-200 dark:border-border"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="8+ characters minimum"
                className="pl-11 pr-11 h-12 rounded-sm border-zinc-200 dark:border-border bg-white dark:bg-surface text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-none"
                required
                minLength={8}
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

          <Button
            type="submit"
            className="w-full h-12 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[14px] shadow-none transition-all mt-6"
            disabled={pending}
          >
            {pending ? (
              "Creating account…"
            ) : (
              "Create account"
            )}
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-6 animate-pulse">
          <div className="h-8 bg-zinc-100 dark:bg-surface-secondary rounded-sm w-3/4 mx-auto" />
          <div className="h-11 bg-zinc-100 dark:bg-surface-secondary rounded-sm" />
          <div className="h-11 bg-zinc-100 dark:bg-surface-secondary rounded-sm" />
          <div className="h-11 bg-zinc-100 dark:bg-surface-secondary rounded-sm" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

