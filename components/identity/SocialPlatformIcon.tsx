import { Facebook, Globe, Instagram, Linkedin, Link as LinkIcon, MessageCircle, Music2, Twitter, Youtube } from "lucide-react";
import type { IdentitySocialPlatform } from "@/lib/identity/types";
import { cn } from "@/lib/utils";

export const SOCIAL_PLATFORM_LABEL: Record<IdentitySocialPlatform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
  threads: "Threads",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  website: "Website",
};

const META: Record<IdentitySocialPlatform, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  tiktok: { icon: Music2, color: "#111111" },
  instagram: { icon: Instagram, color: "#D6295C" },
  youtube: { icon: Youtube, color: "#E1352B" },
  facebook: { icon: Facebook, color: "#1866D6" },
  x: { icon: Twitter, color: "#111111" },
  threads: { icon: MessageCircle, color: "#111111" },
  linkedin: { icon: Linkedin, color: "#0A66C2" },
  pinterest: { icon: LinkIcon, color: "#C8232C" },
  snapchat: { icon: LinkIcon, color: "#B89400" },
  website: { icon: Globe, color: "#59544B" },
};

/** Platform mark in the platform's color. `bare` drops the tinted circle. */
export function SocialPlatformIcon({
  platform,
  className,
  bare = false,
}: {
  platform: IdentitySocialPlatform;
  className?: string;
  bare?: boolean;
}) {
  const meta = META[platform] ?? META.website;
  const Icon = meta.icon;
  if (bare) {
    return (
      <span style={{ color: meta.color }} className="inline-flex">
        <Icon className={cn("h-4 w-4", className)} />
      </span>
    );
  }
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full", className)}
      style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
    >
      <Icon className="h-[55%] w-[55%]" />
    </span>
  );
}
