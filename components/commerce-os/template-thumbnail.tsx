import type { ThemeSettings } from "@/lib/commerce-os/themes/registry";
import type { TemplateComposition } from "@/lib/commerce-os/themes/store-template";

/** Miniature of a template. Pass `composition` to draw that homepage stack. */
export function TemplateThumbnail({
  settings,
  label,
  composition,
}: {
  settings: ThemeSettings;
  label: string;
  composition?: TemplateComposition[];
}) {
  const columns = Math.min(settings.productGridColumns || 4, 4);
  const surface = settings.surfaceColor || "#FFFFFF";
  const radius = settings.cardRadius || "12px";
  if (!composition || composition.length === 0) {
    return (
      <div
        className="overflow-hidden rounded-xl border border-black/10"
        style={{ background: settings.backgroundColor, color: settings.textColor }}
        aria-hidden
      >
        <div className="h-2" style={{ background: settings.announcementBackground || "#0F172A" }} />
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: settings.headerBackground || "#FFFFFF" }}
        >
          <span className="h-4 w-4 rounded-full" style={{ background: settings.primaryColor }} />
          <span className="text-[10px] font-semibold">{label}</span>
        </div>
        <div
          className="mx-3 mt-3 rounded-lg p-3"
          style={{ background: surface, borderRadius: radius }}
        >
          <div className="h-2 w-2/3 rounded" style={{ background: settings.textColor, opacity: 0.85 }} />
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
                background: surface,
                borderRadius: radius,
                boxShadow: settings.shadow === "none" ? undefined : "0 1px 2px rgba(0,0,0,0.08)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      className="overflow-hidden rounded-xl border border-black/10"
      style={{ background: settings.backgroundColor, color: settings.textColor }}
      aria-hidden
    >
      {composition.includes("bar") ? (
        <div className="h-2" style={{ background: settings.announcementBackground || "#0F172A" }} />
      ) : null}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: settings.headerBackground || "#FFFFFF" }}
      >
        <span className="h-4 w-4 rounded-full" style={{ background: settings.primaryColor }} />
        <span className="truncate text-[10px] font-semibold">{label}</span>
      </div>
      <div className="space-y-2 px-3 py-3">
        {composition.map((mark, index) => {
          if (mark === "bar") return null;
          if (mark === "hero" || mark === "hero-center" || mark === "hero-split") {
            const split = mark === "hero-split";
            const center = mark === "hero-center";
            return (
              <div
                key={`${mark}-${index}`}
                className={split ? "grid grid-cols-2 gap-2" : ""}
                style={{
                  background: surface,
                  borderRadius: radius,
                  padding: 10,
                }}
              >
                <div className={center ? "mx-auto w-2/3" : ""}>
                  <div className="h-2 rounded" style={{ background: settings.textColor, opacity: 0.85 }} />
                  <div
                    className="mt-1.5 h-1.5 w-1/2 rounded"
                    style={{ background: settings.mutedTextColor || "#6B7280", opacity: 0.7 }}
                  />
                  <div
                    className={`mt-2 h-4 w-10 ${center ? "mx-auto" : ""}`}
                    style={{
                      background: settings.buttonColor || settings.primaryColor,
                      borderRadius: settings.buttonRadius || "999px",
                    }}
                  />
                </div>
                {split ? (
                  <div className="min-h-12 rounded" style={{ background: settings.primaryColor, opacity: 0.2 }} />
                ) : null}
              </div>
            );
          }
          if (mark === "collections") {
            return (
              <div key={`${mark}-${index}`} className="flex gap-1">
                {Array.from({ length: 3 }).map((_, pill) => (
                  <div
                    key={pill}
                    className="h-3 flex-1"
                    style={{ background: surface, borderRadius: radius }}
                  />
                ))}
              </div>
            );
          }
          if (mark === "note") {
            return (
              <div
                key={`${mark}-${index}`}
                className="h-3"
                style={{ background: settings.primaryColor, opacity: 0.15, borderRadius: radius }}
              />
            );
          }
          if (mark === "rail") {
            return (
              <div key={`${mark}-${index}`} className="flex gap-1 overflow-hidden">
                {Array.from({ length: 4 }).map((_, item) => (
                  <div
                    key={item}
                    className="h-8 w-8 shrink-0"
                    style={{ background: surface, borderRadius: radius }}
                  />
                ))}
              </div>
            );
          }
          return (
            <div
              key={`${mark}-${index}`}
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, item) => (
                <div
                  key={item}
                  className="aspect-square"
                  style={{ background: surface, borderRadius: radius }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
