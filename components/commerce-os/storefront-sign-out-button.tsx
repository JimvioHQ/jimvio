"use client";

import { signOut } from "@/lib/auth/actions";

export function StorefrontSignOutButton({
  nextHref,
  className,
}: {
  nextHref: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await signOut();
        window.location.href = nextHref || "/";
      }}
    >
      Sign out
    </button>
  );
}
