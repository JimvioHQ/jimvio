import React from "react";
import Link from "next/link";
import {
  Users, MessageSquare, TrendingUp, DollarSign, Plus,
  Crown, Settings, Eye, Calendar, ArrowUpRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { getOwnerCommunities, getCommunityStats, getCommunityMembers, getCommunityPosts } from "@/services/db";
import { formatCurrency, formatNumber, timeAgo } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function DashboardCommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const communities = await getOwnerCommunities(user.id);

  if (communities.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Community Dashboard</h1>
        <div className="text-center py-24 bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl">
          <div className="h-20 w-20 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center mx-auto mb-6">
            <Users className="h-8 w-8 text-[var(--color-accent)]" />
          </div>
          <h3 className="text-2xl font-black text-[var(--color-text-primary)] mb-3">No Communities Yet</h3>
          <p className="text-[var(--color-text-secondary)] mb-8 max-w-sm mx-auto">Create your first community and start building your audience.</p>
          <Link href="/dashboard/community/create">
            <Button className="bg-[var(--color-accent)] text-white font-black h-12 px-8 rounded-2xl shadow-lg shadow-[var(--color-accent)]/20">
              <Plus className="h-4 w-4 mr-2" /> Create Community
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get stats for first community (primary)
  const primary = communities[0];
  const [stats, members, recentPosts] = await Promise.all([
    getCommunityStats(primary.id),
    getCommunityMembers(primary.id, 5),
    getCommunityPosts(primary.id, 5),
  ]);

  // Estimated monthly revenue
  const monthlyRevenue = (stats.memberCount || 0) * Number(stats.monthlyPrice || 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Community Dashboard</h1>
          <p className="text-sm text-[var(--color-text-muted)] font-medium mt-1">Manage your communities, members, and content.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/communities/${primary.slug}`}>
            <Button variant="outline" className="font-bold rounded-xl border-2">
              <Eye className="h-4 w-4 mr-2" /> View Public Page
            </Button>
          </Link>
          <Link href="/dashboard/community/create">
            <Button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black rounded-xl shadow-lg shadow-[var(--color-accent)]/20">
              <Plus className="h-4 w-4 mr-2" /> New Community
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: formatNumber(stats.memberCount), icon: <Users className="h-5 w-5" />, color: "text-blue-600 bg-blue-50" },
          { label: "Total Posts", value: formatNumber(stats.postCount), icon: <MessageSquare className="h-5 w-5" />, color: "text-purple-600 bg-purple-50" },
          { label: "Est. Monthly Revenue", value: formatCurrency(monthlyRevenue), icon: <DollarSign className="h-5 w-5" />, color: "text-emerald-600 bg-emerald-50" },
          { label: "Growth", value: "+12%", icon: <TrendingUp className="h-5 w-5" />, color: "text-[var(--color-accent)] bg-[var(--color-accent-light)]" },
        ].map((stat, i) => (
          <div key={i} className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all">
            <div className={`h-10 w-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-black text-[var(--color-text-primary)]">{stat.value}</p>
            <p className="text-[11px] font-bold text-[var(--color-text-muted)] capitalize tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-8">
        {/* Communities List */}
        <div className="space-y-6">
          <h2 className="text-lg font-black text-[var(--color-text-primary)] flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" /> Your Communities
          </h2>
          <div className="space-y-4">
            {communities.map((c: any) => (
              <div key={c.id} className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl p-5 flex items-center gap-5 hover:shadow-lg transition-all group">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-amber-600 flex items-center justify-center text-2xl shrink-0 overflow-hidden shadow-lg">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                  ) : "🚀"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-[var(--color-text-primary)] truncate">{c.name}</h3>
                  <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-muted)] font-bold mt-1">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.member_count || 0}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {c.post_count || 0}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {timeAgo(c.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/communities/${c.slug}`}>
                    <Button size="sm" variant="ghost" className="rounded-xl">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/dashboard/community/${c.id}/settings`}>
                    <Button size="sm" variant="ghost" className="rounded-xl">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Posts */}
          <h2 className="text-lg font-black text-[var(--color-text-primary)] flex items-center gap-2 pt-4">
            <Sparkles className="h-5 w-5 text-[var(--color-accent)]" /> Recent Posts
          </h2>
          {recentPosts.length > 0 ? (
            <div className="space-y-3">
              {recentPosts.map((post: any) => (
                <div key={post.id} className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl p-4 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-7 w-7 border border-[var(--color-border)]">
                      <AvatarImage src={post.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-[9px] font-black bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                        {post.profiles?.full_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">{post.profiles?.full_name || "Member"}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{timeAgo(post.created_at)}</span>
                  </div>
                  {post.title && <h4 className="font-bold text-sm text-[var(--color-text-primary)] mb-1">{post.title}</h4>}
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{post.body}</p>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--color-text-muted)] font-bold">
                    <span>❤️ {post.like_count || 0}</span>
                    <span>💬 {post.comment_count || 0}</span>
                    <span>👁 {post.view_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl">
              <p className="text-sm text-[var(--color-text-muted)]">No posts yet in your community.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Members */}
          <div className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-black text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--color-accent)]" /> Recent Members
            </h3>
            {members.length > 0 ? (
              <div className="space-y-3">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-[var(--color-border)]">
                      <AvatarImage src={m.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-[10px] font-black bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                        {m.profiles?.full_name?.[0] || "M"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{m.profiles?.full_name || "Member"}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Joined {timeAgo(m.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No members yet</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-ink-dark to-[#431407] rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-black mb-4 capitalize tracking-wider">Quick Actions</h3>
            <div className="space-y-2.5">
              {[
                { label: "Create Post", href: `/communities/${primary.slug}`, icon: <MessageSquare className="h-4 w-4" /> },
                { label: "Invite Members", href: "#", icon: <Users className="h-4 w-4" /> },
                { label: "Community Settings", href: `/dashboard/community/${primary.id}/settings`, icon: <Settings className="h-4 w-4" /> },
              ].map((action, i) => (
                <Link key={i} href={action.href}>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                    <span className="text-[var(--color-accent)]">{action.icon}</span>
                    <span className="text-sm font-bold flex-1">{action.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-white/30 group-hover:text-white transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
