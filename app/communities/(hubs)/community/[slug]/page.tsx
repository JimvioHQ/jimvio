import { redirect } from "next/navigation";

export default async function LegacyCommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/communities/${slug}`);
}
