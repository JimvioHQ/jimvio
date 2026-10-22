import { redirect } from "next/navigation";

export default function IdentityEditRedirectPage() {
  redirect("/settings/profile");
}
