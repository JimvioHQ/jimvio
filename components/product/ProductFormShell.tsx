// "use client";
// export const dynamic = "force-dynamic";

// import React, { useState, useEffect, useTransition } from "react";
// import { useRouter, useParams } from "next/navigation";
// import {
//     ArrowLeft, DollarSign, Loader2, CheckCircle2,
//     ShoppingBag, Globe, Upload, AlertTriangle,
//     X, Image as ImageIcon, Zap, ChevronRight,
//     Sparkles, BookOpen, Target, FileText,
//     Monitor, LayoutTemplate, Users, Package,
//     Lock, Search, Clock, Check, Circle, Link as LinkIcon,
//     ChevronDown, Info, Video, MessageSquare, Layers,
//     Star, Award, BarChart2, Lightbulb, Hash,
// } from "lucide-react";
// import { createClient } from "@/lib/supabase/client";
// import NextLink from "next/link";
// import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
// import { CloudinaryImage } from "@/components/ui/cloudinary-image";
// import { cn } from "@/lib/utils";
// import { StyledTextarea } from "../ui/textarea";
// import { Button } from "../ui/button";

// /* ── helpers ── */
// function slugify(text: string) {
//     return text.toLowerCase()
//         .replace(/[^\w\s-]/g, "")
//         .replace(/[\s_-]+/g, "-")
//         .replace(/^-+|-+$/g, "");
// }

// /* ── constants ── */
// const STEPS = [
//     { id: 1, label: "Details" },
//     { id: 2, label: "Pricing" },
//     { id: 3, label: "Settings" },
//     { id: 4, label: "Publish" },
// ];

// const BILLING_PERIODS = [
//     { id: "weekly", label: "Weekly" },
//     { id: "monthly", label: "Monthly" },
//     { id: "quarterly", label: "Quarterly" },
//     { id: "yearly", label: "Yearly" },
// ];

// const BUTTON_TEXTS = ["Buy Now", "Get Access", "Order Now", "Purchase", "Download", "Subscribe", "Join now"];

// /* ── Product subtypes with rich metadata ── */
// const PRODUCT_SUBTYPES = [
//     {
//         id: "course",
//         label: "Course",
//         Icon: BookOpen,
//         hint: "Video lessons & modules",
//         tips: [
//             "Add a curriculum outline in your description",
//             "Mention total hours of content",
//             "List certificates or credentials included",
//         ],
//         recommendedFields: ["Show author bio", "Show reviews", "Discussions"],
//         suggestedButtonText: "Enroll Now",
//         previewBadge: "Online Course",
//         extraFields: ["curriculum", "total_hours", "skill_level", "certificate"],
//     },
//     {
//         id: "coaching",
//         label: "Coaching",
//         Icon: Target,
//         hint: "1-on-1 or group sessions",
//         tips: [
//             "Specify number of sessions included",
//             "Mention session duration (e.g. 60 min)",
//             "Highlight your credentials or track record",
//         ],
//         recommendedFields: ["Show author bio"],
//         suggestedButtonText: "Book a Session",
//         previewBadge: "Coaching Program",
//         extraFields: ["sessions_count", "session_duration", "format"],
//     },
//     {
//         id: "ebook",
//         label: "E-book",
//         Icon: FileText,
//         hint: "PDF or digital book",
//         tips: [
//             "State page count and format (PDF, ePub)",
//             "Add a table of contents excerpt",
//             "Mention if physical copy is available",
//         ],
//         recommendedFields: ["Show reviews"],
//         suggestedButtonText: "Download Now",
//         previewBadge: "E-book",
//         extraFields: ["page_count", "file_format", "language"],
//     },
//     {
//         id: "software",
//         label: "Software",
//         Icon: Monitor,
//         hint: "App, tool or SaaS",
//         tips: [
//             "List compatible platforms (Mac, Windows, Web)",
//             "Mention license type (lifetime vs. subscription)",
//             "Include a short demo or screenshots",
//         ],
//         recommendedFields: ["Discussions"],
//         suggestedButtonText: "Get Access",
//         previewBadge: "Software",
//         extraFields: ["platform", "version", "license_type"],
//     },
//     {
//         id: "templates",
//         label: "Templates",
//         Icon: LayoutTemplate,
//         hint: "Ready-to-use files",
//         tips: [
//             "List all file formats included (Figma, Notion, Excel…)",
//             "Show a preview screenshot in your media",
//             "Specify what tools are required to use them",
//         ],
//         recommendedFields: ["Show reviews"],
//         suggestedButtonText: "Get Templates",
//         previewBadge: "Template Pack",
//         extraFields: ["file_formats", "tools_required", "template_count"],
//     },
//     {
//         id: "community",
//         label: "Community",
//         Icon: Users,
//         hint: "Membership & access",
//         tips: [
//             "Describe what members get access to",
//             "Mention the platform (Discord, Slack, Circle…)",
//             "Highlight community size and activity",
//         ],
//         recommendedFields: ["Show author bio", "Discussions"],
//         suggestedButtonText: "Join Community",
//         previewBadge: "Community",
//         extraFields: ["platform", "member_count", "access_level"],
//     },
//     {
//         id: "bundle",
//         label: "Bundle",
//         Icon: Package,
//         hint: "Multiple products together",
//         tips: [
//             "List every item included in the bundle",
//             "Show the individual vs. bundle value",
//             "Add a comparison table in your description",
//         ],
//         recommendedFields: ["Show reviews", "Show author bio"],
//         suggestedButtonText: "Get the Bundle",
//         previewBadge: "Bundle",
//         extraFields: ["items_included", "total_value"],
//     },
// ];

// /* ── form state ── */
// interface FormState {
//     name: string;
//     slug: string;
//     short_description: string;
//     description: string;
//     product_type: "physical" | "digital";
//     product_subtype: string;
//     price: string;
//     currency: string;
//     category_id: string;
//     is_digital: boolean;
//     pricing_type: "one_time" | "recurring";
//     billing_period: string;
//     digital_file_url: string;
//     track_inventory: boolean;
//     inventory_quantity: string;
//     affiliate_enabled: boolean;
//     affiliate_commission_rate: string;
//     is_featured: boolean;
//     button_text: string;
//     tags: string;
//     weight: string;
//     dimensions: string;
//     images: string[];
//     show_author: boolean;
//     show_reviews: boolean;
//     enable_discussions: boolean;
//     status: "active" | "draft" | "archived";
// }

// /* ── reusable primitives ── */
// function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
//     return (
//         <div className="flex items-center justify-between mb-1.5">
//             <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{children}</span>
//             {hint && <span className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>{hint}</span>}
//         </div>
//     );
// }

// function Input({ className, style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
//     return (
//         <input
//             className={cn(
//                 "w-full h-10 px-3 text-sm transition-all outline-none",
//                 "disabled:opacity-40 disabled:cursor-not-allowed",
//                 "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
//                 className,
//             )}
//             style={{
//                 borderRadius: "var(--radius-sm)",
//                 border: "1px solid var(--color-border)",
//                 background: "var(--color-surface)",
//                 color: "var(--color-text-primary)",
//                 ...style,
//             }}
//             onFocus={e => {
//                 e.currentTarget.style.borderColor = "var(--color-accent)";
//                 e.currentTarget.style.boxShadow = "var(--shadow-glow)";
//             }}
//             onBlur={e => {
//                 e.currentTarget.style.borderColor = "var(--color-border)";
//                 e.currentTarget.style.boxShadow = "none";
//             }}
//             {...props}
//         />
//     );
// }

// function Select({ className, children, style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
//     return (
//         <div className="relative">
//             <select
//                 className={cn("w-full h-10 pl-3 pr-8 text-sm appearance-none transition-all outline-none", className)}
//                 style={{
//                     borderRadius: "var(--radius-sm)",
//                     border: "1px solid var(--color-border)",
//                     background: "var(--color-surface)",
//                     color: "var(--color-text-primary)",
//                     ...style,
//                 }}
//                 {...props}
//             >
//                 {children}
//             </select>
//             <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
//         </div>
//     );
// }

// function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
//     return (
//         <button
//             type="button"
//             role="switch"
//             aria-checked={checked}
//             onClick={() => onChange(!checked)}
//             className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 outline-none"
//             style={{ background: checked ? "var(--color-accent)" : "var(--color-border-strong)" }}
//         >
//             <span
//                 className="inline-block h-3.5 w-3.5 mt-[3px] rounded-full bg-white shadow-sm transition-transform duration-200"
//                 style={{ transform: checked ? "translateX(18px)" : "translateX(3px)" }}
//             />
//         </button>
//     );
// }

// function ToggleRow({ title, description, checked, onChange }: {
//     title: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
// }) {
//     return (
//         <div className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--color-border)" }}>
//             <div>
//                 <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{title}</p>
//                 {description && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{description}</p>}
//             </div>
//             <Toggle checked={checked} onChange={onChange} />
//         </div>
//     );
// }

// function Card({ children, className }: { children: React.ReactNode; className?: string }) {
//     return (
//         <div
//             className={cn("overflow-hidden", className)}
//             style={{
//                 borderRadius: "var(--radius-lg)",
//                 border: "1px solid var(--color-border)",
//                 background: "var(--color-surface)",
//                 boxShadow: "var(--shadow-sm)",
//             }}
//         >
//             {children}
//         </div>
//     );
// }

// function CardHeader({ children }: { children: React.ReactNode }) {
//     return (
//         <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
//             {children}
//         </div>
//     );
// }

// function Divider() {
//     return <div className="my-6" style={{ borderTop: "1px solid var(--color-border)" }} />;
// }

// function SectionTitle({ label }: { label: string }) {
//     return <h3 className="text-sm font-semibold mb-5" style={{ color: "var(--color-text-primary)" }}>{label}</h3>;
// }

// function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
//     const [inp, setInp] = useState("");
//     const tags = value ? value.split(",").map(t => t.trim()).filter(Boolean) : [];
//     const add = (t: string) => {
//         const tr = t.trim();
//         if (!tr || tags.includes(tr)) return;
//         onChange([...tags, tr].join(", "));
//         setInp("");
//     };
//     const rm = (i: number) => onChange(tags.filter((_, idx) => idx !== i).join(", "));
//     return (
//         <div
//             className="flex flex-wrap gap-1.5 min-h-[40px] p-2 transition-all"
//             style={{
//                 borderRadius: "var(--radius-sm)",
//                 border: "1px solid var(--color-border)",
//                 background: "var(--color-surface)",
//             }}
//         >
//             {tags.map((t, i) => (
//                 <span
//                     key={t}
//                     className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
//                     style={{
//                         borderRadius: "var(--radius-full)",
//                         background: "var(--color-accent-light)",
//                         border: "1px solid var(--color-accent-subtle)",
//                         color: "var(--color-accent)",
//                     }}
//                 >
//                     {t}
//                     <button onClick={() => rm(i)} style={{ color: "var(--color-accent)", opacity: 0.6 }}><X size={9} /></button>
//                 </span>
//             ))}
//             <input
//                 className="flex-1 min-w-[80px] text-xs bg-transparent outline-none h-6"
//                 style={{ color: "var(--color-text-primary)" }}
//                 placeholder={tags.length === 0 ? "Add a tag…" : ""}
//                 value={inp}
//                 onChange={e => setInp(e.target.value)}
//                 onKeyDown={e => {
//                     if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(inp); }
//                     if (e.key === "Backspace" && !inp && tags.length) rm(tags.length - 1);
//                 }}
//                 onBlur={() => { if (inp) add(inp); }}
//             />
//         </div>
//     );
// }

// /* ── live preview ── */
// function LivePreview({ form }: { form: FormState }) {
//     const price = parseFloat(form.price) || 0;
//     const isFree = price === 0;
//     const tags = form.tags ? form.tags.split(",").slice(0, 4).map(t => t.trim()).filter(Boolean) : [];
//     const subtype = PRODUCT_SUBTYPES.find(s => s.id === form.product_subtype);

//     return (
//         <Card className="sticky top-[72px] bg-[--color-surface] overflow-hidden">
//             <CardHeader>
//                 <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Preview</span>
//                 <span
//                     className="text-[10px] font-medium px-2 py-0.5"
//                     style={{
//                         borderRadius: "var(--radius-full)",
//                         background: "var(--color-surface-secondary)",
//                         border: "1px solid var(--color-border)",
//                         color: "var(--color-text-muted)",
//                     }}
//                 >
//                     Buyer view
//                 </span>
//             </CardHeader>
//             <div className="p-4">
//                 {/* cover */}
//                 <div
//                     className="w-full aspect-video flex items-center justify-center mb-3 relative overflow-hidden"
//                     style={{
//                         borderRadius: "var(--radius-md)",
//                         border: "1px solid var(--color-border)",
//                         background: "var(--color-surface-secondary)",
//                     }}
//                 >
//                     {form.images[0] ? (
//                         <CloudinaryImage src={form.images[0]} alt="cover" fill className="object-cover" />
//                     ) : (
//                         <div className="flex flex-col items-center gap-1" style={{ color: "var(--color-border-strong)" }}>
//                             <ImageIcon size={24} />
//                             <span className="text-[10px]">Cover image</span>
//                         </div>
//                     )}
//                     {subtype && (
//                         <div
//                             className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
//                             style={{
//                                 borderRadius: "var(--radius-full)",
//                                 background: "var(--color-accent)",
//                                 color: "#fff",
//                             }}
//                         >
//                             {subtype.previewBadge}
//                         </div>
//                     )}
//                     {form.status === "draft" && (
//                         <div
//                             className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
//                             style={{
//                                 borderRadius: "var(--radius-full)",
//                                 background: "var(--color-warning-light, #fef3c7)",
//                                 border: "1px solid var(--color-warning, #f59e0b)",
//                                 color: "var(--color-warning, #b45309)",
//                             }}
//                         >
//                             Draft
//                         </div>
//                     )}
//                 </div>

//                 <div className="flex items-center gap-1.5 mb-2">
//                     <div className="flex">
//                         {["#fecaca", "#fed7aa", "#e9d5ff"].map((c, i) => (
//                             <div key={i} className="w-4 h-4 rounded-full border-2 -mr-1" style={{ background: c, borderColor: "var(--color-surface)" }} />
//                         ))}
//                     </div>
//                     <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>2.8k+ students</span>
//                     <span className="text-[11px] ml-auto" style={{ color: "var(--color-text-muted)" }}>★ 4.9</span>
//                 </div>

//                 <p
//                     className="text-sm font-bold leading-snug mb-1"
//                     style={{ color: form.name ? "var(--color-text-primary)" : "var(--color-border-strong)", fontStyle: form.name ? "normal" : "italic", fontWeight: form.name ? 700 : 400 }}
//                 >
//                     {form.name || "Your product name"}
//                 </p>

//                 {form.short_description && (
//                     <p className="text-[11px] mb-2 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{form.short_description}</p>
//                 )}

//                 <p className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
//                     {isFree ? "Free" : `$${price.toFixed(2)}`}
//                     {!isFree && form.pricing_type === "recurring" && form.product_type === "digital" && (
//                         <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}> / {form.billing_period}</span>
//                     )}
//                 </p>

//                 <button
//                     className="w-full py-2 text-xs font-semibold text-white cursor-default"
//                     style={{ borderRadius: "var(--radius-sm)", background: "var(--color-accent)" }}
//                 >
//                     {form.button_text || subtype?.suggestedButtonText || "Buy Now"}
//                 </button>

//                 {tags.length > 0 && (
//                     <div className="flex flex-wrap gap-1 mt-3">
//                         {tags.map((t, i) => (
//                             <span
//                                 key={i}
//                                 className="text-[10px] px-2 py-0.5"
//                                 style={{
//                                     borderRadius: "var(--radius-full)",
//                                     background: "var(--color-accent-light)",
//                                     border: "1px solid var(--color-accent-subtle)",
//                                     color: "var(--color-accent)",
//                                 }}
//                             >
//                                 {t}
//                             </span>
//                         ))}
//                     </div>
//                 )}

//                 {form.name && (
//                     <>
//                         <div className="my-3" style={{ borderTop: "1px solid var(--color-border)" }} />
//                         <div className="flex justify-between text-xs">
//                             <span style={{ color: "var(--color-text-muted)" }}>Type</span>
//                             <span className="font-medium capitalize" style={{ color: "var(--color-text-secondary)" }}>
//                                 {subtype?.label || form.product_type}
//                             </span>
//                         </div>
//                     </>
//                 )}
//             </div>
//         </Card>
//     );
// }

// /* ── Right sidebar ── */
// function RightSidebar({
//     form,
//     handleChange,
//     isEdit = false,
// }: {
//     form: FormState;
//     handleChange: (f: string, v: unknown) => void;
//     isEdit?: boolean;
// }) {
//     const advItems = [
//         { label: "Drip content", Icon: Clock },
//         { label: "Access rules", Icon: Lock },
//         { label: "Localisation", Icon: Globe },
//         { label: "SEO settings", Icon: Search },
//     ];

//     const selectedSubtype = PRODUCT_SUBTYPES.find(s => s.id === form.product_subtype);

//     return (
//         <div className="space-y-3 sticky top-[72px]">

//             {/* status (edit only) */}
//             {isEdit && (
//                 <Card>
//                     <CardHeader>
//                         <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Status</p>
//                     </CardHeader>
//                     <div className="p-3 space-y-1.5">
//                         {(["active", "draft", "archived"] as const).map(s => {
//                             const sel = form.status === s;
//                             const colors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
//                                 active: { bg: "var(--color-success-light)", border: "var(--color-success)", text: "var(--color-success)", dot: "var(--color-success)" },
//                                 draft: { bg: "var(--color-warning-light, #fef3c7)", border: "var(--color-warning, #f59e0b)", text: "var(--color-warning, #b45309)", dot: "var(--color-warning, #f59e0b)" },
//                                 archived: { bg: "var(--color-surface-secondary)", border: "var(--color-border)", text: "var(--color-text-muted)", dot: "var(--color-border-strong)" },
//                             };
//                             const c = colors[s];
//                             return (
//                                 <button
//                                     key={s}
//                                     onClick={() => handleChange("status", s)}
//                                     className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all"
//                                     style={{
//                                         borderRadius: "var(--radius-sm)",
//                                         border: `1px solid ${sel ? c.border : "var(--color-border)"}`,
//                                         background: sel ? c.bg : "transparent",
//                                     }}
//                                 >
//                                     <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sel ? c.dot : "var(--color-border-strong)" }} />
//                                     <span className="text-xs font-medium capitalize flex-1" style={{ color: sel ? c.text : "var(--color-text-muted)" }}>{s}</span>
//                                     {sel && <Check size={11} style={{ color: c.text }} />}
//                                 </button>
//                             );
//                         })}
//                     </div>
//                 </Card>
//             )}

//             {/* contextual tips — only shown for digital products with a matched subtype */}
//             {form.product_type === "digital" && selectedSubtype && (
//                 <Card>
//                     <CardHeader>
//                         <div className="flex items-center gap-1.5">
//                             <Lightbulb size={12} style={{ color: "var(--color-accent)" }} />
//                             <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
//                                 {selectedSubtype.label} tips
//                             </p>
//                         </div>
//                         <span
//                             className="text-[10px] font-medium px-2 py-0.5"
//                             style={{
//                                 borderRadius: "var(--radius-full)",
//                                 background: "var(--color-accent-light)",
//                                 border: "1px solid var(--color-accent-subtle)",
//                                 color: "var(--color-accent)",
//                             }}
//                         >
//                             {selectedSubtype.previewBadge}
//                         </span>
//                     </CardHeader>
//                     <div className="p-3">
//                         <ul className="space-y-1.5">
//                             {selectedSubtype.tips.map((tip, i) => (
//                                 <li key={i} className="flex items-start gap-1.5">
//                                     <span className="text-[10px] font-bold mt-0.5 flex-shrink-0" style={{ color: "var(--color-accent)" }}>·</span>
//                                     <span className="text-[10px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{tip}</span>
//                                 </li>
//                             ))}
//                         </ul>
//                         {selectedSubtype.recommendedFields.length > 0 && (
//                             <div className="mt-2.5 pt-2.5" style={{ borderTop: "1px solid var(--color-border)" }}>
//                                 <span className="text-[10px] font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>Recommended toggles</span>
//                                 <div className="flex flex-wrap gap-1">
//                                     {selectedSubtype.recommendedFields.map(f => (
//                                         <span
//                                             key={f}
//                                             className="text-[9px] font-medium px-1.5 py-0.5"
//                                             style={{
//                                                 borderRadius: "var(--radius-full)",
//                                                 background: "var(--color-accent-light)",
//                                                 border: "1px solid var(--color-accent-subtle)",
//                                                 color: "var(--color-accent)",
//                                             }}
//                                         >
//                                             {f}
//                                         </span>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </Card>
//             )}

//             {/* sales page toggles */}
//             <Card>
//                 <CardHeader>
//                     <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Sales page</p>
//                 </CardHeader>
//                 <div className="px-4 py-1">
//                     <ToggleRow title="Show author bio" checked={form.show_author} onChange={v => handleChange("show_author", v)} />
//                     <ToggleRow title="Show reviews" checked={form.show_reviews} onChange={v => handleChange("show_reviews", v)} />
//                     <ToggleRow title="Discussions" checked={form.enable_discussions} onChange={v => handleChange("enable_discussions", v)} />
//                 </div>
//             </Card>

//             {/* advanced */}
//             <Card>
//                 <CardHeader>
//                     <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Advanced</p>
//                 </CardHeader>
//                 {advItems.map(item => (
//                     <button
//                         key={item.label}
//                         className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors border-b last:border-b-0"
//                         style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-border)" }}
//                         onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-secondary)")}
//                         onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
//                     >
//                         <item.Icon size={13} style={{ color: "var(--color-text-muted)" }} />
//                         <span>{item.label}</span>
//                         <ChevronRight size={14} className="ml-auto" style={{ color: "var(--color-border-strong)" }} />
//                     </button>
//                 ))}
//             </Card>
//         </div>
//     );
// }

// /* ── STEP 1: Details ── */
// function StepDetails({
//     form, handleChange, categories, handleImageUpload, removeImage,
// }: {
//     form: FormState;
//     handleChange: (f: string, v: unknown) => void;
//     categories: any[];
//     handleImageUpload: (url: string) => void;
//     removeImage: (i: number) => void;
// }) {
//     const filteredCategories = categories.filter(c => {
//         const ct = c.category_type;
//         if (form.product_type === "digital") return ct === "digital";
//         return ct === "physical" || ct === "both" || !ct;
//     });

//     return (
//         <div className="space-y-6">
//             <div>
//                 <div className="flex items-start justify-between mb-5">
//                     <SectionTitle label="Basic information" />
//                     <button
//                         className="flex items-center gap-1.5 px-3 h-7 text-xs transition-all"
//                         style={{
//                             borderRadius: "var(--radius-full)",
//                             border: "1px solid var(--color-border)",
//                             color: "var(--color-text-muted)",
//                         }}
//                         onMouseEnter={e => {
//                             e.currentTarget.style.borderColor = "var(--color-accent)";
//                             e.currentTarget.style.color = "var(--color-accent)";
//                         }}
//                         onMouseLeave={e => {
//                             e.currentTarget.style.borderColor = "var(--color-border)";
//                             e.currentTarget.style.color = "var(--color-text-muted)";
//                         }}
//                     >
//                         <Sparkles size={11} /> AI assist
//                     </button>
//                 </div>

//                 <div className="space-y-4">
//                     <div>
//                         <Label hint={`${form.name.length}/80`}>Product name <span style={{ color: "var(--color-accent)" }}>*</span></Label>
//                         <Input value={form.name} maxLength={80} onChange={e => handleChange("name", e.target.value)} placeholder="e.g. How to Build a Viral App: 0 to $100k/mo" />
//                     </div>
//                     <div>
//                         <Label hint="Auto-generated from name">URL slug</Label>
//                         <div className="flex">
//                             <span
//                                 className="flex items-center px-3 h-10 text-[11px] font-mono whitespace-nowrap flex-shrink-0"
//                                 style={{
//                                     borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
//                                     border: "1px solid var(--color-border)",
//                                     borderRight: "none",
//                                     background: "var(--color-surface-secondary)",
//                                     color: "var(--color-text-muted)",
//                                 }}
//                             >
//                                 /product/
//                             </span>
//                             <Input
//                                 value={form.slug}
//                                 onChange={e => handleChange("slug", e.target.value)}
//                                 className="font-mono text-xs"
//                                 style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}
//                                 placeholder="my-product-name"
//                             />
//                         </div>
//                     </div>
//                     <div>
//                         <Label hint={`${form.short_description.length}/80`}>Headline <span style={{ color: "var(--color-accent)" }}>*</span></Label>
//                         <Input value={form.short_description} maxLength={80} onChange={e => handleChange("short_description", e.target.value)} placeholder="Step-by-step blueprint to build, launch & monetize" />
//                     </div>
//                     <div>
//                         <Label hint={`${(form.description || "").length}/500`}>Full description</Label>
//                         <StyledTextarea value={form.description || ""} maxLength={500} rows={5} onChange={e => handleChange("description", e.target.value)} placeholder="Describe your product in detail — features, what's included…" />
//                     </div>

//                     <div>
//                         <Label>Tags</Label>
//                         <TagInput value={form.tags} onChange={v => handleChange("tags", v)} />
//                         <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>Press Enter or comma to add</p>
//                     </div>
//                 </div>
//             </div>

//             <Divider />

//             <div className="space-y-4">
//                 <SectionTitle label="Product type" />
//                 <div className="grid grid-cols-2 gap-3 mb-5">
//                     {[
//                         { id: "physical", label: "Physical", Icon: ShoppingBag, hint: "Ships to customer" },
//                         { id: "digital", label: "Digital", Icon: Globe, hint: "Instant download / access" },
//                     ].map(type => {
//                         const sel = form.product_type === type.id;
//                         return (
//                             <button
//                                 key={type.id}
//                                 onClick={() => handleChange("product_type", type.id)}
//                                 className="flex items-center gap-3 p-3.5 text-left transition-all"
//                                 style={{
//                                     borderRadius: "var(--radius-md)",
//                                     border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border)"}`,
//                                     background: sel ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
//                                 }}
//                             >
//                                 <div
//                                     className="w-9 h-9 flex items-center justify-center flex-shrink-0"
//                                     style={{
//                                         borderRadius: "var(--radius-sm)",
//                                         background: sel ? "var(--color-accent)" : "var(--color-surface)",
//                                         color: sel ? "#fff" : "var(--color-text-muted)",
//                                     }}
//                                 >
//                                     <type.Icon size={16} />
//                                 </div>
//                                 <div>
//                                     <p className="text-sm font-semibold" style={{ color: sel ? "var(--color-accent)" : "var(--color-text-primary)" }}>{type.label}</p>
//                                     <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{type.hint}</p>
//                                 </div>
//                             </button>
//                         );
//                     })}
//                 </div>

//                 <div>
//                     <Label>Category <span style={{ color: "var(--color-accent)" }}>*</span></Label>
//                     <Select value={form.category_id} onChange={e => handleChange("category_id", e.target.value)}>
//                         <option value="">Select a category…</option>
//                         {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
//                         <option value="">Uncategorized</option>
//                     </Select>
//                 </div>
//             </div>

//             <Divider />

//             <div>
//                 <SectionTitle label="Media" />
//                 <div
//                     className="p-8 text-center transition-colors cursor-pointer"
//                     style={{
//                         borderRadius: "var(--radius-md)",
//                         border: "2px dashed var(--color-border)",
//                     }}
//                     onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-border-strong)")}
//                     onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
//                 >
//                     <CloudinaryDropzone
//                         folder="jimvio/products"
//                         onUploadSuccess={handleImageUpload}
//                         label={
//                             <div className="flex flex-col items-center gap-2">
//                                 <div
//                                     className="w-10 h-10 flex items-center justify-center"
//                                     style={{ borderRadius: "var(--radius-sm)", background: "var(--color-surface-secondary)" }}
//                                 >
//                                     <ImageIcon size={16} style={{ color: "var(--color-text-muted)" }} />
//                                 </div>
//                                 <div>
//                                     <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Drop images here or click to upload</p>
//                                     <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>JPG, PNG, WEBP — max 10MB</p>
//                                 </div>
//                             </div>
//                         }
//                     />
//                 </div>
//                 {form.images.length > 0 && (
//                     <div className="grid grid-cols-4 gap-3 mt-4">
//                         {form.images.map((url, i) => (
//                             <div
//                                 key={url}
//                                 className="relative aspect-square overflow-hidden group"
//                                 style={{
//                                     borderRadius: "var(--radius-md)",
//                                     border: "1px solid var(--color-border)",
//                                     background: "var(--color-surface-secondary)",
//                                 }}
//                             >
//                                 <CloudinaryImage src={url} alt={`Image ${i + 1}`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
//                                 {i === 0 && (
//                                     <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-[9px] font-semibold text-white uppercase" style={{ borderRadius: "4px" }}>Main</div>
//                                 )}
//                                 <button
//                                     onClick={() => removeImage(i)}
//                                     className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80"
//                                     style={{ borderRadius: "var(--radius-sm)" }}
//                                 >
//                                     <X size={11} />
//                                 </button>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }

// /* ── STEP 2: Pricing ── */
// function StepPricing({ form, handleChange }: { form: FormState; handleChange: (f: string, v: unknown) => void }) {
//     const isFree = parseFloat(form.price) === 0;
//     return (
//         <div className="space-y-6">
//             <div>
//                 <SectionTitle label="Pricing model" />
//                 <div className="grid grid-cols-2 gap-3 mb-5">
//                     {[
//                         { id: "free", label: "Free", hint: "No charge to access" },
//                         { id: "paid", label: "Paid", hint: "Charge customers" },
//                     ].map(opt => {
//                         const sel = opt.id === "free" ? isFree : !isFree;
//                         return (
//                             <button
//                                 key={opt.id}
//                                 onClick={() => handleChange("price", opt.id === "free" ? "0" : "9.99")}
//                                 className="flex flex-col gap-1 p-4 text-left transition-all"
//                                 style={{
//                                     borderRadius: "var(--radius-md)",
//                                     border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border)"}`,
//                                     background: sel ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
//                                 }}
//                             >
//                                 <div className="flex items-center justify-between">
//                                     <span className="text-sm font-semibold" style={{ color: sel ? "var(--color-accent)" : "var(--color-text-primary)" }}>{opt.label}</span>
//                                     {sel && <Check size={14} style={{ color: "var(--color-accent)" }} />}
//                                 </div>
//                                 <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{opt.hint}</span>
//                             </button>
//                         );
//                     })}
//                 </div>

//                 {!isFree && (
//                     <div className="space-y-4">
//                         <div className="grid grid-cols-3 gap-3">
//                             <div>
//                                 <Label>Currency</Label>
//                                 <Select value={form.currency} onChange={e => handleChange("currency", e.target.value)}>
//                                     <option value="USD">USD – $</option>
//                                     <option value="EUR">EUR – €</option>
//                                     <option value="GBP">GBP – £</option>
//                                 </Select>
//                             </div>
//                             <div className="col-span-2">
//                                 <Label>Price</Label>
//                                 <div className="relative">
//                                     <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
//                                     <Input type="number" value={form.price} onChange={e => handleChange("price", e.target.value)} className="pl-8 font-semibold text-base" min={0} step="0.01" />
//                                 </div>
//                             </div>
//                         </div>

//                         {/* ✅ Recurring billing only shown for digital products */}
//                         {form.product_type === "digital" && (
//                             <div className="space-y-3">
//                                 <Label>Billing type</Label>
//                                 <div className="grid grid-cols-2 gap-2">
//                                     {[
//                                         { id: "one_time", label: "One-time payment" },
//                                         { id: "recurring", label: "Recurring subscription" },
//                                     ].map(opt => (
//                                         <button
//                                             key={opt.id}
//                                             onClick={() => handleChange("pricing_type", opt.id)}
//                                             className="h-10 text-xs font-medium transition-all"
//                                             style={{
//                                                 borderRadius: "var(--radius-sm)",
//                                                 border: `1px solid ${form.pricing_type === opt.id ? "var(--color-accent)" : "var(--color-border)"}`,
//                                                 background: form.pricing_type === opt.id ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
//                                                 color: form.pricing_type === opt.id ? "var(--color-accent)" : "var(--color-text-secondary)",
//                                             }}
//                                         >
//                                             {opt.label}
//                                         </button>
//                                     ))}
//                                 </div>
//                                 {form.pricing_type === "recurring" && (
//                                     <div>
//                                         <Label>Billing period</Label>
//                                         <div className="flex flex-wrap gap-2">
//                                             {BILLING_PERIODS.map(p => (
//                                                 <button
//                                                     key={p.id}
//                                                     onClick={() => handleChange("billing_period", p.id)}
//                                                     className="px-4 h-8 text-[11px] font-semibold uppercase tracking-wide transition-all"
//                                                     style={{
//                                                         borderRadius: "var(--radius-full)",
//                                                         border: "1px solid",
//                                                         borderColor: form.billing_period === p.id ? "var(--color-accent)" : "var(--color-border)",
//                                                         background: form.billing_period === p.id ? "var(--color-accent)" : "transparent",
//                                                         color: form.billing_period === p.id ? "#fff" : "var(--color-text-muted)",
//                                                     }}
//                                                 >
//                                                     {p.label}
//                                                 </button>
//                                             ))}
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>
//                         )}

//                         {/* Physical product: show one-time only note */}
//                         {form.product_type === "physical" && (
//                             <div
//                                 className="flex items-center gap-2 px-3 py-2.5 text-xs"
//                                 style={{
//                                     borderRadius: "var(--radius-sm)",
//                                     border: "1px solid var(--color-border)",
//                                     background: "var(--color-surface-secondary)",
//                                     color: "var(--color-text-muted)",
//                                 }}
//                             >
//                                 <ShoppingBag size={13} />
//                                 Physical products are always charged as a one-time payment.
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>

//             <Divider />

//             <div>
//                 <div className="flex items-start justify-between mb-1">
//                     <div>
//                         <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Affiliate program</p>
//                         <p className="text-xs mt-0.5 mb-4" style={{ color: "var(--color-text-muted)" }}>Let others earn by promoting your product</p>
//                     </div>
//                     <Toggle checked={form.affiliate_enabled} onChange={v => handleChange("affiliate_enabled", v)} />
//                 </div>
//                 {form.affiliate_enabled && (
//                     <div className="space-y-3 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
//                         <div>
//                             <Label hint="% of sale price">Commission rate</Label>
//                             <div className="relative">
//                                 <Input type="number" value={form.affiliate_commission_rate} onChange={e => handleChange("affiliate_commission_rate", e.target.value)} className="pr-8 font-mono" min="1" max="100" />
//                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: "var(--color-text-muted)" }}>%</span>
//                             </div>
//                         </div>
//                         <div
//                             className="p-3.5 text-xs leading-relaxed"
//                             style={{
//                                 borderRadius: "var(--radius-md)",
//                                 border: "1px solid var(--color-accent-subtle)",
//                                 background: "var(--color-accent-light)",
//                                 color: "var(--color-accent)",
//                             }}
//                         >
//                             Affiliates earn <strong>{form.affiliate_commission_rate || 10}%</strong> per sale — approx. <strong>${((parseFloat(form.price) || 0) * (parseFloat(form.affiliate_commission_rate) || 10) / 100).toFixed(2)}</strong> per conversion
//                         </div>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }

// /* ── STEP 3: Settings ── */
// function StepSettings({ form, handleChange }: { form: FormState; handleChange: (f: string, v: unknown) => void }) {
//     return (
//         <div className="space-y-6">
//             <div>
//                 <SectionTitle label="Call-to-action button" />
//                 <div className="space-y-3">
//                     <div>
//                         <Label>Button label</Label>
//                         <Input value={form.button_text} onChange={e => handleChange("button_text", e.target.value)} placeholder="e.g. Buy Now" />
//                     </div>
//                     <div className="flex flex-wrap gap-1.5">
//                         {BUTTON_TEXTS.map(txt => {
//                             const sel = form.button_text === txt;
//                             return (
//                                 <button
//                                     key={txt}
//                                     onClick={() => handleChange("button_text", txt)}
//                                     className="px-3 py-1 text-[11px] font-medium transition-all"
//                                     style={{
//                                         borderRadius: "var(--radius-sm)",
//                                         border: "1px solid",
//                                         borderColor: sel ? "var(--color-accent)" : "var(--color-border)",
//                                         background: sel ? "var(--color-accent-light)" : "transparent",
//                                         color: sel ? "var(--color-accent)" : "var(--color-text-muted)",
//                                     }}
//                                 >
//                                     {txt}
//                                 </button>
//                             );
//                         })}
//                     </div>
//                 </div>
//             </div>
//             <Divider />
//             <div>
//                 <SectionTitle label="Fulfilment" />
//                 {form.product_type === "physical" && (
//                     <div className="space-y-4">
//                         <div
//                             className="flex items-center justify-between p-3.5"
//                             style={{
//                                 borderRadius: "var(--radius-md)",
//                                 border: "1px solid var(--color-border)",
//                                 background: "var(--color-surface-secondary)",
//                             }}
//                         >
//                             <div>
//                                 <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Track inventory</p>
//                                 <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Auto-reduce stock on purchase</p>
//                             </div>
//                             <Toggle checked={form.track_inventory} onChange={v => handleChange("track_inventory", v)} />
//                         </div>
//                         <div className="grid grid-cols-3 gap-3">
//                             <div>
//                                 <Label>Stock quantity</Label>
//                                 <Input type="number" value={form.inventory_quantity} onChange={e => handleChange("inventory_quantity", e.target.value)} disabled={!form.track_inventory} placeholder="0" />
//                             </div>
//                             <div>
//                                 <Label hint="kg">Weight</Label>
//                                 <Input type="number" step="0.01" value={form.weight} onChange={e => handleChange("weight", e.target.value)} placeholder="0.00" />
//                             </div>
//                             <div>
//                                 <Label hint="L×W×H">Dimensions</Label>
//                                 <Input value={form.dimensions} onChange={e => handleChange("dimensions", e.target.value)} placeholder="10×10×5 cm" />
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 {form.product_type === "digital" && (
//                     <div className="space-y-3">
//                         <div
//                             className="p-4"
//                             style={{
//                                 borderRadius: "var(--radius-md)",
//                                 border: "1px solid var(--color-border)",
//                                 background: "var(--color-surface-secondary)",
//                             }}
//                         >
//                             <div className="flex items-center gap-2 mb-3">
//                                 <Upload size={14} style={{ color: "var(--color-text-muted)" }} />
//                                 <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Digital file</p>
//                             </div>
//                             {form.digital_file_url ? (
//                                 <div
//                                     className="flex items-center gap-2 p-2.5"
//                                     style={{
//                                         borderRadius: "var(--radius-sm)",
//                                         border: "1px solid var(--color-success)",
//                                         background: "var(--color-success-light)",
//                                     }}
//                                 >
//                                     <CheckCircle2 size={14} style={{ color: "var(--color-success)", flexShrink: 0 }} />
//                                     <p className="text-xs font-mono flex-1 truncate" style={{ color: "var(--color-text-secondary)" }}>{form.digital_file_url}</p>
//                                     <button onClick={() => handleChange("digital_file_url", "")} style={{ color: "var(--color-danger)" }}>
//                                         <X size={13} />
//                                     </button>
//                                 </div>
//                             ) : (
//                                 <CloudinaryUploadButton
//                                     folder="jimvio/digital-files"
//                                     resourceType="raw"
//                                     onUploadSuccess={url => handleChange("digital_file_url", url)}
//                                     className="px-4 h-8 text-xs font-medium transition-all"
//                                 />
//                             )}
//                         </div>
//                         <div>
//                             <Label hint="Or paste a direct URL">Manual file URL</Label>
//                             <div className="relative">
//                                 <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
//                                 <Input placeholder="https://your-cdn.com/file.zip" value={form.digital_file_url} onChange={e => handleChange("digital_file_url", e.target.value)} className="pl-8 font-mono text-xs" />
//                             </div>
//                         </div>
//                     </div>
//                 )}
//             </div>

//             <Divider />

//             <div>
//                 <SectionTitle label="Visibility" />
//                 <div
//                     className="flex items-center justify-between p-4"
//                     style={{
//                         borderRadius: "var(--radius-md)",
//                         border: "1px solid var(--color-border)",
//                         background: "var(--color-surface-secondary)",
//                     }}
//                 >
//                     <div>
//                         <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Feature in store showcase</p>
//                         <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Pin this product to the top of your store</p>
//                     </div>
//                     <Toggle checked={form.is_featured} onChange={v => handleChange("is_featured", v)} />
//                 </div>
//             </div>
//         </div>
//     );
// }

// /* ── STEP 4: Publish / Save ── */
// function StepPublish({
//     form, isPending, handleSubmit, isEdit,
// }: {
//     form: FormState; isPending: boolean; handleSubmit: () => void; isEdit: boolean;
// }) {
//     const price = parseFloat(form.price) || 0;
//     const isDigital = form.product_type === "digital";
//     const checks = [
//         { label: "Product name added", done: !!form.name.trim() },
//         { label: "Headline written", done: !!form.short_description.trim() },
//         { label: "Category selected", done: !!form.category_id },
//         { label: "Pricing configured", done: true },
//         { label: "Fulfilment set up", done: !isDigital || !!form.digital_file_url },
//     ];
//     const allDone = checks.every(c => c.done);
//     return (
//         <div className="space-y-6">
//             <div>
//                 <SectionTitle label={isEdit ? "Save checklist" : "Pre-launch checklist"} />
//                 <div className="space-y-2">
//                     {checks.map(item => (
//                         <div
//                             key={item.label}
//                             className="flex items-center gap-3 px-4 py-3 text-sm"
//                             style={{
//                                 borderRadius: "var(--radius-md)",
//                                 border: `1px solid ${item.done ? "var(--color-success)" : "var(--color-border)"}`,
//                                 background: item.done ? "var(--color-success-light)" : "var(--color-surface-secondary)",
//                                 color: item.done ? "var(--color-success)" : "var(--color-text-muted)",
//                             }}
//                         >
//                             {item.done ? <Check size={15} /> : <Circle size={15} />}
//                             <span className="flex-1">{item.label}</span>
//                             {!item.done && (
//                                 <span
//                                     className="text-[10px] font-semibold px-2 py-0.5"
//                                     style={{
//                                         borderRadius: "var(--radius-full)",
//                                         background: "var(--color-accent-light)",
//                                         border: "1px solid var(--color-accent-subtle)",
//                                         color: "var(--color-accent)",
//                                     }}
//                                 >
//                                     Required
//                                 </span>
//                             )}
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             <Divider />

//             <div>
//                 <SectionTitle label="Summary" />
//                 <div className="overflow-hidden" style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
//                     {[
//                         { k: "Name", v: form.name || "—" },
//                         { k: "Status", v: isEdit ? form.status : "Active on publish" },
//                         { k: "Type", v: form.product_type },
//                         { k: "Price", v: price === 0 ? "Free" : `$${price.toFixed(2)} ${form.currency}` },
//                         {
//                             k: "Billing",
//                             v: price === 0 ? "—"
//                                 : !isDigital ? "One-time (physical)"
//                                     : form.pricing_type === "recurring" ? `Recurring · ${form.billing_period}`
//                                         : "One-time",
//                         },
//                         { k: "Fulfilment", v: isDigital ? "Digital delivery" : "Physical shipping" },
//                     ].map(row => (
//                         <div key={row.k} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--color-border)" }}>
//                             <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.k}</span>
//                             <span className="text-xs font-semibold capitalize" style={{ color: "var(--color-text-primary)" }}>{row.v}</span>
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             <button
//                 onClick={handleSubmit}
//                 disabled={isPending || !allDone}
//                 className="w-full h-12 text-sm font-semibold flex items-center justify-center gap-2 text-white transition-all active:scale-[0.98]"
//                 style={{
//                     borderRadius: "var(--radius-lg)",
//                     background: isPending || !allDone ? "var(--color-border-strong)" : "var(--color-accent)",
//                     cursor: isPending || !allDone ? "not-allowed" : "pointer",
//                     boxShadow: !isPending && allDone ? "var(--shadow-glow)" : "none",
//                 }}
//             >
//                 {isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
//                 {isPending
//                     ? (isEdit ? "Saving…" : "Publishing…")
//                     : allDone
//                         ? (isEdit ? "Save changes" : "Publish product")
//                         : "Complete checklist to continue"}
//             </button>
//             <p className="text-[11px] text-center" style={{ color: "var(--color-text-muted)" }}>
//                 {allDone
//                     ? (isEdit ? "Changes will go live immediately" : "Your product will go live immediately after publishing")
//                     : "Complete all required fields above"}
//             </p>
//         </div>
//     );
// }

// /* ── SHARED PAGE SHELL ── */
// export function ProductFormShell({
//     title,
//     isEdit,
//     productId,
// }: {
//     title: string;
//     isEdit: boolean;
//     productId?: string;
// }) {
//     const router = useRouter();
//     const [isPending, startTransition] = useTransition();
//     const [step, setStep] = useState(1);
//     const [vendor, setVendor] = useState<any>(null);
//     const [categories, setCategories] = useState<any[]>([]);
//     const [error, setError] = useState<string | null>(null);
//     const [success, setSuccess] = useState(false);
//     const [loading, setLoading] = useState(isEdit);

//     const [form, setForm] = useState<FormState>({
//         name: "", slug: "", short_description: "", description: "",
//         product_type: "digital",
//         product_subtype: "course",           // default only valid for digital
//         price: "29.99", currency: "USD", category_id: "",
//         is_digital: true,
//         pricing_type: "recurring", billing_period: "monthly",
//         digital_file_url: "", track_inventory: true, inventory_quantity: "0",
//         affiliate_enabled: false, affiliate_commission_rate: "10",
//         is_featured: false,
//         button_text: "Join now", tags: "",
//         weight: "", dimensions: "", images: [],
//         show_author: true, show_reviews: true, enable_discussions: false,
//         status: "active",
//     });

//     useEffect(() => {
//         async function load() {
//             const supabase = createClient();
//             const { data: { user } } = await supabase.auth.getUser();
//             if (!user) { router.push("/login"); return; }
//             const { data: vends } = await supabase.from("vendors").select("*").eq("user_id", user.id);
//             if (!vends || vends.length === 0) { router.push("/dashboard/activate/vendor"); return; }
//             setVendor(vends[0]);

//             const { data: cats } = await supabase
//                 .from("product_categories")
//                 .select("id, name, slug, category_type")
//                 .eq("is_active", true)
//                 .order("sort_order");
//             setCategories(cats ?? []);

//             if (isEdit && productId) {
//                 const { data: product, error: pErr } = await supabase
//                     .from("products")
//                     .select("*")
//                     .eq("id", productId)
//                     .single();
//                 if (pErr || !product) { setError("Product not found."); setLoading(false); return; }

//                 // ✅ Fix 6: derive is_digital from product_type on load — single source of truth
//                 const loadedType: "physical" | "digital" = product.product_type ?? "digital";
//                 const loadedIsDigital = loadedType === "digital";
//                 const loadedSubtype = product.product_subtype
//                     ?? product.source_metadata?.product_subtype
//                     ?? (loadedIsDigital ? "course" : "");

//                 setForm({
//                     name: product.name ?? "",
//                     slug: product.slug ?? "",
//                     short_description: product.short_description ?? "",
//                     description: product.description ?? "",
//                     product_type: loadedType,
//                     product_subtype: loadedSubtype,
//                     price: String(product.price ?? "0"),
//                     currency: product.currency ?? "USD",
//                     category_id: product.category_id ?? "",
//                     is_digital: loadedIsDigital,                          // ✅ derived, not raw
//                     pricing_type: loadedIsDigital
//                         ? (product.pricing_type ?? "one_time")
//                         : "one_time",                                      // ✅ physical always one_time
//                     billing_period: product.billing_period ?? "monthly",
//                     digital_file_url: product.digital_file_url ?? "",
//                     track_inventory: product.track_inventory ?? false,
//                     inventory_quantity: String(product.inventory_quantity ?? "0"),
//                     affiliate_enabled: product.affiliate_enabled ?? false,
//                     affiliate_commission_rate: String(product.affiliate_commission_rate ?? "10"),
//                     is_featured: product.is_featured ?? false,
//                     button_text: product.button_text ?? "Buy Now",
//                     tags: Array.isArray(product.tags) ? product.tags.join(", ") : (product.tags ?? ""),
//                     weight: String(product.weight ?? ""),
//                     dimensions: product.dimensions ?? "",
//                     images: Array.isArray(product.images) ? product.images : [],
//                     show_author: product.show_author ?? product.source_metadata?.show_author ?? true,
//                     show_reviews: product.show_reviews ?? product.source_metadata?.show_reviews ?? true,
//                     enable_discussions: product.enable_discussions ?? product.source_metadata?.enable_discussions ?? false,
//                     status: product.status ?? "active",
//                 });
//             }
//             setLoading(false);
//         }
//         load();
//     }, [router, isEdit, productId]);

//     function handleChange(field: string, value: unknown) {
//         setForm(prev => {
//             const updated = { ...prev, [field]: value };

//             if (field === "name" && !isEdit) updated.slug = slugify(value as string);

//             // ✅ Fix 2: Auto-derive subtype from category slug, guarded to digital only
//             if (field === "category_id") {
//                 const cat = categories.find(c => c.id === value);
//                 if (cat?.slug && updated.product_type === "digital") {
//                     const matched = PRODUCT_SUBTYPES.find(s => s.id === cat.slug);
//                     if (matched) {
//                         updated.product_subtype = matched.id;
//                         const currentIsDefault = PRODUCT_SUBTYPES.some(
//                             s => s.suggestedButtonText === prev.button_text
//                         );
//                         if (!prev.button_text || currentIsDefault) {
//                             updated.button_text = matched.suggestedButtonText;
//                         }
//                     } else {
//                         // No subtype matched — clear it so sidebar tips disappear
//                         updated.product_subtype = "";
//                     }
//                 }
//             }

//             if (field === "product_type") {
//                 const isDigital = value === "digital";
//                 updated.is_digital = isDigital;

//                 // ✅ Fix 1: reset subtype when switching types
//                 updated.product_subtype = isDigital ? "course" : "";

//                 // ✅ Fix 3: physical products are always one_time; clear billing_period
//                 if (!isDigital) {
//                     updated.pricing_type = "one_time";
//                     updated.billing_period = "";
//                 }

//                 // Clear category if it doesn't match the new type
//                 const currentCat = categories.find(c => c.id === updated.category_id);
//                 if (currentCat) {
//                     const ct = currentCat.category_type;
//                     if (isDigital && ct === "physical") updated.category_id = "";
//                     if (!isDigital && ct === "digital") updated.category_id = "";
//                 }
//             }

//             return updated;
//         });
//     }

//     function handleImageUpload(url: string) {
//         setForm(prev => ({ ...prev, images: [...prev.images, url] }));
//     }
//     function removeImage(index: number) {
//         setForm(prev => { const next = [...prev.images]; next.splice(index, 1); return { ...prev, images: next }; });
//     }

//     async function handleSubmit() {
//         setError(null);
//         if (!vendor || !form.name.trim()) { setError("Product name is required."); return; }
//         const price = parseFloat(form.price) || 0;
//         if (price < 0) { setError("Price cannot be negative."); return; }

//         startTransition(async () => {
//             const supabase = createClient();

//             // ✅ Fix 4 & 5: single source of truth — derive isDigital from product_type
//             const isDigital = form.product_type === "digital";

//             // ✅ Fix 3: billing_period is null for physical OR one_time
//             const billingPeriod =
//                 isDigital && form.pricing_type === "recurring" ? form.billing_period : null;

//             const payload = {
//                 name: form.name,
//                 slug: form.slug || slugify(form.name),
//                 short_description: form.short_description || null,
//                 description: form.description || null,
//                 product_type: form.product_type,
//                 status: form.status,
//                 price,
//                 currency: form.currency,
//                 pricing_type: isDigital ? form.pricing_type : "one_time",  // ✅ enforce on save
//                 billing_period: billingPeriod,                               // ✅ fixed
//                 category_id: form.category_id || null,
//                 is_digital: isDigital,                                       // ✅ derived
//                 digital_file_url: isDigital ? (form.digital_file_url || null) : null,
//                 track_inventory: !isDigital && form.track_inventory,
//                 inventory_quantity: isDigital ? 0 : parseInt(form.inventory_quantity || "0"),
//                 weight: !isDigital ? (parseFloat(form.weight) || null) : null,
//                 dimensions: !isDigital ? (form.dimensions || null) : null,
//                 affiliate_enabled: form.affiliate_enabled,
//                 affiliate_commission_rate: form.affiliate_enabled
//                     ? parseFloat(form.affiliate_commission_rate || "10")
//                     : null,
//                 is_featured: form.is_featured,
//                 button_text: form.button_text || null,
//                 tags: form.tags
//                     ? form.tags.split(",").map(t => t.trim()).filter(Boolean)
//                     : null,
//                 images: form.images,
//                 source_metadata: {
//                     show_reviews: form.show_reviews,
//                     show_author: form.show_author,
//                     enable_discussions: form.enable_discussions,
//                     product_subtype: form.product_subtype || null,   // ✅ Fix 5: "" → null
//                 },
//             };

//             let insertErr: any = null;

//             if (isEdit && productId) {
//                 const { error } = await supabase.from("products").update(payload).eq("id", productId);
//                 insertErr = error;
//             } else {
//                 const slug = payload.slug;
//                 const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).single();
//                 if (existing) payload.slug = `${slug}-${Date.now()}`;
//                 const { error } = await supabase.from("products").insert({ ...payload, vendor_id: vendor.id });
//                 insertErr = error;
//             }

//             if (insertErr) { setError(insertErr.message); }
//             else { setSuccess(true); setTimeout(() => router.push("/dashboard/products"), 1800); }
//         });
//     }

//     /* success screen */
//     if (success) return (
//         <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "var(--color-bg)" }}>
//             <div
//                 className="w-16 h-16 flex items-center justify-center"
//                 style={{
//                     borderRadius: "var(--radius-lg)",
//                     border: "1px solid var(--color-success)",
//                     background: "var(--color-success-light)",
//                 }}
//             >
//                 <CheckCircle2 className="w-7 h-7" style={{ color: "var(--color-success)" }} />
//             </div>
//             <div className="text-center">
//                 <p className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
//                     {isEdit ? "Changes saved!" : "Product published!"}
//                 </p>
//                 <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Redirecting to your products…</p>
//             </div>
//         </div>
//     );

//     /* loading skeleton for edit */
//     if (loading) return (
//         <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
//             <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-text-muted)" }} />
//         </div>
//     );

//     const nextStep = STEPS.find(s => s.id === step + 1);

//     return (
//         <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>

//             {/* sticky top bar */}
//             <div
//                 className="sticky top-0 z-40 backdrop-blur"
//                 style={{
//                     background: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
//                     borderBottom: "1px solid var(--color-border)",
//                 }}
//             >
//                 <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-4">
//                     <div className="flex items-center gap-3 flex-1 min-w-0">
//                         <NextLink
//                             href="/dashboard/products"
//                             className="w-8 h-8 flex items-center justify-center transition-all"
//                             style={{
//                                 borderRadius: "var(--radius-sm)",
//                                 border: "1px solid var(--color-border)",
//                                 background: "var(--color-surface)",
//                                 color: "var(--color-text-muted)",
//                             }}
//                             onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
//                             onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
//                         >
//                             <ArrowLeft size={14} />
//                         </NextLink>
//                         <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: "var(--color-text-muted)" }}>
//                             <span>Products</span>
//                             <span>/</span>
//                             <span className="font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{form.name || title}</span>
//                         </div>
//                         {isEdit && (
//                             <span
//                                 className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
//                                 style={{
//                                     borderRadius: "var(--radius-full)",
//                                     background: "var(--color-surface-secondary)",
//                                     border: "1px solid var(--color-border)",
//                                     color: "var(--color-text-muted)",
//                                 }}
//                             >
//                                 Editing
//                             </span>
//                         )}
//                     </div>

//                     {/* steps */}
//                     <div className="hidden md:flex items-center gap-0.5">
//                         {STEPS.map((s, i) => (
//                             <React.Fragment key={s.id}>
//                                 <button
//                                     onClick={() => setStep(s.id)}
//                                     className="flex items-center gap-2 px-3 h-8 text-xs font-medium transition-all"
//                                     style={{
//                                         borderRadius: "var(--radius-sm)",
//                                         border: step === s.id ? "1px solid var(--color-border)" : "1px solid transparent",
//                                         background: step === s.id ? "var(--color-surface-secondary)" : "transparent",
//                                         color: step === s.id ? "var(--color-text-primary)" : s.id < step ? "var(--color-text-secondary)" : "var(--color-border-strong)",
//                                     }}
//                                 >
//                                     <span
//                                         className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
//                                         style={{
//                                             background: step === s.id ? "var(--color-accent)" : s.id < step ? "var(--color-success-light)" : "var(--color-surface-secondary)",
//                                             border: `1px solid ${step === s.id ? "var(--color-accent)" : s.id < step ? "var(--color-success)" : "var(--color-border)"}`,
//                                             color: step === s.id ? "#fff" : s.id < step ? "var(--color-success)" : "var(--color-text-muted)",
//                                         }}
//                                     >
//                                         {s.id < step ? <Check size={8} /> : s.id}
//                                     </span>
//                                     {s.label}
//                                 </button>
//                                 {i < STEPS.length - 1 && <ChevronRight size={12} className="mx-0.5" style={{ color: "var(--color-border-strong)" }} />}
//                             </React.Fragment>
//                         ))}
//                     </div>

//                     <div className="flex items-center gap-2 flex-shrink-0">
//                         <button
//                             onClick={() => router.push("/dashboard/products")}
//                             className="hidden sm:flex h-8 px-4 text-xs items-center font-medium transition-all"
//                             style={{
//                                 borderRadius: "var(--radius-sm)",
//                                 border: "1px solid var(--color-border)",
//                                 color: "var(--color-text-muted)",
//                                 background: "transparent",
//                             }}
//                             onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
//                             onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
//                         >
//                             {isEdit ? "Discard changes" : "Discard"}
//                         </button>
//                         {nextStep ? (
//                             <button
//                                 onClick={() => setStep(step + 1)}
//                                 className="flex items-center gap-1.5 h-8 px-4 text-xs font-semibold text-white transition-all"
//                                 style={{ borderRadius: "var(--radius-sm)", background: "var(--color-accent)" }}
//                                 onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
//                                 onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
//                             >
//                                 Next: {nextStep.label} <ChevronRight size={13} />
//                             </button>
//                         ) : (
//                             <button
//                                 onClick={handleSubmit}
//                                 disabled={isPending}
//                                 className="flex items-center gap-1.5 h-8 px-4 text-xs font-semibold text-white transition-all disabled:opacity-60"
//                                 style={{ borderRadius: "var(--radius-sm)", background: "var(--color-accent)", boxShadow: "var(--shadow-glow)" }}
//                             >
//                                 {isPending ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
//                                 {isPending ? (isEdit ? "Saving…" : "Publishing…") : (isEdit ? "Save" : "Publish")}
//                             </button>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {/* error banner */}
//             {error && (
//                 <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
//                     <div
//                         className="flex items-start gap-3 p-4"
//                         style={{
//                             borderRadius: "var(--radius-lg)",
//                             border: "1px solid var(--color-danger)",
//                             background: "var(--color-danger-light)",
//                         }}
//                     >
//                         <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-danger)" }} />
//                         <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
//                         <button onClick={() => setError(null)} className="ml-auto" style={{ color: "var(--color-danger)" }}><X size={15} /></button>
//                     </div>
//                 </div>
//             )}

//             {/* main layout */}
//             <div className="max-w-7xl mx-auto px-4 py-6">
//                 <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_220px] gap-5 items-start">
//                     {/* form card */}
//                     <Card className="overflow-hidden">
//                         <div className="p-6 sm:p-8">
//                             {step === 1 && <StepDetails form={form} handleChange={handleChange} categories={categories} handleImageUpload={handleImageUpload} removeImage={removeImage} />}
//                             {step === 2 && <StepPricing form={form} handleChange={handleChange} />}
//                             {step === 3 && <StepSettings form={form} handleChange={handleChange} />}
//                             {step === 4 && <StepPublish form={form} isPending={isPending} handleSubmit={handleSubmit} isEdit={isEdit} />}
//                         </div>

//                         {/* footer */}
//                         <div className="flex items-center justify-between px-6 sm:px-8 py-4" style={{ borderTop: "1px solid var(--color-border)" }}>
//                             <button
//                                 disabled={step === 1}
//                                 onClick={() => setStep(s => Math.max(1, s - 1))}
//                                 className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
//                                 style={{
//                                     borderRadius: "var(--radius-full)",
//                                     border: "1px solid var(--color-border)",
//                                     color: "var(--color-text-muted)",
//                                     background: "transparent",
//                                 }}
//                             >
//                                 <ArrowLeft size={12} /> Back
//                             </button>

//                             <div className="flex items-center gap-x-1.5">
//                                 {STEPS.map(s => (
//                                     <button
//                                         key={s.id}
//                                         onClick={() => setStep(s.id)}
//                                         className="h-[5px] rounded-full transition-all duration-300"
//                                         style={{
//                                             width: step === s.id ? "20px" : "5px",
//                                             background: step === s.id ? "var(--color-accent)" : s.id < step ? "var(--color-success)" : "var(--color-border-strong)",
//                                             opacity: s.id < step ? 0.5 : 1,
//                                         }}
//                                     />
//                                 ))}
//                             </div>

//                             {nextStep ? (
//                                 <button
//                                     onClick={() => setStep(s => Math.min(4, s + 1))}
//                                     className="flex items-center gap-1 h-8 px-3 text-xs font-semibold text-white transition-all"
//                                     style={{ borderRadius: "var(--radius-full)", background: "var(--color-accent)" }}
//                                 >
//                                     Next <ChevronRight size={12} />
//                                 </button>
//                             ) : (
//                                 <Button
//                                     onClick={handleSubmit}
//                                     disabled={isPending}
//                                 >
//                                     {isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
//                                     {isPending ? "…" : (isEdit ? "Save" : "Publish")}
//                                 </Button>
//                             )}
//                         </div>
//                     </Card>

//                     {/* live preview */}
//                     <LivePreview form={form} />

//                     {/* right sidebar */}
//                     <RightSidebar form={form} handleChange={handleChange} isEdit={isEdit} />
//                 </div>
//             </div>
//         </div>
//     );
// }


"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, DollarSign, Loader2, CheckCircle2,
    ShoppingBag, Globe, Upload, AlertTriangle,
    X, Image as ImageIcon, Zap, ChevronRight,
    Sparkles, BookOpen, Target, FileText,
    Monitor, LayoutTemplate, Users, Package,
    Lock, Search, Clock, Check, Circle, Link as LinkIcon,
    ChevronDown, Info, Video, MessageSquare, Layers,
    Star, Award, BarChart2, Lightbulb, Hash,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NextLink from "next/link";
import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
import { CloudinaryImage } from "@/components/ui/cloudinary-image";
import { cn } from "@/lib/utils";
import { StyledTextarea } from "../ui/textarea";
import { Button } from "../ui/button";

/* ── helpers ── */
function slugify(text: string) {
    return text.toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/* ── constants ── */
const STEPS = [
    { id: 1, label: "Details" },
    { id: 2, label: "Pricing" },
    { id: 3, label: "Settings" },
    { id: 4, label: "Publish" },
];

const BILLING_PERIODS = [
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "quarterly", label: "Quarterly" },
    { id: "yearly", label: "Yearly" },
];

const BUTTON_TEXTS = ["Buy Now", "Get Access", "Order Now", "Purchase", "Download", "Subscribe", "Join now"];

/* ── Product subtypes ──
   `id` now matches the actual product_type enum value in the database
   (note: 'template' singular, matching the schema).
   These are NOT a separate concept anymore — they're the granular
   product_type that gets saved directly when the user picks "Digital".
*/
const PRODUCT_SUBTYPES = [
    {
        id: "course",
        label: "Course",
        Icon: BookOpen,
        hint: "Video lessons & modules",
        tips: [
            "Add a curriculum outline in your description",
            "Mention total hours of content",
            "List certificates or credentials included",
        ],
        recommendedFields: ["Show author bio", "Show reviews", "Discussions"],
        suggestedButtonText: "Enroll Now",
        previewBadge: "Online Course",
    },
    {
        id: "coaching",
        label: "Coaching",
        Icon: Target,
        hint: "1-on-1 or group sessions",
        tips: [
            "Specify number of sessions included",
            "Mention session duration (e.g. 60 min)",
            "Highlight your credentials or track record",
        ],
        recommendedFields: ["Show author bio"],
        suggestedButtonText: "Book a Session",
        previewBadge: "Coaching Program",
    },
    {
        id: "ebook",
        label: "E-book",
        Icon: FileText,
        hint: "PDF or digital book",
        tips: [
            "State page count and format (PDF, ePub)",
            "Add a table of contents excerpt",
            "Mention if physical copy is available",
        ],
        recommendedFields: ["Show reviews"],
        suggestedButtonText: "Download Now",
        previewBadge: "E-book",
    },
    {
        id: "software",
        label: "Software",
        Icon: Monitor,
        hint: "App, tool or SaaS",
        tips: [
            "List compatible platforms (Mac, Windows, Web)",
            "Mention license type (lifetime vs. subscription)",
            "Include a short demo or screenshots",
        ],
        recommendedFields: ["Discussions"],
        suggestedButtonText: "Get Access",
        previewBadge: "Software",
    },
    {
        id: "template",                       // ✅ singular, matches enum
        label: "Templates",
        Icon: LayoutTemplate,
        hint: "Ready-to-use files",
        tips: [
            "List all file formats included (Figma, Notion, Excel…)",
            "Show a preview screenshot in your media",
            "Specify what tools are required to use them",
        ],
        recommendedFields: ["Show reviews"],
        suggestedButtonText: "Get Templates",
        previewBadge: "Template Pack",
    },
    {
        id: "community",
        label: "Community",
        Icon: Users,
        hint: "Membership & access",
        tips: [
            "Describe what members get access to",
            "Mention the platform (Discord, Slack, Circle…)",
            "Highlight community size and activity",
        ],
        recommendedFields: ["Show author bio", "Discussions"],
        suggestedButtonText: "Join Community",
        previewBadge: "Community",
    },
    {
        id: "bundle",
        label: "Bundle",
        Icon: Package,
        hint: "Multiple products together",
        tips: [
            "List every item included in the bundle",
            "Show the individual vs. bundle value",
            "Add a comparison table in your description",
        ],
        recommendedFields: ["Show reviews", "Show author bio"],
        suggestedButtonText: "Get the Bundle",
        previewBadge: "Bundle",
    },
];

// Valid product_type enum values that count as "digital" for UI purposes.
const DIGITAL_ENUM_VALUES = new Set([
    "digital", "course", "software", "template", "ebook",
    "coaching", "community", "bundle", "subscription",
]);

/* ── form state ── */
// `product_type` here is the UI bucket (physical/digital).
// `product_subtype` is the granular pick within "digital".
// On save, we collapse them into a single `product_type` enum value.
interface FormState {
    name: string;
    slug: string;
    short_description: string;
    description: string;
    product_type: "physical" | "digital";
    product_subtype: string;
    price: string;
    currency: string;
    category_id: string;
    is_digital: boolean;
    pricing_type: "one_time" | "recurring";
    billing_period: string;
    digital_file_url: string;
    track_inventory: boolean;
    inventory_quantity: string;
    affiliate_enabled: boolean;
    affiliate_commission_rate: string;
    is_featured: boolean;
    button_text: string;
    tags: string;
    weight: string;
    dimensions: string;
    images: string[];
    show_author: boolean;
    show_reviews: boolean;
    enable_discussions: boolean;
    status: "active" | "draft" | "paused" | "archived";
}

/* ── reusable primitives ── */
function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return (
        <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{children}</span>
            {hint && <span className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>{hint}</span>}
        </div>
    );
}

function Input({ className, style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn(
                "w-full h-10 px-3 text-sm transition-all outline-none",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
                className,
            )}
            style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
                ...style,
            }}
            onFocus={e => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "var(--shadow-glow)";
            }}
            onBlur={e => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "none";
            }}
            {...props}
        />
    );
}

function Select({ className, children, style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="relative">
            <select
                className={cn("w-full h-10 pl-3 pr-8 text-sm appearance-none transition-all outline-none", className)}
                style={{
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                    ...style,
                }}
                {...props}
            >
                {children}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
        </div>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 outline-none"
            style={{ background: checked ? "var(--color-accent)" : "var(--color-border-strong)" }}
        >
            <span
                className="inline-block h-3.5 w-3.5 mt-[3px] rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{ transform: checked ? "translateX(18px)" : "translateX(3px)" }}
            />
        </button>
    );
}

function ToggleRow({ title, description, checked, onChange }: {
    title: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--color-border)" }}>
            <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{title}</p>
                {description && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{description}</p>}
            </div>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn("overflow-hidden", className)}
            style={{
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                boxShadow: "var(--shadow-sm)",
            }}
        >
            {children}
        </div>
    );
}

function CardHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
            {children}
        </div>
    );
}

function Divider() {
    return <div className="my-6" style={{ borderTop: "1px solid var(--color-border)" }} />;
}

function SectionTitle({ label }: { label: string }) {
    return <h3 className="text-sm font-semibold mb-5" style={{ color: "var(--color-text-primary)" }}>{label}</h3>;
}

function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [inp, setInp] = useState("");
    const tags = value ? value.split(",").map(t => t.trim()).filter(Boolean) : [];
    const add = (t: string) => {
        const tr = t.trim();
        if (!tr || tags.includes(tr)) return;
        onChange([...tags, tr].join(", "));
        setInp("");
    };
    const rm = (i: number) => onChange(tags.filter((_, idx) => idx !== i).join(", "));
    return (
        <div
            className="flex flex-wrap gap-1.5 min-h-[40px] p-2 transition-all"
            style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
            }}
        >
            {tags.map((t, i) => (
                <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                    style={{
                        borderRadius: "var(--radius-full)",
                        background: "var(--color-accent-light)",
                        border: "1px solid var(--color-accent-subtle)",
                        color: "var(--color-accent)",
                    }}
                >
                    {t}
                    <button onClick={() => rm(i)} style={{ color: "var(--color-accent)", opacity: 0.6 }}><X size={9} /></button>
                </span>
            ))}
            <input
                className="flex-1 min-w-[80px] text-xs bg-transparent outline-none h-6"
                style={{ color: "var(--color-text-primary)" }}
                placeholder={tags.length === 0 ? "Add a tag…" : ""}
                value={inp}
                onChange={e => setInp(e.target.value)}
                onKeyDown={e => {
                    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(inp); }
                    if (e.key === "Backspace" && !inp && tags.length) rm(tags.length - 1);
                }}
                onBlur={() => { if (inp) add(inp); }}
            />
        </div>
    );
}

/* ── live preview ── */
// function LivePreview({ form }: { form: FormState }) {
//     const price = parseFloat(form.price) || 0;
//     const isFree = price === 0;
//     const tags = form.tags ? form.tags.split(",").slice(0, 4).map(t => t.trim()).filter(Boolean) : [];
//     const subtype = PRODUCT_SUBTYPES.find(s => s.id === form.product_subtype);

//     return (
//         <Card className="sticky top-[72px] bg-[--color-surface] overflow-hidden">
//             <CardHeader>
//                 <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Preview</span>
//                 <span
//                     className="text-[10px] font-medium px-2 py-0.5"
//                     style={{
//                         borderRadius: "var(--radius-full)",
//                         background: "var(--color-surface-secondary)",
//                         border: "1px solid var(--color-border)",
//                         color: "var(--color-text-muted)",
//                     }}
//                 >
//                     Buyer view
//                 </span>
//             </CardHeader>
//             <div className="p-4">
//                 {/* cover */}
//                 <div
//                     className="w-full aspect-video flex items-center justify-center mb-3 relative overflow-hidden"
//                     style={{
//                         borderRadius: "var(--radius-md)",
//                         border: "1px solid var(--color-border)",
//                         background: "var(--color-surface-secondary)",
//                     }}
//                 >
//                     {form.images[0] ? (
//                         <CloudinaryImage src={form.images[0]} alt="cover" fill className="object-cover" />
//                     ) : (
//                         <div className="flex flex-col items-center gap-1" style={{ color: "var(--color-border-strong)" }}>
//                             <ImageIcon size={24} />
//                             <span className="text-[10px]">Cover image</span>
//                         </div>
//                     )}
//                     {subtype && (
//                         <div
//                             className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
//                             style={{
//                                 borderRadius: "var(--radius-full)",
//                                 background: "var(--color-accent)",
//                                 color: "#fff",
//                             }}
//                         >
//                             {subtype.previewBadge}
//                         </div>
//                     )}
//                     {form.status === "draft" && (
//                         <div
//                             className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
//                             style={{
//                                 borderRadius: "var(--radius-full)",
//                                 background: "var(--color-warning-light, #fef3c7)",
//                                 border: "1px solid var(--color-warning, #f59e0b)",
//                                 color: "var(--color-warning, #b45309)",
//                             }}
//                         >
//                             Draft
//                         </div>
//                     )}
//                 </div>

//                 <div className="flex items-center gap-1.5 mb-2">
//                     <div className="flex">
//                         {["#fecaca", "#fed7aa", "#e9d5ff"].map((c, i) => (
//                             <div key={i} className="w-4 h-4 rounded-full border-2 -mr-1" style={{ background: c, borderColor: "var(--color-surface)" }} />
//                         ))}
//                     </div>
//                     <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>2.8k+ students</span>
//                     <span className="text-[11px] ml-auto" style={{ color: "var(--color-text-muted)" }}>★ 4.9</span>
//                 </div>

//                 <p
//                     className="text-sm font-bold leading-snug mb-1"
//                     style={{ color: form.name ? "var(--color-text-primary)" : "var(--color-border-strong)", fontStyle: form.name ? "normal" : "italic", fontWeight: form.name ? 700 : 400 }}
//                 >
//                     {form.name || "Your product name"}
//                 </p>

//                 {form.short_description && (
//                     <p className="text-[11px] mb-2 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{form.short_description}</p>
//                 )}

//                 <p className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
//                     {isFree ? "Free" : `$${price.toFixed(2)}`}
//                     {!isFree && form.pricing_type === "recurring" && form.product_type === "digital" && (
//                         <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}> / {form.billing_period}</span>
//                     )}
//                 </p>

//                 <button
//                     className="w-full py-2 text-xs font-semibold text-white cursor-default"
//                     style={{ borderRadius: "var(--radius-sm)", background: "var(--color-accent)" }}
//                 >
//                     {form.button_text || subtype?.suggestedButtonText || "Buy Now"}
//                 </button>

//                 {tags.length > 0 && (
//                     <div className="flex flex-wrap gap-1 mt-3">
//                         {tags.map((t, i) => (
//                             <span
//                                 key={i}
//                                 className="text-[10px] px-2 py-0.5"
//                                 style={{
//                                     borderRadius: "var(--radius-full)",
//                                     background: "var(--color-accent-light)",
//                                     border: "1px solid var(--color-accent-subtle)",
//                                     color: "var(--color-accent)",
//                                 }}
//                             >
//                                 {t}
//                             </span>
//                         ))}
//                     </div>
//                 )}

//                 {form.name && (
//                     <>
//                         <div className="my-3" style={{ borderTop: "1px solid var(--color-border)" }} />
//                         <div className="flex justify-between text-xs">
//                             <span style={{ color: "var(--color-text-muted)" }}>Type</span>
//                             <span className="font-medium capitalize" style={{ color: "var(--color-text-secondary)" }}>
//                                 {subtype?.label || form.product_type}
//                             </span>
//                         </div>
//                     </>
//                 )}
//             </div>
//         </Card>
//     );
// }
function LivePreview({ form }: { form: FormState }) {
    const price = parseFloat(form.price) || 0;
    const isFree = price === 0;
    const tags = form.tags ? form.tags.split(",").slice(0, 4).map(t => t.trim()).filter(Boolean) : [];
    const subtype = PRODUCT_SUBTYPES.find(s => s.id === form.product_subtype);

    // Centralized fallback tokens — every var() in this component falls back here
    const t = {
        surface: "var(--color-surface, #ffffff)",
        surfaceSecondary: "var(--color-surface-secondary, #f5f5f5)",
        border: "var(--color-border, #e5e5e5)",
        borderStrong: "var(--color-border-strong, #d4d4d4)",
        textPrimary: "var(--color-text-primary, #0a0a0a)",
        textSecondary: "var(--color-text-secondary, #525252)",
        textMuted: "var(--color-text-muted, #737373)",
        accent: "var(--color-accent, #fd5000)",
        accentLight: "var(--color-accent-light, rgba(253,80,0,0.08))",
        accentSubtle: "var(--color-accent-subtle, rgba(253,80,0,0.2))",
        radiusSm: "var(--radius-sm, 6px)",
        radiusMd: "var(--radius-md, 10px)",
        radiusLg: "var(--radius-lg, 14px)",
        radiusFull: "var(--radius-full, 999px)",
        shadowSm: "var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))",
    };

    return (
        <div
            className="sticky top-[72px] overflow-hidden"
            style={{
                borderRadius: t.radiusLg,
                border: `1px solid ${t.border}`,
                background: t.surface,
                boxShadow: t.shadowSm,
            }}
        >
            {/* header */}
            <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: `1px solid ${t.border}` }}
            >
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Preview
                </span>
                <span
                    className="text-[10px] font-medium px-2 py-0.5"
                    style={{
                        borderRadius: t.radiusFull,
                        background: t.surfaceSecondary,
                        border: `1px solid ${t.border}`,
                        color: t.textMuted,
                    }}
                >
                    Buyer view
                </span>
            </div>

            <div className="p-4">
                {/* cover */}
                <div
                    className="w-full aspect-video flex items-center justify-center mb-3 relative overflow-hidden"
                    style={{
                        borderRadius: t.radiusMd,
                        border: `1px solid ${t.border}`,
                        background: t.surfaceSecondary,
                    }}
                >
                    {form.images[0] ? (
                        <CloudinaryImage src={form.images[0]} alt="cover" fill className="object-cover" />
                    ) : (
                        <div className="flex flex-col items-center gap-1" style={{ color: t.borderStrong }}>
                            <ImageIcon size={24} />
                            <span className="text-[10px]">Cover image</span>
                        </div>
                    )}
                    {subtype && (
                        <div
                            className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                            style={{
                                borderRadius: t.radiusFull,
                                background: t.accent,
                                color: "#fff",
                            }}
                        >
                            {subtype.previewBadge}
                        </div>
                    )}
                    {form.status === "draft" && (
                        <div
                            className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                            style={{
                                borderRadius: t.radiusFull,
                                background: "#fef3c7",
                                border: "1px solid #f59e0b",
                                color: "#b45309",
                            }}
                        >
                            Draft
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex">
                        {["#fecaca", "#fed7aa", "#e9d5ff"].map((c, i) => (
                            <div
                                key={i}
                                className="w-4 h-4 rounded-full border-2 -mr-1"
                                style={{ background: c, borderColor: t.surface }}
                            />
                        ))}
                    </div>
                    <span className="text-[11px]" style={{ color: t.textMuted }}>2.8k+ students</span>
                    <span className="text-[11px] ml-auto" style={{ color: t.textMuted }}>★ 4.9</span>
                </div>

                <p
                    className="text-sm leading-snug mb-1"
                    style={{
                        color: form.name ? t.textPrimary : t.borderStrong,
                        fontStyle: form.name ? "normal" : "italic",
                        fontWeight: form.name ? 700 : 400,
                    }}
                >
                    {form.name || "Your product name"}
                </p>

                {form.short_description && (
                    <p className="text-[11px] mb-2 leading-relaxed" style={{ color: t.textMuted }}>
                        {form.short_description}
                    </p>
                )}

                <p className="text-xl font-bold mb-2" style={{ color: t.textPrimary }}>
                    {isFree ? "Free" : `$${price.toFixed(2)}`}
                    {!isFree && form.pricing_type === "recurring" && form.product_type === "digital" && (
                        <span className="text-xs font-normal" style={{ color: t.textMuted }}>
                            {" "}/ {form.billing_period}
                        </span>
                    )}
                </p>

                <button
                    className="w-full py-2 text-xs font-semibold text-white cursor-default"
                    style={{ borderRadius: t.radiusSm, background: t.accent }}
                >
                    {form.button_text || subtype?.suggestedButtonText || "Buy Now"}
                </button>

                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                        {tags.map((tag, i) => (
                            <span
                                key={i}
                                className="text-[10px] px-2 py-0.5"
                                style={{
                                    borderRadius: t.radiusFull,
                                    background: t.accentLight,
                                    border: `1px solid ${t.accentSubtle}`,
                                    color: t.accent,
                                }}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {form.name && (
                    <>
                        <div className="my-3" style={{ borderTop: `1px solid ${t.border}` }} />
                        <div className="flex justify-between text-xs">
                            <span style={{ color: t.textMuted }}>Type</span>
                            <span className="font-medium capitalize" style={{ color: t.textSecondary }}>
                                {subtype?.label || form.product_type}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
/* ── Right sidebar ── */
function RightSidebar({
    form,
    handleChange,
    isEdit = false,
}: {
    form: FormState;
    handleChange: (f: string, v: unknown) => void;
    isEdit?: boolean;
}) {
    const advItems = [
        { label: "Drip content", Icon: Clock },
        { label: "Access rules", Icon: Lock },
        { label: "Localisation", Icon: Globe },
        { label: "SEO settings", Icon: Search },
    ];

    const selectedSubtype = PRODUCT_SUBTYPES.find(s => s.id === form.product_subtype);

    return (
        <div className="space-y-3 sticky top-[72px]">

            {/* status (edit only) — now includes 'paused' to match schema enum */}
            {isEdit && (
                <Card>
                    <CardHeader>
                        <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Status</p>
                    </CardHeader>
                    <div className="p-3 space-y-1.5">
                        {(["active", "draft", "paused", "archived"] as const).map(s => {
                            const sel = form.status === s;
                            const colors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
                                active: { bg: "var(--color-success-light)", border: "var(--color-success)", text: "var(--color-success)", dot: "var(--color-success)" },
                                draft: { bg: "var(--color-warning-light, #fef3c7)", border: "var(--color-warning, #f59e0b)", text: "var(--color-warning, #b45309)", dot: "var(--color-warning, #f59e0b)" },
                                paused: { bg: "var(--color-surface-secondary)", border: "var(--color-border-strong)", text: "var(--color-text-secondary)", dot: "var(--color-text-muted)" },
                                archived: { bg: "var(--color-surface-secondary)", border: "var(--color-border)", text: "var(--color-text-muted)", dot: "var(--color-border-strong)" },
                            };
                            const c = colors[s];
                            return (
                                <button
                                    key={s}
                                    onClick={() => handleChange("status", s)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all"
                                    style={{
                                        borderRadius: "var(--radius-sm)",
                                        border: `1px solid ${sel ? c.border : "var(--color-border)"}`,
                                        background: sel ? c.bg : "transparent",
                                    }}
                                >
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sel ? c.dot : "var(--color-border-strong)" }} />
                                    <span className="text-xs font-medium capitalize flex-1" style={{ color: sel ? c.text : "var(--color-text-muted)" }}>{s}</span>
                                    {sel && <Check size={11} style={{ color: c.text }} />}
                                </button>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* contextual tips — only shown for digital products with a matched subtype */}
            {form.product_type === "digital" && selectedSubtype && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-1.5">
                            <Lightbulb size={12} style={{ color: "var(--color-accent)" }} />
                            <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                                {selectedSubtype.label} tips
                            </p>
                        </div>
                        <span
                            className="text-[10px] font-medium px-2 py-0.5"
                            style={{
                                borderRadius: "var(--radius-full)",
                                background: "var(--color-accent-light)",
                                border: "1px solid var(--color-accent-subtle)",
                                color: "var(--color-accent)",
                            }}
                        >
                            {selectedSubtype.previewBadge}
                        </span>
                    </CardHeader>
                    <div className="p-3">
                        <ul className="space-y-1.5">
                            {selectedSubtype.tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-[10px] font-bold mt-0.5 flex-shrink-0" style={{ color: "var(--color-accent)" }}>·</span>
                                    <span className="text-[10px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{tip}</span>
                                </li>
                            ))}
                        </ul>
                        {selectedSubtype.recommendedFields.length > 0 && (
                            <div className="mt-2.5 pt-2.5" style={{ borderTop: "1px solid var(--color-border)" }}>
                                <span className="text-[10px] font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>Recommended toggles</span>
                                <div className="flex flex-wrap gap-1">
                                    {selectedSubtype.recommendedFields.map(f => (
                                        <span
                                            key={f}
                                            className="text-[9px] font-medium px-1.5 py-0.5"
                                            style={{
                                                borderRadius: "var(--radius-full)",
                                                background: "var(--color-accent-light)",
                                                border: "1px solid var(--color-accent-subtle)",
                                                color: "var(--color-accent)",
                                            }}
                                        >
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* sales page toggles — now real columns, not source_metadata */}
            <Card>
                <CardHeader>
                    <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Sales page</p>
                </CardHeader>
                <div className="px-4 py-1">
                    <ToggleRow title="Show author bio" checked={form.show_author} onChange={v => handleChange("show_author", v)} />
                    <ToggleRow title="Show reviews" checked={form.show_reviews} onChange={v => handleChange("show_reviews", v)} />
                    <ToggleRow title="Discussions" checked={form.enable_discussions} onChange={v => handleChange("enable_discussions", v)} />
                </div>
            </Card>

            {/* advanced */}
            <Card>
                <CardHeader>
                    <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Advanced</p>
                </CardHeader>
                {advItems.map(item => (
                    <button
                        key={item.label}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors border-b last:border-b-0"
                        style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-border)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-secondary)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                        <item.Icon size={13} style={{ color: "var(--color-text-muted)" }} />
                        <span>{item.label}</span>
                        <ChevronRight size={14} className="ml-auto" style={{ color: "var(--color-border-strong)" }} />
                    </button>
                ))}
            </Card>
        </div>
    );
}

/* ── STEP 1: Details ── */
function StepDetails({
    form, handleChange, categories, handleImageUpload, removeImage,
}: {
    form: FormState;
    handleChange: (f: string, v: unknown) => void;
    categories: any[];
    handleImageUpload: (url: string) => void;
    removeImage: (i: number) => void;
}) {
    const filteredCategories = categories.filter(c => {
        const ct = c.category_type;
        if (form.product_type === "digital") return ct === "digital";
        return ct === "physical" || ct === "both" || !ct;
    });

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-start justify-between mb-5">
                    <SectionTitle label="Basic information" />
                    <button
                        className="flex items-center gap-1.5 px-3 h-7 text-xs transition-all"
                        style={{
                            borderRadius: "var(--radius-full)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text-muted)",
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "var(--color-accent)";
                            e.currentTarget.style.color = "var(--color-accent)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "var(--color-border)";
                            e.currentTarget.style.color = "var(--color-text-muted)";
                        }}
                    >
                        <Sparkles size={11} /> AI assist
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label hint={`${form.name.length}/80`}>Product name <span style={{ color: "var(--color-accent)" }}>*</span></Label>
                        <Input value={form.name} maxLength={80} onChange={e => handleChange("name", e.target.value)} placeholder="e.g. How to Build a Viral App: 0 to $100k/mo" />
                    </div>
                    <div>
                        <Label hint="Auto-generated from name">URL slug</Label>
                        <div className="flex">
                            <span
                                className="flex items-center px-3 h-10 text-[11px] font-mono whitespace-nowrap flex-shrink-0"
                                style={{
                                    borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
                                    border: "1px solid var(--color-border)",
                                    borderRight: "none",
                                    background: "var(--color-surface-secondary)",
                                    color: "var(--color-text-muted)",
                                }}
                            >
                                /product/
                            </span>
                            <Input
                                value={form.slug}
                                onChange={e => handleChange("slug", e.target.value)}
                                className="font-mono text-xs"
                                style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}
                                placeholder="my-product-name"
                            />
                        </div>
                    </div>
                    <div>
                        <Label hint={`${form.short_description.length}/80`}>Headline <span style={{ color: "var(--color-accent)" }}>*</span></Label>
                        <Input value={form.short_description} maxLength={80} onChange={e => handleChange("short_description", e.target.value)} placeholder="Step-by-step blueprint to build, launch & monetize" />
                    </div>
                    <div>
                        <Label hint={`${(form.description || "").length}/500`}>Full description</Label>
                        <StyledTextarea value={form.description || ""} maxLength={500} rows={5} onChange={e => handleChange("description", e.target.value)} placeholder="Describe your product in detail — features, what's included…" />
                    </div>

                    <div>
                        <Label>Tags</Label>
                        <TagInput value={form.tags} onChange={v => handleChange("tags", v)} />
                        <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>Press Enter or comma to add</p>
                    </div>
                </div>
            </div>

            <Divider />

            <div className="space-y-4">
                <SectionTitle label="Product type" />
                <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                        { id: "physical", label: "Physical", Icon: ShoppingBag, hint: "Ships to customer" },
                        { id: "digital", label: "Digital", Icon: Globe, hint: "Instant download / access" },
                    ].map(type => {
                        const sel = form.product_type === type.id;
                        return (
                            <button
                                key={type.id}
                                onClick={() => handleChange("product_type", type.id)}
                                className="flex items-center gap-3 p-3.5 text-left transition-all"
                                style={{
                                    borderRadius: "var(--radius-md)",
                                    border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border)"}`,
                                    background: sel ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
                                }}
                            >
                                <div
                                    className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                                    style={{
                                        borderRadius: "var(--radius-sm)",
                                        background: sel ? "var(--color-accent)" : "var(--color-surface)",
                                        color: sel ? "#fff" : "var(--color-text-muted)",
                                    }}
                                >
                                    <type.Icon size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: sel ? "var(--color-accent)" : "var(--color-text-primary)" }}>{type.label}</p>
                                    <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{type.hint}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div>
                    <Label>Category <span style={{ color: "var(--color-accent)" }}>*</span></Label>
                    <Select value={form.category_id} onChange={e => handleChange("category_id", e.target.value)}>
                        <option value="">Select a category…</option>
                        {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        <option value="">Uncategorized</option>
                    </Select>
                </div>
            </div>

            <Divider />

            <div>
                <SectionTitle label="Media" />
                <div
                    className="p-8 text-center transition-colors cursor-pointer"
                    style={{
                        borderRadius: "var(--radius-md)",
                        border: "2px dashed var(--color-border)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-border-strong)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                >
                    <CloudinaryDropzone
                        folder="jimvio/products"
                        onUploadSuccess={handleImageUpload}
                        label={
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className="w-10 h-10 flex items-center justify-center"
                                    style={{ borderRadius: "var(--radius-sm)", background: "var(--color-surface-secondary)" }}
                                >
                                    <ImageIcon size={16} style={{ color: "var(--color-text-muted)" }} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Drop images here or click to upload</p>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>JPG, PNG, WEBP — max 10MB</p>
                                </div>
                            </div>
                        }
                    />
                </div>
                {form.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-3 mt-4">
                        {form.images.map((url, i) => (
                            <div
                                key={url}
                                className="relative aspect-square overflow-hidden group"
                                style={{
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface-secondary)",
                                }}
                            >
                                <CloudinaryImage src={url} alt={`Image ${i + 1}`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                                {i === 0 && (
                                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-[9px] font-semibold text-white uppercase" style={{ borderRadius: "4px" }}>Main</div>
                                )}
                                <button
                                    onClick={() => removeImage(i)}
                                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80"
                                    style={{ borderRadius: "var(--radius-sm)" }}
                                >
                                    <X size={11} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── STEP 2: Pricing ── */
function StepPricing({ form, handleChange }: { form: FormState; handleChange: (f: string, v: unknown) => void }) {
    const isFree = parseFloat(form.price) === 0;
    return (
        <div className="space-y-6">
            <div>
                <SectionTitle label="Pricing model" />
                <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                        { id: "free", label: "Free", hint: "No charge to access" },
                        { id: "paid", label: "Paid", hint: "Charge customers" },
                    ].map(opt => {
                        const sel = opt.id === "free" ? isFree : !isFree;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => handleChange("price", opt.id === "free" ? "0" : "9.99")}
                                className="flex flex-col gap-1 p-4 text-left transition-all"
                                style={{
                                    borderRadius: "var(--radius-md)",
                                    border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border)"}`,
                                    background: sel ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold" style={{ color: sel ? "var(--color-accent)" : "var(--color-text-primary)" }}>{opt.label}</span>
                                    {sel && <Check size={14} style={{ color: "var(--color-accent)" }} />}
                                </div>
                                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{opt.hint}</span>
                            </button>
                        );
                    })}
                </div>

                {!isFree && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label>Currency</Label>
                                <Select value={form.currency} onChange={e => handleChange("currency", e.target.value)}>
                                    <option value="USD">USD – $</option>
                                    <option value="EUR">EUR – €</option>
                                    <option value="GBP">GBP – £</option>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label>Price</Label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
                                    <Input type="number" value={form.price} onChange={e => handleChange("price", e.target.value)} className="pl-8 font-semibold text-base" min={0} step="0.01" />
                                </div>
                            </div>
                        </div>

                        {/* Recurring billing only shown for digital products */}
                        {form.product_type === "digital" && (
                            <div className="space-y-3">
                                <Label>Billing type</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "one_time", label: "One-time payment" },
                                        { id: "recurring", label: "Recurring subscription" },
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleChange("pricing_type", opt.id)}
                                            className="h-10 text-xs font-medium transition-all"
                                            style={{
                                                borderRadius: "var(--radius-sm)",
                                                border: `1px solid ${form.pricing_type === opt.id ? "var(--color-accent)" : "var(--color-border)"}`,
                                                background: form.pricing_type === opt.id ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
                                                color: form.pricing_type === opt.id ? "var(--color-accent)" : "var(--color-text-secondary)",
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {form.pricing_type === "recurring" && (
                                    <div>
                                        <Label>Billing period</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {BILLING_PERIODS.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleChange("billing_period", p.id)}
                                                    className="px-4 h-8 text-[11px] font-semibold uppercase tracking-wide transition-all"
                                                    style={{
                                                        borderRadius: "var(--radius-full)",
                                                        border: "1px solid",
                                                        borderColor: form.billing_period === p.id ? "var(--color-accent)" : "var(--color-border)",
                                                        background: form.billing_period === p.id ? "var(--color-accent)" : "transparent",
                                                        color: form.billing_period === p.id ? "#fff" : "var(--color-text-muted)",
                                                    }}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Physical product: show one-time only note */}
                        {form.product_type === "physical" && (
                            <div
                                className="flex items-center gap-2 px-3 py-2.5 text-xs"
                                style={{
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface-secondary)",
                                    color: "var(--color-text-muted)",
                                }}
                            >
                                <ShoppingBag size={13} />
                                Physical products are always charged as a one-time payment.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Divider />

            <div>
                <div className="flex items-start justify-between mb-1">
                    <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Affiliate program</p>
                        <p className="text-xs mt-0.5 mb-4" style={{ color: "var(--color-text-muted)" }}>Let others earn by promoting your product</p>
                    </div>
                    <Toggle checked={form.affiliate_enabled} onChange={v => handleChange("affiliate_enabled", v)} />
                </div>
                {form.affiliate_enabled && (
                    <div className="space-y-3 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                        <div>
                            <Label hint="% of sale price">Commission rate</Label>
                            <div className="relative">
                                <Input type="number" value={form.affiliate_commission_rate} onChange={e => handleChange("affiliate_commission_rate", e.target.value)} className="pr-8 font-mono" min="1" max="100" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: "var(--color-text-muted)" }}>%</span>
                            </div>
                        </div>
                        <div
                            className="p-3.5 text-xs leading-relaxed"
                            style={{
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-accent-subtle)",
                                background: "var(--color-accent-light)",
                                color: "var(--color-accent)",
                            }}
                        >
                            Affiliates earn <strong>{form.affiliate_commission_rate || 10}%</strong> per sale — approx. <strong>${((parseFloat(form.price) || 0) * (parseFloat(form.affiliate_commission_rate) || 10) / 100).toFixed(2)}</strong> per conversion
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── STEP 3: Settings ── */
function StepSettings({ form, handleChange }: { form: FormState; handleChange: (f: string, v: unknown) => void }) {
    return (
        <div className="space-y-6">
            <div>
                <SectionTitle label="Call-to-action button" />
                <div className="space-y-3">
                    <div>
                        <Label>Button label</Label>
                        <Input value={form.button_text} onChange={e => handleChange("button_text", e.target.value)} placeholder="e.g. Buy Now" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {BUTTON_TEXTS.map(txt => {
                            const sel = form.button_text === txt;
                            return (
                                <button
                                    key={txt}
                                    onClick={() => handleChange("button_text", txt)}
                                    className="px-3 py-1 text-[11px] font-medium transition-all"
                                    style={{
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid",
                                        borderColor: sel ? "var(--color-accent)" : "var(--color-border)",
                                        background: sel ? "var(--color-accent-light)" : "transparent",
                                        color: sel ? "var(--color-accent)" : "var(--color-text-muted)",
                                    }}
                                >
                                    {txt}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <Divider />
            <div>
                <SectionTitle label="Fulfilment" />
                {form.product_type === "physical" && (
                    <div className="space-y-4">
                        <div
                            className="flex items-center justify-between p-3.5"
                            style={{
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface-secondary)",
                            }}
                        >
                            <div>
                                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Track inventory</p>
                                <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Auto-reduce stock on purchase</p>
                            </div>
                            <Toggle checked={form.track_inventory} onChange={v => handleChange("track_inventory", v)} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label>Stock quantity</Label>
                                <Input type="number" value={form.inventory_quantity} onChange={e => handleChange("inventory_quantity", e.target.value)} disabled={!form.track_inventory} placeholder="0" />
                            </div>
                            <div>
                                <Label hint="kg">Weight</Label>
                                <Input type="number" step="0.01" value={form.weight} onChange={e => handleChange("weight", e.target.value)} placeholder="0.00" />
                            </div>
                            <div>
                                <Label hint="L×W×H">Dimensions</Label>
                                <Input value={form.dimensions} onChange={e => handleChange("dimensions", e.target.value)} placeholder="10×10×5 cm" />
                            </div>
                        </div>
                    </div>
                )}

                {form.product_type === "digital" && (
                    <div className="space-y-3">
                        <div
                            className="p-4"
                            style={{
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface-secondary)",
                            }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Upload size={14} style={{ color: "var(--color-text-muted)" }} />
                                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Digital file</p>
                            </div>
                            {form.digital_file_url ? (
                                <div
                                    className="flex items-center gap-2 p-2.5"
                                    style={{
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--color-success)",
                                        background: "var(--color-success-light)",
                                    }}
                                >
                                    <CheckCircle2 size={14} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                                    <p className="text-xs font-mono flex-1 truncate" style={{ color: "var(--color-text-secondary)" }}>{form.digital_file_url}</p>
                                    <button onClick={() => handleChange("digital_file_url", "")} style={{ color: "var(--color-danger)" }}>
                                        <X size={13} />
                                    </button>
                                </div>
                            ) : (
                                <CloudinaryUploadButton
                                    folder="jimvio/digital-files"
                                    resourceType="raw"
                                    onUploadSuccess={url => handleChange("digital_file_url", url)}
                                    className="px-4 h-8 text-xs font-medium transition-all"
                                />
                            )}
                        </div>
                        <div>
                            <Label hint="Or paste a direct URL">Manual file URL</Label>
                            <div className="relative">
                                <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
                                <Input placeholder="https://your-cdn.com/file.zip" value={form.digital_file_url} onChange={e => handleChange("digital_file_url", e.target.value)} className="pl-8 font-mono text-xs" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Divider />

            <div>
                <SectionTitle label="Visibility" />
                <div
                    className="flex items-center justify-between p-4"
                    style={{
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface-secondary)",
                    }}
                >
                    <div>
                        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Feature in store showcase</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Pin this product to the top of your store</p>
                    </div>
                    <Toggle checked={form.is_featured} onChange={v => handleChange("is_featured", v)} />
                </div>
            </div>
        </div>
    );
}

/* ── STEP 4: Publish / Save ── */
// function StepPublish({
//     form, isPending, handleSubmit, isEdit,
// }: {
//     form: FormState; isPending: boolean; handleSubmit: () => void; isEdit: boolean;
// }) {
//     const price = parseFloat(form.price) || 0;
//     const isDigital = form.product_type === "digital";
//     const checks = [
//         { label: "Product name added", done: !!form.name.trim() },
//         { label: "Headline written", done: !!form.short_description.trim() },
//         { label: "Category selected", done: !!form.category_id },
//         { label: "Pricing configured", done: true },
//         { label: "Fulfilment set up", done: !isDigital || !!form.digital_file_url },
//     ];
//     const allDone = checks.every(c => c.done);
//     return (
//         <div className="space-y-6">
//             <div>
//                 <SectionTitle label={isEdit ? "Save checklist" : "Pre-launch checklist"} />
//                 <div className="space-y-2">
//                     {checks.map(item => (
//                         <div
//                             key={item.label}
//                             className="flex items-center gap-3 px-4 py-3 text-sm"
//                             style={{
//                                 borderRadius: "var(--radius-md)",
//                                 border: `1px solid ${item.done ? "var(--color-success)" : "var(--color-border)"}`,
//                                 background: item.done ? "var(--color-success-light)" : "var(--color-surface-secondary)",
//                                 color: item.done ? "var(--color-success)" : "var(--color-text-muted)",
//                             }}
//                         >
//                             {item.done ? <Check size={15} /> : <Circle size={15} />}
//                             <span className="flex-1">{item.label}</span>
//                             {!item.done && (
//                                 <span
//                                     className="text-[10px] font-semibold px-2 py-0.5"
//                                     style={{
//                                         borderRadius: "var(--radius-full)",
//                                         background: "var(--color-accent-light)",
//                                         border: "1px solid var(--color-accent-subtle)",
//                                         color: "var(--color-accent)",
//                                     }}
//                                 >
//                                     Required
//                                 </span>
//                             )}
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             <Divider />

//             <div>
//                 <SectionTitle label="Summary" />
//                 <div className="overflow-hidden" style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
//                     {[
//                         { k: "Name", v: form.name || "—" },
//                         { k: "Status", v: isEdit ? form.status : "Active on publish" },
//                         { k: "Type", v: form.product_type },
//                         { k: "Price", v: price === 0 ? "Free" : `$${price.toFixed(2)} ${form.currency}` },
//                         {
//                             k: "Billing",
//                             v: price === 0 ? "—"
//                                 : !isDigital ? "One-time (physical)"
//                                     : form.pricing_type === "recurring" ? `Recurring · ${form.billing_period}`
//                                         : "One-time",
//                         },
//                         { k: "Fulfilment", v: isDigital ? "Digital delivery" : "Physical shipping" },
//                     ].map(row => (
//                         <div key={row.k} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--color-border)" }}>
//                             <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.k}</span>
//                             <span className="text-xs font-semibold capitalize" style={{ color: "var(--color-text-primary)" }}>{row.v}</span>
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             <button
//                 onClick={handleSubmit}
//                 disabled={isPending || !allDone}
//                 className="w-full h-12 text-sm font-semibold flex items-center justify-center gap-2 text-white transition-all active:scale-[0.98]"
//                 style={{
//                     borderRadius: "var(--radius-lg)",
//                     background: isPending || !allDone ? "var(--color-border-strong)" : "var(--color-accent)",
//                     cursor: isPending || !allDone ? "not-allowed" : "pointer",
//                     boxShadow: !isPending && allDone ? "var(--shadow-glow)" : "none",
//                 }}
//             >
//                 {isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
//                 {isPending
//                     ? (isEdit ? "Saving…" : "Publishing…")
//                     : allDone
//                         ? (isEdit ? "Save changes" : "Publish product")
//                         : "Complete checklist to continue"}
//             </button>
//             <p className="text-[11px] text-center" style={{ color: "var(--color-text-muted)" }}>
//                 {allDone
//                     ? (isEdit ? "Changes will go live immediately" : "Your product will go live immediately after publishing")
//                     : "Complete all required fields above"}
//             </p>
//         </div>
//     );
// }

/* ── STEP 4: Publish / Save ── */
function StepPublish({
    form, isPending, handleSubmit, isEdit,
}: {
    form: FormState; isPending: boolean; handleSubmit: () => void; isEdit: boolean;
}) {
    const price = parseFloat(form.price) || 0;
    const isDigital = form.product_type === "digital";

    const checks = [
        { label: "Product name", hint: "What buyers will see first", done: !!form.name.trim() },
        { label: "Headline", hint: "One-line value proposition", done: !!form.short_description.trim() },
        { label: "Category", hint: "Helps buyers discover you", done: !!form.category_id },
        { label: "Pricing", hint: price === 0 ? "Free to access" : `$${price.toFixed(2)} ${form.currency}`, done: true },
        {
            label: "Fulfilment",
            hint: isDigital ? (form.digital_file_url ? "Digital file attached" : "Upload a file to deliver") : "Physical shipping",
            done: !isDigital || !!form.digital_file_url,
        },
    ];

    const completed = checks.filter(c => c.done).length;
    const total = checks.length;
    const allDone = completed === total;
    const progressPct = (completed / total) * 100;

    // Defensive token fallbacks
    const t = {
        surface: "var(--color-surface, #ffffff)",
        surfaceSecondary: "var(--color-surface-secondary, #f5f5f5)",
        border: "var(--color-border, #e5e5e5)",
        borderStrong: "var(--color-border-strong, #d4d4d4)",
        textPrimary: "var(--color-text-primary, #0a0a0a)",
        textSecondary: "var(--color-text-secondary, #525252)",
        textMuted: "var(--color-text-muted, #737373)",
        accent: "var(--color-accent, #fd5000)",
        accentLight: "var(--color-accent-light, rgba(253,80,0,0.08))",
        success: "var(--color-success, #10b981)",
        successLight: "var(--color-success-light, rgba(16,185,129,0.08))",
        radiusSm: "var(--radius-sm, 6px)",
        radiusMd: "var(--radius-md, 10px)",
        radiusLg: "var(--radius-lg, 14px)",
        radiusFull: "var(--radius-full, 999px)",
        shadowGlow: "var(--shadow-glow, 0 0 0 3px rgba(253,80,0,0.15))",
    };

    return (
        <div className="space-y-6">
            {/* CHECKLIST */}
            <div>
                {/* Header with progress */}
                <div className="flex items-end justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>
                            {isEdit ? "Save checklist" : "Pre-launch checklist"}
                        </h3>
                        <p className="text-xs" style={{ color: t.textMuted }}>
                            {allDone
                                ? "All set — you're ready to publish"
                                : `${completed} of ${total} complete`}
                        </p>
                    </div>
                    <div
                        className="text-[11px] font-mono font-bold tabular-nums"
                        style={{ color: allDone ? t.success : t.textMuted }}
                    >
                        {Math.round(progressPct)}%
                    </div>
                </div>

                {/* Progress bar */}
                <div
                    className="h-1 overflow-hidden mb-5"
                    style={{
                        borderRadius: t.radiusFull,
                        background: t.surfaceSecondary,
                    }}
                >
                    <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                            width: `${progressPct}%`,
                            background: allDone ? t.success : t.accent,
                            borderRadius: t.radiusFull,
                        }}
                    />
                </div>

                {/* Items */}
                {/* Items */}
                <div className="space-y-1.5">
                    {checks.map((item, i) => (
                        <div
                            key={item.label}
                            className="flex items-center gap-3 px-3.5 py-2.5 transition-all"
                            style={{
                                borderRadius: t.radiusMd,
                                border: `1px solid ${item.done ? t.accent : t.border}`,
                                background: item.done ? t.accentLight : "transparent",
                            }}
                        >
                            {/* Numbered/check circle */}
                            <div
                                className="w-6 h-6 flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                    borderRadius: t.radiusFull,
                                    background: item.done ? t.accent : "transparent",
                                    border: `1.5px solid ${item.done ? t.accent : t.borderStrong}`,
                                    color: item.done ? "#fff" : t.textMuted,
                                }}
                            >
                                {item.done ? (
                                    <Check size={12} strokeWidth={3} />
                                ) : (
                                    <span className="text-[10px] font-bold">{i + 1}</span>
                                )}
                            </div>

                            {/* Label + hint */}
                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-[13px] font-medium leading-tight"
                                    style={{ color: item.done ? t.textPrimary : t.textSecondary }}
                                >
                                    {item.label}
                                </p>
                                <p
                                    className="text-[10.5px] mt-0.5 truncate"
                                    style={{ color: t.textMuted }}
                                >
                                    {item.hint}
                                </p>
                            </div>

                            {/* Status */}
                            {item.done ? (
                                <span
                                    className="text-[10px] font-semibold uppercase tracking-wide flex-shrink-0"
                                    style={{ color: t.accent }}
                                >
                                    Done
                                </span>
                            ) : (
                                <span
                                    className="text-[9.5px] font-semibold uppercase tracking-wide px-2 py-0.5 flex-shrink-0"
                                    style={{
                                        borderRadius: t.radiusFull,
                                        background: t.surfaceSecondary,
                                        color: t.textMuted,
                                    }}
                                >
                                    Required
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ borderTop: `1px solid ${t.border}` }} />

            {/* SUMMARY */}
            <div>
                <h3 className="text-sm font-semibold mb-4" style={{ color: t.textPrimary }}>Summary</h3>
                <div className="overflow-hidden" style={{ borderRadius: t.radiusMd, border: `1px solid ${t.border}` }}>
                    {[
                        { k: "Name", v: form.name || "—" },
                        { k: "Status", v: isEdit ? form.status : "Active on publish" },
                        { k: "Type", v: form.product_type },
                        { k: "Price", v: price === 0 ? "Free" : `$${price.toFixed(2)} ${form.currency}` },
                        {
                            k: "Billing",
                            v: price === 0 ? "—"
                                : !isDigital ? "One-time (physical)"
                                    : form.pricing_type === "recurring" ? `Recurring · ${form.billing_period}`
                                        : "One-time",
                        },
                        { k: "Fulfilment", v: isDigital ? "Digital delivery" : "Physical shipping" },
                    ].map(row => (
                        <div
                            key={row.k}
                            className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0"
                            style={{ borderColor: t.border }}
                        >
                            <span className="text-xs" style={{ color: t.textMuted }}>{row.k}</span>
                            <span className="text-xs font-semibold capitalize" style={{ color: t.textPrimary }}>
                                {row.v}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* SUBMIT */}
            <button
                onClick={handleSubmit}
                disabled={isPending || !allDone}
                className="w-full h-12 text-sm font-semibold flex items-center justify-center gap-2 text-white transition-all active:scale-[0.98]"
                style={{
                    borderRadius: t.radiusLg,
                    background: isPending || !allDone ? t.borderStrong : t.accent,
                    cursor: isPending || !allDone ? "not-allowed" : "pointer",
                    boxShadow: !isPending && allDone ? t.shadowGlow : "none",
                }}
            >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {isPending
                    ? (isEdit ? "Saving…" : "Publishing…")
                    : allDone
                        ? (isEdit ? "Save changes" : "Publish product")
                        : `Complete ${total - completed} more to continue`}
            </button>

            <p className="text-[11px] text-center" style={{ color: t.textMuted }}>
                {allDone
                    ? (isEdit ? "Changes will go live immediately" : "Your product will go live immediately after publishing")
                    : "Complete all required items above"}
            </p>
        </div>
    );
}
/* ── SHARED PAGE SHELL ── */
export function ProductFormShell({
    title,
    isEdit,
    productId,
}: {
    title: string;
    isEdit: boolean;
    productId?: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);
    const [vendor, setVendor] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(isEdit);

    const [form, setForm] = useState<FormState>({
        name: "", slug: "", short_description: "", description: "",
        product_type: "digital",
        product_subtype: "course",
        price: "29.99", currency: "USD", category_id: "",
        is_digital: true,
        pricing_type: "recurring", billing_period: "monthly",
        digital_file_url: "", track_inventory: true, inventory_quantity: "0",
        affiliate_enabled: false, affiliate_commission_rate: "10",
        is_featured: false,
        button_text: "Join now", tags: "",
        weight: "", dimensions: "", images: [],
        show_author: true, show_reviews: true, enable_discussions: false,
        status: "active",
    });

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            const { data: vends } = await supabase.from("vendors").select("*").eq("user_id", user.id);
            if (!vends || vends.length === 0) { router.push("/dashboard/activate/vendor"); return; }
            setVendor(vends[0]);

            const { data: cats } = await supabase
                .from("product_categories")
                .select("id, name, slug, category_type")
                .eq("is_active", true)
                .order("sort_order");
            setCategories(cats ?? []);

            if (isEdit && productId) {
                const { data: product, error: pErr } = await supabase
                    .from("products")
                    .select("*")
                    .eq("id", productId)
                    .single();
                if (pErr || !product) { setError("Product not found."); setLoading(false); return; }

                // ✅ Map the granular product_type enum back to (bucket, subtype) for the UI.
                // Schema now stores 'course', 'coaching', etc. directly in product_type.
                const savedType: string = product.product_type ?? "digital";
                const isDigitalBucket = DIGITAL_ENUM_VALUES.has(savedType);

                // The UI subtype is the saved product_type itself (when it's a granular digital type).
                // For generic 'digital' or 'subscription', leave subtype blank.
                const uiSubtype =
                    savedType !== "physical" &&
                        savedType !== "digital" &&
                        savedType !== "subscription"
                        ? savedType
                        : "";

                setForm({
                    name: product.name ?? "",
                    slug: product.slug ?? "",
                    short_description: product.short_description ?? "",
                    description: product.description ?? "",
                    product_type: isDigitalBucket ? "digital" : "physical",
                    product_subtype: uiSubtype,
                    price: String(product.price ?? "0"),
                    currency: product.currency ?? "USD",
                    category_id: product.category_id ?? "",
                    is_digital: isDigitalBucket,
                    pricing_type: isDigitalBucket
                        ? (product.pricing_type ?? "one_time")
                        : "one_time",
                    billing_period: product.billing_period ?? (isDigitalBucket && product.pricing_type === "recurring" ? "monthly" : ""),
                    digital_file_url: product.digital_file_url ?? "",
                    track_inventory: product.track_inventory ?? false,
                    inventory_quantity: String(product.inventory_quantity ?? "0"),
                    affiliate_enabled: product.affiliate_enabled ?? false,
                    affiliate_commission_rate: String(product.affiliate_commission_rate ?? "10"),
                    is_featured: product.is_featured ?? false,
                    button_text: product.button_text ?? "Buy Now",
                    tags: Array.isArray(product.tags) ? product.tags.join(", ") : (product.tags ?? ""),
                    weight: String(product.weight ?? ""),
                    dimensions: typeof product.dimensions === "string"
                        ? product.dimensions
                        : (product.dimensions ? JSON.stringify(product.dimensions) : ""),
                    images: Array.isArray(product.images) ? product.images : [],
                    // ✅ Now real columns, no more source_metadata fallback
                    show_author: product.show_author ?? true,
                    show_reviews: product.show_reviews ?? true,
                    enable_discussions: product.enable_discussions ?? false,
                    status: product.status ?? "active",
                });
            }
            setLoading(false);
        }
        load();
    }, [router, isEdit, productId]);

    function handleChange(field: string, value: unknown) {
        setForm(prev => {
            const updated = { ...prev, [field]: value };

            if (field === "name" && !isEdit) updated.slug = slugify(value as string);

            // Auto-derive subtype from category slug, guarded to digital only
            if (field === "category_id") {
                const cat = categories.find(c => c.id === value);
                if (cat?.slug && updated.product_type === "digital") {
                    const matched = PRODUCT_SUBTYPES.find(s => s.id === cat.slug);
                    if (matched) {
                        updated.product_subtype = matched.id;
                        const currentIsDefault = PRODUCT_SUBTYPES.some(
                            s => s.suggestedButtonText === prev.button_text
                        );
                        if (!prev.button_text || currentIsDefault) {
                            updated.button_text = matched.suggestedButtonText;
                        }
                    } else {
                        updated.product_subtype = "";
                    }
                }
            }

            if (field === "product_type") {
                const isDigital = value === "digital";
                updated.is_digital = isDigital;
                updated.product_subtype = isDigital ? "course" : "";

                if (!isDigital) {
                    updated.pricing_type = "one_time";
                    updated.billing_period = "";
                }

                const currentCat = categories.find(c => c.id === updated.category_id);
                if (currentCat) {
                    const ct = currentCat.category_type;
                    if (isDigital && ct === "physical") updated.category_id = "";
                    if (!isDigital && ct === "digital") updated.category_id = "";
                }
            }

            return updated;
        });
    }

    function handleImageUpload(url: string) {
        setForm(prev => ({ ...prev, images: [...prev.images, url] }));
    }
    function removeImage(index: number) {
        setForm(prev => { const next = [...prev.images]; next.splice(index, 1); return { ...prev, images: next }; });
    }

    async function handleSubmit() {
        setError(null);
        if (!vendor || !form.name.trim()) { setError("Product name is required."); return; }
        const price = parseFloat(form.price) || 0;
        if (price < 0) { setError("Price cannot be negative."); return; }

        startTransition(async () => {
            const supabase = createClient();

            const isDigital = form.product_type === "digital";

            // ✅ Collapse (bucket, subtype) → single product_type enum value.
            // If the user picked Digital + a subtype, save that subtype directly.
            // Otherwise save the generic 'physical' or 'digital'.
            const resolvedProductType: string = isDigital
                ? (form.product_subtype && PRODUCT_SUBTYPES.some(s => s.id === form.product_subtype)
                    ? form.product_subtype
                    : "digital")
                : "physical";

            const billingPeriod =
                isDigital && form.pricing_type === "recurring" ? form.billing_period : null;

            const payload: any = {
                name: form.name,
                slug: form.slug || slugify(form.name),
                short_description: form.short_description || null,
                description: form.description || null,
                product_type: resolvedProductType,                // ✅ single source of truth, uses full enum
                status: form.status,
                is_active: true,                                   // ✅ explicit — RLS depends on it
                price,
                currency: form.currency,
                pricing_type: isDigital ? form.pricing_type : "one_time",
                billing_period: billingPeriod,
                category_id: form.category_id || null,
                is_digital: isDigital,
                requires_shipping: !isDigital,                     // ✅ matches new consistency check
                digital_file_url: isDigital ? (form.digital_file_url || null) : null,
                track_inventory: !isDigital && form.track_inventory,
                inventory_quantity: isDigital ? 0 : parseInt(form.inventory_quantity || "0"),
                weight: !isDigital ? (parseFloat(form.weight) || null) : null,
                dimensions: !isDigital ? (form.dimensions || null) : null,
                affiliate_enabled: form.affiliate_enabled,
                affiliate_commission_rate: form.affiliate_enabled
                    ? parseFloat(form.affiliate_commission_rate || "10")
                    : null,
                is_featured: form.is_featured,
                button_text: form.button_text || null,
                tags: form.tags
                    ? form.tags.split(",").map(t => t.trim()).filter(Boolean)
                    : null,
                images: form.images,
                // ✅ Real columns now — no more source_metadata duplication
                show_author: form.show_author,
                show_reviews: form.show_reviews,
                enable_discussions: form.enable_discussions,
                // Keep source_metadata clean — only used for source-specific data (Shopify/CJ),
                // not for fields that have real columns
                source_metadata: {},
                // published_at is set by the trigger automatically when status transitions to 'active'
            };

            let insertErr: any = null;

            if (isEdit && productId) {
                const { error } = await supabase.from("products").update(payload).eq("id", productId);
                insertErr = error;
            } else {
                // ✅ Slug is now UNIQUE(vendor_id, slug) — scope the collision check to this vendor
                const slug = payload.slug;
                const { data: existing } = await supabase
                    .from("products")
                    .select("id")
                    .eq("slug", slug)
                    .eq("vendor_id", vendor.id)
                    .maybeSingle();
                if (existing) payload.slug = `${slug}-${Date.now()}`;
                const { error } = await supabase.from("products").insert({ ...payload, vendor_id: vendor.id });
                insertErr = error;
            }

            if (insertErr) { setError(insertErr.message); }
            else { setSuccess(true); setTimeout(() => router.push("/dashboard/products"), 1800); }
        });
    }

    /* success screen */
    if (success) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "var(--color-bg)" }}>
            <div
                className="w-16 h-16 flex items-center justify-center"
                style={{
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--color-success)",
                    background: "var(--color-success-light)",
                }}
            >
                <CheckCircle2 className="w-7 h-7" style={{ color: "var(--color-success)" }} />
            </div>
            <div className="text-center">
                <p className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {isEdit ? "Changes saved!" : "Product published!"}
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Redirecting to your products…</p>
            </div>
        </div>
    );

    /* loading skeleton for edit */
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-text-muted)" }} />
        </div>
    );

    const nextStep = STEPS.find(s => s.id === step + 1);

    return (
        <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>

            {/* sticky top bar */}
            <div
                className="sticky top-0 z-40 backdrop-blur"
                style={{
                    background: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <NextLink
                            href="/dashboard/products"
                            className="w-8 h-8 flex items-center justify-center transition-all"
                            style={{
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface)",
                                color: "var(--color-text-muted)",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                        >
                            <ArrowLeft size={14} />
                        </NextLink>
                        <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: "var(--color-text-muted)" }}>
                            <span>Products</span>
                            <span>/</span>
                            <span className="font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{form.name || title}</span>
                        </div>
                        {isEdit && (
                            <span
                                className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                style={{
                                    borderRadius: "var(--radius-full)",
                                    background: "var(--color-surface-secondary)",
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text-muted)",
                                }}
                            >
                                Editing
                            </span>
                        )}
                    </div>

                    {/* steps */}
                    <div className="hidden md:flex items-center gap-0.5">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.id}>
                                <button
                                    onClick={() => setStep(s.id)}
                                    className="flex items-center gap-2 px-3 h-8 text-xs font-medium transition-all"
                                    style={{
                                        borderRadius: "var(--radius-sm)",
                                        border: step === s.id ? "1px solid var(--color-border)" : "1px solid transparent",
                                        background: step === s.id ? "var(--color-surface-secondary)" : "transparent",
                                        color: step === s.id ? "var(--color-text-primary)" : s.id < step ? "var(--color-text-secondary)" : "var(--color-border-strong)",
                                    }}
                                >
                                    <span
                                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                        style={{
                                            background: step === s.id ? "var(--color-accent)" : s.id < step ? "var(--color-success-light)" : "var(--color-surface-secondary)",
                                            border: `1px solid ${step === s.id ? "var(--color-accent)" : s.id < step ? "var(--color-success)" : "var(--color-border)"}`,
                                            color: step === s.id ? "#fff" : s.id < step ? "var(--color-success)" : "var(--color-text-muted)",
                                        }}
                                    >
                                        {s.id < step ? <Check size={8} /> : s.id}
                                    </span>
                                    {s.label}
                                </button>
                                {i < STEPS.length - 1 && <ChevronRight size={12} className="mx-0.5" style={{ color: "var(--color-border-strong)" }} />}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => router.push("/dashboard/products")}
                            className="hidden sm:flex h-8 px-4 text-xs items-center font-medium transition-all"
                            style={{
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-muted)",
                                background: "transparent",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
                        >
                            {isEdit ? "Discard changes" : "Discard"}
                        </button>
                        {nextStep ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                className="flex items-center gap-1.5 h-8 px-4 text-xs font-semibold text-white transition-all"
                                style={{ borderRadius: "var(--radius-sm)", background: "var(--color-accent)" }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                            >
                                Next: {nextStep.label} <ChevronRight size={13} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isPending}
                                className="flex items-center gap-1.5 h-8 px-4 text-xs font-semibold text-white transition-all disabled:opacity-60"
                                style={{ borderRadius: "var(--radius-sm)", background: "var(--color-accent)", boxShadow: "var(--shadow-glow)" }}
                            >
                                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                                {isPending ? (isEdit ? "Saving…" : "Publishing…") : (isEdit ? "Save" : "Publish")}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* error banner */}
            {error && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
                    <div
                        className="flex items-start gap-3 p-4"
                        style={{
                            borderRadius: "var(--radius-lg)",
                            border: "1px solid var(--color-danger)",
                            background: "var(--color-danger-light)",
                        }}
                    >
                        <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-danger)" }} />
                        <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto" style={{ color: "var(--color-danger)" }}><X size={15} /></button>
                    </div>
                </div>
            )}

            {/* main layout */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_220px] gap-5 items-start">
                    {/* form card */}
                    <Card className="overflow-hidden">
                        <div className="p-6 sm:p-8">
                            {step === 1 && <StepDetails form={form} handleChange={handleChange} categories={categories} handleImageUpload={handleImageUpload} removeImage={removeImage} />}
                            {step === 2 && <StepPricing form={form} handleChange={handleChange} />}
                            {step === 3 && <StepSettings form={form} handleChange={handleChange} />}
                            {step === 4 && <StepPublish form={form} isPending={isPending} handleSubmit={handleSubmit} isEdit={isEdit} />}
                        </div>

                        {/* footer */}
                        <div className="flex items-center justify-between px-6 sm:px-8 py-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                            <button
                                disabled={step === 1}
                                onClick={() => setStep(s => Math.max(1, s - 1))}
                                className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{
                                    borderRadius: "var(--radius-full)",
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text-muted)",
                                    background: "transparent",
                                }}
                            >
                                <ArrowLeft size={12} /> Back
                            </button>

                            <div className="flex items-center gap-x-1.5">
                                {STEPS.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setStep(s.id)}
                                        className="h-[5px] rounded-full transition-all duration-300"
                                        style={{
                                            width: step === s.id ? "20px" : "5px",
                                            background: step === s.id ? "var(--color-accent)" : s.id < step ? "var(--color-success)" : "var(--color-border-strong)",
                                            opacity: s.id < step ? 0.5 : 1,
                                        }}
                                    />
                                ))}
                            </div>

                            {nextStep ? (
                                <button
                                    onClick={() => setStep(s => Math.min(4, s + 1))}
                                    className="flex items-center gap-1 h-8 px-3 text-xs font-semibold text-white transition-all"
                                    style={{ borderRadius: "var(--radius-full)", background: "var(--color-accent)" }}
                                >
                                    Next <ChevronRight size={12} />
                                </button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isPending}
                                >
                                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                    {isPending ? "…" : (isEdit ? "Save" : "Publish")}
                                </Button>
                            )}
                        </div>
                    </Card>

                    {/* live preview */}
                    <LivePreview form={form} />

                    {/* right sidebar */}
                    <RightSidebar form={form} handleChange={handleChange} isEdit={isEdit} />
                </div>
            </div>
        </div>
    );
}