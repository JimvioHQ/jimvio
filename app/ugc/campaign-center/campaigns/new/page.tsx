import { redirect } from "next/navigation";

/** Legacy campaign "new" path — canonical create wizard lives at /create. */
export default function LegacyCampaignNewRedirect() {
  redirect("/ugc/campaign-center/create");
}
