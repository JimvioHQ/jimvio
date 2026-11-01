import { Globe } from "lucide-react";
import {
  SiFacebook, SiInstagram, SiLinkedin, SiPinterest, SiSnapchat,
  SiThreads, SiTiktok, SiX, SiYoutube,
} from "react-icons/si";
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
  tiktok: { icon: SiTiktok, color: "#111111" },
  instagram: { icon: SiInstagram, color: "#D6295C" },
  youtube: { icon: SiYoutube, color: "#E1352B" },
  facebook: { icon: SiFacebook, color: "#1866D6" },
  x: { icon: SiX, color: "#111111" },
  threads: { icon: SiThreads, color: "#111111" },
  linkedin: { icon: SiLinkedin, color: "#0A66C2" },
  pinterest: { icon: SiPinterest, color: "#C8232C" },
  snapchat: { icon: SiSnapchat, color: "#B89400" },
  website: { icon: Globe, color: "#59544B" },
};

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
    return <span style={{ color: meta.color }} className="inline-flex"><Icon className={cn("h-4 w-4", className)} /></span>;
  }
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full", className)} style={{ backgroundColor: `${meta.color}14`, color: meta.color }}>
      <Icon className="h-[55%] w-[55%]" />
    </span>
  );
}
