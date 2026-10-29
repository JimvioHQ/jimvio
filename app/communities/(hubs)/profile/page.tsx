import { redirect } from "next/navigation";

/** One profile editor for all of Jimvio. */
export default function CommunityProfileRedirect() {
  redirect("/settings/profile");
}
