"use client";

import { useState, useTransition } from "react";
import { Truck } from "lucide-react";
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
import { saveSupplierSourcesAction } from "@/lib/actions/admin-supplier-sources";
import {
    DEFAULT_SUPPLIER_SOURCES,
    mergeSupplierSources,
    type SupplierSourcesSettings,
} from "@/lib/sources/supplier-settings-shared";

const CHANNELS: {
    key: keyof SupplierSourcesSettings;
    label: string;
    hint: string;
}[] = [
    { key: "vendor", label: "Direct vendors", hint: "Products listed by verified sellers on Jimvio" },
    { key: "shopify", label: "Shopify", hint: "Vendor-connected Shopify stores" },
    { key: "cj", label: "CJ Dropshipping", hint: "Catalog and fulfillment via CJ" },
];

export function SuppliersForm({ initial }: { initial: unknown }) {
    const initialSettings = mergeSupplierSources(initial);
    const [settings, setSettings] = useState<SupplierSourcesSettings>(initialSettings);
    const [dirty, setDirty] = useState(false);
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<ToastMsg | null>(null);

    useBeforeUnload(dirty);

    function setChannel<K extends keyof SupplierChannelPatch>(
        channel: keyof SupplierSourcesSettings,
        key: K,
        value: SupplierChannelPatch[K]
    ) {
        setSettings((prev) => ({
            ...prev,
            [channel]: { ...prev[channel], [key]: value },
        }));
        setDirty(true);
    }

    function handleSave() {
        startTransition(async () => {
            const result = await saveSupplierSourcesAction(settings);
            if ("error" in result) {
                setToast({ msg: result.error, type: "err" });
                return;
            }
            setToast({ msg: "Supplier settings saved", type: "ok" });
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
                        <Truck className="size-4" style={{ color: "var(--color-accent)" }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Supplier channels</h2>
                        <p className="text-[12px] text-muted-foreground">
                            Enable product sources and set default platform commission per channel
                        </p>
                    </div>
                </header>

                <Grid cols={1}>
                    {CHANNELS.map(({ key, label, hint }) => (
                        <Card key={key}>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</p>
                                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{hint}</p>
                                </div>
                                <Toggle
                                    checked={settings[key].enabled}
                                    onChange={(v) => setChannel(key, "enabled", v)}
                                    label={settings[key].enabled ? "Channel enabled" : "Channel disabled"}
                                    description={
                                        settings[key].enabled
                                            ? "Buyers can discover and purchase from this source"
                                            : "New imports and checkout from this source are blocked"
                                    }
                                />
                                <Field
                                    label="Platform commission (%)"
                                    hint="Deducted from gross line revenue before vendor wallet credit"
                                >
                                    <NumInput
                                        value={settings[key].platform_commission_percent}
                                        onChange={(v) =>
                                            setChannel(key, "platform_commission_percent", v ?? 0)
                                        }
                                        min={0}
                                        max={100}
                                        step={0.5}
                                    />
                                </Field>
                            </div>
                        </Card>
                    ))}
                </Grid>

                <Divider label="Defaults" />
                <p className="text-[12px] text-[var(--color-text-muted)] -mt-2">
                    Reset values: vendor {DEFAULT_SUPPLIER_SOURCES.vendor.platform_commission_percent}% ·
                    Shopify {DEFAULT_SUPPLIER_SOURCES.shopify.platform_commission_percent}% ·
                    CJ {DEFAULT_SUPPLIER_SOURCES.cj.platform_commission_percent}%
                </p>

                <div className="h-20" />
            </div>

            {dirty && (
                <SaveBar
                    pending={pending}
                    onSave={handleSave}
                    onDiscard={() => {
                        setSettings(initialSettings);
                        setDirty(false);
                    }}
                />
            )}
        </>
    );
}

type SupplierChannelPatch = SupplierSourcesSettings[keyof SupplierSourcesSettings];
