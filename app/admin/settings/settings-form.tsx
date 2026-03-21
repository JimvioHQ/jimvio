"use client";

import React, { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ResolvedPlatformSettings, TrustBarItem } from "@/lib/platform-settings-shared";
import { savePlatformSettingsAction } from "@/lib/actions/admin-platform-settings";
import { toast } from "sonner";

function linesToList(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function listToLines(list: string[]): string {
  return list.join("\n");
}

export default function AdminPlatformSettingsForm({ initial }: { initial: ResolvedPlatformSettings }) {
  const [fees, setFees] = useState(initial.fees);
  const [social, setSocial] = useState(initial.social_proof);
  const [affiliatePropLines, setAffiliatePropLines] = useState(listToLines(initial.marketing.affiliate_value_props));
  const [trustBar, setTrustBar] = useState<TrustBarItem[]>(
    initial.marketing.trust_bar.length > 0 ? initial.marketing.trust_bar : []
  );
  const [contact, setContact] = useState(initial.contact);
  const [pending, startTransition] = useTransition();

  const updateTrust = (i: number, field: keyof TrustBarItem, value: string) => {
    setTrustBar((rows) => {
      const next = [...rows];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const addTrustRow = () => setTrustBar((rows) => [...rows, { title: "", desc: "" }]);
  const removeTrustRow = (i: number) => setTrustBar((rows) => rows.filter((_, j) => j !== i));

  const submit = () => {
    const payload: ResolvedPlatformSettings = {
      fees,
      social_proof: social,
      marketing: {
        ...initial.marketing,
        trending_search_keywords: [],
        affiliate_value_props: linesToList(affiliatePropLines),
        trust_bar: trustBar.filter((t) => t.title.trim() && t.desc.trim()),
      },
      contact,
    };
    if (payload.marketing.affiliate_value_props.length === 0) {
      toast.error("Add at least one affiliate value line");
      return;
    }
    if (payload.marketing.trust_bar.length === 0) {
      toast.error("Add at least one trust bar item");
      return;
    }

    startTransition(async () => {
      const res = await savePlatformSettingsAction(payload);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Settings saved");
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Platform Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Fees, social proof, marketing copy, and contact links (stored in{" "}
          <code className="text-xs">platform_settings</code>).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Fees & commission defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 max-w-3xl">
          <div className="grid gap-2">
            <Label>Minimum payout (RWF)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              className="rounded-xl"
              value={fees.min_payout_rwf}
              onChange={(e) => setFees((f) => ({ ...f, min_payout_rwf: Number(e.target.value) || 0 }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Default affiliate commission (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="rounded-xl"
              value={fees.default_affiliate_commission_percent}
              onChange={(e) =>
                setFees((f) => ({ ...f, default_affiliate_commission_percent: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Shopify platform commission default (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="rounded-xl"
              value={fees.shopify_default_platform_commission_percent ?? ""}
              placeholder="8"
              onChange={(e) =>
                setFees((f) => ({
                  ...f,
                  shopify_default_platform_commission_percent:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Platform fee (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="rounded-xl"
              value={fees.platform_fee_percent}
              onChange={(e) => setFees((f) => ({ ...f, platform_fee_percent: Number(e.target.value) || 0 }))}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Platform fixed fee per order (RWF)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              className="rounded-xl"
              value={fees.platform_fee_fixed_rwf}
              onChange={(e) => setFees((f) => ({ ...f, platform_fee_fixed_rwf: Number(e.target.value) || 0 }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Social proof (display)</CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">
            Shown when live counts are missing or alongside real vendor/product totals.
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 max-w-3xl">
          <div className="grid gap-2">
            <Label>Success rate label</Label>
            <Input className="rounded-xl" value={social.success_rate_display} onChange={(e) => setSocial((s) => ({ ...s, success_rate_display: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Countries label</Label>
            <Input className="rounded-xl" value={social.countries_display} onChange={(e) => setSocial((s) => ({ ...s, countries_display: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Fallback vendors label</Label>
            <Input className="rounded-xl" value={social.fallback_verified_vendors} onChange={(e) => setSocial((s) => ({ ...s, fallback_verified_vendors: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Fallback products label</Label>
            <Input className="rounded-xl" value={social.fallback_total_products} onChange={(e) => setSocial((s) => ({ ...s, fallback_total_products: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Marketing copy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 max-w-3xl">
          <div className="grid gap-2">
            <Label>Homepage affiliate bullets (one per line)</Label>
            <Textarea className="rounded-xl min-h-[90px] font-mono text-sm" value={affiliatePropLines} onChange={(e) => setAffiliatePropLines(e.target.value)} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Trust bar items</Label>
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={addTrustRow}>
                Add row
              </Button>
            </div>
            <div className="space-y-3">
              {trustBar.map((row, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-2 items-start">
                  <Input
                    className="rounded-xl flex-1"
                    placeholder="Title"
                    value={row.title}
                    onChange={(e) => updateTrust(i, "title", e.target.value)}
                  />
                  <Input
                    className="rounded-xl flex-[2]"
                    placeholder="Description"
                    value={row.desc}
                    onChange={(e) => updateTrust(i, "desc", e.target.value)}
                  />
                  <Button type="button" variant="ghost" size="sm" className="shrink-0 text-red-600" onClick={() => removeTrustRow(i)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact & social</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 max-w-3xl">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Support email</Label>
            <Input className="rounded-xl" value={contact.support_email} onChange={(e) => setContact((c) => ({ ...c, support_email: e.target.value }))} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Info / general email</Label>
            <Input className="rounded-xl" value={contact.info_email} onChange={(e) => setContact((c) => ({ ...c, info_email: e.target.value }))} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>X (Twitter) URL</Label>
            <Input className="rounded-xl" value={contact.social_x} onChange={(e) => setContact((c) => ({ ...c, social_x: e.target.value }))} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>YouTube URL</Label>
            <Input className="rounded-xl" value={contact.social_youtube} onChange={(e) => setContact((c) => ({ ...c, social_youtube: e.target.value }))} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Instagram URL</Label>
            <Input className="rounded-xl" value={contact.social_instagram} onChange={(e) => setContact((c) => ({ ...c, social_instagram: e.target.value }))} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>TikTok URL</Label>
            <Input className="rounded-xl" value={contact.social_tiktok} onChange={(e) => setContact((c) => ({ ...c, social_tiktok: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>HQ address line 1</Label>
            <Input className="rounded-xl" value={contact.hq_line1} onChange={(e) => setContact((c) => ({ ...c, hq_line1: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>HQ address line 2</Label>
            <Input className="rounded-xl" value={contact.hq_line2} onChange={(e) => setContact((c) => ({ ...c, hq_line2: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Button className="rounded-xl" size="lg" onClick={submit} disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
