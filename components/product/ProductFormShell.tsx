"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
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
import { cn, getProductDiscountPercent, getProductDiscountLabel } from "@/lib/utils";
import { StyledTextarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Switch } from "@/components/ui/switch";
import {
    getAdminProductForEdit,
    updateAdminProduct,
    type AdminProductUpdateInput,
} from "@/lib/actions/admin-products";
import { upsertSellerProduct, getSellerUploadContext } from "@/lib/actions/seller-products";
import { CategoryTreeSelect } from "@/components/product/CategoryTreeSelect";
import {
    ProductTypeSelector,
    type BusinessVerificationUi,
} from "@/components/product/ProductTypeSelector";
import { saveProductVideos } from "@/lib/actions/product-videos";
import { DigitalSourceFields, type DigitalSourceValue } from "@/components/product/DigitalSourceFields";
import { sortProductVideoRows } from "@/lib/product-videos";
import { useCurrency } from "@/context/CurrencyContext";
import { cleanCJDescription } from "@/lib/cj/render";
import { extractVideosFromHtml } from "@/lib/cj/product-videos";
import {
    deriveShortDescription,
    extractImagesFromHtml,
    getProductPreviewImage,
    isHtmlContent,
    mergeUniqueUrls,
} from "@/lib/product-description";
import { formatMoneyAsUSD } from "@/lib/currency/platform";

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
        id: "template",
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

const DIGITAL_ENUM_VALUES = new Set([
    "digital", "course", "software", "template", "ebook",
    "coaching", "community", "bundle", "subscription",
]);

/* ── form state ── */
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
    videoUrls: string[];
    show_author: boolean;
    show_reviews: boolean;
    enable_discussions: boolean;
    status: "active" | "draft" | "paused" | "archived" | "pending_review" | "rejected";
    discount_enabled: boolean;
    compare_at_price: string;
    discount_label: string;
    is_flash_deal: boolean;
    acquisition_model: string;
    rightsholder_name: string;
    content_language: string;
    intended_audience: string;
    buyer_license_summary: string;
    refund_policy_note: string;
    compatibility_notes: string;
    update_policy: string;
    affiliate_destination_url: string;
    declarations_accepted: boolean;
    evidence_url: string;
    evidence_file_name: string;
    file_name: string;
    file_mime: string;
    file_size_bytes: string;
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
    return <Switch checked={checked} onCheckedChange={onChange} />;
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

function SectionTitle({ label, hint }: { label: string; hint?: string }) {
    return (
        <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{label}</h3>
            {hint && <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>{hint}</span>}
        </div>
    );
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
function LivePreview({ form }: { form: FormState }) {
    const { formatMoney } = useCurrency();
    const price = parseFloat(form.price) || 0;
    const isFree = price === 0;
    const compareAt = parseFloat(form.compare_at_price) || 0;
    const showDiscount = form.discount_enabled && !isFree && compareAt > price;
    const discountBadge = showDiscount || (form.discount_enabled && form.discount_label.trim())
        ? getProductDiscountLabel({
            price,
            compare_at_price: showDiscount ? compareAt : null,
            discount_label: form.discount_label || null,
            is_flash_deal: form.is_flash_deal,
        })
        : "";
    const tags = form.tags ? form.tags.split(",").slice(0, 4).map(t => t.trim()).filter(Boolean) : [];
    const subtype = PRODUCT_SUBTYPES.find(s => s.id === form.product_subtype);
    const isPhysical = form.product_type === "physical";
    const previewImage = useMemo(
        () => getProductPreviewImage(form.images, form.description),
        [form.images, form.description],
    );
    const stockQty = parseInt(form.inventory_quantity, 10) || 0;

    const socialProofLine = isPhysical
        ? form.track_inventory
            ? stockQty > 0
                ? `${stockQty} in stock`
                : form.name.trim()
                    ? "Inventory tracked"
                    : "Physical product · ships to customer"
            : "Ships worldwide"
        : subtype?.id === "course"
            ? "Join thousands of students"
            : "Instant digital access";

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
                <div
                    className="w-full aspect-video flex items-center justify-center mb-3 relative overflow-hidden"
                    style={{
                        borderRadius: t.radiusMd,
                        border: `1px solid ${t.border}`,
                        background: t.surfaceSecondary,
                    }}
                >
                    {previewImage ? (
                        <CloudinaryImage src={previewImage} alt="cover" fill className="object-cover" />
                    ) : (
                        <div className="flex flex-col items-center gap-1" style={{ color: t.borderStrong }}>
                            <ImageIcon size={24} />
                            <span className="text-[10px]">Cover image</span>
                        </div>
                    )}
                    {isPhysical ? (
                        <div
                            className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                            style={{
                                borderRadius: t.radiusFull,
                                background: t.accent,
                                color: "#fff",
                            }}
                        >
                            Physical
                        </div>
                    ) : subtype ? (
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
                    ) : null}
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
                    <span className="text-[11px]" style={{ color: t.textMuted }}>{socialProofLine}</span>
                    {form.show_reviews && (
                        <span className="text-[11px] ml-auto" style={{ color: t.textMuted }}>★ Reviews</span>
                    )}
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
                    {isFree ? "Free" : (
                        <>
                            {formatMoney(price, form.currency)}
                            {showDiscount && (
                                <span
                                    className="text-sm font-normal ml-2"
                                    style={{ color: t.textMuted, textDecoration: "line-through" }}
                                >
                                    {formatMoney(compareAt, form.currency)}
                                </span>
                            )}
                        </>
                    )}
                    {!isFree && form.pricing_type === "recurring" && form.product_type === "digital" && (
                        <span className="text-xs font-normal" style={{ color: t.textMuted }}>
                            {" "}/ {form.billing_period}
                        </span>
                    )}
                </p>

                {discountBadge && (
                    <span
                        className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 mb-2"
                        style={{
                            borderRadius: t.radiusFull,
                            background: t.accent,
                            color: "#fff",
                        }}
                    >
                        {discountBadge}
                    </span>
                )}

                <button
                    className="w-full py-2 text-xs font-semibold text-white cursor-default"
                    style={{ borderRadius: t.radiusSm, background: t.accent }}
                >
                    {isPhysical
                        ? "Buy Now"
                        : form.button_text || subtype?.suggestedButtonText || "Buy Now"}
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
    form, handleChange, categories, handleImageUpload, removeImage, business, onContinueDigital, onVerifyBusiness,
}: {
    form: FormState;
    handleChange: (f: string, v: unknown) => void;
    categories: any[];
    handleImageUpload: (url: string) => void;
    removeImage: (i: number) => void;
    business: BusinessVerificationUi;
    onContinueDigital: () => void;
    onVerifyBusiness: () => Promise<void>;
}) {
    const [videoInput, setVideoInput] = React.useState("");
    const [imageUrlInput, setImageUrlInput] = React.useState("");
    const [descTab, setDescTab] = React.useState<"edit" | "preview">("edit");
    const descIsHtml = isHtmlContent(form.description || "");
    const descCharCount = (form.description || "").length;
    const physicalBlocked = form.product_type === "physical" && !business.verified;

    const pullImagesFromDescription = () => {
        const urls = extractImagesFromHtml(form.description);
        if (urls.length === 0) return;
        handleChange("images", mergeUniqueUrls(form.images, urls, 20));
    };

    const pullVideosFromDescription = () => {
        const urls = extractVideosFromHtml(form.description);
        if (urls.length === 0) return;
        handleChange("videoUrls", mergeUniqueUrls(form.videoUrls, urls, 10));
    };

    const addImageUrl = () => {
        const url = imageUrlInput.trim();
        if (!url.startsWith("http") || form.images.includes(url)) return;
        handleChange("images", [...form.images, url]);
        setImageUrlInput("");
    };

    const filteredCategories = categories.filter(c => {
        const ct = c.category_type;
        if (form.product_type === "digital") return ct === "digital";
        return ct === "physical" || ct === "both" || !ct;
    });

    return (
        <div className="space-y-6">
            <ProductTypeSelector
                value={form.product_type}
                onChange={(next) => handleChange("product_type", next)}
                business={business}
                onVerifyBusiness={onVerifyBusiness}
                onContinueDigital={onContinueDigital}
            />

            {physicalBlocked ? null : (
            <>
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
                        <Input value={form.name} maxLength={80} onChange={e => handleChange("name", e.target.value)} placeholder="Product name" />
                    </div>
                    <div>
                        <Label>URL slug</Label>
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
                        <Input value={form.short_description} maxLength={80} onChange={e => handleChange("short_description", e.target.value)} placeholder="Short headline" />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <Label hint={descIsHtml ? `${descCharCount} chars · HTML` : `${descCharCount} chars`}>
                                Full description
                            </Label>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setDescTab("edit")}
                                    className="px-2 py-0.5 text-[10px] font-medium transition-all"
                                    style={{
                                        borderRadius: "var(--radius-full)",
                                        background: descTab === "edit" ? "var(--color-accent-light)" : "transparent",
                                        color: descTab === "edit" ? "var(--color-accent)" : "var(--color-text-muted)",
                                        border: `1px solid ${descTab === "edit" ? "var(--color-accent-subtle)" : "var(--color-border)"}`,
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDescTab("preview")}
                                    className="px-2 py-0.5 text-[10px] font-medium transition-all"
                                    style={{
                                        borderRadius: "var(--radius-full)",
                                        background: descTab === "preview" ? "var(--color-accent-light)" : "transparent",
                                        color: descTab === "preview" ? "var(--color-accent)" : "var(--color-text-muted)",
                                        border: `1px solid ${descTab === "preview" ? "var(--color-accent-subtle)" : "var(--color-border)"}`,
                                    }}
                                >
                                    Preview
                                </button>
                            </div>
                        </div>
                        {descTab === "edit" ? (
                            <StyledTextarea
                                value={form.description || ""}
                                rows={8}
                                onChange={e => handleChange("description", e.target.value)}
                                placeholder="Describe your product"
                            />
                        ) : (
                            <div
                                className="min-h-[160px] max-h-[320px] overflow-y-auto p-3 text-sm prose prose-sm max-w-none"
                                style={{
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface-secondary)",
                                    color: "var(--color-text-secondary)",
                                }}
                                dangerouslySetInnerHTML={{
                                    __html: form.description
                                        ? DOMPurify.sanitize(cleanCJDescription(form.description))
                                        : "<p style='opacity:0.5'>Nothing to preview yet.</p>",
                                }}
                            />
                        )}
                        {descIsHtml && descTab === "edit" && (
                            <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>
                                HTML detected — use Preview to see how buyers will read it, or import images below.
                            </p>
                        )}
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
                <SectionTitle label="Category" />
                <CategoryTreeSelect
                    categories={categories}
                    value={form.category_id}
                    onChange={(id) => handleChange("category_id", id)}
                    productType={form.product_type}
                />
            </div>

            <Divider />

            <div>
                <SectionTitle
                    label="Media"
                    hint={form.images.length > 0 ? `${form.images.length} image${form.images.length > 1 ? "s" : ""}` : undefined}
                />
                {(descIsHtml || form.description) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button
                            type="button"
                            onClick={pullImagesFromDescription}
                            className="flex items-center gap-1.5 px-3 h-7 text-[11px] font-medium transition-all"
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
                            <ImageIcon size={12} /> Import images from description
                        </button>
                        {descIsHtml && (
                            <button
                                type="button"
                                onClick={pullVideosFromDescription}
                                className="flex items-center gap-1.5 px-3 h-7 text-[11px] font-medium transition-all"
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
                                <Video size={12} /> Import videos from description
                            </button>
                        )}
                    </div>
                )}
                <div className="flex gap-2 mb-3">
                    <Input
                        value={imageUrlInput}
                        onChange={e => setImageUrlInput(e.target.value)}
                        placeholder="Paste image URL (CJ, Shopify, etc.)"
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addImageUrl();
                            }
                        }}
                    />
                    <Button type="button" variant="outline" className="shrink-0" onClick={addImageUrl}>
                        Add URL
                    </Button>
                </div>
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

            <div>
                <SectionTitle label="Product videos" hint="MP4, YouTube, or Vimeo URLs" />
                <div className="flex gap-2">
                    <Input
                        value={videoInput}
                        onChange={(e) => setVideoInput(e.target.value)}
                        placeholder="https://…"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                const url = videoInput.trim();
                                if (!url.startsWith("http") || form.videoUrls.includes(url)) return;
                                handleChange("videoUrls", [...form.videoUrls, url]);
                                setVideoInput("");
                            }
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => {
                            const url = videoInput.trim();
                            if (!url.startsWith("http")) return;
                            if (form.videoUrls.includes(url)) return;
                            handleChange("videoUrls", [...form.videoUrls, url]);
                            setVideoInput("");
                        }}
                    >
                        Add
                    </Button>
                </div>
                {form.videoUrls.length > 0 && (
                    <ul className="mt-3 space-y-2">
                        {form.videoUrls.map((url, i) => (
                            <li
                                key={url}
                                className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                            >
                                <Video size={14} className="shrink-0" style={{ color: "var(--color-accent)" }} />
                                <span className="min-w-0 flex-1 truncate">{url}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = [...form.videoUrls];
                                        next.splice(i, 1);
                                        handleChange("videoUrls", next);
                                    }}
                                    className="shrink-0 text-[var(--color-text-muted)] hover:text-red-500"
                                    aria-label="Remove video"
                                >
                                    <X size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            </>
            )}
        </div>
    );
}

/* ── STEP 2: Pricing (Digital vs Physical are separate UIs) ── */
function StepPricing({ form, handleChange }: { form: FormState; handleChange: (f: string, v: unknown) => void }) {
    const isPhysical = form.product_type === "physical";
    const isFree = parseFloat(form.price) === 0;
    const salePrice = parseFloat(form.price) || 0;
    const compareAt = parseFloat(form.compare_at_price) || 0;
    const discountPreview = {
        price: salePrice,
        compare_at_price: form.discount_enabled && compareAt > salePrice ? compareAt : null,
        discount_label: form.discount_label || null,
        is_flash_deal: form.is_flash_deal,
    };
    const savingsPct = getProductDiscountPercent(discountPreview);
    const badgeLabel = getProductDiscountLabel(discountPreview);

    function setDiscountPercent(pct: number) {
        if (salePrice <= 0 || pct <= 0 || pct >= 100) {
            handleChange("compare_at_price", "");
            return;
        }
        const original = salePrice / (1 - pct / 100);
        handleChange("compare_at_price", original.toFixed(2));
    }

    function PriceField({ label, value, onChange, placeholder }: {
        label: string; value: string; onChange: (v: string) => void; placeholder?: string;
    }) {
        return (
            <div>
                <Label>{label}</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>$</span>
                    <Input
                        type="number"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className="pl-7 font-semibold text-base"
                        min={0}
                        step="0.01"
                        placeholder={placeholder}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>USD</span>
                </div>
            </div>
        );
    }

    function CompareAtBlock() {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Compare-at price</p>
                    <Toggle
                        checked={form.discount_enabled}
                        onChange={v => handleChange("discount_enabled", v)}
                    />
                </div>
                {form.discount_enabled && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <PriceField
                                label="Original price"
                                value={form.compare_at_price}
                                onChange={v => handleChange("compare_at_price", v)}
                                placeholder="49.99"
                            />
                            <div>
                                <Label>% off</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={savingsPct > 0 ? String(savingsPct) : ""}
                                        onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                        className="pr-8"
                                        min={1}
                                        max={99}
                                        placeholder="20"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: "var(--color-text-muted)" }}>%</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label>Sale badge (optional)</Label>
                            <Input
                                value={form.discount_label}
                                onChange={e => handleChange("discount_label", e.target.value)}
                                placeholder='e.g. "Sale" or leave blank'
                            />
                        </div>
                        {!isPhysical && (
                            <ToggleRow
                                title="Flash deal"
                                description="Show in marketplace flash deals"
                                checked={form.is_flash_deal}
                                onChange={v => handleChange("is_flash_deal", v)}
                            />
                        )}
                        {compareAt > salePrice && salePrice > 0 && (
                            <p className="text-xs" style={{ color: "var(--color-accent)" }}>
                                Buyers pay <strong>${salePrice.toFixed(2)}</strong>
                                {" "}(was ${compareAt.toFixed(2)})
                                {badgeLabel ? ` · ${badgeLabel}` : ""}
                            </p>
                        )}
                        {form.discount_enabled && compareAt > 0 && compareAt <= salePrice && (
                            <p className="text-xs flex items-center gap-1.5" style={{ color: "#b45309" }}>
                                <AlertTriangle size={12} />
                                Original price must be higher than the selling price.
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }

    function AffiliateBlock() {
        return (
            <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Affiliate commission</p>
                    <Toggle checked={form.affiliate_enabled} onChange={v => handleChange("affiliate_enabled", v)} />
                </div>
                {form.affiliate_enabled && (
                    <div>
                        <Label>Commission %</Label>
                        <div className="relative max-w-[160px]">
                            <Input
                                type="number"
                                value={form.affiliate_commission_rate}
                                onChange={e => handleChange("affiliate_commission_rate", e.target.value)}
                                className="pr-8 font-mono"
                                min="1"
                                max="100"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: "var(--color-text-muted)" }}>%</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (isPhysical) {
        return (
            <div className="space-y-6">
                <div>
                    <SectionTitle label="Selling price" />
                    <div className="space-y-4">
                        <PriceField
                            label="Price"
                            value={form.price}
                            onChange={v => {
                                handleChange("price", v);
                                handleChange("currency", "USD");
                                handleChange("pricing_type", "one_time");
                            }}
                            placeholder="29.99"
                        />
                        <CompareAtBlock />
                    </div>
                </div>

                <Divider />

                <div>
                    <SectionTitle label="Inventory" />
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Track inventory</p>
                            <Toggle checked={form.track_inventory} onChange={v => handleChange("track_inventory", v)} />
                        </div>
                        {form.track_inventory && (
                            <div>
                                <Label>Stock quantity</Label>
                                <Input
                                    type="number"
                                    value={form.inventory_quantity}
                                    onChange={e => handleChange("inventory_quantity", e.target.value)}
                                    placeholder="0"
                                    min={0}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <Divider />
                <AffiliateBlock />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <SectionTitle label="Pricing" />
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                    {[
                        { id: "free", label: "Free" },
                        { id: "paid", label: "Paid" },
                    ].map(opt => {
                        const sel = opt.id === "free" ? isFree : !isFree;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleChange("price", opt.id === "free" ? "0" : (salePrice > 0 ? form.price : "9.99"))}
                                className="flex min-h-[48px] items-center justify-between px-3.5 text-left transition-all"
                                style={{
                                    borderRadius: "var(--radius-md)",
                                    border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border)"}`,
                                    background: sel ? "var(--color-accent-light)" : "var(--color-surface)",
                                }}
                            >
                                <span className="text-sm font-semibold" style={{ color: sel ? "var(--color-accent)" : "var(--color-text-primary)" }}>{opt.label}</span>
                                {sel && <Check size={14} style={{ color: "var(--color-accent)" }} />}
                            </button>
                        );
                    })}
                </div>

                {!isFree && (
                    <div className="space-y-4">
                        <PriceField
                            label="Price"
                            value={form.price}
                            onChange={v => {
                                handleChange("price", v);
                                handleChange("currency", "USD");
                            }}
                            placeholder="9.99"
                        />

                        <div className="space-y-2">
                            <Label>Billing</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: "one_time", label: "One-time" },
                                    { id: "recurring", label: "Subscription" },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => handleChange("pricing_type", opt.id)}
                                        className="h-10 text-xs font-medium transition-all"
                                        style={{
                                            borderRadius: "var(--radius-sm)",
                                            border: `1px solid ${form.pricing_type === opt.id ? "var(--color-accent)" : "var(--color-border)"}`,
                                            background: form.pricing_type === opt.id ? "var(--color-accent-light)" : "var(--color-surface)",
                                            color: form.pricing_type === opt.id ? "var(--color-accent)" : "var(--color-text-secondary)",
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {form.pricing_type === "recurring" && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {BILLING_PERIODS.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleChange("billing_period", p.id)}
                                            className="px-3 h-8 text-[11px] font-semibold transition-all"
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
                            )}
                        </div>

                        <CompareAtBlock />
                    </div>
                )}
            </div>

            <Divider />
            <AffiliateBlock />
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Label>Weight (kg)</Label>
                                <Input type="number" step="0.01" value={form.weight} onChange={e => handleChange("weight", e.target.value)} placeholder="0.00" />
                            </div>
                            <div>
                                <Label>Dimensions</Label>
                                <Input value={form.dimensions} onChange={e => handleChange("dimensions", e.target.value)} placeholder="10×10×5 cm" />
                            </div>
                        </div>
                        {form.track_inventory && (
                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                Stock is managed in Pricing ({form.inventory_quantity || "0"} units).
                            </p>
                        )}
                    </div>
                )}

                {form.product_type === "digital" && (
                    <div className="space-y-3">
                        <div
                            className="p-4"
                            style={{
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface)",
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
                                    <button type="button" onClick={() => handleChange("digital_file_url", "")} style={{ color: "var(--color-danger)" }}>
                                        <X size={13} />
                                    </button>
                                </div>
                            ) : (
                                <CloudinaryUploadButton
                                    folder="jimvio/digital-files"
                                    resourceType="raw"
                                    accessType="private"
                                    maxBytes={50 * 1024 * 1024}
                                    onUploadSuccess={(url, _id, meta) => {
                                        handleChange("digital_file_url", url);
                                        handleChange("file_name", meta?.originalFilename || "");
                                        handleChange("file_size_bytes", meta?.bytes != null ? String(meta.bytes) : "");
                                        handleChange("file_mime", meta?.format === "pdf" ? "application/pdf" : "application/octet-stream");
                                    }}
                                    className="px-4 h-8 text-xs font-medium transition-all"
                                />
                            )}
                        </div>
                        {form.acquisition_model !== "affiliate_only_product" && (
                            <div>
                                <Label>Private file URL</Label>
                                <Input
                                    value={form.digital_file_url}
                                    onChange={e => handleChange("digital_file_url", e.target.value)}
                                    placeholder="https://res.cloudinary.com/…/raw/private/…"
                                />
                            </div>
                        )}
                        <DigitalSourceFields
                            value={form}
                            onChange={(patch: Partial<DigitalSourceValue>) => {
                                Object.entries(patch).forEach(([key, val]) => handleChange(key as keyof FormState, val as never));
                            }}
                        />
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
        {
            label: "Pricing",
            hint:
                price === 0
                    ? "Free to access"
                    : formatMoneyAsUSD(price, form.currency),
            done: true,
        },
        {
            label: "Fulfilment",
            hint: isDigital
                ? form.acquisition_model === "affiliate_only_product"
                    ? "Affiliate destination, no hosted file"
                    : (form.digital_file_url ? "Private digital file attached" : "Upload a private file")
                : "Physical shipping",
            done: !isDigital || form.acquisition_model === "affiliate_only_product" || !!form.digital_file_url,
        },
    ];

    const completed = checks.filter(c => c.done).length;
    const total = checks.length;
    const allDone = completed === total;
    const progressPct = (completed / total) * 100;

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
            <div>
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

                <div
                    className="h-1 overflow-hidden mb-5"
                    style={{ borderRadius: t.radiusFull, background: t.surfaceSecondary }}
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

                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-[13px] font-medium leading-tight"
                                    style={{ color: item.done ? t.textPrimary : t.textSecondary }}
                                >
                                    {item.label}
                                </p>
                                <p className="text-[10.5px] mt-0.5 truncate" style={{ color: t.textMuted }}>
                                    {item.hint}
                                </p>
                            </div>

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

            <div>
                <h3 className="text-sm font-semibold mb-4" style={{ color: t.textPrimary }}>Summary</h3>
                <div className="overflow-hidden" style={{ borderRadius: t.radiusMd, border: `1px solid ${t.border}` }}>
                    {[
                        { k: "Name", v: form.name || "—" },
                        { k: "Status", v: isEdit ? form.status : "Active on publish" },
                        { k: "Type", v: form.product_type },
                        {
                            k: "Price",
                            v: price === 0 ? "Free" : formatMoneyAsUSD(price, form.currency),
                        },
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
                    ? (isEdit ? "Saving…" : "Submitting…")
                    : allDone
                        ? (isEdit ? "Save changes" : "Submit for review")
                        : `Complete ${total - completed} more to continue`}
            </button>

            <p className="text-[11px] text-center" style={{ color: t.textMuted }}>
                {allDone
                    ? "New products are reviewed before they appear on Marketplace."
                    : "Finish the checklist to submit for review."}
            </p>
        </div>
    );
}

/* ── SHARED PAGE SHELL ── */
export function ProductFormShell({
    title,
    isEdit,
    productId,
    mode = "vendor",
    returnHref,
}: {
    title: string;
    isEdit: boolean;
    productId?: string;
    mode?: "vendor" | "admin";
    returnHref?: string;
}) {
    const router = useRouter();
    const isAdminMode = mode === "admin";
    const listHref = returnHref ?? (isAdminMode ? "/admin/products" : "/seller/products");
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);
    const [vendor, setVendor] = useState<any>(null);
    const [businessVerified, setBusinessVerified] = useState(false);
    const [businessUi, setBusinessUi] = useState<BusinessVerificationUi>({
        verified: false,
        key: "not_started",
        label: "Business verification required",
        feePaid: false,
        feeUsd: null,
        feeLabel: null,
        phase: "not_requested",
    });
    const [categories, setCategories] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("Product saved");
    const [loading, setLoading] = useState(isEdit);

    const [form, setForm] = useState<FormState>({
        name: "", slug: "", short_description: "", description: "",
        product_type: "digital",
        product_subtype: "course",
        price: "29.99", currency: "USD", category_id: "",
        is_digital: true,
        pricing_type: "one_time", billing_period: "monthly",
        digital_file_url: "", track_inventory: true, inventory_quantity: "0",
        affiliate_enabled: false, affiliate_commission_rate: "10",
        is_featured: false,
        button_text: "Buy Now", tags: "",
        weight: "", dimensions: "", images: [], videoUrls: [],
        show_author: true, show_reviews: true, enable_discussions: false,
        status: "draft",
        discount_enabled: false,
        compare_at_price: "",
        discount_label: "",
        is_flash_deal: false,
        acquisition_model: "original_vendor_product",
        rightsholder_name: "",
        content_language: "",
        intended_audience: "",
        buyer_license_summary: "",
        refund_policy_note: "",
        compatibility_notes: "",
        update_policy: "",
        affiliate_destination_url: "",
        declarations_accepted: false,
        evidence_url: "",
        evidence_file_name: "",
        file_name: "",
        file_mime: "",
        file_size_bytes: "",
    });

    const physicalGateActive =
        !isAdminMode && form.product_type === "physical" && !businessVerified;

    const applyBusinessContext = (ctx: Awaited<ReturnType<typeof getSellerUploadContext>>) => {
        setVendor(ctx.vendor);
        setBusinessVerified(ctx.canSellPhysical);
        setBusinessUi((prev) => ({
            ...prev,
            verified: ctx.businessStatus.verified,
            key: ctx.businessStatus.key,
            label: ctx.businessStatus.label,
            phase: ctx.businessStatus.verified
                ? "verified"
                : ctx.businessStatus.key === "in_review" || ctx.businessStatus.key === "in_progress"
                  ? "pending"
                  : ctx.businessStatus.key === "failed"
                    ? "rejected"
                    : ctx.businessStatus.key === "expired"
                      ? "suspended"
                      : "not_requested",
        }));
    };

    async function refreshBusinessVerificationStatus() {
        const res = await fetch("/api/identity/verification/business", { method: "GET" });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        setBusinessUi({
            verified: Boolean(json.verified),
            key: json.customer?.key || "not_started",
            label: json.customer?.label || "Business verification required",
            feePaid: false,
            feeUsd: null,
            feeLabel: null,
            supportHref: typeof json.supportHref === "string" ? json.supportHref : undefined,
            phase: json.phase || (json.verified ? "verified" : "not_requested"),
        });
        if (json.verified) {
            setBusinessVerified(true);
            const ctx = await getSellerUploadContext();
            if (ctx.authenticated) applyBusinessContext(ctx);
        } else {
            setBusinessVerified(false);
        }
    }

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }

            if (!isAdminMode) {
                const ctx = await getSellerUploadContext();
                if (!ctx.authenticated) { router.push("/login"); return; }
                applyBusinessContext(ctx);
                await refreshBusinessVerificationStatus();
            }

            const { data: cats } = await supabase
                .from("product_categories")
                .select("id, name, slug, category_type, parent_id")
                .eq("is_active", true)
                .order("sort_order");
            setCategories(cats ?? []);

            if (isEdit && productId) {
                let product: Record<string, unknown> | null = null;

                if (isAdminMode) {
                    const result = await getAdminProductForEdit(productId);
                    if (!result.success) {
                        setError("error" in result ? result.error : "Product not found.");
                        setLoading(false);
                        return;
                    }
                    if (!result.data?.product) {
                        setError("Product not found.");
                        setLoading(false);
                        return;
                    }
                    product = result.data.product;
                } else {
                    const { data, error: pErr } = await supabase
                        .from("products")
                        .select("*")
                        .eq("id", productId)
                        .single();
                    if (pErr || !data) { setError("Product not found."); setLoading(false); return; }
                    product = data;
                }

                if (!product) {
                    setError("Product not found.");
                    setLoading(false);
                    return;
                }

                const { data: videoRows } = await supabase
                    .from("product_videos")
                    .select("url, sort_order")
                    .eq("product_id", productId)
                    .eq("is_active", true)
                    .order("sort_order");

                const savedType: string = (product.product_type as string) ?? "digital";
                const isDigitalBucket = DIGITAL_ENUM_VALUES.has(savedType);
                const savedPricingType =
                    product.pricing_type === "recurring" ? "recurring" : "one_time";

                const uiSubtype =
                    savedType !== "physical" &&
                        savedType !== "digital" &&
                        savedType !== "subscription"
                        ? savedType
                        : "";

                const rawDescription = (product.description as string) ?? "";
                let images = Array.isArray(product.images) ? product.images as string[] : [];
                if (images.length === 0 && rawDescription) {
                    images = extractImagesFromHtml(rawDescription).slice(0, 12);
                }

                let shortDescription = (product.short_description as string) ?? "";
                if (!shortDescription.trim() && rawDescription) {
                    shortDescription = deriveShortDescription(rawDescription);
                }

                setForm({
                    name: (product.name as string) ?? "",
                    slug: (product.slug as string) ?? "",
                    short_description: shortDescription,
                    description: rawDescription,
                    product_type: isDigitalBucket ? "digital" : "physical",
                    product_subtype: uiSubtype,
                    price: String(product.price ?? "0"),
                    currency: (product.currency as string) ?? "USD",
                    category_id: (product.category_id as string) ?? "",
                    is_digital: isDigitalBucket,
                    pricing_type: isDigitalBucket ? savedPricingType : "one_time",
                    billing_period: (product.billing_period as string) ?? (isDigitalBucket && savedPricingType === "recurring" ? "monthly" : ""),
                    digital_file_url: (product.digital_file_url as string) ?? "",
                    track_inventory: (product.track_inventory as boolean) ?? false,
                    inventory_quantity: String(product.inventory_quantity ?? "0"),
                    affiliate_enabled: (product.affiliate_enabled as boolean) ?? false,
                    affiliate_commission_rate: String(product.affiliate_commission_rate ?? "10"),
                    is_featured: (product.is_featured as boolean) ?? false,
                    button_text: (product.button_text as string) ?? "Buy Now",
                    tags: Array.isArray(product.tags) ? product.tags.join(", ") : ((product.tags as string) ?? ""),
                    weight: String(product.weight ?? ""),
                    dimensions: typeof product.dimensions === "string"
                        ? product.dimensions
                        : (product.dimensions ? JSON.stringify(product.dimensions) : ""),
                    images,
                    show_author: (product.show_author as boolean) ?? true,
                    show_reviews: (product.show_reviews as boolean) ?? true,
                    enable_discussions: (product.enable_discussions as boolean) ?? false,
                    status: ((product.status as FormState["status"]) ?? "active"),
                    discount_enabled: !!(
                        product.compare_at_price ||
                        product.discount_label ||
                        product.is_flash_deal
                    ),
                    compare_at_price: product.compare_at_price != null ? String(product.compare_at_price) : "",
                    discount_label: (product.discount_label as string) ?? "",
                    is_flash_deal: (product.is_flash_deal as boolean) ?? false,
                    videoUrls: sortProductVideoRows(videoRows ?? []),
                    acquisition_model: (product.acquisition_model as string) || "original_vendor_product",
                    rightsholder_name: (product.rightsholder_name as string) || "",
                    content_language: (product.content_language as string) || "",
                    intended_audience: (product.intended_audience as string) || "",
                    buyer_license_summary: (product.buyer_license_summary as string) || "",
                    refund_policy_note: (product.refund_policy_note as string) || "",
                    compatibility_notes: (product.compatibility_notes as string) || "",
                    update_policy: (product.update_policy as string) || "",
                    affiliate_destination_url: (product.affiliate_destination_url as string) || "",
                    declarations_accepted: Boolean(product.declarations_accepted_at),
                    evidence_url: "",
                    evidence_file_name: "",
                    file_name: "",
                    file_mime: "",
                    file_size_bytes: product.digital_file_size != null ? String(product.digital_file_size) : "",
                });
            }
            setLoading(false);
        }
        load();
    }, [router, isEdit, productId, isAdminMode]);

    // Re-check business verification / fee when returning from Didit or payment
    useEffect(() => {
        if (isAdminMode || typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const fromFee = params.get("business_verification_fee");
        const fromDidit = params.get("business_verification");
        if (!fromFee && !fromDidit) return;
        void (async () => {
            await refreshBusinessVerificationStatus();
            const ctx = await getSellerUploadContext();
            if (ctx.authenticated) applyBusinessContext(ctx);
            const url = new URL(window.location.href);
            url.searchParams.delete("business_verification");
            url.searchParams.delete("business_verification_fee");
            url.searchParams.delete("ref");
            url.searchParams.delete("status");
            url.searchParams.delete("tx_ref");
            url.searchParams.delete("transaction_id");
            window.history.replaceState({}, "", url.pathname + (url.search || ""));
        })();
    }, [isAdminMode]);

    useEffect(() => {
        if (physicalGateActive && step !== 1) {
            setStep(1);
            setError("Business verification required");
        }
    }, [physicalGateActive, step]);

    function goToStep(next: number) {
        if (
            !isAdminMode &&
            form.product_type === "physical" &&
            !businessVerified &&
            next > 1
        ) {
            setError("Business verification required");
            setStep(1);
            return;
        }
        setError(null);
        setStep(next);
    }

    async function startBusinessVerification() {
        await refreshBusinessVerificationStatus();
    }

    function handleChange(field: string, value: unknown) {
        setForm(prev => {
            const updated = { ...prev, [field]: value };

            if (field === "discount_enabled" && value === false) {
                updated.compare_at_price = "";
                updated.discount_label = "";
                updated.is_flash_deal = false;
            }

            if (field === "name" && !isEdit) updated.slug = slugify(value as string);

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
                    updated.currency = "USD";
                    updated.is_flash_deal = false;
                    updated.button_text = "Buy Now";
                } else if (!updated.pricing_type) {
                    updated.pricing_type = "one_time";
                }

                const currentCat = categories.find(c => c.id === updated.category_id);
                if (currentCat) {
                    const ct = currentCat.category_type;
                    if (isDigital && ct === "physical") updated.category_id = "";
                    if (!isDigital && ct === "digital") updated.category_id = "";
                }
                // Keep selection so Business Verification gate can render when Physical is chosen
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
        if (!isAdminMode && !vendor) { setError("Seller account required."); return; }
        if (!isAdminMode && form.product_type === "physical" && !businessVerified) {
            setError("Business verification required");
            setStep(1);
            return;
        }
        if (!form.name.trim()) { setError("Product name is required."); return; }
        const price = parseFloat(form.price) || 0;
        if (price < 0) { setError("Price cannot be negative."); return; }

        if (form.discount_enabled) {
            const compareAt = parseFloat(form.compare_at_price) || 0;
            const hasLabel = !!form.discount_label.trim();
            const hasCompare = compareAt > price;
            if (!hasLabel && !hasCompare && !form.is_flash_deal) {
                setError("Set an original price, badge label, or enable flash deal for the discount.");
                return;
            }
            if (compareAt > 0 && compareAt <= price) {
                setError("Original price must be higher than the sale price.");
                return;
            }
        }

        startTransition(async () => {
            const supabase = createClient();

            const isDigital = form.product_type === "digital";

            const resolvedProductType: string = isDigital
                ? (form.product_subtype && PRODUCT_SUBTYPES.some(s => s.id === form.product_subtype)
                    ? form.product_subtype
                    : "digital")
                : "physical";

            const billingPeriod =
                isDigital && form.pricing_type === "recurring" ? form.billing_period : null;

            const compareAt = parseFloat(form.compare_at_price) || 0;
            const discountActive = form.discount_enabled && price > 0;
            const resolvedCompareAt =
                discountActive && compareAt > price ? compareAt : null;
            const resolvedDiscountLabel =
                discountActive && form.discount_label.trim() ? form.discount_label.trim() : null;
            const resolvedFlashDeal = discountActive && form.is_flash_deal;

            const payload: AdminProductUpdateInput = {
                name: form.name,
                slug: form.slug || slugify(form.name),
                short_description: form.short_description || null,
                description: form.description || null,
                product_type: resolvedProductType,
                status: form.status,
                is_active: form.status === "active",
                price,
                currency: "USD",
                pricing_type: isDigital ? form.pricing_type : "one_time",
                billing_period: billingPeriod,
                category_id: form.category_id || null,
                is_digital: isDigital,
                requires_shipping: !isDigital,
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
                show_author: form.show_author,
                show_reviews: form.show_reviews,
                enable_discussions: form.enable_discussions,
                compare_at_price: resolvedCompareAt,
                discount_label: resolvedDiscountLabel,
                is_flash_deal: resolvedFlashDeal,
            };

            if (isAdminMode && isEdit && productId) {
                const result = await updateAdminProduct(productId, payload);
                if (!result.success) {
                    setError("error" in result ? result.error : "Failed to save product.");
                    return;
                }
                const videoResult = await saveProductVideos(productId, form.videoUrls, { asAdmin: true });
                if (!videoResult.success) {
                    setError(videoResult.error ?? "Product saved but videos failed to update.");
                    return;
                }
                setSuccessMessage("Product saved");
                setSuccess(true);
                setTimeout(() => router.push(listHref), 1800);
                return;
            }

            // Vendor create/update — server-authorized (physical gate + review status)
            const intent = step === 4 ? "submit" : "draft";
            const result = await upsertSellerProduct({
                id: isEdit ? productId : undefined,
                name: form.name,
                slug: form.slug || slugify(form.name),
                short_description: form.short_description || null,
                description: form.description || null,
                product_type: isDigital ? "digital" : "physical",
                product_subtype: isDigital ? form.product_subtype || null : null,
                price,
                currency: "USD",
                pricing_type: isDigital ? form.pricing_type : "one_time",
                billing_period: billingPeriod,
                category_id: form.category_id || null,
                digital_file_url: isDigital ? (form.digital_file_url || null) : null,
                track_inventory: !isDigital && form.track_inventory,
                inventory_quantity: isDigital ? 0 : parseInt(form.inventory_quantity || "0"),
                weight: !isDigital ? (parseFloat(form.weight) || null) : null,
                dimensions: !isDigital ? (form.dimensions || null) : null,
                affiliate_enabled: form.affiliate_enabled,
                affiliate_commission_rate: form.affiliate_enabled
                    ? parseFloat(form.affiliate_commission_rate || "10")
                    : null,
                button_text: form.button_text || null,
                tags: form.tags
                    ? form.tags.split(",").map(t => t.trim()).filter(Boolean)
                    : null,
                images: form.images,
                show_author: form.show_author,
                show_reviews: form.show_reviews,
                enable_discussions: form.enable_discussions,
                compare_at_price: resolvedCompareAt,
                discount_label: resolvedDiscountLabel,
                is_flash_deal: resolvedFlashDeal,
                intent,
                acquisition_model: isDigital ? (form.acquisition_model as "original_vendor_product") : null,
                affiliate_destination_url: form.affiliate_destination_url || null,
                rightsholder_name: form.rightsholder_name || null,
                buyer_license_summary: form.buyer_license_summary || null,
                refund_policy_note: form.refund_policy_note || null,
                compatibility_notes: form.compatibility_notes || null,
                update_policy: form.update_policy || null,
                content_language: form.content_language || null,
                intended_audience: form.intended_audience || null,
                declarations_accepted: form.declarations_accepted,
                file_name: form.file_name || null,
                file_mime: form.file_mime || null,
                file_size_bytes: form.file_size_bytes ? Number(form.file_size_bytes) : null,
                evidence_url: form.evidence_url || null,
                evidence_file_name: form.evidence_file_name || null,
            });

            if (!result.success) {
                setError(result.error);
                return;
            }

            const savedProductId = result.id;
            if (savedProductId) {
                const videoResult = await saveProductVideos(savedProductId, form.videoUrls);
                if (!videoResult.success) {
                    setError(videoResult.error ?? "Product saved but videos failed to update.");
                    return;
                }
            }

            setSuccessMessage(result.message);
            setSuccess(true);
            setTimeout(() => router.push(listHref), 1800);
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
                    {successMessage.includes("review")
                        ? "Submitted for review"
                        : isEdit
                          ? "Changes saved!"
                          : "Product saved"}
                </p>
                <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
                    {successMessage || `Redirecting to ${isAdminMode ? "products…" : "your products…"}`}
                </p>
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
                            href={listHref}
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
                                    onClick={() => goToStep(s.id)}
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
                            onClick={() => router.push("/marketplace")}
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
                                onClick={() => goToStep(step + 1)}
                                disabled={physicalGateActive}
                                aria-disabled={physicalGateActive}
                                title={
                                    physicalGateActive
                                        ? "Verify your business to continue with physical products"
                                        : undefined
                                }
                                className="flex items-center gap-1.5 h-8 min-h-[44px] sm:min-h-0 px-4 text-xs font-semibold text-white transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                                style={{ borderRadius: "var(--radius-sm)", background: "var(--color-accent)" }}
                                onMouseEnter={e => {
                                    if (!physicalGateActive) e.currentTarget.style.opacity = "0.85";
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.opacity = physicalGateActive ? "0.45" : "1";
                                }}
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
                                {isPending ? (isEdit ? "Saving…" : "Submitting…") : (isEdit ? "Save" : "Submit")}
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
                            {step === 1 && (
                                <StepDetails
                                    form={form}
                                    handleChange={handleChange}
                                    categories={categories}
                                    handleImageUpload={handleImageUpload}
                                    removeImage={removeImage}
                                    business={
                                        isAdminMode
                                            ? { verified: true, key: "verified", label: "Business verified" }
                                            : businessUi
                                    }
                                    onContinueDigital={() => handleChange("product_type", "digital")}
                                    onVerifyBusiness={startBusinessVerification}
                                />
                            )}
                            {step === 2 && <StepPricing form={form} handleChange={handleChange} />}
                            {step === 3 && <StepSettings form={form} handleChange={handleChange} />}
                            {step === 4 && <StepPublish form={form} isPending={isPending} handleSubmit={handleSubmit} isEdit={isEdit} />}
                        </div>

                        {/* footer */}
                        <div
                            className="flex items-center justify-between px-6 sm:px-8 py-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:pb-4"
                            style={{ borderTop: "1px solid var(--color-border)" }}
                        >
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
                                        onClick={() => goToStep(s.id)}
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
                                    onClick={() => goToStep(Math.min(4, step + 1))}
                                    disabled={physicalGateActive}
                                    aria-disabled={physicalGateActive}
                                    title={
                                        physicalGateActive
                                            ? "Verify your business to continue with physical products"
                                            : undefined
                                    }
                                    className="flex items-center gap-1 h-11 min-h-[44px] px-4 text-xs font-semibold text-white transition-all disabled:opacity-45 disabled:cursor-not-allowed"
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
                                    {isPending ? "…" : (isEdit ? "Save" : "Submit")}
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