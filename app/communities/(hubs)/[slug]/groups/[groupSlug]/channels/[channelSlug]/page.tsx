import { ChannelWorkspacePage } from "@/components/community/workspace/channel/ChannelWorkspacePage";
import { constructMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; groupSlug: string; channelSlug: string }>;
}) {
  const { slug, groupSlug, channelSlug } = await params;
  return constructMetadata({
    title: "Channel",
    description: `Channel in ${groupSlug} · ${slug}.`,
    path: `/communities/${slug}/groups/${groupSlug}/channels/${channelSlug}`,
  });
}

export default function CommunityChannelPage() {
  return <ChannelWorkspacePage />;
}
