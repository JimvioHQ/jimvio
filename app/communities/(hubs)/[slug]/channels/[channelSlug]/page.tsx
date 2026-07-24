import { ChannelWorkspacePage } from "@/components/community/workspace/channel/ChannelWorkspacePage";
import { constructMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>;
}) {
  const { slug, channelSlug } = await params;
  return constructMetadata({
    title: "Channel",
    description: `Channel in ${slug}.`,
    path: `/communities/${slug}/channels/${channelSlug}`,
  });
}

/**
 * Canonical channel page — /communities/[slug]/channels/[channelSlug]
 * Parent Group is resolved internally from the workspace loader.
 */
export default function CommunityChannelPage() {
  return <ChannelWorkspacePage />;
}
