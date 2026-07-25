import { redirect } from "next/navigation";

/** Legacy hub Channels list — product surface is Spaces. */
export default function HubChannelsPage() {
  redirect("/communities/spaces");
}
