"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, User, UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp, signInWithGoogle } from "@/lib/auth/actions";

export default function RegisterPage() {
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signUp(fd);
      if (res?.error)   setError(res.error);
      if (res?.success) setSuccess(res.success);
    });
  }

  if (success) {
    return (
      <div className="text-center animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-[var(--color-success-light)] flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-7 w-7 text-[var(--color-success)]" />
        </div>
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Check your email</h2>
        <p className="text-[var(--color-text-secondary)] mb-4 text-sm">{success}</p>
        <Link href="/login">
          <Button className="w-full max-w-[280px] h-7 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-xs font-medium px-4 py-1.5" size="sm">Back to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Create account</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Join Jimvio — free to sign up.</p>
      </div>

      <form action={signInWithGoogle as () => void} className="block">
        <button
          type="submit"
          className="w-full max-w-[400px] h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-border)]/30 transition-colors inline-flex items-center justify-center gap-2 shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:border-[var(--color-accent)] px-4 py-1.5"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </form>

      <div className="flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-[11px] text-[var(--color-text-muted)] font-medium capitalize tracking-wider shrink-0">or</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-4 shadow-[var(--shadow-md)]">
        <Input
          name="full_name"
          label="Full name"
          placeholder="Your name"
          icon={<User className="h-4 w-4" />}
          required
          autoComplete="name"
        />
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          required
          autoComplete="email"
        />
        <Input
          name="password"
          type={showPw ? "text" : "password"}
          label="Password"
          placeholder="8+ characters"
          icon={<Lock className="h-4 w-4" />}
          iconRight={
            <button type="button" onClick={() => setShowPw(!showPw)} className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors" tabIndex={-1} aria-label={showPw ? "Hide password" : "Show password"}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          required
          minLength={8}
          autoComplete="new-password"
        />

        <p className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] rounded-lg px-3 py-2 border border-[var(--color-border)]">
          After sign-up you can enable <strong>Vendor</strong>, <strong>Affiliate</strong>, or <strong>Community</strong> from your dashboard.
        </p>

        {error && (
          <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-light)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full max-w-[400px] h-7 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-xs font-medium shadow-[var(--shadow-sm)] px-4 py-1.5" size="sm" loading={pending}>
          <UserPlus className="h-4 w-4" />
          Create free account
        </Button>

        <p className="text-xs text-[var(--color-text-muted)] text-left pt-0.5">
          By signing up you agree to our{" "}
          <Link href="/terms" className="text-[var(--color-accent)] hover:underline">Terms</Link> and{" "}
          <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Privacy</Link>.
        </p>
      </form>

      <p className="text-sm text-[var(--color-text-secondary)] text-left">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--color-accent)] hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
