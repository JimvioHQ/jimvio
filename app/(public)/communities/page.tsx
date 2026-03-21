import React from "react";
import Link from "next/link";
import {
  Users, Lock, Globe, Star, TrendingUp, Plus, Search,
  Sparkles, Crown, ArrowRight, MessageSquare, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCommunities } from "@/services/db";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

export const metadata = {
  title: "Communities",
  description: "Join paid communities led by experts, creators, and entrepreneurs on Jimvio.",
};

export default async function CommunitiesPage() {
  const communities = await getCommunities(24).catch(() => []);

  const featured = communities.filter((c: any) => c.is_featured);
  const regular = communities.filter((c: any) => !c.is_featured);
  const totalMembers = communities.reduce((s: number, c: any) => s + ((c.member_count as number) ?? 0), 0);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ink-dark via-[#2d1810] to-[#431407]" />
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="absolute -right-40 -top-40 w-[500px] h-[500px] bg-[var(--color-accent)] opacity-10 blur-[150px] rounded-full" />
        <div className="absolute -left-20 -bottom-20 w-[300px] h-[300px] bg-purple-500 opacity-10 blur-[120px] rounded-full" />

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-[2px] w-8 bg-[var(--color-accent)]" />
              <span className="text-[10px] font-black capitalize tracking-[0.4em] text-[var(--color-accent)]">Community Hub</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
              Join Expert-Led{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent)] to-amber-400">
                Communities
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/50 font-medium mb-10 max-w-lg leading-relaxed">
              Connect with creators, entrepreneurs, and industry leaders. Access exclusive content, mentorship, and networking.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-8 mb-10">
              {[
                { label: "Communities", value: communities.length, icon: <Users className="h-4 w-4" /> },
                { label: "Total Members", value: totalMembers, icon: <TrendingUp className="h-4 w-4" /> },
                { label: "Success Rate", value: "99%", icon: <Shield className="h-4 w-4" /> },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-[var(--color-accent)]">
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-xl font-black text-white">{typeof s.value === "number" ? formatNumber(s.value) : s.value}</p>
                    <p className="text-[10px] font-bold text-white/40 capitalize tracking-wider">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/communities/hub">
                <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 font-black h-14 px-8 rounded-2xl backdrop-blur-sm">
                  Community Hub
                </Button>
              </Link>
              <Link href="/dashboard/roles">
                <Button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black h-14 px-8 rounded-2xl shadow-2xl shadow-[var(--color-accent)]/20 hover:scale-[1.02] transition-all">
                  <Plus className="h-4 w-4 mr-2" /> Create Community
                </Button>
              </Link>
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search communities..."
                  className="w-full h-14 pl-11 pr-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/10 transition-all font-medium"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-12 space-y-16">

        {/* ── FEATURED ── */}
        {featured.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <Crown className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">Featured Communities</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {featured.map((c: any) => (
                <FeaturedCard key={c.id} community={c} />
              ))}
            </div>
          </section>
        )}

        {/* ── ALL COMMUNITIES ── */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
              <h2 className="text-xl font-black text-[var(--color-text-primary)] tracking-tight">All Communities</h2>
            </div>
          </div>

          {communities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {(regular.length > 0 ? regular : communities).map((c: any) => (
                <CommunityCard key={c.id} community={c} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl">
              <div className="h-20 w-20 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-[var(--color-accent)]" />
              </div>
              <h3 className="text-2xl font-black text-[var(--color-text-primary)] mb-3">No communities yet</h3>
              <p className="text-[var(--color-text-secondary)] mb-8 max-w-sm mx-auto">Be the first to create a paid community on Jimvio!</p>
              <Link href="/dashboard/roles">
                <Button className="bg-[var(--color-accent)] text-white font-black h-12 px-8 rounded-2xl">
                  <Plus className="h-4 w-4 mr-2" /> Create Your Community
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* ── CTA SECTION ── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-dark via-[#431407] to-[var(--color-accent)] p-12 md:p-16 text-white">
          <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-white/5 rounded-full blur-[60px]" />
          <div className="relative z-10 max-w-2xl">
            <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Ready to Build Your Community?</h3>
            <p className="text-white/50 text-lg font-medium mb-8 leading-relaxed">
              Monetize your expertise, build a loyal audience, and create recurring revenue with premium memberships.
            </p>
            <Link href="/dashboard/roles">
              <Button className="bg-white text-[var(--color-accent)] font-black h-14 px-10 rounded-2xl hover:bg-white/90 shadow-2xl transition-all hover:scale-[1.02]">
                Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeaturedCard({ community: c }: { community: any }) {
  const owner = c.profiles;
  return (
    <Link href={`/communities/${c.slug}`}>
      <div className="group relative bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
        {/* Cover */}
        <div className="h-40 bg-gradient-to-br from-[var(--color-accent)] via-amber-500 to-orange-600 relative overflow-hidden">
          {c.cover_image && (
            <img src={c.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/60 to-transparent" />
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/90 backdrop-blur text-white text-[10px] font-black rounded-full capitalize tracking-wider flex items-center gap-1.5">
              <Crown className="h-3 w-3" /> Featured
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/20 flex items-center justify-center text-2xl overflow-hidden shadow-xl">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover rounded-2xl" />
                ) : "🚀"}
              </div>
              <div>
                <h3 className="text-white font-black text-lg leading-tight">{c.name}</h3>
                <p className="text-white/60 text-xs font-bold">{c.category || "Community"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6 line-clamp-2">{c.description}</p>

          <div className="flex items-center gap-6 text-xs text-[var(--color-text-muted)] mb-6">
            <span className="flex items-center gap-1.5 font-bold">
              <Users className="h-3.5 w-3.5" /> {formatNumber(c.member_count || 0)} members
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <MessageSquare className="h-3.5 w-3.5" /> {formatNumber(c.post_count || 0)} posts
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              {c.is_private ? <><Lock className="h-3.5 w-3.5" /> Private</> : <><Globe className="h-3.5 w-3.5" /> Public</>}
            </span>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <div>
              {c.monthly_price ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[var(--color-accent)]">{formatCurrency(Number(c.monthly_price))}</span>
                  <span className="text-xs text-[var(--color-text-muted)] font-bold">/mo</span>
                </div>
              ) : (
                <span className="text-lg font-black text-emerald-600">Free</span>
              )}
            </div>
            <Button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black rounded-2xl px-6 shadow-lg shadow-[var(--color-accent)]/20 transition-all group-hover:scale-105">
              Join Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CommunityCard({ community: c }: { community: any }) {
  const owner = c.profiles;
  return (
    <Link href={`/communities/${c.slug}`}>
      <div className="group bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 h-full flex flex-col">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-amber-600 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-[var(--color-accent)]/10 overflow-hidden">
            {c.avatar_url ? (
              <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover rounded-2xl" />
            ) : "👥"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent)] transition-colors">{c.name}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {c.category && (
                <span className="px-2.5 py-0.5 bg-[var(--color-accent-light)] text-[var(--color-accent)] text-[10px] font-black rounded-full capitalize tracking-wider">{c.category}</span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] font-bold">
                {c.is_private ? <><Lock className="h-2.5 w-2.5" /> Private</> : <><Globe className="h-2.5 w-2.5" /> Public</>}
              </span>
            </div>
          </div>
        </div>

        {c.description && (
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4 flex-1 line-clamp-2">{c.description}</p>
        )}

        {owner && (
          <div className="flex items-center gap-2 mb-4">
            <Avatar className="h-5 w-5 border border-[var(--color-border)]">
              <AvatarImage src={owner.avatar_url || ""} />
              <AvatarFallback className="text-[8px] font-black bg-[var(--color-accent-light)] text-[var(--color-accent)]">{owner.full_name?.[0] || "C"}</AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-[var(--color-text-muted)] font-medium">by <strong>{owner.full_name || "Creator"}</strong></span>
          </div>
        )}

        <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-muted)] font-bold mb-4">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {formatNumber(c.member_count || 0)}</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {formatNumber(c.post_count || 0)} posts</span>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] mt-auto">
          <div>
            {c.monthly_price ? (
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-[var(--color-accent)]">{formatCurrency(Number(c.monthly_price))}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] font-bold">/mo</span>
              </div>
            ) : (
              <span className="font-black text-emerald-600">Free</span>
            )}
          </div>
          <Button size="sm" className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black rounded-xl px-5 shadow-lg shadow-[var(--color-accent)]/10 transition-all">
            Join
          </Button>
        </div>
      </div>
    </Link>
  );
}
