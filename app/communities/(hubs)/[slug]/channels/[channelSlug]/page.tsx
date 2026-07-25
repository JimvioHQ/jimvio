import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy Channel URL — permanently redirects to the canonical Spaces path.
 * /communities/[slug]/channels/[channelSlug]
 *   → /communities/[slug]/spaces/[channelSlug]
 */
export default async function LegacyChannelRedirect({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;
  permanentRedirect(
    `/communities/${encodeURIComponent(slug)}/spaces/${encodeURIComponent(channelSlug)}`
  );
}
