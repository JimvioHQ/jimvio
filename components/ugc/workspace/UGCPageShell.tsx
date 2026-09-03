"use client";

import { RefreshCw, Sparkles, FolderOpen, Lock, UserRound, Megaphone, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import { ugcStatusLabel, type UgcMessageKey } from "@/lib/ugc/i18n/messages";

export function UGCPageShell({
  title,
  subtitle,
  titleKey,
  subtitleKey,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  titleKey?: UgcMessageKey;
  subtitleKey?: UgcMessageKey;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const heading = titleKey ? t(titleKey) : title ?? "";
  const sub = subtitleKey ? t(subtitleKey) : subtitle;
  return (
    <div className="mx-auto max-w-[1280px] space-y-4 pb-8">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-snug tracking-tight text-[#111827] sm:text-[26px]">{heading}</h1>
          {sub ? <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">{sub}</p> : null}
        </div>
        {actions ? <div className="flex min-w-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function UGCPageLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-[16px] bg-[#F3F4F6]" />
      ))}
    </div>
  );
}

export function UGCPageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLocale();
  return (
    <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-6 text-center">
      <p className="text-sm font-semibold text-rose-800">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}

type EmptyIllustration = "default" | "campaigns" | "profile" | "lock" | "bell" | "analytics";

const ILLUSTRATIONS: Record<
  EmptyIllustration,
  { icon: typeof Sparkles; ring: string; iconClass: string }
> = {
  default: {
    icon: Sparkles,
    ring: "from-[#FFF4EF] to-[#FFE4D6]",
    iconClass: "text-[#FF5A1F]",
  },
  campaigns: {
    icon: Megaphone,
    ring: "from-[#FFF4EF] to-[#FFE4D6]",
    iconClass: "text-[#FF5A1F]",
  },
  profile: {
    icon: UserRound,
    ring: "from-[#EFF6FF] to-[#DBEAFE]",
    iconClass: "text-sky-600",
  },
  lock: {
    icon: Lock,
    ring: "from-[#F3F4F6] to-[#E5E7EB]",
    iconClass: "text-[#6B7280]",
  },
  bell: {
    icon: Bell,
    ring: "from-[#FFF7ED] to-[#FFEDD5]",
    iconClass: "text-amber-600",
  },
  analytics: {
    icon: FolderOpen,
    ring: "from-[#ECFDF5] to-[#D1FAE5]",
    iconClass: "text-emerald-600",
  },
};

export function UGCPageEmpty({
  title,
  description,
  action,
  illustration = "default",
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  illustration?: EmptyIllustration;
}) {
  const art = ILLUSTRATIONS[illustration];
  const Icon = art.icon;
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-dashed border-[#E5E7EB] bg-gradient-to-b from-white to-[#FAFAFA] px-6 py-12 text-center shadow-[0_8px_30px_rgba(17,24,39,0.04)]">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FFF4EF]/80 blur-2xl"
        aria-hidden
      />
      <div
        className={cn(
          "relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br shadow-inner",
          art.ring,
        )}
      >
        <Icon className={cn("h-7 w-7", art.iconClass)} />
      </div>
      <p className="relative mt-5 text-base font-bold text-[#111827]">{title}</p>
      <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#6B7280]">
        {description}
      </p>
      {action ? <div className="relative mt-5">{action}</div> : null}
    </div>
  );
}

export function UGCFilterBar({
  search,
  onSearchChange,
  children,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  children?: React.ReactNode;
}) {
  const { t } = useLocale();
  const placeholder = t("searchPlaceholder");
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-[#EEF0F2] bg-white p-3 sm:flex-row sm:items-center">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-11 flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
      />
      {children}
    </div>
  );
}

export function UGCStatusPill({
  status,
}: {
  status: string;
}) {
  const { locale } = useLocale();
  const tone =
    status === "accepted" || status === "approved" || status === "completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "pending" || status === "waitlisted" || status === "submitted"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "rejected"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : status === "revision_requested"
            ? "bg-amber-50 text-amber-700 border-amber-200"
          : status === "in_progress" || status === "in progress"
            ? "bg-sky-50 text-sky-700 border-sky-200"
            : "bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tone,
      )}
    >
      {ugcStatusLabel(locale, status)}
    </span>
  );
}
