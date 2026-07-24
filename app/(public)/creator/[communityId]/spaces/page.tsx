import { redirectCreatorStudio } from "@/lib/community/owner-console/legacy-creator-redirect";

export const dynamic = "force-dynamic";

export default async function LegacyCreatorSpacesRedirect({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;
  return redirectCreatorStudio(communityId, "groups");
}
