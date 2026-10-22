import { redirect } from "next/navigation";

export default function IdentityAccountRedirectPage() {
  redirect("/settings/account");
}
