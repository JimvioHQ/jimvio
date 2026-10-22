import { redirect } from "next/navigation";

export default function IdentityPrivacyRedirectPage() {
  redirect("/settings/privacy");
}
