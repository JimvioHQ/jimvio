import { redirect } from "next/navigation";

/** Thin hub entry — community notifications live in the dashboard inbox. */
export default function CommunityNotificationsPage() {
  redirect("/dashboard/notifications?category=community");
}
