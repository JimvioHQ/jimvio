import { redirect } from "next/navigation";

/**
 * Payment return URLs historically pointed at /communities/[slug]/workspace.
 * That path never shipped — land members on the live community hub instead.
 */
export default async function CommunityWorkspaceAliasRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/communities/${slug}`);
}
