"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ToggleLeft } from "lucide-react";
import {
    Card,
    Divider,
    Field,
    Grid,
    NumInput,
    SaveBar,
    Toast,
    Toggle,
    type ToastMsg,
    useBeforeUnload,
} from "@/components/admin/form-primitive";
import { updatePlatformSettings } from "@/lib/actions/security";

type FeaturesSettings = {
    affiliate_enabled: boolean;
    influencer_enabled: boolean;
    ugc_enabled: boolean;
    short_video_enabled: boolean;
    community_enabled: boolean;
    buying_leads_enabled: boolean;
    maintenance_mode: boolean;
    review_hold_for_approval: boolean;
    vendor_self_registration: boolean;
};

type FraudSettings = {
    ugc_fraud_score_threshold: number;
    ugc_max_delta_views_per_day: number;
};

const DEFAULT_FEATURES: FeaturesSettings = {
    affiliate_enabled: true,
    influencer_enabled: true,
    ugc_enabled: true,
    short_video_enabled: true,
    community_enabled: true,
    buying_leads_enabled: true,
    maintenance_mode: false,
    review_hold_for_approval: false,
    vendor_self_registration: true,
};

const DEFAULT_FRAUD: FraudSettings = {
    ugc_fraud_score_threshold: 70,
    ugc_max_delta_views_per_day: 500_000,
};

const FEATURE_TOGGLES: {
    key: keyof FeaturesSettings;
    label: string;
    description: string;
    danger?: boolean;
}[] = [
    { key: "affiliate_enabled", label: "Affiliate programme", description: "Referral links and commission tracking" },
    { key: "influencer_enabled", label: "Influencer module", description: "Creator profiles and campaign tools" },
    { key: "ugc_enabled", label: "UGC campaigns", description: "Brand campaigns and submission payouts" },
    { key: "short_video_enabled", label: "Short videos", description: "Video feed and shoppable clips" },
    { key: "community_enabled", label: "Communities", description: "Paid communities and memberships" },
    { key: "buying_leads_enabled", label: "Buying leads", description: "Buyer RFQ marketplace" },
    { key: "vendor_self_registration", label: "Vendor self-registration", description: "Allow new sellers to apply without invite" },
    { key: "review_hold_for_approval", label: "Hold reviews for approval", description: "Product reviews require admin moderation" },
    {
        key: "maintenance_mode",
        label: "Maintenance mode",
        description: "Disable buyer-facing routes; admin access only",
        danger: true,
    },
];

export function FeaturesForm({ initial }: { initial: Record<string, unknown> }) {
    const initialFeatures = {
        ...DEFAULT_FEATURES,
        ...(typeof initial.features === "object" && initial.features
            ? (initial.features as Partial<FeaturesSettings>)
            : {}),
    };
    const initialFraud = {
        ...DEFAULT_FRAUD,
        ...(typeof initial.fraud === "object" && initial.fraud
            ? (initial.fraud as Partial<FraudSettings>)
            : {}),
    };

    const [features, setFeatures] = useState<FeaturesSettings>(initialFeatures);
    const [fraud, setFraud] = useState<FraudSettings>(initialFraud);
    const [dirty, setDirty] = useState(false);
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<ToastMsg | null>(null);

    useBeforeUnload(dirty);

    function setFeat<K extends keyof FeaturesSettings>(key: K, value: FeaturesSettings[K]) {
        setFeatures((prev) => ({ ...prev, [key]: value }));
        setDirty(true);
    }

    function setFrd<K extends keyof FraudSettings>(key: K, value: FraudSettings[K]) {
        setFraud((prev) => ({ ...prev, [key]: value }));
        setDirty(true);
    }

    function handleSave() {
        startTransition(async () => {
            const result = await updatePlatformSettings({ features, fraud });
            if (!result.success) {
                setToast({ msg: result.error, type: "err" });
                return;
            }
            const failed = result.data?.failed ?? [];
            if (failed.length > 0) {
                setToast({ msg: `${failed.length} setting group(s) failed to save`, type: "err" });
                return;
            }
            setToast({ msg: "Feature settings saved", type: "ok" });
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
                        <ToggleLeft className="size-4" style={{ color: "var(--color-accent)" }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Feature flags</h2>
                        <p className="text-[12px] text-muted-foreground">
                            Platform-wide modules and trust controls
                        </p>
                    </div>
                </header>

                <section className="space-y-3">
                    <Divider label="Modules" />
                    <Grid cols={1}>
                        {FEATURE_TOGGLES.filter((t) => t.key !== "maintenance_mode").map((item) => (
                            <Card key={item.key} padding="md">
                                <Toggle
                                    checked={features[item.key]}
                                    onChange={(v) => setFeat(item.key, v)}
                                    label={item.label}
                                    description={item.description}
                                />
                            </Card>
                        ))}
                    </Grid>
                </section>

                <section className="space-y-3">
                    <Divider label="Maintenance" />
                    <Card accent={features.maintenance_mode ? "warning" : "default"}>
                        <div className="flex items-start gap-3 mb-3">
                            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[12px] text-[var(--color-text-secondary)]">
                                When enabled, public pages show a maintenance screen and existing non-admin sessions are signed out. Only platform administrators can sign in.
                            </p>
                        </div>
                        <Toggle
                            checked={features.maintenance_mode}
                            onChange={(v) => setFeat("maintenance_mode", v)}
                            label="Enable maintenance mode"
                            danger
                        />
                    </Card>
                </section>

                <section className="space-y-3">
                    <Divider label="Fraud & UGC trust" />
                    <Grid cols={2}>
                        <Field
                            label="Fraud score auto-flag threshold"
                            hint="Submissions above this score (0–100) are flagged"
                        >
                            <NumInput
                                value={fraud.ugc_fraud_score_threshold}
                                onChange={(v) => setFrd("ugc_fraud_score_threshold", v ?? 70)}
                                min={0}
                                max={100}
                            />
                        </Field>
                        <Field
                            label="Max daily view delta"
                            hint="Sudden spike cap per submission"
                        >
                            <NumInput
                                value={fraud.ugc_max_delta_views_per_day}
                                onChange={(v) => setFrd("ugc_max_delta_views_per_day", v ?? 500_000)}
                                min={1000}
                                step={1000}
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
                        setFeatures(initialFeatures);
                        setFraud(initialFraud);
                        setDirty(false);
                    }}
                />
            )}
        </>
    );
}
