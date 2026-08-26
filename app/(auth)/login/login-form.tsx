"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/actions";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import { formatAuthQueryStatus, formatLoginQueryError } from "@/lib/auth/sign-in-errors";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import { GoogleAuthButton } from "@/components/auth/google-button";

export function LoginForm({ maintenanceMode = false }: { maintenanceMode?: boolean }) {
  const searchParams = useSearchParams();

  const next =
    searchParams.get("next") ??
    searchParams.get("redirect") ??
    searchParams.get("returnUrl") ??
    "";
  const urlError = searchParams.get("error");
  const urlStatus = searchParams.get("status");

  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (urlError) setError(formatLoginQueryError(decodeURIComponent(urlError)));
    if (urlStatus) setNotice(formatAuthQueryStatus(urlStatus));
  }, [urlError, urlStatus]);

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
        setError("Something went wrong. Please try again.");
      }
    });
  }

  const registerHref = next
    ? `/register?next=${encodeURIComponent(next)}`
    : "/register";

  return (
    <div className="w-full">
      <div className="space-y-3 mb-10">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
          Welcome back
        </h1>
        <p className="text-[14px] font-medium text-zinc-500">
          Sign in to your account to continue
        </p>
      </div>

      {maintenanceMode && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-left dark:border-amber-500/20 dark:bg-amber-500/10">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
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

      <div className="space-y-6">
        <GoogleAuthButton next={next || undefined} disabled={pending} />

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-zinc-200 dark:border-border" />
          <span className="flex-shrink-0 mx-4 text-[12px] font-medium text-zinc-500">
            or sign in with email
          </span>
          <div className="flex-grow border-t border-zinc-200 dark:border-border" />
        </div>

        <form method="post" action="/login" onSubmit={handleSubmit} className="space-y-5">
          {notice && !error && (
            <div
              role="status"
              className="p-3.5 rounded-sm text-[13px] font-semibold bg-emerald-50 text-emerald-700 flex items-center justify-center text-center"
            >
              {notice}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-sm text-[13px] font-semibold bg-red-50 text-red-600 flex items-center justify-center text-center"
            >
              {error}
            </div>
          )}

          <Field label="Email Address" required icon={<Mail className="h-5 w-5" />}>
            <FieldInput
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="you@example.com"
              disabled={pending}
            />
          </Field>

          <div className="relative group">
            <Field label="Password" required icon={<Lock className="h-5 w-5" />}>
              <Link
                href="/forgot-password"
                aria-label="Forgot password?"
                className="absolute right-0 z-50 -top-6 text-[13px] font-semibold text-orange-600 hover:text-orange-500 transition-colors"
              >
                Forgot password?
              </Link>
              <FieldInput
                id="password"
                type={showPw ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                disabled={pending}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 p-1 rounded-sm transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </Field>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[14px] shadow-none transition-all mt-2"
            disabled={pending}
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>

      <p className="text-center text-[13px] font-medium text-zinc-600 mt-8">
        Don&apos;t have an account?{" "}
        <Link
          href={registerHref}
          className="font-bold text-orange-600 hover:text-orange-500 transition-colors"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
