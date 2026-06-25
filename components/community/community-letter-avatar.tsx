import { cn } from "@/lib/utils";

export function communityInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}

type CommunityLetterAvatarProps = {
  name: string;
  className?: string;
  textClassName?: string;
  style?: React.CSSProperties;
};

/** Fallback avatar when a community has no profile or cover image. */
export function CommunityLetterAvatar({
  name,
  className,
  textClassName,
  style,
}: CommunityLetterAvatarProps) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={style}
      aria-hidden
    >
      <span className={cn("font-bold leading-none select-none", textClassName)}>
        {communityInitial(name)}
      </span>
    </div>
  );
}
