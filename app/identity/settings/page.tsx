import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Lock,
  Radio,
  Settings2,
  ShieldCheck,
  UserCircle,
  Wallet,
  BadgeCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getIdentityByUserId } from "@/lib/identity/resolve";
import { IdentityCard } from "@/components/identity/identity-ui";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

type SettingsLink = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "identity" | "account" | "live" | "verification" | "financial";
};

async function getOwnUsername(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const identity = await getIdentityByUserId(user.id, user.id);
    return identity?.profile.username ?? null;
  } catch {
    return null;
  }
}

export default async function IdentitySettingsPage() {
  const username = await getOwnUsername();
  const profileHref = username ? `/u/${username}` : "/identity/edit";

  const links: SettingsLink[] = [
    {
      group: "identity",
      href: "/identity/edit",
      title: "Profile",
      description: "Manage your public professional identity.",
      icon: UserCircle,
    },
    {
      group: "account",
      href: "/identity/account",
      title: "Account settings",
      description: "Email, preferences, and account controls.",
      icon: Settings2,
    },
    {
      group: "account",
      href: "/identity/privacy",
      title: "Privacy & visibility",
      description: "Control what people can see on your profile.",
      icon: Lock,
    },
    {
      group: "account",
      href: "/identity/security",
      title: "Security",
      description: "Password, two-factor authentication, and sessions.",
      icon: ShieldCheck,
    },
    {
      group: "account",
      href: "/settings/notifications",
      title: "Notifications",
      description: "Manage email and in-app notifications.",
      icon: Bell,
    },
    {
      group: "live",
      href: "/identity/live-destinations",
      title: "Live Destinations",
      description: "Connect YouTube, Twitch, TikTok, and Custom RTMP for multistream.",
      icon: Radio,
    },
    {
      group: "verification",
      href: "/identity/verification",
      title: "Verification",
      description: "Verify your identity with secure identity verification.",
      icon: BadgeCheck,
    },
    {
      group: "financial",
      href: "/wallet",
      title: "Wallet",
      description: "View your wallet and financial activity.",
      icon: Wallet,
    },
  ];

  const groups: Array<{ id: SettingsLink["group"]; title: string }> = [
    { id: "identity", title: "Identity" },
    { id: "account", title: "Account" },
    { id: "live", title: "Live" },
    { id: "verification", title: "Verification" },
    { id: "financial", title: "Financial" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
          Jimvio Identity
        </p>
        <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
          Settings
        </h1>
        <p className="mt-1 text-[13.5px] text-[#8B8579]">
          Your account center for identity, privacy, security, and verification.
        </p>
        {username ? (
          <Link
            href={profileHref}
            className="mt-3 inline-flex text-[12.5px] font-semibold text-[#D6480F] hover:underline"
          >
            View public profile →
          </Link>
        ) : null}
      </div>

      <div className="space-y-8">
        {groups.map((group) => {
          const items = links.filter((l) => l.group === group.id);
          if (!items.length) return null;
          return (
            <section key={group.id}>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9388]">
                {group.title}
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {items.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.href} href={link.href}>
                      <IdentityCard
                        interactive
                        className="flex h-full min-h-[88px] items-start gap-3.5 p-4 sm:p-5"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF1EA] text-[#D6480F]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-[#1C1B19]">{link.title}</p>
                          <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#8B8579]">
                            {link.description}
                          </p>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#C7C1B4]" />
                      </IdentityCard>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
