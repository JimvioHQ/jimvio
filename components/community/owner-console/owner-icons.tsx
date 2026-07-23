"use client";

import {
  BarChart3,
  Calendar,
  FileText,
  Flag,
  GraduationCap,
  Hash,
  LayoutDashboard,
  Layers,
  Lock,
  Puzzle,
  Radio,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import type { OwnerConsoleSectionId } from "@/lib/community/owner-console";
import { OWNER_SECTION_ICON_KEYS } from "@/lib/community/owner-console";

const ICONS: Record<string, LucideIcon> = {
  layout: LayoutDashboard,
  layers: Layers,
  hash: Hash,
  users: Users,
  shield: Shield,
  file: FileText,
  graduation: GraduationCap,
  calendar: Calendar,
  radio: Radio,
  shop: ShoppingBag,
  chart: BarChart3,
  flag: Flag,
  sparkles: Sparkles,
  wand: Wand2,
  lock: Lock,
  puzzle: Puzzle,
  scroll: ScrollText,
  settings: Settings,
};

export function ownerSectionIcon(id: OwnerConsoleSectionId): LucideIcon {
  return ICONS[OWNER_SECTION_ICON_KEYS[id]] ?? LayoutDashboard;
}
