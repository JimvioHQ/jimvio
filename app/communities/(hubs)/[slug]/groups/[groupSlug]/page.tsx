import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy Group URL — permanently redirects to the canonical Spaces path.
 * /communities/[slug]/groups/[groupSlug]
 *   → /communities/[slug]/spaces/[groupSlug]
 */
export default async function LegacyGroupRedirect({
  params,
}: {
  params: Promise<{ slug: string; groupSlug: string }>;
}) {
  const { slug, groupSlug } = await params;
  permanentRedirect(
    `/communities/${encodeURIComponent(slug)}/spaces/${encodeURIComponent(groupSlug)}`
  );
}
