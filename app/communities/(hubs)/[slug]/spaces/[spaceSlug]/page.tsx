import { SpaceWorkspacePage } from "@/components/community/workspace/space/SpaceWorkspacePage";
import { constructMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; spaceSlug: string }>;
}) {
  const { slug, spaceSlug } = await params;
  return constructMetadata({
    title: "Space",
    description: `Space workspace in ${slug}.`,
    path: `/communities/${slug}/spaces/${spaceSlug}`,
  });
}

/**
 * Canonical Space page — /communities/[slug]/spaces/[spaceSlug]
 * Resolves Space by slug, or room by slug across the community.
 */
export default function CommunitySpacePage() {
  return <SpaceWorkspacePage />;
}
