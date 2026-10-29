import { redirect } from "next/navigation";

/** Legacy deep-links — Identity Profile navigation is Profile-only. */
export default function IdentitySocialRedirect() {
  redirect("/settings/profile");
}
