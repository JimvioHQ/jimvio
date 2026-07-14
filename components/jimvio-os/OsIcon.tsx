"use client";

import {
  BarChart3,
  GraduationCap,
  Home,
  LayoutGrid,
  Link2,
  Megaphone,
  MessageSquare,
  Radio,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  home: Home,
  store: Store,
  "shopping-bag": ShoppingBag,
  users: Users,
  "users-round": Users,
  link: Link2,
  video: Video,
  graduation: GraduationCap,
  megaphone: Megaphone,
  radio: Radio,
  message: MessageSquare,
  wallet: Wallet,
  chart: BarChart3,
  layout: LayoutGrid,
  sparkles: Sparkles,
  settings: Settings,
  ticket: Ticket,
};

export function OsIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? LayoutGrid;
  return <Icon className={className} />;
}
