import { jsonLdHtml } from "@/lib/editorial/discover";

export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />
  );
}
