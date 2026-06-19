import Link from "next/link";
import { Lock, LogIn } from "lucide-react";
import { buildHubLoginUrl } from "@/lib/community/hub-auth";

type HubAuthPromptProps = {
  title?: string;
  description?: string;
  nextPath?: string;
  compact?: boolean;
};

export function HubAuthPrompt({
  title = "Sign in to access community features",
  description = "Create an account or sign in to message members, join spaces, track missions, and personalize your feed.",
  nextPath = "/c",
  compact = false,
}: HubAuthPromptProps) {
  const loginHref = buildHubLoginUrl(nextPath);
  const registerHref = `/register?next=${encodeURIComponent(nextPath)}`;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#fd5000]/20 bg-[#fd5000]/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary,#52525b)]">
          <Lock className="h-4 w-4 shrink-0 text-[#fd5000]" />
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={registerHref}
            className="rounded-full border border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
          >
            Register
          </Link>
          <Link
            href={loginHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#fd5000] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#e04800]"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[var(--color-border,#e4e4e7)] bg-[var(--color-surface,#fff)] p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#fd5000]/10">
        <Lock className="h-6 w-6 text-[#fd5000]" />
      </div>
      <h2 className="text-lg font-bold text-[var(--color-text-primary,#18181b)]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary,#52525b)]">
        {description}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href={loginHref}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#fd5000] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#e04800]"
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </Link>
        <Link
          href={registerHref}
          className="inline-flex items-center justify-center rounded-full border border-[var(--color-border,#e4e4e7)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
