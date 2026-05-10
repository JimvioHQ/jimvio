//   );
// }

"use client"
import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, TrendingUp, Link2, Megaphone, Users, DollarSign,
  ShoppingBag, Heart, BookOpen, Globe, MessageSquare, Bell, Settings,
  HelpCircle, Plus, Search, ChevronDown, ChevronRight, ChevronUp,
  Zap, Video, BarChart3, Wallet, Package, Truck, Layers,
  FileText, Camera, Radio, Store, Target, Activity,
  Eye, EyeOff, ArrowUpRight, ArrowRight, Star, Flame,
  Check, X, Menu, Shield, Lock, LogOut, UserCircle,
  Bookmark, PlayCircle, Wifi, Circle, Hash
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const earningsData = [
  { date: "May 1", affiliate: 120, ugc: 80, marketplace: 40, communities: 20 },
  { date: "May 4", affiliate: 200, ugc: 140, marketplace: 60, communities: 30 },
  { date: "May 7", affiliate: 180, ugc: 200, marketplace: 80, communities: 40 },
  { date: "May 10", affiliate: 320, ugc: 260, marketplace: 100, communities: 50 },
  { date: "May 13", affiliate: 280, ugc: 300, marketplace: 120, communities: 55 },
  { date: "May 16", affiliate: 420, ugc: 360, marketplace: 140, communities: 65 },
  { date: "May 19", affiliate: 500, ugc: 400, marketplace: 160, communities: 70 },
  { date: "May 22", affiliate: 460, ugc: 380, marketplace: 155, communities: 68 },
  { date: "May 25", affiliate: 540, ugc: 420, marketplace: 170, communities: 72 },
  { date: "May 28", affiliate: 600, ugc: 460, marketplace: 185, communities: 78 },
  { date: "May 31", affiliate: 620, ugc: 480, marketplace: 190, communities: 80 },
];

const miniChartUp = [
  { v: 30 }, { v: 45 }, { v: 38 }, { v: 60 }, { v: 55 }, { v: 75 }, { v: 80 },
];
const miniChartDown = [
  { v: 80 }, { v: 70 }, { v: 75 }, { v: 60 }, { v: 65 }, { v: 50 }, { v: 55 },
];
const miniChartFlat = [
  { v: 50 }, { v: 55 }, { v: 48 }, { v: 52 }, { v: 58 }, { v: 54 }, { v: 60 },
];

const topCampaigns = [
  {
    name: "Nike UGC Campaign",
    tags: ["UGC", "Beginner"],
    img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop",
    joined: 124,
    earn: "$1,200",
    fill: 80,
    spots: "80% filled",
  },
  {
    name: "Skincare Routine",
    tags: ["UGC", "Easy"],
    img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=80&h=80&fit=crop",
    joined: 89,
    earn: "$850",
    fill: 60,
    spots: "12 spots left",
  },
];

const trendingProducts = [
  {
    name: "Canon EOS M50 Mark II",
    category: "Electronics",
    price: "$599.00",
    commission: "12% Commission",
    sold: "1.2k sold",
    img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=80&h=80&fit=crop",
  },
  {
    name: "Smart Watch Series 8",
    category: "Accessories",
    price: "$199.00",
    commission: "15% Commission",
    sold: "892 sold",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop",
  },
];

const communities = [
  {
    name: "Content Creators Hub",
    members: "2.4k members",
    online: "134 online",
    msg: "Sarah: New viral strategy dropped 🔥",
    time: "2m ago",
    unread: 1,
    color: "#f97316",
    avatar: "CC",
  },
  {
    name: "Entrepreneur Network",
    members: "1.8k members",
    online: "98 online",
    msg: "Mike: Let's collaborate!",
    time: "15m ago",
    unread: 0,
    color: "#818cf8",
    avatar: "EN",
  },
  {
    name: "Digital Marketing Pros",
    members: "3.1k members",
    online: "156 online",
    msg: "Jen: New tool recommendation",
    time: "1h ago",
    unread: 1,
    color: "#34d399",
    avatar: "DM",
  },
];

const recentActivity = [
  { icon: "sale", title: "New sale from your link", sub: "You earned $24.50", time: "2m ago", amount: "+$24.50", color: "#34d399" },
  { icon: "campaign", title: "Campaign submission approved", sub: "Skincare Routine – UGC Campaign", time: "15m ago", amount: "+$35.00", color: "#34d399" },
  { icon: "payout", title: "Payout initiated", sub: "Withdrawal to PayPal", time: "1h ago", amount: "-$320.00", color: "#f87171" },
  { icon: "community", title: "New community member", sub: "Sarah joined your community", time: "2h ago", amount: null, color: "#818cf8" },
];

const trendingCampaigns = [
  { name: "Nike UGC Campaign", earn: "$1,200", tag: "Trending", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=48&h=48&fit=crop" },
  { name: "Skincare Routine UGC", earn: "$850", tag: "Hot", img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=48&h=48&fit=crop" },
  { name: "Tech Gadgets Review", earn: "$650", tag: "New", img: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=48&h=48&fit=crop" },
];

const recommendedCreators = [
  { name: "Alexandra John", badge: "Top Creator", color: "#f97316" },
  { name: "Mike Thomas", badge: "Tech Creator", color: "#818cf8" },
  { name: "Sophie Kim", badge: "UGC Expert", color: "#34d399" },
];

const recentSearches = [
  "Canon EOS M50 Mark II",
  "Content Creators Hub",
  "Skincare Campaign Routine",
];

const quickActions = [
  { label: "Create Product" },
  { label: "Start Campaign" },
  { label: "Create Post" },
  { label: "Go Live", accent: true },
];

const liveTicker = [
  "Kevin earned $84",
  "New UGC campaign launched",
  "Sarah joined Tech Creators Hub",
  "Mike earned $120",
  "New product added by Alex",
];

// ─── Sidebar sections ─────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    key: "earn", label: "Earn", icon: DollarSign,
    items: [
      { label: "Earnings", icon: TrendingUp },
      { label: "Affiliate Links", icon: Link2 },
      { label: "Campaigns", icon: Megaphone, badge: "New" },
      { label: "Creator Missions", icon: Target },
      { label: "Withdrawals", icon: Wallet },
    ],
  },
  {
    key: "marketplace", label: "Marketplace", icon: ShoppingBag,
    items: [
      { label: "Browse Products", icon: Package },
      { label: "Orders", icon: Truck },
      { label: "Wishlist", icon: Heart },
      { label: "Digital Library", icon: BookOpen },
    ],
  },
  {
    key: "communities", label: "Communities", icon: Users,
    items: [
      { label: "Explore Communities", icon: Globe },
      { label: "My Communities", icon: Users },
      { label: "Messages", icon: MessageSquare, badge: "3" },
      { label: "Notifications", icon: Bell, badge: "8" },
    ],
  },
  {
    key: "creator", label: "Creator Tools", icon: Video,
    items: [
      { label: "Posts & Content", icon: FileText },
      { label: "Analytics", icon: BarChart3 },
      { label: "Growth Tools", icon: Zap },
    ],
  },
  {
    key: "seller", label: "Seller Hub", icon: Store,
    items: [
      { label: "My Store", icon: Store },
      { label: "Products", icon: Package },
      { label: "Revenue", icon: DollarSign },
      { label: "Customers", icon: Users },
    ],
  },
  {
    key: "account", label: "Account", icon: UserCircle,
    items: [
      { label: "Settings", icon: Settings },
      { label: "Security", icon: Shield },
      { label: "Help Center", icon: HelpCircle },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MiniChart({ data, color, negative }: { data: { v: number }[]; color: string; negative?: boolean }) {
  return (
    <ResponsiveContainer width={80} height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`mg-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#mg-${color})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function TagBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    UGC: "bg-orange-100 text-orange-600",
    Beginner: "bg-green-100 text-green-600",
    Easy: "bg-blue-100 text-blue-600",
    "Beginner Friendly": "bg-green-100 text-green-600",
    "Clipping Allowed": "bg-purple-100 text-purple-600",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[label] || "bg-gray-100 text-gray-600"}`}>
      {label}
    </span>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string; Icon: React.ElementType }> = {
    sale: { bg: "bg-green-100", color: "text-green-600", Icon: ShoppingBag },
    campaign: { bg: "bg-orange-100", color: "text-orange-500", Icon: Camera },
    payout: { bg: "bg-blue-100", color: "text-blue-600", Icon: Wallet },
    community: { bg: "bg-purple-100", color: "text-purple-600", Icon: Users },
  };
  const { bg, color, Icon } = map[type] ?? map.sale;
  return (
    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function JimvioDashboard() {
  const [activeSection, setActiveSection] = useState<string | null>("earn");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [chartFilter, setChartFilter] = useState("All");
  const [chartPeriod, setChartPeriod] = useState("This Month");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState("Affiliate");
  const [tickerIdx, setTickerIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  // Streak
  const streak = 4;

  // Ticker animation
  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % liveTicker.length), 3000);
    return () => clearInterval(t);
  }, []);

  const roles = ["Buyer", "Affiliate", "Seller", "Creator", "Community Owner"];

  const chartColors = {
    affiliate: "#f97316",
    ugc: "#818cf8",
    marketplace: "#38bdf8",
    communities: "#34d399",
  };

  const chartFilters = ["All", "Affiliate", "UGC", "Marketplace", "Communities"];

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }} className="flex flex-col h-screen bg-gray-50 overflow-hidden text-gray-900">


      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">


        {/* ── Left panel (trending/search) ── */}
        <div className="w-[200px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {/* Trending campaigns */}
          <div className="p-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Trending campaigns</h3>
            <div className="space-y-3">
              {trendingCampaigns.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5 cursor-pointer group">
                  <img src={c.img} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-gray-800 truncate leading-tight">{c.name}</p>
                    <p className="text-[11px] text-green-600 font-bold">Earn up to {c.earn}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${
                      c.tag === "Trending" ? "bg-orange-100 text-orange-600" :
                      c.tag === "Hot" ? "bg-red-100 text-red-500" :
                      "bg-blue-100 text-blue-600"
                    }`}>{c.tag}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 mx-4" />

          {/* Recent searches */}
          <div className="p-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Recent searches</h3>
            <div className="space-y-2">
              {recentSearches.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                  <Search className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 mx-4" />

          {/* Recommended creators */}
          <div className="p-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Recommended creators</h3>
            <div className="space-y-2.5">
              {recommendedCreators.map((c, i) => (
                <div key={i} className="flex items-center gap-2 cursor-pointer group">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {c.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-gray-800 truncate leading-tight">{c.name}</p>
                    <span className="text-[9px] font-bold text-orange-500">● {c.badge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="p-4 mt-auto">
            <div className="h-px bg-gray-100 mb-3" />
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Quick actions</h3>
            <div className="space-y-1.5">
              {quickActions.map((a, i) => (
                <button key={i} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${a.accent ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  <Plus className="h-3 w-3" />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="p-5 space-y-5 max-w-[1000px]">

            {/* ── Welcome banner ── */}
            <div>
              <h1 className="text-2xl font-black text-gray-900">Welcome back, Jean Claude! 👋</h1>
              <p className="text-sm text-gray-500 mt-0.5">Here's what's happening today.</p>
            </div>

            {/* ── Hero feature card (Nike UGC) ── */}
            <div className="relative rounded-2xl overflow-hidden bg-gray-900 text-white" style={{ minHeight: 220 }}>
              <img
                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&h=300&fit=crop"
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/60 to-transparent" />

              {/* Quick stat row on top */}
              <div className="relative z-10 flex items-center gap-3 px-5 pt-4">
                {[
                  { icon: DollarSign, label: "You earned", val: "$124 today", trend: "18% vs yesterday", up: true, color: "text-green-400" },
                  { icon: Target, label: "3 new", val: "campaign opportunities", trend: "2 vs yesterday", up: true, color: "text-blue-400" },
                  { icon: Link2, label: "5 affiliate clicks", val: "in the last hour", trend: "40% vs last hour", up: false, color: "text-red-400" },
                  { icon: Star, label: "Level 4 Creator", val: "320 / 500 XP", trend: null, progress: 64, color: "text-orange-400" },
                ].map((s, i) => (
                  <div key={i} className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                      <span className="text-[11px] font-semibold text-white/80">{s.label}</span>
                    </div>
                    <p className="text-sm font-black text-white leading-tight">{s.val}</p>
                    {s.trend && (
                      <p className={`text-[10px] font-semibold mt-1 ${s.up ? "text-green-400" : "text-red-400"}`}>
                        {s.up ? "↑" : "↓"} {s.trend}
                      </p>
                    )}
                    {s.progress !== undefined && (
                      <div className="mt-1.5 h-1 bg-white/20 rounded-full">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${s.progress}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Nike campaign content */}
              <div className="relative z-10 px-5 pt-4 pb-5 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Radio className="h-2.5 w-2.5" /> TRENDING NOW
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white mb-1">Nike UGC Campaign 🏃</h2>
                  <p className="text-sm text-white/70 mb-3">Create authentic content. Earn big.</p>
                  <div className="flex items-center gap-2 mb-3">
                    {["UGC", "Beginner Friendly", "Clipping Allowed"].map(t => <TagBadge key={t} label={t} />)}
                  </div>
                  <div className="flex items-center gap-6">
                    <div><p className="text-xl font-black text-white">124</p><p className="text-[10px] text-white/60">Creators Joined</p></div>
                    <div><p className="text-xl font-black text-white">18</p><p className="text-[10px] text-white/60">Spots Left</p></div>
                    <div><p className="text-xl font-black text-white">$4,820</p><p className="text-[10px] text-white/60">Already Paid</p></div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex -space-x-1.5">
                      {["JD","MK","SR","AB"].map((i,n) => (
                        <div key={n} className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-[9px] text-white font-bold border-2 border-gray-900">{i}</div>
                      ))}
                    </div>
                    <span className="text-[11px] text-white/60">+18 joined today</span>
                    <div className="h-1.5 w-20 bg-white/20 rounded-full ml-2">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: "80%" }} />
                    </div>
                    <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1"><Circle className="h-2 w-2 fill-current" /> Live total</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-[11px] text-white/60 mb-1">Earn up to</p>
                  <p className="text-3xl font-black text-orange-400">$1,200</p>
                  <p className="text-[10px] text-white/50 mb-3">This week</p>
                  <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
                    View Campaign <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── KPI cards row ── */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Pending Payouts", val: "$320.00", trend: "+12% vs last week", up: true, chart: miniChartUp, color: "#f97316" },
                { label: "Active Links", val: "28", trend: "+8% vs last week", up: true, chart: miniChartUp, color: "#818cf8" },
                { label: "Campaigns Joined", val: "7", trend: "2 vs last week", up: true, chart: miniChartFlat, color: "#38bdf8" },
                { label: "Communities", val: "12", trend: "+3 vs last week", up: true, chart: miniChartUp, color: "#34d399" },
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 mb-1">{kpi.label}</p>
                      <p className="text-2xl font-black text-gray-900">{kpi.val}</p>
                      <p className={`text-[11px] font-semibold mt-1 ${kpi.up ? "text-green-500" : "text-red-500"}`}>
                        {kpi.up ? "↑" : "↓"} {kpi.trend}
                      </p>
                    </div>
                    <MiniChart data={kpi.chart} color={kpi.color} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Earnings chart ── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                    Earnings Overview
                    <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <HelpCircle className="h-3 w-3 text-gray-400" />
                    </span>
                  </h3>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    $1,240.50
                    <span className="text-sm font-semibold text-green-500 ml-2">↑ 18.6% vs last month</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {chartFilters.map(f => (
                      <button
                        key={f}
                        onClick={() => setChartFilter(f)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${chartFilter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                    {chartPeriod} <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-3">
                {Object.entries(chartColors).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-gray-500 capitalize">{key}</span>
                  </div>
                ))}
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={earningsData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                      {Object.entries(chartColors).map(([key, color]) => (
                        <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 12 }}
                      formatter={(value, name) => [`$${value}`, (name as string).charAt(0).toUpperCase() + (name as string).slice(1)]}
                    />
                    {Object.entries(chartColors).map(([key, color]) => (
                      <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} fill={`url(#grad-${key})`} dot={false} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Tooltip detail */}
              <div className="mt-3 flex items-center gap-8 text-[11px] text-gray-500 border-t border-gray-100 pt-3">
                <span><span className="font-bold text-orange-500">$620.00</span> Affiliate</span>
                <span><span className="font-bold text-purple-500">$420.00</span> UGC Campaigns</span>
                <span><span className="font-bold text-sky-500">$180.00</span> Marketplace</span>
                <span><span className="font-bold text-green-500">$80.00</span> Communities</span>
                <span className="ml-auto font-black text-gray-900">Total $1,300.00</span>
              </div>
            </div>

            {/* ── Quick actions bar ── */}
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Create Affiliate Link", sub: "Promote any product", icon: Link2, color: "bg-orange-50 text-orange-500 border-orange-200" },
                { label: "Join Campaign", sub: "Earn with UGC content", icon: Megaphone, color: "bg-purple-50 text-purple-500 border-purple-200" },
                { label: "Browse Products", sub: "Find products to promote", icon: ShoppingBag, color: "bg-blue-50 text-blue-500 border-blue-200" },
                { label: "Create Post", sub: "Share with your audience", icon: FileText, color: "bg-green-50 text-green-500 border-green-200" },
                { label: "Request Withdrawal", sub: "Withdraw your earnings", icon: Wallet, color: "bg-rose-50 text-rose-500 border-rose-200" },
              ].map((a, i) => (
                <button key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${a.color} hover:opacity-90 transition-opacity text-left`}>
                  <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                    <a.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold leading-tight truncate">{a.label}</p>
                    <p className="text-[10px] opacity-70 truncate">{a.sub}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto flex-shrink-0 opacity-60" />
                </button>
              ))}
            </div>

            {/* ── Bottom grid: campaigns + products + communities ── */}
            <div className="grid grid-cols-3 gap-5">

              {/* Top Campaigns */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-gray-900">Top Campaigns</h3>
                  <button className="text-[11px] font-bold text-orange-500 hover:text-orange-600 transition-colors">View all</button>
                </div>
                <div className="space-y-3">
                  {topCampaigns.map((c, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center gap-3 mb-3">
                        <img src={c.img} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-gray-900 truncate">{c.name}</p>
                          <div className="flex gap-1 mt-0.5">
                            {c.tags.map(t => <TagBadge key={t} label={t} />)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex -space-x-1.5">
                          {["A","B","C"].map((x,n) => (
                            <div key={n} className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center text-[8px] text-white font-bold border border-white">{x}</div>
                          ))}
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-600 font-bold border border-white">+{c.joined}</div>
                        </div>
                        <span className="text-[11px] font-black text-green-600">Earn up to {c.earn}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full mb-1">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${c.fill}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-500 font-semibold">{c.spots}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending Products */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-gray-900">Trending Products</h3>
                  <button className="text-[11px] font-bold text-orange-500 hover:text-orange-600 transition-colors">View all</button>
                </div>
                <div className="space-y-3">
                  {trendingProducts.map((p, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                      <img src={p.img} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-gray-900 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-500 mb-1">{p.category}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-black text-gray-900">{p.price}</span>
                          <span className="text-[10px] font-bold text-orange-500">🔥 {p.commission}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{p.sold}</p>
                      </div>
                    </div>
                  ))}
                  <div className="bg-orange-50 rounded-xl border border-orange-200 p-3 text-center">
                    <p className="text-[12px] font-bold text-orange-600">+24 more trending products</p>
                    <button className="mt-1.5 flex items-center gap-1 text-[11px] font-black text-orange-500 mx-auto hover:text-orange-600 transition-colors">
                      Explore all <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Your Communities */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-gray-900">Your Communities</h3>
                  <button className="text-[11px] font-bold text-orange-500 hover:text-orange-600 transition-colors">View all</button>
                </div>
                <div className="space-y-2.5">
                  {communities.map((c, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0" style={{ backgroundColor: c.color }}>
                          {c.avatar}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] font-bold text-gray-900 truncate">{c.name}</p>
                            <span className="text-[10px] text-gray-400">{c.time}</span>
                          </div>
                          <p className="text-[10px] text-gray-500">{c.members} • {c.online}</p>
                        </div>
                        {c.unread > 0 && (
                          <span className="w-4 h-4 bg-orange-500 rounded-full text-[9px] font-black text-white flex items-center justify-center flex-shrink-0">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{c.msg}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ── Right panel (activity) ── */}
        <div className="w-[220px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent Activity</h3>
              <button className="text-[10px] font-bold text-orange-500">View all</button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <ActivityIcon type={a.icon} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-gray-800 leading-tight">{a.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{a.sub}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400">{a.time}</span>
                      {a.amount && (
                        <span className={`text-[11px] font-black ${a.amount.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                          {a.amount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Live ticker ── */}
      <div className="flex-shrink-0 h-9 bg-gray-900 text-white flex items-center overflow-hidden border-t border-gray-700">
        <div className="flex items-center gap-2 px-3 bg-orange-500 h-full flex-shrink-0">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">LIVE</span>
        </div>
        <div className="flex-1 flex items-center overflow-hidden px-4">
          <div className="flex items-center gap-8 animate-marquee" style={{
            animation: "marquee 30s linear infinite",
            whiteSpace: "nowrap",
          }}>
            {[...liveTicker, ...liveTicker, ...liveTicker].map((t, i) => (
              <span key={i} className="text-[11px] font-semibold text-gray-300 flex items-center gap-2">
                <span className="w-1 h-1 bg-orange-400 rounded-full" />
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="px-3 flex items-center gap-4 text-[11px] text-gray-400 flex-shrink-0">
          <Wifi className="h-3 w-3 text-green-400" />
          <span>8,447 users online</span>
        </div>
      </div>
    </div>
  );
}
