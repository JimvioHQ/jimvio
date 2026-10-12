import { redirect } from "next/navigation";

export default async function LegacySubmitRoute({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  redirect(`/ugc/${campaignId}/submit`);
}
