"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  isUgcJoinPath,
  loginUrlForReturnPath,
  sanitizeJoinReturnPath,
} from "@/lib/ugc/join-auth";

type JoinCampaignGateLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Join Campaign link that gates unauthenticated visitors to the real /login page
 * with a safe return path. Authenticated users continue to the join flow.
 */
export function JoinCampaignGateLink({
  href,
  onClick,
  children,
  ...rest
}: JoinCampaignGateLinkProps) {
  async function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (!isUgcJoinPath(href)) return;

    e.preventDefault();
    const returnPath = sanitizeJoinReturnPath(href);
    const loginUrl = loginUrlForReturnPath(returnPath);

    try {
      const supabase = createClient();
      const authResult = await Promise.race([
        supabase.auth.getUser(),
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 2500);
        }),
      ]);

      const user =
        authResult && typeof authResult === "object" && "data" in authResult
          ? authResult.data.user
          : null;

      // Full navigation so server join-page redirect / login always apply.
      window.location.assign(user ? returnPath : loginUrl);
    } catch {
      window.location.assign(loginUrl);
    }
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
