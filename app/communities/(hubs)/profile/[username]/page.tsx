import { redirect } from "next/navigation";

/**
 * Legacy hub profile route — redirect to the canonical Identity profile.
 * Editing remains at /communities/profile (no username) and /identity/edit.
 */
export default async function CommunityHubProfileRedirect({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const handle = username?.trim().replace(/^@/, "");
  if (!handle) redirect("/communities/profile");
  redirect(`/u/${encodeURIComponent(handle)}`);
}
