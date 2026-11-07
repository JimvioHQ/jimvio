import { cn } from "@/lib/utils";
import { emphasizePhrase, resolveShortBioLines } from "@/lib/identity/short-bio";

/**
 * Elegant three-sentence short professional bio for the public profile header.
 * Sentence 1: italic with one bold-italic phrase.
 * Sentences 2–3: italic, visually secondary.
 */
export function ShortProfessionalBio({
  lines,
  bio,
  headline,
  className,
}: {
  lines?: string[] | null;
  bio?: string | null;
  headline?: string | null;
  className?: string;
}) {
  const resolved = resolveShortBioLines({ shortBioLines: lines, bio });
  if (resolved.length === 0) {
    if (!headline?.trim()) return null;
    return (
      <p className={cn("mt-3 max-w-2xl text-[14px] italic leading-relaxed text-[#374151] sm:text-[15px]", className)}>
        {headline.trim()}
      </p>
    );
  }

  const [first, ...rest] = resolved;
  const { before, emphasis, after } = emphasizePhrase(first);

  return (
    <div className={cn("mt-3 max-w-2xl space-y-1.5", className)}>
      <p className="text-[14px] italic leading-relaxed text-[#111827] sm:text-[15px]">
        {before}
        {emphasis ? <strong className="font-semibold italic">{emphasis}</strong> : null}
        {after}
      </p>
      {rest.map((line) => (
        <p key={line} className="text-[13.5px] italic leading-relaxed text-[#6B7280] sm:text-[14px]">
          {line}
        </p>
      ))}
    </div>
  );
}
