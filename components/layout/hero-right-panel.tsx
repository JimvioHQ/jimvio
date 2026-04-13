import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Factory,
  Megaphone,
  TrendingUp,
  ChevronRight,
  Linkedin,
  LogOut,
  ShoppingBag,
  Settings,
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
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function HeroRightPanel({ profile }: HeroRightPanelProps) {
  const isLoggedIn = !!profile;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Main card ── */}
      <div
        className="rounded-2xl border border-white/50 bg-white/50 p-4 shadow-[0_8px_32px_-12px_rgba(26,20,40,0.16)] ring-1 ring-white/40 backdrop-blur-2xl"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 8px 32px -12px rgba(26,20,40,0.16)" }}
      >
        {isLoggedIn ? (
          <>
            <h4 className="text-[13px] font-black text-zinc-900 mb-0.5 leading-tight">Welcome back</h4>
            <p className="text-[11px] text-zinc-400 mb-3 font-medium">Continue your sourcing and growth.</p>

            {/* User row */}
            <div className="flex items-center gap-2.5 mb-3 p-2.5 bg-zinc-50/80 rounded-xl border border-zinc-100">
              <Avatar className="h-9 w-9 border border-orange-200/40 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-orange-500 text-white text-[11px] font-bold">
                  {(profile?.full_name || profile?.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black text-zinc-900 truncate">
                  {profile?.full_name || "Member"}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">{profile?.email}</p>
              </div>
            </div>

            {/* Dashboard CTA */}
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-1.5 w-full bg-orange-500/10 backdrop-blur-md border border-orange-500/30 text-orange-600 py-2.5 rounded-lg text-[12px] font-black transition-all shadow-sm active:scale-[0.98] mb-2 uppercase tracking-widest"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <Link
                href="/dashboard/orders"
                className="flex items-center justify-center gap-1 py-2 border border-zinc-100 rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-all font-bold text-[11px] text-zinc-700"
              >
                <ShoppingBag className="h-3 w-3" />
                Orders
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center justify-center gap-1 py-2 border border-zinc-100 rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-all font-bold text-[11px] text-zinc-700"
              >
                <Settings className="h-3 w-3" />
                Settings
              </Link>
            </div>

            {/* Sign out */}
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 w-full py-2 border border-zinc-100 rounded-lg hover:bg-zinc-50 text-[11px] font-bold text-zinc-400 transition-all"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <h4 className="text-[13px] font-black text-zinc-900 mb-0.5 leading-tight">Professional B2B Sourcing</h4>
            <p className="text-[11px] text-zinc-400 mb-3 font-medium leading-relaxed italic">Get personalized trade insights.</p>

            <Link
              href="/login"
              className="block w-full bg-orange-500/10 backdrop-blur-md border border-orange-500/30 text-orange-600 text-center py-2.5 rounded-lg text-[12px] font-black mb-2.5 transition-all shadow-sm active:scale-[0.98] uppercase tracking-widest"
            >
              Sign In
            </Link>

            <div className="text-center text-[11px] mb-3 font-bold text-zinc-500">
              New to Jimvio?{" "}
              <Link href="/register" className="text-orange-500 hover:underline">
                Join Free
              </Link>
            </div>

            {/* Divider */}
            <div className="relative text-center text-[9px] text-zinc-300 font-black uppercase tracking-[0.18em] my-3">
              <span className="relative z-10 bg-white/80 px-2.5">or access with</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-100" />
            </div>

            {/* OAuth row */}
            <div className="grid grid-cols-2 gap-1.5">
              <form action={signInWithGoogle}>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-1.5 w-full py-2 border border-zinc-100 rounded-lg hover:bg-zinc-50 hover:border-orange-200 transition-all font-bold text-[11px] text-zinc-700"
                >
                  <GoogleIcon /> Google
                </button>
              </form>
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 w-full py-2 border border-zinc-100 rounded-lg hover:bg-zinc-50 hover:border-orange-200 transition-all font-bold text-[11px] text-zinc-700"
              >
                <Linkedin className="h-3.5 w-3.5 text-[#0077b5]" /> LinkedIn
              </Link>
            </div>
          </>
        )}
      </div>

      {/* ── Quick actions grid ── */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={isLoggedIn ? "/dashboard/vendor/setup" : "/register?role=vendor"}
          className="group rounded-xl border border-white/50 bg-white/45 p-3.5 text-center shadow-sm ring-1 ring-white/30 backdrop-blur-xl transition-all hover:border-orange-300/50 hover:bg-orange-50/70 hover:shadow-md"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)" }}
        >
          <Factory className="h-5 w-5 text-orange-500 mx-auto mb-1.5 transition-transform group-hover:scale-110" />
          <div className="text-[11px] font-black text-zinc-800 mb-0.5">Supplier Store</div>
          <div className="text-[9px] text-orange-500 font-black uppercase tracking-widest flex items-center justify-center gap-0.5">
            Start <ChevronRight className="h-2.5 w-2.5" />
          </div>
        </Link>
        <Link
          href="/requests/new"
          className="group rounded-xl border border-white/50 bg-white/45 p-3.5 text-center shadow-sm ring-1 ring-white/30 backdrop-blur-xl transition-all hover:border-orange-300/50 hover:bg-orange-50/70 hover:shadow-md"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)" }}
        >
          <Megaphone className="h-5 w-5 text-orange-500 mx-auto mb-1.5 transition-transform group-hover:scale-110" />
          <div className="text-[11px] font-black text-zinc-800 mb-0.5">Post Lead</div>
          <div className="text-[9px] text-orange-500 font-black uppercase tracking-widest flex items-center justify-center gap-0.5">
            Quotes <ChevronRight className="h-2.5 w-2.5" />
          </div>
        </Link>
      </div>

      {/* ── Earn & Influence card ── */}
      <Link
        href="/affiliates"
        className="group relative overflow-hidden rounded-xl border border-white/15 p-4 shadow-md shadow-zinc-900/20 ring-1 ring-white/10 backdrop-blur-sm transition-all hover:brightness-[1.06]"
        style={{
          background: "linear-gradient(135deg, rgba(26,20,40,0.96) 0%, rgba(92,45,10,0.92) 55%, #f97316 100%)",
        }}
      >
        {/* BG icon */}
        <div className="absolute top-0 right-0 p-3 opacity-[0.08] pointer-events-none">
          <TrendingUp className="h-16 w-16 text-white" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-[16px] group-hover:scale-110 transition-transform ring-2 ring-white/10 shrink-0">
            $
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-[12px] font-black text-white leading-tight mb-0.5 uppercase tracking-tight">
              Earn & Influence
            </h5>
            <p className="text-[10px] text-white/60 font-bold">Uncapped Commissions</p>
          </div>
          <div className="bg-white/15 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded border border-white/10 shrink-0">
            12%
          </div>
        </div>
      </Link>

    </div>
  );
}