import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Megaphone,
  TrendingUp,
  ChevronRight,
  Linkedin,
  LogOut,
  ShoppingBag,
  Settings,
  Factory,
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

function GoogleIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.89 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function HeroRightPanel({ profile }: HeroRightPanelProps) {
  const isLoggedIn = !!profile;
  const initials = (profile?.full_name || profile?.email || "U").charAt(0).toUpperCase();

  return (
    /*
     * Matches the HTML prototype's .right-panel:
     *   background: var(--surface-light) = #faf9f7
     *   border-left: 0.5px solid var(--border-light)
     *   padding: 24px 20px
     *   display: flex; flex-direction: column; gap: 14px
     *   min-height: 580px
     */
    <div
      className="flex-col gap-[10px] min-h-[360px] p-[16px] hidden lg:flex bg-[#faf9f7] dark:bg-[#0f0e0c] border-l border-black/[.07] dark:border-white/[.06]"
    >
      {/* ── Main card ── */}
      <div
        className="bg-white dark:bg-[#1c1811] rounded-none border border-black/[.07] dark:border-white/[.08] p-[14px] flex flex-col gap-0"
      >
        {isLoggedIn ? (
          <>
            <h4 className="text-[12px] font-bold text-[#1c1811] dark:text-[#f0e8dc] mb-1 leading-tight">
              Welcome back
            </h4>
            <p className="text-[10px] text-[#a89f93] mb-[12px]">
              Continue your sourcing &amp; growth.
            </p>

            {/* User row — matches .user-row */}
            <div className="flex items-center gap-[10px] mb-3 p-[10px_12px] bg-[#f8f7f4] dark:bg-white/[.04] rounded-none border border-black/[.05] dark:border-white/[.06]">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#f97316] text-white text-[13px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-[#1c1811] dark:text-[#f0e8dc] truncate">
                  {profile?.full_name || "Member"}
                </div>
                <div className="text-[10px] text-[#a89f93] truncate">{profile?.email}</div>
              </div>
            </div>

            {/* Dashboard CTA — matches .btn-dashboard */}
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-[6px] w-full h-[36px] rounded-none mb-[10px] text-[10px] font-black uppercase tracking-[.08em] text-[#c2410c] dark:text-[#fb923c] transition-all"
              style={{
                background: "rgba(249,115,22,.10)",
                border: "0.5px solid rgba(249,115,22,.25)",
              }}
            >
              <LayoutDashboard className="h-[13px] w-[13px]" />
              Dashboard
            </Link>

            {/* Quick links grid — matches .grid-2 .btn-sm */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Link
                href="/dashboard/orders"
                className="flex items-center justify-center gap-[5px] h-[30px] rounded-none text-[10px] font-bold text-[#6b6257] dark:text-[#a89f93] transition-all hover:bg-[#f5f4f1]"
                style={{ border: "0.5px solid rgba(0,0,0,.07)" }}
              >
                <ShoppingBag className="h-[11px] w-[11px]" />
                Orders
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center justify-center gap-[5px] h-[30px] rounded-none text-[10px] font-bold text-[#6b6257] dark:text-[#a89f93] transition-all hover:bg-[#f5f4f1]"
                style={{ border: "0.5px solid rgba(0,0,0,.07)" }}
              >
                <Settings className="h-[11px] w-[11px]" />
                Settings
              </Link>
            </div>

            {/* Sign out — matches .btn-signout */}
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center justify-center gap-[5px] w-full h-[30px] rounded-none text-[10px] font-semibold text-[#a89f93] transition-all hover:bg-[#f5f4f1]"
                style={{ border: "0.5px solid rgba(0,0,0,.06)" }}
              >
                <LogOut className="h-[11px] w-[11px]" />
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <h4 className="text-[12px] font-bold text-[#1c1811] dark:text-[#f0e8dc] mb-1 leading-tight">
              Professional B2B Sourcing
            </h4>
            <p className="text-[10px] text-[#a89f93] mb-[12px] italic leading-relaxed">
              Get personalized trade insights.
            </p>

            <Link
              href="/login"
              className="flex items-center justify-center w-full h-[36px] rounded-none mb-[10px] text-[10px] font-black uppercase tracking-[.08em] text-[#c2410c] dark:text-[#fb923c] transition-all"
              style={{
                background: "rgba(249,115,22,.10)",
                border: "0.5px solid rgba(249,115,22,.25)",
              }}
            >
              Sign In
            </Link>

            <div className="text-center text-[11px] font-bold text-[#a89f93] mb-3">
              New to Jimvio?{" "}
              <Link href="/register" className="text-[#f97316] hover:underline">
                Join Free
              </Link>
            </div>

            {/* Divider */}
            <div className="relative text-center text-[9px] text-[#c8c0b5] font-bold uppercase tracking-[.18em] my-3">
              <span className="relative z-10 bg-white dark:bg-[#1c1811] px-2.5">or access with</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-[#f0ede8] dark:bg-white/[.06]" />
            </div>

            {/* OAuth row */}
            <div className="grid grid-cols-2 gap-[6px]">
              <form action={signInWithGoogle}>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-[6px] w-full h-[30px] rounded-none text-[10px] font-bold text-[#6b6257] dark:text-[#a89f93] hover:bg-[#f5f4f1] dark:hover:bg-white/[.04] transition-all"
                  style={{ border: "0.5px solid rgba(0,0,0,.07)" }}
                >
                  <GoogleIcon /> Google
                </button>
              </form>
              <Link
                href="/login"
                className="flex items-center justify-center gap-[6px] h-[30px] rounded-none text-[10px] font-bold text-[#6b6257] dark:text-[#a89f93] hover:bg-[#f5f4f1] dark:hover:bg-white/[.04] transition-all"
                style={{ border: "0.5px solid rgba(0,0,0,.07)" }}
              >
                <Linkedin className="h-[13px] w-[13px] text-[#0077b5]" /> LinkedIn
              </Link>
            </div>
          </>
        )}
      </div>

      {/* ── Quick actions grid — matches .quick-grid / .quick-tile ── */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={isLoggedIn ? "/dashboard/vendor/setup" : "/register?role=vendor"}
          className="group flex flex-col items-center gap-[6px] bg-white dark:bg-[#1c1811] rounded-none py-[10px] px-3 text-center cursor-pointer transition-all hover:border-[rgba(249,115,22,.3)]"
          style={{ border: "0.5px solid rgba(0,0,0,.07)" }}
        >
          <div className="text-[18px]">
            <Factory className="h-[18px] w-[18px] text-[#f97316] group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-[11px] font-bold text-[#1c1811] dark:text-[#f0e8dc]">Supplier Store</div>
          <div className="flex items-center gap-0.5 text-[9px] font-bold text-[#f97316] uppercase tracking-[.07em]">
            Start <ChevronRight className="h-2.5 w-2.5" />
          </div>
        </Link>

        <Link
          href="/requests/new"
          className="group flex flex-col items-center gap-[6px] bg-white dark:bg-[#1c1811] rounded-none py-[10px] px-3 text-center cursor-pointer transition-all hover:border-[rgba(249,115,22,.3)]"
          style={{ border: "0.5px solid rgba(0,0,0,.07)" }}
        >
          <div className="text-[18px]">
            <Megaphone className="h-[18px] w-[18px] text-[#f97316] group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-[11px] font-bold text-[#1c1811] dark:text-[#f0e8dc]">Post Lead</div>
          <div className="flex items-center gap-0.5 text-[9px] font-bold text-[#f97316] uppercase tracking-[.07em]">
            Get Quotes <ChevronRight className="h-2.5 w-2.5" />
          </div>
        </Link>
      </div>

      {/* ── Earn & Influence card — matches .earn-card ── */}
      <Link
        href="/affiliates"
        className="group relative overflow-hidden rounded-none p-3 cursor-pointer hover:brightness-105 transition-all"
        style={{
          background: "linear-gradient(135deg, #1a1408 0%, #3d1e05 55%, #f97316 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Icon — matches .earn-icon */}
          <div
            className="w-9 h-9 rounded-none flex items-center justify-center text-[16px] font-bold text-white shrink-0 group-hover:scale-110 transition-transform"
            style={{
              background: "rgba(255,255,255,.12)",
              border: "0.5px solid rgba(255,255,255,.15)",
            }}
          >
            $
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h5 className="text-[11px] font-black text-white uppercase tracking-[.04em] leading-tight">
              Earn &amp; Influence
            </h5>
            <p className="text-[9px] font-semibold text-white/55 mt-0.5">Uncapped Commissions</p>
          </div>

          {/* Badge — matches .earn-badge */}
          <div
            className="shrink-0 rounded-none px-[10px] py-[4px] text-[11px] font-black text-white"
            style={{
              background: "rgba(255,255,255,.15)",
              border: "0.5px solid rgba(255,255,255,.12)",
            }}
          >
            12%
          </div>
        </div>
      </Link>
    </div>
  );
}

