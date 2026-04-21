"use client";

import React, { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import { cn } from "@/lib/utils";

type Props = {
  /** Full row in a menu vs icon-only in sidebar */
  variant?: "menu" | "icon";
  className?: string;
};

export const SignOutButton = React.forwardRef<HTMLButtonElement, Props>(function SignOutButton(
  { variant = "menu", className },
  ref
) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await signOut();
      } catch (e) {
        if (isNextRedirectError(e)) throw e;
      }
    });
  }

  if (variant === "icon") {
    return (
      <button
        ref={ref}
        type="button"
        disabled={pending}
        onClick={handleClick}
        className={cn(
          "p-1.5 rounded-none text-stone-400 dark:text-text-muted hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors",
          className
        )}
        title="Sign out"
        aria-label="Sign out"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      disabled={pending}
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-none px-3 py-2 text-sm font-medium text-red-600 outline-none hover:bg-red-50 dark:hover:bg-red-900/20",
        className
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <LogOut className="h-4 w-4 shrink-0" />}
      Sign out
    </button>
  );
});

SignOutButton.displayName = "SignOutButton";

