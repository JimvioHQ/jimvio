import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy nested channel URL — permanently redirects to the flat Spaces path.
 * /communities/[slug]/groups/[groupSlug]/channels/[channelSlug]
 *   → /communities/[slug]/spaces/[channelSlug]
 */
export default async function LegacyNestedChannelRedirect({
  params,
}: {
  params: Promise<{ slug: string; groupSlug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;
  permanentRedirect(
    `/communities/${encodeURIComponent(slug)}/spaces/${encodeURIComponent(channelSlug)}`
  );
}
