"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Megaphone,
  LogOut,
  ShoppingBag,
  Settings,
  Factory,
  TrendingUp,
  ArrowRight,
  Globe,
  DollarSign,
  Star,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut, signInWithGoogle } from "@/lib/auth/actions";

type Profile = {
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
} | null;

interface HeroRightPanelProps {
  profile: Profile;
}

// ─── Google Icon ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Live Activity Ticker ─────────────────────────────────────────────────────

const LIVE_ACTIVITIES = [
  { user: "Kofi A.", action: "earned $48 in commissions", time: "2m ago", color: "#22c55e" },
  { user: "Amara T.", action: "joined UGC campaign", time: "4m ago", color: "#f97316" },
  { user: "David M.", action: "made first sale", time: "6m ago", color: "#3b82f6" },
  { user: "Zara K.", action: "reached 10K views", time: "9m ago", color: "#a855f7" },
  { user: "Emre B.", action: "payout of $120 sent", time: "12m ago", color: "#22c55e" },
];

function LiveActivityTicker() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActiveIdx((i) => (i + 1) % LIVE_ACTIVITIES.length);
        setFading(false);
      }, 300);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const activity = LIVE_ACTIVITIES[activeIdx];

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm shadow-sm"
      style={{
        background: "rgba(34,197,94,0.06)",
        border: "1px solid rgba(34,197,94,0.2)",
        transition: "opacity 0.3s ease",
        opacity: fading ? 0 : 1,
      }}
    >
      <span
        className="flex-shrink-0 w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: activity.color }}
      />
      <p className="text-[10px] text-[var(--color-text-muted)] leading-tight truncate">
        <span className="font-bold" style={{ color: "var(--color-text-primary)" }}>
          {activity.user}
        </span>{" "}
        {activity.action}
      </p>
      <span className="text-[9px] text-[var(--color-text-muted)] flex-shrink-0 ml-auto">
        {activity.time}
      </span>
    </div>
  );
}

// ─── Animated Stat ────────────────────────────────────────────────────────────

function AnimatedStat({
  value,
  label,
  icon: Icon,
  color,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}18`,
      }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span
        className="text-[13px] font-black leading-none tracking-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </span>
      <span className="text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide text-center">
        {label}
      </span>
    </div>
  );
}

// ─── Trust Badges ─────────────────────────────────────────────────────────────

function TrustBadges() {
  return (
    <div className="flex flex-col gap-2">
      {[
        { icon: CheckCircle2, text: "Free to join — no card needed", color: "#22c55e" },
        { icon: Globe, text: "50+ countries supported", color: "#3b82f6" },
        { icon: Star, text: "Verified vendors & creators", color: "#f59e0b" },
      ].map(({ icon: Icon, text, color }) => (
        <div key={text} className="flex items-center gap-2">
          <Icon className="h-3 w-3 flex-shrink-0" style={{ color }} />
          <span className="text-[10px] text-[var(--color-text-muted)] leading-tight">{text}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Logged-in View ───────────────────────────────────────────────────────────

function LoggedInView({ profile }: { profile: NonNullable<Profile> }) {
  const initials = (profile.full_name || profile.email || "U").charAt(0).toUpperCase();

  return (
    <>
      {/* Profile card */}
      <div
        className="relative overflow-hidden rounded-xl p-3.5 shadow-xl backdrop-blur-md transition-all hover:shadow-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Decorative glow */}
        <div
          className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
        />

        <div className="flex items-center gap-2.5 mb-3">
          <div className="relative">
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-[#f97316]/20">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-[13px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface)]"
              style={{ background: "#22c55e" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-[var(--color-text-primary)] truncate leading-tight">
              {profile.full_name || "Member"}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] truncate">{profile.email}</p>
          </div>
          <div
            className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
            style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}
          >
            Active
          </div>
        </div>

        <Link
          href="/dashboard"
          className="group relative flex items-center justify-center gap-2 w-full h-9 rounded-lg text-[11px] font-bold text-white overflow-hidden transition-all hover:brightness-110 active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #f97316 0%, #ea6c0a 100%)",
            boxShadow: "0 6px 16px rgba(249,115,22,0.4)",
          }}
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative flex items-center gap-2">
            <LayoutDashboard className="h-3 w-3" />
            Open Dashboard
            <ChevronRight className="h-3 w-3 opacity-70 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      </div>

      {/* Quick stats row */}
      <div className="flex gap-2">
        <AnimatedStat value="$0" label="Earned" icon={DollarSign} color="#22c55e" />
        <AnimatedStat value="0" label="Orders" icon={ShoppingBag} color="#3b82f6" />
        <AnimatedStat value="0%" label="Growth" icon={TrendingUp} color="#f97316" />
      </div>

      {/* Live activity */}
      <LiveActivityTicker />

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { href: "/dashboard/orders", icon: ShoppingBag, label: "Orders" },
          { href: "/dashboard/settings", icon: Settings, label: "Settings" },
          { href: "/dashboard/vendor/setup", icon: Factory, label: "Sell" },
          { href: "/ugc", icon: Megaphone, label: "Campaigns" },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-center gap-1.5 h-8 rounded-lg text-[10px] font-bold text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Icon className="h-3 w-3" />
            {label}
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <form action={signOut}>
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 w-full h-7 rounded-lg text-[10px] font-semibold text-[var(--color-text-muted)] transition-all hover:text-red-500 hover:bg-red-500/5"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </form>
    </>
  );
}

// ─── Guest View ───────────────────────────────────────────────────────────────

function GuestView() {
  return (
    <>
      {/* Hero card */}
      <div
        className="relative overflow-hidden rounded-xl p-4"
        style={{
          background: "linear-gradient(145deg, #0f0a00 0%, #1e0d00 45%, #2d1000 100%)",
          border: "1px solid rgba(249,115,22,0.2)",
        }}
      >
        {/* Ambient blobs */}
        <div
          className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #fb923c 0%, transparent 70%)" }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-3">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.3)" }}
            >
              <Sparkles className="h-3 w-3 text-orange-400" />
            </div>
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
              Creator Platform
            </span>
          </div>

          <h3 className="text-[14px] font-black text-white leading-tight mb-1.5">
            Start earning online
            <br />
            <span className="text-orange-400">from day one.</span>
          </h3>
          <p className="text-[10px] text-white/50 leading-relaxed mb-4">
            Join 10,000+ creators earning through affiliate commissions, UGC campaigns & marketplace sales.
          </p>

          {/* Stats mini-grid */}
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {[
              { value: "$1M+", label: "Paid out" },
              { value: "50+", label: "Countries" },
              { value: "30%", label: "Max comm." },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center py-2 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span className="text-[13px] font-black text-white leading-none">{value}</span>
                <span className="text-[8px] text-white/40 uppercase tracking-wide mt-0.5">{label}</span>
              </div>
            ))}
          </div>

          <Link
            href="/register"
            className="flex items-center justify-center gap-2 w-full h-9 rounded-xl text-[12px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #ea6c0a 100%)",
              boxShadow: "0 6px 20px rgba(249,115,22,0.4)",
            }}
          >
            Join Free — No Card Needed
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Sign in option */}
      <div
        className="rounded-xl p-3"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p className="text-[11px] font-semibold text-[var(--color-text-primary)] mb-2.5">
          Already a member?
        </p>
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 w-full h-8 rounded-lg text-[11px] font-bold transition-all hover:brightness-95 mb-2"
          style={{
            background: "var(--color-surface-secondary)",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text-primary)",
          }}
        >
          Sign In
        </Link>

        {/* Divider */}
        <div className="relative flex items-center gap-2 my-2.5">
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
            or
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
        </div>

        <form action={() => signInWithGoogle()}>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full h-8 rounded-lg text-[11px] font-bold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-secondary)]"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>
      </div>

      {/* Live activity */}
      <LiveActivityTicker />

      {/* Trust badges */}
      <div
        className="rounded-xl p-3"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2.5">
          Why Jimvio
        </p>
        <TrustBadges />
      </div>

      {/* Quick action: become vendor */}
      <Link
        href="/vendor/register"
        className="group relative overflow-hidden flex items-center gap-3 p-3 rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #1a1408 0%, #2d1e05 55%, #f97316 100%)",
          border: "1px solid rgba(249,115,22,0.4)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <Factory className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-white uppercase tracking-wide leading-tight">
            Become a Vendor
          </p>
          <p className="text-[9px] text-white/50 mt-0.5">List products &amp; grow your reach</p>
        </div>
        <div
          className="flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-black text-white"
          style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          Free
        </div>
      </Link>
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function HeroRightPanel({ profile }: HeroRightPanelProps) {
  const isLoggedIn = !!profile;

  return (
    <div
      className="flex-col gap-2.5 min-h-[360px] p-3 hidden lg:flex overflow-y-auto no-scrollbar"
      style={{
        background: "var(--color-surface-secondary)",
        borderLeft: "1px solid var(--color-border)",
      }}
    >
      {isLoggedIn ? (
        <LoggedInView profile={profile!} />
      ) : (
        <GuestView />
      )}
    </div>
  );
}
