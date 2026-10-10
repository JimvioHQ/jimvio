import type { ThemeSettings } from "@/lib/commerce-os/themes/registry";

/** Miniature of a template using its real colors, type, and layout tokens. */
export function TemplateThumbnail({
  settings,
  label,
}: {
  settings: ThemeSettings;
  label: string;
}) {
  const columns = Math.min(settings.productGridColumns || 4, 4);
  return (
    <div
      className="overflow-hidden rounded-xl border border-black/10"
      style={{ background: settings.backgroundColor, color: settings.textColor }}
      aria-hidden
    >
      <div
        className="h-2"
        style={{ background: settings.announcementBackground || "#0F172A" }}
      />
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: settings.headerBackground || "#FFFFFF" }}
      >
        <span
          className="h-4 w-4 rounded-full"
          style={{ background: settings.primaryColor }}
        />
        <span className="text-[10px] font-semibold">{label}</span>
      </div>
      <div
        className="mx-3 mt-3 rounded-lg p-3"
        style={{
          background: settings.surfaceColor || "#FFFFFF",
          borderRadius: settings.cardRadius || "12px",
        }}
      >
        <div
          className="h-2 w-2/3 rounded"
          style={{ background: settings.textColor, opacity: 0.85 }}
        />
        <div
          className="mt-1.5 h-1.5 w-1/2 rounded"
          style={{ background: settings.mutedTextColor || "#6B7280", opacity: 0.7 }}
        />
        <div
          className="mt-3 h-5 w-16"
          style={{
            background: settings.buttonColor || settings.primaryColor,
            borderRadius: settings.buttonRadius || "999px",
          }}
        />
      </div>
      <div
        className="grid gap-1.5 px-3 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={index}
            className="aspect-square"
            style={{
              background: settings.surfaceColor || "#FFFFFF",
              borderRadius: settings.cardRadius || "12px",
              boxShadow:
                settings.shadow === "none" ? undefined : "0 1px 2px rgba(0,0,0,0.08)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
