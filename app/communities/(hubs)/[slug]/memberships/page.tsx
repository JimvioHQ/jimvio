import { MembershipManager } from "@/components/creator-economy/MembershipManager";

export default async function CreatorMembershipsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <MembershipManager slug={slug} />;
}
