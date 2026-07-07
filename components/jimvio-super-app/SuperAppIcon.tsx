"use client";

import {
  BarChart3,
  Bot,
  GraduationCap,
  Link2,
  MessageSquare,
  Package,
  Radio,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  store: Store,
  users: Users,
  link: Link2,
  video: Video,
  graduation: GraduationCap,
  sparkles: Sparkles,
  package: Package,
  "shopping-bag": ShoppingBag,
  wallet: Wallet,
  chart: BarChart3,
  bot: Bot,
  message: MessageSquare,
  radio: Radio,
  settings: Settings,
};

export function SuperAppIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Sparkles;
  return <Icon className={className} />;
}
