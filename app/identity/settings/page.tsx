import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  ChevronRight,
  FileText,
  Fingerprint,
  Lock,
  MessageSquareQuote,
  Paintbrush,
  Settings2,
  ShieldCheck,
  UserCircle,
  Wallet,
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
      href: "/identity/edit",
      title: "Identity profile",
      description: "Photo, cover, bio, skills, availability and social links.",
      icon: UserCircle,
    },
    {
      href: "/identity/edit#privacy",
      title: "Privacy & visibility",
      description: "Control who can see your Jimvio identity profile.",
      icon: Lock,
    },
    {
      href: "/wallet",
      title: "Wallet",
      description: "Balances, reserved funds, analytics, rewards and AI — Jimvio Wallet.",
      icon: Wallet,
    },
    {
      href: "/identity/analytics",
      title: "Analytics",
      description: "Cross-surface performance — campaigns, conversions, revenue and reach.",
      icon: BarChart3,
    },
    {
      href: `${profileHref}?tab=media-kit`,
      title: "Media kit",
      description: "Download a branded, shareable PDF summary of your profile.",
      icon: FileText,
    },
    {
      href: `${profileHref}?tab=reviews`,
      title: "Reviews",
      description: "See verified feedback from the brands and creators you've worked with.",
      icon: MessageSquareQuote,
    },
    {
      href: "/identity/settings",
      title: "Account settings",
      description: "General account preferences and workspace defaults.",
      icon: Settings2,
    },
    {
      href: "/settings/notifications",
      title: "Notifications",
      description: "Manage email and in-app notification preferences.",
      icon: Bell,
    },
    {
      href: "/identity/security",
      title: "Security",
      description: "Password, two-factor authentication and active sessions.",
      icon: ShieldCheck,
    },
    {
      href: "/identity/bookings",
      title: "Booking inbox",
      description: "Review and respond to brand booking requests.",
      icon: Fingerprint,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Jimvio Identity</p>
        <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
          Settings
        </h1>
        <p className="mt-1 text-[13.5px] text-[#8B8579]">
          Everything about your identity, earnings and account in one place.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <IdentityCard interactive className="flex h-full items-start gap-3.5 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF1EA] text-[#D6480F]">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#1C1B19]">{link.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#8B8579]">{link.description}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#C7C1B4]" />
              </IdentityCard>
            </Link>
          );
        })}
      </div>

      <IdentityCard className="mt-6 flex items-center gap-3 p-5">
        <Paintbrush className="h-4 w-4 text-[#9A9388]" />
        <p className="text-[12.5px] text-[#8B8579]">
          Appearance (theme, density) lives in your{" "}
          <Link href="/identity/settings" className="font-medium text-[#D6480F] underline-offset-2 hover:underline">
            account settings
          </Link>
          .
        </p>
      </IdentityCard>
    </div>
  );
}
