// "use client";

// import React, { useCallback, useEffect, useRef, useState } from "react";
// import Image from "next/image";
// import Link from "next/link";
// import {
//   Search, Loader2, Users, Flame, Sparkles, Crown, TrendingUp,
//   ArrowRight, Star, Zap, Globe, Lock, Gift, BadgeCheck, X,
//   SlidersHorizontal, ChevronDown, Plus,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { cn, formatNumber } from "@/lib/utils";
// import { SharedCommunityCard, CommunityRow } from "./community-card-shared";

// const CATEGORIES = [
//   { label: "All", icon: Globe },
//   { label: "Business", icon: TrendingUp },
//   { label: "Tech", icon: Zap },
//   { label: "Marketing", icon: Flame },
//   { label: "Finance", icon: Star },
//   { label: "Fitness", icon: Sparkles },
//   { label: "Other", icon: Gift },
// ] as const;

// type SortKey = "popular" | "newest" | "free";

// const SORT_OPTIONS: { value: SortKey; label: string }[] = [
//   { value: "popular", label: "Most Popular" },
//   { value: "newest", label: "Newest" },
//   { value: "free", label: "Free First" },
// ];

// function sortCommunities(list: CommunityRow[], sort: SortKey): CommunityRow[] {
//   const copy = [...list];
//   if (sort === "popular") copy.sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0));
//   else if (sort === "newest") copy.sort((a, b) => (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0));
//   else copy.sort((a, b) => (a.is_free ? 0 : 1) - (b.is_free ? 0 : 1));
//   return copy;
// }

// function SkeletonCard() {
//   return (
//     <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden animate-pulse">
//       <div className="h-44 bg-[var(--color-surface-secondary)]" />
//       <div className="p-5 pt-10 space-y-3">
//         <div className="h-5 bg-[var(--color-surface-secondary)] rounded-sm w-3/4" />
//         <div className="h-3 bg-[var(--color-surface-secondary)] rounded-sm w-full" />
//         <div className="h-3 bg-[var(--color-surface-secondary)] rounded-sm w-2/3" />
//         <div className="flex gap-2 pt-1">
//           <div className="h-8 bg-[var(--color-surface-secondary)] rounded-sm flex-1" />
//           <div className="h-8 bg-[var(--color-surface-secondary)] rounded-sm w-24" />
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ─── Featured Hero Card (top community spotlight) ─── */
// function FeaturedCard({ c }: { c: CommunityRow }) {
//   return (
//     <Link
//       href={`/communities/${c.slug}`}
//       className="group relative col-span-full lg:col-span-2 rounded-sm overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] min-h-[280px] flex flex-col justify-end shadow-none hover:shadow-none transition-all duration-300 hover:-translate-y-0.5"
//     >
//       {/* BG image */}
//       <div className="absolute inset-0">
//         {c.cover_image ? (
//           <Image src={c.cover_image} alt="" fill className="object-cover" sizes="60vw" unoptimized />
//         ) : (
//           <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)]" />
//         )}
//         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
//       </div>

//       {/* Hot badge */}
//       <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-none">
//         <Flame size={11} className="animate-pulse" /> Featured
//       </div>

//       {/* Content */}
//       <div className="relative z-10 p-6 flex items-end gap-4">
//         <div className="h-16 w-16 rounded-sm border-2 border-white/30 bg-black/20 overflow-hidden shrink-0 shadow-none">
//           {c.avatar_url ? (
//             <Image src={c.avatar_url} alt="" width={64} height={64} className="object-cover h-full w-full" unoptimized />
//           ) : (
//             <div className="h-full w-full flex items-center justify-center text-white font-black text-xl">{c.name?.[0]}</div>
//           )}
//         </div>
//         <div className="flex-1 min-w-0">
//           <div className="flex items-center gap-2 flex-wrap">
//             <h2 className="font-black text-white text-xl leading-tight">{c.name}</h2>
//             <BadgeCheck size={16} className="text-sky-400 shrink-0" />
//           </div>
//           <p className="text-white/70 text-sm mt-0.5 line-clamp-1">{c.tagline}</p>
//           <div className="flex items-center gap-3 mt-2">
//             <span className="flex items-center gap-1 text-white/60 text-xs">
//               <Users size={12} /> {formatNumber(c.member_count ?? 0)} members
//             </span>
//             {c.is_free ? (
//               <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">FREE</span>
//             ) : (
//               <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-white dark:bg-surface/10 text-white/70 border border-white/20">
//                 From {c.currency || "$"}{Number(c.monthly_price ?? 0).toFixed(0)}/mo
//               </span>
//             )}
//           </div>
//         </div>
//         <div className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-sm bg-white dark:bg-surface text-[var(--color-accent)] font-black text-sm group-hover:bg-[var(--color-accent)] group-hover:text-white transition-all shadow-none">
//           Join <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
//         </div>
//       </div>
//     </Link>
//   );
// }

// /* ─── CTA Banner ─── */
// function CreateCTACard() {
//   return (
//     <div className="rounded-sm border border-dashed border-[var(--color-accent)]/40 bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-surface-secondary)] p-6 flex flex-col gap-3 items-start justify-between min-h-[200px]">
//       <div>
//         <div className="h-10 w-10 rounded-sm bg-[var(--color-accent)] flex items-center justify-center text-white mb-3 shadow-none shadow-[var(--color-accent)]/25">
//           <Crown size={20} />
//         </div>
//         <h3 className="font-black text-[var(--color-text-primary)] text-base leading-tight">
//           Launch your own community
//         </h3>
//         <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
//           Build, grow, and monetize your audience. Start free — no credit card required.
//         </p>
//       </div>
//       <Button
//         asChild
//         size="sm"
//         className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black shadow-none shadow-[var(--color-accent)]/30 hover:shadow-none transition-all hover:-translate-y-0.5"
//       >
//         <Link href="/communities/create">
//           <Plus size={14} className="mr-1" /> Create Community
//         </Link>
//       </Button>
//     </div>
//   );
// }

// /* ─── Stats Banner ─── */
// function StatsBanner({ total }: { total: number }) {
//   const stats = [
//     { label: "Communities", value: formatNumber(total), icon: Globe },
//     { label: "Active Members", value: "12K+", icon: Users },
//     { label: "Launched Today", value: "3", icon: Flame },
//   ];
//   return (
//     <div className="grid grid-cols-3 gap-3 mb-8">
//       {stats.map(({ label, value, icon: Icon }) => (
//         <div key={label} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center gap-3">
//           <div className="h-9 w-9 rounded-sm bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
//             <Icon size={16} />
//           </div>
//           <div>
//             <p className="font-black text-[var(--color-text-primary)] text-base leading-none">{value}</p>
//             <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-semibold">{label}</p>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }



// /* ─── Main Component ─── */
// export function CommunitiesDiscovery() {
//   const [search, setSearch] = useState("");
//   const [debounced, setDebounced] = useState("");
//   const [category, setCategory] = useState("All");
//   const [sort, setSort] = useState<SortKey>("popular");
//   const [page, setPage] = useState(1);
//   const [total, setTotal] = useState(0);
//   const [items, setItems] = useState<CommunityRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [filtersOpen, setFiltersOpen] = useState(false);
//   const sortRef = useRef(sort);
//   sortRef.current = sort;

//   useEffect(() => {
//     const t = setTimeout(() => setDebounced(search.trim()), 350);
//     return () => clearTimeout(t);
//   }, [search]);

//   const fetchPage = useCallback(async (p: number, append: boolean) => {
//     const params = new URLSearchParams();
//     params.set("page", String(p));
//     if (debounced) params.set("search", debounced);
//     if (category !== "All") params.set("category", category);
//     const res = await fetch(`/api/communities?${params.toString()}`);
//     const json = await res.json() as { communities?: CommunityRow[]; total?: number; error?: string };
//     if (!res.ok) throw new Error(json.error || "Failed to load");
//     const raw = json.communities ?? [];
//     const sk = sortRef.current;
//     if (append) setItems((prev) => sortCommunities([...prev, ...raw], sk));
//     else setItems(sortCommunities(raw, sk));
//     setTotal(json.total ?? 0);
//   }, [debounced, category]);

//   useEffect(() => {
//     setPage(1);
//     setLoading(true);
//     fetchPage(1, false).catch(() => setItems([])).finally(() => setLoading(false));
//   }, [debounced, category, fetchPage]);

//   useEffect(() => {
//     setItems((prev) => sortCommunities(prev, sort));
//   }, [sort]);

//   const loadMore = async () => {
//     const next = page + 1;
//     setLoadingMore(true);
//     try { await fetchPage(next, true); setPage(next); }
//     finally { setLoadingMore(false); }
//   };

//   const hasMore = items.length < total;
//   const featured = items[0] ?? null;
//   const rest = items.slice(1);

//   const activeFilters = [
//     category !== "All" && category,
//     sort !== "popular" && SORT_OPTIONS.find(s => s.value === sort)?.label,
//     debounced && `"${debounced}"`,
//   ].filter(Boolean) as string[];

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)]">
//       <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 py-6 sm:py-10">

//         {/* ── Hero Header ── */}
//         <header className="mb-8">
//           <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
//             <div>
//               <div className="flex items-center gap-2 mb-2">
//                 <div className="h-8 w-8 rounded-sm bg-[var(--color-accent)] flex items-center justify-center">
//                   <Globe size={16} className="text-white" />
//                 </div>
//                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)]">Discover</span>
//               </div>
//               <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text-primary)] tracking-tight leading-tight">
//                 Find Your Community
//               </h1>
//               <p className="mt-1.5 text-sm text-[var(--color-text-muted)] font-medium max-w-md">
//                 Join thousands learning, earning and growing together.
//               </p>
//             </div>
//             <Button
//               asChild
//               className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black shadow-none shadow-[var(--color-accent)]/25 hover:shadow-none hover:-translate-y-0.5 transition-all sm:self-start shrink-0"
//             >
//               <Link href="/communities/create">
//                 <Crown size={16} className="mr-2" /> Launch Yours Free
//               </Link>
//             </Button>
//           </div>

//           {/* Search */}
//           <div className="flex gap-2">
//             <div className="relative flex-1">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
//               {debounced && (
//                 <button
//                   onClick={() => setSearch("")}
//                   className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
//                 >
//                   <X size={14} />
//                 </button>
//               )}
//               <Input
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="Search by name, topic, or category…"
//                 className="pl-11 pr-10 h-12 rounded-sm border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm focus-visible:ring-[var(--color-accent)]/20"
//               />
//             </div>
//             <button
//               onClick={() => setFiltersOpen((o) => !o)}
//               className={cn(
//                 "h-12 px-4 rounded-sm border font-bold text-sm flex items-center gap-2 transition-all shrink-0",
//                 filtersOpen || activeFilters.length > 0
//                   ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
//                   : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40"
//               )}
//             >
//               <SlidersHorizontal size={16} />
//               <span className="hidden sm:inline">Filters</span>
//               {activeFilters.length > 0 && (
//                 <span className="h-5 w-5 rounded-sm bg-white dark:bg-surface/20 flex items-center justify-center text-[10px] font-black">
//                   {activeFilters.length}
//                 </span>
//               )}
//             </button>
//           </div>

//           {/* Expanded filters */}
//           {filtersOpen && (
//             <div className="mt-3 p-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 animate-in slide-in-from-top-2 duration-200">
//               <div>
//                 <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Category</p>
//                 <div className="flex flex-wrap gap-2">
//                   {CATEGORIES.map(({ label, icon: Icon }) => (
//                     <button
//                       key={label}
//                       onClick={() => setCategory(label)}
//                       className={cn(
//                         "flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition-all border",
//                         category === label
//                           ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-none"
//                           : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
//                       )}
//                     >
//                       <Icon size={12} /> {label}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//               <div>
//                 <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Sort by</p>
//                 <div className="flex flex-wrap gap-2">
//                   {SORT_OPTIONS.map((opt) => (
//                     <button
//                       key={opt.value}
//                       onClick={() => setSort(opt.value)}
//                       className={cn(
//                         "px-3 py-1.5 rounded-sm text-xs font-bold transition-all border",
//                         sort === opt.value
//                           ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-none"
//                           : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40"
//                       )}
//                     >
//                       {opt.label}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//               {activeFilters.length > 0 && (
//                 <button
//                   onClick={() => { setCategory("All"); setSort("popular"); setSearch(""); }}
//                   className="text-xs font-bold text-[var(--color-danger)] hover:underline"
//                 >
//                   Clear all filters
//                 </button>
//               )}
//             </div>
//           )}

//           {/* Active filter chips */}
//           {!filtersOpen && activeFilters.length > 0 && (
//             <div className="flex flex-wrap gap-2 mt-3">
//               {activeFilters.map((f) => (
//                 <span key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[var(--color-accent-light)] text-[var(--color-accent)] text-[11px] font-bold border border-[var(--color-accent)]/20">
//                   {f}
//                   <button onClick={() => {
//                     if (f === category) setCategory("All");
//                     else if (SORT_OPTIONS.find(s => s.label === f)) setSort("popular");
//                     else setSearch("");
//                   }}>
//                     <X size={11} />
//                   </button>
//                 </span>
//               ))}
//             </div>
//           )}
//         </header>

//         {/* Stats */}
//         {!loading && <StatsBanner total={total} />}

//         {/* Content */}
//         {loading ? (
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//             {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
//           </div>
//         ) : items.length === 0 ? (
//           <div className="text-center py-24 rounded-sm border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
//             <div className="h-14 w-14 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4 text-[var(--color-text-muted)]">
//               <Search size={24} />
//             </div>
//             <p className="font-black text-[var(--color-text-primary)]">No communities found</p>
//             <p className="text-sm text-[var(--color-text-muted)] mt-1">Try a different search or category</p>
//             <Button
//               variant="outline"
//               size="sm"
//               className="mt-4 rounded-sm"
//               onClick={() => { setCategory("All"); setSearch(""); setSort("popular"); }}
//             >
//               Reset filters
//             </Button>
//           </div>
//         ) : (
//           <>
//             {/* Featured + create CTA row */}
//             {featured && !debounced && (
//               <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
//                 <FeaturedCard c={featured} />
//                 <CreateCTACard />
//               </div>
//             )}

//             {/* Grid */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
//               {(debounced ? items : rest).map((c, i) => (
//                 <SharedCommunityCard key={c.id} c={c as any} rank={debounced ? i + 1 : i + 2} />
//               ))}
//             </div>

//             {/* Load more */}
//             {hasMore && (
//               <div className="flex justify-center mt-10">
//                 <Button
//                   variant="outline"
//                   onClick={loadMore}
//                   disabled={loadingMore}
//                   className="rounded-sm font-bold border-[var(--color-border)] h-11 px-8 hover:border-[var(--color-accent)]/40 transition-all"
//                 >
//                   {loadingMore ? (
//                     <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</>
//                   ) : (
//                     <>Show more communities <ChevronDown size={16} className="ml-2" /></>
//                   )}
//                 </Button>
//               </div>
//             )}
//           </>
//         )}

//         {/* Bottom CTA strip */}
//         {!loading && items.length > 0 && (
//           <div className="mt-16 rounded-sm bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-white relative overflow-hidden">
//             <div className="absolute inset-0 opacity-10">
//               <div className="absolute top-0 right-0 w-64 h-64 rounded-sm bg-white dark:bg-surface blur-3xl" />
//               <div className="absolute bottom-0 left-0 w-48 h-48 rounded-sm bg-white dark:bg-surface blur-2xl" />
//             </div>
//             <div className="relative z-10 text-center sm:text-left">
//               <h3 className="font-black text-2xl leading-tight">Ready to build something?</h3>
//               <p className="text-white/70 text-sm mt-1">Start your own community in minutes. Free forever plan available.</p>
//             </div>
//             <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
//               <Button
//                 asChild
//                 className="rounded-sm bg-white dark:bg-surface text-[var(--color-accent)] hover:bg-white dark:bg-surface/90 font-black shadow-none hover:-translate-y-0.5 transition-all"
//               >
//                 <Link href="/communities/create" className="text-white">
//                   <Crown size={16} className="mr-2 text-white" /> Create for Free
//                 </Link>
//               </Button>
//               <Button
//                 asChild
//                 variant="outline"
//                 className="rounded-sm border-white/30 text-white hover:bg-white dark:bg-surface/10 font-bold"
//               >
//                 <Link href="/pricing">See Pricing</Link>
//               </Button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search, Loader2, Users, Flame, Sparkles, Crown, TrendingUp,
  ArrowRight, Star, Zap, Globe, Gift, BadgeCheck, X,
  ChevronDown, Plus, SlidersHorizontal, Clock,
  Smile,
} from "lucide-react";
import { RiUserCommunityFill } from "react-icons/ri";
import { PiUsersThreeFill } from "react-icons/pi";
import { cn, formatNumber } from "@/lib/utils";
import { SharedCommunityCard, CommunityRow } from "./community-card-shared";
import { ImUserPlus } from "react-icons/im";
import { FieldInput } from "../ui/field-input";
import { Input } from "../ui/input";
import { Field } from "../ui/field";

/* ── Constants ── */
const CATEGORIES = [
  { label: "All", icon: Globe },
  { label: "Business", icon: TrendingUp },
  { label: "Tech", icon: Zap },
  { label: "Marketing", icon: Flame },
  { label: "Finance", icon: Star },
  { label: "Fitness", icon: Sparkles },
  { label: "Other", icon: Gift },
] as const;

type SortKey = "popular" | "newest" | "free";

const SORT_OPTIONS: { value: SortKey; label: string; icon: React.ElementType }[] = [
  { value: "popular", label: "Popular", icon: TrendingUp },
  { value: "newest", label: "Newest", icon: Clock },
  { value: "free", label: "Free", icon: Gift },
];

function sortCommunities(list: CommunityRow[], sort: SortKey): CommunityRow[] {
  const copy = [...list];
  if (sort === "popular") copy.sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0));
  else if (sort === "newest") copy.sort((a, b) =>
    (b.created_at ? new Date(b.created_at).getTime() : 0) -
    (a.created_at ? new Date(a.created_at).getTime() : 0)
  );
  else copy.sort((a, b) => (a.is_free ? 0 : 1) - (b.is_free ? 0 : 1));
  return copy;
}

/* ── Skeleton ── */
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="h-40" style={{ background: "var(--color-surface-secondary)" }} />
      <div className="p-5 pt-10 space-y-3">
        <div className="h-5 rounded-lg w-3/4" style={{ background: "var(--color-surface-secondary)" }} />
        <div className="h-3 rounded-lg w-full" style={{ background: "var(--color-surface-secondary)" }} />
        <div className="h-3 rounded-lg w-2/3" style={{ background: "var(--color-surface-secondary)" }} />
        <div className="flex gap-2 pt-2">
          <div className="h-9 rounded-xl flex-1" style={{ background: "var(--color-surface-secondary)" }} />
          <div className="h-9 rounded-xl w-20" style={{ background: "var(--color-surface-secondary)" }} />
        </div>
      </div>
    </div>
  );
}

/* ── Featured card ── */
function FeaturedCard({ c }: { c: CommunityRow }) {
  return (
    <Link
      href={`/communities/${c.slug}`}
      className="group relative col-span-full lg:col-span-2 rounded-2xl overflow-hidden min-h-[260px] flex flex-col justify-end transition-all duration-300 hover:-translate-y-0.5"
      style={{ border: "1px solid var(--color-border)" }}
    >
      {/* Background */}
      <div className="absolute inset-0">
        {c.cover_image ? (
          <Image src={c.cover_image} alt="" fill className="object-cover" sizes="60vw" unoptimized />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Featured pill */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[10px] font-semibold uppercase tracking-wider">
        <Flame size={10} className="animate-pulse" />
        Featured
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 flex items-end gap-4">
        <div className="h-14 w-14 rounded-2xl border-2 border-white/20 overflow-hidden shrink-0">
          {c.avatar_url ? (
            <Image src={c.avatar_url} alt="" width={56} height={56} className="object-cover h-full w-full" unoptimized />
          ) : (
            <div
              className="h-full w-full flex items-center justify-center text-white font-bold text-xl"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              {c.name?.[0]}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-white text-lg leading-tight">{c.name}</h2>
            <BadgeCheck size={15} className="text-sky-400 shrink-0" />
          </div>
          <p className="text-white/60 text-sm mt-0.5 line-clamp-1">{c.tagline}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-white/50 text-xs">
              <Users size={11} /> {formatNumber(c.member_count ?? 0)} members
            </span>
            {c.is_free ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/25">
                Free
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/15">
                From {c.currency || "$"}{Number(c.monthly_price ?? 0).toFixed(0)}/mo
              </span>
            )}
          </div>
        </div>

        <div
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          Join <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

/* ── Create CTA ── */
function CreateCTACard() {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col justify-between min-h-[200px]"
      style={{
        background: "var(--color-surface)",
        border: "1px dashed var(--color-accent)",
      }}
    >
      <div>
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-subtle)" }}
        >
          <Smile size={18} style={{ color: "var(--color-accent)" }} />
        </div>
        <h3 className="font-bold text-base leading-tight" style={{ color: "var(--color-text-primary)" }}>
          Launch your own community
        </h3>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Build, grow, and monetize your audience. No credit card required.
        </p>
      </div>

      <Link
        href="/communities/create"
        className="inline-flex items-center gap-2
         h-11 px-4 rounded-sm text-[14px] font-normal
         text-[var(--color-text-primary)]
         text-white transition-all active:scale-[0.98] mt-4"
        style={{ background: "var(--color-accent)", boxShadow: "0 4px 14px rgba(253,80,0,0.25)" }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
      >
        <RiUserCommunityFill size={20} />
        <span>Create Community</span>
      </Link>
    </div>
  );
}

/* ── Stats strip ── */
function StatsBanner({ total }: { total: number }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      {[
        { label: "Communities", value: formatNumber(total), icon: Globe, color: "text-sky-500 bg-sky-500/10" },
        { label: "Active Members", value: "12K+", icon: Users, color: "text-violet-500 bg-violet-500/10" },
        { label: "Added Today", value: "3", icon: Flame, color: "text-orange-500 bg-orange-500/10" },
      ].map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
          style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
        >
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", color)}>
            <Icon size={16} />
          </div>
          <div>
            <p className="font-bold text-base leading-none" style={{ color: "var(--color-text-primary)" }}>
              {value}
            </p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main ── */
export function CommunitiesDiscovery() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("popular");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sortRef = useRef(sort);
  sortRef.current = sort;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (debounced) params.set("search", debounced);
    if (category !== "All") params.set("category", category);
    const res = await fetch(`/api/communities?${params.toString()}`);
    const json = await res.json() as { communities?: CommunityRow[]; total?: number; error?: string };
    if (!res.ok) throw new Error(json.error || "Failed to load");
    const raw = json.communities ?? [];
    const sk = sortRef.current;
    if (append) setItems(prev => sortCommunities([...prev, ...raw], sk));
    else setItems(sortCommunities(raw, sk));
    setTotal(json.total ?? 0);
  }, [debounced, category]);

  useEffect(() => {
    setPage(1);
    setLoading(true);
    fetchPage(1, false).catch(() => setItems([])).finally(() => setLoading(false));
  }, [debounced, category, fetchPage]);

  useEffect(() => {
    setItems(prev => sortCommunities(prev, sort));
  }, [sort]);

  const loadMore = async () => {
    const next = page + 1;
    setLoadingMore(true);
    try { await fetchPage(next, true); setPage(next); }
    finally { setLoadingMore(false); }
  };

  const hasMore = items.length < total;
  const featured = items[0] ?? null;
  const rest = items.slice(1);

  const hasFilter = category !== "All" || sort !== "popular" || !!debounced;

  function clearAll() { setCategory("All"); setSort("popular"); setSearch(""); }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-[var(--container-max,1200px)] mx-auto px-2 sm:px-6 py-8 sm:pt-12">

        {/* ── Header ── */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>
                Discover
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ color: "var(--color-text-primary)" }}>
                Find your community
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed max-w-sm" style={{ color: "var(--color-text-muted)" }}>
                Thousands of people learning, earning and growing together.
              </p>
            </div>

            <Link
              href="/communities/create"
              className="sm:shrink-0 inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] self-start"
              style={{ background: "var(--color-accent)", boxShadow: "0 4px 14px rgba(253,80,0,0.2)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
            >
              <PiUsersThreeFill size={15} /> Launch yours free
            </Link>
          </div>

          {/* Search */}
          <Field label="" icon={<Search className="h-4 w-4 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />}>
            <FieldInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search communities…"
              className="w-full h-11 pr-10 rounded-xl text-sm font-medium outline-none transition-all duration-150 "
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
              >
                <X size={14} />
              </button>
            )}
          </Field>

          {/* Categories — always visible */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-3">
            {CATEGORIES.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setCategory(label)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all duration-150"
                style={category === label
                  ? { background: "var(--color-accent)", color: "#fff", border: "1px solid transparent", boxShadow: "0 4px 12px rgba(253,80,0,0.22)" }
                  : { background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
                }
                onMouseEnter={e => { if (category !== label) { (e.currentTarget.style.color = "var(--color-accent)"); (e.currentTarget.style.borderColor = "var(--color-accent)"); } }}
                onMouseLeave={e => { if (category !== label) { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); } }}
              >
                <Icon size={12} /> {label}
              </button>
            ))}

            {/* Sort — right end */}
            <div
              className="ml-auto flex items-center gap-0.5 p-1 rounded-xl shrink-0"
              style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
            >
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className="px-3 h-7 rounded-lg text-[11px] font-semibold transition-all duration-150"
                  style={sort === opt.value
                    ? { background: "var(--color-text-primary)", color: "var(--color-bg)" }
                    : { color: "var(--color-text-muted)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active filter pills */}
          {hasFilter && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {category !== "All" && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }}
                >
                  {category}
                  <button onClick={() => setCategory("All")}><X size={10} /></button>
                </span>
              )}
              {sort !== "popular" && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }}
                >
                  {SORT_OPTIONS.find(s => s.value === sort)?.label}
                  <button onClick={() => setSort("popular")}><X size={10} /></button>
                </span>
              )}
              {debounced && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
                >
                  "{debounced}"
                  <button onClick={clearAll}><X size={10} /></button>
                </span>
              )}
              <button
                onClick={clearAll}
                className="text-[11px] font-semibold transition-colors ml-1"
                style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--color-danger,#e5484d)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
              >
                Clear all
              </button>
            </div>
          )}
        </header>

        {/* Stats */}
        {!loading && <StatsBanner total={total} />}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div
            className="text-center py-20 rounded-2xl"
            style={{ border: "1px dashed var(--color-border)", background: "var(--color-surface)" }}
          >
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
            >
              <Search size={22} style={{ color: "var(--color-text-muted)" }} />
            </div>
            <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>No communities found</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Try a different search or category</p>
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-xl text-xs font-semibold mt-5 transition-all"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <>
            {/* Featured row */}
            {featured && !debounced && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                <FeaturedCard c={featured} />
                <CreateCTACard />
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(debounced ? items : rest).map((c, i) => (
                <SharedCommunityCard key={c.id} c={c as any} rank={debounced ? i + 1 : i + 2} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 h-10 px-8 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-muted)" }}
                  onMouseEnter={e => { if (!loadingMore) { (e.currentTarget.style.color = "var(--color-accent)"); (e.currentTarget.style.borderColor = "var(--color-accent)"); } }}
                  onMouseLeave={e => { if (!loadingMore) { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); } }}
                >
                  {loadingMore
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
                    : <><ChevronDown size={16} /> Show more</>
                  }
                </button>
              </div>
            )}
          </>
        )}

        {/* Bottom CTA */}
        {!loading && items.length > 0 && (
          <div
            className="mt-16 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-xl leading-tight" style={{ color: "var(--color-text-primary)" }}>
                Ready to build something?
              </h3>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                Start your own community in minutes. Free forever plan available.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/communities/create"
                className="inline-flex items-center gap-2 h-10 px-6 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
                style={{ background: "var(--color-accent)", boxShadow: "0 4px 14px rgba(253,80,0,0.22)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
              >
                <Crown size={15} /> Create for free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl text-sm font-semibold transition-all"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: "transparent" }}
                onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.borderColor = "var(--color-border-strong)"); }}
                onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); }}
              >
                See pricing
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}