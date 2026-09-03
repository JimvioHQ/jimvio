import { redirect } from "next/navigation";

export default async function LegacyCampaignRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/ugc/${id}`);
}
