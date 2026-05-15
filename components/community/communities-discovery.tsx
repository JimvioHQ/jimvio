
// "use client";

// import React, { useCallback, useEffect, useRef, useState } from "react";
// import Image from "next/image";
// import Link from "next/link";
// import {
//   Search, Loader2, Users, Flame, Sparkles, Crown, TrendingUp,
//   ArrowRight, Star, Zap, Globe, Gift, BadgeCheck, X,
//   ChevronDown, Plus, SlidersHorizontal, Clock,
//   Smile,
// } from "lucide-react";
// import { RiUserCommunityFill } from "react-icons/ri";
// import { PiUsersThreeFill } from "react-icons/pi";
// import { cn, formatNumber } from "@/lib/utils";
// import { SharedCommunityCard, CommunityRow } from "./community-card-shared";
// import { ImUserPlus } from "react-icons/im";
// import { FieldInput } from "../ui/field-input";
// import { Input } from "../ui/input";
// import { Field } from "../ui/field";

// /* ── Constants ── */
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

// const SORT_OPTIONS: { value: SortKey; label: string; icon: React.ElementType }[] = [
//   { value: "popular", label: "Popular", icon: TrendingUp },
//   { value: "newest", label: "Newest", icon: Clock },
//   { value: "free", label: "Free", icon: Gift },
// ];

// function sortCommunities(list: CommunityRow[], sort: SortKey): CommunityRow[] {
//   const copy = [...list];
//   if (sort === "popular") copy.sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0));
//   else if (sort === "newest") copy.sort((a, b) =>
//     (b.created_at ? new Date(b.created_at).getTime() : 0) -
//     (a.created_at ? new Date(a.created_at).getTime() : 0)
//   );
//   else copy.sort((a, b) => (a.is_free ? 0 : 1) - (b.is_free ? 0 : 1));
//   return copy;
// }

// /* ── Skeleton ── */
// function SkeletonCard() {
//   return (
//     <div
//       className="rounded-2xl overflow-hidden animate-pulse"
//       style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
//     >
//       <div className="h-40" style={{ background: "var(--color-surface-secondary)" }} />
//       <div className="p-5 pt-10 space-y-3">
//         <div className="h-5 rounded-lg w-3/4" style={{ background: "var(--color-surface-secondary)" }} />
//         <div className="h-3 rounded-lg w-full" style={{ background: "var(--color-surface-secondary)" }} />
//         <div className="h-3 rounded-lg w-2/3" style={{ background: "var(--color-surface-secondary)" }} />
//         <div className="flex gap-2 pt-2">
//           <div className="h-9 rounded-xl flex-1" style={{ background: "var(--color-surface-secondary)" }} />
//           <div className="h-9 rounded-xl w-20" style={{ background: "var(--color-surface-secondary)" }} />
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ── Featured card ── */
// function FeaturedCard({ c }: { c: CommunityRow }) {
//   return (
//     <Link
//       href={`/communities/${c.slug}`}
//       className="group relative col-span-full lg:col-span-2 rounded-2xl overflow-hidden min-h-[260px] flex flex-col justify-end transition-all duration-300 hover:-translate-y-0.5"
//       style={{ border: "1px solid var(--color-border)" }}
//     >
//       {/* Background */}
//       <div className="absolute inset-0">
//         {c.cover_image ? (
//           <Image src={c.cover_image} alt="" fill className="object-cover" sizes="60vw" unoptimized />
//         ) : (
//           <div
//             className="absolute inset-0"
//             style={{ background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)" }}
//           />
//         )}
//         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
//       </div>

//       {/* Featured pill */}
//       <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[10px] font-semibold uppercase tracking-wider">
//         <Flame size={10} className="animate-pulse" />
//         Featured
//       </div>

//       {/* Content */}
//       <div className="relative z-10 p-6 flex items-end gap-4">
//         <div className="h-14 w-14 rounded-2xl border-2 border-white/20 overflow-hidden shrink-0">
//           {c.avatar_url ? (
//             <Image src={c.avatar_url} alt="" width={56} height={56} className="object-cover h-full w-full" unoptimized />
//           ) : (
//             <div
//               className="h-full w-full flex items-center justify-center text-white font-bold text-xl"
//               style={{ background: "rgba(255,255,255,0.15)" }}
//             >
//               {c.name?.[0]}
//             </div>
//           )}
//         </div>

//         <div className="flex-1 min-w-0">
//           <div className="flex items-center gap-2 flex-wrap">
//             <h2 className="font-bold text-white text-lg leading-tight">{c.name}</h2>
//             <BadgeCheck size={15} className="text-sky-400 shrink-0" />
//           </div>
//           <p className="text-white/60 text-sm mt-0.5 line-clamp-1">{c.tagline}</p>
//           <div className="flex items-center gap-3 mt-2">
//             <span className="flex items-center gap-1.5 text-white/50 text-xs">
//               <Users size={11} /> {formatNumber(c.member_count ?? 0)} members
//             </span>
//             {c.is_free ? (
//               <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/25">
//                 Free
//               </span>
//             ) : (
//               <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/15">
//                 From {c.currency || "$"}{Number(c.monthly_price ?? 0).toFixed(0)}/mo
//               </span>
//             )}
//           </div>
//         </div>

//         <div
//           className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
//           style={{ background: "rgba(255,255,255,0.15)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}
//         >
//           Join <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
//         </div>
//       </div>
//     </Link>
//   );
// }

// /* ── Create CTA ── */
// function CreateCTACard() {
//   return (
//     <div
//       className="rounded-2xl p-6 flex flex-col justify-between min-h-[200px]"
//       style={{
//         background: "var(--color-surface)",
//         border: "1px dashed var(--color-accent)",
//       }}
//     >
//       <div>
//         <div
//           className="h-10 w-10 rounded-xl flex items-center justify-center mb-4"
//           style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-subtle)" }}
//         >
//           <Smile size={18} style={{ color: "var(--color-accent)" }} />
//         </div>
//         <h3 className="font-bold text-base leading-tight" style={{ color: "var(--color-text-primary)" }}>
//           Launch your own community
//         </h3>
//         <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
//           Build, grow, and monetize your audience. No credit card required.
//         </p>
//       </div>

//       <Link
//         href="/communities/create"
//         className="inline-flex items-center gap-2
//          h-11 px-4 rounded-sm text-[14px] font-normal
//          text-[var(--color-text-primary)]
//          text-white transition-all active:scale-[0.98] mt-4"
//         style={{ background: "var(--color-accent)", boxShadow: "0 4px 14px rgba(253,80,0,0.25)" }}
//         onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//         onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//       >
//         <RiUserCommunityFill size={20} />
//         <span>Create Community</span>
//       </Link>
//     </div>
//   );
// }

// /* ── Stats strip ── */
// function StatsBanner({ total }: { total: number }) {
//   return (
//     <div className="grid grid-cols-3 gap-3 mb-8">
//       {[
//         { label: "Communities", value: formatNumber(total), icon: Globe, color: "text-sky-500 bg-sky-500/10" },
//         { label: "Active Members", value: "12K+", icon: Users, color: "text-violet-500 bg-violet-500/10" },
//         { label: "Added Today", value: "3", icon: Flame, color: "text-orange-500 bg-orange-500/10" },
//       ].map(({ label, value, icon: Icon, color }) => (
//         <div
//           key={label}
//           className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
//           style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
//         >
//           <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", color)}>
//             <Icon size={16} />
//           </div>
//           <div>
//             <p className="font-bold text-base leading-none" style={{ color: "var(--color-text-primary)" }}>
//               {value}
//             </p>
//             <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--color-text-muted)" }}>
//               {label}
//             </p>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// /* ── Main ── */
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
//     if (append) setItems(prev => sortCommunities([...prev, ...raw], sk));
//     else setItems(sortCommunities(raw, sk));
//     setTotal(json.total ?? 0);
//   }, [debounced, category]);

//   useEffect(() => {
//     setPage(1);
//     setLoading(true);
//     fetchPage(1, false).catch(() => setItems([])).finally(() => setLoading(false));
//   }, [debounced, category, fetchPage]);

//   useEffect(() => {
//     setItems(prev => sortCommunities(prev, sort));
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

//   const hasFilter = category !== "All" || sort !== "popular" || !!debounced;

//   function clearAll() { setCategory("All"); setSort("popular"); setSearch(""); }

//   return (
//     <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
//       <div className="max-w-[var(--container-max,1200px)] mx-auto px-2 sm:px-6 py-8 sm:pt-12">

//         {/* ── Header ── */}
//         <header className="mb-8">
//           <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
//             <div>
//               <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>
//                 Discover
//               </p>
//               <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ color: "var(--color-text-primary)" }}>
//                 Find your community
//               </h1>
//               <p className="mt-1.5 text-sm leading-relaxed max-w-sm" style={{ color: "var(--color-text-muted)" }}>
//                 Thousands of people learning, earning and growing together.
//               </p>
//             </div>

//             <Link
//               href="/communities/create"
//               className="sm:shrink-0 inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] self-start"
//               style={{ background: "var(--color-accent)", boxShadow: "0 4px 14px rgba(253,80,0,0.2)" }}
//               onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//               onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//             >
//               <PiUsersThreeFill size={15} /> Launch yours free
//             </Link>
//           </div>

//           {/* Search */}
//           <Field label="" icon={<Search className="h-4 w-4 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />}>
//             <FieldInput
//               value={search}
//               onChange={e => setSearch(e.target.value)}
//               placeholder="Search communities…"
//               className="w-full h-11 pr-10 rounded-xl text-sm font-medium outline-none transition-all duration-150 "
//             />
//             {search && (
//               <button
//                 onClick={() => setSearch("")}
//                 className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
//                 style={{ color: "var(--color-text-muted)" }}
//                 onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
//                 onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
//               >
//                 <X size={14} />
//               </button>
//             )}
//           </Field>

//           {/* Categories — always visible */}
//           <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-3">
//             {CATEGORIES.map(({ label, icon: Icon }) => (
//               <button
//                 key={label}
//                 onClick={() => setCategory(label)}
//                 className="shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all duration-150"
//                 style={category === label
//                   ? { background: "var(--color-accent)", color: "#fff", border: "1px solid transparent", boxShadow: "0 4px 12px rgba(253,80,0,0.22)" }
//                   : { background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
//                 }
//                 onMouseEnter={e => { if (category !== label) { (e.currentTarget.style.color = "var(--color-accent)"); (e.currentTarget.style.borderColor = "var(--color-accent)"); } }}
//                 onMouseLeave={e => { if (category !== label) { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); } }}
//               >
//                 <Icon size={12} /> {label}
//               </button>
//             ))}

//             {/* Sort — right end */}
//             <div
//               className="ml-auto flex items-center gap-0.5 p-1 rounded-xl shrink-0"
//               style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
//             >
//               {SORT_OPTIONS.map(opt => (
//                 <button
//                   key={opt.value}
//                   onClick={() => setSort(opt.value)}
//                   className="px-3 h-7 rounded-lg text-[11px] font-semibold transition-all duration-150"
//                   style={sort === opt.value
//                     ? { background: "var(--color-text-primary)", color: "var(--color-bg)" }
//                     : { color: "var(--color-text-muted)" }
//                   }
//                 >
//                   {opt.label}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Active filter pills */}
//           {hasFilter && (
//             <div className="flex flex-wrap items-center gap-2 mt-3">
//               {category !== "All" && (
//                 <span
//                   className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
//                   style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }}
//                 >
//                   {category}
//                   <button onClick={() => setCategory("All")}><X size={10} /></button>
//                 </span>
//               )}
//               {sort !== "popular" && (
//                 <span
//                   className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
//                   style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }}
//                 >
//                   {SORT_OPTIONS.find(s => s.value === sort)?.label}
//                   <button onClick={() => setSort("popular")}><X size={10} /></button>
//                 </span>
//               )}
//               {debounced && (
//                 <span
//                   className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold"
//                   style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
//                 >
//                   "{debounced}"
//                   <button onClick={clearAll}><X size={10} /></button>
//                 </span>
//               )}
//               <button
//                 onClick={clearAll}
//                 className="text-[11px] font-semibold transition-colors ml-1"
//                 style={{ color: "var(--color-text-muted)" }}
//                 onMouseEnter={e => (e.currentTarget.style.color = "var(--color-danger,#e5484d)")}
//                 onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
//               >
//                 Clear all
//               </button>
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
//           <div
//             className="text-center py-20 rounded-2xl"
//             style={{ border: "1px dashed var(--color-border)", background: "var(--color-surface)" }}
//           >
//             <div
//               className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
//               style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
//             >
//               <Search size={22} style={{ color: "var(--color-text-muted)" }} />
//             </div>
//             <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>No communities found</p>
//             <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Try a different search or category</p>
//             <button
//               onClick={clearAll}
//               className="inline-flex items-center gap-2 h-9 px-5 rounded-xl text-xs font-semibold mt-5 transition-all"
//               style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}
//               onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
//               onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
//             >
//               Reset filters
//             </button>
//           </div>
//         ) : (
//           <>
//             {/* Featured row */}
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
//                 <button
//                   onClick={loadMore}
//                   disabled={loadingMore}
//                   className="inline-flex items-center gap-2 h-10 px-8 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
//                   style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-muted)" }}
//                   onMouseEnter={e => { if (!loadingMore) { (e.currentTarget.style.color = "var(--color-accent)"); (e.currentTarget.style.borderColor = "var(--color-accent)"); } }}
//                   onMouseLeave={e => { if (!loadingMore) { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); } }}
//                 >
//                   {loadingMore
//                     ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
//                     : <><ChevronDown size={16} /> Show more</>
//                   }
//                 </button>
//               </div>
//             )}
//           </>
//         )}

//         {/* Bottom CTA */}
//         {!loading && items.length > 0 && (
//           <div
//             className="mt-16 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
//             style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
//           >
//             <div className="text-center sm:text-left">
//               <h3 className="font-bold text-xl leading-tight" style={{ color: "var(--color-text-primary)" }}>
//                 Ready to build something?
//               </h3>
//               <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
//                 Start your own community in minutes. Free forever plan available.
//               </p>
//             </div>

//             <div className="flex flex-col sm:flex-row gap-3 shrink-0">
//               <Link
//                 href="/communities/create"
//                 className="inline-flex items-center gap-2 h-10 px-6 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
//                 style={{ background: "var(--color-accent)", boxShadow: "0 4px 14px rgba(253,80,0,0.22)" }}
//                 onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                 onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//               >
//                 <Crown size={15} /> Create for free
//               </Link>
//               <Link
//                 href="/pricing"
//                 className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl text-sm font-semibold transition-all"
//                 style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: "transparent" }}
//                 onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.borderColor = "var(--color-border-strong)"); }}
//                 onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); }}
//               >
//                 See pricing
//               </Link>
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
import { Search, Loader2, X, ArrowUpRight, ChevronDown } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { SharedCommunityCard, CommunityRow } from "./community-card-shared";

/* ── Domain ─────────────────────────────────────────────────── */
const CATEGORIES = [
  "All",
  "Business",
  "Tech",
  "Marketing",
  "Finance",
  "Fitness",
  "Other",
] as const;
type Category = (typeof CATEGORIES)[number];

const SORTS = [
  { value: "popular", label: "Most active" },
  { value: "newest", label: "Newest" },
  { value: "free", label: "Free first" },
] as const;
type SortKey = (typeof SORTS)[number]["value"];

function sortCommunities(list: CommunityRow[], sort: SortKey): CommunityRow[] {
  const copy = list.slice();
  if (sort === "popular") {
    copy.sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0));
  } else if (sort === "newest") {
    copy.sort(
      (a, b) =>
        (b.created_at ? new Date(b.created_at).getTime() : 0) -
        (a.created_at ? new Date(a.created_at).getTime() : 0)
    );
  } else {
    copy.sort((a, b) => (a.is_free ? 0 : 1) - (b.is_free ? 0 : 1));
  }
  return copy;
}

function priceLabel(c: CommunityRow): string | null {
  if (c.is_free) return "Free";
  const price = Number(c.monthly_price);
  if (!price || Number.isNaN(price)) return null;
  return `${c.currency || "$"}${price.toFixed(0)}/mo`;
}

/* ── Skeleton ───────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse">
      <div className="h-40 bg-[var(--color-surface-secondary)]" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded bg-[var(--color-surface-secondary)]" />
        <div className="h-3 w-full rounded bg-[var(--color-surface-secondary)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--color-surface-secondary)]" />
        <div className="flex gap-2 pt-2">
          <div className="h-9 flex-1 rounded-xl bg-[var(--color-surface-secondary)]" />
          <div className="h-9 w-20 rounded-xl bg-[var(--color-surface-secondary)]" />
        </div>
      </div>
    </div>
  );
}

/* ── Featured ───────────────────────────────────────────────── */
function FeaturedCard({ c }: { c: CommunityRow }) {
  const price = priceLabel(c);

  return (
    <Link
      href={`/communities/${c.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-[var(--color-border)] min-h-[300px] sm:min-h-[340px] transition-transform duration-300 hover:-translate-y-0.5"
    >
      {/* Background */}
      <div className="absolute inset-0">
        {c.cover_image ? (
          <Image
            src={c.cover_image}
            alt=""
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="100vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-accent)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      </div>

      {/* Eyebrow */}
      <div className="relative z-10 px-6 pt-6 sm:px-8 sm:pt-7">
        <span className="text-[10px] tracking-[0.18em] uppercase text-white/70 font-medium">
          Editor's pick
        </span>
      </div>

      {/* Content */}
      <div className=" z-10 mt-auto p-6 sm:p-8 flex flex-col gap-5 absolute inset-x-0 bottom-0">
        <div className="flex items-end gap-4">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden ring-1 ring-white/20 shrink-0 bg-white/10">
            {c.avatar_url ? (
              <Image
                src={c.avatar_url}
                alt=""
                width={56}
                height={56}
                className="object-cover h-full w-full"
                unoptimized
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white font-semibold text-lg">
                {c.name?.[0]}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-white text-xl sm:text-2xl leading-tight tracking-tight">
              {c.name}
            </h2>
            {c.tagline && (
              <p className="text-white/70 text-sm mt-1.5 line-clamp-1">
                {c.tagline}
              </p>
            )}
          </div>

          <div className="shrink-0 hidden sm:inline-flex items-center gap-1 text-sm text-white/80 group-hover:text-white transition-colors">
            Visit
            <ArrowUpRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-[13px] text-white/65">
          <span>{formatNumber(c.member_count ?? 0)} members</span>
          {price && (
            <>
              <span aria-hidden className="text-white/30">·</span>
              <span>{price}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Sort menu ──────────────────────────────────────────────── */
function SortMenu({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = SORTS.find((s) => s.value === value)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 h-9 px-2.5 -mr-2.5 rounded-md text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <span>Sort</span>
        <span className="font-medium text-[var(--color-text-primary)]">
          {current.label}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 w-44 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg z-20"
        >
          {SORTS.map((s) => (
            <button
              key={s.value}
              role="option"
              aria-selected={s.value === value}
              onClick={() => {
                onChange(s.value);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3.5 py-2.5 text-[13px] transition-colors",
                s.value === value
                  ? "text-[var(--color-accent)] font-medium bg-[var(--color-accent-light)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────── */
export function CommunitiesDiscovery() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [sort, setSort] = useState<SortKey>("popular");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sortRef = useRef(sort);
  sortRef.current = sort;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (p: number, append: boolean) => {
      const params = new URLSearchParams();
      params.set("page", String(p));
      if (debounced) params.set("search", debounced);
      if (category !== "All") params.set("category", category);
      const res = await fetch(`/api/communities?${params.toString()}`);
      const json = (await res.json()) as {
        communities?: CommunityRow[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed to load");
      const raw = json.communities ?? [];
      const sk = sortRef.current;
      setItems((prev) =>
        sortCommunities(append ? [...prev, ...raw] : raw, sk)
      );
      setTotal(json.total ?? 0);
    },
    [debounced, category]
  );

  useEffect(() => {
    setPage(1);
    setLoading(true);
    fetchPage(1, false)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [debounced, category, fetchPage]);

  useEffect(() => {
    setItems((prev) => sortCommunities(prev, sort));
  }, [sort]);

  const loadMore = async () => {
    const next = page + 1;
    setLoadingMore(true);
    try {
      await fetchPage(next, true);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = items.length < total;
  const showFeatured = !debounced && items.length > 0;
  const featured = showFeatured ? items[0] : null;
  const rest = showFeatured ? items.slice(1) : items;
  const hasFilter = category !== "All" || sort !== "popular" || !!debounced;

  const resetAll = () => {
    setCategory("All");
    setSort("popular");
    setSearch("");
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[var(--container-max,1200px)] mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-28 sm:pb-20">
        {/* ── Header ── */}
        <header className="mb-10 sm:mb-14">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-semibold tracking-tight text-[var(--color-text-primary)] text-[clamp(2rem,4.5vw,3rem)] leading-[1.05]">
                Communities to learn,
                <br className="hidden sm:block" />
                <span className="text-[var(--color-text-muted)]">
                  {" "}
                  earn, and ship with.
                </span>
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-muted)] max-w-md">
                Curated, paid and free. Built by operators, creators, and
                engineers — not algorithms.
              </p>
            </div>

            <Link
              href="/communities/create"
              className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-[13px] font-medium border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)] transition-colors shrink-0"
            >
              Start a community
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Search */}
          <div className="relative mt-8">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities, topics, creators…"
              aria-label="Search communities"
              className="w-full h-12 pl-11 pr-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)] transition-all"
            />
            {search && (
              <button
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </header>

        {/* ── Filter rail (underline tabs) ── */}
        <div className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] mb-6">
          <nav
            aria-label="Filter by category"
            className="flex items-center gap-0.5 overflow-x-auto no-scrollbar -mb-px"
          >
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={active}
                  className={cn(
                    "shrink-0 px-3 sm:px-4 h-11 text-[13px] font-medium border-b-2 transition-colors",
                    active
                      ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)]"
                      : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {c}
                </button>
              );
            })}
          </nav>

          <div className="hidden sm:flex shrink-0 pb-1.5">
            <SortMenu value={sort} onChange={setSort} />
          </div>
        </div>

        {/* ── Result meta line (replaces stats banner) ── */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <p className="text-[13px] text-[var(--color-text-muted)]">
            {loading ? (
              "Loading…"
            ) : (
              <>
                <span className="text-[var(--color-text-primary)] font-medium tabular-nums">
                  {formatNumber(total)}
                </span>{" "}
                {total === 1 ? "community" : "communities"}
                {debounced && (
                  <>
                    {" "}
                    matching{" "}
                    <span className="text-[var(--color-text-primary)]">
                      "{debounced}"
                    </span>
                  </>
                )}
                {category !== "All" && (
                  <>
                    {" "}
                    in{" "}
                    <span className="text-[var(--color-text-primary)]">
                      {category}
                    </span>
                  </>
                )}
              </>
            )}
          </p>

          <div className="flex items-center gap-3">
            {hasFilter && (
              <button
                onClick={resetAll}
                className="text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                Reset
              </button>
            )}
            <div className="sm:hidden">
              <SortMenu value={sort} onChange={setSort} />
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 sm:py-28 border border-dashed border-[var(--color-border)] rounded-2xl">
            <p className="font-medium text-[var(--color-text-primary)]">
              Nothing matches yet.
            </p>
            <p className="text-[13px] mt-1.5 text-[var(--color-text-muted)]">
              Try fewer words or clear the filters.
            </p>
            {hasFilter && (
              <button
                onClick={resetAll}
                className="mt-5 text-[13px] font-medium text-[var(--color-accent)] hover:underline"
              >
                Reset filters →
              </button>
            )}
          </div>
        ) : (
          <>
            {featured && (
              <div className="mb-10 sm:mb-12">
                <FeaturedCard c={featured} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((c, i) => (
                <SharedCommunityCard
                  key={c.id}
                  c={c as any}
                  rank={showFeatured ? i + 2 : i + 1}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 h-10 px-6 rounded-lg text-[13px] font-medium border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Loading
                    </>
                  ) : (
                    "Show more"
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Mobile-only floating CTA (replaces header CTA on small screens) ── */}
        <div className="fixed sm:hidden bottom-4 inset-x-4 z-40 pointer-events-none">
          <Link
            href="/communities/create"
            className="pointer-events-auto flex items-center justify-center gap-1.5 h-12 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-[14px] font-medium shadow-lg shadow-black/10"
          >
            Start a community
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}