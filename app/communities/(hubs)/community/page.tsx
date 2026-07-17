import { redirect } from "next/navigation";

/** Legacy /communities/community — send users to the hub feed */
export default function CommunityHubIndexPage() {
  redirect("/communities");
}
