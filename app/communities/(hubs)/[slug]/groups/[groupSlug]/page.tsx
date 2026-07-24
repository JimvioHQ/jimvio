import { GroupWorkspacePage } from "@/components/community/workspace/group/GroupWorkspacePage";
import { constructMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; groupSlug: string }>;
}) {
  const { slug, groupSlug } = await params;
  return constructMetadata({
    title: "Group",
    description: `Group workspace in ${slug}.`,
    path: `/communities/${slug}/groups/${groupSlug}`,
  });
}

export default function CommunityGroupPage() {
  return <GroupWorkspacePage />;
}
