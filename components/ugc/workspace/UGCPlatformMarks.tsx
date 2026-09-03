import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
  twitter: "X",
};

function TikTokMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M14.5 3.2c.8 1.8 2.3 3.2 4.2 3.7v3.1c-1.5-.05-2.9-.5-4.1-1.2v6.7c0 3.4-2.8 6.2-6.3 6.2S2 18.7 2 15.3c0-3.3 2.6-6 5.9-6.2v3.2c-.8.2-1.4.9-1.4 1.8 0 1 .8 1.8 1.8 1.8s1.8-.8 1.8-1.8V3.2h4.4Z"
      />
    </svg>
  );
}

function InstagramMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm10 2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-5 3.2A4.8 4.8 0 1 1 7.2 13 4.8 4.8 0 0 1 12 8.2Zm0 2A2.8 2.8 0 1 0 14.8 13 2.8 2.8 0 0 0 12 10.2ZM17.4 6.4a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z"
      />
    </svg>
  );
}

function YouTubeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M22.5 7.2a3.2 3.2 0 0 0-2.2-2.3C18.4 4.5 12 4.5 12 4.5s-6.4 0-8.3.4A3.2 3.2 0 0 0 1.5 7.2 33 33 0 0 0 1.1 12a33 33 0 0 0 .4 4.8 3.2 3.2 0 0 0 2.2 2.3c1.9.4 8.3.4 8.3.4s6.4 0 8.3-.4a3.2 3.2 0 0 0 2.2-2.3A33 33 0 0 0 22.9 12a33 33 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"
      />
    </svg>
  );
}

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M13.6 21v-7.2h2.4l.4-2.8h-2.8V9.2c0-.8.2-1.4 1.4-1.4H16.6V5.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 4v2.8H8v2.8h2.5V21h3.1Z"
      />
    </svg>
  );
}

function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M14.7 10.3 22 2h-1.8l-6.4 7.2L8.7 2H2.2l7.7 11.2L2.2 22h1.8l6.7-7.6L15.3 22h6.5l-7.1-11.7Zm-2.4 2.7-.8-1.1-6.1-8.6h2.6l5 7 0.8 1.1 6.5 9.1h-2.6l-5.4-7.5Z"
      />
    </svg>
  );
}

const MARKS: Record<string, typeof TikTokMark> = {
  tiktok: TikTokMark,
  instagram: InstagramMark,
  youtube: YouTubeMark,
  facebook: FacebookMark,
  x: XMark,
  twitter: XMark,
};

export function UGCPlatformMarks({
  platforms,
  className,
  iconClassName,
}: {
  platforms: string[];
  className?: string;
  iconClassName?: string;
}) {
  const unique = [...new Set(platforms.map((p) => p.toLowerCase()))].filter((p) => MARKS[p]);
  if (!unique.length) return null;
  return (
    <ul className={cn("flex items-center gap-1.5", className)}>
      {unique.map((key) => {
        const Icon = MARKS[key];
        const label = LABELS[key] ?? key;
        return (
          <li key={key}>
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#F3F4F6] text-[#111827]"
              title={label}
              aria-label={label}
            >
              <Icon className={cn("h-3.5 w-3.5", iconClassName)} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function campaignFallbackStyle(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return {
    background: `linear-gradient(145deg, hsl(${hue} 62% 94%) 0%, hsl(${(hue + 28) % 360} 48% 86%) 100%)`,
  };
}
