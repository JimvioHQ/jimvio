import { redirect } from "next/navigation";

export default async function CommunityChatsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/communities/${slug}/chat`);
}
