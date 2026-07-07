"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  Calendar,
  DollarSign,
  GraduationCap,
  Megaphone,
  Package,
  Radio,
  ShoppingBag,
  Sparkles,
  Star,
  Upload,
  UserPlus,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { JimvioWorkspaceData, WorkspaceWidgetId } from "@/lib/jimvio-workspace/types";
import { WorkspaceNotificationCenter } from "./WorkspaceNotificationCenter";
import { WorkspaceQuickActions } from "./WorkspaceQuickActions";
import { WorkspaceModuleNav } from "./WorkspaceModuleNav";
import { WorkspaceAIWidget } from "./WorkspaceAIWidget";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  package: Package,
  users: Users,
  graduation: GraduationCap,
  megaphone: Megaphone,
  video: Video,
  radio: Radio,
  "user-plus": UserPlus,
  wallet: Wallet,
  sparkles: Sparkles,
  upload: Upload,
};

function MetricBody({
  metric,
  icon: Icon,
}: {
  metric: JimvioWorkspaceData["metrics"][string];
  icon: LucideIcon;
}) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div className="rounded-lg bg-[var(--color-accent)]/10 p-2">
          <Icon className="size-4 text-[var(--color-accent)]" />
        </div>
        {metric.delta && (
          <span
            className={cn(
              "text-[10px] font-bold",
              metric.trend === "up" && "text-emerald-600",
              metric.trend === "down" && "text-red-500",
              metric.trend === "neutral" && "text-[var(--color-text-muted)]",
            )}
          >
            {metric.delta}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">{metric.value}</p>
        <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{metric.label}</p>
      </div>
    </div>
  );
}

function ListBody({
  items,
  emptyLabel,
}: {
  items: Array<{ id: string; title: string; subtitle?: string; href?: string }>;
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-[var(--color-text-muted)]">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.slice(0, 5).map((item) => (
        <li key={item.id}>
          {item.href ? (
            <Link
              href={item.href}
              className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
            >
              <p className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">{item.title}</p>
              {item.subtitle && (
                <p className="truncate text-[10px] text-[var(--color-text-muted)]">{item.subtitle}</p>
              )}
            </Link>
          ) : (
            <div className="rounded-lg px-2 py-1.5">
              <p className="truncate text-[12px] font-semibold">{item.title}</p>
              {item.subtitle && <p className="truncate text-[10px] text-[var(--color-text-muted)]">{item.subtitle}</p>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

type WorkspaceWidgetContentProps = {
  widgetId: WorkspaceWidgetId;
  data: JimvioWorkspaceData;
};

export function WorkspaceWidgetContent({ widgetId, data }: WorkspaceWidgetContentProps) {
  switch (widgetId) {
    case "earnings":
      return <MetricBody metric={data.metrics.earnings} icon={DollarSign} />;
    case "sales":
      return <MetricBody metric={data.metrics.sales} icon={ShoppingBag} />;
    case "orders":
      return <MetricBody metric={data.metrics.orders} icon={Package} />;
    case "communities":
      return <MetricBody metric={data.metrics.communities} icon={Users} />;
    case "affiliate-revenue":
      return <MetricBody metric={data.metrics.affiliateRevenue} icon={BarChart3} />;
    case "ugc-campaigns":
      return <MetricBody metric={data.metrics.ugcCampaigns} icon={Megaphone} />;
    case "creator-score":
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center gap-2">
            <Star className="size-5 text-[var(--color-accent)]" />
            <span className="rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-accent)]">
              {data.creatorScoreLevel}
            </span>
          </div>
          <div>
            <p className="text-3xl font-black text-[var(--color-text-primary)]">{data.creatorScore}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">Creator score · UI placeholder</p>
          </div>
        </div>
      );
    case "notifications":
      return <WorkspaceNotificationCenter notifications={data.notifications} variant="embedded" />;
    case "messages":
      return (
        <ListBody
          items={data.messages.map((m) => ({
            id: m.id,
            title: m.title,
            subtitle: m.body,
            href: m.href,
          }))}
          emptyLabel="No messages yet."
        />
      );
    case "tasks":
      return (
        <ListBody
          items={data.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            subtitle: t.dueLabel,
            href: t.href,
          }))}
          emptyLabel="All caught up."
        />
      );
    case "upcoming-events":
      return (
        <div className="space-y-2">
          {data.events.map((event) => (
            <Link
              key={event.id}
              href={event.href ?? "#"}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2 transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/30"
            >
              <Calendar className="size-4 shrink-0 text-[var(--color-accent)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">{event.title}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{event.timeLabel}</span>
              </span>
            </Link>
          ))}
        </div>
      );
    case "ai-suggestions":
      return <WorkspaceAIWidget cards={data.aiCards} />;
    case "quick-actions":
      return <WorkspaceQuickActions actions={data.quickActions} icons={ICONS} />;
    case "module-nav":
      return <WorkspaceModuleNav modules={data.modules} />;
    default:
      return null;
  }
}
