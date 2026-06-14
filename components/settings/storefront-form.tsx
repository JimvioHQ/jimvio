"use client";

import { useState, useTransition } from "react";
import { Plus, Store, X } from "lucide-react";
import {
    BrandBtn,
    Divider,
    Field,
    Grid,
    SaveBar,
    TextInput,
    Toast,
    type ToastMsg,
    useBeforeUnload,
} from "@/components/admin/form-primitive";
import { updatePlatformSettings } from "@/lib/actions/security";
import {
    PLATFORM_SETTINGS_DEFAULTS,
    type ContactSettings,
    type MarketingSettings,
    type SocialProofSettings,
    type TrustBarItem,
} from "@/lib/platform-settings-shared";
import { Textarea } from "@/components/ui/textarea";

function mergeSocial(raw: unknown): SocialProofSettings {
    return {
        ...PLATFORM_SETTINGS_DEFAULTS.social_proof,
        ...(typeof raw === "object" && raw ? (raw as Partial<SocialProofSettings>) : {}),
    };
}

function mergeMarketing(raw: unknown): MarketingSettings {
    const base = PLATFORM_SETTINGS_DEFAULTS.marketing;
    const patch = typeof raw === "object" && raw ? (raw as Partial<MarketingSettings>) : {};
    return {
        ...base,
        ...patch,
        trending_search_keywords: Array.isArray(patch.trending_search_keywords)
            ? patch.trending_search_keywords
            : base.trending_search_keywords,
        affiliate_value_props: Array.isArray(patch.affiliate_value_props)
            ? patch.affiliate_value_props
            : base.affiliate_value_props,
        trust_bar: Array.isArray(patch.trust_bar) && patch.trust_bar.length > 0
            ? patch.trust_bar
            : base.trust_bar,
        nav_links: Array.isArray(patch.nav_links) && patch.nav_links.length > 0
            ? patch.nav_links
            : base.nav_links,
        primary_cta: patch.primary_cta?.label && patch.primary_cta?.href
            ? patch.primary_cta
            : base.primary_cta,
        search_placeholder: patch.search_placeholder?.trim() || base.search_placeholder,
        locale_strip: patch.locale_strip ?? base.locale_strip,
        mobile_search_subtitle: patch.mobile_search_subtitle?.trim() || base.mobile_search_subtitle,
    };
}

function mergeContact(raw: unknown): ContactSettings {
    return {
        ...PLATFORM_SETTINGS_DEFAULTS.contact,
        ...(typeof raw === "object" && raw ? (raw as Partial<ContactSettings>) : {}),
    };
}

export function StorefrontForm({ initial }: { initial: Record<string, unknown> }) {
    const initialSocial = mergeSocial(initial.social_proof);
    const initialMarketing = mergeMarketing(initial.marketing);
    const initialContact = mergeContact(initial.contact);

    const [social, setSocial] = useState(initialSocial);
    const [marketing, setMarketing] = useState(initialMarketing);
    const [contact, setContact] = useState(initialContact);
    const [affiliateBullets, setAffiliateBullets] = useState(
        initialMarketing.affiliate_value_props.join("\n")
    );
    const [trendingKw, setTrendingKw] = useState(
        initialMarketing.trending_search_keywords.join(", ")
    );
    const [trustBar, setTrustBar] = useState<TrustBarItem[]>(initialMarketing.trust_bar);
    const [dirty, setDirty] = useState(false);
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<ToastMsg | null>(null);

    useBeforeUnload(dirty);

    function markDirty() {
        setDirty(true);
    }

    function handleSave() {
        startTransition(async () => {
            const nextMarketing: MarketingSettings = {
                ...marketing,
                affiliate_value_props: affiliateBullets
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                trending_search_keywords: trendingKw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                trust_bar: trustBar.filter((row) => row.title.trim() || row.desc.trim()),
            };

            const result = await updatePlatformSettings({
                social_proof: social,
                marketing: nextMarketing,
                contact,
            });

            if (!result.success) {
                setToast({ msg: result.error, type: "err" });
                return;
            }
            const failed = result.data?.failed ?? [];
            if (failed.length > 0) {
                setToast({ msg: `${failed.length} setting group(s) failed to save`, type: "err" });
                return;
            }
            setMarketing(nextMarketing);
            setToast({ msg: "Storefront settings saved", type: "ok" });
            setDirty(false);
        });
    }

    return (
        <>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <div className="space-y-8">
                <header className="flex items-center gap-3">
                    <div
                        className="size-9 rounded-lg flex items-center justify-center"
                        style={{ background: "var(--color-accent-light)" }}
                    >
                        <Store className="size-4" style={{ color: "var(--color-accent)" }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Storefront</h2>
                        <p className="text-[12px] text-muted-foreground">
                            Social proof, marketing copy, navigation, and contact details
                        </p>
                    </div>
                </header>

                <section className="space-y-4">
                    <Divider label="Social proof" />
                    <Grid cols={2}>
                        <Field label="Success rate label">
                            <TextInput
                                value={social.success_rate_display}
                                onChange={(v) => {
                                    setSocial((p) => ({ ...p, success_rate_display: v }));
                                    markDirty();
                                }}
                            />
                        </Field>
                        <Field label="Countries label">
                            <TextInput
                                value={social.countries_display}
                                onChange={(v) => {
                                    setSocial((p) => ({ ...p, countries_display: v }));
                                    markDirty();
                                }}
                            />
                        </Field>
                        <Field label="Fallback verified vendors">
                            <TextInput
                                value={social.fallback_verified_vendors}
                                onChange={(v) => {
                                    setSocial((p) => ({ ...p, fallback_verified_vendors: v }));
                                    markDirty();
                                }}
                            />
                        </Field>
                        <Field label="Fallback total products">
                            <TextInput
                                value={social.fallback_total_products}
                                onChange={(v) => {
                                    setSocial((p) => ({ ...p, fallback_total_products: v }));
                                    markDirty();
                                }}
                            />
                        </Field>
                    </Grid>
                </section>

                <section className="space-y-4">
                    <Divider label="Marketing" />
                    <Grid cols={2}>
                        <Field label="Search placeholder">
                            <TextInput
                                value={marketing.search_placeholder}
                                onChange={(v) => {
                                    setMarketing((p) => ({ ...p, search_placeholder: v }));
                                    markDirty();
                                }}
                            />
                        </Field>
                        <Field label="Locale strip" hint="Shown under search, e.g. EN · USD">
                            <TextInput
                                value={marketing.locale_strip ?? ""}
                                onChange={(v) => {
                                    setMarketing((p) => ({ ...p, locale_strip: v }));
                                    markDirty();
                                }}
                            />
                        </Field>
                        <Field label="Primary CTA label">
                            <TextInput
                                value={marketing.primary_cta.label}
                                onChange={(v) => {
                                    setMarketing((p) => ({
                                        ...p,
                                        primary_cta: { ...p.primary_cta, label: v },
                                    }));
                                    markDirty();
                                }}
                            />
                        </Field>
                        <Field label="Primary CTA link">
                            <TextInput
                                value={marketing.primary_cta.href}
                                onChange={(v) => {
                                    setMarketing((p) => ({
                                        ...p,
                                        primary_cta: { ...p.primary_cta, href: v },
                                    }));
                                    markDirty();
                                }}
                            />
                        </Field>
                    </Grid>
                    <Field label="Affiliate value propositions" hint="One bullet per line">
                        <Textarea
                            value={affiliateBullets}
                            onChange={(e) => {
                                setAffiliateBullets(e.target.value);
                                markDirty();
                            }}
                            className="min-h-[96px] text-[13px]"
                        />
                    </Field>
                    <Field label="Trending search keywords" hint="Comma-separated">
                        <TextInput
                            value={trendingKw}
                            onChange={(v) => {
                                setTrendingKw(v);
                                markDirty();
                            }}
                            placeholder="electronics, fashion, phones"
                        />
                    </Field>

                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-secondary)]">
                            Trust bar items
                        </p>
                        {trustBar.map((row, i) => (
                            <div key={i} className="flex gap-2 items-start">
                                <TextInput
                                    value={row.title}
                                    onChange={(v) => {
                                        setTrustBar((tb) =>
                                            tb.map((r, j) => (j === i ? { ...r, title: v } : r))
                                        );
                                        markDirty();
                                    }}
                                    placeholder="Title"
                                />
                                <TextInput
                                    value={row.desc}
                                    onChange={(v) => {
                                        setTrustBar((tb) =>
                                            tb.map((r, j) => (j === i ? { ...r, desc: v } : r))
                                        );
                                        markDirty();
                                    }}
                                    placeholder="Description"
                                />
                                <BrandBtn
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setTrustBar((tb) => tb.filter((_, j) => j !== i));
                                        markDirty();
                                    }}
                                >
                                    <X className="size-3.5" />
                                </BrandBtn>
                            </div>
                        ))}
                        <BrandBtn
                            variant="secondary"
                            size="sm"
                            icon={<Plus className="size-3.5" />}
                            onClick={() => {
                                setTrustBar((tb) => [...tb, { title: "", desc: "" }]);
                                markDirty();
                            }}
                        >
                            Add trust bar item
                        </BrandBtn>
                    </div>
                </section>

                <section className="space-y-4">
                    <Divider label="Contact & social" />
                    <Grid cols={2}>
                        <Field label="Support email">
                            <TextInput
                                value={contact.support_email}
                                onChange={(v) => {
                                    setContact((p) => ({ ...p, support_email: v }));
                                    markDirty();
                                }}
                            />
                        </Field>
                        <Field label="General info email">
                            <TextInput
                                value={contact.info_email}
                                onChange={(v) => {
                                    setContact((p) => ({ ...p, info_email: v }));
                                    markDirty();
                                }}
                            />
                        </Field>
                        <Field label="HQ address line 1">
                            <TextInput
                                value={contact.hq_line1}
                                onChange={(v) => {
                                    setContact((p) => ({ ...p, hq_line1: v }));
                                    markDirty();
                                }}
                            />
                        </Field>
                        <Field label="HQ address line 2">
                            <TextInput
                                value={contact.hq_line2}
                                onChange={(v) => {
                                    setContact((p) => ({ ...p, hq_line2: v }));
                                    markDirty();
                                }}
                            />
                        </Field>
                        <Field label="X (Twitter)">
                            <TextInput
                                value={contact.social_x}
                                onChange={(v) => {
                                    setContact((p) => ({ ...p, social_x: v }));
                                    markDirty();
                                }}
                                placeholder="https://"
                            />
                        </Field>
                        <Field label="YouTube">
                            <TextInput
                                value={contact.social_youtube}
                                onChange={(v) => {
                                    setContact((p) => ({ ...p, social_youtube: v }));
                                    markDirty();
                                }}
                                placeholder="https://"
                            />
                        </Field>
                        <Field label="Instagram">
                            <TextInput
                                value={contact.social_instagram}
                                onChange={(v) => {
                                    setContact((p) => ({ ...p, social_instagram: v }));
                                    markDirty();
                                }}
                                placeholder="https://"
                            />
                        </Field>
                        <Field label="TikTok">
                            <TextInput
                                value={contact.social_tiktok}
                                onChange={(v) => {
                                    setContact((p) => ({ ...p, social_tiktok: v }));
                                    markDirty();
                                }}
                                placeholder="https://"
                            />
                        </Field>
                    </Grid>
                </section>

                <div className="h-20" />
            </div>

            {dirty && (
                <SaveBar
                    pending={pending}
                    onSave={handleSave}
                    onDiscard={() => {
                        setSocial(initialSocial);
                        setMarketing(initialMarketing);
                        setContact(initialContact);
                        setAffiliateBullets(initialMarketing.affiliate_value_props.join("\n"));
                        setTrendingKw(initialMarketing.trending_search_keywords.join(", "));
                        setTrustBar(initialMarketing.trust_bar);
                        setDirty(false);
                    }}
                />
            )}
        </>
    );
}
