import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy nested channel URL — permanently redirects to the flat canonical path.
 * /communities/[slug]/groups/[groupSlug]/channels/[channelSlug]
 *   → /communities/[slug]/channels/[channelSlug]
 */
export default async function LegacyNestedChannelRedirect({
  params,
}: {
  params: Promise<{ slug: string; groupSlug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;
  permanentRedirect(
    `/communities/${encodeURIComponent(slug)}/channels/${encodeURIComponent(channelSlug)}`
  );
}
