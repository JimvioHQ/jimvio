import HubMissionsPage from "../../missions/page";

export default async function CommunityMissionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <HubMissionsPage communitySlug={slug} />;
}
