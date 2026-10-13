import Link from "next/link";
import { hashtagFeedHref } from "@/lib/feed/hashtag-query";

const TOKEN_RE = /(#[a-zA-Z0-9_]{2,48})/g;

/** Renders post text with hashtags linking to the filtered Communities feed. */
export function PostRichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(TOKEN_RE);
  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("#") && part.length > 2) {
          const tag = part.slice(1);
          return (
            <Link
              key={`${part}-${index}`}
              href={hashtagFeedHref(tag)}
              className="font-medium text-[#fd5000] hover:underline"
            >
              {part}
            </Link>
          );
        }
        return <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>;
      })}
    </p>
  );
}
