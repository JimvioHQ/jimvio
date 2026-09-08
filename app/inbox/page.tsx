import { redirect } from "next/navigation";

/** Legacy inbox → canonical global notification center. */
export default function InboxRedirectPage() {
  redirect("/notifications");
}
