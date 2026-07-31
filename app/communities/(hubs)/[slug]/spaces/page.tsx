import { constructMetadata } from "@/lib/seo";
import { CommunitySpacesGallery } from "@/components/community/workspace/sections/CommunitySpacesGallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return constructMetadata({
    title: "Spaces",
    description: `Spaces in ${slug}.`,
    path: `/communities/${slug}/spaces`,
  });
}

/**
 * Community-scoped Spaces index — /communities/[slug]/spaces
 * Lists only spaces for the current community (from workspace context).
 */
export default function CommunitySpacesIndexPage() {
  return <CommunitySpacesGallery />;
}
