"use client";

import {
  BarChart3,
  CheckCircle2,
  Clock,
  GraduationCap,
  Heart,
  Home,
  LayoutGrid,
  Link2,
  Megaphone,
  MessageSquare,
  Package,
  Radio,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
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
  package: Package,
  "shopping-bag": ShoppingBag,
  users: Users,
  "users-round": Users,
  link: Link2,
  video: Video,
  graduation: GraduationCap,
  megaphone: Megaphone,
  radio: Radio,
  live: Radio,
  message: MessageSquare,
  wallet: Wallet,
  chart: BarChart3,
  layout: LayoutGrid,
  sparkles: Sparkles,
  settings: Settings,
  ticket: Ticket,
  heart: Heart,
  star: Star,
  clock: Clock,
  check: CheckCircle2,
};

export function OsIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? LayoutGrid;
  return <Icon className={className} />;
}
