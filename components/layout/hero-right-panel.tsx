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
    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
    <div className="flex flex-col gap-5">
      {/* Main card: Sign In (guest) or Welcome back (logged in) */}
      <div className="rounded-2xl border border-white/50 bg-white/45 p-6 shadow-[0_12px_40px_-16px_rgba(26,20,40,0.2)] ring-1 ring-white/35 backdrop-blur-2xl [box-shadow:inset_0_1px_0_rgba(255,255,255,0.55)]">
        {isLoggedIn ? (
          <>
            <h4 className="text-[15px] font-black text-text-primary mb-1 leading-tight">Welcome back</h4>
            <p className="text-[12px] text-[#6b7280] mb-4 font-medium">Continue your sourcing and growth.</p>
            <div className="flex items-center gap-3 mb-4 p-3 bg-[#fafafa] rounded-xl border border-[#f0f0f0]">
              <Avatar className="h-11 w-11 border-2 border-[#f97316]/20">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#f97316] text-white text-sm font-bold">
                  {(profile?.full_name || profile?.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-text-primary truncate">
                  {profile?.full_name || "Member"}
                </p>
                <p className="text-[11px] text-[#6b7280] truncate">{profile?.email}</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full bg-[#f97316] hover:bg-[#ea580c] text-white py-3 rounded-lg text-[14px] font-black transition-all shadow-lg shadow-[#f97316]/20 active:scale-95 mb-3"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Link
                href="/dashboard/orders"
                className="flex items-center justify-center gap-1.5 py-2.5 border border-[#f0f0f0] rounded-lg hover:bg-[#fff7ed] hover:border-[#f97316] transition-all font-bold text-[12px] text-text-primary"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Orders
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center justify-center gap-1.5 py-2.5 border border-[#f0f0f0] rounded-lg hover:bg-[#fff7ed] hover:border-[#f97316] transition-all font-bold text-[12px] text-text-primary"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Link>
            </div>
            <form action={signOut} className="mt-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-[#f0f0f0] rounded-lg hover:bg-[#fafafa] hover:border-[#e5e7eb] text-[12px] font-bold text-[#6b7280] transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <h4 className="text-[15px] font-black text-text-primary mb-1 leading-tight">Professional B2B Sourcing</h4>
            <p className="text-[12px] text-[#6b7280] mb-4 font-medium leading-relaxed italic">Get personalized trade insights.</p>
            <Link
              href="/login"
              className="block w-full bg-[#f97316] hover:bg-[#ea580c] text-white text-center py-3 rounded-lg text-[14px] font-black mb-3 transition-all shadow-lg shadow-[#f97316]/20 active:scale-95"
            >
              Sign In
            </Link>
            <div className="text-center text-[12px] mb-4 font-bold">
              New to Jimvio?{" "}
              <Link href="/register" className="text-[#f97316] hover:underline">
                Join Free
              </Link>
            </div>
            <div className="relative text-center text-[10px] text-[#9ca3af] font-black uppercase tracking-[0.2em] my-5">
              <span className="relative z-10 bg-white px-3">or access with</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-[#f0f0f0]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <form action={signInWithGoogle}>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-[#f0f0f0] rounded-lg hover:bg-[#fafafa] hover:border-[#f97316] transition-all font-bold text-[12px]"
                >
                  <GoogleIcon /> Google
                </button>
              </form>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-[#f0f0f0] rounded-lg hover:bg-[#fafafa] hover:border-[#f97316] transition-all font-bold text-[12px]"
              >
                <Linkedin className="h-4 w-4 text-[#0077b5]" /> LinkedIn
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Quick actions: same for guest and logged in */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href={isLoggedIn ? "/dashboard/vendor/setup" : "/register?role=vendor"}
          className="group rounded-xl border border-white/45 bg-white/40 p-4 text-center shadow-sm ring-1 ring-white/30 backdrop-blur-xl transition-all hover:border-[#f97316]/45 hover:bg-[#fff7ed]/80 hover:shadow-md"
        >
          <Factory className="h-6 w-6 text-[#f97316] mx-auto mb-2 transition-transform group-hover:scale-110" />
          <div className="text-[12px] font-black text-text-primary mb-0.5">Supplier Store</div>
          <div className="text-[11px] text-[#f97316] font-black uppercase tracking-widest flex items-center justify-center gap-0.5">
            Start <ChevronRight className="h-3 w-3" />
          </div>
        </Link>
        <Link
          href="/requests/new"
          className="group rounded-xl border border-white/45 bg-white/40 p-4 text-center shadow-sm ring-1 ring-white/30 backdrop-blur-xl transition-all hover:border-[#f97316]/45 hover:bg-[#fff7ed]/80 hover:shadow-md"
        >
          <Megaphone className="h-6 w-6 text-[#f97316] mx-auto mb-2 transition-transform group-hover:scale-110" />
          <div className="text-[12px] font-black text-text-primary mb-0.5">Post Lead</div>
          <div className="text-[11px] text-[#f97316] font-black uppercase tracking-widest flex items-center justify-center gap-0.5">
            Quotes <ChevronRight className="h-3 w-3" />
          </div>
        </Link>
      </div>

      {/* Earn & Influence card */}
      <Link
        href="/affiliates"
        className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-[#1a1428]/95 via-[#5c2d0a]/90 to-[#f97316] p-5 shadow-lg shadow-[#1a1428]/30 ring-1 ring-white/15 backdrop-blur-sm transition-all hover:brightness-[1.06]"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <TrendingUp className="h-20 w-20 text-white" />
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-[20px] group-hover:scale-110 transition-transform ring-4 ring-white/5 shrink-0">
          $
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <h5 className="text-[13px] font-black text-white leading-tight mb-1 uppercase tracking-tight">
            Earn & Influence
          </h5>
          <p className="text-[11px] text-white/70 font-bold">Uncapped Commissions</p>
        </div>
        <div className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm border border-white/10 relative z-10 shrink-0">
          12%
        </div>
      </Link>
    </div>
  );
}
