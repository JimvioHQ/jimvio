"use client";

import { Switch } from "@/components/ui/switch";
import type { ImportSettings, PublishVisibility } from "@/lib/cj/import-intelligence/types";
import { cn } from "@/lib/utils";

const TOGGLE_SETTINGS: Array<{
  key: keyof Pick<
    ImportSettings,
    | "importVideos"
    | "importDescriptionImages"
    | "importHtmlDescription"
    | "importVariants"
    | "importSpecifications"
    | "importReviews"
    | "importSeoMetadata"
    | "uploadImagesToCloudinary"
    | "uploadVideosToCloudinary"
  >;
  label: string;
}> = [
  { key: "importVideos", label: "Import Videos" },
  { key: "importDescriptionImages", label: "Import Description Images" },
  { key: "importHtmlDescription", label: "Import HTML Description" },
  { key: "importVariants", label: "Import Variants" },
  { key: "importSpecifications", label: "Import Specifications" },
  { key: "importReviews", label: "Import Reviews" },
  { key: "importSeoMetadata", label: "Import SEO Metadata" },
  { key: "uploadImagesToCloudinary", label: "Upload Images To Cloudinary" },
  { key: "uploadVideosToCloudinary", label: "Upload Videos To Cloudinary" },
];

export function ImportSettingsPanel({
  settings,
  onChange,
  compact = false,
  className,
}: {
  settings: ImportSettings;
  onChange: (settings: ImportSettings) => void;
  compact?: boolean;
  className?: string;
}) {
  const rules = settings.autoPublishRules;

  return (
    <div
      className={cn(
        "rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl",
        compact ? "p-3 space-y-3" : "p-4 space-y-4",
        className
      )}
    >
      <section>
        <h3 className={cn("font-semibold text-[var(--color-text-primary)]", compact ? "text-[12px] mb-2" : "text-[13px] mb-3")}>
          Import Content
        </h3>
        <div className={cn("space-y-2", compact && "space-y-1.5")}>
          {TOGGLE_SETTINGS.map(({ key, label }) => (
            <ToggleRow
              key={key}
              label={label}
              checked={settings[key]}
              compact={compact}
              onChange={(checked) => onChange({ ...settings, [key]: checked })}
            />
          ))}
        </div>
      </section>

      <section className="pt-2 border-t border-[var(--color-border)]">
        <h3 className="text-[12px] font-semibold mb-2">Marketplace Visibility</h3>
        <div className="flex flex-wrap gap-3 text-[11px]">
          {(["public", "hidden", "scheduled"] as PublishVisibility[]).map((v) => (
            <label key={v} className="inline-flex items-center gap-1.5 cursor-pointer capitalize">
              <input
                type="radio"
                name="visibility"
                checked={settings.publishVisibility === v}
                onChange={() => onChange({ ...settings, publishVisibility: v })}
                className="accent-[#FF5A1F]"
              />
              {v}
            </label>
          ))}
        </div>
        {settings.publishVisibility === "scheduled" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={settings.scheduledAt ?? ""}
              onChange={(e) => onChange({ ...settings, scheduledAt: e.target.value })}
              className="h-8 px-2 text-[11px] rounded-sm border border-[var(--color-border)] col-span-2"
            />
            <input
              type="text"
              placeholder="Timezone (e.g. Africa/Kigali)"
              value={settings.scheduledTimezone ?? ""}
              onChange={(e) => onChange({ ...settings, scheduledTimezone: e.target.value })}
              className="h-8 px-2 text-[11px] rounded-sm border border-[var(--color-border)] col-span-2"
            />
          </div>
        )}
      </section>

      <section className="pt-2 border-t border-[var(--color-border)]">
        <h3 className="text-[12px] font-semibold mb-2">Auto-Publish Rules</h3>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
          Auto mode publishes when all rules pass; otherwise imports as draft.
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <label className="space-y-0.5">
            <span className="text-[var(--color-text-muted)]">Min Health</span>
            <input
              type="number"
              min={0}
              max={100}
              value={rules.minHealthScore}
              onChange={(e) =>
                onChange({
                  ...settings,
                  autoPublishRules: { ...rules, minHealthScore: Number(e.target.value) || 0 },
                })
              }
              className="w-full h-7 px-2 rounded-sm border border-[var(--color-border)] tabular-nums"
            />
          </label>
          <label className="space-y-0.5">
            <span className="text-[var(--color-text-muted)]">Min Margin %</span>
            <input
              type="number"
              min={0}
              value={rules.minMargin}
              onChange={(e) =>
                onChange({
                  ...settings,
                  autoPublishRules: { ...rules, minMargin: Number(e.target.value) || 0 },
                })
              }
              className="w-full h-7 px-2 rounded-sm border border-[var(--color-border)] tabular-nums"
            />
          </label>
          <label className="space-y-0.5">
            <span className="text-[var(--color-text-muted)]">Max Ship Days</span>
            <input
              type="number"
              min={1}
              value={rules.maxShippingDays}
              onChange={(e) =>
                onChange({
                  ...settings,
                  autoPublishRules: { ...rules, maxShippingDays: Number(e.target.value) || 10 },
                })
              }
              className="w-full h-7 px-2 rounded-sm border border-[var(--color-border)] tabular-nums"
            />
          </label>
        </div>
        <div className="mt-2 space-y-1.5">
          <ToggleRow
            label="Verified Supplier"
            checked={rules.requireVerified}
            compact
            onChange={(checked) =>
              onChange({
                ...settings,
                autoPublishRules: { ...rules, requireVerified: checked },
              })
            }
          />
          <ToggleRow
            label="Has Images"
            checked={rules.requireImages}
            compact
            onChange={(checked) =>
              onChange({
                ...settings,
                autoPublishRules: { ...rules, requireImages: checked },
              })
            }
          />
          <ToggleRow
            label="Has Description"
            checked={rules.requireDescription}
            compact
            onChange={(checked) =>
              onChange({
                ...settings,
                autoPublishRules: { ...rules, requireDescription: checked },
              })
            }
          />
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  compact,
  onChange,
}: {
  label: string;
  checked: boolean;
  compact?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className={cn("font-medium text-[var(--color-text-primary)]", compact ? "text-[11px]" : "text-[12px]")}>
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
