// "use client";

// import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
// import Link from "next/link";
// import DOMPurify from "isomorphic-dompurify";
// import {
//   Star, ShieldCheck, Clock, Loader2, BadgeCheck,
//   ShoppingBag, Shield, Truck, Info, ArrowRight,
//   Eye, Package, MapPin, RotateCcw, Lock,
//   ThumbsUp, Award, TrendingUp, CheckCircle2,
//   MessageSquare, Globe, Zap, Users, Timer,
//   AlertTriangle, Flame, Bolt,
// } from "lucide-react";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { cn } from "@/lib/utils";
// import {
//   ProductPriceDisplay,
//   ProductBuyBoxPrice,
// } from "@/components/marketplace/product-price-display";
// import { ProductActionModule } from "@/components/marketplace/product-action-module";
// import { FollowButton } from "@/components/marketplace/follow-button";
// import { ReviewForm } from "@/components/marketplace/review-form";
// import { ImageGallery } from "@/components/marketplace/image-gallery";
// import {
//   VariantSelector,
//   VariantStockBadge,
//   type ProductVariant,
// } from "@/components/marketplace/variant-selector";
// import { useCurrency } from "@/context/CurrencyContext";
// import {
//   ProductBreadcrumb, SaveShareBar, SocialProofBar,
//   AffiliateBanner, FaqSection, CommunityAccessCard, RelatedProducts,
// } from "@/components/marketplace/product-detail-shared";
// import {
//   getCJTitle, cleanCJDescription, parseCJSpecifications, formatCJWeight,
// } from "@/lib/cj/render";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface PhysicalProductDetailProps {
//   product: any;
//   vendor: any;
//   relatedProducts: any[];
//   cartSet: Set<string>;
//   followedVendorIds: string[];
// }

// const ALLOWED_HTML_TAGS = [
//   "p", "ul", "ol", "li", "strong", "b", "em", "br", "h3", "h4", "span", "table", "tr", "td", "th",
// ];
// const ALLOWED_HTML_ATTR: string[] = [];

// function htmlToPlainText(html: string): string {
//   return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
// }


// function useLiveViewers(baseCount: number = 0) {
//   const base = Math.max(baseCount, 3);
//   const [viewers, setViewers] = useState(base); // ← stable, matches server

//   useEffect(() => {
//     // Randomize only after hydration is complete
//     setViewers(base + Math.floor(Math.random() * 8));

//     const interval = setInterval(() => {
//       setViewers((prev) => {
//         const delta = Math.random() > 0.5 ? 1 : -1;
//         return Math.max(base, Math.min(prev + delta, base + 15));
//       });
//     }, 4500);

//     return () => clearInterval(interval);
//   }, [base]);

//   return viewers;
// }

// // ─── Recently Viewed ──────────────────────────────────────────────────────────

// function useRecentlyViewed(currentId: string, currentProduct: any) {
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem("recently_viewed");
//       const list: any[] = raw ? JSON.parse(raw) : [];
//       const filtered = list.filter((p) => p.id !== currentId).slice(0, 7);
//       filtered.unshift({
//         id: currentId,
//         name: currentProduct.name,
//         slug: currentProduct.slug,
//         price: currentProduct.price,
//         images: currentProduct.images,
//         currency: currentProduct.currency,
//       });
//       localStorage.setItem("recently_viewed", JSON.stringify(filtered));
//     } catch { /* silent */ }
//   }, [currentId]);
// }

// // ─── Live Activity Toast ──────────────────────────────────────────────────────

// const FAKE_CITIES = ["Lagos", "London", "Nairobi", "Dubai", "Paris", "New York", "Accra", "Kigali", "Toronto", "Berlin"];
// const FAKE_ACTIONS = ["just purchased this", "added to cart", "is viewing this now"];

// function LiveActivityToast({ productName }: { productName: string }) {
//   const [visible, setVisible] = useState(false);
//   const [message, setMessage] = useState({ city: "", action: "" });
//   const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   useEffect(() => {
//     function showToast() {
//       const city = FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)];
//       const action = FAKE_ACTIONS[Math.floor(Math.random() * FAKE_ACTIONS.length)];
//       setMessage({ city, action });
//       setVisible(true);
//       timerRef.current = setTimeout(() => {
//         setVisible(false);
//         timerRef.current = setTimeout(showToast, 8000 + Math.random() * 6000);
//       }, 4000);
//     }
//     timerRef.current = setTimeout(showToast, 5000 + Math.random() * 4000);
//     return () => { if (timerRef.current) clearTimeout(timerRef.current); };
//   }, []);

//   return (
//     <div
//       className={cn(
//         "fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-500 max-w-[280px]",
//         "bg-[var(--color-surface)] border-[var(--color-border)]",
//         visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
//       )}
//     >
//       <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
//         <ShoppingBag className="h-4 w-4 text-orange-500" />
//       </div>
//       <div>
//         <p className="text-[11px] font-semibold text-[var(--color-text-primary)] leading-none">
//           Someone from {message.city}
//         </p>
//         <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{message.action}</p>
//       </div>
//     </div>
//   );
// }

// // ─── Shipping Section ─────────────────────────────────────────────────────────

// function ShippingInfoSection({
//   isFreeShipping,
//   shipsFrom,
//   processingDays = "1–2",
//   deliveryDays,
//   hasTracking = true,
// }: {
//   isFreeShipping: boolean;
//   shipsFrom?: string;
//   processingDays?: string;
//   deliveryDays: string;
//   hasTracking?: boolean;
// }) {
//   const rows = [
//     { icon: MapPin, label: "Ships from", value: shipsFrom || "International warehouse" },
//     { icon: Timer, label: "Processing time", value: `${processingDays} business days` },
//     { icon: Truck, label: "Est. delivery", value: deliveryDays },
//     { icon: Package, label: "Shipping cost", value: isFreeShipping ? "Free" : "Calculated at checkout" },
//     { icon: Globe, label: "Tracking", value: hasTracking ? "Full tracking included" : "Limited tracking" },
//   ];

//   return (
//     <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
//       {rows.map(({ icon: Icon, label, value }, i) => (
//         <div
//           key={label}
//           className="flex items-center gap-3 px-4 py-3"
//           style={{
//             borderBottom: i < rows.length - 1 ? "1px solid var(--color-border)" : "none",
//             background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
//           }}
//         >
//           <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
//             <Icon className="h-3.5 w-3.5 text-blue-500" />
//           </div>
//           <span className="text-[11px] text-[var(--color-text-muted)] w-28 shrink-0">{label}</span>
//           <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{value}</span>
//         </div>
//       ))}
//     </div>
//   );
// }

// // ─── Buyer Protection Block ───────────────────────────────────────────────────

// function BuyerProtectionSection() {
//   const items = [
//     { icon: RotateCcw, title: "14-day free returns", desc: "Changed your mind? No hassle." },
//     { icon: ShieldCheck, title: "Delivery guarantee", desc: "Full refund if not delivered" },
//     { icon: Lock, title: "Secure checkout", desc: "256-bit SSL encryption" },
//     { icon: MessageSquare, title: "Dispute protection", desc: "We're on your side" },
//   ];

//   return (
//     <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
//       <div className="flex items-center gap-2 mb-1">
//         <Shield className="h-4 w-4 text-emerald-500" />
//         <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">Buyer Protection</p>
//       </div>
//       <div className="grid grid-cols-2 gap-2.5">
//         {items.map(({ icon: Icon, title, desc }) => (
//           <div key={title} className="flex items-start gap-2">
//             <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
//               <Icon className="h-3 w-3 text-emerald-500" />
//             </div>
//             <div>
//               <p className="text-[10px] font-semibold text-[var(--color-text-primary)] leading-none">{title}</p>
//               <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5 leading-tight">{desc}</p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─── Enhanced Vendor Card ─────────────────────────────────────────────────────

// function EnhancedVendorCard({
//   vendor,
//   followedVendorIds,
// }: {
//   vendor: any;
//   followedVendorIds: string[];
// }) {
//   const rating = vendor.rating ?? 4.8;
//   const fulfilledOrders = vendor.total_sales ?? vendor.fulfilled_orders ?? null;
//   const responseTime = vendor.response_time ?? "< 2 hrs";
//   const memberSince = vendor.created_at
//     ? new Date(vendor.created_at).getFullYear()
//     : null;

//   return (
//     <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
//       {/* Header */}
//       <div className="p-4 flex items-center gap-3" style={{ background: "var(--color-surface)" }}>
//         <div className="h-12 w-12 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden">
//           {vendor.business_logo
//             ? <img src={vendor.business_logo} className="w-full h-full object-cover" alt={vendor.business_name} />
//             : <ShoppingBag className="h-5 w-5 text-[var(--color-text-muted)]" />}
//         </div>
//         <div className="flex-1 min-w-0">
//           <div className="flex items-center gap-1.5 mb-0.5">
//             <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{vendor.business_name}</p>
//             <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
//           </div>
//           <div className="flex items-center gap-1">
//             {[1, 2, 3, 4, 5].map((i) => (
//               <Star key={i} className={cn("h-2.5 w-2.5", i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
//             ))}
//             <span className="text-[10px] font-semibold text-[var(--color-text-primary)] ml-0.5">{rating.toFixed(1)}</span>
//           </div>
//         </div>
//         <Link
//           href={`/vendors/${vendor.business_slug}`}
//           className="flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors shrink-0"
//         >
//           Visit store <ArrowRight className="h-3 w-3" />
//         </Link>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-3 divide-x divide-[var(--color-border)] border-t border-[var(--color-border)]"
//         style={{ background: "var(--color-surface-secondary)" }}>
//         {[
//           { label: "Response", value: responseTime, icon: MessageSquare },
//           { label: "Orders", value: fulfilledOrders ? `${(fulfilledOrders / 1000).toFixed(1)}k+` : "500+", icon: Package },
//           { label: "Since", value: memberSince ? String(memberSince) : "2022", icon: Award },
//         ].map(({ label, value, icon: Icon }) => (
//           <div key={label} className="flex flex-col items-center py-2.5 gap-1">
//             <Icon className="h-3 w-3 text-[var(--color-text-muted)]" />
//             <p className="text-[11px] font-bold text-[var(--color-text-primary)]">{value}</p>
//             <p className="text-[9px] text-[var(--color-text-muted)]">{label}</p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─── Product Badges ───────────────────────────────────────────────────────────

// function ProductBadges({
//   product,
//   savings,
//   isFreeShipping,
// }: {
//   product: any;
//   savings: number | null;
//   isFreeShipping: boolean;
// }) {
//   const isBestseller = (product.sale_count ?? 0) >= 100;
//   const isTrending = (product.view_count ?? 0) >= 500 || (product.sale_count ?? 0) >= 50;
//   const isFastShipping = isFreeShipping || (product.source_metadata?.cj_shipping_days ?? 99) <= 7;

//   return (
//     <div className="flex flex-wrap items-center gap-2">
//       <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
//         <Truck className="h-3 w-3" />Physical product
//       </span>

//       {savings && (
//         <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
//           {savings}% off
//         </span>
//       )}

//       {isBestseller && (
//         <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20">
//           <Award className="h-3 w-3" />Bestseller
//         </span>
//       )}

//       {isTrending && !isBestseller && (
//         <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-500/20">
//           <TrendingUp className="h-3 w-3" />Trending
//         </span>
//       )}

//       {isFastShipping && (
//         <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
//           <Zap className="h-3 w-3" />Fast shipping
//         </span>
//       )}

//       {product.affiliate_enabled && (
//         <span
//           className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
//           style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)", borderColor: "rgba(253,80,0,0.20)" }}
//         >
//           {product.affiliate_commission_rate ?? 10}% affiliate
//         </span>
//       )}
//     </div>
//   );
// }

// // ─── Secure Checkout Badge ────────────────────────────────────────────────────

// function SecureCheckoutBadge() {
//   return (
//     <div
//       className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg"
//       style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
//     >
//       <Lock className="h-3 w-3 text-emerald-500 shrink-0" />
//       <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
//         256-bit SSL · Secure checkout
//       </span>
//     </div>
//   );
// }

// // ─── Live Urgency Bar ─────────────────────────────────────────────────────────

// function LiveUrgencyBar({
//   viewers,
//   inventory,
//   saleCount,
// }: {
//   viewers: number;
//   inventory: number;
//   saleCount: number;
// }) {
//   return (
//     <div className="space-y-1.5">
//       {viewers > 3 && (
//         <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
//           <span className="relative flex h-2 w-2">
//             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
//             <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
//           </span>
//           <span><strong className="text-[var(--color-text-primary)]">{viewers}</strong> people viewing right now</span>
//         </div>
//       )}
//       {saleCount > 0 && (
//         <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
//           <Flame className="h-3 w-3 text-orange-500 shrink-0" />
//           <span><strong className="text-[var(--color-text-primary)]">{saleCount.toLocaleString()}</strong> sold this month</span>
//         </div>
//       )}
//       {inventory > 0 && inventory <= 10 && (
//         <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400">
//           <AlertTriangle className="h-3 w-3 shrink-0" />
//           <span>Only <strong>{inventory}</strong> left — order soon</span>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Variants Table ───────────────────────────────────────────────────────────

// function VariantsTable({
//   variants,
//   currency,
// }: {
//   variants: ProductVariant[];
//   productName: string;
//   currency?: string | null;
// }) {
//   const names = variants.map((v) => v.name ?? "");
//   const prefixLen = commonPrefixLength(names);

//   return (
//     <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
//       <table className="w-full text-sm">
//         <thead>
//           <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
//             {["Variant", "Price", "Stock"].map((h, i) => (
//               <th key={h} className={cn("px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]", i === 0 ? "text-left" : "text-right")}>
//                 {h}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {variants.map((v, i) => {
//             const words = (v.name ?? "").split(" ");
//             const label = words.slice(prefixLen).join(" ").trim() || v.name;
//             const isOos = v.inventory_quantity <= 0;
//             return (
//               <tr
//                 key={v.id}
//                 style={{
//                   background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
//                   borderBottom: i < variants.length - 1 ? "1px solid var(--color-border)" : "none",
//                   opacity: isOos ? 0.5 : 1,
//                 }}
//               >
//                 <td className="px-4 py-3 text-[13px] font-medium text-[var(--color-text-primary)]">
//                   <div className="flex items-center gap-2">
//                     {v.image_url && <img src={v.image_url} className="h-7 w-7 rounded object-cover border border-[var(--color-border)]" alt="" />}
//                     {label}
//                     {isOos && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-semibold">OOS</span>}
//                   </div>
//                 </td>
//                 <td className="px-4 py-3 text-right text-[13px] font-semibold text-[var(--color-text-primary)]">
//                   {currency} {v.price.toLocaleString()}
//                   {v.compare_at_price && v.compare_at_price > v.price && (
//                     <span className="text-[10px] text-[var(--color-text-muted)] line-through ml-1">{currency} {v.compare_at_price.toLocaleString()}</span>
//                   )}
//                 </td>
//                 <td className="px-4 py-3 text-right">
//                   {isOos
//                     ? <span className="text-[11px] font-semibold text-red-500">Out of stock</span>
//                     : v.inventory_quantity <= 5
//                       ? <span className="text-[11px] font-semibold text-amber-500">{v.inventory_quantity} left</span>
//                       : <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{v.inventory_quantity.toLocaleString()} in stock</span>}
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// function commonPrefixLength(names: string[]): number {
//   if (names.length === 0) return 0;
//   const first = names[0].split(" ");
//   let len = first.length;
//   for (const name of names.slice(1)) {
//     const parts = name.split(" ");
//     let i = 0;
//     while (i < len && i < parts.length && first[i].toLowerCase() === parts[i].toLowerCase()) i++;
//     len = i;
//   }
//   return len;
// }

// // ─── Review Breakdown ─────────────────────────────────────────────────────────

// function ReviewBreakdown({ rating }: { rating: number }) {
//   const pcts = useMemo(() => {
//     const r = Math.min(5, Math.max(1, rating));
//     const five = Math.round(((r - 1) / 4) * 65 + 10);
//     const four = Math.round((5 - r) * 5 + 10);
//     const three = Math.max(0, 100 - five - four - 5 - 3);
//     return [
//       { star: 5, pct: five }, { star: 4, pct: four },
//       { star: 3, pct: three }, { star: 2, pct: 5 }, { star: 1, pct: 3 },
//     ];
//   }, [rating]);

//   return (
//     <div className="flex-1 space-y-2">
//       {pcts.map(({ star, pct }) => (
//         <div key={star} className="flex items-center gap-2.5">
//           <span className="text-[10px] font-semibold tabular-nums w-2 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>{star}</span>
//           <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
//             <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct >= 50 ? "#f59e0b" : pct >= 15 ? "#fbbf24" : "var(--color-border-strong)" }} />
//           </div>
//           <span className="text-[10px] tabular-nums w-6 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>{pct}%</span>
//         </div>
//       ))}
//     </div>
//   );
// }

// // ─── Trust Pill ───────────────────────────────────────────────────────────────

// function TrustPill({ icon, label, color }: { icon: React.ReactNode; label: string; color: "blue" | "violet" | "emerald" }) {
//   const colors = {
//     blue: "text-blue-500 bg-blue-500/8",
//     violet: "text-violet-500 bg-violet-500/8",
//     emerald: "text-emerald-500 bg-emerald-500/8",
//   };
//   return (
//     <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
//       <span className={cn("shrink-0", colors[color])}>{icon}</span>
//       <span className="text-[9px] font-semibold text-[var(--color-text-muted)] leading-tight">{label}</span>
//     </div>
//   );
// }

// // ─── Main Component ───────────────────────────────────────────────────────────

// export function PhysicalProductDetail({
//   product, vendor, relatedProducts, followedVendorIds,
// }: PhysicalProductDetailProps) {
//   const { formatMoney } = useCurrency();

//   const title = useMemo(
//     () => getCJTitle({ productNameEn: product.name, productName: null }) || product.name,
//     [product.name],
//   );

//   // ── Variants ──────────────────────────────────────────────────────────────
//   const variants: ProductVariant[] = useMemo(
//     () =>
//       (product.product_variants ?? [])
//         .filter((v: any) => v.is_active)
//         .map((v: any) => ({
//           id: v.id,
//           name: v.name ?? "",
//           price: Number(v.price),
//           compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
//           inventory_quantity: v.inventory_quantity ?? 0,
//           image_url: v.image_url ?? null,
//           options: v.options ?? null,
//           is_active: Boolean(v.is_active),
//           sku: v.sku ?? null,
//         })),
//     [product.product_variants],
//   );

//   const hasVariants = variants.length > 0;

//   const defaultVariant = useMemo(
//     () => variants.find((v) => v.inventory_quantity > 0) ?? variants[0] ?? null,
//     [variants],
//   );

//   const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant);

//   const handleVariantSelect = useCallback((v: ProductVariant) => {
//     setSelectedVariant(v);
//   }, []);

//   // ── Derived values ────────────────────────────────────────────────────────
//   const activePrice = selectedVariant ? selectedVariant.price : Number(product.price);
//   const activeCompareAt = selectedVariant?.compare_at_price ?? product.compare_at_price ?? null;
//   const activeInventory = selectedVariant?.inventory_quantity ?? product.inventory_quantity ?? 0;

//   const baseImages: string[] = product.images ?? [];
//   const activeImages = useMemo(() => {
//     if (selectedVariant?.image_url) {
//       return [selectedVariant.image_url, ...baseImages.filter((img) => img !== selectedVariant.image_url)];
//     }
//     return baseImages;
//   }, [selectedVariant, baseImages]);

//   const savings =
//     activeCompareAt && activeCompareAt > activePrice
//       ? Math.round((1 - activePrice / activeCompareAt) * 100)
//       : null;

//   const reviewCount = product.review_count ?? 0;
//   const saleCount = product.sale_count ?? 0;

//   const cleanedHtml = useMemo(() => cleanCJDescription(product.description), [product.description]);

//   const safeHtml = useMemo(
//     () => DOMPurify.sanitize(cleanedHtml, { ALLOWED_TAGS: ALLOWED_HTML_TAGS, ALLOWED_ATTR: ALLOWED_HTML_ATTR }),
//     [cleanedHtml],
//   );

//   const descriptionPreview = useMemo(() => {
//     const plain = htmlToPlainText(cleanedHtml);
//     return plain.length > 220 ? `${plain.slice(0, 220)}…` : plain;
//   }, [cleanedHtml]);

//   const { specs: parsedSpecs, notes: specNotes } = useMemo(
//     () => parseCJSpecifications(product.description),
//     [product.description],
//   );

//   const weightDisplay = formatCJWeight(product.weight);
//   const cjMeta = product.source_metadata ?? {};
//   const isFreeShipping = product.is_free_shipping ?? cjMeta.cj_is_free_shipping ?? false;
//   const shippingCountries: string[] = cjMeta.cj_shipping_countries ?? [];
//   const shipsFrom: string = cjMeta.cj_ships_from ?? cjMeta.ships_from ?? "International warehouse";
//   const shippingDays: string = cjMeta.cj_shipping_days
//     ? `${cjMeta.cj_shipping_days}–${cjMeta.cj_shipping_days + 5} days`
//     : isFreeShipping ? "5–10 business days" : "7–14 business days";

//   // ── Enhanced specs ────────────────────────────────────────────────────────
//   const specRows = useMemo(() => {
//     const base = parsedSpecs.length > 0
//       ? parsedSpecs.map((s) => ({ label: s.key, value: s.value }))
//       : [];

//     const extras = [
//       { label: "Weight", value: weightDisplay || "—" },
//       { label: "SKU", value: product.sku || "—" },
//       { label: "Brand", value: cjMeta.brand ?? product.brand ?? "—" },
//       { label: "Material", value: cjMeta.material ?? product.material ?? "—" },
//       { label: "Dimensions", value: cjMeta.dimensions ?? product.dimensions ?? "—" },
//       { label: "Package size", value: cjMeta.package_size ?? "—" },
//       { label: "Condition", value: "Brand New" },
//       { label: "Shipping", value: isFreeShipping ? "Free shipping" : "Standard rates apply" },
//     ];

//     // Merge — only add extras not already covered by parsedSpecs
//     const existingKeys = new Set(base.map((r) => r.label.toLowerCase()));
//     const merged = [...base];
//     for (const row of extras) {
//       if (!existingKeys.has(row.label.toLowerCase()) && row.value !== "—") {
//         merged.push(row);
//       }
//     }
//     // Always ensure Weight and SKU are included
//     if (!existingKeys.has("weight")) merged.push({ label: "Weight", value: weightDisplay || "—" });
//     if (!existingKeys.has("sku")) merged.push({ label: "SKU", value: product.sku || "—" });
//     return merged;
//   }, [parsedSpecs, weightDisplay, product.sku, isFreeShipping, cjMeta, product.brand, product.material, product.dimensions]);

//   // ── Live features ─────────────────────────────────────────────────────────
//   const liveViewers = useLiveViewers(product.view_count ? Math.min(product.view_count, 12) : 5);
//   useRecentlyViewed(product.id, product);

//   // ── Props ─────────────────────────────────────────────────────────────────
//   const vendorProps = vendor
//     ? {
//       id: vendor.id,
//       business_name: vendor.business_name ?? null,
//       business_logo: vendor.business_logo ?? null,
//       business_slug: vendor.business_slug ?? null,
//     }
//     : null;

//   const productProps = {
//     id: product.id,
//     name: title,
//     slug: product.slug,
//     price: activePrice,
//     images: activeImages,
//     vendor_id: product.vendor_id,
//     currency: product.currency,
//   };

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)]">
//       <LiveActivityToast productName={title} />

//       {/* ── Breadcrumb ── */}
//       <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
//         <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
//           <ProductBreadcrumb productName={title} />
//           <SaveShareBar />
//         </div>
//       </div>
//       <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
//         {/* ── Page header ── */}
//         <div className="mb-6">
//           {/* Badges row */}
//           <div className="mb-3">
//             <ProductBadges product={product} savings={savings} isFreeShipping={isFreeShipping} />
//           </div>

//           <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] leading-tight tracking-tight mb-3">
//             {title}
//           </h1>

//           <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)] mb-4">
//             {reviewCount > 0 && (
//               <>
//                 <div className="flex items-center gap-1.5">
//                   {[1, 2, 3, 4, 5].map((i) => (
//                     <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(product.rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
//                   ))}
//                   <span className="font-semibold text-[var(--color-text-primary)] ml-0.5">{(product.rating ?? 0).toFixed(1)}</span>
//                   <span>({reviewCount} reviews)</span>
//                 </div>
//                 <span className="select-none text-[var(--color-border-strong)]">·</span>
//               </>
//             )}
//             <VariantStockBadge quantity={activeInventory} />
//             {saleCount > 0 && (
//               <>
//                 <span className="select-none text-[var(--color-border-strong)]">·</span>
//                 <span>{saleCount.toLocaleString()}+ sold</span>
//               </>
//             )}
//             {/* Live viewers inline */}
//             <span className="select-none text-[var(--color-border-strong)]">·</span>
//             <span className="flex items-center gap-1.5">
//               <span className="relative flex h-2 w-2">
//                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
//                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
//               </span>
//               <span className="font-semibold text-[var(--color-text-primary)]">{liveViewers}</span> viewing now
//             </span>
//           </div>

//           <SocialProofBar saleCount={saleCount} reviewCount={reviewCount} />
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">

//           {/* ── LEFT ── */}
//           <div className="lg:col-span-8 space-y-10">

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

//               {/* Gallery */}
//               <div className="space-y-3">
//                 <ImageGallery
//                   images={activeImages}
//                   productName={title}
//                   isFeatured={product.is_featured}
//                   savings={savings}
//                 />
//                 <div className="grid grid-cols-3 gap-2 pt-1">
//                   {isFreeShipping && <TrustPill icon={<Truck className="h-3.5 w-3.5" />} label="Free Shipping" color="blue" />}
//                   <TrustPill icon={<RotateCcw className="h-3.5 w-3.5" />} label="14-day Returns" color="violet" />
//                   <TrustPill icon={<Shield className="h-3.5 w-3.5" />} label="Buyer Protection" color="emerald" />
//                 </div>
//               </div>

//               {/* Essential info */}
//               <div className="flex flex-col gap-5">
//                 <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-md w-fit">
//                   {product.product_type || "Physical Product"}
//                 </span>

//                 {/* Price */}
//                 <div className="py-4 border-y border-[var(--color-border)]">
//                   <ProductPriceDisplay
//                     price={activePrice}
//                     compareAtPrice={activeCompareAt}
//                     currency={product.currency}
//                     savings={savings}
//                     className="text-3xl"
//                   />
//                   {savings && (
//                     <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5">
//                       You save {savings}% on this item
//                     </p>
//                   )}
//                 </div>

//                 {/* Variant selector */}
//                 {hasVariants && (
//                   <VariantSelector
//                     variants={variants}
//                     productName={product.name}
//                     selectedVariantId={selectedVariant?.id ?? null}
//                     onSelect={handleVariantSelect}
//                   />
//                 )}

//                 {!hasVariants && (
//                   <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
//                     {descriptionPreview}
//                   </p>
//                 )}

//                 {/* Vendor inline card */}
//                 {vendor && (
//                   <EnhancedVendorCard vendor={vendor} followedVendorIds={followedVendorIds} />
//                 )}
//               </div>
//             </div>

//             {/* ── Tabs ── */}
//             <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
//               <Tabs defaultValue="overview" className="w-full">
//                 <div className="px-5 pt-5 sm:px-7 sm:pt-7">
//                   <TabsList className="h-10 p-1 gap-1 rounded-xl w-fit bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
//                     {[
//                       { id: "overview", label: "Overview", badge: null },
//                       { id: "specs", label: "Specs", badge: specRows.length > 0 ? specRows.length : null },
//                       { id: "shipping", label: "Shipping", badge: null },
//                       { id: "variants", label: "Variants", badge: hasVariants ? variants.length : null },
//                       { id: "reviews", label: "Reviews", badge: reviewCount > 0 ? reviewCount : null },
//                       { id: "faq", label: "FAQ", badge: null },
//                     ]
//                       .filter((t) => t.id !== "variants" || hasVariants)
//                       .map(({ id, label, badge }) => (
//                         <TabsTrigger
//                           key={id}
//                           value={id}
//                           className={cn(
//                             "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide gap-1.5",
//                             "text-[var(--color-text-muted)]",
//                             "data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:shadow-none",
//                           )}
//                         >
//                           {label}
//                           {badge !== null && (
//                             <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }}>
//                               {badge}
//                             </span>
//                           )}
//                         </TabsTrigger>
//                       ))}
//                   </TabsList>
//                 </div>

//                 <div className="p-5 sm:p-7">

//                   {/* Overview */}
//                   <TabsContent value="overview" className="mt-0 space-y-6">

//                     {safeHtml ? (
//                       <div
//                         className="product-description text-[14px] leading-7 text-[var(--color-text-secondary)]"
//                         dangerouslySetInnerHTML={{ __html: safeHtml }}
//                       />
//                     ) : (
//                       <p className="text-[14px] leading-7 text-[var(--color-text-secondary)]">
//                         {descriptionPreview}
//                       </p>
//                     )}
//                   </TabsContent>

//                   {/* Specs */}
//                   <TabsContent value="specs" className="mt-0">
//                     <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
//                       {specRows.map(({ label, value }, i, arr) => (
//                         <div
//                           key={`${label}-${i}`}
//                           className="flex items-center justify-between px-4 py-3.5"
//                           style={{
//                             borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
//                             background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
//                           }}
//                         >
//                           <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{label}</span>
//                           <span className="text-sm font-medium text-right max-w-[60%]" style={{ color: "var(--color-text-primary)" }}>{value}</span>
//                         </div>
//                       ))}
//                     </div>
//                     {shippingCountries.length > 0 && (
//                       <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">Ships to: {shippingCountries.join(", ")}</p>
//                     )}
//                   </TabsContent>

//                   {/* Shipping */}
//                   <TabsContent value="shipping" className="mt-0 space-y-5">
//                     <ShippingInfoSection
//                       isFreeShipping={isFreeShipping}
//                       shipsFrom={shipsFrom}
//                       deliveryDays={shippingDays}
//                       hasTracking={cjMeta.cj_has_tracking ?? true}
//                     />
//                     {shippingCountries.length > 0 && (
//                       <div className="rounded-lg p-4" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
//                         <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Ships to</p>
//                         <p className="text-[12px] text-[var(--color-text-primary)] leading-relaxed">{shippingCountries.join(", ")}</p>
//                       </div>
//                     )}
//                     <BuyerProtectionSection />
//                   </TabsContent>

//                   {/* Variants */}
//                   {hasVariants && (
//                     <TabsContent value="variants" className="mt-0">
//                       <VariantsTable variants={variants} productName={product.name} currency={product.currency} />
//                     </TabsContent>
//                   )}

//                   {/* Reviews */}
//                   <TabsContent value="reviews" className="mt-0 space-y-6">
//                     {reviewCount > 0 && (
//                       <div className="flex items-center gap-6 p-5 rounded-xl" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
//                         <div className="text-center shrink-0">
//                           <p className="text-5xl font-bold tabular-nums leading-none" style={{ color: "var(--color-text-primary)" }}>{(product.rating ?? 0).toFixed(1)}</p>
//                           <div className="flex gap-0.5 mt-2 justify-center">
//                             {[1, 2, 3, 4, 5].map((i) => (
//                               <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(product.rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
//                             ))}
//                           </div>
//                           <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
//                           <div className="flex items-center gap-1 justify-center mt-2">
//                             <CheckCircle2 className="h-3 w-3 text-emerald-500" />
//                             <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Verified reviews</span>
//                           </div>
//                         </div>
//                         <div className="h-16 w-px" style={{ background: "var(--color-border)" }} />
//                         <ReviewBreakdown rating={product.rating ?? 0} />
//                       </div>
//                     )}
//                     {/* Verified badge note */}
//                     <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
//                       <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
//                       <span>Reviews marked with a badge are from verified purchasers</span>
//                     </div>
//                     <ReviewForm productId={product.id} vendorId={product.vendor_id} />
//                   </TabsContent>

//                   {/* FAQ */}
//                   <TabsContent value="faq" className="mt-0">
//                     <FaqSection />
//                   </TabsContent>
//                 </div>
//               </Tabs>
//             </div>

//             <AffiliateBanner product={product} />
//             <CommunityAccessCard vendorSlug={vendor?.business_slug} productName={title} />
//             <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
//           </div>

//           {/* ── RIGHT: Buy Box ── */}
//           <aside className="lg:col-span-4">
//             <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden sticky top-[calc(var(--navbar-height,64px)+56px)]">

//               {/* Price header */}
//               <div className="px-6 pt-6 pb-5 border-b border-[var(--color-border)]">
//                 <div className="flex items-start justify-between gap-4">
//                   <div>
//                     <ProductBuyBoxPrice
//                       price={activePrice}
//                       compareAtPrice={activeCompareAt}
//                       currency={product.currency}
//                       savings={savings}
//                       className="text-3xl"
//                     />
//                     {hasVariants && selectedVariant && (
//                       <p className="text-[11px] text-[var(--color-text-muted)] mt-1 truncate max-w-[180px]">
//                         {selectedVariant.name}
//                       </p>
//                     )}
//                   </div>
//                   <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
//                     <ShoppingBag className="h-5 w-5 text-emerald-500" />
//                   </div>
//                 </div>

//                 {/* Live urgency */}
//                 <div className="mt-3">
//                   <LiveUrgencyBar viewers={liveViewers} inventory={activeInventory} saleCount={saleCount} />
//                 </div>
//               </div>

//               {/* Variant selector in buy box */}
//               {hasVariants && (
//                 <div className="px-6 pt-4 pb-4 border-b border-[var(--color-border)]">
//                   <VariantSelector
//                     variants={variants}
//                     productName={product.name}
//                     selectedVariantId={selectedVariant?.id ?? null}
//                     onSelect={handleVariantSelect}
//                   />
//                 </div>
//               )}

//               {/* Actions */}
//               <div className="p-6 space-y-3">
//                 <ProductActionModule
//                   product={productProps}
//                   vendor={vendorProps}
//                   selectedVariantId={selectedVariant?.id ?? null}
//                   selectedVariantOutOfStock={hasVariants && activeInventory <= 0}
//                   currentPath={`/marketplace/${product.slug}`}
//                   className="h-12 rounded-xl text-sm font-bold"
//                 />

//                 {activeInventory > 0 && activeInventory <= 5 && (
//                   <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
//                     <Info className="h-3.5 w-3.5 shrink-0" />
//                     <span>Only {activeInventory} left — order soon</span>
//                   </div>
//                 )}
//                 {hasVariants && activeInventory <= 0 && (
//                   <div className="flex items-center gap-2 text-xs text-red-500">
//                     <Info className="h-3.5 w-3.5 shrink-0" />
//                     <span>This option is out of stock</span>
//                   </div>
//                 )}

//                 <SecureCheckoutBadge />
//               </div>

//               {/* Inclusions */}
//               <div className="px-6 pb-4 space-y-3">
//                 <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">What's included</p>
//                 <div className="space-y-2.5">
//                   {[
//                     isFreeShipping
//                       ? { icon: Truck, text: "Free shipping", sub: `Delivered in ${shippingDays}` }
//                       : { icon: Truck, text: "Standard shipping", sub: `Delivered in ${shippingDays}` },
//                     { icon: ShieldCheck, text: "7-day money-back guarantee", sub: "No questions asked" },
//                     { icon: Clock, text: "Priority global logistics", sub: "Tracked & insured" },
//                     { icon: Lock, text: "Secure payment", sub: "256-bit SSL encrypted" },
//                   ].map(({ icon: Icon, text, sub }) => (
//                     <div key={text} className="flex items-start gap-3">
//                       <div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
//                         <Icon className="h-3.5 w-3.5 text-orange-500" />
//                       </div>
//                       <div>
//                         <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-none">{text}</p>
//                         <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Buyer protection */}
//               <div className="px-6 pb-5">
//                 <BuyerProtectionSection />
//               </div>

//               {/* Vendor footer */}
//               {vendor && (
//                 <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
//                   <div className="flex items-center gap-3 mb-3">
//                     <div className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex items-center justify-center shrink-0">
//                       {vendor.business_logo
//                         ? <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" />
//                         : <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate leading-none">{vendor.business_name}</p>
//                       <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
//                         <BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" />
//                         Verified Supplier
//                       </p>
//                     </div>
//                     <Link href={`/vendors/${vendor.business_slug}`} className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-0.5 shrink-0">
//                       Store <ArrowRight className="h-3 w-3" />
//                     </Link>
//                   </div>
//                   <FollowButton
//                     vendorId={vendor.id}
//                     initialFollowing={followedVendorIds.includes(String(vendor.id))}
//                     className="w-full h-9 rounded-xl border border-[var(--color-border)] text-[12px] font-semibold"
//                   />
//                 </div>
//               )}
//             </div>
//           </aside>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import {
  Star, ShieldCheck, Clock, BadgeCheck,
  ShoppingBag, Shield, Truck, Info, ArrowRight,
  Package, MapPin, RotateCcw, Lock,
  Award, TrendingUp, CheckCircle2,
  MessageSquare, Globe, Zap, Timer,
  AlertTriangle, Flame,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ProductPriceDisplay,
  ProductBuyBoxPrice,
} from "@/components/marketplace/product-price-display";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import {
  VariantSelector,
  VariantStockBadge,
  type ProductVariant,
} from "@/components/marketplace/variant-selector";
import { useCurrency } from "@/context/CurrencyContext";
import {
  ProductBreadcrumb, SaveShareBar, SocialProofBar,
  AffiliateBanner, FaqSection, CommunityAccessCard, RelatedProducts,
} from "@/components/marketplace/product-detail-shared";
import {
  getCJTitle, cleanCJDescription, parseCJSpecifications, formatCJWeight,
} from "@/lib/cj/render";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShippingOption {
  id: string;
  method_name: string;
  carrier: string | null;
  estimated_delivery: string | null;
  min_delivery_days: number | null;
  max_delivery_days: number | null;
  shipping_fee: number;
  currency: string;
  is_free_shipping: boolean;
  has_tracking: boolean;
  is_recommended: boolean;
  ship_from_name: string | null;
  ship_from_country: string;
  source: string;
}

interface RatingBreakdown {
  "5": number;
  "4": number;
  "3": number;
  "2": number;
  "1": number;
}

interface PhysicalProductDetailProps {
  product: any;
  vendor: any;
  relatedProducts: any[];
  shippingOptions?: ShippingOption[];   // from product_shipping_options table
  userCountry?: string;                  // ISO2 detected from IP or profile
  followedVendorIds: string[];
  // cartSet removed — no backing table, was unused
}

const ALLOWED_HTML_TAGS = [
  "p", "ul", "ol", "li", "strong", "b", "em", "br",
  "h3", "h4", "span", "table", "tr", "td", "th",
];
const ALLOWED_HTML_ATTR: string[] = [];

function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Live Viewers ─────────────────────────────────────────────────────────────

function useLiveViewers(baseCount: number = 0) {
  const base = Math.max(baseCount, 3);
  const [viewers, setViewers] = useState(base);

  useEffect(() => {
    setViewers(base + Math.floor(Math.random() * 8));
    const interval = setInterval(() => {
      setViewers((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(base, Math.min(prev + delta, base + 15));
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [base]);

  return viewers;
}

// ─── Recently Viewed ──────────────────────────────────────────────────────────

function useRecentlyViewed(currentId: string, currentProduct: any) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recently_viewed");
      const list: any[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((p) => p.id !== currentId).slice(0, 7);
      filtered.unshift({
        id: currentId,
        name: currentProduct.name,
        slug: currentProduct.slug,
        price: currentProduct.price,
        images: currentProduct.images,
        currency: currentProduct.currency,
      });
      localStorage.setItem("recently_viewed", JSON.stringify(filtered));
    } catch { /* silent */ }
  }, [currentId]);
}

// ─── Live Activity Toast ──────────────────────────────────────────────────────
// NOTE: This uses fake data. Replace with real activity feed when available.

const FAKE_CITIES = [
  "Lagos", "London", "Nairobi", "Dubai", "Paris",
  "New York", "Accra", "Kigali", "Toronto", "Berlin",
];
const FAKE_ACTIONS = ["just purchased this", "added to cart", "is viewing this now"];

function LiveActivityToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState({ city: "", action: "" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function showToast() {
      const city = FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)];
      const action = FAKE_ACTIONS[Math.floor(Math.random() * FAKE_ACTIONS.length)];
      setMessage({ city, action });
      setVisible(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        timerRef.current = setTimeout(showToast, 8000 + Math.random() * 6000);
      }, 4000);
    }
    timerRef.current = setTimeout(showToast, 5000 + Math.random() * 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-500 max-w-[280px]",
        "bg-[var(--color-surface)] border-[var(--color-border)]",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
        <ShoppingBag className="h-4 w-4 text-orange-500" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-[var(--color-text-primary)] leading-none">
          Someone from {message.city}
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{message.action}</p>
      </div>
    </div>
  );
}

// ─── Shipping Options Table ───────────────────────────────────────────────────
// Replaces the old hardcoded ShippingInfoSection.
// Renders real data from product_shipping_options when available,
// falls back to legacy source_metadata fields for CJ products not yet re-synced.

function ShippingOptionsTable({ options }: { options: ShippingOption[] }) {
  if (!options.length) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {/* Header */}
      <div
        className="grid grid-cols-3 px-4 py-2.5"
        style={{
          background: "var(--color-surface-secondary)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {["Method", "Delivery", "Cost"].map((h, i) => (
          <span
            key={h}
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
              i > 0 && "text-right"
            )}
          >
            {h}
          </span>
        ))}
      </div>

      {options.map((opt, i) => (
        <div
          key={opt.id}
          className="grid grid-cols-3 items-center px-4 py-3 gap-2"
          style={{
            borderBottom: i < options.length - 1 ? "1px solid var(--color-border)" : "none",
            background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
          }}
        >
          {/* Method */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Truck className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate leading-none">
                {opt.method_name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {opt.is_recommended && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    BEST
                  </span>
                )}
                {opt.has_tracking && (
                  <span className="text-[9px] text-blue-500 font-medium flex items-center gap-0.5">
                    <Globe className="h-2.5 w-2.5" /> Tracked
                  </span>
                )}
                {opt.carrier && (
                  <span className="text-[9px] text-[var(--color-text-muted)] truncate">
                    {opt.carrier}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="text-right">
            <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">
              {opt.estimated_delivery ?? "—"}
            </p>
            {opt.ship_from_name && (
              <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
                From {opt.ship_from_name}
              </p>
            )}
          </div>

          {/* Cost */}
          <div className="text-right">
            {opt.is_free_shipping ? (
              <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                Free
              </span>
            ) : (
              <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                {opt.currency} {opt.shipping_fee.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Legacy Shipping Fallback ─────────────────────────────────────────────────
// Used when product_shipping_options has no rows yet (older imports).

function ShippingInfoFallback({
  isFreeShipping,
  shipsFrom,
  deliveryDays,
  hasTracking,
}: {
  isFreeShipping: boolean;
  shipsFrom: string;
  deliveryDays: string;
  hasTracking: boolean;
}) {
  const rows = [
    { icon: MapPin, label: "Ships from", value: shipsFrom },
    { icon: Timer, label: "Processing time", value: "1–2 business days" },
    { icon: Truck, label: "Est. delivery", value: deliveryDays },
    { icon: Package, label: "Shipping cost", value: isFreeShipping ? "Free" : "Calculated at checkout" },
    { icon: Globe, label: "Tracking", value: hasTracking ? "Full tracking included" : "Limited tracking" },
  ];

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {rows.map(({ icon: Icon, label, value }, i) => (
        <div
          key={label}
          className="flex items-center gap-3 px-4 py-3"
          style={{
            borderBottom: i < rows.length - 1 ? "1px solid var(--color-border)" : "none",
            background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
          }}
        >
          <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)] w-28 shrink-0">{label}</span>
          <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Buyer Protection ─────────────────────────────────────────────────────────

function BuyerProtectionSection() {
  const items = [
    { icon: RotateCcw, title: "14-day free returns", desc: "Changed your mind? No hassle." },
    { icon: ShieldCheck, title: "Delivery guarantee", desc: "Full refund if not delivered" },
    { icon: Lock, title: "Secure checkout", desc: "256-bit SSL encryption" },
    { icon: MessageSquare, title: "Dispute protection", desc: "We're on your side" },
  ];

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-4 w-4 text-emerald-500" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
          Buyer Protection
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-3 w-3 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--color-text-primary)] leading-none">{title}</p>
              <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5 leading-tight">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Vendor Card ──────────────────────────────────────────────────────────────

function EnhancedVendorCard({
  vendor,
  followedVendorIds,
}: {
  vendor: any;
  followedVendorIds: string[];
}) {
  const rating = vendor.rating ?? 0;
  const fulfilledOrders = vendor.total_sales ?? null;
  // response_time now comes from real DB column (added in migration)
  const responseTime = vendor.response_time ?? null;
  const memberSince = vendor.created_at
    ? new Date(vendor.created_at).getFullYear()
    : null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {/* Header */}
      <div className="p-4 flex items-center gap-3" style={{ background: "var(--color-surface)" }}>
        <div className="h-12 w-12 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden">
          {vendor.business_logo
            ? <img src={vendor.business_logo} className="w-full h-full object-cover" alt={vendor.business_name} />
            : <ShoppingBag className="h-5 w-5 text-[var(--color-text-muted)]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
              {vendor.business_name}
            </p>
            <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          </div>
          {rating > 0 ? (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-2.5 w-2.5",
                    i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200"
                  )}
                />
              ))}
              <span className="text-[10px] font-semibold text-[var(--color-text-primary)] ml-0.5">
                {rating.toFixed(1)}
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-[var(--color-text-muted)]">No reviews yet</p>
          )}
        </div>
        <Link
          href={`/vendors/${vendor.business_slug}`}
          className="flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors shrink-0"
        >
          Visit store <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Stats — only show real data, no fabricated fallbacks */}
      <div
        className="grid divide-x divide-[var(--color-border)] border-t border-[var(--color-border)]"
        style={{
          background: "var(--color-surface-secondary)",
          gridTemplateColumns: [responseTime, fulfilledOrders, memberSince]
            .filter(Boolean).length === 3
            ? "repeat(3, 1fr)"
            : [responseTime, fulfilledOrders, memberSince].filter(Boolean).length === 2
              ? "repeat(2, 1fr)"
              : "1fr",
        }}
      >
        {responseTime && (
          <div className="flex flex-col items-center py-2.5 gap-1">
            <MessageSquare className="h-3 w-3 text-[var(--color-text-muted)]" />
            <p className="text-[11px] font-bold text-[var(--color-text-primary)]">{responseTime}</p>
            <p className="text-[9px] text-[var(--color-text-muted)]">Response</p>
          </div>
        )}
        {fulfilledOrders !== null && (
          <div className="flex flex-col items-center py-2.5 gap-1">
            <Package className="h-3 w-3 text-[var(--color-text-muted)]" />
            <p className="text-[11px] font-bold text-[var(--color-text-primary)]">
              {fulfilledOrders >= 1000
                ? `${(fulfilledOrders / 1000).toFixed(1)}k+`
                : `${fulfilledOrders}+`}
            </p>
            <p className="text-[9px] text-[var(--color-text-muted)]">Orders</p>
          </div>
        )}
        {memberSince && (
          <div className="flex flex-col items-center py-2.5 gap-1">
            <Award className="h-3 w-3 text-[var(--color-text-muted)]" />
            <p className="text-[11px] font-bold text-[var(--color-text-primary)]">{memberSince}</p>
            <p className="text-[9px] text-[var(--color-text-muted)]">Since</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Product Badges ───────────────────────────────────────────────────────────

function ProductBadges({
  product,
  savings,
  isFreeShipping,
}: {
  product: any;
  savings: number | null;
  isFreeShipping: boolean;
}) {
  const isBestseller = (product.sale_count ?? 0) >= 100;
  const isTrending = (product.view_count ?? 0) >= 500 || (product.sale_count ?? 0) >= 50;
  // Use real shipping options data instead of guessing from source_metadata
  const isFastShipping = isFreeShipping;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
        <Truck className="h-3 w-3" /> Physical product
      </span>

      {savings !== null && savings > 0 && (
        <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
          {savings}% off
        </span>
      )}

      {isBestseller && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20">
          <Award className="h-3 w-3" /> Bestseller
        </span>
      )}

      {isTrending && !isBestseller && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-500/20">
          <TrendingUp className="h-3 w-3" /> Trending
        </span>
      )}

      {isFastShipping && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
          <Zap className="h-3 w-3" /> Free shipping
        </span>
      )}

      {product.affiliate_enabled && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
          style={{
            background: "rgba(253,80,0,0.08)",
            color: "var(--color-accent)",
            borderColor: "rgba(253,80,0,0.20)",
          }}
        >
          {product.affiliate_commission_rate ?? 10}% affiliate
        </span>
      )}
    </div>
  );
}

// ─── Secure Checkout Badge ────────────────────────────────────────────────────

function SecureCheckoutBadge() {
  return (
    <div
      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg"
      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
    >
      <Lock className="h-3 w-3 text-emerald-500 shrink-0" />
      <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
        256-bit SSL · Secure checkout
      </span>
    </div>
  );
}

// ─── Live Urgency Bar ─────────────────────────────────────────────────────────

function LiveUrgencyBar({
  viewers,
  inventory,
  saleCount,
  isCJ,
}: {
  viewers: number;
  inventory: number;
  saleCount: number;
  isCJ: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {viewers > 3 && (
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>
            <strong className="text-[var(--color-text-primary)]">{viewers}</strong> people viewing right now
          </span>
        </div>
      )}

      {saleCount > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <Flame className="h-3 w-3 text-orange-500 shrink-0" />
          <span>
            <strong className="text-[var(--color-text-primary)]">{saleCount.toLocaleString()}</strong> sold
          </span>
        </div>
      )}

      {/* Only show low-stock warning for non-CJ products with real inventory tracking */}
      {!isCJ && inventory > 0 && inventory <= 10 && (
        <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Only <strong>{inventory}</strong> left — order soon</span>
        </div>
      )}
    </div>
  );
}

// ─── Variants Table ───────────────────────────────────────────────────────────

function VariantsTable({
  variants,
  currency,
}: {
  variants: ProductVariant[];
  productName: string;
  currency?: string | null;
}) {
  const names = variants.map((v) => v.name ?? "");
  const prefixLen = commonPrefixLength(names);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
            {["Variant", "Price", "Stock"].map((h, i) => (
              <th
                key={h}
                className={cn(
                  "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
                  i === 0 ? "text-left" : "text-right"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((v, i) => {
            const words = (v.name ?? "").split(" ");
            const label = words.slice(prefixLen).join(" ").trim() || v.name;
            const isOos = v.inventory_quantity <= 0;
            return (
              <tr
                key={v.id}
                style={{
                  background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
                  borderBottom: i < variants.length - 1 ? "1px solid var(--color-border)" : "none",
                  opacity: isOos ? 0.5 : 1,
                }}
              >
                <td className="px-4 py-3 text-[13px] font-medium text-[var(--color-text-primary)]">
                  <div className="flex items-center gap-2">
                    {v.image_url && (
                      <img
                        src={v.image_url}
                        className="h-7 w-7 rounded object-cover border border-[var(--color-border)]"
                        alt=""
                      />
                    )}
                    {label}
                    {isOos && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-semibold">
                        OOS
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {currency} {v.price.toLocaleString()}
                  {v.compare_at_price && v.compare_at_price > v.price && (
                    <span className="text-[10px] text-[var(--color-text-muted)] line-through ml-1">
                      {currency} {v.compare_at_price.toLocaleString()}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isOos ? (
                    <span className="text-[11px] font-semibold text-red-500">Out of stock</span>
                  ) : v.inventory_quantity <= 5 ? (
                    <span className="text-[11px] font-semibold text-amber-500">{v.inventory_quantity} left</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      In stock
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function commonPrefixLength(names: string[]): number {
  if (names.length === 0) return 0;
  const first = names[0].split(" ");
  let len = first.length;
  for (const name of names.slice(1)) {
    const parts = name.split(" ");
    let i = 0;
    while (i < len && i < parts.length && first[i].toLowerCase() === parts[i].toLowerCase()) i++;
    len = i;
  }
  return len;
}

// ─── Review Breakdown ─────────────────────────────────────────────────────────
// Uses real rating_breakdown from DB when available, falls back to estimate.

function ReviewBreakdown({
  rating,
  reviewCount,
  breakdown,
}: {
  rating: number;
  reviewCount: number;
  breakdown?: RatingBreakdown | null;
}) {
  const pcts = useMemo(() => {
    // Real data path — use actual counts from rating_breakdown column
    if (breakdown && reviewCount > 0) {
      return [5, 4, 3, 2, 1].map((star) => ({
        star,
        pct: Math.round(((breakdown[String(star) as keyof RatingBreakdown] ?? 0) / reviewCount) * 100),
        count: breakdown[String(star) as keyof RatingBreakdown] ?? 0,
      }));
    }

    // Fallback estimate when no breakdown data yet
    const r = Math.min(5, Math.max(1, rating));
    const five = Math.round(((r - 1) / 4) * 65 + 10);
    const four = Math.round((5 - r) * 5 + 10);
    const three = Math.max(0, 100 - five - four - 5 - 3);
    return [
      { star: 5, pct: five, count: null },
      { star: 4, pct: four, count: null },
      { star: 3, pct: three, count: null },
      { star: 2, pct: 5, count: null },
      { star: 1, pct: 3, count: null },
    ];
  }, [rating, reviewCount, breakdown]);

  return (
    <div className="flex-1 space-y-2">
      {pcts.map(({ star, pct, count }) => (
        <div key={star} className="flex items-center gap-2.5">
          <span
            className="text-[10px] font-semibold tabular-nums w-2 text-right shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            {star}
          </span>
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--color-border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: pct >= 50 ? "#f59e0b" : pct >= 15 ? "#fbbf24" : "var(--color-border-strong)",
              }}
            />
          </div>
          <span
            className="text-[10px] tabular-nums w-10 text-right shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            {count !== null ? count : `${pct}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Trust Pill ───────────────────────────────────────────────────────────────

function TrustPill({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: "blue" | "violet" | "emerald";
}) {
  const colors = {
    blue: "text-blue-500 bg-blue-500/8",
    violet: "text-violet-500 bg-violet-500/8",
    emerald: "text-emerald-500 bg-emerald-500/8",
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <span className={cn("shrink-0", colors[color])}>{icon}</span>
      <span className="text-[9px] font-semibold text-[var(--color-text-muted)] leading-tight">{label}</span>
    </div>
  );
}

// ─── Mobile Sticky Buy Bar ────────────────────────────────────────────────────
// Shown on mobile only — fixed to bottom of screen.

function MobileStickyBuyBar({
  price,
  compareAtPrice,
  currency,
  savings,
  outOfStock,
  onBuyClick,
}: {
  price: number;
  compareAtPrice: number | null;
  currency: string;
  savings: number | null;
  outOfStock: boolean;
  onBuyClick: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center gap-3 shadow-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-[var(--color-text-primary)]">
            {currency} {price.toLocaleString()}
          </span>
          {compareAtPrice && compareAtPrice > price && (
            <span className="text-[11px] text-[var(--color-text-muted)] line-through">
              {currency} {compareAtPrice.toLocaleString()}
            </span>
          )}
        </div>
        {savings !== null && savings > 0 && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            You save {savings}%
          </p>
        )}
      </div>
      <button
        onClick={onBuyClick}
        disabled={outOfStock}
        className={cn(
          "h-11 px-6 rounded-xl text-sm font-bold transition-colors shrink-0",
          outOfStock
            ? "bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed"
            : "bg-orange-500 hover:bg-orange-600 text-white"
        )}
      >
        {outOfStock ? "Out of stock" : "Buy now"}
      </button>
    </div>
  );
}

// ─── Package Warning ──────────────────────────────────────────────────────────
// Surfaces important package exclusions prominently near buy box.

function PackageWarning({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-lg"
      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
    >
      <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        {notes.map((note) => (
          <p key={note} className="text-[11px] text-[var(--color-text-muted)]">{note}</p>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PhysicalProductDetail({
  product,
  vendor,
  relatedProducts,
  shippingOptions = [],
  followedVendorIds,
}: PhysicalProductDetailProps) {
  const { formatMoney } = useCurrency();

  const title = useMemo(
    () => getCJTitle({ productNameEn: product.name, productName: null }) || product.name,
    [product.name],
  );

  const isCJ = product.source === "cj";

  // ── Variants ──────────────────────────────────────────────────────────────
  const variants: ProductVariant[] = useMemo(
    () =>
      (product.product_variants ?? [])
        .filter((v: any) => v.is_active)
        .map((v: any) => ({
          id: v.id,
          name: v.name ?? "",
          price: Number(v.price),
          compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
          inventory_quantity: v.inventory_quantity ?? 0,
          image_url: v.image_url ?? null,
          options: v.options ?? null,
          is_active: Boolean(v.is_active),
          sku: v.sku ?? null,
        })),
    [product.product_variants],
  );

  const hasVariants = variants.length > 0;

  const defaultVariant = useMemo(
    () => variants.find((v) => v.inventory_quantity > 0) ?? variants[0] ?? null,
    [variants],
  );

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant);

  // Ref to buy box for mobile sticky bar scroll-to
  const buyBoxRef = useRef<HTMLDivElement>(null);

  const handleVariantSelect = useCallback((v: ProductVariant) => {
    setSelectedVariant(v);
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const activePrice = selectedVariant ? selectedVariant.price : Number(product.price);
  const activeCompareAt = selectedVariant?.compare_at_price ?? product.compare_at_price ?? null;
  const activeInventory = selectedVariant?.inventory_quantity ?? product.inventory_quantity ?? 0;
  const isOutOfStock = hasVariants ? activeInventory <= 0 : false;

  const baseImages: string[] = useMemo(() => {
    const imgs = product.images ?? [];
    // Fallback placeholder if images empty
    return imgs.length > 0 ? imgs : [];
  }, [product.images]);

  const activeImages = useMemo(() => {
    if (selectedVariant?.image_url) {
      return [
        selectedVariant.image_url,
        ...baseImages.filter((img) => img !== selectedVariant.image_url),
      ];
    }
    return baseImages;
  }, [selectedVariant, baseImages]);

  const savings =
    activeCompareAt && activeCompareAt > activePrice
      ? Math.round((1 - activePrice / activeCompareAt) * 100)
      : null;

  const reviewCount = product.review_count ?? 0;
  const saleCount = product.sale_count ?? 0;
  const ratingBreakdown: RatingBreakdown | null = product.rating_breakdown ?? null;

  const cleanedHtml = useMemo(
    () => cleanCJDescription(product.description),
    [product.description]
  );

  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(cleanedHtml, {
        ALLOWED_TAGS: ALLOWED_HTML_TAGS,
        ALLOWED_ATTR: ALLOWED_HTML_ATTR,
      }),
    [cleanedHtml],
  );

  const descriptionPreview = useMemo(() => {
    const plain = htmlToPlainText(cleanedHtml);
    return plain.length > 220 ? `${plain.slice(0, 220)}…` : plain;
  }, [cleanedHtml]);

  const { specs: parsedSpecs } = useMemo(
    () => parseCJSpecifications(product.description),
    [product.description],
  );

  // ── Shipping ──────────────────────────────────────────────────────────────
  const cjMeta = product.source_metadata ?? {};

  // Determine free shipping: prefer real column, fall back to metadata
  const isFreeShipping =
    product.is_free_shipping ??
    cjMeta.cj_is_free_shipping ??
    shippingOptions.some((o) => o.is_free_shipping) ??
    false;

  const shippingCountries: string[] = cjMeta.cj_shipping_countries ?? [];

  // Legacy fallback values for products without shipping options yet
  const legacyShipsFrom: string =
    cjMeta.cj_ships_from ?? cjMeta.ships_from ?? "International warehouse";
  const legacyShippingDays: string = cjMeta.cj_shipping_days
    ? `${cjMeta.cj_shipping_days}–${cjMeta.cj_shipping_days + 5} days`
    : isFreeShipping
      ? "5–10 business days"
      : "7–14 business days";
  const legacyHasTracking: boolean = cjMeta.cj_has_tracking ?? true;

  // Sort: recommended first, then by fee
  const sortedShippingOptions = useMemo(
    () =>
      [...shippingOptions].sort((a, b) => {
        if (a.is_recommended && !b.is_recommended) return -1;
        if (!a.is_recommended && b.is_recommended) return 1;
        if (a.is_free_shipping && !b.is_free_shipping) return -1;
        if (!a.is_free_shipping && b.is_free_shipping) return 1;
        return a.shipping_fee - b.shipping_fee;
      }),
    [shippingOptions],
  );

  // Best shipping option for buy box summary
  const bestShipping = sortedShippingOptions[0] ?? null;

  // ── Package warnings ──────────────────────────────────────────────────────
  // Surface important exclusions from description
  const packageWarnings = useMemo(() => {
    const warnings: string[] = [];
    const desc = (product.description ?? "").toLowerCase();
    if (desc.includes("no power bank") || desc.includes("power bank not included")) {
      warnings.push("⚠ Power bank not included — purchase separately");
    }
    if (desc.includes("battery not included")) {
      warnings.push("⚠ Battery not included");
    }
    if (desc.includes("adapter not included")) {
      warnings.push("⚠ Adapter not included");
    }
    return warnings;
  }, [product.description]);

  // ── Specs ─────────────────────────────────────────────────────────────────
  const weightDisplay = formatCJWeight(product.weight);

  const specRows = useMemo(() => {
    const base =
      parsedSpecs.length > 0
        ? parsedSpecs.map((s) => ({ label: s.key, value: s.value }))
        : [];

    const extras = [
      { label: "Weight", value: weightDisplay || "—" },
      { label: "SKU", value: product.sku || "—" },
      // brand/material now from real columns first, then metadata fallback
      { label: "Brand", value: product.brand ?? cjMeta.brand ?? "—" },
      { label: "Material", value: product.material ?? cjMeta.material ?? "—" },
      { label: "Package size", value: cjMeta.package_size ?? "—" },
      { label: "Condition", value: "Brand New" },
      {
        label: "Shipping",
        value: isFreeShipping ? "Free shipping" : "Standard rates apply",
      },
    ];

    const existingKeys = new Set(base.map((r) => r.label.toLowerCase()));
    const merged = [...base];
    for (const row of extras) {
      if (!existingKeys.has(row.label.toLowerCase()) && row.value !== "—") {
        merged.push(row);
      }
    }
    if (!existingKeys.has("weight") && weightDisplay) {
      merged.push({ label: "Weight", value: weightDisplay });
    }
    if (!existingKeys.has("sku") && product.sku) {
      merged.push({ label: "SKU", value: product.sku });
    }
    return merged;
  }, [parsedSpecs, weightDisplay, product.sku, product.brand, product.material, isFreeShipping, cjMeta]);

  // ── Live features ─────────────────────────────────────────────────────────
  const liveViewers = useLiveViewers(
    product.view_count ? Math.min(product.view_count, 12) : 5
  );
  useRecentlyViewed(product.id, product);

  // ── Props ─────────────────────────────────────────────────────────────────
  const vendorProps = vendor
    ? {
      id: vendor.id,
      business_name: vendor.business_name ?? null,
      business_logo: vendor.business_logo ?? null,
      business_slug: vendor.business_slug ?? null,
    }
    : null;

  const productProps = {
    id: product.id,
    name: title,
    slug: product.slug,
    price: activePrice,
    images: activeImages,
    vendor_id: product.vendor_id,
    currency: product.currency,
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 lg:pb-0">
      <LiveActivityToast />

      {/* ── Breadcrumb ── */}
      <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
          <ProductBreadcrumb productName={title} />
          <SaveShareBar />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

        {/* ── Page header ── */}
        <div className="mb-6">
          <div className="mb-3">
            <ProductBadges
              product={product}
              savings={savings}
              isFreeShipping={isFreeShipping}
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] leading-tight tracking-tight mb-3">
            {title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)] mb-4">
            {reviewCount > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i <= Math.round(product.rating ?? 0)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-amber-200 text-amber-200"
                      )}
                    />
                  ))}
                  <span className="font-semibold text-[var(--color-text-primary)] ml-0.5">
                    {(product.rating ?? 0).toFixed(1)}
                  </span>
                  <span>({reviewCount} reviews)</span>
                </div>
                <span className="select-none text-[var(--color-border-strong)]">·</span>
              </>
            )}

            <VariantStockBadge quantity={activeInventory} />

            {saleCount > 0 && (
              <>
                <span className="select-none text-[var(--color-border-strong)]">·</span>
                <span>{saleCount.toLocaleString()}+ sold</span>
              </>
            )}

            <span className="select-none text-[var(--color-border-strong)]">·</span>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold text-[var(--color-text-primary)]">{liveViewers}</span>{" "}
              viewing now
            </span>
          </div>

          <SocialProofBar saleCount={saleCount} reviewCount={reviewCount} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">

          {/* ── LEFT ─────────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-10">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

              {/* Gallery */}
              <div className="space-y-3">
                <ImageGallery
                  images={activeImages}
                  productName={title}
                  isFeatured={product.is_featured}
                  savings={savings}
                />
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {isFreeShipping && (
                    <TrustPill
                      icon={<Truck className="h-3.5 w-3.5" />}
                      label="Free Shipping"
                      color="blue"
                    />
                  )}
                  <TrustPill
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                    label="14-day Returns"
                    color="violet"
                  />
                  <TrustPill
                    icon={<Shield className="h-3.5 w-3.5" />}
                    label="Buyer Protection"
                    color="emerald"
                  />
                </div>
              </div>

              {/* Essential info */}
              <div className="flex flex-col gap-5">
                <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-md w-fit">
                  {product.product_type || "Physical Product"}
                </span>

                {/* Price */}
                <div className="py-4 border-y border-[var(--color-border)]">
                  <ProductPriceDisplay
                    price={activePrice}
                    compareAtPrice={activeCompareAt}
                    currency={product.currency}
                    savings={savings}
                    className="text-3xl"
                  />
                  {savings !== null && savings > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5">
                      You save {savings}% on this item
                    </p>
                  )}
                </div>

                {/* Package warnings — near price so buyers see before purchasing */}
                <PackageWarning notes={packageWarnings} />

                {/* Variant selector */}
                {hasVariants && (
                  <VariantSelector
                    variants={variants}
                    productName={product.name}
                    selectedVariantId={selectedVariant?.id ?? null}
                    onSelect={handleVariantSelect}
                  />
                )}

                {!hasVariants && (
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {descriptionPreview}
                  </p>
                )}

                {/* Best shipping summary inline */}
                {bestShipping && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
                    style={{
                      background: "var(--color-surface-secondary)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <Truck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="text-[var(--color-text-muted)]">
                      {bestShipping.is_free_shipping ? (
                        <><strong className="text-emerald-600 dark:text-emerald-400">Free shipping</strong> · {bestShipping.estimated_delivery}</>
                      ) : (
                        <>{bestShipping.method_name} · {bestShipping.estimated_delivery} · {bestShipping.currency} {bestShipping.shipping_fee.toFixed(2)}</>
                      )}
                    </span>
                  </div>
                )}

                {/* Vendor inline card */}
                {vendor && (
                  <EnhancedVendorCard
                    vendor={vendor}
                    followedVendorIds={followedVendorIds}
                  />
                )}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
            >
              <Tabs defaultValue="overview" className="w-full">
                <div className="px-5 pt-5 sm:px-7 sm:pt-7 overflow-x-auto">
                  <TabsList className="h-10 p-1 gap-1 rounded-xl w-fit bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                    {[
                      { id: "overview", label: "Overview", badge: null },
                      { id: "specs", label: "Specs", badge: specRows.length > 0 ? specRows.length : null },
                      { id: "shipping", label: "Shipping", badge: sortedShippingOptions.length > 0 ? sortedShippingOptions.length : null },
                      { id: "variants", label: "Variants", badge: hasVariants ? variants.length : null },
                      { id: "reviews", label: "Reviews", badge: reviewCount > 0 ? reviewCount : null },
                      { id: "faq", label: "FAQ", badge: null },
                    ]
                      .filter((t) => t.id !== "variants" || hasVariants)
                      .map(({ id, label, badge }) => (
                        <TabsTrigger
                          key={id}
                          value={id}
                          className={cn(
                            "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide gap-1.5",
                            "text-[var(--color-text-muted)]",
                            "data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:shadow-none",
                          )}
                        >
                          {label}
                          {badge !== null && (
                            <span
                              className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold"
                              style={{
                                background: "var(--color-accent-light)",
                                color: "var(--color-accent)",
                                border: "1px solid var(--color-accent-subtle)",
                              }}
                            >
                              {badge}
                            </span>
                          )}
                        </TabsTrigger>
                      ))}
                  </TabsList>
                </div>

                <div className="p-5 sm:p-7">

                  {/* Overview */}
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    {safeHtml ? (
                      <div
                        className="product-description text-[14px] leading-7 text-[var(--color-text-secondary)]"
                        dangerouslySetInnerHTML={{ __html: safeHtml }}
                      />
                    ) : (
                      <p className="text-[14px] leading-7 text-[var(--color-text-secondary)]">
                        {descriptionPreview}
                      </p>
                    )}
                  </TabsContent>

                  {/* Specs */}
                  <TabsContent value="specs" className="mt-0">
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                      {specRows.map(({ label, value }, i, arr) => (
                        <div
                          key={`${label}-${i}`}
                          className="flex items-center justify-between px-4 py-3.5"
                          style={{
                            borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                            background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
                          }}
                        >
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {label}
                          </span>
                          <span
                            className="text-sm font-medium text-right max-w-[60%]"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                    {shippingCountries.length > 0 && (
                      <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
                        Ships to: {shippingCountries.join(", ")}
                      </p>
                    )}
                  </TabsContent>

                  {/* Shipping */}
                  <TabsContent value="shipping" className="mt-0 space-y-5">
                    {sortedShippingOptions.length > 0 ? (
                      <>
                        {/* Country context notice */}
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          Showing shipping options for your region. Rates and delivery times may vary.
                        </p>
                        <ShippingOptionsTable options={sortedShippingOptions} />
                      </>
                    ) : (
                      /* Legacy fallback for products not yet synced to product_shipping_options */
                      <ShippingInfoFallback
                        isFreeShipping={isFreeShipping}
                        shipsFrom={legacyShipsFrom}
                        deliveryDays={legacyShippingDays}
                        hasTracking={legacyHasTracking}
                      />
                    )}

                    {shippingCountries.length > 0 && (
                      <div
                        className="rounded-lg p-4"
                        style={{
                          background: "var(--color-surface-secondary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                          Ships to
                        </p>
                        <p className="text-[12px] text-[var(--color-text-primary)] leading-relaxed">
                          {shippingCountries.join(", ")}
                        </p>
                      </div>
                    )}

                    <BuyerProtectionSection />
                  </TabsContent>

                  {/* Variants */}
                  {hasVariants && (
                    <TabsContent value="variants" className="mt-0">
                      <VariantsTable
                        variants={variants}
                        productName={product.name}
                        currency={product.currency}
                      />
                    </TabsContent>
                  )}

                  {/* Reviews */}
                  <TabsContent value="reviews" className="mt-0 space-y-6">
                    {reviewCount > 0 ? (
                      <div
                        className="flex items-center gap-6 p-5 rounded-xl"
                        style={{
                          background: "var(--color-surface-secondary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div className="text-center shrink-0">
                          <p
                            className="text-5xl font-bold tabular-nums leading-none"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {(product.rating ?? 0).toFixed(1)}
                          </p>
                          <div className="flex gap-0.5 mt-2 justify-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  i <= Math.round(product.rating ?? 0)
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-amber-200 text-amber-200"
                                )}
                              />
                            ))}
                          </div>
                          <p
                            className="text-[10px] mt-1.5"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                          </p>
                          <div className="flex items-center gap-1 justify-center mt-2">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              Verified reviews
                            </span>
                          </div>
                        </div>
                        <div className="h-16 w-px" style={{ background: "var(--color-border)" }} />
                        {/* Real breakdown from DB */}
                        <ReviewBreakdown
                          rating={product.rating ?? 0}
                          reviewCount={reviewCount}
                          breakdown={ratingBreakdown}
                        />
                      </div>
                    ) : (
                      <div
                        className="text-center py-8 rounded-xl"
                        style={{
                          background: "var(--color-surface-secondary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <Star className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          No reviews yet
                        </p>
                        <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
                          Be the first to review this product
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                      <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>Reviews marked with a badge are from verified purchasers</span>
                    </div>

                    <ReviewForm productId={product.id} vendorId={product.vendor_id} />
                  </TabsContent>

                  {/* FAQ */}
                  <TabsContent value="faq" className="mt-0">
                    <FaqSection />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <AffiliateBanner product={product} />
            <CommunityAccessCard vendorSlug={vendor?.business_slug} productName={title} />
            <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
          </div>

          {/* ── RIGHT: Buy Box ────────────────────────────────────────────── */}
          <aside className="lg:col-span-4">
            <div
              ref={buyBoxRef}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden sticky top-[calc(var(--navbar-height,64px)+56px)]"
            >
              {/* Price header */}
              <div className="px-6 pt-6 pb-5 border-b border-[var(--color-border)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <ProductBuyBoxPrice
                      price={activePrice}
                      compareAtPrice={activeCompareAt}
                      currency={product.currency}
                      savings={savings}
                      className="text-3xl"
                    />
                    {hasVariants && selectedVariant && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1 truncate max-w-[180px]">
                        {selectedVariant.name}
                      </p>
                    )}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>

                <div className="mt-3">
                  <LiveUrgencyBar
                    viewers={liveViewers}
                    inventory={activeInventory}
                    saleCount={saleCount}
                    isCJ={isCJ}
                  />
                </div>
              </div>

              {/* Variant selector */}
              {hasVariants && (
                <div className="px-6 pt-4 pb-4 border-b border-[var(--color-border)]">
                  <VariantSelector
                    variants={variants}
                    productName={product.name}
                    selectedVariantId={selectedVariant?.id ?? null}
                    onSelect={handleVariantSelect}
                  />
                </div>
              )}

              {/* Package warnings in buy box too */}
              {packageWarnings.length > 0 && (
                <div className="px-6 pt-4">
                  <PackageWarning notes={packageWarnings} />
                </div>
              )}

              {/* Actions */}
              <div className="p-6 space-y-3">
                <ProductActionModule
                  product={productProps}
                  vendor={vendorProps}
                  selectedVariantId={selectedVariant?.id ?? null}
                  selectedVariantOutOfStock={isOutOfStock}
                  currentPath={`/marketplace/${product.slug}`}
                  className="h-12 rounded-xl text-sm font-bold"
                />

                {!isCJ && activeInventory > 0 && activeInventory <= 5 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>Only {activeInventory} left — order soon</span>
                  </div>
                )}

                {hasVariants && isOutOfStock && (
                  <div className="flex items-center gap-2 text-xs text-red-500">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>This option is out of stock</span>
                  </div>
                )}

                <SecureCheckoutBadge />
              </div>

              {/* What's included */}
              <div className="px-6 pb-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  What's included
                </p>
                <div className="space-y-2.5">
                  {[
                    bestShipping
                      ? {
                        icon: Truck,
                        text: bestShipping.is_free_shipping ? "Free shipping" : bestShipping.method_name,
                        sub: bestShipping.estimated_delivery ?? legacyShippingDays,
                      }
                      : {
                        icon: Truck,
                        text: isFreeShipping ? "Free shipping" : "Standard shipping",
                        sub: `Delivered in ${legacyShippingDays}`,
                      },
                    { icon: ShieldCheck, text: "7-day money-back guarantee", sub: "No questions asked" },
                    { icon: Clock, text: "Priority global logistics", sub: "Tracked & insured" },
                    { icon: Lock, text: "Secure payment", sub: "256-bit SSL encrypted" },
                  ].map(({ icon: Icon, text, sub }) => (
                    <div key={text} className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-3.5 w-3.5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-none">
                          {text}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buyer protection */}
              <div className="px-6 pb-5">
                <BuyerProtectionSection />
              </div>

              {/* Vendor footer */}
              {vendor && (
                <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex items-center justify-center shrink-0">
                      {vendor.business_logo ? (
                        <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate leading-none">
                        {vendor.business_name}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" />
                        Verified Supplier
                      </p>
                    </div>
                    <Link
                      href={`/vendors/${vendor.business_slug}`}
                      className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-0.5 shrink-0"
                    >
                      Store <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <FollowButton
                    vendorId={vendor.id}
                    initialFollowing={followedVendorIds.includes(String(vendor.id))}
                    className="w-full h-9 rounded-xl border border-[var(--color-border)] text-[12px] font-semibold"
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
      <MobileStickyBuyBar
        price={activePrice}
        compareAtPrice={activeCompareAt}
        currency={product.currency}
        savings={savings}
        outOfStock={isOutOfStock}
        onBuyClick={() => {
          buyBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />
    </div>
  );
}