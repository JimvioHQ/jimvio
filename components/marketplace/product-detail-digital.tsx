

// "use client";

// import React, { useState } from "react";
// import Image from "next/image";
// import {
//   ShieldCheck, Globe, Star, CheckCircle2, Lock,
//   Download, PlayCircle, MessageSquare, Share2, Zap, Users,
//   X, ChevronDown, BadgeCheck, Clock, TrendingUp, ThumbsUp, Eye,
// } from "lucide-react";
// import { toast } from "sonner";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { cn } from "@/lib/utils";
// import { ProductActionModule } from "@/components/marketplace/product-action-module";
// import { FollowButton } from "@/components/marketplace/follow-button";
// import { ReviewForm } from "@/components/marketplace/review-form";
// import { ImageGallery } from "@/components/marketplace/image-gallery";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface DigitalProductDetailProps {
//   product: {
//     id: string;
//     name: string;
//     slug: string;
//     price: number;
//     compare_at_price?: number;
//     description?: string;
//     images?: string[];
//     review_count?: number;
//     sale_count?: number;
//     vendor_id: string;
//     currency: string;
//     pricing_type: string;
//     button_text?: string;
//     is_featured?: boolean;
//     features?: string[];
//     /** Direct URL for iframe/image live preview */
//     preview_url?: string;
//   };
//   vendor: {
//     id: string;
//     business_name?: string | null;
//     business_logo?: string | null;
//     business_slug?: string | null;
//     follower_count?: number;
//     product_count?: number;
//   } | null;
//   followedVendorIds: string[];
// }

// // ─── Static content ───────────────────────────────────────────────────────────

// const DEFAULT_FEATURES = [
//   "Instant download after payment",
//   "Commercial use license included",
//   "Lifetime access to all updates",
//   "Compatible with all major tools",
//   "Creator support via direct message",
// ];

// const DEFAULT_FAQ = [
//   {
//     q: "What format are the files delivered in?",
//     a: "You'll receive a ZIP archive containing all source files in the formats stated in the description. Access is instant — no waiting for approval.",
//   },
//   {
//     q: "Can I use this for commercial projects?",
//     a: "Yes. A commercial use license is included with every purchase. You may use the asset in client work, products you sell, and marketing materials.",
//   },
//   {
//     q: "What if I need help or find a bug?",
//     a: "Message the creator directly through the platform. Most creators respond within 24 hours. You can also leave a review so others can see the support quality.",
//   },
//   {
//     q: "Is there a refund policy?",
//     a: "Digital purchases are covered by Jimvio's 7-day buyer protection. If the files are materially different from what was described, contact support for a full review.",
//   },
// ];

// // ─── Sub-components ───────────────────────────────────────────────────────────

// /** Spec §2 — Social proof bar */
// function SocialProofBar({ saleCount, reviewCount }: { saleCount: number; reviewCount: number }) {
//   const items = [
//     { icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />, text: `${saleCount.toLocaleString()}+ users` },
//     { icon: <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />, text: `4.9 from ${reviewCount} reviews` },
//     { icon: <Clock className="h-3.5 w-3.5 text-sky-500" />, text: "Updated recently" },
//     { icon: <ThumbsUp className="h-3.5 w-3.5 text-violet-500" />, text: "97% recommend" },
//   ];
//   return (
//     <div className="flex flex-wrap items-center gap-3 py-3 px-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
//       {items.map((item, i) => (
//         <div key={i} className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
//           {item.icon}
//           <span>{item.text}</span>
//         </div>
//       ))}
//     </div>
//   );
// }

// /** Spec §6 — Live preview modal */
// function PreviewModal({
//   open, onClose, previewUrl, productName, images,
// }: {
//   open: boolean; onClose: () => void;
//   previewUrl?: string; productName: string; images: string[];
// }) {
//   if (!open) return null;
//   return (
//     <div
//       className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
//       style={{ background: "rgba(0,0,0,0.75)" }}
//       onClick={onClose}
//     >
//       <div
//         className="relative w-full max-w-3xl bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)]"
//         onClick={e => e.stopPropagation()}
//       >
//         {/* Header */}
//         <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
//           <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate max-w-[80%]">
//             Preview — {productName}
//           </p>
//           <button
//             onClick={onClose}
//             aria-label="Close preview"
//             className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
//           >
//             <X className="h-3.5 w-3.5" />
//           </button>
//         </div>
//         {/* Content */}
//         <div className="bg-[var(--color-surface-secondary)]" style={{ minHeight: 360 }}>
//           {previewUrl ? (
//             <iframe
//               src={previewUrl}
//               title={`Preview of ${productName}`}
//               className="w-full"
//               style={{ height: 480, border: "none" }}
//               sandbox="allow-scripts allow-same-origin"
//             />
//           ) : images[0] ? (
//             <Image
//               src={images[0]}
//               alt={`Preview of ${productName}`}
//               width={800}
//               height={480}
//               className="w-full object-contain"
//               style={{ maxHeight: 480 }}
//             />
//           ) : (
//             <div className="flex flex-col items-center justify-center h-[360px] gap-3">
//               <Eye className="h-8 w-8 text-[var(--color-text-muted)]" />
//               <p className="text-[13px] text-[var(--color-text-muted)]">No preview available</p>
//             </div>
//           )}
//         </div>
//         {/* Footer */}
//         <div className="px-5 py-3.5 border-t border-[var(--color-border)] flex items-center justify-between">
//           <p className="text-[11px] text-[var(--color-text-muted)]">Preview only — purchase to access all files</p>
//           <button onClick={onClose} className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline">
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// /** Spec §7 — Community & access */
// function CommunityAccessCard({ vendorSlug, productName }: { vendorSlug?: string | null; productName: string }) {
//   return (
//     <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
//       <div className="flex items-center gap-2 mb-1">
//         <Users className="h-4 w-4 text-violet-500" />
//         <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
//           Community access
//         </p>
//       </div>
//       <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
//         Buyers get access to the creator's community — ask questions, share work, and get feedback from other users of {productName}.
//       </p>
//       <ul className="space-y-2">
//         {[
//           "Private buyer Discord or Slack channel",
//           "Monthly live Q&A with the creator",
//           "Exclusive template updates and previews",
//         ].map(item => (
//           <li key={item} className="flex items-start gap-2.5 text-[12px] text-[var(--color-text-secondary)]">
//             <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
//             {item}
//           </li>
//         ))}
//       </ul>
//       {vendorSlug && (
//         <a
//           href={`/vendors/${vendorSlug}`}
//           className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)] hover:underline mt-1"
//         >
//           Visit creator profile
//           <ChevronDown className="h-3 w-3 -rotate-90" />
//         </a>
//       )}
//     </div>
//   );
// }

// function FaqItem({ q, a }: { q: string; a: string }) {
//   const [open, setOpen] = useState(false);
//   return (
//     <div className="border-t border-[var(--color-border)] py-3.5">
//       <button
//         onClick={() => setOpen(v => !v)}
//         aria-expanded={open}
//         className="w-full flex items-center justify-between gap-3 text-left"
//       >
//         <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{q}</span>
//         <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)] transition-transform duration-200", open && "rotate-180")} />
//       </button>
//       {open && (
//         <p className="mt-2.5 text-[13px] text-[var(--color-text-muted)] leading-relaxed">{a}</p>
//       )}
//     </div>
//   );
// }

// /** Spec §13 — Conversion urgency strip */
// function UrgencyStrip({ saleCount }: { saleCount: number }) {
//   return (
//     <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
//       <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
//       <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-400">
//         {saleCount > 50
//           ? `${saleCount.toLocaleString()}+ people already own this`
//           : "Limited time — price may increase soon"}
//       </p>
//     </div>
//   );
// }

// function BenefitCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
//   return (
//     <div className="flex gap-3 p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
//       <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
//         {icon}
//       </div>
//       <div>
//         <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-0.5">{title}</p>
//         <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
//       </div>
//     </div>
//   );
// }

// // ─── Main component ───────────────────────────────────────────────────────────

// export function DigitalProductDetail({ product, vendor, followedVendorIds }: DigitalProductDetailProps) {
//   const [copied, setCopied] = useState(false);
//   const [previewOpen, setPreviewOpen] = useState(false);

//   const images: string[] = product.images ?? [];
//   const savings = product.compare_at_price && product.compare_at_price > product.price
//     ? Math.round((1 - product.price / product.compare_at_price) * 100)
//     : null;
//   const saleCount = product.sale_count ?? 120;
//   const reviewCount = product.review_count ?? 0;
//   const features = product.features?.length ? product.features : DEFAULT_FEATURES;

//   const productProps = {
//     id: product.id,
//     name: product.name,
//     slug: product.slug,
//     price: Number(product.price),
//     images: product.images ?? null,
//     vendor_id: product.vendor_id,
//     currency: product.currency,
//     pricing_type: product.pricing_type,
//     button_text: product.button_text,
//     is_digital: true,
//   };

//   const vendorProps = vendor ? {
//     id: vendor.id,
//     business_name: vendor.business_name ?? null,
//     business_logo: vendor.business_logo ?? null,
//     business_slug: vendor.business_slug ?? null,
//   } : null;

//   function handleShare() {
//     navigator.clipboard.writeText(window.location.href)
//       .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
//       .catch(() => toast.error("Could not copy link"));
//   }

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)]">

//       {/* Spec §6: Live preview modal */}
//       <PreviewModal
//         open={previewOpen}
//         onClose={() => setPreviewOpen(false)}
//         previewUrl={product.preview_url}
//         productName={product.name}
//         images={images}
//       />

//       <div className="max-w-6xl mx-auto px-4 pt-8 pb-24">

//         {/* Header */}
//         <div className="mb-6">
//           <div className="flex items-center gap-2 mb-3">
//             <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20">
//               <Download className="h-3 w-3" />
//               Digital asset
//             </span>
//             {savings && (
//               <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
//                 {savings}% off
//               </span>
//             )}
//           </div>

//           <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] tracking-tight leading-snug mb-3">
//             {product.name}
//           </h1>

//           {/* Spec §2: Social proof inline row */}
//           <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)] mb-4">
//             <div className="flex items-center gap-1.5">
//               <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
//               <span className="font-semibold text-[var(--color-text-primary)]">4.9</span>
//               <span>({reviewCount} reviews)</span>
//             </div>
//             <span className="select-none text-[var(--color-border-strong)]">·</span>
//             <div className="flex items-center gap-1.5">
//               <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
//               Instant access
//             </div>
//             <span className="select-none text-[var(--color-border-strong)]">·</span>
//             <div className="flex items-center gap-1.5">
//               <Users className="h-3.5 w-3.5 flex-shrink-0" />
//               {saleCount.toLocaleString()}+ users
//             </div>
//           </div>

//           {/* Spec §2: Detailed social proof bar */}
//           <SocialProofBar saleCount={saleCount} reviewCount={reviewCount} />
//         </div>

//         {/* Body grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

//           {/* Left */}
//           <div className="lg:col-span-8 space-y-8">

//             <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
//               <ImageGallery
//                 images={images}
//                 productName={product.name}
//                 isFeatured={product.is_featured}
//                 savings={savings}
//                 className="aspect-video"
//               />
//             </div>

//             {/* Mobile CTAs */}
//             <div className="flex flex-col sm:flex-row gap-3 lg:hidden">
//               <ProductActionModule
//                 product={productProps}
//                 vendor={vendorProps}
//                 currentPath={`/marketplace/${product.slug}`}
//                 className="flex-1"
//               />
//               <Button
//                 variant="outline"
//                 onClick={() => setPreviewOpen(true)}
//                 className="flex-1 h-11 rounded-xl border-[var(--color-border)] font-semibold text-[13px] text-[var(--color-text-secondary)]"
//               >
//                 <PlayCircle className="h-4 w-4 mr-2" />
//                 Live preview
//               </Button>
//             </div>

//             {/* Tabs — added faq tab (spec §8) */}
//             <Tabs defaultValue="overview" className="w-full">
//               <TabsList className="h-10 p-1 gap-1 rounded-xl w-fit bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
//                 {(["overview", "features", "reviews", "faq"] as const).map((tab) => (
//                   <TabsTrigger
//                     key={tab}
//                     value={tab}
//                     className={cn(
//                       "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide",
//                       "text-[var(--color-text-muted)]",
//                       "data-[state=active]:bg-[var(--color-surface)]",
//                       "data-[state=active]:text-[var(--color-text-primary)]",
//                       "data-[state=active]:shadow-none"
//                     )}
//                   >
//                     {tab === "faq" ? "FAQ" : tab}
//                   </TabsTrigger>
//                 ))}
//               </TabsList>

//               <TabsContent value="overview" className="mt-6 space-y-6">
//                 <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
//                   {product.description || "A professionally crafted digital asset built for modern workflows. Optimized for speed, flexibility, and long-term maintainability."}
//                 </p>
//                 <div className="grid sm:grid-cols-2 gap-3">
//                   <BenefitCard icon={<Download className="h-4 w-4" />} title="Direct download" desc="Source files delivered the moment payment clears — no waiting." />
//                   <BenefitCard icon={<ShieldCheck className="h-4 w-4" />} title="Lifetime updates" desc="Every future version is included. Pay once, keep everything." />
//                   <BenefitCard icon={<Lock className="h-4 w-4" />} title="License included" desc="Commercial use license ships with every purchase." />
//                   <BenefitCard icon={<MessageSquare className="h-4 w-4" />} title="Creator support" desc="Direct access to the creator for integration questions." />
//                 </div>
//               </TabsContent>

//               <TabsContent value="features" className="mt-6">
//                 <ul className="space-y-3">
//                   {features.map((feat) => (
//                     <li key={feat} className="flex items-start gap-3 text-[14px] text-[var(--color-text-secondary)]">
//                       <CheckCircle2 className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
//                       {feat}
//                     </li>
//                   ))}
//                 </ul>
//               </TabsContent>

//               <TabsContent value="reviews" className="mt-6">
//                 <ReviewForm productId={product.id} vendorId={product.vendor_id} />
//               </TabsContent>

//               {/* Spec §8: FAQ */}
//               <TabsContent value="faq" className="mt-6">
//                 <div>
//                   {DEFAULT_FAQ.map(item => (
//                     <FaqItem key={item.q} q={item.q} a={item.a} />
//                   ))}
//                   <p className="mt-5 text-[12px] text-[var(--color-text-muted)]">
//                     Still have questions?{" "}
//                     <a href="/support" className="text-[var(--color-accent)] font-semibold hover:underline">
//                       Contact support →
//                     </a>
//                   </p>
//                 </div>
//               </TabsContent>
//             </Tabs>

//             {/* Spec §7: Community & access */}
//             <CommunityAccessCard
//               vendorSlug={vendor?.business_slug}
//               productName={product.name}
//             />
//           </div>

//           {/* Right sidebar */}
//           <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">

//             {/* Purchase card */}
//             <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
//               {/* Spec §5: Pricing experience */}
//               <div>
//                 <div className="flex items-baseline gap-2">
//                   <span className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
//                     ${Number(product.price).toFixed(2)}
//                   </span>
//                   {product.compare_at_price && product.compare_at_price > product.price && (
//                     <>
//                       <span className="text-[14px] line-through text-[var(--color-text-muted)]">
//                         ${Number(product.compare_at_price).toFixed(2)}
//                       </span>
//                       <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
//                         Save {savings}%
//                       </span>
//                     </>
//                   )}
//                 </div>
//                 {product.pricing_type === "recurring" && (
//                   <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Billed monthly · Cancel anytime</p>
//                 )}
//               </div>

//               {/* Spec §13: Urgency */}
//               <UrgencyStrip saleCount={saleCount} />

//               <ProductActionModule
//                 product={productProps}
//                 vendor={vendorProps}
//                 currentPath={`/marketplace/${product.slug}`}
//                 className="w-full"
//               />

//               {/* Spec §6: Preview + share */}
//               <div className="grid grid-cols-2 gap-2">
//                 <Button
//                   variant="outline"
//                   onClick={() => setPreviewOpen(true)}
//                   className="h-10 rounded-xl border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)]"
//                 >
//                   <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
//                   Preview
//                 </Button>
//                 <Button
//                   variant="outline"
//                   onClick={handleShare}
//                   className="h-10 rounded-xl border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)]"
//                 >
//                   <Share2 className="h-3.5 w-3.5 mr-1.5" />
//                   {copied ? "Copied!" : "Share"}
//                 </Button>
//               </div>
//             </div>

//             {/* Security + vendor */}
//             <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
//               <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
//                 Secured by Jimvio
//               </p>
//               <div className="divide-y divide-[var(--color-border)]">
//                 {[
//                   { title: "Encrypted delivery", desc: "End-to-end encrypted asset distribution" },
//                   { title: "Verified source", desc: "Rigorous quality check on all files" },
//                   { title: "Purchase protection", desc: "Funds held until you confirm access" },
//                 ].map(item => (
//                   <div key={item.title} className="flex items-start gap-3 py-3">
//                     <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-sky-500 flex-shrink-0" />
//                     <div>
//                       <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{item.title}</p>
//                       <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{item.desc}</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               {vendor && (
//                 <div className="pt-4 mt-1 border-t border-[var(--color-border)]">
//                   <div className="flex items-center gap-3 mb-3">
//                     <div className="h-10 w-10 rounded-xl flex-shrink-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-center">
//                       {vendor.business_logo ? (
//                         <Image src={vendor.business_logo} alt={vendor.business_name ?? "Vendor"} width={40} height={40} className="w-full h-full object-cover" />
//                       ) : (
//                         <Globe className="h-4 w-4 text-[var(--color-text-muted)]" />
//                       )}
//                     </div>
//                     <div className="min-w-0">
//                       <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{vendor.business_name}</p>
//                       <div className="flex items-center gap-1.5 mt-0.5">
//                         <BadgeCheck className="h-3 w-3 text-sky-500 flex-shrink-0" />
//                         <p className="text-[11px] text-[var(--color-text-muted)]">
//                           {/* Spec §4: creator stats */}
//                           Verified creator{vendor.follower_count ? ` · ${vendor.follower_count.toLocaleString()} followers` : ""}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                   <FollowButton
//                     vendorId={vendor.id}
//                     initialFollowing={followedVendorIds.includes(String(vendor.id))}
//                     className="w-full h-9 rounded-xl border border-[var(--color-border)] text-[12px] font-semibold"
//                   />
//                 </div>
//               )}
//             </div>

//             {/* Enterprise CTA */}
//             <div className="bg-[var(--color-accent)] rounded-2xl p-5 text-white relative overflow-hidden">
//               <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" aria-hidden="true" />
//               <div className="relative z-10 space-y-3">
//                 <div className="flex items-center gap-2">
//                   <Zap className="h-4 w-4" />
//                   <span className="text-[11px] font-semibold uppercase tracking-widest opacity-90">Enterprise</span>
//                 </div>
//                 <p className="text-[14px] font-semibold leading-snug">Need a custom plan?</p>
//                 <p className="text-[12px] opacity-80 leading-relaxed">
//                   Enterprise licenses and dedicated support available.
//                 </p>
//                 <Button className="w-full h-9 bg-white/20 hover:bg-white/30 border-0 text-white rounded-xl text-[12px] font-semibold transition-colors">
//                   <MessageSquare className="h-3.5 w-3.5 mr-2" />
//                   Message creator
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShieldCheck, Globe, Star, CheckCircle2, Lock,
  Download, PlayCircle, MessageSquare, Zap,
  X, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { useCurrency } from "@/context/CurrencyContext";
import {
  ProductBreadcrumb,
  SaveShareBar,
  SocialProofBar,
  AffiliateBanner,
  FaqSection,
  CommunityAccessCard,
  UrgencyStrip,
  VendorCard,
  RelatedProducts,
} from "@/components/marketplace/product-detail-shared";

interface DigitalProductDetailProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price?: number;
    description?: string;
    images?: string[];
    review_count?: number;
    sale_count?: number;
    vendor_id: string;
    currency: string;
    pricing_type: string;
    button_text?: string;
    is_featured?: boolean;
    features?: string[];
    preview_url?: string;
    affiliate_enabled?: boolean;
    affiliate_commission_rate?: number;
  };
  vendor: {
    id: string;
    business_name?: string | null;
    business_logo?: string | null;
    business_slug?: string | null;
    follower_count?: number;
    product_count?: number;
  } | null;
  followedVendorIds: string[];
  relatedProducts?: any[];
}

// ─── Static content ───────────────────────────────────────────────────────────

const DEFAULT_FEATURES = [
  "Instant download after payment",
  "Commercial use license included",
  "Lifetime access to all updates",
  "Compatible with all major tools",
  "Creator support via direct message",
];

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({
  open, onClose, previewUrl, productName, images,
}: {
  open: boolean;
  onClose: () => void;
  previewUrl?: string;
  productName: string;
  images: string[];
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate max-w-[80%]">
            Preview — {productName}
          </p>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="bg-[var(--color-surface-secondary)]" style={{ minHeight: 360 }}>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title={`Preview of ${productName}`}
              className="w-full"
              style={{ height: 480, border: "none" }}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : images[0] ? (
            <Image
              src={images[0]}
              alt={`Preview of ${productName}`}
              width={800}
              height={480}
              className="w-full object-contain"
              style={{ maxHeight: 480 }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[360px] gap-3">
              <Eye className="h-8 w-8 text-[var(--color-text-muted)]" />
              <p className="text-[13px] text-[var(--color-text-muted)]">No preview available</p>
            </div>
          )}
        </div>
        <div className="px-5 py-3.5 border-t border-[var(--color-border)] flex items-center justify-between">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Preview only — purchase to access all files
          </p>
          <button onClick={onClose} className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function BenefitCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
      <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-0.5">{title}</p>
        <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DigitalProductDetail({
  product,
  vendor,
  followedVendorIds,
  relatedProducts = [],
}: DigitalProductDetailProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { formatMoney } = useCurrency();

  const images: string[] = product.images ?? [];
  const saleCount = product.sale_count ?? 120;
  const reviewCount = product.review_count ?? 0;
  const features = product.features?.length ? product.features : DEFAULT_FEATURES;
  const savings =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : null;

  const productProps = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    images: product.images ?? null,
    vendor_id: product.vendor_id,
    currency: product.currency,
    pricing_type: product.pricing_type,
    button_text: product.button_text,
    is_digital: true,
  };

  const vendorProps = vendor
    ? {
      id: vendor.id,
      business_name: vendor.business_name ?? null,
      business_logo: vendor.business_logo ?? null,
      business_slug: vendor.business_slug ?? null,
    }
    : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        previewUrl={product.preview_url}
        productName={product.name}
        images={images}
      />

      {/* ── Breadcrumb ── */}
      <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between">
          <ProductBreadcrumb productName={product.name} />
          <SaveShareBar />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-24">

        {/* ── Page header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20">
              <Download className="h-3 w-3" />
              Digital asset
            </span>
            {savings && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                {savings}% off
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

          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] tracking-tight leading-snug mb-3">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)] mb-4">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
              <span className="font-semibold text-[var(--color-text-primary)]">4.9</span>
              <span>({reviewCount} reviews)</span>
            </div>
            <span className="select-none text-[var(--color-border-strong)]">·</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
              Instant access
            </div>
            <span className="select-none text-[var(--color-border-strong)]">·</span>
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 flex-shrink-0" />
              {saleCount.toLocaleString()}+ users
            </div>
          </div>

          <SocialProofBar saleCount={saleCount} reviewCount={reviewCount} />
        </div>

        {/* ── Body grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* Left column */}
          <div className="lg:col-span-8 space-y-8">

            {/* Gallery */}
            <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              <ImageGallery
                images={images}
                productName={product.name}
                isFeatured={product.is_featured}
                savings={savings}
                className="aspect-video"
              />
            </div>

            {/* Mobile CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 lg:hidden">
              <ProductActionModule
                product={productProps}
                vendor={vendorProps}
                currentPath={`/marketplace/${product.slug}`}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                className="flex-1 h-11 rounded-xl border-[var(--color-border)] font-semibold text-[13px] text-[var(--color-text-secondary)]"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Live preview
              </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="h-10 p-1 gap-1 rounded-xl w-fit bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                {(["overview", "features", "reviews", "faq"] as const).map(tab => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className={cn(
                      "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide",
                      "text-[var(--color-text-muted)]",
                      "data-[state=active]:bg-[var(--color-surface)]",
                      "data-[state=active]:text-[var(--color-text-primary)]",
                      "data-[state=active]:shadow-none"
                    )}
                  >
                    {tab === "faq" ? "FAQ" : tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                  {product.description ||
                    "A professionally crafted digital asset built for modern workflows. Optimized for speed, flexibility, and long-term maintainability."}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <BenefitCard icon={<Download className="h-4 w-4" />} title="Direct download" desc="Source files delivered the moment payment clears — no waiting." />
                  <BenefitCard icon={<ShieldCheck className="h-4 w-4" />} title="Lifetime updates" desc="Every future version is included. Pay once, keep everything." />
                  <BenefitCard icon={<Lock className="h-4 w-4" />} title="License included" desc="Commercial use license ships with every purchase." />
                  <BenefitCard icon={<MessageSquare className="h-4 w-4" />} title="Creator support" desc="Direct access to the creator for integration questions." />
                </div>
              </TabsContent>

              <TabsContent value="features" className="mt-6">
                <ul className="space-y-3">
                  {features.map(feat => (
                    <li key={feat} className="flex items-start gap-3 text-[14px] text-[var(--color-text-secondary)]">
                      <CheckCircle2 className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <ReviewForm productId={product.id} vendorId={product.vendor_id} />
              </TabsContent>

              <TabsContent value="faq" className="mt-6">
                <FaqSection />
              </TabsContent>
            </Tabs>

            {/* Affiliate banner */}
            <AffiliateBanner product={product} />

            {/* Community card */}
            <CommunityAccessCard
              vendorSlug={vendor?.business_slug}
              productName={product.name}
            />
            <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
          </div>
          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">

            {/* Purchase card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
                    ${Number(product.price).toFixed(2)}
                  </span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <>
                      <span className="text-[14px] line-through text-[var(--color-text-muted)]">
                        ${Number(product.compare_at_price).toFixed(2)}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        Save {savings}%
                      </span>
                    </>
                  )}
                </div>
                {product.pricing_type === "recurring" && (
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    Billed monthly · Cancel anytime
                  </p>
                )}
              </div>

              <UrgencyStrip saleCount={saleCount} />

              <ProductActionModule
                product={productProps}
                vendor={vendorProps}
                currentPath={`/marketplace/${product.slug}`}
                className="w-full"
              />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewOpen(true)}
                  className="h-10 rounded-xl border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)]"
                >
                  <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="h-10 rounded-xl border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)]"
                >
                  Share
                </Button>
              </div>
            </div>

            {/* Security + vendor */}
            {vendor && (
              <VendorCard
                vendor={vendor}
                followedVendorIds={followedVendorIds}
                followButton={
                  <FollowButton
                    vendorId={vendor.id}
                    initialFollowing={followedVendorIds.includes(String(vendor.id))}
                    className="w-full h-9 rounded-xl border border-[var(--color-border)] text-[12px] font-semibold"
                  />
                }
              />
            )}

            {/* Enterprise CTA */}
            <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "var(--color-accent)" }}>
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest opacity-90">Enterprise</span>
                </div>
                <p className="text-[14px] font-semibold leading-snug">Need a custom plan?</p>
                <p className="text-[12px] opacity-80 leading-relaxed">
                  Enterprise licenses and dedicated support available.
                </p>
                <Button className="w-full h-9 bg-white/20 hover:bg-white/30 border-0 text-white rounded-xl text-[12px] font-semibold transition-colors">
                  <MessageSquare className="h-3.5 w-3.5 mr-2" />
                  Message creator
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <pre>
        <code>
          {
            JSON.stringify(product, null, 2)
          }
        </code>
      </pre>
    </div>
  );
}