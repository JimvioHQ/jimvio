"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signInWithGoogle } from "@/lib/auth/actions";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const searchParams = useSearchParams();
  /** Middleware uses `redirect`; rest of app uses `next`. */
  const next = searchParams.get("next") ?? searchParams.get("redirect") ?? "";
  const urlError = searchParams.get("error");

  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (urlError) setError(decodeURIComponent(urlError.replace(/\+/g, " ")));
  }, [urlError]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (next) fd.set("next", next);
    startTransition(async () => {
      try {
        const result = await signIn(fd);
        if (result && typeof result === "object" && "error" in result && result.error) {
          setError(String(result.error));
        }
      } catch (err: unknown) {
        if (isNextRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Sign in failed");
      }
    });
  }

  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <div className="w-full space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center mb-2 lg:hidden">
          <Image src="/jimvio-logo.png" alt="Jimvio" width={140} height={44} className="h-9 w-auto opacity-95" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--color-text-primary)]">Welcome back</h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
          Sign in to shop, sell, and manage your communities and dashboard.
        </p>
      </div>

      <div
        className={cn(
          "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8",
          "shadow-[0_8px_32px_-12px_rgba(43,34,72,0.12)] ring-1 ring-[var(--color-border)]/40"
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <div
              role="alert"
              className="p-3.5 rounded-xl text-sm font-medium border bg-[var(--color-danger-light)]/35 border-[var(--color-danger)]/25 text-[var(--color-danger)]"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[var(--color-text-muted)] pointer-events-none" />
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                className="pl-11 h-11 rounded-xl border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
                required
                autoComplete="email"
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[var(--color-text-muted)] pointer-events-none" />
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                className="pl-11 pr-11 h-11 rounded-xl border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                required
                autoComplete="current-password"
                disabled={pending}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 rounded-lg"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold shadow-[var(--shadow-sm)] gap-2"
            disabled={pending}
          >
            {pending ? (
              "Signing in…"
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4 opacity-90" />
              </>
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--color-border)]" />
          </div>
          <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wider">
            <span className="bg-[var(--color-surface)] px-3 text-[var(--color-text-muted)]">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11 rounded-xl border-[var(--color-border)] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
          onClick={() =>
            startTransition(async () => {
              try {
                await signInWithGoogle();
              } catch (err: unknown) {
                if (isNextRedirectError(err)) throw err;
              }
            })
          }
          disabled={pending}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>
      </div>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        Don&apos;t have an account?{" "}
        <Link href={registerHref} className="font-bold text-[var(--color-accent)] hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
