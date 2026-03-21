"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signInWithGoogle } from "@/lib/auth/actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  /** Middleware uses `redirect`; rest of app uses `next`. */
  const next = searchParams.get("next") ?? searchParams.get("redirect") ?? "";
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (next) fd.set("next", next);
    startTransition(async () => {
      try {
        await signIn(fd);
      } catch (err: any) {
        setError(err?.message || "Sign in failed");
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-secondary)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black text-[var(--color-text-primary)]">Welcome back</h1>
          <p className="text-[var(--color-text-muted)] mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-900/20 border border-red-500/20 rounded-xl text-red-500 text-sm">{error}</div>}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" />
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                className="pl-9"
                required
                disabled={pending}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" />
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                className="pl-9 pr-9"
                required
                disabled={pending}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold rounded-xl" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"} <LogIn className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <Button
          variant="outline"
          className="w-full rounded-xl border border-[var(--color-border)]"
          onClick={() => startTransition(() => signInWithGoogle())}
          disabled={pending}
        >
          Sign in with Google
        </Button>

        <div className="text-center text-sm">
          <span className="text-[var(--color-text-muted)]">Don't have an account? </span>
          <Link href="/register" className="text-[var(--color-accent)] hover:underline font-medium">
            Create one
          </Link>
        </div>
        <Link href="/forgot-password" className="block text-center text-sm text-[var(--color-accent)] hover:underline">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
