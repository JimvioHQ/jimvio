import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-700",
  neutral: "bg-[#F3F4F6] text-[#4B5563]",
  brand: "bg-[#FF5A1F]/10 text-[#FF5A1F]",
};

export function CommerceStatusBadge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone] || TONES.neutral,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function productStatusTone(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  if (s === "published" || s === "active") return "success" as const;
  if (s === "draft") return "warning" as const;
  if (s === "archived") return "neutral" as const;
  return "neutral" as const;
}

export function inventoryStatusTone(qty: number | null | undefined, tracked: boolean) {
  if (!tracked) return { label: "Not tracked", tone: "neutral" as const };
  const n = Number(qty ?? 0);
  if (n <= 0) return { label: "Out of stock", tone: "danger" as const };
  if (n <= 5) return { label: "Low stock", tone: "warning" as const };
  return { label: "In stock", tone: "success" as const };
}
