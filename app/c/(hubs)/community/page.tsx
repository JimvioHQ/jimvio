import { redirect } from "next/navigation";

/** Legacy /c/community — send users to the hub feed */
export default function CommunityHubIndexPage() {
  redirect("/c");
}
